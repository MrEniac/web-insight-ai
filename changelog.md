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

## [2026-05-12] 后端编译修复 + 环境配置

### 修复
- OllamaProvider/OpenAiCompatibleProvider 流式方法重构：从 RestTemplate 改为 WebClient (Spring WebFlux)
- 修复 SimpleClientHttpRequestFactory 内部类访问修饰符编译错误

### 新增
- WebClientConfig：WebClient Builder 配置 (用于 SSE 流式请求)
- Maven settings.xml：代理配置 (127.0.0.1:7890) + 阿里云镜像

### 构建
- 后端 Maven 编译成功 (BUILD SUCCESS)
- JDK 21 (JetBrains Runtime) + Maven 3.9.11 验证通过

## [2026-05-12] 环境部署 + 后端启动验证

### 配置
- application.yml MySQL 密码更新为实际密码
- 创建 MySQL 数据库 web_insight_ai (utf8mb4)

### 验证
- Redis 8.6.3 运行正常 (localhost:6379, PONG)
- MySQL 8.0 运行正常
- Spring Boot 启动成功 (localhost:8080, 2.5s)
- HikariPool 连接池初始化成功

## [2026-05-13] 插件构建验证 + Ollama 集成测试

### 修复
- wxt.config.ts: 修复 module-react 导入方式（字符串引用替代函数调用）
- wxt.config.ts: 添加 srcDir: 'src' 配置
- wxt.config.ts: 添加 http://localhost:8080/* 到 host_permissions
- popup 入口: 重命名 index.tsx 为 app.tsx 避免入口名冲突
- sidepanel 入口: 从 content script 改为独立 sidepanel 页面（chrome.sidePanel API）
- sidepanel.content.ts: 简化为消息监听器（不含 JSX）
- ai-service.ts: 默认模型改为 qwen3.5:2b（匹配用户安装的模型）
- application.yml: 默认模型改为 qwen3.5:2b

### 验证
- Ollama API 调用成功（qwen3.5:2b 模型响应正常）
- 插件生产构建成功（wxt build，339KB 总大小）
- 所有入口点正确构建：popup, sidepanel, github, search, summary, background

## [2026-05-13] Ollama 集成修复

### 修复
- 设置用户级环境变量 `OLLAMA_ORIGINS=*`，修复浏览器插件 CORS 403 错误
- 设置用户级环境变量 `OLLAMA_MODELS=D:\ollma\model`，修复模型找不到问题
- 移除所有 Ollama 请求中的 `think: false` 参数（当前 Ollama 版本不支持，导致 500 错误）
- 使用 `/no_think` 提示词后缀替代 `think: false` 参数，禁用 Qwen3.5 思考模式
- 修复 ai-service.ts 中 chat/stream 方法变量声明位置错误（const 在对象字面量内部）

### 验证
- Ollama generate API 无 `think` 参数测试通过（qwen3.5:0.8b 响应正常）
- 插件重新构建成功（339KB）

## [2026-05-13] Phase 2 - API 网关 + 云模型支持

### 新增

#### 后端 (backend/)
- ProviderConfigEntity JPA 实体 + ProviderConfigRepository：云端模型配置持久化（MySQL）
- ApiKeyEncryptionService：AES-256-GCM 加密存储 API Key
- ProviderConfigService：云端配置管理（CRUD + 密钥加解密）
- ProviderConfigController：`/api/settings/providers` REST API（列表/查询/创建/更新/删除）
- RateLimitFilter：IP + 路径级别限流（60 req/min on `/api/ai/*`）
- AiRequest 新增 `apiKey`、`apiUrl` 字段，支持请求级密钥传递
- AiModelService 重构：支持从请求或 DB 动态获取 API Key/URL/Model

#### 插件端 (extension/)
- Settings 页面增强：云端模式增加 Model Name 字段、自定义模式增加 Model Name 字段
- Settings 保存时同步将 API Key 写入后端加密存储（通过 `/api/settings/providers`）
- ai-service.ts 新增 `getAuthProvider()` 方法，云端/自定义模式自动携带 provider/apiKey/apiUrl
- AnalyzeRequest 接口新增 `provider`、`model`、`apiKey`、`apiUrl`、`messages`、`prompt` 字段

### 修复
- 后端 OllamaProvider 移除所有 `think: false` 参数（与前端保持一致，改用 `/no_think` 提示词）
- 后端 OllamaProvider chat/chatStream 方法追加 `/no_think` 用户消息

### 验证
- 后端 Maven clean compile 通过（24 个源文件）
- 插件 wxt build 通过（344KB）
- Lombok 注解处理正常
- MySQL provider_configs 表将随 JPA ddl-auto=update 自动创建