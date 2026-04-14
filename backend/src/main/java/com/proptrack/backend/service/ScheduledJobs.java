package com.proptrack.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    private final LoanService loanService;

    /**
     * Runs every day at 00:05 AM.
     * Marks any PENDING EMIs whose due date has passed as OVERDUE.
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void markOverdueEmis() {
        log.info("Running overdue EMI check...");
        loanService.markOverdueEmis();
        log.info("Overdue EMI check complete");
    }
}