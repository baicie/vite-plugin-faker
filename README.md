# vite-plugin-faker

一个基于 Vite 的 Mock 插件，通过 UI 界面配置和管理接口 Mock，使用 Faker.js 生成逼真的测试数据，支持多种 Mock 类型和 WebSocket 实时通信。

## 功能

- 🔄 拦截 API 请求（Fetch / XHR）并返回模拟数据
- 🎭 使用 Faker.js 生成逼真的测试数据
- 🎨 通过友好的 UI 界面配置和管理 Mock
- ⚡ 与 Vite 开发服务器无缝集成
- 🔌 WebSocket 实时通信，UI 与 Node 端双向同步
- 💾 支持自定义存储路径，默认保存在项目根目录的 `.mock` 文件夹中
- 🧩 支持 6 种 Mock 类型：static、proxy、template、function、error、stateful

## 安装

```bash
npm install vite-plugin-faker --save-dev
# 或
yarn add vite-plugin-faker -D
# 或
pnpm add vite-plugin-faker -D
```

## 使用方法

在你的 Vite 配置文件中添加插件：

```js
// vite.config.js / vite.config.ts
import { defineConfig } from 'vite'
import { viteFaker } from 'vite-plugin-faker'

export default defineConfig({
  plugins: [
    viteFaker({
      mountTarget: '#mock-ui',
      storeDir: '.mock',
      uiOptions: {
        mode: 'route', // 'button' | 'route'
        wsPort: 3456,
      },
    }),
  ],
})
```

## Webpack 使用方法

```js
// webpack.config.js
const { webpackFaker } = require('webpack-plugin-faker')

module.exports = {
  plugins: [
    webpackFaker({
      mountTarget: '#mock-ui',
      storeDir: '.mock',
    }),
  ],
}
```

## 配置选项

| 选项名                  | 类型    | 默认值     | 说明                                       |
| ----------------------- | ------- | ---------- | ------------------------------------------ |
| `mountTarget`           | string  | `'#mock-ui'` | UI 面板挂载的目标元素选择器              |
| `storeDir`              | string  | `'.mock'`  | 存储配置的目录路径，相对于项目根目录       |
| `uiOptions.mode`        | string  | `'route'`  | UI 展示模式：`'button'`（悬浮按钮）或 `'route'`（独立路由） |
| `uiOptions.wsPort`      | number  | `3456`     | WebSocket 服务端口                         |
| `uiOptions.timeout`     | number  | `10000`    | 默认请求超时时间（毫秒）                   |
| `loggerOptions`         | object  | —          | 日志配置                                   |

## Mock 类型说明

### static — 静态响应

返回固定的 JSON 数据。

```json
{
  "url": "/api/user",
  "method": "GET",
  "type": "static",
  "enabled": true,
  "response": {
    "status": 200,
    "body": { "id": 1, "name": "Alice" }
  }
}
```

### template — Faker.js 模板

使用 Faker.js 动态生成数据，每次请求结果不同。

```json
{
  "url": "/api/user",
  "method": "GET",
  "type": "template",
  "enabled": true,
  "schema": {
    "name": { "module": "person", "method": "fullName" },
    "email": { "module": "internet", "method": "email" },
    "avatar": { "module": "image", "method": "avatar" }
  }
}
```

### proxy — 代理到真实 API

将请求转发到真实后端，可选修改响应。

```json
{
  "url": "/api/user",
  "method": "GET",
  "type": "proxy",
  "enabled": true,
  "target": "https://real-api.example.com/api/user",
  "rewriteHeaders": true,
  "timeout": 5000
}
```

### function — 自定义函数

通过 JS 函数动态生成响应，支持读取请求参数。

```json
{
  "url": "/api/user/:id",
  "method": "GET",
  "type": "function",
  "enabled": true
}
```

### error — 模拟错误

模拟 HTTP 错误响应，用于测试错误处理逻辑。

```json
{
  "url": "/api/user",
  "method": "POST",
  "type": "error",
  "enabled": true,
  "response": {
    "status": 500,
    "body": { "message": "Internal Server Error" }
  }
}
```

### stateful — 多状态轮换

每次请求返回不同状态，依次轮换，适合测试加载/成功/失败等状态。

```json
{
  "url": "/api/data",
  "method": "GET",
  "type": "stateful",
  "enabled": true,
  "states": [
    { "status": 200, "body": { "loading": true } },
    { "status": 200, "body": { "data": [1, 2, 3] } },
    { "status": 500, "body": { "error": "Server Error" } }
  ]
}
```

## 高级匹配规则

支持通配符、正则、前缀等多种 URL 匹配方式：

```json
{
  "url": "/api/users",
  "method": "GET",
  "type": "static",
  "enabled": true,
  "matchRule": {
    "url": {
      "pattern": "/api/users/*",
      "type": "wildcard"
    },
    "headers": [
      { "key": "x-env", "value": "test", "operator": "equals" }
    ]
  },
  "response": {
    "status": 200,
    "body": []
  }
}
```

`type` 支持：`exact`（精确）、`wildcard`（通配符）、`prefix`（前缀）、`regex`（正则）。

## UI 界面

启动后访问 `http://localhost:<port>/__faker-ui__/` 打开 Mock 管理界面，支持：

- Mock 列表查看、分组、标签过滤
- 在线编辑 Mock 配置（Monaco Editor）
- 请求历史记录查看
- 全局设置管理

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（所有包并行监听）
pnpm dev

# 构建所有包
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 生成覆盖率报告
pnpm test-coverage
```

## 许可证

MIT
