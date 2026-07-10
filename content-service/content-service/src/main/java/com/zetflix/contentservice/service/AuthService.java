package com.zetflix.contentservice.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Service;

import com.zetflix.contentservice.dto.AuthResponse;
import com.zetflix.contentservice.dto.ForgotPasswordRequest;
import com.zetflix.contentservice.dto.LoginRequest;
import com.zetflix.contentservice.dto.ResetPasswordRequest;
import com.zetflix.contentservice.dto.SignupRequest;
import com.zetflix.contentservice.dto.UserProfileResponse;
import com.zetflix.contentservice.dto.WatchedMovieInfo;
import com.zetflix.contentservice.model.Movie;
import com.zetflix.contentservice.model.User;
import com.zetflix.contentservice.model.WatchHistory;
import com.zetflix.contentservice.repository.ContentRepository;
import com.zetflix.contentservice.repository.UserRepository;
import com.zetflix.contentservice.repository.WatchHistoryRepository;
import com.zetflix.contentservice.security.JwtUtils;
import com.zetflix.contentservice.security.UserContext;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WatchHistoryRepository watchHistoryRepository;
    private final ContentRepository contentRepository;
    private final EmailService emailService;

    public void signup(SignupRequest request) {
        Optional<User> existing = userRepository.findByEmail(request.getEmail().toLowerCase().trim());
        
        String hashedPassword = BCrypt.hashpw(request.getPassword(), BCrypt.gensalt());
        String otp = String.format("%06d", new Random().nextInt(1000000));
        
        User user;
        if (existing.isPresent()) {
            user = existing.get();
            if (user.isVerified()) {
                throw new RuntimeException("Email address already registered");
            }
            // User exists but unverified. Update details and generate new OTP.
            user.setName(request.getName().trim());
            user.setPassword(hashedPassword);
            user.setDob(request.getDob());
            user.setOtp(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(15));
        } else {
            user = new User();
            user.setName(request.getName().trim());
            user.setEmail(request.getEmail().toLowerCase().trim());
            user.setPassword(hashedPassword);
            user.setDob(request.getDob());
            user.setRole("USER");
            user.setVerified(false);
            user.setOtp(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(15));
        }

        userRepository.save(user);

        emailService.sendVerificationOtp(user.getEmail(), user.getName(), otp);
    }

    public void verifyEmail(String email, String otp) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired. Please sign up again or request a new OTP.");
        }

        if (!otp.trim().equals(user.getOtp())) {
            throw new RuntimeException("Invalid verification code");
        }

        user.setVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
        log.info("Email verified successfully for user: {}", email);
    }

    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        String otp = String.format("%06d", new Random().nextInt(1000000));
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendVerificationOtp(user.getEmail(), user.getName(), otp);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (!user.isVerified()) {
            throw new RuntimeException("Account is not verified yet. Please verify your email first.");
        }

        String token = JwtUtils.generateToken(user.getEmail(), user.getName(), user.getRole(), user.getId());
        return new AuthResponse(token, user.getEmail(), user.getName(), user.getRole());
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("Email address not found"));

        String token = String.format("%06d", new Random().nextInt(1000000));
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendPasswordResetToken(user.getEmail(), user.getName(), token);
    }

    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetToken(request.getToken().trim())
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Reset token has expired");
        }

        String hashedPassword = BCrypt.hashpw(request.getPassword(), BCrypt.gensalt());
        user.setPassword(hashedPassword);
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
        log.info("Password reset successfully for user: {}", user.getEmail());
    }

    public UserProfileResponse getProfile() {
        String userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("Unauthorized user access");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        int age = Period.between(user.getDob(), LocalDate.now()).getYears();

        List<WatchHistory> histories = watchHistoryRepository.findByUserIdOrderByLastWatchedAtDesc(userId);

        List<WatchedMovieInfo> recentlyWatched = new ArrayList<>();
        WatchedMovieInfo continueWatching = null;

        for (WatchHistory history : histories) {
            Movie movie = contentRepository.findById(history.getMovieId()).orElse(null);
            if (movie != null) {
                WatchedMovieInfo info = new WatchedMovieInfo(
                        movie.getId(),
                        movie.getTitle(),
                        movie.getThumbnailUrl(),
                        history.getLastWatchedTimeSeconds(),
                        history.getTotalDurationSeconds(),
                        history.isCompleted(),
                        history.getLastWatchedAt()
                );
                recentlyWatched.add(info);

                if (continueWatching == null && !history.isCompleted()) {
                    continueWatching = info;
                }
            }
        }

        // If all items are completed, use the very last watched item as continue watching fallback
        if (continueWatching == null && !recentlyWatched.isEmpty()) {
            continueWatching = recentlyWatched.get(0);
        }

        // Aggregate preferred genres based on watch history
        Map<String, Long> genreCounts = histories.stream()
                .filter(h -> h.getGenre() != null)
                .collect(Collectors.groupingBy(h -> h.getGenre().name(), Collectors.counting()));

        List<String> preferredGenres = genreCounts.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getDob(),
                age,
                user.getRole(),
                recentlyWatched,
                continueWatching,
                preferredGenres
        );
    }

    public void updateProfile(String name, LocalDate dob) {
        String userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("Unauthorized user access");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (name != null && !name.trim().isEmpty()) {
            user.setName(name.trim());
        }
        if (dob != null) {
            user.setDob(dob);
        }

        userRepository.save(user);
    }

    // Auto seed admin on startup if not present
    public void seedAdmin() {
        String adminEmail = "admin@zetflix.com";
        Optional<User> existing = userRepository.findByEmail(adminEmail);
        if (existing.isEmpty()) {
            // Frontend now sends SHA-256(plaintext) before BCrypt on server.
            // Pre-compute SHA-256 of "AdminPassword123" so login works correctly.
            String sha256OfAdminPassword = sha256Hex("AdminPassword123");

            User admin = new User();
            admin.setName("Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(BCrypt.hashpw(sha256OfAdminPassword, BCrypt.gensalt()));
            admin.setDob(LocalDate.of(1990, 1, 1));
            admin.setRole("ADMIN");
            admin.setVerified(true);
            userRepository.save(admin);
            log.info("Default Admin account seeded: admin@zetflix.com / AdminPassword123");
        }
    }

    // Helper: compute SHA-256 hex string (mirrors Web Crypto API in the browser)
    private String sha256Hex(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
