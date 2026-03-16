# Dexter Web UI Changelog

---

## Development & Maintenance Guide

### Architecture Overview

The Web UI consists of two parts:

| Component | Tech Stack | Source Directory |
|---|---|---|
| **Backend API** | Hono (Bun) | `src/web/server/` |
| **Frontend SPA** | React + Vite + Tailwind | `src/web/client/` |

### Two Running Modes

| | Dev Server (port 5173) | Production (port 3002) |
|---|---|---|
| **Purpose** | Development & debugging | Deployment & daily use |
| **Hot Reload** | Yes (instant) | No (manual rebuild) |
| **Code** | Uncompressed, debuggable | Minified & bundled |
| **Requires** | Backend + Vite both running | Backend only |
| **After frontend change** | Auto-refresh | Run `vite build` |

### Workflow: Modifying Frontend Code

```bash
# Terminal 1: Start backend API
bun run src/web/server/index.ts

# Terminal 2: Start Vite dev server (with hot reload)
bunx --bun vite --config src/web/client/vite.config.ts

# Open http://localhost:5173 in browser
# Edit code → browser auto-refreshes → see changes instantly
```

When done, build the production version:

```bash
bunx --bun vite build --config src/web/client/vite.config.ts
```

### Workflow: Modifying Backend Code

```bash
# Restart the server after changes
bun run src/web/server/index.ts

# Or use watch mode for auto-restart on file changes
bun --watch run src/web/server/index.ts
```

### Workflow: Deployment (Single Process)

```bash
# 1. Build frontend into dist/web/
bunx --bun vite build --config src/web/client/vite.config.ts

# 2. Start server (serves both API + static frontend on one port)
bun run src/web/server/index.ts
# → http://localhost:3002  (configurable via WEB_PORT in .env)
```

### Deployment behind Nginx（80/443 已被占用时）

与现有 Nginx 共用 80 端口，按 `server_name` 分流（如 `topstock.decentglobal.com` 与 `dexter.decentglobal.com`）：

```bash
# 1. 复制示例配置，按需改 server_name
sudo cp /home/finagent/dexter/nginx-dexter.conf.example /etc/nginx/conf.d/dexter.conf
# 编辑 server_name 为你的 Dexter 域名

# 2. 校验并重载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 3. （可选）在 .env 中设置 CORS，便于用域名访问
# WEB_CORS_ORIGINS=http://dexter.你的域名,https://dexter.你的域名
```

示例配置见项目根目录 `nginx-dexter.conf.example`。

### 日常运维（后台运行与日志）

用 **screen** 在后台跑服务，断开 SSH 不会退出；日志写入项目下的 `dexter.log`。

**方式一：只写日志（推荐日常使用）**

```bash
screen -S dexter
cd /home/finagent/dexter
bun run src/web/server/index.ts >> dexter.log 2>&1
# 按 Ctrl+A 再按 D 脱离；重连：screen -r dexter
# 查看日志：tail -f dexter.log
```

**方式二：终端看输出并同时写日志（调试时）**

```bash
screen -S dexter
cd /home/finagent/dexter
bun run src/web/server/index.ts 2>&1 | tee dexter.log
# tee 每次覆盖；追加用 tee -a dexter.log
```

**常用命令**

- 脱离当前 screen：`Ctrl+A` 然后 `D`
- 重新连上：`screen -r dexter`
- 查看/跟踪日志：`tail -f /home/finagent/dexter/dexter.log`

### Key Configuration

- `WEB_PORT` in `.env` — Backend port (default: 3002)
- `WEB_CORS_ORIGINS` in `.env` — 逗号分隔的额外 CORS 来源（如通过 Nginx 反代用域名访问时填 `http://dexter.你的域名,https://dexter.你的域名`）
- `.dexter/web-users.json` — User accounts (auto-created on first start)
- `.dexter/web-sessions/` — Chat session data (per-user isolation)
- `.dexter/settings.json` — Model/provider selection
- Default login: `admin` / `admin123`

### Adding i18n Translations

Edit `src/web/client/src/i18n/locales.ts`:
- Add new key to both `en` and `zh` objects
- Use in components via `const { t } = useI18n(); t('your.key')`
- Supports parameter interpolation: `t('key', { name: 'value' })` → `"Hello {name}"` → `"Hello value"`

---

## 2026-03-04

### 1. 用户权限系统（admin / user）

