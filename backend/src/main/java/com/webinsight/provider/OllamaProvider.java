package com.webinsight.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OllamaProvider implements AiModelProvider {

    @Value("${ai.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${ai.ollama.default-model:qwen2.5:7b}")
    private String defaultModel;

    @Value("${ai.ollama.timeout:120}")
    private Integer timeout;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OllamaProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String generate(String prompt, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama generate with model: {}", useModel);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "model", useModel,
                "prompt", prompt,
                "stream", false
        );

        HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    ollamaUrl + "/api/generate",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            JsonNode json = objectMapper.readTree(response.getBody());
            return json.path("response").asText();
        } catch (Exception e) {
            log.error("Ollama generate failed: {}", e.getMessage());
            throw new RuntimeException("Ollama generate failed: " + e.getMessage());
        }
    }

    @Override
    public Flux<String> generateStream(String prompt, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama generateStream with model: {}", useModel);

        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();

        new Thread(() -> {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> body = Map.of(
                        "model", useModel,
                        "prompt", prompt,
                        "stream", true
                );

                SimpleClientHttpRequestWithFactory factory = new SimpleClientHttpRequestWithFactory(timeout * 1000);
                RestTemplate streamRestTemplate = new RestTemplate(factory);

                HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

                ResponseEntity<String> response = streamRestTemplate.exchange(
                        ollamaUrl + "/api/generate",
                        HttpMethod.POST,
                        request,
                        String.class
                );

                String[] lines = response.getBody().split("\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) continue;
                    try {
                        JsonNode json = objectMapper.readTree(line);
                        String text = json.path("response").asText();
                        if (!text.isEmpty()) {
                            sink.tryEmitNext(text);
                        }
                        if (json.path("done").asBoolean()) {
                            sink.tryEmitComplete();
                            return;
                        }
                    } catch (Exception ignored) {
                    }
                }
                sink.tryEmitComplete();
            } catch (Exception e) {
                log.error("Ollama stream failed: {}", e.getMessage());
                sink.tryEmitError(e);
            }
        }).start();

        return sink.asFlux();
    }

    @Override
    public String chat(List<ChatMessage> messages, String model) {
        String useModel = (model != null && !model.isEmpty()) ? model : defaultModel;
        log.info("Ollama chat with model: {}", useModel);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Map<String, String>> messageList = messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList();

        Map<String, Object> body = Map.of(
                "model", useModel,
                "messages", messageList,
                "stream", false
        );

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

        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();

        new Thread(() -> {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                List<Map<String, String>> messageList = messages.stream()
                        .map(m -> Map.of("role", m.role(), "content", m.content()))
                        .toList();

                Map<String, Object> body = Map.of(
                        "model", useModel,
                        "messages", messageList,
                        "stream", true
                );

                SimpleClientHttpRequestWithFactory factory = new SimpleClientHttpRequestWithFactory(timeout * 1000);
                RestTemplate streamRestTemplate = new RestTemplate(factory);

                HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

                ResponseEntity<String> response = streamRestTemplate.exchange(
                        ollamaUrl + "/api/chat",
                        HttpMethod.POST,
                        request,
                        String.class
                );

                String[] lines = response.getBody().split("\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) continue;
                    try {
                        JsonNode json = objectMapper.readTree(line);
                        String text = json.path("message").path("content").asText();
                        if (!text.isEmpty()) {
                            sink.tryEmitNext(text);
                        }
                        if (json.path("done").asBoolean()) {
                            sink.tryEmitComplete();
                            return;
                        }
                    } catch (Exception ignored) {
                    }
                }
                sink.tryEmitComplete();
            } catch (Exception e) {
                log.error("Ollama chat stream failed: {}", e.getMessage());
                sink.tryEmitError(e);
            }
        }).start();

        return sink.asFlux();
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

    private static class SimpleClientHttpRequestWithFactory extends SimpleClientHttpRequestFactory {
        SimpleClientHttpRequestWithFactory(int timeoutMs) {
            setConnectTimeout(timeoutMs);
            setReadTimeout(timeoutMs);
        }
    }
}