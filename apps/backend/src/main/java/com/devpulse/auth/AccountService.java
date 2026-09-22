package com.devpulse.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {

    private final UserRepository users;
    private final PasswordEncoder passwords;

    public AccountService(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    public Account register(RegisterRequest request) {
        // BCrypt limits bytes, while form validation limits characters.
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must be at most 72 UTF-8 bytes."
            );
        }
        var account = new Account(
            UUID.randomUUID(),
            request.name().trim(),
            request.email().trim().toLowerCase(Locale.ROOT)
        );
        users.insert(account, passwords.encode(request.password()));
        return account;
    }

    public Account get(UUID userId) {
        return users
            .findAccount(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
