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
npm install @baicie/vite-plugin-faker --save-dev
# 或
yarn add @baicie/vite-plugin-faker -D
# 或
pnpm add @baicie/vite-plugin-faker -D
```

## 使用方法

在你的 Vite 配置文件中添加插件：

```js
// vite.config.js / vite.config.ts
import { defineConfig } from 'vite'
import { viteFaker } from '@baicie/vite-plugin-faker'

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
const { webpackFaker } = require('@baicie/webpack-plugin-faker')

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

| 选项名                       | 类型    | 默认值       | 说明                                                        |
| ---------------------------- | ------- | ------------ | ----------------------------------------------------------- |
| `mountTarget`                | string  | `'#mock-ui'` | UI 面板挂载的目标元素选择器                                 |
| `storeDir`                   | string  | `'.mock'`    | 存储配置的目录路径，相对于项目根目录                        |
| `uiOptions.mode`             | string  | `'route'`    | UI 展示模式：`'button'`（悬浮按钮）或 `'route'`（独立路由） |
| `uiOptions.wsPort`           | number  | `3456`       | WebSocket 服务端口                                          |
| `uiOptions.timeout`          | number  | `10000`      | 默认请求超时时间（毫秒）                                    |
| `allowFunctionHandlerSource` | boolean | `false`      | 是否执行持久化的 function mock 源码                         |
| `functionHandlerTimeout`     | number  | `1000`       | 持久化 function handler 的最长执行时间（毫秒）              |
| `loggerOptions`              | object  | —            | 日志配置                                                    |

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
  "url": "/api/user",
  "method": "POST",
  "type": "function",
  "enabled": true,
  "handlerSource": "function handler(ctx) { return { status: 200, body: { id: ctx.body.id } }; }"
}
```

`handlerSource` 会随 Mock 配置持久化。执行前必须在插件选项中显式设置 `allowFunctionHandlerSource: true`；默认关闭。持久化 handler 只能读取 JSON 可序列化的 `url`、`method`、`headers`、`query` 和 `body`，不能访问底层 Node.js 请求对象。

源码执行设有超时和受限上下文，但 `node:vm` 不是安全沙箱。只应在本地开发环境运行可信项目中的配置，不要导入不可信的 handler 源码。使用独立 WebSocket 端口时，服务只监听 `127.0.0.1`。

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
    "headers": [{ "key": "x-env", "value": "test", "operator": "equals" }]
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

# 运行单元测试和覆盖率
pnpm test
pnpm test-coverage

# 运行浏览器扩展 E2E 测试
pnpm test-e2e

# 使用官方 npm registry 审计依赖
pnpm audit:dependencies
```

## 发布流程

本仓库使用 Changesets 管理六个公共包的独立版本和内部依赖联动。

1. 功能或修复 PR 在提交前运行 `pnpm changeset`，选择受影响的包并填写变更说明。
2. PR 合并到 `main` 后，Changesets 会创建或更新版本 PR。
3. 版本 PR 合并后，CI 会构建、校验并发布尚未发布的包。

启用自动发布前，维护者必须完成以下仓库配置：

- 在 GitHub Actions secrets 中配置 `NPM_TOKEN`。令牌必须具备 `@baicie` scope 的发布权限，并满足 npm 的双因素认证策略。
- 保持 Actions 默认权限为只读，并允许 GitHub Actions 创建 Pull Request；发布 job 已按需声明写权限，否则 Changesets 无法创建版本 PR。
- 保护 `main` 分支，并将 CI 的 `Quality` job 设置为合并前必需检查，禁止绕过 Pull Request 直接推送。
- 本地执行 `pnpm version-packages` 时设置可读取仓库信息的 `GITHUB_TOKEN`，供 `@changesets/changelog-github` 生成 changelog。CI 会自动提供该 token。

本仓库已提交覆盖六个公共包的 bootstrap changeset。首次合并到 `main` 应先创建版本 PR，而不是直接发布当前 manifest 中的未发布版本。npm 版本不可覆盖；若发布后发现问题，应弃用有问题的版本并发布修复版本。

维护者可在本地运行以下命令：

```bash
# 校验六个发布包的清单、依赖关系和 tarball 内容
pnpm release:check

# 从真实 tarball 安装并验证 ESM、CJS 和 TypeScript 消费入口
pnpm release:smoke

# 消费 changeset 并更新包版本、CHANGELOG 和锁文件
GITHUB_TOKEN=<token> pnpm version-packages

# 构建、校验并复用已验证的构建产物发布尚未发布的版本
pnpm release
```

`pnpm release` 会在发布阶段禁用各包的生命周期脚本，避免 Changesets 并发发布时重复清理和构建共享产物。直接从包目录运行 `pnpm publish` 时，`prepublishOnly` 仍会执行构建。

## 许可证

MIT
