package com.webinsight.service;

import com.webinsight.model.ProviderConfigEntity;
import com.webinsight.repository.ProviderConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class ProviderConfigService {

    private final ProviderConfigRepository repository;
    private final ApiKeyEncryptionService encryptionService;

    public ProviderConfigService(ProviderConfigRepository repository, ApiKeyEncryptionService encryptionService) {
        this.repository = repository;
        this.encryptionService = encryptionService;
    }

    public ProviderConfigEntity save(ProviderConfigEntity config) {
        if (config.getEncryptedApiKey() != null && !config.getEncryptedApiKey().isEmpty()) {
            String encrypted = encryptionService.encrypt(config.getEncryptedApiKey());
            config.setEncryptedApiKey(encrypted);
        }
        return repository.save(config);
    }

    public Optional<ProviderConfigEntity> findByProviderName(String providerName) {
        return repository.findByProviderName(providerName);
    }

    public List<ProviderConfigEntity> findAll() {
        return repository.findAll();
    }

    public String getDecryptedApiKey(String providerName) {
        Optional<ProviderConfigEntity> config = repository.findByProviderName(providerName);
        if (config.isEmpty() || config.get().getEncryptedApiKey() == null || config.get().getEncryptedApiKey().isEmpty()) {
            return "";
        }
        return encryptionService.decrypt(config.get().getEncryptedApiKey());
    }

    public ProviderConfigEntity getMaskedConfig(String providerName) {
        Optional<ProviderConfigEntity> config = repository.findByProviderName(providerName);
        if (config.isEmpty()) {
            return null;
        }
        ProviderConfigEntity result = new ProviderConfigEntity();
        result.setId(config.get().getId());
        result.setProviderName(config.get().getProviderName());
        result.setApiUrl(config.get().getApiUrl());
        result.setModelName(config.get().getModelName());
        result.setEnabled(config.get().getEnabled());
        result.setEncryptedApiKey("***");
        return result;
    }

    public void deleteByProviderName(String providerName) {
        repository.deleteByProviderName(providerName);
    }
}