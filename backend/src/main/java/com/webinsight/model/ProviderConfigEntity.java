package com.webinsight.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "provider_configs", uniqueConstraints = {
        @UniqueConstraint(columnNames = "providerName")
})
public class ProviderConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String providerName;

    @Column(length = 500)
    private String apiUrl;

    @Column(length = 100)
    private String modelName;

    @Column(length = 500)
    private String encryptedApiKey;

    @Column(nullable = false)
    private Boolean enabled = true;
}