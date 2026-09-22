package com.devpulse.ingestionkey;

import com.devpulse.common.NamedRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/api-keys")
public class IngestionKeyController {

    private final IngestionKeyService keys;

    public IngestionKeyController(IngestionKeyService keys) {
        this.keys = keys;
    }

    @GetMapping
    List<IngestionKey> list(Authentication auth, @PathVariable UUID projectId) {
        return keys.list(projectId, UUID.fromString(auth.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    CreatedKey create(
        Authentication auth,
        @PathVariable UUID projectId,
        @Valid @RequestBody NamedRequest request
    ) {
        return keys.create(projectId, UUID.fromString(auth.getName()), request.name());
    }

    @DeleteMapping("/{keyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(Authentication auth, @PathVariable UUID projectId, @PathVariable UUID keyId) {
        keys.revoke(projectId, keyId, UUID.fromString(auth.getName()));
    }
}
