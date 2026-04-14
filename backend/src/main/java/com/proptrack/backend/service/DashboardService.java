package com.proptrack.backend.service;

import com.proptrack.backend.dto.response.DashboardResponse;
import com.proptrack.backend.dto.response.LoanResponses.LoanResponse;
import com.proptrack.backend.dto.response.PropertyResponses;
import com.proptrack.backend.entity.*;
import com.proptrack.backend.entity.EmiSchedule.EmiStatus;
import com.proptrack.backend.entity.Loan.LoanStatus;
import com.proptrack.backend.repository.EmiScheduleRepository;
import com.proptrack.backend.repository.LoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PropertyService propertyService;
    private final LoanService loanService;
    private final LoanRepository loanRepository;
    private final EmiScheduleRepository emiScheduleRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getSummary(String propertyId, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);

        // Clean Optional lookup — no exception control flow
        Optional<Loan> activeLoan = loanRepository.findFirstByPropertyAndStatus(property, LoanStatus.ACTIVE);

        LoanResponse loanResponse = null;
        BigDecimal outstandingPrincipal = BigDecimal.ZERO;
        BigDecimal totalInterestPaid = BigDecimal.ZERO;
        int emisPaid = 0;
        int emisRemaining = 0;
        LocalDate nextEmiDueDate = null;
        BigDecimal nextEmiAmount = null;

        if (activeLoan.isPresent()) {
            Loan loan = activeLoan.get();
            List<EmiSchedule> schedule = emiScheduleRepository.findByLoanOrderByEmiNumberAsc(loan);
            loanResponse = loanService.toResponse(loan, schedule);

            outstandingPrincipal = loanResponse.outstandingPrincipal();
            totalInterestPaid = loanResponse.totalInterestPaid();
            emisPaid = loanResponse.emisPaid();
            emisRemaining = loanResponse.emisRemaining();

            // First pending or overdue EMI = next due
            Optional<EmiSchedule> nextEmi = schedule.stream()
                    .filter(e -> e.getStatus() == EmiStatus.PENDING
                            || e.getStatus() == EmiStatus.OVERDUE)
                    .findFirst();

            if (nextEmi.isPresent()) {
                nextEmiDueDate = nextEmi.get().getDueDate();
                nextEmiAmount = nextEmi.get().getEmiAmount();
            }
        }

        List<PropertyResponses.PartnerSummaryResponse> partnerSummaries =
                propertyService.getPartnerSummaries(propertyId, user);

        // Total invested = sum of all partner payments
        BigDecimal totalInvested = partnerSummaries.stream()
                .map(ps -> ps.totalPaid())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long daysUntilPossession = ChronoUnit.DAYS.between(
                LocalDate.now(), property.getPossessionDate()
        );

        return new DashboardResponse(
                propertyService.toResponse(property),
                loanResponse,
                totalInvested,
                outstandingPrincipal,
                totalInterestPaid,
                emisPaid,
                emisRemaining,
                nextEmiDueDate,
                nextEmiAmount,
                partnerSummaries,
                Math.max(0, daysUntilPossession)
        );
    }
}