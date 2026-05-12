# GitHub Insight AI — 开发计划

## 项目简介

GitHub Insight AI 是一个基于浏览器插件的 AI 搜索增强工具，核心定位是"开发者浏览增强层（Developer Browsing Enhancement Layer）"，帮助用户在浏览 GitHub、搜索引擎及技术文章时，快速理解内容价值，降低信息筛选成本。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 插件框架 | WXT + React + TailwindCSS |
| 插件通信 | Chrome MV3 (Content Script / Side Panel / Service Worker) |
| 后端 | Spring Boot 3 + Java 17+ |
| 数据库 | MySQL (主存储) + Redis (缓存) |
| 云 API | OpenAI / DeepSeek / 通义千问 / 硅基流动 |
| 本地模型 | Ollama (直连 localhost:11434) |
| 内容提取 | Mozilla Readability (前端) + Jsoup (后端) |
| 发布方式 | 本地加载 (开发阶段) |

---

## 模型接入架构

```
插件 Settings 配置三种模式：
├── 本地模式     → 直连 Ollama (localhost:11434)
├── 云端模式     → 走 Spring Boot 后端 → Provider 路由分发
│   ├── OpenAiProvider
│   ├── DeepSeekProvider
│   ├── QwenProvider
│   └── SiliconFlowProvider
└── 自定义模式   → 走 Spring Boot 后端 → CustomApiProvider (OpenAI 兼容格式)
```

- 所有云 API 请求必须经过后端网关（保护 API Key 不暴露给前端）
- 本地 Ollama 模式可直连，也可选走后端（统一缓存/日志）
- 自定义 API 支持 OpenAI 兼容格式，覆盖市面大多数提供商

---

## 系统架构

```
Browser Extension
        │
        ├── Ollama 直连 (本地模式)
        │
        └── Spring Boot Backend
                │
                ├── API Gateway (统一入口)
                │     ├── /api/analyze/github
                │     ├── /api/analyze/summary
                │     ├── /api/analyze/search
                │     └── /api/chat
                │
                ├── Provider Layer
                │     ├── OpenAiProvider
                │     ├── DeepSeekProvider
                │     ├── QwenProvider
                │     ├── SiliconFlowProvider
                │     └── CustomApiProvider
                │
                ├── Prompt Builder (Prompt 工程)
                │
                ├── Content Extractor (Jsoup + Readability)
                │
                ├── Cache Layer (Redis + Caffeine)
                │
                └── Rate Limiter (限流)
```

---

## 项目目录结构

```
Web-Insight-AI/
├── extension/                          # 浏览器插件 (WXT + React)
│   ├── src/
│   │   ├── entrypoints/
│   │   │   ├── content.ts              # Content Script 主入口
│   │   │   ├── sidepanel.tsx           # 侧边栏入口
│   │   │   ├── popup.tsx               # 弹窗入口
│   │   │   └── background.ts           # Service Worker
│   │   ├── components/
│   │   │   ├── GitHubCard/             # GitHub 分析卡片
│   │   │   ├── SearchTag/              # 搜索结果标签
│   │   │   ├── SummaryPanel/          # 摘要面板
│   │   │   └── SidePanel/             # AI 侧边栏
│   │   ├── hooks/                      # 自定义 React Hooks
│   │   ├── services/                   # AI 请求 / 缓存 / 通信
│   │   ├── utils/                      # DOM 提取 / Readability / 工具
│   │   └── assets/
│   ├── package.json
│   └── wxt.config.ts
│
├── backend/                            # Spring Boot 后端
│   ├── src/main/java/com/webinsight/
│   │   ├── config/                     # 配置 (CORS / Redis / 模型)
│   │   ├── controller/
│   │   │   ├── AiGatewayController    # AI 统一网关
│   │   │   ├── CacheController        # 缓存管理
│   │   │   └── SettingsController      # 用户配置
│   │   ├── service/
│   │   │   ├── AiModelService         # 模型路由
│   │   │   ├── PromptService          # Prompt 工程
│   │   │   ├── ContentExtractService   # 网页内容提取
│   │   │   └── CacheService           # 缓存管理
│   │   ├── model/
│   │   │   ├── AiRequest / AiResponse
│   │   │   ├── ModelConfig            # 模型配置
│   │   │   └── AnalysisResult
│   │   └── provider/
│   │       ├── AiModelProvider         # Provider 接口
│   │       ├── OllamaProvider
│   │       ├── OpenAiProvider
│   │       ├── DeepSeekProvider
│   │       ├── QwenProvider
│   │       ├── SiliconFlowProvider
│   │       └── CustomApiProvider
│   └── pom.xml
│
├── docs/                               # 项目文档
├── DEVELOPMENT_PLAN.md                 # 本文件
├── CHANGELOG.md                        # 更新日志
└── Plan.md                             # 原始需求文档
```

---

## Phased 开发路线

### Phase 1：项目骨架 + Ollama 直连 + GitHub 仓库分析

