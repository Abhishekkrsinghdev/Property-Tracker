package com.proptrack.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequests {

    public record RegisterRequest(
            @NotBlank @Email
            String email,

            @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
            String password,

            @NotBlank @Size(min = 2, max = 100)
            String fullName
    ) {}

    public record LoginRequest(
            @NotBlank @Email
            String email,

            @NotBlank
            String password
    ) {}

    public record RefreshTokenRequest(
            @NotBlank
            String refreshToken
    ) {}
}