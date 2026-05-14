package com.webinsight.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

@Slf4j
@Service
public class ContentExtractorService {

    private static final Set<String> REMOVE_TAGS = Set.of(
            "nav", "header", "footer", "aside", "script", "style", "noscript",
            "iframe", "form", "button", "input", "select", "textarea"
    );

    private static final Set<String> REMOVE_CLASSES = Set.of(
            "sidebar", "ad", "advertisement", "comment", "comments",
            "social-share", "related-posts", "recommendation", "navigation",
            "nav-bar", "footer-bar", "header-bar", "breadcrumb", "menu"
    );

    private final HttpClient httpClient;

    public ContentExtractorService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public record ExtractedContent(String title, String text, String url, int originalLength) {}

    public ExtractedContent extractFromUrl(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Failed to fetch URL {}: status {}", url, response.statusCode());
                return null;
            }

            Document doc = Jsoup.parse(response.body());
            return extractFromDocument(doc, url);
        } catch (IOException | InterruptedException e) {
            log.error("Error extracting content from URL {}: {}", url, e.getMessage());
            return null;
        }
    }

    public ExtractedContent extractFromDocument(Document doc, String url) {
        String title = doc.title();

        for (String tag : REMOVE_TAGS) {
            doc.select(tag).remove();
        }
        for (String cls : REMOVE_CLASSES) {
            doc.select("." + cls).remove();
            doc.select("[class*=" + cls + "]").remove();
        }
        for (Element el : doc.select("[role=navigation]")) el.remove();
        for (Element el : doc.select("[role=banner]")) el.remove();
        for (Element el : doc.select("[role=contentinfo]")) el.remove();

        String text = doc.body() != null ? doc.body().text() : "";
        if (text.length() < 100) {
            return null;
        }

        return new ExtractedContent(
                title,
                text.length() > 12000 ? text.substring(0, 12000) : text,
                url,
                text.length()
        );
    }
}