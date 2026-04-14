package com.proptrack.backend.controller;

import com.proptrack.backend.entity.User;
import com.proptrack.backend.exception.ResourceNotFoundException;
import com.proptrack.backend.repository.UserRepository;
import com.proptrack.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Resolves the full User entity from the authenticated UserPrincipal.
 * Injected into controllers that need the full entity (not just the ID).
 * Keeps controllers clean — one line to get the current user.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private final UserRepository userRepository;

    public User resolve(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}