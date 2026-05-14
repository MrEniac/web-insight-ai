# Web Insight AI

> AI 驱动的开发者浏览增强层（Developer Browsing Enhancement Layer）

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17%2B-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-green)](https://spring.io/)
[![WXT](https://img.shields.io/badge/WXT-0.19.x-8A2BE2)](https://wxt.dev/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)

Web Insight AI 是一个 Chrome 浏览器扩展，帮助开发者在浏览 GitHub、搜索引擎和技术文章时快速理解内容价值，降低信息筛选成本。支持本地 Ollama 模型和多种云端 AI API。

<p align="center">
  <strong>🤖 AI 分析 · 📄 网页摘要 · 🔍 搜索增强 · 💬 侧边栏对话</strong>
</p>

---

## ✨ 功能

| 模块 | 功能 | 状态 |
|------|------|------|
| GitHub 分析 | 打开仓库自动生成 AI 分析卡片（类型、技术栈、难度、活跃度） | ✅ |
| 网页摘要 | 右键/快捷键 `Ctrl+Shift+S` 对任意网页生成 AI 摘要 | ✅ |
| 搜索增强 | Google/Bing/百度搜索结果旁自动注入 AI 标签和匹配度评分 | ✅ |
| AI 对话 | 侧边栏流式 AI 对话，支持多轮聊天 | ✅ |
| 多模型支持 | Ollama 本地 / OpenAI / DeepSeek / 通义千问 / 硅基流动 / 自定义 API | ✅ |
| API Key 加密 | AES-256-GCM 加密存储云端 API Key 到后端 MySQL | ✅ |
| 缓存加速 | Caffeine 本地缓存 + SHA-256 去重，减少重复 AI 调用 | ✅ |

---

## 🏗️ 架构

```
┌─────────────────────────────────────────┐
│            Chrome Extension (WXT+React) │
│  ┌───────┐ ┌──────┐ ┌──────────────┐   │
│  │Popup  │ │Side  │ │Content Scripts│   │
│  │Settings│ │Panel │ │GitHub/Search │   │
│  └───────┘ └──────┘ └──────────────┘   │
├─────────────────────────────────────────┤
│              Local Mode → Ollama        │
│              Cloud Mode → Backend       │
├─────────────────────────────────────────┤
│         Spring Boot 3.2.5 Backend       │
│  ┌───────────────────────────────────┐  │
│  │ AI Gateway → Provider Router      │  │
│  │  ├─ OllamaProvider                │  │
│  │  ├─ OpenAiCompatibleProvider      │  │
│  │  └─ CustomApiProvider            │  │
│  ├───────────────────────────────────┤  │
│  │ Cache Service (Caffeine)          │  │
│  │ API Key Encryption (AES-256-GCM) │  │
│  │ Rate Limiter                      │  │
│  │ Content Extractor (Jsoup)         │  │
│  └───────────────────────────────────┘  │
│         MySQL 8.0  +  Redis             │
└─────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 插件框架 | [WXT](https://wxt.dev) + React 19 + TailwindCSS 4 |
| 通信模型 | Chrome MV3 (Content Script / Side Panel / Service Worker) |
| 后端框架 | Spring Boot 3.2.5 + Java 17 |
| 数据库 | MySQL 8.0 (主存储) + Redis (缓存) |
| 本地 AI | [Ollama](https://ollama.com) + qwen3.5:2b |
| 云 AI API | OpenAI / DeepSeek / 通义千问(DashScope) / 硅基流动(SiliconFlow) |
| 内容提取 | Readability.js (前端) + Jsoup (后端) |
| 加密 | AES-256-GCM |
| 缓存 | Caffeine + SHA-256 key |
| 构建 | WXT (Vite) + Maven |

---

## 🚀 快速开始

### 前置条件

- **Node.js** 18+ / npm 9+
- **Java** 17+ (推荐 JDK 21)
- **Maven** 3.6+
- **MySQL** 8.0+
- **Redis** (可选，目前使用 Caffeine 本地缓存)
- **[Ollama](https://ollama.com)** 已安装并拉取模型（本地模式）

### 1. 拉取模型

```bash
ollama pull qwen3.5:2b
```

### 2. 配置数据库

```sql
CREATE DATABASE IF NOT EXISTS web_insight_ai
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

修改 `backend/src/main/resources/application.yml` 中的数据库密码。

### 3. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端启动在 `http://localhost:8080`，JPA 自动建表。

### 4. 构建前端扩展

```bash
cd extension
npm install
npm run build
```

### 5. 加载扩展

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension/.output/chrome-mv3/`

---

## 📖 使用指南

### 设置模型模式

点击插件图标 → 弹出设置页面，选择：

- **Local (Ollama)**：直连本地 Ollama，延迟最低
- **Cloud API**：选择云端提供商并填入 API Key（Key 加密存后端）
- **Custom API**：填写任意 OpenAI 兼容格式的 API 地址

### GitHub 分析

打开任意 GitHub 仓库页面，自动注入 AI 分析卡片。

### 网页摘要

三种方式：
- 右键页面 → **AI Summary**
- 快捷键 `Ctrl+Shift+S`
- 右键选中文字 → AI Summary

### 搜索增强

在 Google / Bing / 百度搜索，结果旁自动显示 AI 标签和匹配度评分：

- 🟢 80%+ 高匹配
- 🟠 50-80% 中等匹配
- 🔴 <50% 低匹配

评分 = AI 综合 × 70% + 关键词重叠 × 10% + URL 权威 × 15% + 点击行为 × 5%

### AI 对话

右键页面 → **Open AI Chat** 打开侧边栏，支持流式多轮对话。

---

## 🔑 API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/ai/analyze` | AI 分析（非流式） |
| POST | `/api/ai/analyze/stream` | AI 分析（SSE 流式） |
| POST | `/api/ai/chat` | AI 对话 |
| POST | `/api/ai/chat/stream` | AI 对话（流式） |
| POST | `/api/ai/summary` | 网页摘要 |
| POST | `/api/ai/summary/stream` | 网页摘要（流式） |
| POST | `/api/ai/search/tags` | 搜索标签批量分析 |
| POST | `/api/ai/analyze/github` | GitHub 仓库分析 |
| GET  | `/api/settings/health` | 健康检查 |
| GET  | `/api/settings/ollama-status` | Ollama 状态 |
| CRUD | `/api/settings/providers` | 云端模型配置管理 |
| GET/DELETE | `/api/cache/` | 缓存管理 |

---

## 📁 项目结构

```
Web-Insight-AI/
├── extension/                          # 浏览器插件
│   ├── src/
│   │   ├── entrypoints/                # WXT 入口
│   │   │   ├── background.ts           # Service Worker
│   │   │   ├── popup/                  # 设置弹窗
│   │   │   ├── sidepanel/              # AI 侧边栏
│   │   │   ├── github.content.ts       # GitHub 分析
│   │   │   ├── search.content.ts       # 搜索增强
│   │   │   └── summary.content.ts      # 网页摘要
│   │   ├── components/
│   │   │   ├── GitHubCard/             # 分析卡片
│   │   │   ├── SummaryPanel/           # 摘要面板
│   │   │   ├── Settings/               # 设置 UI
│   │   │   └── SidePanel/              # 对话 UI
│   │   ├── services/
│   │   │   ├── ai-service.ts           # AI 请求核心
│   │   │   ├── search-adapter.ts       # 搜索引擎适配
│   │   │   ├── github-extractor.ts     # GitHub DOM 提取
│   │   │   └── readability.ts          # 网页内容提取
│   │   └── assets/
│   ├── wxt.config.ts
│   └── package.json
├── backend/                            # Spring Boot 后端
│   └── src/main/
│       ├── java/com/webinsight/
│       │   ├── controller/             # REST API
│       │   ├── service/                # 业务逻辑
│       │   ├── provider/               # AI 模型适配
│       │   ├── model/                  # 数据模型
│       │   ├── repository/             # JPA 仓库
│       │   └── config/                 # 配置类
│       └── resources/
│           └── application.yml
├── CHANGELOG.md                        # 更新日志
├── DEVELOPMENT_PLAN.md                 # 开发计划
└── Plan.md                             # 原始需求
```

---

## 🤝 贡献

请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可

[MIT License](LICENSE)

## ⚠️ 注意

- Ollama 需要启动并设置环境变量 `OLLAMA_ORIGINS=*` 以允许浏览器 CORS
- 云 API Key 经 AES-256-GCM 加密后存储在 MySQL，不会暴露给前端
- Qwen3.5 模型使用 `think: false` 参数禁用思考模式，获得快速响应
