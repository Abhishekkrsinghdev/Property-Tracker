package com.proptrack.backend.controller;

import com.proptrack.backend.dto.request.PaymentRequests.CreatePaymentRequest;
import com.proptrack.backend.dto.response.PaymentResponses.PaymentResponse;
import com.proptrack.backend.dto.response.PaymentResponses.UploadScreenshotResponse;
import com.proptrack.backend.security.UserPrincipal;
import com.proptrack.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/properties/{propertyId}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final CurrentUserResolver currentUser;

    @PostMapping
    public ResponseEntity<PaymentResponse> create(
            @PathVariable String propertyId,
            @Valid @RequestBody CreatePaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createPayment(propertyId, request, currentUser.resolve(principal)));
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getAll(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                paymentService.getPayments(propertyId, currentUser.resolve(principal))
        );
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponse> getById(
            @PathVariable String propertyId,
            @PathVariable String paymentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                paymentService.getById(paymentId, currentUser.resolve(principal))
        );
    }

    @PostMapping("/upload-screenshot")
    public ResponseEntity<UploadScreenshotResponse> uploadScreenshot(
            @PathVariable String propertyId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                paymentService.uploadScreenshot(propertyId, file, currentUser.resolve(principal))
        );
    }
}