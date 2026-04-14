package com.proptrack.backend.dto.response;

import com.proptrack.backend.entity.Property.PropertyStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PropertyResponses {

    public record PropertyResponse(
            String id,
            String name,
            String address,
            String city,
            String state,
            BigDecimal areaSqft,
            BigDecimal purchasePrice,
            LocalDate purchaseDate,
            LocalDate possessionDate,
            String builderName,
            BigDecimal currentValuation,
            PropertyStatus status,
            String createdAt
    ) {}

    public record PartnerSummaryResponse(
            AuthResponses.UserResponse user,
            BigDecimal sharePercent,
            BigDecimal totalPaid,
            BigDecimal expectedShare,
            BigDecimal balance   // positive = overpaid, negative = underpaid
    ) {}

    public record ValuationHistoryResponse(
            String id,
            String valuationDate,
            BigDecimal amount,
            String source,
            String notes
    ) {}

    public record InvitePartnerResponse(
            String message,
            boolean existingUser,
            String partnerEmail
    ) {}
}