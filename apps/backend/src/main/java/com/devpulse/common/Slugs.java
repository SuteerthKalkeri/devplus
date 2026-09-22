package com.devpulse.common;

import java.util.Locale;
import java.util.UUID;

public final class Slugs {

    private Slugs() {}

    public static String fromName(String name, UUID id) {
        String base = name
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
        return (base.isBlank() ? "workspace" : base) + "-" + id.toString().substring(0, 8);
    }
}
