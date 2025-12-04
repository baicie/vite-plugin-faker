# 系统架构文档

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Vite Plugin (Node.js)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WSServer (Reactive/Emitter)                          │  │
│  │  - WebSocket 服务器                                    │  │
│  │  - 事件分发中心                                        │  │
│  └──────────────┬──────────────────────┬─────────────────┘  │
│                 │                      │                     │
│                 │ WebSocket            │ WebSocket           │
│                 │ (双向通信)           │ (双向通信)           │
│                 │                      │                     │
└─────────────────┼──────────────────────┼─────────────────────┘
                  │                      │
                  │ 1. 请求记录          │ 3. Mock 配置更新
                  │ 4. Mock 配置推送      │ 2. 配置变更通知
                  │                      │
      ┌───────────▼──────────┐  ┌───────▼──────────┐
      │   Hack (拦截器)       │  │   UI (界面)       │
      │   faker-interceptor   │  │   faker-ui       │
      │                       │  │                  │
      │ - XHR/Fetch 拦截      │  │ - Mock 列表      │
      │ - Faker 生成响应      │  │ - 请求历史       │
      │ - 请求记录上报        │  │ - 配置编辑       │
      └───────────────────────┘  └──────────────────┘
```

## 组件说明

### 1. Hack (拦截器) - `faker-interceptor`

**职责：**

- 拦截浏览器端的 XHR 和 Fetch 请求
- 使用 Faker.js 生成 Mock 响应
- 记录请求信息并上报到服务器

**核心模块：**

- `fetch-interceptor.ts` - Fetch API 拦截
- `xhr-interceptor.ts` - XMLHttpRequest 拦截
- `faker-generator.ts` - Faker 数据生成器
- `mock-matcher.ts` - Mock 规则匹配
- `ws-client.ts` - WebSocket 客户端

**通信流程：**

1. 拦截请求 → 匹配 Mock 规则 → 生成响应
2. 发送 `request-recorded` 消息到服务器
3. 接收 `mock-config-updated` 更新 Mock 配置

### 2. UI (界面) - `faker-ui`

**职责：**

- 显示 API 请求列表
- Mock 配置管理（创建/编辑/删除）
- 设置面板

**核心模块：**

- `components/mock-list.tsx` - Mock 列表
- `components/request-list.tsx` - 请求历史
- `components/mock-editor.tsx` - Mock 编辑器
- `composables/useWebSocket.ts` - WebSocket 通信
- `composables/useMock.ts` - Mock 管理

**通信流程：**

1. 发送 `mock-create/update/delete` 创建/更新/删除 Mock
2. 发送 `mock-list` 获取 Mock 列表
3. 发送 `request-history` 获取请求历史
4. 接收 `mock-config-updated` 更新 UI

### 3. Node (服务器) - `vite-plugin-faker`

**职责：**

- 注入拦截器和 UI 脚本到页面
- 提供 DB API 缓存
- 存储 Mock 配置到 `.mock` 目录
- 监听文件变化并广播
- WebSocket 服务器

**核心模块：**

- `ws-server.ts` - WebSocket 服务器（事件中心）
- `db/` - 数据库管理（LowDB）
- `api/handlers/` - API 处理器
- `index.ts` - Vite 插件入口

**通信流程：**

1. 接收 `request-recorded` → 保存到 DB → 可选广播
2. 接收 `mock-create/update/delete` → 保存到 DB → 广播更新
3. 接收 `mock-list/request-history` → 从 DB 读取 → 返回数据
4. 文件变化 → 读取 DB → 广播 `mock-config-updated`

### 4. Reactive/Emitter (事件中心) - `WSServer`

**职责：**

- WebSocket 连接管理
- 消息路由和分发
- 事件广播

**通信协议：**

```
客户端 → 服务器：
- request-recorded: 请求记录
- mock-create: 创建 Mock
- mock-update: 更新 Mock
- mock-delete: 删除 Mock
- mock-list: 获取 Mock 列表
- request-history: 获取请求历史
- settings-get: 获取设置
- settings-update: 更新设置

服务器 → 客户端：
- mock-config-updated: Mock 配置更新（广播）
- response: 请求响应
```

## 数据流

### 请求拦截流程（流程 1）

```
1. 浏览器发起请求
   ↓
2. Hack 拦截 (fetch/xhr)
   ↓
3. 匹配 Mock 规则
   ↓
4. 生成 Mock 响应 (Faker)
   ↓
5. 返回响应给应用
   ↓
6. Hack 发送 request-recorded → WSServer (流程 1)
   ↓
7. WSServer 保存到 DB
   ↓
8. (可选) WSServer 广播新请求 → UI (流程 2)
```

### Mock 配置更新流程（流程 3 → 4）

```
1. UI 编辑 Mock 配置
   ↓
2. UI 发送 mock-create/update/delete → WSServer (流程 3)
   ↓
3. WSServer 保存到 DB (.mock 目录)
   ↓
4. WSServer 响应 UI (流程 2)
   ↓
5. WSServer 广播 mock-config-updated (流程 4)
   ↓
6. Hack 接收更新 → 更新本地 Mock 规则
   ↓
7. UI 接收更新 → 刷新列表
```

### 完整通信流程

根据架构图，系统包含 4 个主要流程：

**流程 1：Hack → Node (请求记录)**

- Hack 拦截请求后，通过 `WSClient.sendRequestRecord()` 发送 `request-recorded` 消息
- WSServer 接收消息，保存到数据库

**流程 2：Node → UI (响应请求)**

- UI 发送查询请求（如 `mock-list`、`request-history`）
- WSServer 处理请求，通过 `sendToClient()` 发送响应

**流程 3：UI → Node (配置变更)**

- UI 创建/更新/删除 Mock 配置
- 通过 `useWebSocket.send()` 发送 `mock-create/update/delete` 消息
- WSServer 处理并保存到数据库

**流程 4：Node → Hack (配置推送)**

- Mock 配置变更后，WSServer 通过 `broadcast()` 广播 `mock-config-updated`
- Hack 和 UI 都接收更新，同步本地状态

## 技术栈

- **构建工具**: Rolldown, TypeScript
- **UI 框架**: Vue 3 + Naive UI
- **编辑器**: Monaco Editor
- **数据库**: LowDB (JSON 文件)
- **通信**: WebSocket (基于 Vite HMR)
- **数据生成**: Faker.js

## 文件结构

```
packages/
├── faker-interceptor/     # Hack - 浏览器端拦截器
│   ├── src/
│   │   ├── fetch-interceptor.ts
│   │   ├── xhr-interceptor.ts
│   │   ├── faker-generator.ts
│   │   ├── mock-matcher.ts
│   │   └── ws-client.ts
│
├── faker-ui/              # UI - 管理界面
│   ├── src/
│   │   ├── components/
│   │   ├── composables/
│   │   └── api/
│
├── vite-plugin-faker/     # Node - Vite 插件
│   ├── src/
│   │   ├── ws-server.ts   # Reactive/Emitter
│   │   ├── db/            # 数据库管理
│   │   └── api/           # API 处理器
│
└── shared/                # 共享工具
    └── src/
        └── utils.ts
```
