package com.devpulse.organization;

import com.devpulse.common.NamedRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizations")
public class OrganizationController {

    private final OrganizationService organizations;

    public OrganizationController(OrganizationService organizations) {
        this.organizations = organizations;
    }

    @GetMapping
    List<Organization> list(Authentication auth) {
        return organizations.list(UUID.fromString(auth.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Organization create(Authentication auth, @Valid @RequestBody NamedRequest request) {
        return organizations.create(UUID.fromString(auth.getName()), request.name());
    }
}
