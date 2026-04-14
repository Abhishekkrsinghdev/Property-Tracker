package com.proptrack.backend.service;

import com.proptrack.backend.entity.EmiSchedule;
import com.proptrack.backend.entity.Loan;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure financial calculation engine — no DB access, no Spring dependencies beyond @Component.
 * Separated from LoanService deliberately so it can be unit tested in isolation.
 *
 * EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * where P = principal, r = monthly rate, n = tenure months
 */
@Component
public class AmortisationEngine {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    /**
     * Calculates the fixed monthly EMI for a loan.
     */
    public BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRatePercent, int tenureMonths) {
        BigDecimal monthlyRate = annualRatePercent
                .divide(BigDecimal.valueOf(100 * 12), MC);

        // (1 + r)^n
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, MC);
        BigDecimal onePlusRPowN = onePlusR.pow(tenureMonths, MC);

        // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal numerator = principal.multiply(monthlyRate, MC).multiply(onePlusRPowN, MC);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE, MC);

        return numerator.divide(denominator, 2, ROUNDING);
    }

    /**
     * Generates the full amortisation schedule for a loan.
     * Each entry shows the principal/interest split and running balance.
     */
    public List<EmiSchedule> generateSchedule(Loan loan) {
        BigDecimal monthlyRate = loan.getInterestRate()
                .divide(BigDecimal.valueOf(100 * 12), MC);

        BigDecimal emi = loan.getEmiAmount();
        BigDecimal balance = loan.getDisbursedAmount();
        LocalDate dueDate = loan.getStartDate().plusMonths(1);

        List<EmiSchedule> schedule = new ArrayList<>();

        for (int i = 1; i <= loan.getTenureMonths(); i++) {
            BigDecimal interestComponent = balance.multiply(monthlyRate, MC)
                    .setScale(2, ROUNDING);

            BigDecimal principalComponent = emi.subtract(interestComponent)
                    .setScale(2, ROUNDING);

            // Last EMI adjustment — handles rounding residual
            if (i == loan.getTenureMonths()) {
                principalComponent = balance;
                emi = principalComponent.add(interestComponent);
            }

            balance = balance.subtract(principalComponent).setScale(2, ROUNDING);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                balance = BigDecimal.ZERO;
            }

            schedule.add(EmiSchedule.builder()
                    .loan(loan)
                    .emiNumber(i)
                    .dueDate(dueDate)
                    .emiAmount(emi)
                    .principalComponent(principalComponent)
                    .interestComponent(interestComponent)
                    .balanceAfter(balance)
                    .status(EmiSchedule.EmiStatus.PENDING)
                    .build());

            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    /**
     * Recalculates outstanding principal from the schedule.
     * Used after marking EMIs as paid to get the current balance.
     */
    public BigDecimal calculateOutstandingPrincipal(List<EmiSchedule> schedule) {
        return schedule.stream()
                .filter(e -> e.getStatus() == EmiSchedule.EmiStatus.PENDING
                        || e.getStatus() == EmiSchedule.EmiStatus.OVERDUE)
                .map(EmiSchedule::getBalanceAfter)
                .reduce(BigDecimal.ZERO, (a, b) -> b) // last balance in remaining schedule
                .max(BigDecimal.ZERO);
    }
}