package com.proptrack.backend.service;

import com.proptrack.backend.dto.request.PropertyRequests.*;
import com.proptrack.backend.dto.response.AuthResponses.UserResponse;
import com.proptrack.backend.dto.response.PropertyResponses.*;
import com.proptrack.backend.entity.*;
import com.proptrack.backend.entity.Property.PropertyStatus;
import com.proptrack.backend.exception.BadRequestException;
import com.proptrack.backend.exception.ResourceNotFoundException;
import com.proptrack.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyPartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final ValuationHistoryRepository valuationHistoryRepository;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public PropertyResponse create(CreatePropertyRequest request, User owner) {
        Property property = Property.builder()
                .name(request.name())
                .address(request.address())
                .city(request.city())
                .state(request.state())
                .areaSqft(request.areaSqft())
                .purchasePrice(request.purchasePrice())
                .purchaseDate(request.purchaseDate())
                .possessionDate(request.possessionDate())
                .builderName(request.builderName())
                .status(PropertyStatus.UNDER_CONSTRUCTION)
                .createdBy(owner)
                .build();

        propertyRepository.save(property);

        valuationHistoryRepository.save(
                ValuationHistory.builder()
                        .property(property)
                        .valuationDate(request.purchaseDate())
                        .amount(request.purchasePrice())
                        .source("PURCHASE")
                        .createdBy(owner)
                        .build()
        );

        // Owner is always a partner with their share
        addPartner(property, owner, BigDecimal.valueOf(50));

        // Optionally add co-owner at creation time
        if (request.partnerUserId() != null) {
            User partner = userRepository.findById(UUID.fromString(request.partnerUserId()))
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.partnerUserId()));
            addPartner(property, partner, BigDecimal.valueOf(50));
        }

        return toResponse(property);
    }

    @Transactional(readOnly = true)
    public List<PropertyResponse> getAllForUser(User user) {
        return propertyRepository.findAllAccessibleByUser(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PropertyResponse getById(String propertyId, User user) {
        Property property = findAccessibleProperty(propertyId, user);
        return toResponse(property);
    }

    @Transactional
    public PropertyResponse updateValuation(String propertyId, UpdateValuationRequest request, User user) {
        Property property = findAccessibleProperty(propertyId, user);
        property.setCurrentValuation(request.amount());
        propertyRepository.save(property);

        valuationHistoryRepository.save(
                ValuationHistory.builder()
                        .property(property)
                        .valuationDate(request.valuationDate())
                        .amount(request.amount())
                        .source(request.source() != null ? request.source() : "MANUAL")
                        .notes(request.notes())
                        .createdBy(user)
                        .build()
        );

        return toResponse(property);
    }

    @Transactional
    public PropertyResponse updateStatus(String propertyId, UpdatePropertyStatusRequest request, User user) {
        Property property = findAccessibleProperty(propertyId, user);
        property.setStatus(request.status());
        propertyRepository.save(property);
        return toResponse(property);
    }

    @Transactional(readOnly = true)
    public List<PartnerSummaryResponse> getPartnerSummaries(String propertyId, User user) {
        Property property = findAccessibleProperty(propertyId, user);
        BigDecimal totalPaid = paymentRepository.sumByProperty(property);

        return partnerRepository.findByProperty(property).stream()
                .map(partner -> {
                    BigDecimal partnerPaid = paymentRepository.sumByPropertyAndUser(property, partner.getUser());
                    BigDecimal expectedShare = totalPaid.multiply(
                            partner.getSharePercent().divide(BigDecimal.valueOf(100))
                    );
                    BigDecimal balance = partnerPaid.subtract(expectedShare);

                    return new PartnerSummaryResponse(
                            toUserResponse(partner.getUser()),
                            partner.getSharePercent(),
                            partnerPaid,
                            expectedShare,
                            balance
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ValuationHistoryResponse> getValuationHistory(String propertyId, User user) {
        Property property = findAccessibleProperty(propertyId, user);
        return valuationHistoryRepository.findByPropertyOrderByValuationDateDesc(property)
                .stream()
                .map(vh -> new ValuationHistoryResponse(
                        vh.getId().toString(),
                        vh.getValuationDate().toString(),
                        vh.getAmount(),
                        vh.getSource(),
                        vh.getNotes()
                ))
                .toList();
    }

    @Transactional
    public InvitePartnerResponse invitePartner(String propertyId, InvitePartnerRequest request, User inviter) {
        Property property = findAccessibleProperty(propertyId, inviter);

        // Only the creator can invite partners
        if (!property.getCreatedBy().getId().equals(inviter.getId())) {
            throw new BadRequestException("Only the property owner can invite partners.");
        }

        String partnerEmail = request.email().toLowerCase().trim();

        // Sanity check — can't invite yourself
        if (partnerEmail.equalsIgnoreCase(inviter.getEmail())) {
            throw new BadRequestException("You cannot invite yourself as a partner.");
        }

        java.util.Optional<User> existingUser = userRepository.findByEmail(partnerEmail);
        boolean isExistingUser = existingUser.isPresent();

        if (isExistingUser) {
            User partner = existingUser.get();
            if (partnerRepository.existsByPropertyAndUser(property, partner)) {
                throw new BadRequestException("This user is already a partner on this property.");
            }
            addPartner(property, partner, request.sharePercent());
        }

        // Send invite email — works for both registered and unregistered users
        String subject = inviter.getFullName() + " invited you to PropTrack AI";
        String body;
        if (isExistingUser) {
            body = String.format("""
                    <h3>You've been added as a co-owner!</h3>
                    <p>Hi,</p>
                    <p><strong>%s</strong> has added you as a partner on <strong>%s</strong> with a <strong>%.1f%%</strong> ownership share.</p>
                    <p>Log in to your PropTrack dashboard to view the property details.</p>
                    <p>Best,<br/>PropTrack AI</p>
                    """, inviter.getFullName(), property.getName(), request.sharePercent());
        } else {
            body = String.format("""
                    <h3>You've been invited to PropTrack AI!</h3>
                    <p>Hi,</p>
                    <p><strong>%s</strong> has invited you to co-own <strong>%s</strong> with a <strong>%.1f%%</strong> ownership share.</p>
                    <p>Click below to create your account and accept the invitation.</p>
                    <p><a href="%s/register">Create Account →</a></p>
                    <p>Best,<br/>PropTrack AI</p>
                    """, inviter.getFullName(), property.getName(), request.sharePercent(), frontendUrl);
        }

        emailService.sendEmail(partnerEmail, subject, body);

        String message = isExistingUser
                ? "Partner added successfully and notified via email."
                : "Invitation email sent. They will be added once they register.";

        return new InvitePartnerResponse(message, isExistingUser, partnerEmail);
    }

    // ── Package-visible helper used by DashboardService ───────────────────────

    Property findAccessibleProperty(String propertyId, User user) {
        Property property = propertyRepository.findById(UUID.fromString(propertyId))
                .orElseThrow(() -> new ResourceNotFoundException("Property", propertyId));

        boolean isOwner = property.getCreatedBy().getId().equals(user.getId());
        boolean isPartner = partnerRepository.existsByPropertyAndUser(property, user);

        if (!isOwner && !isPartner) {
            throw new BadRequestException("You do not have access to this property");
        }
        return property;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void addPartner(Property property, User user, BigDecimal sharePercent) {
        if (!partnerRepository.existsByPropertyAndUser(property, user)) {
            partnerRepository.save(
                    PropertyPartner.builder()
                            .property(property)
                            .user(user)
                            .sharePercent(sharePercent)
                            .build()
            );
        }
    }

    PropertyResponse toResponse(Property p) {
        return new PropertyResponse(
                p.getId().toString(),
                p.getName(),
                p.getAddress(),
                p.getCity(),
                p.getState(),
                p.getAreaSqft(),
                p.getPurchasePrice(),
                p.getPurchaseDate(),
                p.getPossessionDate(),
                p.getBuilderName(),
                p.getCurrentValuation(),
                p.getStatus(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
        );
    }

    UserResponse toUserResponse(User u) {
        return new UserResponse(u.getId().toString(), u.getEmail(), u.getFullName(), u.getRole());
    }
}