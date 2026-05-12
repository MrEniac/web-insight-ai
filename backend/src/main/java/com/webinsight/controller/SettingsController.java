package com.webinsight.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/ollama-status")
    public ResponseEntity<Map<String, Object>> checkOllamaStatus(
            @RequestParam(defaultValue = "http://localhost:11434") String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(url + "/api/tags").openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                return ResponseEntity.ok(Map.of(
                        "available", true,
                        "message", "Ollama is running"
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                        "available", false,
                        "message", "Ollama returned status: " + responseCode
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "message", "Cannot connect to Ollama: " + e.getMessage()
            ));
        }
    }
}