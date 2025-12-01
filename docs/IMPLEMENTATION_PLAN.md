# Faker 插件实现方案

## 一、整体架构

```
┌─────────────────────────────────────────────────────────┐
│              浏览器端 (Browser)                          │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │  拦截脚本         │  │  UI 应用          │          │
│  │  (Interceptor)   │  │  (Vue 3)         │          │
│  │                  │  │                  │          │
│  │  - Hack fetch    │  │  - Mock 管理     │          │
│  │  - Hack XHR      │  │  - 编辑器         │          │
│  │  - Faker.js      │  │  - 请求记录      │          │
│  │  - 生成响应      │  │                  │          │
│  └──────────────────┘  └──────────────────┘          │
│           ↕ WebSocket          ↕ WebSocket           │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Node.js 端 (Vite Plugin)                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  WebSocket 服务器                                  │ │
│  │  - 配置同步                                        │ │
│  │  - 请求记录接收                                    │ │
│  │  - UI 通信                                        │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │  JSON DB 管理器                                   │ │
│  │  - Mock 配置存储                                  │ │
│  │  - 请求记录存储                                   │ │
│  │  - 设置存储                                       │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 二、模块划分

### 1. 拦截模块 (`@faker/interceptor`)

**职责：**

- 在页面加载前注入，hack fetch/XHR
- 使用 Faker.js 生成 Mock 数据
- 通过 WebSocket 发送请求记录到 Node 端

**技术实现：**

- 纯 JavaScript，无依赖（除了 Faker.js）
- 通过 `<script>` 标签注入到 `<head>` 最前面
- 使用 `injectTo: 'head-prepend'` 确保最早执行

**文件结构：**

```
packages/faker-interceptor/
├── src/
│   ├── index.ts              # 入口，初始化拦截器
│   ├── fetch-interceptor.ts  # fetch 拦截
│   ├── xhr-interceptor.ts    # XHR 拦截
│   ├── faker-generator.ts    # Faker.js 数据生成（浏览器端）
│   ├── mock-matcher.ts       # Mock 配置匹配
│   └── ws-client.ts          # WebSocket 客户端
├── package.json
└── rolldown.config.ts
```

### 2. UI 模块 (`@faker/ui`)

**职责：**

- 提供可视化界面
- 通过 WebSocket 与 Node 端通信
- 支持多种编辑器模式

**技术实现：**

- Vue 3 + Naive UI
- Monaco Editor（代码编辑）
- JSON Editor（JSON 编辑）
- 可视化表单编辑器（字段类型选择）

**文件结构：**

```
packages/faker-ui/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── mock-list.tsx
│   │   ├── mock-editor/
│   │   │   ├── index.tsx
│   │   │   ├── code-editor.tsx      # Monaco Editor
│   │   │   ├── json-editor.tsx     # JSON Editor
│   │   │   └── visual-editor.tsx    # 可视化编辑器
│   │   ├── request-list.tsx
│   │   └── settings-panel.tsx
│   ├── composables/
│   │   ├── useWebSocket.ts
│   │   └── useMock.ts
│   └── api/
│       └── ws-client.ts
├── package.json
└── rolldown.config.ts
```

### 3. 核心插件 (`vite-plugin-faker`)

**职责：**

- 注入拦截脚本和 UI
- 提供 WebSocket 服务器
- 管理 JSON DB
- 处理配置同步

**技术实现：**

- Vite Plugin API
- WebSocket Server（基于 Vite HMR WebSocket）
- LowDB（JSON 文件存储）

**文件结构：**

```
packages/vite-plugin-faker/
├── src/
│   ├── index.ts              # 插件入口
│   ├── ws-server.ts          # WebSocket 服务器
│   ├── db/
│   │   ├── index.ts          # DB 管理器
│   │   ├── mock-db.ts       # Mock 配置存储
│   │   ├── request-db.ts    # 请求记录存储
│   │   └── settings-db.ts   # 设置存储
│   └── virtual-modules.ts    # 虚拟模块（配置同步）
├── package.json
└── rolldown.config.ts
```

## 三、数据流设计

### 1. Mock 配置同步

```
UI 编辑 Mock 配置
  ↓
WebSocket 发送到 Node 端
  ↓
Node 端保存到 JSON DB
  ↓
WebSocket 广播给所有客户端
  ↓
拦截脚本更新本地配置缓存
```

### 2. 请求拦截流程

```
用户发起请求 (fetch/XHR)
  ↓
拦截脚本拦截
  ↓
查找匹配的 Mock 配置（本地缓存）
  ↓
如果有 Mock：
  ├─ static: 直接返回数据
  ├─ faker: 使用 Faker.js 生成数据
  └─ function: 执行函数（可访问 faker）
  ↓
