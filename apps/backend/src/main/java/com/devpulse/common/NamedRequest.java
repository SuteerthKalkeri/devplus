package com.devpulse.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NamedRequest(@NotBlank @Size(max = 100) String name) {}
