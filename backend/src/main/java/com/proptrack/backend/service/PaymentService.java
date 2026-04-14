package com.proptrack.backend.service;

import com.proptrack.backend.dto.request.PaymentRequests.CreatePaymentRequest;
import com.proptrack.backend.dto.response.AuthResponses.UserResponse;
import com.proptrack.backend.dto.response.PaymentResponses.PaymentResponse;
import com.proptrack.backend.entity.*;
import com.proptrack.backend.exception.ResourceNotFoundException;
import com.proptrack.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import com.proptrack.backend.dto.response.PaymentResponses.UploadScreenshotResponse;
import com.proptrack.backend.dto.response.PaymentResponses.OcrResultDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestClient;
import java.util.Map;

import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PropertyService propertyService;
    private final StorageService storageService;
    private final RestClient restClient;

    public PaymentService(
            PaymentRepository paymentRepository,
            PropertyService propertyService,
            StorageService storageService,
            RestClient.Builder restClientBuilder,
            @Value("${app.ai-service.url}") String aiServiceUrl) {
        this.paymentRepository = paymentRepository;
        this.propertyService = propertyService;
        this.storageService = storageService;
        this.restClient = restClientBuilder.baseUrl(aiServiceUrl).build();
    }

    @Transactional
    public PaymentResponse createPayment(String propertyId, CreatePaymentRequest request, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);

        Payment payment = Payment.builder()
                .property(property)
                .paidBy(user)
                .amount(request.amount())
                .paymentDate(request.paymentDate())
                .paymentType(request.paymentType())
                .utrNumber(request.utrNumber())
                .bankName(request.bankName())
                .notes(request.notes())
                .screenshotUrl(request.screenshotUrl())
                .ocrProcessed(request.screenshotUrl() != null)
                .build();

        paymentRepository.save(payment);
        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(String propertyId, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);
        return paymentRepository.findByPropertyOrderByPaymentDateDesc(property)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse getById(String paymentId, User user) {
        Payment payment = paymentRepository.findById(
                java.util.UUID.fromString(paymentId)
        ).orElseThrow(() -> new ResourceNotFoundException("Payment", paymentId));

        // Verify access
        propertyService.findAccessibleProperty(
                payment.getProperty().getId().toString(), user
        );
        return toResponse(payment);
    }

    public UploadScreenshotResponse uploadScreenshot(String propertyId, MultipartFile file, User user) {
        propertyService.findAccessibleProperty(propertyId, user); // Check ownership
        String screenshotUrl = storageService.uploadFile(file, "receipts");

        try {
            OcrResultDto ocrResult = restClient.post()
                    .uri("/ocr/payment")
                    .body(Map.of("image_url", screenshotUrl))
                    .retrieve()
                    .body(OcrResultDto.class);
            return new UploadScreenshotResponse(screenshotUrl, ocrResult);
        } catch (Exception e) {
            // Gracefully handle AI failure by returning the URL without OCR data
            return new UploadScreenshotResponse(screenshotUrl, null);
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private PaymentResponse toResponse(Payment p) {
        User paidBy = p.getPaidBy();
        return new PaymentResponse(
                p.getId().toString(),
                p.getProperty().getId().toString(),
                new UserResponse(
                        paidBy.getId().toString(),
                        paidBy.getEmail(),
                        paidBy.getFullName(),
                        paidBy.getRole()
                ),
                p.getAmount(),
                p.getPaymentDate(),
                p.getPaymentType(),
                p.getUtrNumber(),
                p.getBankName(),
                p.getNotes(),
                p.getScreenshotUrl(),
                p.isOcrProcessed(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
        );
    }
}