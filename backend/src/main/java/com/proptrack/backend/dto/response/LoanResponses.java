package com.proptrack.backend.dto.response;

import com.proptrack.backend.entity.EmiSchedule.EmiStatus;
import com.proptrack.backend.entity.Loan.LoanStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanResponses {

    public record LoanResponse(
            String id,
            String propertyId,
            String bankName,
            BigDecimal sanctionAmount,
            BigDecimal disbursedAmount,
            BigDecimal interestRate,
            Integer tenureMonths,
            BigDecimal emiAmount,
            LocalDate startDate,
            String loanAccountNumber,
            LoanStatus status,
            // Computed fields
            BigDecimal outstandingPrincipal,
            BigDecimal totalInterestPaid,
            BigDecimal totalPrincipalPaid,
            Integer emisPaid,
            Integer emisRemaining
    ) {}

    public record EmiScheduleResponse(
            String id,
            Integer emiNumber,
            LocalDate dueDate,
            BigDecimal emiAmount,
            BigDecimal principalComponent,
            BigDecimal interestComponent,
            BigDecimal balanceAfter,
            EmiStatus status,
            LocalDate paidDate,
            BigDecimal paidAmount
    ) {}

    public record AmortisationSummaryResponse(
            BigDecimal totalLoanAmount,
            BigDecimal totalInterestPayable,
            BigDecimal totalPayable,
            BigDecimal monthlyEmi,
            Integer tenureMonths
    ) {}
}