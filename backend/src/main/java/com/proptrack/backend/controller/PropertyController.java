package com.proptrack.backend.controller;

import com.proptrack.backend.dto.request.PropertyRequests.*;
import com.proptrack.backend.dto.response.PropertyResponses.*;
import com.proptrack.backend.security.UserPrincipal;
import com.proptrack.backend.service.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final CurrentUserResolver currentUser;

    @PostMapping
    public ResponseEntity<PropertyResponse> create(
            @Valid @RequestBody CreatePropertyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(propertyService.create(request, currentUser.resolve(principal)));
    }

    @GetMapping
    public ResponseEntity<List<PropertyResponse>> getAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(propertyService.getAllForUser(currentUser.resolve(principal)));
    }

    @GetMapping("/{propertyId}")
    public ResponseEntity<PropertyResponse> getById(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(propertyService.getById(propertyId, currentUser.resolve(principal)));
    }

    @PatchMapping("/{propertyId}/valuation")
    public ResponseEntity<PropertyResponse> updateValuation(
            @PathVariable String propertyId,
            @Valid @RequestBody UpdateValuationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                propertyService.updateValuation(propertyId, request, currentUser.resolve(principal))
        );
    }

    @PatchMapping("/{propertyId}/status")
    public ResponseEntity<PropertyResponse> updateStatus(
            @PathVariable String propertyId,
            @Valid @RequestBody UpdatePropertyStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                propertyService.updateStatus(propertyId, request, currentUser.resolve(principal))
        );
    }

    @GetMapping("/{propertyId}/valuation-history")
    public ResponseEntity<List<ValuationHistoryResponse>> getValuationHistory(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                propertyService.getValuationHistory(propertyId, currentUser.resolve(principal))
        );
    }

    @GetMapping("/{propertyId}/partners")
    public ResponseEntity<List<PartnerSummaryResponse>> getPartners(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                propertyService.getPartnerSummaries(propertyId, currentUser.resolve(principal))
        );
    }

    @PostMapping("/{propertyId}/partners/invite")
    public ResponseEntity<InvitePartnerResponse> invitePartner(
            @PathVariable String propertyId,
            @Valid @RequestBody InvitePartnerRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                propertyService.invitePartner(propertyId, request, currentUser.resolve(principal))
        );
    }
}