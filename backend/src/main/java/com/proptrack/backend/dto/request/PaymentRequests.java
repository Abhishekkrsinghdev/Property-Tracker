package com.proptrack.backend.dto.request;

import com.proptrack.backend.entity.Payment.PaymentType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentRequests {

    public record CreatePaymentRequest(
            @NotNull @Positive
            BigDecimal amount,

            @NotNull
            LocalDate paymentDate,

            @NotNull
            PaymentType paymentType,

            @Size(max = 100)
            String utrNumber,

            @Size(max = 100)
            String bankName,

            String notes,

            // Populated by OCR flow — set by backend after screenshot processing
            String screenshotUrl
    ) {}

    public record MarkEmiPaidRequest(
            @NotNull
            LocalDate paidDate,

            // Actual amount paid — may differ slightly from scheduled EMI
            @Positive
            BigDecimal paidAmount
    ) {}
}