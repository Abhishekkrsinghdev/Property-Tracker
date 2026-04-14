package com.proptrack.backend.dto.response;

import com.proptrack.backend.entity.User.UserRole;

public class AuthResponses {

    public record UserResponse(
            String id,
            String email,
            String fullName,
            UserRole role
    ) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            UserResponse user
    ) {}
}