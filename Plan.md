# Web Insight AI — 项目实现计划

## 项目定位

> 面向开发者与技术学习者的信息增强工具（Developer Browsing Enhancement Layer）

不是通用聊天机器人，而是 AI 浏览器助手 + GitHub 智能阅读器 + AI 搜索增强层。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 插件框架 | WXT + React + TailwindCSS |
| 插件通信 | Chrome MV3 (Content Script / Side Panel / Service Worker) |
| 后端 | Spring Boot 3 + Java 17+ |
| 数据库 | MySQL + Redis（缓存） |
| 云 API | OpenAI / DeepSeek / 通义千问 / 硅基流动 |
| 本地模型 | Ollama（直连 localhost:11434） |
| 内容提取 | Mozilla Readability (前端) + Jsoup (后端) |
| 发布方式 | 本地加载（开发阶段） |

---

## 模型接入架构

```
插件 Settings 配置三种模式：
├── 本地模式 → 直连 Ollama (localhost:11434)
├── 云端模式 → 走 Spring Boot 后端 → Provider 路由分发
│   ├── OpenAiProvider
│   ├── DeepSeekProvider
│   ├── QwenProvider
│   └── SiliconFlowProvider
└── 自定义模式 → 走 Spring Boot 后端 → CustomApiProvider (OpenAI 兼容格式)
```

- 所有云 API 请求必须走后端（保护 API Key 不暴露给前端）
- Ollama 本地模式可直连，也可选走后端（统一缓存/日志）
- 自定义 API 支持 OpenAI 兼容格式，覆盖市面大多数提供商

---

## 项目结构

```
Web-Insight-AI/
├── extension/                        # 浏览器插件 (WXT + React)
│   ├── src/
│   │   ├── entrypoints/
│   │   │   ├── content.ts            # Content Script 主入口
│   │   │   ├── sidepanel.tsx         # 侧边栏入口
│   │   │   ├── popup.tsx             # 弹窗入口
│   │   │   └── background.ts         # Service Worker
│   │   ├── components/
│   │   │   ├── GitHubCard/           # GitHub 分析卡片
│   │   │   ├── SearchTag/            # 搜索结果标签
│   │   │   ├── SummaryPanel/         # 摘要面板
│   │   │   └── SidePanel/            # AI 侧边栏
│   │   ├── hooks/                    # 自定义 React Hooks
│   │   ├── services/                 # AI 请求 / 缓存 / 通信
│   │   ├── utils/                    # DOM 提取 / Readability / 工具
│   │   └── assets/
│   ├── package.json
│   └── wxt.config.ts
│
├── backend/                          # Spring Boot 后端
│   ├── src/main/java/com/webinsight/
│   │   ├── config/                   # 配置 (CORS / Redis / 模型)
│   │   ├── controller/
│   │   │   ├── AiGatewayController   # AI 统一网关
│   │   │   ├── CacheController       # 缓存管理
│   │   │   └── SettingsController     # 用户配置
│   │   ├── service/
│   │   │   ├── AiModelService         # 模型路由
│   │   │   ├── PromptService          # Prompt 工程
│   │   │   ├── ContentExtractService  # 网页内容提取
│   │   │   └── CacheService           # 缓存管理
│   │   ├── model/
│   │   │   ├── AiRequest / AiResponse
│   │   │   ├── ModelConfig            # 模型配置
│   │   │   └── AnalysisResult
│   │   └── provider/
│   │       ├── OllamaProvider         # Ollama 适配
│   │       ├── OpenAiProvider         # OpenAI 适配
│   │       ├── DeepSeekProvider        # DeepSeek 适配
│   │       ├── QwenProvider           # 通义千问适配
│   │       ├── SiliconFlowProvider     # 硅基流动适配
│   │       └── CustomApiProvider      # 自定义 API 适配
│   └── pom.xml
│
├── docs/                             # 项目文档
├── plan.md                           # 实现计划
└── changelog.md                      # 操作日志
```

---

## 功能模块

### 模块 1：GitHub 仓库 AI 分析

- 用户打开 GitHub 仓库页面时，插件自动读取仓库信息，生成 AI 分析结果
- Content Script 注入 github.com 页面
- 通过 GitHub DOM + GitHub REST API 获取结构化数据
- AI 分析卡片注入到 README 上方
- 注意 GitHub SPA 路由切换需监听 `turbo:load` 事件

### 模块 2：搜索结果 AI 增强

- 支持 Google / Bing / 百度
- 在搜索结果旁生成 AI 标签（质量、时效性、适合人群）
- MutationObserver 监听搜索结果加载
- 批量发送分析请求，逐条标注

### 模块 3：网页 AI 摘要

- 右键菜单 / 快捷键触发 AI Summary
- Mozilla Readability 提取网页正文
- 流式输出摘要结果

### 模块 4：AI 侧边栏

- chrome.sidePanel API
- 当前页面问答、总结、技术解释、README 分析
- 共享模块 1/2/3 的分析结果

### 模块 5：本地模型 + 云 API 接入

- Ollama 本地模型直连
- 云端 API（OpenAI / DeepSeek / 通义千问 / 硅基流动）
- 自定义 API（OpenAI 兼容格式）
- API Key 加密存储，速率限制

---

## 开发路线

### Phase 1：项目骨架 + Ollama 直连 + GitHub 仓库分析

1. WXT + React 插件项目初始化（TailwindCSS、MV3 manifest）
2. Spring Boot 后端项目初始化（MySQL + Redis 配置）
3. Ollama 直连通信实现
4. GitHub 页面 Content Script 注入
5. GitHub DOM 数据提取（README、标题、star、language 等）
6. GitHubCard 组件 + AI 分析结果渲染
7. 插件 Settings 页面（模型模式选择）

### Phase 2：API 网关 + 云模型支持

1. Provider 抽象接口设计
2. OpenAiProvider 实现
3. DeepSeekProvider 实现
4. QwenProvider 实现
5. SiliconFlowProvider 实现
6. CustomApiProvider 实现
7. SSE 流式响应
8. API Key 加密存储 + 速率限制
9. Settings 页面完善（API Key 配置、模型选择）

### Phase 3：网页 AI 摘要

1. Readability 内容提取（前端 + 后端 Jsoup）
2. 摘要生成 Prompt 工程
3. 流式输出 UI
4. 缓存策略
5. 右键菜单 / 快捷键触发

### Phase 4：搜索结果 AI 增强

1. Google DOM 适配
2. Bing DOM 适配
3. 百度 DOM 适配
4. SearchTag 标签组件
5. 批量分析接口
6. MutationObserver 监听

### Phase 5：AI 侧边栏 + 对话

1. chrome.sidePanel 集成
2. 对话 UI 组件
3. 上下文管理（共享模块 1/2/3 分析结果）
4. 对话历史存储
5. Prompt 模板管理