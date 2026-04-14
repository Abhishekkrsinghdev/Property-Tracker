package com.proptrack.backend.controller;

import com.proptrack.backend.dto.request.LoanRequests.CreateLoanRequest;
import com.proptrack.backend.dto.request.PaymentRequests.MarkEmiPaidRequest;
import com.proptrack.backend.dto.response.LoanResponses.*;
import com.proptrack.backend.security.UserPrincipal;
import com.proptrack.backend.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/properties/{propertyId}")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;
    private final CurrentUserResolver currentUser;

    @PostMapping("/loan")
    public ResponseEntity<LoanResponse> createLoan(
            @PathVariable String propertyId,
            @Valid @RequestBody CreateLoanRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loanService.createLoan(propertyId, request, currentUser.resolve(principal)));
    }

    @GetMapping("/loan")
    public ResponseEntity<LoanResponse> getLoan(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(loanService.getLoan(propertyId, currentUser.resolve(principal)));
    }

    @GetMapping("/loan/schedule")
    public ResponseEntity<List<EmiScheduleResponse>> getSchedule(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(loanService.getSchedule(propertyId, currentUser.resolve(principal)));
    }

    @PatchMapping("/loan/emis/{emiId}/pay")
    public ResponseEntity<EmiScheduleResponse> markEmiPaid(
            @PathVariable String propertyId,
            @PathVariable String emiId,
            @Valid @RequestBody MarkEmiPaidRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                loanService.markEmiPaid(emiId, request, currentUser.resolve(principal))
        );
    }
}