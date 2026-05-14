# 贡献指南

感谢你对 Web Insight AI 的关注！

## 开发环境

### 前端 (extension/)

```bash
cd extension
npm install
npm run dev    # 开发模式（热更新）
npm run build  # 生产构建
```

### 后端 (backend/)

```bash
cd backend
mvn spring-boot:run    # 启动
mvn clean compile      # 编译检查
```

## 提交规范

```
<type>(<scope>): <subject>
```

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 |
| refactor | 重构 |
| docs | 文档 |
| style | 样式 |
| chore | 构建/工具 |

| scope | 说明 |
|-------|------|
| ext | 插件端 |
| srv | 后端 |
| ai | AI 相关 |
| plan | 计划文档 |

### 示例

```
feat(ext): 实现 GitHub 页面内容提取
fix(srv): 修复 Ollama 思考模式导致超时
chore(ext): 调整匹配度算法权重
```

## 分支管理

- `main` / `master` — 稳定版本
- `feat/*` — 功能开发分支
- `fix/*` — 修复分支

## 代码风格

- TypeScript：遵循项目已有风格，使用 WXT 标准 API
- Java：遵循 Spring Boot 惯例，使用 Lombok 简化代码
- 命名：英文驼峰命名，中文注释允许

## 测试

```bash
# 前端构建
cd extension && npm run build

# 后端编译
cd backend && mvn clean compile

# 验证后端健康
curl http://localhost:8080/api/settings/health
```

## 提问与反馈

- 通过 GitHub Issues 提交问题和建议
- 描述问题时请包含：环境信息、重现步骤、期望行为、实际行为
