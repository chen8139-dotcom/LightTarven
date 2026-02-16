# LightTavern 架构说明

## 1. 系统目标
LightTavern 是一个基于角色卡的聊天应用，支持：
- 账号登录与会话维持（Supabase Auth）
- 角色管理、会话管理、消息持久化（Supabase Postgres）
- 角色封面图片上传（Supabase Storage）
- 通过服务端代理调用 OpenRouter / 火山引擎大模型
- 基础管理员能力（创建用户、启用/禁用用户）

## 2. 技术栈
- 前端与后端：Next.js App Router + React + TypeScript
- UI：Tailwind CSS
- 鉴权与数据库：Supabase (`auth.users` + `public.*`)
- 模型网关：OpenRouter API + 火山引擎 Responses API

## 3. 分层设计

### 3.1 表现层（Pages + Components）
- 页面位于 `app/*`
- 核心页面：
  - `/` 登录
  - `/dashboard` 角色列表
  - `/character/[id]` 聊天页（流式输出）
  - `/settings` 模型设置
  - `/admin` 管理后台

### 3.2 应用层（API Routes）
- 统一由 `app/api/*/route.ts` 实现业务接口
- 关键职责：
  - 请求参数校验
  - 用户状态校验（是否登录、是否禁用/删除）
  - 调用 Supabase / LLM Provider(OpenRouter 或火山引擎)
  - 统一返回 JSON 或流式文本

### 3.3 领域与基础设施层（lib）
- `lib/auth.ts`：获取当前用户与 profile，判断账号是否可用
- `lib/supabase/*`：Server/Browser/Admin 客户端与 middleware 会话更新
- `lib/openrouter.ts`：OpenRouter API 地址与请求头
- `lib/volcengine.ts`：火山引擎 API 地址与请求头
- `lib/llm.ts`：Provider 类型、默认值、文案映射
- `lib/promptStack.ts`：系统提示词 + 历史消息拼装
- `lib/storage.ts`：DataURL 图片上传到 Supabase Storage

## 4. 关键模块

### 4.1 鉴权与访问控制
- 登录接口：`POST /api/auth/login`
- 全局 middleware 保护页面：`/dashboard`、`/settings`、`/character/*`、`/admin/*`
- 账号状态由 `profiles.disabled_at/deleted_at` 控制
- 管理页额外要求 `profiles.role = 'admin'`

### 4.2 聊天链路
#### 初始化阶段（进入 `/character/[id]`）
1. 前端调用 `GET /api/cloud/chat-init?characterId=...`
2. 后端一次性完成：角色读取、会话获取/创建、消息加载、问候语修正
3. 返回聚合结果：`character + model + chat + messages`

#### 生成阶段（发送消息）
1. 前端提交 `characterId/chatId/userInput/provider/model/config` 到 `POST /api/chat`
2. 后端拉取角色信息与历史消息
3. 使用 `buildPromptStack` 生成标准 `messages`
4. 根据用户设置选择 OpenRouter 或火山引擎流式接口，边接收边回传文本
5. 火山引擎路径会将标准消息映射为 Responses `input_text` 格式
6. 流结束后写入两条消息（user + assistant）和 token usage
7. 更新会话 `updated_at`

### 4.5 模型设置策略
- OpenRouter：支持拉取模型列表后选择。
- 火山引擎：当前默认固定模型（如 `doubao-seed-2-0-pro-260215`）并保留测试连接与保存。
- `/api/models` 对火山模式支持 `VOLCENGINE_MODELS` 兜底，避免 `/models` 不可用导致设置页不可用。

### 4.3 数据持久化
- 角色：`public.characters`
- 会话：`public.conversations`
- 消息：`public.messages`
- 用户扩展信息：`public.profiles`
- 软删除字段：`deleted_at`

### 4.4 媒体资源
- 角色封面支持 DataURL 上传
- 由服务端使用 `service_role` 写入 Storage bucket（默认 `character-covers`）
- 数据库存储 `cover_image_url` 与 `cover_image_path`

## 5. 数据隔离与安全
- 业务表均启用 RLS，按 `auth.uid()` 限制访问
- 服务端仅在必要场景使用 Admin Client：
  - 用户管理
  - 角色封面上传
- Provider API Key 仅存在服务端环境变量

## 6. 目录建议
- `app/`: 页面与 API 路由
- `lib/`: 认证、DB 客户端、提示词构建、类型定义
- `supabase/schema.sql`: 数据库结构、触发器、RLS 策略
- `docs/`: 架构/数据流/API 文档
