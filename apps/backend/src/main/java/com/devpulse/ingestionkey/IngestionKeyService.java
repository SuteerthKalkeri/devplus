package com.devpulse.ingestionkey;

import com.devpulse.project.ProjectService;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IngestionKeyService {

    private static final int KEY_BYTES = 32;
    private static final int DISPLAY_PREFIX_LENGTH = 18;
    private final SecureRandom random = new SecureRandom();
    private final IngestionKeyRepository keys;
    private final ProjectService projects;

    public IngestionKeyService(IngestionKeyRepository keys, ProjectService projects) {
        this.keys = keys;
        this.projects = projects;
    }

    public List<IngestionKey> list(UUID projectId, UUID userId) {
        projects.get(projectId, userId);
        return keys.findByProject(projectId);
    }

    @Transactional
    public CreatedKey create(UUID projectId, UUID userId, String name) {
        projects.requireManager(projectId, userId);
        byte[] bytes = new byte[KEY_BYTES];
        random.nextBytes(bytes);
        String token = "dp_ingest_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        IngestionKey key = keys.insert(
            UUID.randomUUID(),
            projectId,
            name.trim(),
            token.substring(0, DISPLAY_PREFIX_LENGTH),
            KeyHash.sha256(token)
        );
        return new CreatedKey(key, token);
    }

    @Transactional
    public void revoke(UUID projectId, UUID keyId, UUID userId) {
        projects.requireManager(projectId, userId);
        if (!keys.revoke(projectId, keyId)) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Resource not found."
        );
    }
}
