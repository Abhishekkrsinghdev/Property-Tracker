package com.proptrack.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean
    public WebClient aiServiceClient(@Value("${app.ai-service.url}") String aiServiceUrl) {
        return WebClient.builder()
                .baseUrl(aiServiceUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}