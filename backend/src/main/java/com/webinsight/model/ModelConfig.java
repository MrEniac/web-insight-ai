package com.webinsight.model;

import lombok.Data;

@Data
public class ModelConfig {

    private String provider;

    private String url;

    private String model;

    private String apiKey;

    private Integer timeout;
}