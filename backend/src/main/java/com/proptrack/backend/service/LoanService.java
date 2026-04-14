package com.proptrack.backend.service;

import com.proptrack.backend.dto.request.LoanRequests.*;
import com.proptrack.backend.dto.request.PaymentRequests.MarkEmiPaidRequest;
import com.proptrack.backend.dto.response.LoanResponses.*;
import com.proptrack.backend.entity.*;
import com.proptrack.backend.entity.EmiSchedule.EmiStatus;
import com.proptrack.backend.exception.BadRequestException;
import com.proptrack.backend.exception.ResourceNotFoundException;
import com.proptrack.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRepository loanRepository;
    private final EmiScheduleRepository emiScheduleRepository;
    private final PropertyService propertyService;
    private final AmortisationEngine amortisationEngine;

    @Transactional
    public LoanResponse createLoan(String propertyId, CreateLoanRequest request, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);

        // Only one active loan per property
        loanRepository.findFirstByPropertyAndStatus(property, Loan.LoanStatus.ACTIVE)
                .ifPresent(l -> { throw new BadRequestException("Property already has an active loan"); });

        BigDecimal emi = amortisationEngine.calculateEmi(
                request.disbursedAmount(),
                request.interestRate(),
                request.tenureMonths()
        );

        Loan loan = Loan.builder()
                .property(property)
                .bankName(request.bankName())
                .sanctionAmount(request.sanctionAmount())
                .disbursedAmount(request.disbursedAmount())
                .interestRate(request.interestRate())
                .tenureMonths(request.tenureMonths())
                .emiAmount(emi)
                .startDate(request.startDate())
                .loanAccountNumber(request.loanAccountNumber())
                .status(Loan.LoanStatus.ACTIVE)
                .build();

        loanRepository.save(loan);

        // Generate and persist the full amortisation schedule
        List<EmiSchedule> schedule = amortisationEngine.generateSchedule(loan);
        emiScheduleRepository.saveAll(schedule);

        return toResponse(loan, schedule);
    }

    @Transactional(readOnly = true)
    public LoanResponse getLoan(String propertyId, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);
        Loan loan = findActiveLoan(property);
        List<EmiSchedule> schedule = emiScheduleRepository.findByLoanOrderByEmiNumberAsc(loan);
        return toResponse(loan, schedule);
    }

    @Transactional(readOnly = true)
    public List<EmiScheduleResponse> getSchedule(String propertyId, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);
        Loan loan = findActiveLoan(property);
        return emiScheduleRepository.findByLoanOrderByEmiNumberAsc(loan)
                .stream()
                .map(this::toEmiResponse)
                .toList();
    }

    @Transactional
    public EmiScheduleResponse markEmiPaid(String emiId, MarkEmiPaidRequest request, User user) {
        EmiSchedule emi = emiScheduleRepository.findById(UUID.fromString(emiId))
                .orElseThrow(() -> new ResourceNotFoundException("EMI", emiId));

        // Verify user has access to this EMI's property
        propertyService.findAccessibleProperty(
                emi.getLoan().getProperty().getId().toString(), user
        );

        if (emi.getStatus() == EmiStatus.PAID) {
            throw new BadRequestException("EMI is already marked as paid");
        }

        emi.setStatus(EmiStatus.PAID);
        emi.setPaidDate(request.paidDate());
        emi.setPaidAmount(request.paidAmount() != null ? request.paidAmount() : emi.getEmiAmount());
        emiScheduleRepository.save(emi);

        return toEmiResponse(emi);
    }

    @Transactional
    public void markOverdueEmis() {
        // Called by scheduled job — marks all pending EMIs past their due date
        List<EmiSchedule> overdue = emiScheduleRepository.findOverdueEmis(LocalDate.now());
        overdue.forEach(e -> e.setStatus(EmiStatus.OVERDUE));
        emiScheduleRepository.saveAll(overdue);
    }

    // ── Package-visible helpers ───────────────────────────────────────────────

    Loan findActiveLoan(Property property) {
        return loanRepository.findFirstByPropertyAndStatus(property, Loan.LoanStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active loan found for property"));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    LoanResponse toResponse(Loan loan, List<EmiSchedule> schedule) {
        long emisPaid = schedule.stream().filter(e -> e.getStatus() == EmiStatus.PAID).count();
        long emisRemaining = schedule.stream().filter(e -> e.getStatus() != EmiStatus.PAID).count();

        BigDecimal totalInterestPaid = schedule.stream()
                .filter(e -> e.getStatus() == EmiStatus.PAID)
                .map(EmiSchedule::getInterestComponent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPrincipalPaid = schedule.stream()
                .filter(e -> e.getStatus() == EmiStatus.PAID)
                .map(EmiSchedule::getPrincipalComponent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = amortisationEngine.calculateOutstandingPrincipal(schedule);

        return new LoanResponse(
                loan.getId().toString(),
                loan.getProperty().getId().toString(),
                loan.getBankName(),
                loan.getSanctionAmount(),
                loan.getDisbursedAmount(),
                loan.getInterestRate(),
                loan.getTenureMonths(),
                loan.getEmiAmount(),
                loan.getStartDate(),
                loan.getLoanAccountNumber(),
                loan.getStatus(),
                outstanding,
                totalInterestPaid,
                totalPrincipalPaid,
                (int) emisPaid,
                (int) emisRemaining
        );
    }

    private EmiScheduleResponse toEmiResponse(EmiSchedule e) {
        return new EmiScheduleResponse(
                e.getId().toString(),
                e.getEmiNumber(),
                e.getDueDate(),
                e.getEmiAmount(),
                e.getPrincipalComponent(),
                e.getInterestComponent(),
                e.getBalanceAfter(),
                e.getStatus(),
                e.getPaidDate(),
                e.getPaidAmount()
        );
    }
}