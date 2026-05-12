# 更新日志

## [2026-05-12] 项目初始化

### 新增
- 创建项目开发计划文档 (DEVELOPMENT_PLAN.md)
- 制定 Phased 开发路线 (Phase 1 - Phase 5)
- 确定技术栈：WXT + React + Spring Boot 3 + MySQL + Redis
- 确定模型接入架构：Ollama 直连 + 云 API 网关 + 自定义 API
- 确定云 API 支持：OpenAI / DeepSeek / 通义千问 / 硅基流动
- 确定发布方式：本地加载（开发阶段）

## [2026-05-12] Phase 1 开发 - 插件端核心功能 + 后端骨架

### 新增

#### 插件端 (extension/)
- 修复 sidepanel.content.ts 异步语法问题，补充 async main 函数
- 修复 popup/index.tsx 使用 WXT 标准 definePopup API
- 修复 summary.content.ts 改为 defineContentScript 格式
- ai-service.ts 增加 SSE 流式支持 (analyzeGitHubStream, summarizeStream, chatStream)
- ai-service.ts 增加 Ollama 流式 NDJSON 解析能力
- ai-service.ts 增加后端 SSE 流式代理 (callBackendStream)
- GitHubCard 组件重构：支持流式输出 (renderGitHubCardStream)、加载状态 (renderGitHubCardLoading)、错误展示 (renderGitHubCardError)
- GitHubCard 增加闪烁光标动画和流式文字输出效果
- 新增 SummaryPanel 组件 (render.ts)：浮动面板展示文章摘要，支持流式输出
- summary.content.ts 集成 SummaryPanel 流式 UI
- github.content.ts 改用流式 API (analyzeGitHubStream) 渲染卡片

#### 后端 (backend/)
- Spring Boot 3.2.5 项目骨架 (pom.xml + application.yml)
- AiModelProvider 接口：统一 AI 模型调用抽象
- OllamaProvider：Ollama 本地模型直连，支持 generate/chat 和流式
- OpenAiCompatibleProvider：兼容 OpenAI 格式的云模型（OpenAI/DeepSeek/Qwen/SiliconFlow）
- AiModelService：模型路由服务，自动选择对应 Provider
- PromptService：GitHub/摘要/搜索标签 Prompt 工程
- CacheService：基于 Caffeine 的本地缓存，SHA-256 key 生成
- AiGatewayController：AI 统一网关（/api/ai/analyze, /stream, /github, /chat）
- CacheController：缓存管理（清空/统计）
- SettingsController：健康检查 + Ollama 状态检测
- WebConfig：CORS 全局配置
- RestTemplateConfig：超时配置
- Model 层：AiRequest, AiResponse, GitHubAnalysisRequest, ModelConfig

### 修改
- .gitignore 增加 Maven wrapper 相关忽略规则