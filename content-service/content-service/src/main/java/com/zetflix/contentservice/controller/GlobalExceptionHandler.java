package com.zetflix.contentservice.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler that converts all service-layer exceptions
 * into clean, user-facing JSON messages instead of raw Spring 500 errors.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Validation errors (e.g., @NotBlank, @Email on DTOs) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    /** Duplicate email / DB constraint violations */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDuplicate(DataIntegrityViolationException ex) {
        String msg = ex.getMessage() != null && ex.getMessage().contains("email")
                ? "An account with this email address already exists."
                : "A database constraint was violated. Please check your input.";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", msg));
    }

    /** Business rule violations thrown from the service layer (e.g., wrong OTP, duplicate email) */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage();
        if (msg == null || msg.isBlank()) {
            msg = "An unexpected error occurred. Please try again.";
        }

        // Map specific messages to HTTP status codes
        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (msg.toLowerCase().contains("already registered") || msg.toLowerCase().contains("already exists")) {
            status = HttpStatus.CONFLICT; // 409
        } else if (msg.toLowerCase().contains("unauthorized") || msg.toLowerCase().contains("not verified")) {
            status = HttpStatus.UNAUTHORIZED; // 401
        } else if (msg.toLowerCase().contains("not found")) {
            status = HttpStatus.NOT_FOUND; // 404
        } else if (msg.toLowerCase().contains("expired") || msg.toLowerCase().contains("invalid")) {
            status = HttpStatus.UNPROCESSABLE_ENTITY; // 422
        }

        return ResponseEntity.status(status).body(Map.of("error", msg));
    }
}
