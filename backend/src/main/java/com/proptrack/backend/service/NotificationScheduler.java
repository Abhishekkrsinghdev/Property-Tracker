package com.proptrack.backend.service;

import com.proptrack.backend.entity.EmiSchedule;
import com.proptrack.backend.entity.PropertyPartner;
import com.proptrack.backend.repository.EmiScheduleRepository;
import com.proptrack.backend.repository.PropertyPartnerRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);

    private final EmiScheduleRepository emiRepository;
    private final PropertyPartnerRepository partnerRepository;
    private final EmailService emailService;

    // Run every day at 8:00 AM server time
    @Scheduled(cron = "0 0 8 * * ?")
    public void sendEmiReminders() {
        log.info("Running scheduled job: sendEmiReminders");

        // Target EMIs due in exactly 7 days
        LocalDate targetDate = LocalDate.now().plusDays(7);

        // We can query findUpcomingEmis bounded by [targetDate, targetDate]
        List<EmiSchedule> upcomingEmis = emiRepository.findUpcomingEmis(targetDate, targetDate);

        for (EmiSchedule emi : upcomingEmis) {
            List<PropertyPartner> partners = partnerRepository.findByProperty(emi.getLoan().getProperty());
            
            for (PropertyPartner partner : partners) {
                String email = partner.getUser().getEmail();
                String propName = emi.getLoan().getProperty().getName();
                
                String subject = "Upcoming EMI Reminder - " + propName;
                String body = String.format("""
                        <h3>Upcoming EMI Reminder</h3>
                        <p>Hi %s,</p>
                        <p>Just a heads up! An EMI payment of <strong>₹%,.2f</strong> is due on <strong>%s</strong> for <strong>%s</strong>.</p>
                        <p>Please log in to your PropTrack dashboard to log your contribution.</p>
                        <p>Best,<br/>PropTrack AI</p>
                        """, 
                        partner.getUser().getFullName(),
                        emi.getEmiAmount(), 
                        emi.getDueDate().toString(), 
                        propName);

                emailService.sendEmail(email, subject, body);
            }
        }
        
        log.info("Finished sendEmiReminders. Processed {} EMIs.", upcomingEmis.size());
    }
}
