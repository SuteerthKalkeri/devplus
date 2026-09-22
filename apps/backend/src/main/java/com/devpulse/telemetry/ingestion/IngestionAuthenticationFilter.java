package com.devpulse.telemetry.ingestion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

// Instantiated only inside the ingestion security chain, never as a global servlet filter.
public class IngestionAuthenticationFilter extends OncePerRequestFilter {

    private final IngestionCredentials credentials;
    private final RequestRateLimiter limiter;

    public IngestionAuthenticationFilter(
        IngestionCredentials credentials,
        RequestRateLimiter limiter
    ) {
        this.credentials = credentials;
        this.limiter = limiter;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain chain
    ) throws IOException, ServletException {
        if (request.getMethod().equals("OPTIONS")) {
            chain.doFilter(request, response);
            return;
        }
        if (!limiter.allow("ip:" + request.getRemoteAddr(), 120)) {
            reject(response, 429, "Ingestion rate limit exceeded.");
            return;
        }
        var identity = credentials.authenticate(request.getHeader("Authorization"));
        if (identity.isEmpty()) {
            reject(response, 401, "Invalid or revoked ingestion key.");
            return;
        }
        if (!limiter.allow("key:" + identity.get().keyId(), 60)) {
            reject(response, 429, "Ingestion rate limit exceeded.");
            return;
        }
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                identity.get(),
                null,
                List.of(new SimpleGrantedAuthority("INGEST"))
            )
        );
        SecurityContextHolder.setContext(context);
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, int status, String message)
        throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        if (status == 429) response.setHeader("Retry-After", "60");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
