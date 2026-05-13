package com.webinsight.service;

import com.webinsight.model.AiRequest;
import com.webinsight.model.AiResponse;
import com.webinsight.model.ProviderConfigEntity;
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
    private final ProviderConfigService providerConfigService;

    public AiModelService(List<AiModelProvider> providers,
                          OllamaProvider ollamaProvider,
                          OpenAiCompatibleProvider openAiCompatibleProvider,
                          ProviderConfigService providerConfigService) {
        this.providers = providers;
        this.ollamaProvider = ollamaProvider;
        this.openAiCompatibleProvider = openAiCompatibleProvider;
        this.providerConfigService = providerConfigService;
    }

    public AiResponse analyze(AiRequest request) {
        String provider = resolveProvider(request.getProvider());

        try {
            String prompt = request.getPrompt();
            if (prompt == null && request.getData() != null) {
                prompt = request.getData().toString();
            }
            String model = resolveModel(request);

            if ("ollama".equals(provider)) {
                String result = ollamaProvider.generate(prompt, model);
                return AiResponse.ok(result, model, provider);
            }

            OpenAiCompatibleProvider.ProviderConfig config = resolveCloudProvider(request);
            String result = openAiCompatibleProvider.chat(
                    List.of(new AiModelProvider.ChatMessage("system", "You are a helpful AI assistant."),
                            new AiModelProvider.ChatMessage("user", prompt)),
                    config.model()
            );
            return AiResponse.ok(result, config.model(), provider);
        } catch (Exception e) {
            log.error("AI analysis failed: {}", e.getMessage());
            return AiResponse.error("AI analysis failed: " + e.getMessage());
        }
    }

    public Flux<String> analyzeStream(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = resolveModel(request);

        String prompt = request.getPrompt();
        if (prompt == null && request.getData() != null) {
            prompt = request.getData().toString();
        }

        if ("ollama".equals(provider)) {
            return ollamaProvider.generateStream(prompt, model);
        }

        OpenAiCompatibleProvider.ProviderConfig config = resolveCloudProvider(request);
        return openAiCompatibleProvider.chatStream(
                List.of(new AiModelProvider.ChatMessage("system", "You are a helpful AI assistant."),
                        new AiModelProvider.ChatMessage("user", prompt)),
                config.model()
        );
    }

    public AiResponse chat(AiRequest request) {
        String provider = resolveProvider(request.getProvider());

        try {
            String model = resolveModel(request);
            List<AiModelProvider.ChatMessage> messages = request.getMessages().stream()
                    .map(m -> new AiModelProvider.ChatMessage(m.getRole(), m.getContent()))
                    .toList();

            if ("ollama".equals(provider)) {
                String result = ollamaProvider.chat(messages, model);
                return AiResponse.ok(result, model, provider);
            }

            OpenAiCompatibleProvider.ProviderConfig config = resolveCloudProvider(request);
            String result = openAiCompatibleProvider.chat(messages, config.model());
            return AiResponse.ok(result, config.model(), provider);
        } catch (Exception e) {
            log.error("AI chat failed: {}", e.getMessage());
            return AiResponse.error("AI chat failed: " + e.getMessage());
        }
    }

    public Flux<String> chatStream(AiRequest request) {
        String provider = resolveProvider(request.getProvider());
        String model = resolveModel(request);

        List<AiModelProvider.ChatMessage> messages = request.getMessages().stream()
                .map(m -> new AiModelProvider.ChatMessage(m.getRole(), m.getContent()))
                .toList();

        if ("ollama".equals(provider)) {
            return ollamaProvider.chatStream(messages, model);
        }

        OpenAiCompatibleProvider.ProviderConfig config = resolveCloudProvider(request);
        return openAiCompatibleProvider.chatStream(messages, config.model());
    }

    private OpenAiCompatibleProvider.ProviderConfig resolveCloudProvider(AiRequest request) {
        String provider = resolveProvider(request.getProvider());

        String apiKey = request.getApiKey();
        String url = request.getApiUrl();
        String model = request.getModel();

        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = providerConfigService.getDecryptedApiKey(provider);
        }

        ProviderConfigEntity dbConfig = providerConfigService.findByProviderName(provider).orElse(null);
        if (dbConfig != null) {
            if (url == null || url.isEmpty()) {
                url = dbConfig.getApiUrl();
            }
            if (model == null || model.isEmpty()) {
                model = dbConfig.getModelName();
            }
        }

        return openAiCompatibleProvider.resolveWithApiKey(provider, apiKey, model, url);
    }

    private String resolveModel(AiRequest request) {
        return request.getModel() != null && !request.getModel().isEmpty() ? request.getModel() : null;
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