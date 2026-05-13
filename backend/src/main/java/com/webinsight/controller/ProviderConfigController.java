package com.webinsight.controller;

import com.webinsight.model.ProviderConfigEntity;
import com.webinsight.service.ProviderConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/settings/providers")
public class ProviderConfigController {

    private final ProviderConfigService providerConfigService;

    public ProviderConfigController(ProviderConfigService providerConfigService) {
        this.providerConfigService = providerConfigService;
    }

    @GetMapping
    public ResponseEntity<List<ProviderConfigEntity>> listProviders() {
        List<ProviderConfigEntity> configs = providerConfigService.findAll().stream()
                .map(config -> {
                    ProviderConfigEntity masked = new ProviderConfigEntity();
                    masked.setId(config.getId());
                    masked.setProviderName(config.getProviderName());
                    masked.setApiUrl(config.getApiUrl());
                    masked.setModelName(config.getModelName());
                    masked.setEnabled(config.getEnabled());
                    masked.setEncryptedApiKey(config.getEncryptedApiKey() != null && !config.getEncryptedApiKey().isEmpty() ? "***" : "");
                    return masked;
                })
                .toList();
        return ResponseEntity.ok(configs);
    }

    @GetMapping("/{providerName}")
    public ResponseEntity<ProviderConfigEntity> getProvider(@PathVariable String providerName) {
        ProviderConfigEntity config = providerConfigService.getMaskedConfig(providerName);
        if (config == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(config);
    }

    @PostMapping
    public ResponseEntity<ProviderConfigEntity> createProvider(@RequestBody ProviderConfigEntity config) {
        log.info("Creating provider config for: {}", config.getProviderName());
        ProviderConfigEntity saved = providerConfigService.save(config);
        ProviderConfigEntity masked = providerConfigService.getMaskedConfig(saved.getProviderName());
        return ResponseEntity.ok(masked);
    }

    @PutMapping("/{providerName}")
    public ResponseEntity<ProviderConfigEntity> updateProvider(
            @PathVariable String providerName,
            @RequestBody ProviderConfigEntity config) {
        log.info("Updating provider config for: {}", providerName);
        ProviderConfigEntity existing = providerConfigService.findByProviderName(providerName).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if (config.getApiUrl() != null) {
            existing.setApiUrl(config.getApiUrl());
        }
        if (config.getModelName() != null) {
            existing.setModelName(config.getModelName());
        }
        if (config.getEnabled() != null) {
            existing.setEnabled(config.getEnabled());
        }
        if (config.getEncryptedApiKey() != null && !config.getEncryptedApiKey().isEmpty() && !"...".equals(config.getEncryptedApiKey())) {
            existing.setEncryptedApiKey(config.getEncryptedApiKey());
        }

        ProviderConfigEntity saved = providerConfigService.save(existing);
        ProviderConfigEntity masked = providerConfigService.getMaskedConfig(saved.getProviderName());
        return ResponseEntity.ok(masked);
    }

    @DeleteMapping("/{providerName}")
    public ResponseEntity<Map<String, Object>> deleteProvider(@PathVariable String providerName) {
        log.info("Deleting provider config for: {}", providerName);
        providerConfigService.deleteByProviderName(providerName);
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Provider config deleted"));
    }
}