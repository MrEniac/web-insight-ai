package com.webinsight.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiResponse {

    private Boolean success;

    private String result;

    private String error;

    private String model;

    private String provider;

    public static AiResponse ok(String result) {
        return AiResponse.builder()
                .success(true)
                .result(result)
                .build();
    }

    public static AiResponse ok(String result, String model, String provider) {
        return AiResponse.builder()
                .success(true)
                .result(result)
                .model(model)
                .provider(provider)
                .build();
    }

    public static AiResponse error(String error) {
        return AiResponse.builder()
                .success(false)
                .error(error)
                .build();
    }
}