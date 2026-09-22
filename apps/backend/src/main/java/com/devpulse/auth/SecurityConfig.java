package com.devpulse.auth;

import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwords() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    UserDetailsService users(UserRepository users) {
        return email ->
            users
                .findCredentials(email.trim().toLowerCase(Locale.ROOT))
                .map(credentials ->
                    User.withUsername(credentials.id().toString())
                        .password(credentials.passwordHash())
                        .roles("USER")
                        .build()
                )
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth ->
                auth
                    .requestMatchers(
                        "/api/auth/csrf",
                        "/api/auth/register",
                        "/api/auth/login",
                        "/actuator/health",
                        "/error"
                    )
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            )
            .requestCache(cache -> cache.disable())
            .formLogin(form ->
                form
                    .loginProcessingUrl("/api/auth/login")
                    .usernameParameter("email")
                    .successHandler((request, response, auth) -> response.setStatus(204))
                    .failureHandler((request, response, error) -> {
                        response.setStatus(401);
                        response.setContentType("application/json");
                        response
                            .getWriter()
                            .write("{\"message\":\"Email or password is incorrect.\"}");
                    })
            )
            .logout(logout ->
                logout
                    .logoutUrl("/api/auth/logout")
                    .deleteCookies("SESSION")
                    .logoutSuccessHandler((request, response, auth) -> response.setStatus(204))
            )
            .exceptionHandling(errors ->
                errors
                    .authenticationEntryPoint((request, response, error) -> {
                        response.setStatus(401);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
                    })
                    .accessDeniedHandler((request, response, error) -> {
                        response.setStatus(403);
                        response.setContentType("application/json");
                        response
                            .getWriter()
                            .write(
                                "{\"message\":\"Request could not be authorized. Refresh and try again.\"}"
                            );
                    })
            )
            .build();
    }
}
