package com.proptrack.backend.controller;

import com.proptrack.backend.dto.response.DashboardResponse;
import com.proptrack.backend.dto.response.LoanResponses.LoanResponse;
import com.proptrack.backend.dto.response.PropertyResponses.PartnerSummaryResponse;
import com.proptrack.backend.entity.User;
import com.proptrack.backend.security.UserPrincipal;
import com.proptrack.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUserResolver currentUser;

    /**
     * Main dashboard summary — used by the React frontend.
     */
    @GetMapping("/dashboard/{propertyId}")
    public ResponseEntity<DashboardResponse> getSummary(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                dashboardService.getSummary(propertyId, currentUser.resolve(principal))
        );
    }

    /**
     * Advisor context endpoint — called internally by FastAPI before Claude responds.
     * Returns a flat map of key financial facts for prompt injection.
     * Intentionally plain text-friendly so Claude can read it directly.
     */
    @GetMapping("/advisor/context/{propertyId}")
    public ResponseEntity<Map<String, Object>> getAdvisorContext(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = currentUser.resolve(principal);
        DashboardResponse summary = dashboardService.getSummary(propertyId, user);

        Map<String, Object> context = new HashMap<>();

        // Property
        context.put("property_name", summary.property().name());
        context.put("property_city", summary.property().city());
        context.put("purchase_price", summary.property().purchasePrice());
        context.put("current_valuation", summary.property().currentValuation());
        context.put("possession_date", summary.property().possessionDate());
        context.put("days_until_possession", summary.daysUntilPossession());
        context.put("property_status", summary.property().status());

        // Loan
        if (summary.loan() != null) {
            LoanResponse loan = summary.loan();
            context.put("bank_name", loan.bankName());
            context.put("loan_amount", loan.disbursedAmount());
            context.put("interest_rate_percent", loan.interestRate());
            context.put("monthly_emi", loan.emiAmount());
            context.put("outstanding_principal", loan.outstandingPrincipal());
            context.put("total_interest_paid", loan.totalInterestPaid());
            context.put("emis_paid", loan.emisPaid());
            context.put("emis_remaining", loan.emisRemaining());
            context.put("tenure_months", loan.tenureMonths());
        }

        // Investment summary
        context.put("total_invested", summary.totalInvested());
        context.put("next_emi_due_date", summary.nextEmiDueDate());
        context.put("next_emi_amount", summary.nextEmiAmount());

        // Partner contributions
        for (PartnerSummaryResponse partner : summary.partnerSummaries()) {
            String key = "partner_" + partner.user().fullName().toLowerCase().replace(" ", "_");
            context.put(key + "_paid", partner.totalPaid());
            context.put(key + "_share_percent", partner.sharePercent());
            context.put(key + "_balance", partner.balance());
        }

        return ResponseEntity.ok(context);
    }
}