- 用户数据新增 `role` 字段，支持 `admin`（管理员）和 `user`（普通用户）两种角色
- **admin** 可以：管理用户、配置 API Key、调整模型
- **user** 只能：正常对话、切换预设模型
- 后端 API 层面强制鉴权：用户管理、API Key 相关接口仅 admin 可调用，非 admin 返回 403
- 设置面板根据角色动态显示标签页：user 仅看到「模型」，admin 可看到「模型」「API 密钥」「用户管理」
- 添加用户时可选择权限组（管理员 / 普通用户）
- 用户列表显示每个用户的权限标签（管理员 / 普通用户）
- 管理员可通过下拉直接修改其他用户的权限组（不可修改自己，防止唯一管理员自降权）
- 默认管理员 `admin` 自动设为 `role: 'admin'`；旧数据中无 `role` 字段的用户按 admin 处理以保兼容
- 新增 API: `PUT /api/auth/users/:username/role`

### 2. 扩展可选模型列表 + 自定义模型输入

- **OpenAI** 预设新增：GPT-4o、GPT-4o Mini、GPT-4 Turbo
- **OpenRouter** 新增预设模型：
  - OpenAI: GPT-4o / GPT-4o Mini / GPT-4 Turbo
  - Google: Gemini 2.0 Flash / Gemini 3.1 Pro / Gemini 3 Flash
  - Moonshot: Kimi K2.5
  - Qwen: Qwen3 235B / Qwen 2.5 72B
  - Anthropic: Claude 3.5 Sonnet / Claude 3 Opus
  - DeepSeek: DeepSeek Chat
- 设置面板中 OpenAI / OpenRouter 下方始终显示「自定义模型 ID」输入框，支持手动输入任意模型名
- 自定义输入优先于下拉选择（填写则使用自定义值）

### 3. OpenRouter 模型路由修复

- 修复通过 OpenRouter 使用自定义模型名（如 `google/gemini-3.1-pro-preview`）时报 "model id invalid" 的问题
- 根因：系统依赖模型名前缀路由到 provider，但 OpenRouter 的模型名不带 `openrouter:` 前缀，导致回退到 OpenAI
- 修复：chat 入口自动为 prefix-routed provider（openrouter/ollama）补全前缀；`getChatModel` / `callLlm` 支持显式 provider 参数；Agent 将 `modelProvider` 传递到 LLM 调用链

### 4. Bun 服务器超时修复

- 修复 Bun.serve `idleTimeout` 默认 10 秒导致 LLM 长响应被截断的问题
- 将 `idleTimeout` 设为 255 秒（Bun 最大值），确保 SSE 流式连接不会因等待模型响应而中断

### 修改的文件

**后端：**
- `src/web/server/auth.ts` — 新增 `UserRole` 类型、`getRole()`、`updateRole()`、`listUsersWithRoles()`；`addUser()` 支持 role 参数
- `src/web/server/routes/auth.ts` — `/api/auth/me` 返回 role；用户管理接口加 admin 校验；新增 `PUT /api/auth/users/:username/role`
- `src/web/server/routes/settings.ts` — API Key 相关接口加 admin 校验
- `src/web/server/routes/chat.ts` — 自动补全 prefix-routed provider 的模型名前缀
- `src/web/server/index.ts` — `idleTimeout: 255`
- `src/model/llm.ts` — `getChatModel` / `callLlm` 支持显式 provider 参数
- `src/agent/agent.ts` — 保存并传递 `modelProvider` 到 `callLlm`
- `src/utils/model.ts` — 扩展 OpenAI / OpenRouter 预设模型列表
- `src/providers.ts` — 无变更（参考）

**前端：**
- `src/web/client/src/api/client.ts` — `getMe` 返回 role；`addUser` 支持 role；新增 `updateUserRole`
- `src/web/client/src/App.tsx` — 登录后获取 role，传 `isAdmin` 给 SettingsPanel
- `src/web/client/src/components/settings/SettingsPanel.tsx` — 按 `isAdmin` 动态显示标签页
- `src/web/client/src/components/settings/ModelSelector.tsx` — 预设列表 + 始终可见的自定义模型输入框
- `src/web/client/src/components/settings/UserManager.tsx` — 用户列表显示权限标签；管理员可下拉切换他人权限
- `src/web/client/src/i18n/locales.ts` — 新增权限相关、自定义模型相关中英文文案

