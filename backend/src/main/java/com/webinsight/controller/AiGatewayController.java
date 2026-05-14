package com.webinsight.controller;

import com.webinsight.model.AiRequest;
import com.webinsight.model.AiResponse;
import com.webinsight.model.GitHubAnalysisRequest;
import com.webinsight.service.AiModelService;
import com.webinsight.service.CacheService;
import com.webinsight.service.ContentExtractorService;
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
    private final ContentExtractorService contentExtractorService;

    public AiGatewayController(AiModelService aiModelService, PromptService promptService,
                                CacheService cacheService, ContentExtractorService contentExtractorService) {
        this.aiModelService = aiModelService;
        this.promptService = promptService;
        this.cacheService = cacheService;
        this.contentExtractorService = contentExtractorService;
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

    @PostMapping("/summary")
    public AiResponse summarizeUrl(@RequestBody java.util.Map<String, String> body) {
        String url = body.get("url");
        String title = body.get("title");
        String text = body.get("text");

        if (url != null && (title == null || text == null)) {
            ContentExtractorService.ExtractedContent extracted = contentExtractorService.extractFromUrl(url);
            if (extracted == null) {
                return AiResponse.error("Failed to extract content from URL: " + url);
            }
            title = extracted.title();
            text = extracted.text();
        }

        if (title == null || text == null) {
            return AiResponse.error("Missing title or text content");
        }

        String prompt = promptService.buildSummaryPrompt(title, text);

        String cacheKey = cacheService.generateCacheKey("summary", url != null ? url : title);
        String cached = cacheService.get(cacheKey);
        if (cached != null) {
            return AiResponse.ok(cached);
        }

        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("summary");
        aiRequest.setPrompt(prompt);
        AiResponse response = aiModelService.analyze(aiRequest);

        if (response.getSuccess() && response.getResult() != null) {
            cacheService.put(cacheKey, response.getResult());
        }
        return response;
    }

    @PostMapping(value = "/summary/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> summarizeUrlStream(@RequestBody java.util.Map<String, String> body) {
        String url = body.get("url");
        String title = body.get("title");
        String text = body.get("text");

        if (url != null && (title == null || text == null)) {
            ContentExtractorService.ExtractedContent extracted = contentExtractorService.extractFromUrl(url);
            if (extracted == null) {
                return Flux.just("data: [ERROR] Failed to extract content from URL\n\n");
            }
            title = extracted.title();
            text = extracted.text();
        }

        if (title == null || text == null) {
            return Flux.just("data: [ERROR] Missing title or text content\n\n");
        }

        String prompt = promptService.buildSummaryPrompt(title, text);
        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("summary");
        aiRequest.setPrompt(prompt);

        return aiModelService.analyzeStream(aiRequest)
                .delayElements(Duration.ofMillis(50));
    }

    @PostMapping("/search/tags")
    public AiResponse searchTags(@RequestBody java.util.Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, String>> items =
                (java.util.List<java.util.Map<String, String>>) body.get("items");

        if (items == null || items.isEmpty()) {
            return AiResponse.error("No search items provided");
        }

        String prompt = promptService.buildSearchBatchPrompt(items);
        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("search");
        aiRequest.setPrompt(prompt);

        return aiModelService.analyze(aiRequest);
    }

    @PostMapping(value = "/search/tags/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> searchTagsStream(@RequestBody java.util.Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, String>> items =
                (java.util.List<java.util.Map<String, String>>) body.get("items");

        if (items == null || items.isEmpty()) {
            return Flux.just("data: [ERROR] No search items provided\n\n");
        }

        String prompt = promptService.buildSearchBatchPrompt(items);
        AiRequest aiRequest = new AiRequest();
        aiRequest.setType("search");
        aiRequest.setPrompt(prompt);

        return aiModelService.analyzeStream(aiRequest)
                .delayElements(Duration.ofMillis(50));
    }
}