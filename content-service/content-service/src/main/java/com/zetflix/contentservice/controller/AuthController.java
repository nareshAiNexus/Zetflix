package com.zetflix.contentservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zetflix.contentservice.dto.AuthResponse;
import com.zetflix.contentservice.dto.ForgotPasswordRequest;
import com.zetflix.contentservice.dto.LoginRequest;
import com.zetflix.contentservice.dto.ResendOtpRequest;
import com.zetflix.contentservice.dto.ResetPasswordRequest;
import com.zetflix.contentservice.dto.SignupRequest;
import com.zetflix.contentservice.dto.UpdateProfileRequest;
import com.zetflix.contentservice.dto.UserProfileResponse;
import com.zetflix.contentservice.dto.VerifyEmailRequest;
import com.zetflix.contentservice.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/signup")
    public ResponseEntity<String> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok("Registration successful. Verification OTP sent via email.");
    }

    @PostMapping("/auth/verify-email")
    public ResponseEntity<String> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.getEmail(), request.getOtp());
        return ResponseEntity.ok("Email verified successfully. You can now log in.");
    }

    @PostMapping("/auth/resend-otp")
    public ResponseEntity<String> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        authService.resendOtp(request.getEmail());
        return ResponseEntity.ok("OTP has been resent successfully.");
    }

    @PostMapping("/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok("Password reset instructions sent via email.");
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok("Password reset successful. You can now log in.");
    }

    @GetMapping("/users/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        return ResponseEntity.ok(authService.getProfile());
    }

    @PutMapping("/users/profile")
    public ResponseEntity<String> updateProfile(@RequestBody UpdateProfileRequest request) {
        authService.updateProfile(request.getName(), request.getDob());
        return ResponseEntity.ok("Profile updated successfully.");
    }
}