**前端（插件）：**

- WXT 项目初始化，配置 MV3 manifest
- React + TailwindCSS 基础搭建
- 插件 Settings 页面（模型选择：Ollama / Cloud / Custom）
- Content Script 注入 GitHub 页面
- GitHub DOM 数据提取（README、标题、star、language 等）
- 调用 Ollama API (localhost:11434) 生成分析结果
- GitHubCard 组件渲染分析卡片

**后端（Spring Boot）：**

- Spring Boot 3 项目骨架
- MySQL + Redis 配置
- AiModelProvider 接口设计
- OllamaProvider 实现
- `/api/analyze/github` 接口（流式 SSE 响应）
- Caffeine 本地缓存

**交付标准：**

- 浏览器打开 GitHub 仓库页面，自动出现 AI 分析卡片
- Ollama 本地模型正常响应
- 后端 `/api/analyze/github` 接口可用

---

### Phase 2：API 网关 + 云模型支持

**前端：**

- Settings 页面增加：云端模型配置（API Key、模型选择）
- 增加自定义 API 配置（URL + Key + 模型名）
- AI 请求优先走后端网关，Ollama 可选直连

**后端：**

- OpenAiProvider、DeepSeekProvider、QwenProvider、SiliconFlowProvider
- CustomApiProvider（OpenAI 兼容格式）
- API Key 加密存储 (AES-256)
- 统一请求/响应格式适配
- 流式 SSE 响应支持
- 请求速率限制 (@RateLimiter)

**交付标准：**

- 插件可切换 Ollama / OpenAI / DeepSeek / Qwen / SiliconFlow
- 自定义 API 可正常调用
- API Key 加密存储，不暴露给前端

---

### Phase 3：网页 AI 摘要

**前端：**

- 页面右键菜单 / 快捷键触发 AI Summary
- Readability 内容提取（Content Script 中运行）
- SummaryPanel 组件渲染

**后端：**

- `/api/analyze/summary` 接口
- Jsoup 辅助提取（应对前端 Readability 失败的页面）
- 摘要结果缓存

**交付标准：**

- 任意网页可通过快捷键触发生成 AI 摘要
- 摘要内容准确，无关内容被过滤

---

### Phase 4：搜索结果 AI 增强

**前端：**

- Google / Bing / 百度 三个搜索引擎 DOM 选择器适配
- SearchTag 组件（标签注入到搜索结果旁）
- 批量分析请求

**后端：**

- `/api/analyze/search` 批量接口
- 后端网页内容抓取 + Readability 清洗
- 标签分类 Prompt 工程

**交付标准：**

- Google / Bing / 百度搜索结果旁自动出现 AI 标签
- 标签准确反映内容质量

---

### Phase 5：AI 侧边栏 + 对话

**前端：**

- `chrome.sidePanel` API 集成
- 侧边栏 UI（对话界面、上下文面板）
- 共享 Phase 1/2/3 的分析结果

**后端：**

- `/api/chat` 对话接口（带上下文）
- Prompt 模板管理（不同场景不同 system prompt）
- 对话历史 MySQL 存储

**交付标准：**

- 右侧侧边栏可进行 AI 对话
- 对话上下文包含当前页面信息
- 对话历史可查看

---

## 日志与 Git 规范

### 日志策略

每次操作记录到 `CHANGELOG.md`，格式如下：

```markdown
## [YYYY-MM-DD] 操作描述

### 新增
- xxx

### 修改
- xxx

### 修复
- xxx
```

### Git 提交规范

```
<type>(<scope>): <subject>

<body>
```

type:

- feat: 新功能
- fix: 修复
- refactor: 重构
- docs: 文档
- style: 样式
- chore: 构建/工具

scope:

- ext: 插件端
- srv: 后端
- plan: 计划文档

示例：

```
feat(ext): 初始化 WXT 项目骨架
feat(srv): 初始化 Spring Boot 项目骨架
feat(ext): 实现 GitHub 页面内容提取
```

### 大更新后 Git 操作

每个 Phase 完成后或重大功能完成后：

1. `git add .`
2. `git commit -m "feat(scope): 完整描述"`
3. 检查提交状态

---

## 关键设计决策

| 决策 | 方案 | 原因 |
|------|------|------|
| 本地模型直连 | Ollama 直连前端 | 减少延迟，无需后端 |
| 云 API 走后端 | 后端作为 API Gateway | 保护 API Key 不暴露 |
| 缓存策略 | Redis + Caffeine 二级缓存 | GitHub 仓库分析按 repo+commit 缓存，搜索结果按 URL+TTL 缓存 |
| SSE 流式响应 | 后端统一使用 SSE | 逐字输出体验更好 |
| 自定义 API | OpenAI 兼容格式 | 覆盖大多数 API 提供商 |
| 内容提取 | Readability(前端) + Jsoup(后端) | 前端处理当前页面，后端处理搜索结果需抓取的页面 |