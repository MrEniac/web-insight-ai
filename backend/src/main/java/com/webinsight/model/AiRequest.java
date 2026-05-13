package com.webinsight.model;

import lombok.Data;

import java.util.List;

@Data
public class AiRequest {

    private String type;

    private Object data;

    private Boolean stream = false;

    private String prompt;

    private List<ChatMessage> messages;

    private String model;

    private String provider;

    private String apiKey;

    private String apiUrl;

    @Data
    public static class ChatMessage {
        private String role;
        private String content;
    }
}