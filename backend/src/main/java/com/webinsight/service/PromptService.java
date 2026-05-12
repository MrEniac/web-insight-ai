package com.webinsight.service;

import com.webinsight.model.GitHubAnalysisRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PromptService {

    public String buildGitHubPrompt(GitHubAnalysisRequest request) {
        return """
                你是一个GitHub项目分析助手。请根据以下信息分析：

                1. 项目类型
                2. 技术栈
                3. 学习难度（Beginner/Intermediate/Advanced）
                4. 是否适合新手
                5. 项目主要用途
                6. 项目活跃度评估

                项目名称：%s
                描述：%s
                Star数：%d
                Fork数：%d
                语言：%s
                Issue数：%d
                Topics：%s
                License：%s

                README内容：
                %s
                """.formatted(
                nullSafe(request.getRepoName()),
                nullSafe(request.getDescription()),
                nullSafe(request.getStars()),
                nullSafe(request.getForks()),
                nullSafe(request.getLanguage()),
                nullSafe(request.getIssues()),
                request.getTopics() != null ? String.join(", ", request.getTopics()) : "",
                nullSafe(request.getLicense()),
                truncate(request.getReadme(), 8000)
        );
    }

    public String buildSummaryPrompt(String title, String content) {
        return """
                请对以下文章内容进行总结，提取核心要点：

                标题：%s

                内容：
                %s
                """.formatted(nullSafe(title), truncate(content, 12000));
    }

    public String buildSearchTagPrompt(String title, String description) {
        return """
                请根据以下搜索结果信息，给出2-3个简短标签描述这个链接的质量和类型：

                标题：%s
                描述：%s

                请只输出标签，每个标签用逗号分隔，例如：官方文档,新手友好,内容较新
                """.formatted(nullSafe(title), nullSafe(description));
    }

    private String nullSafe(Object obj) {
        return obj != null ? obj.toString() : "";
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "无内容";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength) + "\n...(内容已截断)";
    }
}