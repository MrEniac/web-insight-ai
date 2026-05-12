package com.webinsight.service;

import com.github.benmanes.caffeine.cache.Cache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Slf4j
@Service
public class CacheService {

    private final Cache<String, String> analysisCache;

    public CacheService(Cache<String, String> analysisCache) {
        this.analysisCache = analysisCache;
    }

    public String get(String key) {
        return analysisCache.getIfPresent(key);
    }

    public void put(String key, String value) {
        analysisCache.put(key, value);
    }

    public String generateCacheKey(String type, String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((type + ":" + content).getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return type + "_" + content.hashCode();
        }
    }

    public void evict(String key) {
        analysisCache.invalidate(key);
    }

    public void evictAll() {
        analysisCache.invalidateAll();
    }
}