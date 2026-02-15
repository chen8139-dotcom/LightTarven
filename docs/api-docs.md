# LightTavern API Docs

Base URL: `/api`

说明：除登录相关接口外，大多数接口都要求已登录且账号处于 active（未禁用、未软删除）。

## 1. Auth

### POST `/api/auth/login`
- 作用：账号密码登录
- 请求体：
```json
{ "email": "user@example.com", "password": "your-password" }
```
- 成功响应：
```json
{ "ok": true, "user": { "id": "uuid", "email": "user@example.com" }, "profile": { "role": "user" } }
```
- 常见错误：
  - `400` 缺少账号或密码
  - `401` 账号或密码错误
  - `403` 账号被禁用/软删除

### POST `/api/auth/logout`
- 作用：退出登录
- 成功响应：`{ "ok": true }`

### GET `/api/auth/session`
- 作用：查询当前会话状态
- 成功响应（已登录）：
```json
{
  "authenticated": true,
  "user": { "id": "uuid", "email": "user@example.com" },
  "profile": { "role": "user", "modelPreference": "openai/gpt-4o-mini" }
}
```
- 未登录响应：`{ "authenticated": false }`

## 2. Characters

### GET `/api/cloud/characters`
- 作用：获取当前用户角色列表
- 特性：首次为空时自动写入 3 个默认角色
- 响应：
```json
{ "characters": [ { "id": "uuid", "name": "角色名", "persona": "..." } ] }
```

### POST `/api/cloud/characters`
- 作用：创建角色
- 请求体：`CanonicalCharacterCard`（至少需要 `name`）
- 支持：`coverImageDataUrl` 为 `data:image/*;base64,...` 时自动上传 Storage
- 响应：`{ "character": { ... } }`

### GET `/api/cloud/characters/:id`
- 作用：获取单个角色
- 响应：`{ "character": { ... } }`

### PATCH `/api/cloud/characters/:id`
- 作用：更新角色
- 请求体：`CanonicalCharacterCard`（至少需要 `name`）
- 响应：`{ "character": { ... } }`

### DELETE `/api/cloud/characters/:id`
- 作用：软删除角色（设置 `deleted_at`）
- 响应：`{ "ok": true }`

## 3. Chats

### GET `/api/cloud/chat-init?characterId=<id>`
- 作用：聊天页初始化聚合接口（角色 + 当前模型 + 会话 + 消息）
- 行为：
  - 读取角色，不存在返回 `404`
  - 拉取该角色最近会话，不存在则自动创建默认会话
  - 读取会话消息，并按角色 greeting 自动初始化或修正首条 assistant 消息
- 响应：
```json
{
  "character": { "id": "uuid", "name": "角色名", "persona": "..." },
  "model": "openai/gpt-4o-mini",
  "chat": {
    "id": "uuid",
    "characterId": "uuid",
    "title": "默认会话",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "messages": [
    { "role": "assistant", "content": "你好", "timestamp": 1730000000000 }
  ]
}
```

### GET `/api/cloud/chats?characterId=<id>`
- 作用：列出会话，可按角色过滤
- 响应：
```json
{
  "chats": [
    { "id": "uuid", "characterId": "uuid", "title": "新会话", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### POST `/api/cloud/chats`
- 作用：创建会话
- 请求体：
```json
{ "characterId": "uuid", "title": "默认会话" }
```
- 响应：`{ "chat": { ... } }`

### GET `/api/cloud/chats/:id/messages`
- 作用：获取会话消息
- 响应：
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "assistant",
      "content": "...",
      "timestamp": 1730000000000,
      "tokenUsage": { "promptTokens": 10, "completionTokens": 20, "totalTokens": 30 }
    }
  ]
}
```

### POST `/api/cloud/chats/:id/messages`
- 作用：手动写入一条消息（常用于问候语初始化）
- 请求体：
```json
{ "role": "assistant", "content": "你好" }
```
- 响应：`{ "ok": true }`

### DELETE `/api/cloud/chats/:id/messages`
- 作用：清空该会话消息
- 响应：`{ "ok": true }`

## 4. Chat Completion

### POST `/api/chat`
- 作用：执行一次聊天生成（流式返回）
- 请求体：
```json
{
  "characterId": "uuid",
  "chatId": "uuid",
  "userInput": "你好",
  "model": "openai/gpt-4o-mini",
  "config": { "maxHistory": 12, "includeExamples": true }
}
```
- 响应类型：`text/plain`（stream）
- 约定：流末尾可能附带 token usage 标记
  - marker: `[[LT_TOKEN_USAGE]]`
  - 后接 JSON：`{"promptTokens":...,"completionTokens":...,"totalTokens":...}`
- 失败状态：
  - `400` 参数不完整
  - `404` 会话或角色不存在
  - `502` 上游模型调用失败

## 5. Settings & Model Discovery

### GET `/api/cloud/settings`
- 作用：读取当前用户模型偏好
- 响应：`{ "settings": { "model": "openai/gpt-4o-mini" } }`

### PATCH `/api/cloud/settings`
- 作用：更新模型偏好
- 请求体：`{ "model": "xxx/yyy" }`
- 响应：`{ "settings": { "model": "xxx/yyy" } }`

### POST `/api/models`
- 作用：从 OpenRouter 拉取模型列表（服务端使用环境变量 API Key）
- 响应：`{ "models": ["model-a", "model-b"] }`

### POST `/api/test-key`
- 作用：测试模型连通性
- 请求体：`{ "model": "openai/gpt-4o-mini" }`
- 成功响应：`{ "ok": true }`

## 6. Admin APIs

前置条件：必须是 `admin` 角色。

### POST `/api/admin/users`
- 作用：创建新用户
- 请求体：
```json
{ "email": "new@example.com", "password": "at-least-8-chars" }
```
- 响应：
```json
{ "ok": true, "user": { "id": "uuid", "email": "new@example.com", "role": "user" } }
```

### PATCH `/api/admin/users/:id/status`
- 作用：启用或禁用用户
- 请求体：
```json
{ "action": "disable" }
```
或
```json
{ "action": "enable" }
```
- 响应：`{ "ok": true }`
- 限制：不可修改当前管理员自己的状态

## 7. 主要数据结构

### CanonicalCharacterCard（核心字段）
```json
{
  "id": "uuid",
  "name": "角色名",
  "persona": "人设",
  "description": "可选",
  "greeting": "可选",
  "first_mes": "可选",
  "scenario": "可选",
  "style": "可选",
  "rules": "可选",
  "coverImageDataUrl": "可选",
  "metadata": { "origin": "system-seed", "version": "v1" }
}
```

### ChatMessage
```json
{
  "role": "user",
  "content": "消息内容",
  "timestamp": 1730000000000,
  "tokenUsage": {
    "promptTokens": 0,
    "completionTokens": 0,
    "totalTokens": 0
  }
}
```
