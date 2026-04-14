package com.proptrack.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class ResendEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    
    private final String apiKey;
    private final String fromEmail;
    private final RestClient restClient;

    public ResendEmailService(
            @Value("${app.resend.api-key:re_placeholder}") String apiKey,
            @Value("${app.resend.from-email:noreply@proptrack.app}") String fromEmail,
            RestClient.Builder restClientBuilder) {
        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.restClient = restClientBuilder.baseUrl("https://api.resend.com").build();
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        // If API key is the placeholder or blank, just mock the email
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("re_placeholder")) {
            log.info("========== MOCK EMAIL ==========");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Body:\n{}", body);
            log.info("================================");
            return;
        }

        try {
            restClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + apiKey)
                    .body(Map.of(
                            "from", fromEmail,
                            "to", to,
                            "subject", subject,
                            "html", body
                    ))
                    .retrieve()
                    .toBodilessEntity();
            
            log.info("Email sent to {} with subject '{}'", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
