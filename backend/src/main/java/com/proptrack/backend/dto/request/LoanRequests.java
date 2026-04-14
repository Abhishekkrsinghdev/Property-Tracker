package com.proptrack.backend.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanRequests {

    public record CreateLoanRequest(
            @NotBlank @Size(max = 255)
            String bankName,

            @NotNull @Positive
            BigDecimal sanctionAmount,

            @NotNull @Positive
            BigDecimal disbursedAmount,

            // Annual interest rate e.g. 8.75
            @NotNull @DecimalMin("1.0") @DecimalMax("30.0")
            BigDecimal interestRate,

            @NotNull @Min(12) @Max(360)
            Integer tenureMonths,

            @NotNull
            LocalDate startDate,

            String loanAccountNumber
    ) {}

    public record PrepaymentRequest(
            @NotNull @Positive
            BigDecimal amount,

            @NotNull
            LocalDate paymentDate
    ) {}
}