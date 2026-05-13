package com.webinsight.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final long WINDOW_MS = 60_000;
    private final Map<String, RateLimitEntry> rateLimitMap = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String path = httpRequest.getRequestURI();
        if (!path.startsWith("/api/ai/")) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = httpRequest.getRemoteAddr();
        String key = clientIp + ":" + path;
        RateLimitEntry entry = rateLimitMap.computeIfAbsent(key, k -> new RateLimitEntry());

        long now = System.currentTimeMillis();
        synchronized (entry) {
            if (now - entry.windowStart > WINDOW_MS) {
                entry.windowStart = now;
                entry.count.set(0);
            }
            long count = entry.count.incrementAndGet();
            if (count > MAX_REQUESTS_PER_MINUTE) {
                log.warn("Rate limit exceeded for {} on {}", clientIp, path);
                HttpServletResponse httpResponse = (HttpServletResponse) response;
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private static class RateLimitEntry {
        final AtomicLong count = new AtomicLong(0);
        volatile long windowStart = System.currentTimeMillis();
    }
}