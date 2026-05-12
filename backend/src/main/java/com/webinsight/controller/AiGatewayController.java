package com.webinsight.controller;

import com.webinsight.model.AiRequest;
import com.webinsight.model.AiResponse;
import com.webinsight.model.GitHubAnalysisRequest;
import com.webinsight.service.AiModelService;
import com.webinsight.service.CacheService;
import com.webinsight.service.PromptService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.time.Duration;

@Slf4j
@RestController
@RequestMapping("/api/ai")
public class AiGatewayController {

    private final AiModelService aiModelService;
    private final PromptService promptService;
    private final CacheService cacheService;

    public AiGatewayController(AiModelService aiModelService, PromptService promptService, CacheService cacheService) {
        this.aiModelService = aiModelService;
        this.promptService = promptService;
        this.cacheService = cacheService;
    }

    @PostMapping("/analyze")
    public AiResponse analyze(@RequestBody AiRequest request) {
        log.info("Analyze request type: {}, provider: {}", request.getType(), request.getProvider());

        String cacheKey = cacheService.generateCacheKey(
                request.getType(),
                request.getData() != null ? request.getData().toString() : request.getPrompt()
        );

        String cached = cacheService.get(cacheKey);
        if (cached != null) {
            log.info("Cache hit for key: {}", cacheKey);
            return AiResponse.ok(cached);
        }

        AiResponse response = aiModelService.analyze(request);

        if (response.getSuccess() && response.getResult() != null) {
            cacheService.put(cacheKey, response.getResult());
        }

        return response;
    }

    @PostMapping(value = "/analyze/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyzeStream(@RequestBody AiRequest request) {
        log.info("Stream analyze request type: {}, provider: {}", request.getType(), request.getProvider());
        return aiModelService.analyzeStream(request)
                .delayElements(Duration.ofMillis(50));
    }

    @PostMapping("/analyze/github")
    public AiResponse analyzeGitHub(@RequestBody GitHubAnalysisRequest request) {
        log.info("GitHub analysis request for: {}", request.getRepoName());

        String prompt = promptService.buildGitHubPrompt(request);
        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("github");
        aiRequest.setPrompt(prompt);
        aiRequest.setProvider(request.getLanguage() != null ? "ollama" : "ollama");

        String cacheKey = cacheService.generateCacheKey("github", request.getRepoName());
        String cached = cacheService.get(cacheKey);
        if (cached != null) {
            return AiResponse.ok(cached);
        }

        AiResponse response = aiModelService.analyze(aiRequest);

        if (response.getSuccess() && response.getResult() != null) {
            cacheService.put(cacheKey, response.getResult());
        }

        return response;
    }

    @PostMapping(value = "/analyze/github/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyzeGitHubStream(@RequestBody GitHubAnalysisRequest request) {
        log.info("GitHub stream analysis for: {}", request.getRepoName());
        String prompt = promptService.buildGitHubPrompt(request);
        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("github");
        aiRequest.setPrompt(prompt);

        return aiModelService.analyzeStream(aiRequest)
                .delayElements(Duration.ofMillis(50));
    }

    @PostMapping("/chat")
    public AiResponse chat(@RequestBody AiRequest request) {
        log.info("Chat request, provider: {}", request.getProvider());
        return aiModelService.chat(request);
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(@RequestBody AiRequest request) {
        log.info("Chat stream request, provider: {}", request.getProvider());
        return aiModelService.chatStream(request)
                .delayElements(Duration.ofMillis(50));
    }
}