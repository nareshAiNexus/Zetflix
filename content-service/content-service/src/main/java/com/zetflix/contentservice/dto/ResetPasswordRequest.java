package com.zetflix.contentservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Token/OTP is required")
    private String token;

    @NotBlank(message = "Password is required")
    private String password;
}
