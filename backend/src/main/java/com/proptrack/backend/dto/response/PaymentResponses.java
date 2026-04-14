package com.proptrack.backend.dto.response;

import com.proptrack.backend.entity.Payment.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentResponses {

    public record PaymentResponse(
            String id,
            String propertyId,
            AuthResponses.UserResponse paidBy,
            BigDecimal amount,
            LocalDate paymentDate,
            PaymentType paymentType,
            String utrNumber,
            String bankName,
            String notes,
            String screenshotUrl,
            boolean ocrProcessed,
            String createdAt
    ) {}

    public record OcrResultDto(
            String utrNumber,
            BigDecimal amount,
            LocalDate paymentDate,
            String bankName,
            String senderName,
            String receiverName,
            String confidence,
            String rawText
    ) {}

    public record UploadScreenshotResponse(
            String screenshotUrl,
            OcrResultDto ocrResult
    ) {}
}