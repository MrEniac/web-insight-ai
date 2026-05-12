package com.webinsight.model;

import lombok.Data;

import java.util.List;

@Data
public class GitHubAnalysisRequest {

    private String repoName;

    private String description;

    private Integer stars;

    private Integer forks;

    private String language;

    private Integer issues;

    private String readme;

    private List<String> topics;

    private String license;

    private String updatedAt;
}