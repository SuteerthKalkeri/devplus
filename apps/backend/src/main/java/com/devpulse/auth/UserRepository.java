package com.devpulse.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final JdbcClient db;

    public UserRepository(JdbcClient db) {
        this.db = db;
    }

    // Internal authentication data; never used as an API response.
    public record Credentials(UUID id, String passwordHash) {}

    public Optional<Credentials> findCredentials(String email) {
        return db
            .sql("SELECT id, password_hash FROM users WHERE email = :email")
            .param("email", email)
            .query(Credentials.class)
            .optional();
    }

    public Optional<Account> findAccount(UUID id) {
        return db
            .sql("SELECT id, name, email FROM users WHERE id = :id")
            .param("id", id)
            .query(Account.class)
            .optional();
    }

    public void insert(Account account, String passwordHash) {
        db.sql(
            "INSERT INTO users (id, name, email, password_hash) VALUES (:id, :name, :email, :hash)"
        )
            .param("id", account.id())
            .param("name", account.name())
            .param("email", account.email())
            .param("hash", passwordHash)
            .update();
    }
}
