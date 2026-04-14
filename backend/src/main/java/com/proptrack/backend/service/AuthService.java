package com.proptrack.backend.service;

import com.proptrack.backend.dto.request.AuthRequests.*;
import com.proptrack.backend.dto.response.AuthResponses.*;
import com.proptrack.backend.entity.RefreshToken;
import com.proptrack.backend.entity.User;
import com.proptrack.backend.entity.User.UserRole;
import com.proptrack.backend.exception.BadRequestException;
import com.proptrack.backend.exception.ResourceNotFoundException;
import com.proptrack.backend.repository.RefreshTokenRepository;
import com.proptrack.backend.repository.UserRepository;
import com.proptrack.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .role(UserRole.OWNER)
                .build();

        userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Delegates to Spring Security — throws BadCredentialsException on failure
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.email()));

        // Invalidate existing refresh tokens for this user
        refreshTokenRepository.deleteByUser(user);

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            throw new BadRequestException("Refresh token expired — please login again");
        }

        User user = stored.getUser();
        refreshTokenRepository.delete(stored);
        return buildAuthResponse(user);
    }

    @Transactional
    public void logout(User user) {
        refreshTokenRepository.deleteByUser(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtUtil.generateToken(user.getEmail());
        String refreshToken = createRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, toUserResponse(user));
    }

    private String createRefreshToken(User user) {
        String token = UUID.randomUUID().toString();
        refreshTokenRepository.save(
                RefreshToken.builder()
                        .user(user)
                        .token(token)
                        .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                        .build()
        );
        return token;
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );
    }
}