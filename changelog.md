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

## [2026-05-13] 插件 UI 修复 + Qwen3.5 思考模式彻底禁用

### 新增
- background.ts：右键菜单新增「Open AI Chat」选项，通过 `chrome.sidePanel.open()` 打开侧边栏
- SidePanel 增加 ⚙️ 设置按钮，点击在新标签页打开 Popup 设置页
- SidePanel 对话改为流式输出（`chatStream`），增加打字光标效果
- SidePanel 内置设置面板，可查看当前模型模式、模型名称、后端地址
- 后端 `provider_configs` 表由 JPA 自动创建成功（MySQL 验证通过）

### 修复
- Popup 白屏问题：移除 `openPanelOnActionClick: true`，点击图标恢复弹出 Popup 设置页
- Popup 渲染问题：`definePopup` 改为标准 `createRoot` DOM 渲染
- 侧边栏设置按钮无效：`openOptionsPage()` 改为 `chrome.tabs.create()` 打开设置页
- Qwen3.5 思考模式导致 AI 输出卡死：全面从 generate API 迁移到 chat API
  - 后端 OllamaProvider 的 generate/generateStream 也改用 chat API 实现
  - 流式输出增加 `role === 'thinking'` 过滤，不输出思考内容
- `/no_think` 放在用户消息开头（而非独立消息）可将思考时间从 32s 降至 4s
  - 独立消息 `/no_think` 或 `/set nothink` 均导致超时或更长思考
  - 前端 `withNoThink()` 方法自动为首个 user 消息添加 `/no_think\n` 前缀
  - 后端 OllamaProvider 同样为首个 user 消息添加 `/no_think\n` 前缀
- GitHubCard/SummaryPanel 添加 "AI is thinking..." 旋转加载提示，首个内容块到达后自动移除

### 构建
- 前端 wxt build 通过（345KB）
- 后端 Maven clean compile 通过

## [2026-05-14] Qwen3.5 思考模式最终解决方案

### 修复
- **确认 `think: false` API 参数是关闭思考模式的正确方法**（Ollama 0.23.3 支持）
  - API 调用时在请求体中添加 `"think": false` 即可彻底禁用思考
  - 测试结果：qwen3.5:2b 7 秒输出，`thinking` 字段为 null
- 前端 `callOllamaChat/callOllamaChatStream` 的 fetch body 中添加 `think: false`
- 后端 `OllamaProvider` 全部 4 个方法的请求体添加 `body.put("think", false)`
- 移除 `/no_think\n` 前缀逻辑和 `withNoThink()` 方法（对 2b 反而导致超时）
- 移除之前误提交的 Qwen Studio.html 及附属文件

### 总结
| 方法 | qwen3.5:2b 效果 |
|------|----------------|
| `generate` API | 54s 超时/空响应 |
| `chat` API 无参数 | 8.5s，有 thinking |
| `chat` API + `/no_think` 前缀 | 120s 超时 |
| `chat` API + `think: false` | **7s，无 thinking** ✅ |

### 验证
- Ollama API 测试 `think: false` 参数有效（7s, `Has thinking: False`）
- 前端 wxt build 通过（345KB）
- 后端 Maven clean compile 通过
- Spring Boot 启动成功（localhost:8080）

## [2026-05-14] 搜索匹配度算法优化

### 新增
- URL 权威信号扩展到 8 级分类 60+ 站点（政府/新闻/大企业/学术/开源组织）
- AI 精简评分格式 `| XX`（仅增加 ~5 token/结果）
- 点击行为自动记录到 `chrome.storage.local`，二次搜索同一链接自动加分
- Console 输出完整评分明细（AI/kw/url/clicks 各维度分数）

### 修改
- 匹配度公式最终定版：**AI 评分 × 70% + 关键词重叠 × 10% + URL 权威 × 15% + 点击行为 × 5%**
- AI prompt 精简为 `标签1, 标签2 | 分数` 格式，减少推理时间
- 搜索防抖从 1.5s 延长到 3s，防止重复触发
- 加载图标去重检查，避免多个 "analyzing..." 同时出现

### 修复
- 解析器支持混合格式（编号行 + 无编号行 + `| XX` 后缀）
- `tagsMap` 未定义导致分析卡住的 bug
- 标签中出现双匹配度（`标签3 | 85` 被当作标签文字）

## [2026-05-14] 社区规范完善

### 新增
- README.md：项目介绍、功能特性、架构图、安装指南、使用手册、API 端点文档
- LICENSE：MIT 开源协议
- CONTRIBUTING.md：贡献指南（环境搭建、提交规范、代码风格）
- .editorconfig：统一编辑器配置（缩进、换行、编码）
- package.json `typecheck` 脚本：`tsc --noEmit`

### 修改
- .gitignore 扩展：增加 IDE 专属文件、日志目录等忽略规则