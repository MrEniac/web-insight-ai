package com.webinsight.provider;

import reactor.core.publisher.Flux;

public interface AiModelProvider {

    String generate(String prompt, String model);

    Flux<String> generateStream(String prompt, String model);

    String chat(java.util.List<AiModelProvider.ChatMessage> messages, String model);

    Flux<String> chatStream(java.util.List<AiModelProvider.ChatMessage> messages, String model);

    boolean supports(String provider);

    record ChatMessage(String role, String content) {}
}