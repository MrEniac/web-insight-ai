package com.webinsight.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class OllamaProvider implements AiModelProvider {

    @Value("${ai.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${ai.ollama.default-model:qwen3.5:2b}")
    private String defaultModel;

    @Value("${ai.ollama.timeout:120}")
    private Integer timeout;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    public OllamaProvider(RestTemplate restTemplate, ObjectMapper objectMapper, WebClient.Builder webClientBuilder) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.webClient = webClientBuilder.build();
    }

    @Override
    public String generate(String prompt, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama generate (via chat) with model: {}", useModel);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", prompt)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("model", useModel);
        body.put("messages", messages);
        body.put("stream", false);

        HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    ollamaUrl + "/api/chat",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            JsonNode json = objectMapper.readTree(response.getBody());
            return json.path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Ollama generate failed: {}", e.getMessage());
            throw new RuntimeException("Ollama generate failed: " + e.getMessage());
        }
    }

    @Override
    public Flux<String> generateStream(String prompt, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama generateStream (via chat) with model: {}", useModel);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", prompt)
        );

        Map<String, Object> body = new HashMap<>();
        body.put("model", useModel);
        body.put("messages", messages);
        body.put("stream", true);

        return webClient.post()
                .uri(ollamaUrl + "/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> !line.trim().isEmpty())
                .mapNotNull(line -> {
                    try {
                        JsonNode json = objectMapper.readTree(line);
                        if (json.path("done").asBoolean()) return null;
                        String role = json.path("message").path("role").asText("");
                        if ("thinking".equals(role)) return null;
                        return json.path("message").path("content").asText("");
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(text -> text != null && !text.isEmpty());
    }

    @Override
    public String chat(List<ChatMessage> messages, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama chat with model: {}", useModel);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Map<String, String>> messageList = messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("model", useModel);
        body.put("messages", messageList);
        body.put("stream", false);

        HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    ollamaUrl + "/api/chat",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            JsonNode json = objectMapper.readTree(response.getBody());
            return json.path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Ollama chat failed: {}", e.getMessage());
            throw new RuntimeException("Ollama chat failed: " + e.getMessage());
        }
    }

    @Override
    public Flux<String> chatStream(List<ChatMessage> messages, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;

        List<Map<String, String>> messageList = messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("model", useModel);
        body.put("messages", messageList);
        body.put("stream", true);

        return webClient.post()
                .uri(ollamaUrl + "/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> !line.trim().isEmpty())
                .mapNotNull(line -> {
                    try {
                        JsonNode json = objectMapper.readTree(line);
                        if (json.path("done").asBoolean()) return null;
                        String role = json.path("message").path("role").asText("");
                        if ("thinking".equals(role)) return null;
                        return json.path("message").path("content").asText("");
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(text -> text != null && !text.isEmpty());
    }

    @Override
    public boolean supports(String provider) {
        return "ollama".equalsIgnoreCase(provider) || provider == null || provider.isEmpty();
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException("JSON serialization failed", e);
        }
    }
}