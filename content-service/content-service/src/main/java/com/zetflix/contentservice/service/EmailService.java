package com.zetflix.contentservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:${spring.mail.username:no-reply@zetflix.com}}")
    private String fromAddress;

    // ─── Public API ────────────────────────────────────────────────────

    public void sendVerificationOtp(String toEmail, String name, String otp) {
        log.info("Sending OTP verification email to: {}", toEmail);
        String plainText = "Hi " + name + ",\n\n"
            + "Welcome to Zetflix! Your email verification code is: " + otp + "\n\n"
            + "This code expires in 15 minutes.\n\n"
            + "If you did not create a Zetflix account, please ignore this email.\n\n"
            + "— Zetflix Team";
        sendHtml(toEmail, "Your Zetflix verification code: " + otp, buildOtpTemplate(name, otp), plainText);
    }

    public void sendPasswordResetToken(String toEmail, String name, String token) {
        log.info("Sending password reset email to: {}", toEmail);
        String plainText = "Hi " + name + ",\n\n"
            + "We received a request to reset your Zetflix password.\n\n"
            + "Your password reset code is: " + token + "\n\n"
            + "This code expires in 15 minutes.\n\n"
            + "If you did not request this, please ignore this email — your account is safe.\n\n"
            + "— Zetflix Team";
        sendHtml(toEmail, "Reset your Zetflix password", buildResetTemplate(name, token), plainText);
    }

    // ─── Internal dispatch ─────────────────────────────────────────────

    private void sendHtml(String to, String subject, String html, String plainText) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            // Set BOTH plain-text and HTML — critical for spam score
            helper.setText(plainText, html);
            helper.setFrom(fromAddress, "Zetflix");
            helper.setReplyTo(fromAddress);

            // Add headers that improve deliverability
            message.setHeader("X-Mailer", "Zetflix-Mailer");
            message.setHeader("X-Priority", "1");
            message.setHeader("Precedence", "bulk");

            mailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("SMTP send failed to {}. Reason: {}", to, e.getMessage(), e);
            throw new RuntimeException("Failed to send email to " + to, e);
        }
    }

    // ─── OTP Email Template ────────────────────────────────────────────

    private String buildOtpTemplate(String name, String otp) {
        return "<!DOCTYPE html>" +
            "<html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<title>Verify your Zetflix account</title>" +
            "<style>" +
            "  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');" +
            "  *{margin:0;padding:0;box-sizing:border-box}" +
            "  body{background:#0a0a0a;font-family:'Inter',Helvetica,Arial,sans-serif;color:#e5e5e5;padding:40px 20px}" +
            "  .wrapper{max-width:560px;margin:0 auto}" +
            "  .card{background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;box-shadow:0 24px 64px rgba(0,0,0,0.8)}" +
            "  .hero{background:linear-gradient(135deg,#1a0000 0%,#2d0000 50%,#1a0000 100%);padding:48px 40px 40px;text-align:center;position:relative;border-bottom:1px solid #2a2a2a}" +
            "  .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(229,9,20,0.18) 0%,transparent 70%)}" +
            "  .logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-bottom:28px;position:relative;z-index:1}" +
            "  .logo-icon{width:36px;height:36px}" +
            "  .logo-text{font-size:26px;font-weight:900;color:#e50914;letter-spacing:2px}" +
            "  .hero-title{font-size:22px;font-weight:700;color:#fff;position:relative;z-index:1}" +
            "  .hero-sub{font-size:14px;color:#888;margin-top:6px;position:relative;z-index:1}" +
            "  .body{padding:40px}" +
            "  .greeting{font-size:16px;color:#ccc;margin-bottom:20px}" +
            "  .copy{font-size:14px;color:#999;line-height:1.7;margin-bottom:28px}" +
            "  .otp-box{background:#1c1c1c;border:1px dashed rgba(229,9,20,0.5);border-radius:12px;padding:28px 20px;text-align:center;margin:0 0 28px}" +
            "  .otp-label{font-size:11px;font-weight:600;color:#666;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}" +
            "  .otp-code{font-size:48px;font-weight:900;color:#e50914;letter-spacing:14px;font-variant-numeric:tabular-nums}" +
            "  .otp-expiry{font-size:12px;color:#555;margin-top:12px}" +
            "  .divider{height:1px;background:linear-gradient(to right,transparent,#2a2a2a,transparent);margin:28px 0}" +
            "  .warning{background:rgba(229,9,20,0.06);border-left:3px solid rgba(229,9,20,0.4);border-radius:4px;padding:12px 16px;font-size:13px;color:#888}" +
            "  .footer{background:#0d0d0d;padding:28px 40px;text-align:center;border-top:1px solid #1e1e1e}" +
            "  .footer p{font-size:12px;color:#444;line-height:1.8}" +
            "  .footer a{color:#666;text-decoration:none}" +
            "  .footer a:hover{color:#999}" +
            "</style></head><body>" +
            "<div class='wrapper'>" +
            "  <div class='card'>" +
            "    <div class='hero'>" +
            "      <div class='logo'>" +
            "        <span style='font-size:32px;margin-right:8px'>▶</span>" +
            "        <span class='logo-text'>ZETFLIX</span>" +
            "      </div>" +
            "      <div class='hero-title'>Verify your email address</div>" +
            "      <div class='hero-sub'>One more step to start watching</div>" +
            "    </div>" +
            "    <div class='body'>" +
            "      <p class='greeting'>Hi " + escapeHtml(name) + ",</p>" +
            "      <p class='copy'>Welcome to Zetflix! Enter the verification code below to activate your account and start streaming. This code expires in <strong style='color:#fff'>15 minutes</strong>.</p>" +
            "      <div class='otp-box'>" +
            "        <div class='otp-label'>Your verification code</div>" +
            "        <div class='otp-code'>" + escapeHtml(otp) + "</div>" +
            "        <div class='otp-expiry'>⏱ Valid for 15 minutes</div>" +
            "      </div>" +
            "      <div class='divider'></div>" +
            "      <div class='warning'>⚠ If you did not create a Zetflix account, you can safely ignore this email.</div>" +
            "    </div>" +
            "    <div class='footer'>" +
            "      <p>This is an automated message from Zetflix.</p>" +
            "      <p style='margin-top:8px'>&copy; " + java.time.Year.now() + " Zetflix Inc.</p>" +
            "    </div>" +
            "  </div>" +
            "</div></body></html>";
    }

    // ─── Password Reset Email Template ─────────────────────────────────

    private String buildResetTemplate(String name, String token) {
        return "<!DOCTYPE html>" +
            "<html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<title>Reset your Zetflix password</title>" +
            "<style>" +
            "  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');" +
            "  *{margin:0;padding:0;box-sizing:border-box}" +
            "  body{background:#0a0a0a;font-family:'Inter',Helvetica,Arial,sans-serif;color:#e5e5e5;padding:40px 20px}" +
            "  .wrapper{max-width:560px;margin:0 auto}" +
            "  .card{background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;box-shadow:0 24px 64px rgba(0,0,0,0.8)}" +
            "  .hero{background:linear-gradient(135deg,#000a1a 0%,#001a30 50%,#000a1a 100%);padding:48px 40px 40px;text-align:center;position:relative;border-bottom:1px solid #2a2a2a}" +
            "  .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(59,130,246,0.14) 0%,transparent 70%)}" +
            "  .logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:28px;position:relative;z-index:1}" +
            "  .logo-text{font-size:26px;font-weight:900;color:#e50914;letter-spacing:2px}" +
            "  .hero-title{font-size:22px;font-weight:700;color:#fff;position:relative;z-index:1}" +
            "  .hero-sub{font-size:14px;color:#888;margin-top:6px;position:relative;z-index:1}" +
            "  .body{padding:40px}" +
            "  .greeting{font-size:16px;color:#ccc;margin-bottom:20px}" +
            "  .copy{font-size:14px;color:#999;line-height:1.7;margin-bottom:28px}" +
            "  .token-box{background:#1c1c1c;border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:20px;text-align:center;margin:0 0 28px}" +
            "  .token-label{font-size:11px;font-weight:600;color:#666;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}" +
            "  .token-value{font-family:monospace;font-size:28px;font-weight:700;color:#3b82f6;letter-spacing:6px;word-break:break-all}" +
            "  .divider{height:1px;background:linear-gradient(to right,transparent,#2a2a2a,transparent);margin:28px 0}" +
            "  .warning{background:rgba(59,130,246,0.06);border-left:3px solid rgba(59,130,246,0.4);border-radius:4px;padding:12px 16px;font-size:13px;color:#888}" +
            "  .footer{background:#0d0d0d;padding:28px 40px;text-align:center;border-top:1px solid #1e1e1e}" +
            "  .footer p{font-size:12px;color:#444;line-height:1.8}" +
            "  .footer a{color:#666;text-decoration:none}" +
            "</style></head><body>" +
            "<div class='wrapper'>" +
            "  <div class='card'>" +
            "    <div class='hero'>" +
            "      <div class='logo'>" +
            "        <span style='font-size:32px;margin-right:8px'>▶</span>" +
            "        <span class='logo-text'>ZETFLIX</span>" +
            "      </div>" +
            "      <div class='hero-title'>Reset your password</div>" +
            "      <div class='hero-sub'>Use the code below to create a new password</div>" +
            "    </div>" +
            "    <div class='body'>" +
            "      <p class='greeting'>Hi " + escapeHtml(name) + ",</p>" +
            "      <p class='copy'>We received a request to reset the password for your Zetflix account. Enter the code below on the password reset screen. This code expires in <strong style='color:#fff'>15 minutes</strong>.</p>" +
            "      <div class='token-box'>" +
            "        <div class='token-label'>Password reset code</div>" +
            "        <div class='token-value'>" + escapeHtml(token) + "</div>" +
            "      </div>" +
            "      <div class='divider'></div>" +
            "      <div class='warning'>🔒 If you did not request a password reset, please ignore this email — your account is safe.</div>" +
            "    </div>" +
            "    <div class='footer'>" +
            "      <p>This is an automated message from Zetflix.</p>" +
            "      <p style='margin-top:8px'>&copy; " + java.time.Year.now() + " Zetflix Inc.</p>" +
            "    </div>" +
            "  </div>" +
            "</div></body></html>";
    }

    /** Prevent XSS / injection in HTML email templates */
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#x27;");
    }
}
