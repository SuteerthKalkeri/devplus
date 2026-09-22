package com.devpulse.common;

import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(
            Map.of("message", error.getReason() == null ? "Request failed." : error.getReason())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException error) {
        var field = error.getBindingResult().getFieldErrors().getFirst();
        return ResponseEntity.badRequest().body(
            Map.of("message", field.getField() + " " + field.getDefaultMessage())
        );
    }

    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate() {
        return ResponseEntity.status(409).body(
            Map.of("message", "This record already exists. Please choose a different value.")
        );
    }
}
