package com.devpulse.telemetry.ingestion;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class IngestionSecurity {

    @Bean
    @Order(1)
    SecurityFilterChain ingestionFilterChain(
        HttpSecurity http,
        IngestionCredentials credentials,
        RequestRateLimiter limiter,
        @Value("${devpulse.ingestion.allowed-origins}") String origins
    ) throws Exception {
        var cors = new CorsConfiguration();
        cors.setAllowedOriginPatterns(Arrays.stream(origins.split(",")).map(String::trim).toList());
        cors.setAllowedMethods(List.of("POST", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setExposedHeaders(List.of("Retry-After"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/v1/ingest/**", cors);
        return http
            .securityMatcher("/v1/ingest/**")
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .securityContext(context ->
                context.securityContextRepository(
                    new org.springframework.security.web.context.NullSecurityContextRepository()
                )
            )
            .csrf(csrf -> csrf.disable())
            .cors(config -> config.configurationSource(source))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth ->
                auth
                    .requestMatchers(HttpMethod.OPTIONS, "/v1/ingest/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/v1/ingest/events")
                    .hasAuthority("INGEST")
                    .anyRequest()
                    .denyAll()
            )
            .addFilterBefore(
                new IngestionAuthenticationFilter(credentials, limiter),
                UsernamePasswordAuthenticationFilter.class
            )
            .build();
    }
}
