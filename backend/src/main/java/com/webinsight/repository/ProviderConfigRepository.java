package com.webinsight.repository;

import com.webinsight.model.ProviderConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderConfigRepository extends JpaRepository<ProviderConfigEntity, Long> {

    Optional<ProviderConfigEntity> findByProviderName(String providerName);

    void deleteByProviderName(String providerName);
}