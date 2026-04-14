package com.proptrack.backend.dto.request;

import com.proptrack.backend.entity.Property.PropertyStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PropertyRequests {

    public record CreatePropertyRequest(
            @NotBlank @Size(max = 255)
            String name,

            @NotBlank
            String address,

            @NotBlank @Size(max = 100)
            String city,

            @NotBlank @Size(max = 100)
            String state,

            @Positive
            BigDecimal areaSqft,

            @NotNull @Positive
            BigDecimal purchasePrice,

            @NotNull
            LocalDate purchaseDate,

            @NotNull
            LocalDate possessionDate,

            String builderName,

            // Partner user ID — the person sharing ownership (optional at creation)
            String partnerUserId
    ) {}

    public record UpdateValuationRequest(
            @NotNull @Positive
            BigDecimal amount,

            @NotNull
            LocalDate valuationDate,

            String source,
            String notes
    ) {}

    public record UpdatePropertyStatusRequest(
            @NotNull
            PropertyStatus status
    ) {}

    public record InvitePartnerRequest(
            @NotBlank @Email
            String email,

            @DecimalMin("1.0") @DecimalMax("99.0")
            BigDecimal sharePercent
    ) {}
}