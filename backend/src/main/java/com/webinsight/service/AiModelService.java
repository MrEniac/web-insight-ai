package com.webinsight.service;

import com.webinsight.model.AiRequest;
import com.webinsight.model.AiResponse;
import com.webinsight.provider.AiModelProvider;
import com.webinsight.provider.OllamaProvider;
import com.webinsight.provider.OpenAiCompatibleProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@Service
public class AiModelService {

    private final List<AiModelProvider> providers;
    private final OllamaProvider ollamaProvider;
    private final OpenAiCompatibleProvider openAiCompatibleProvider;

    public AiModelService(List<AiModelProvider> providers, OllamaProvider ollamaProvider, OpenAiCompatibleProvider openAiCompatibleProvider) {
        this.providers = providers;
        this.ollamaProvider = ollamaProvider;
        this.openAiCompatibleProvider = openAiCompatibleProvider;
    }

    public AiResponse analyze(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = request.getModel();

        try {
            String result;
            String prompt = request.getPrompt();

            if (prompt == null && request.getData() != null) {
                prompt = request.getData().toString();
            }

            AiModelProvider aiProvider = getProvider(provider);
            result = aiProvider.generate(prompt, model);

            return AiResponse.ok(result, model, provider);
        } catch (Exception e) {
            log.error("AI analysis failed: {}", e.getMessage());
            return AiResponse.error("AI analysis failed: " + e.getMessage());
        }
    }

    public Flux<String> analyzeStream(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = request.getModel();

        String prompt = request.getPrompt();
        if (prompt == null && request.getData() != null) {
            prompt = request.getData().toString();
        }

        AiModelProvider aiProvider = getProvider(provider);
        return aiProvider.generateStream(prompt, model);
    }

    public AiResponse chat(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = request.getModel();

        try {
            List<AiModelProvider.ChatMessage> messages = request.getMessages().stream()
                    .map(m -> new AiModelProvider.ChatMessage(m.getRole(), m.getContent()))
                    .toList();

            AiModelProvider aiProvider = getProvider(provider);
            String result = aiProvider.chat(messages, model);

            return AiResponse.ok(result, model, provider);
        } catch (Exception e) {
            log.error("AI chat failed: {}", e.getMessage());
            return AiResponse.error("AI chat failed: " + e.getMessage());
        }
    }

    public Flux<String> chatStream(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = request.getModel();

        List<AiModelProvider.ChatMessage> messages = request.getMessages().stream()
                .map(m -> new AiModelProvider.ChatMessage(m.getRole(), m.getContent()))
                .toList();

        AiModelProvider aiProvider = getProvider(provider);
        return aiProvider.chatStream(messages, model);
    }

    private AiModelProvider getProvider(String provider) {
        return providers.stream()
                .filter(p -> p.supports(provider))
                .findFirst()
                .orElse(ollamaProvider);
    }

    private String resolveProvider(String provider) {
        if (provider == null || provider.isEmpty()) {
            return "ollama";
        }
        return provider.toLowerCase();
    }
}