package com.webinsight.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Value("${cache.caffeine.max-size:1000}")
    private long maxSize;

    @Value("${cache.caffeine.expire-after-write:24h}")
    private String expireAfterWrite;

    @Bean
    public Cache<String, String> analysisCache() {
        long hours = parseDuration(expireAfterWrite);
        return Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(hours, TimeUnit.HOURS)
                .build();
    }

    private long parseDuration(String duration) {
        if (duration.endsWith("h")) {
            return Long.parseLong(duration.replace("h", ""));
        }
        if (duration.endsWith("m")) {
            return Long.parseLong(duration.replace("m", "")) / 60;
        }
        return 24;
    }
}