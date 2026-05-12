package com.webinsight.controller;

import com.webinsight.service.CacheService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/cache")
public class CacheController {

    private final CacheService cacheService;

    public CacheController(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Cache service is running"
        ));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearCache() {
        log.info("Clearing all cache");
        cacheService.evictAll();
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Cache cleared"
        ));
    }
}