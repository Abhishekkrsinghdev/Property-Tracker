package com.proptrack.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        PropertyResponses.PropertyResponse property,
        LoanResponses.LoanResponse loan,
        BigDecimal totalInvested,
        BigDecimal outstandingPrincipal,
        BigDecimal totalInterestPaid,
        Integer emisPaid,
        Integer emisRemaining,
        LocalDate nextEmiDueDate,
        BigDecimal nextEmiAmount,
        List<PropertyResponses.PartnerSummaryResponse> partnerSummaries,
        Long daysUntilPossession
) {}