---

## 2026-03-03

### i18n: English / Chinese Bilingual Support
- Added full internationalization system (`src/web/client/src/i18n/`)
- `locales.ts`: All UI strings in both English and Simplified Chinese
- `I18nContext.tsx`: React context + `useI18n()` hook with `t()` translation function and `{param}` interpolation
- Default language: **English**, switchable via header/login page toggle button (中文 / EN)
- Language preference persisted in `localStorage`
- All components updated to use `t()` instead of hardcoded text

## 2026-03-02

### New Features

#### 1. Chinese / English UI
- Replaced hardcoded Chinese with i18n system (see 2026-03-03 entry above)
- Original implementation had Chinese-only text; now supports both languages

#### 2. 新建对话 Bug 修复
- 修复点击「新建对话」按钮后不能正确开启新对话的问题
- 根因：`ChatView` 组件在 `sessionId` 由有值变为 `null` 时，`clearChat()` 未被正确触发
- 修复方式：使用 `useRef` 跟踪前一次 `sessionId`，在值变化时正确调用 `clearChat()` 或 `loadSession()`

#### 3. 用户登录与管理
- 新增登录页面，启动后需要先输入用户名密码登录
- 默认账号：`admin` / `admin123`
- 后端使用 SHA-256 + salt 哈希存储密码（文件: `.dexter/web-users.json`）
- 24 小时 Token 过期机制
- 不同用户的对话数据相互隔离
- 设置面板新增「用户管理」标签页，支持：
  - 修改当前用户密码
  - 查看用户列表
  - 添加新用户
  - 删除用户（不能删除自己）

#### 4. 亮色/暗色主题切换
- 新增亮色（白色）主题风格
- 顶栏增加主题切换按钮（☀️ / 🌙）
- 主题偏好保存在 `localStorage`，刷新后自动恢复
- 所有组件（侧边栏、对话区、设置面板、输入框、Markdown 内容等）均适配双主题
- CSS 通过 `html.dark` / `html.light` 类名切换

### 修改的文件

**新增文件：**
- `src/web/server/auth.ts` — 用户认证模块（注册、登录、Token、密码管理）
- `src/web/server/routes/auth.ts` — 认证相关 API 路由
- `src/web/client/src/context/ThemeContext.tsx` — 主题上下文 Provider
- `src/web/client/src/components/auth/LoginPage.tsx` — 登录页组件
- `src/web/client/src/components/settings/UserManager.tsx` — 用户管理组件

**修改文件：**
- `src/web/server/index.ts` — 添加认证中间件，支持 Bearer Token 和 SSE query param 认证
- `src/web/server/session-store.ts` — Session 数据结构增加 `username` 字段，`listSessions` 支持按用户过滤
- `src/web/server/routes/chat.ts` — 创建会话时关联当前用户
- `src/web/server/routes/sessions.ts` — 列出会话时按用户过滤
- `src/web/client/src/api/client.ts` — 新增登录/登出/用户管理 API，请求自动附带 Bearer Token
- `src/web/client/src/api/useChat.ts` — SSE 连接通过 query param 传递 Token
- `src/web/client/src/App.tsx` — 增加登录状态管理、主题 Provider 包裹、退出登录
- `src/web/client/src/components/layout/Header.tsx` — 中文化、主题切换按钮、用户信息/退出
- `src/web/client/src/components/layout/Sidebar.tsx` — 中文化、主题适配
- `src/web/client/src/components/chat/ChatView.tsx` — 修复新建对话 Bug
- `src/web/client/src/components/chat/MessageList.tsx` — 中文化、主题适配
- `src/web/client/src/components/chat/MessageBubble.tsx` — 中文化、主题适配
- `src/web/client/src/components/chat/InputBar.tsx` — 中文化、主题适配
- `src/web/client/src/components/chat/ThinkingBlock.tsx` — 中文化、主题适配
- `src/web/client/src/components/chat/ToolCallBlock.tsx` — 主题适配
- `src/web/client/src/components/settings/SettingsPanel.tsx` — 中文化、新增用户管理 Tab、主题适配
- `src/web/client/src/components/settings/ApiKeyManager.tsx` — 中文化、主题适配
- `src/web/client/src/components/settings/ModelSelector.tsx` — 中文化、主题适配
- `src/web/client/src/styles/globals.css` — 新增亮色主题 Markdown 样式和滚动条样式
