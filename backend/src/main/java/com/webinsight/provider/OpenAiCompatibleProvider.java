package com.webinsight.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webinsight.model.ModelConfig;
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
public class OpenAiCompatibleProvider implements AiModelProvider {

    @Value("${ai.providers.openai.url:https://api.openai.com/v1}")
    private String openaiUrl;

    @Value("${ai.providers.openai.model:gpt-4o-mini}")
    private String openaiModel;

    @Value("${ai.providers.deepseek.url:https://api.deepseek.com/v1}")
    private String deepseekUrl;

    @Value("${ai.providers.deepseek.model:deepseek-chat}")
    private String deepseekModel;

    @Value("${ai.providers.qwen.url:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String qwenUrl;

    @Value("${ai.providers.qwen.model:qwen-plus}")
    private String qwenModel;

    @Value("${ai.providers.siliconflow.url:https://api.siliconflow.cn/v1}")
    private String siliconflowUrl;

    @Value("${ai.providers.siliconflow.model:Qwen/Qwen2.5-7B-Instruct}")
    private String siliconflowModel;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String generate(String prompt, String model) {
        ChatMessage systemMsg = new ChatMessage("system", "You are a helpful AI assistant.");
        ChatMessage userMsg = new ChatMessage("user", prompt);
        return chat(List.of(systemMsg, userMsg), model);
    }

    @Override
    public Flux<String> generateStream(String prompt, String model) {
        ChatMessage systemMsg = new ChatMessage("system", "You are a helpful AI assistant.");
        ChatMessage userMsg = new ChatMessage("user", prompt);
        return chatStream(List.of(systemMsg, userMsg), model);
    }

    @Override
    public String chat(List<ChatMessage> messages, String model) {
        ProviderConfig config = resolveProvider(model);
        log.info("OpenAI-compatible chat with provider: {}, model: {}", config.providerName, config.model);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(config.apiKey);

        List<Map<String, String>> messageList = messages.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList();

        Map<String, Object> body = Map.of(
                "model", config.model,
                "messages", messageList,
                "stream", false
        );

        HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    config.url + "/chat/completions",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            JsonNode json = objectMapper.readTree(response.getBody());
            return json.path("choices").path(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("OpenAI-compatible chat failed: {}", e.getMessage());
            throw new RuntimeException(config.providerName + " chat failed: " + e.getMessage());
        }
    }

    @Override
    public Flux<String> chatStream(List<ChatMessage> messages, String model) {
        ProviderConfig config = resolveProvider(model);

        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();

        new Thread(() -> {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(config.apiKey);

                List<Map<String, String>> messageList = messages.stream()
                        .map(m -> Map.of("role", m.role(), "content", m.content()))
                        .toList();

                Map<String, Object> body = Map.of(
                        "model", config.model,
                        "messages", messageList,
                        "stream", true
                );

                SimpleClientHttpRequestWithFactory factory = new SimpleClientHttpRequestWithFactory(120000);
                RestTemplate streamRestTemplate = new RestTemplate(factory);

                HttpEntity<String> request = new HttpEntity<>(toJson(body), headers);

                ResponseEntity<String> response = streamRestTemplate.exchange(
                        config.url + "/chat/completions",
                        HttpMethod.POST,
                        request,
                        String.class
                );

                String responseBody = response.getBody();
                if (responseBody != null) {
                    String[] lines = responseBody.split("\n");
                    for (String line : lines) {
                        line = line.trim();
                        if (!line.startsWith("data: ")) continue;
                        String data = line.substring(6);
                        if ("[DONE]".equals(data)) break;
                        try {
                            JsonNode json = objectMapper.readTree(data);
                            String content = json.path("choices").path(0).path("delta").path("content").asText();
                            if (!content.isEmpty()) {
                                sink.tryEmitNext(content);
                            }
                        } catch (Exception ignored) {
                        }
                    }
                }
                sink.tryEmitComplete();
            } catch (Exception e) {
                log.error("OpenAI-compatible stream failed: {}", e.getMessage());
                sink.tryEmitError(e);
            }
        }).start();

        return sink.asFlux();
    }

    @Override
    public boolean supports(String provider) {
        if (provider == null || provider.isEmpty()) return false;
        String lower = provider.toLowerCase();
        return lower.equals("openai") || lower.equals("deepseek")
                || lower.equals("qwen") || lower.equals("siliconflow")
                || lower.equals("custom");
    }

    private ProviderConfig resolveProvider(String providerArg) {
        String provider = (providerArg != null) ? providerArg.toLowerCase() : "openai";

        return switch (provider) {
            case "deepseek" -> new ProviderConfig(deepseekUrl, deepseekModel, "", "deepseek");
            case "qwen" -> new ProviderConfig(qwenUrl, qwenModel, "", "qwen");
            case "siliconflow" -> new ProviderConfig(siliconflowUrl, siliconflowModel, "", "siliconflow");
            default -> new ProviderConfig(openaiUrl, openaiModel, "", "openai");
        };
    }

    public ProviderConfig resolveWithApiKey(String provider, String apiKey, String model, String url) {
        ProviderConfig config = resolveProvider(provider);
        return new ProviderConfig(
                url != null ? url : config.url,
                model != null && !model.isEmpty() ? model : config.model,
                apiKey != null ? apiKey : "",
                config.providerName
        );
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

    public record ProviderConfig(String url, String model, String apiKey, String providerName) {}
}