返回 Mock 响应
  ↓
通过 WebSocket 发送请求记录到 Node 端
  ↓
Node 端保存到 JSON DB
```

### 3. 请求记录查看

```
拦截脚本记录请求
  ↓
WebSocket 发送到 Node 端
  ↓
Node 端保存到 JSON DB
  ↓
UI 通过 WebSocket 请求历史记录
  ↓
Node 端从 JSON DB 读取并返回
```

## 四、JSON DB 设计

### 文件结构

```
.mock/
├── mocks.json          # Mock 配置
├── requests.json       # 请求记录
├── settings.json       # 设置
└── .gitignore          # 可选：忽略某些文件
```

### Mock 配置格式 (`mocks.json`)

```json
{
  "mocks": {
    "mock-1": {
      "id": "mock-1",
      "name": "用户列表",
      "url": "/api/users",
      "method": "GET",
      "enabled": true,
      "statusCode": 200,
      "delay": 0,
      "headers": {
        "Content-Type": "application/json"
      },
      "responseType": "faker",
      "responseTemplate": "{\"users\": [{\"id\": {{faker.number.int}},\"name\": {{faker.person.firstName}}}]}",
      "responseCode": null,
      "responseData": null,
      "description": "获取用户列表",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "meta": {
    "version": "1.0.0",
    "lastModified": "2024-01-01T00:00:00.000Z"
  }
}
```

### 请求记录格式 (`requests.json`)

```json
{
  "requests": {
    "req-1": {
      "id": "req-1",
      "url": "/api/users",
      "method": "GET",
      "headers": {},
      "query": {},
      "body": null,
      "response": {
        "statusCode": 200,
        "headers": {},
        "body": {}
      },
      "duration": 10,
      "isMocked": true,
      "mockId": "mock-1",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  },
  "meta": {
    "version": "1.0.0",
    "lastModified": "2024-01-01T00:00:00.000Z"
  }
}
```

### 设计原则

1. **可读性**：JSON 格式，易于阅读和编辑
2. **版本控制**：包含 meta 信息，便于版本管理
3. **可扩展**：使用对象结构，便于添加新字段
4. **性能**：使用索引优化查询（可选）

## 五、编辑器设计

### 1. 代码编辑器（Monaco Editor）

**功能：**

- 支持 JavaScript 语法高亮
- 自动补全 Faker.js API
- 错误提示

**使用场景：**

- 自定义函数类型 Mock
- 复杂的数据生成逻辑

**示例：**

```javascript
return {
  id: faker.number.int(),
  name: faker.person.firstName(),
  email: faker.internet.email(),
  avatar: faker.image.avatar(),
  createdAt: faker.date.past(),
}
```

### 2. JSON 编辑器

**功能：**

- JSON 格式验证
- 语法高亮
- 格式化

**使用场景：**

- 静态数据 Mock
- Faker 模板（JSON 格式）

**示例：**

```json
{
  "users": [
    {
      "id": "{{faker.number.int}}",
      "name": "{{faker.person.firstName}}"
    }
  ]
}
```

### 3. 可视化编辑器

**功能：**

- 字段列表形式
- 选择字段类型（文本、数字、日期、对象、数组等）
- 对于 Faker 类型，选择 Faker 方法
- 拖拽排序

**使用场景：**

- 快速创建 Mock
- 不熟悉代码的用户

**界面设计：**

```
字段列表：
┌─────────────────────────────────────┐
│ + 添加字段                           │
├─────────────────────────────────────┤
│ [x] id                              │
│     类型: 数字                      │
│     Faker: number.int()            │
│     [删除]                          │
├─────────────────────────────────────┤
│ [x] name                            │
│     类型: 文本                      │
│     Faker: person.firstName()      │
│     [删除]                          │
├─────────────────────────────────────┤
│ [x] users (数组)                    │
│     数量: 10                        │
│     └─ [x] id                       │
│        类型: 数字                   │
│        Faker: number.int()        │
│     [删除]                          │
└─────────────────────────────────────┘
```

## 六、WebSocket 协议设计

### 消息类型

```typescript
// 客户端 → 服务端
interface ClientMessage {
  type:
    | 'mock-create'
    | 'mock-update'
    | 'mock-delete'
    | 'request-history'
    | 'settings-update'
  data: any
  id?: string // 请求 ID，用于响应匹配
}

// 服务端 → 客户端
interface ServerMessage {
  type:
    | 'mock-config-updated'
    | 'request-recorded'
    | 'request-history'
    | 'settings-updated'
    | 'error'
  data: any
  id?: string // 对应请求 ID
}
```

### 消息示例

```typescript
// 1. Mock 配置更新
{
  type: 'mock-config-updated',
  data: {
    mocks: [...]
  }
}

// 2. 请求记录
{
  type: 'request-recorded',
  data: {
    id: 'req-1',
    url: '/api/users',
    method: 'GET',
    // ...
  }
}

// 3. 获取请求历史
// 客户端发送
{
  type: 'request-history',
  id: 'req-1',
  data: {
    page: 1,
    pageSize: 20
  }
}
// 服务端响应
{
  type: 'request-history',
  id: 'req-1',
  data: {
    requests: [...],
    total: 100
  }
}
```

## 七、实现步骤

### Phase 1: 核心拦截功能

1. 创建拦截模块
2. 实现 fetch/XHR 拦截
3. 集成 Faker.js（浏览器端）
4. 实现 Mock 匹配和响应生成

### Phase 2: Node 端服务

1. 实现 WebSocket 服务器
2. 实现 JSON DB 管理器
3. 实现配置同步机制

### Phase 3: UI 基础功能

1. 实现 WebSocket 客户端
2. 实现 Mock 列表和基本 CRUD
3. 实现请求记录查看

### Phase 4: 编辑器

1. 实现代码编辑器（Monaco）
2. 实现 JSON 编辑器
3. 实现可视化编辑器

### Phase 5: 优化和测试

1. 性能优化
2. 错误处理
3. 测试覆盖

## 八、技术选型

### 浏览器端

- **拦截脚本**：原生 JavaScript（ES5 兼容）
- **Faker.js**：`@faker-js/faker`（浏览器版本）
- **WebSocket**：原生 `WebSocket` API

### UI

- **框架**：Vue 3 (Composition API)
- **UI 库**：Naive UI
- **代码编辑器**：Monaco Editor
- **JSON 编辑器**：自定义或使用轻量级库

### Node 端

- **WebSocket**：基于 Vite HMR WebSocket
- **存储**：LowDB（JSON 文件）
- **文件系统**：Node.js `fs` 模块

## 九、关键实现细节

### 1. 拦截脚本注入时机

```typescript
// 在 transformIndexHtml 中使用 head-prepend
transformIndexHtml(html) {
  return [
    {
      tag: 'script',
      attrs: { type: 'module' },
      children: interceptorCode,
      injectTo: 'head-prepend',  // 最前面
    }
  ]
}
```

### 2. Faker.js 浏览器端使用

```typescript
// 方式1：通过 CDN（简单但需要网络）
import { faker } from 'https://cdn.jsdelivr.net/npm/@faker-js/faker@latest/dist/faker.min.js'

// 方式2：打包到拦截脚本中（推荐）
// 在构建时将 Faker.js 打包进拦截脚本
```

### 3. WebSocket 连接管理

```typescript
// 拦截脚本和 UI 共享同一个 WebSocket 连接
// 通过消息类型区分不同的功能
class WSManager {
  private ws: WebSocket
  private handlers: Map<string, Function[]>

  send(type: string, data: any) {
    this.ws.send(JSON.stringify({ type, data }))
  }

  on(type: string, handler: Function) {
    // 注册消息处理器
  }
}
```

### 4. JSON DB 文件格式优化

```typescript
// 使用索引优化查询
{
  "mocks": {
    "by-id": {
      "mock-1": {...},
      "mock-2": {...}
    },
    "by-url": {
      "/api/users": ["mock-1"],
      "/api/products": ["mock-2"]
    }
  }
}
```

## 十、潜在问题和解决方案

### 1. Faker.js 体积问题

**问题**：Faker.js 体积较大（~500KB）
**解决**：

- 使用 Tree-shaking，只打包需要的模块
- 或者使用 CDN，按需加载

### 2. WebSocket 连接稳定性

**问题**：网络不稳定时连接断开
**解决**：

- 实现自动重连机制
- 降级到轮询方案

### 3. JSON DB 性能

**问题**：大量请求记录时性能下降
**解决**：

- 限制请求记录数量（如最近 1000 条）
- 使用索引优化查询
- 定期清理旧记录

### 4. 拦截脚本兼容性

**问题**：不同浏览器的兼容性
**解决**：

- 使用 ES5 语法
- 提供 Polyfill（如需要）

## 十一、总结

这个方案的核心特点：

1. **简单**：无需额外的 API 服务，只使用 WebSocket
2. **高效**：浏览器端直接生成 Mock，无网络延迟
3. **灵活**：支持多种编辑器模式
4. **友好**：JSON DB 可直接编辑，便于版本控制

请确认这个方案是否符合你的需求，确认后开始实现。
