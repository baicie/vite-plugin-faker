# Spec: Zeus Faker Studio 重构

## 目标

将 `@baicie/faker-ui` 从 Vue 后台式页面重构为基于 Zeus 与 Zeus UI 的开发者 Mock 工作台，并修复“捕获请求 -> 生成规则 -> 返回 Mock -> 观察响应”闭环中的行为缺陷。

核心用户是正在 Vite 或 Webpack 开发服务器中联调 API 的前端开发者。默认页面应优先回答三件事：刚才发生了什么请求、它是否被 Mock、怎样用最少步骤调整下一次响应。

## 产品形态

- 默认进入 `Traffic`，以 Network Inspector 形态提供请求列表和常驻详情面板，不再用居中弹窗查看详情。
- `Rules` 管理 Mock 规则，突出启停、方法、路径、响应类型和状态；创建与编辑使用聚焦式编辑面板。
- `Settings` 仅承载运行时策略与数据管理，不使用装饰性仪表盘卡片。
- 桌面端使用紧凑导航栏、列表工作区和详情区；窄屏改为横向导航和单列详情，不允许控件重叠。
- 明暗主题均使用中性工作台底色，以绿色表示健康或命中、红色表示失败、蓝色表示当前操作，不采用单一色相界面。
- 产品名称使用 `Faker Studio`，Zeus 作为框架与设计系统标识可见但不喧宾夺主。

## 技术栈与版本边界

- 应用框架：`@zeus-js/zeus@0.1.0-beta.8`
- Zeus UI：`@zeus-web/ui@0.1.0-beta.2`，以及同版本的 Button、Input、Tabs、Dialog、Select、Switch、Icons 原生 Web Components
- 构建：现有 Vite 7 与 TypeScript，使用 Zeus 官方 JSX runtime fallback
- 编辑器：继续使用 Monaco Editor
- 测试：Vitest + jsdom；浏览器验收使用本地 Chromium

源码继续按根 TypeScript `ES5` 目标和对应语法限制检查。`faker-ui` 浏览器产物明确以 ES2015 为最低目标：Zeus Web 使用原生 Custom Element class，二次降级为 ES5 函数继承会破坏浏览器构造语义；Rolldown 1 当前最低转换目标同样为 ES2015。该边界仅适用于内嵌开发工具 UI，并在 README 中公开说明，不通过未经验证的构建后处理伪造 ES5 兼容性。

当前发布的 `@zeus-js/vite-plugin@0.0.4` 要求 Node 22/24 与 Vite 8，而本仓库和 CI 支持 Node 20 + Vite 7。本次不升级整个 monorepo 工具链，待 Zeus 编译插件发布兼容版本后再启用 compiler-first 优化。运行时方案仍直接使用 Zeus 的 `render`、Signal、effect、cleanup 和 JSX runtime。

## 拦截与响应契约

1. Mock 响应只由 Vite/Webpack 服务端中间件生成；浏览器 Fetch/XHR 拦截器只观测最终请求与响应。
2. 普通规则按 HTTP method + pathname 匹配，查询串不应破坏基础规则命中；高级规则继续读取 query/header/body。
3. 服务端命中后通过 `X-Mock-Id` 与 `X-Mock-Source` 明确标记响应，客户端不得通过“存在相似规则”猜测命中。
4. Fetch 与 XHR 记录统一保存同源相对 URL、请求头、查询参数、请求体、真实状态码、响应头、响应体、耗时和命中标记。
5. XHR 观测不得覆盖业务 `onreadystatechange`，不得读取不兼容 `responseType` 的 `responseText`，每次 `send` 只记录一次。
6. UI 从流量创建规则时必须使用 pathname，确保创建后的下一次请求可实际命中。
7. Vite 与 Webpack 都应实时广播新增请求；RPC 错误按关联 ID 立即拒绝，不等待超时。
8. WebSocket 未连接时使用有界队列；关闭后停止重连与发送重试。

## 公共 API 与产物边界

- 保留 `fakerUI(target, wsUrl?) => Promise<void>` 的导出签名。
- 保留 `dist/index.js`、`dist/index.css` 及构建占位符替换契约。
- 保留 `route` 和 `button` 两种 UI 模式。
- 不改变 Mock 配置的六种响应类型和持久化格式。
- 不把 Node Mock 生成器复制到浏览器。

## 命令

```bash
pnpm install
pnpm --filter @baicie/faker-ui typecheck
pnpm --filter @baicie/faker-ui build
pnpm test --run
pnpm typecheck
pnpm lint
pnpm format-check
pnpm build
```

## 项目结构

- `packages/faker-ui/src/app/`：Zeus 工作台外壳与视图状态
- `packages/faker-ui/src/components/`：工作台组件和 Monaco 适配
- `packages/faker-ui/src/api/`：与框架无关的 WS RPC API
- `packages/faker-interceptor/src/`：Fetch/XHR 请求观测
- `packages/faker-core/src/`：匹配、响应生成和请求持久化
- `packages/vite-plugin-faker/src/`、`packages/webpack-plugin-faker/src/`：开发服务器接入与广播
- `packages/*/__tests__/`：单元和集成回归测试

## 代码风格

Zeus 状态使用显式 getter/setter；在 JSX runtime fallback 下，动态 children 和属性必须传入 getter，避免依赖编译期隐式转换。

```tsx
const [activeView, setActiveView] = createSignal<WorkspaceView>('traffic')

return (
  <main>
    {() =>
      activeView() === 'traffic' ? <TrafficWorkspace /> : <RulesWorkspace />
    }
  </main>
)
```

对象结构使用 `interface`；禁止新增 `any`、可选链、空值合并、对象展开和 `async/await`。现有待迁移代码中的同类语法应在触及范围内改为 Promise 链或显式判断。

## 测试策略

- 单元：URL 归一化、Mock 判定、请求/响应 body 解析、WS RPC 关联和错误处理。
- jsdom 组件：导航、搜索、选择详情、创建规则、设置保存、主题和按钮模式。
- 中间件集成：Vite/Webpack 查询串命中、响应 header/status/body、未命中请求体恢复。
- 浏览器验收：桌面和移动视口、明暗主题、空/加载/错误/长内容状态；控制台无错误。
- 完整门禁：测试、类型、lint、format、构建和发布产物校验全部通过。

## 边界

- 始终：保留 Vite 与 Webpack 一致行为；新增行为先有失败测试；错误状态必须可见且可恢复。
- 可直接决定：界面信息架构、局部组件拆分、在 Zeus UI 已发布组件中选型。
- 不做：升级根 Node/Vite 主版本、修改持久化 schema、复制 Mock 引擎到浏览器、提交密钥、删除失败测试。

## 验收标准

- `faker-ui` 生产代码和依赖中不再包含 Vue、Headless UI、Heroicons 或 Vue 构建插件。
- `faker-ui` 实际导入 Zeus 与 Zeus Web 包，并使用 Signal 驱动运行时状态。
- `faker-ui` 浏览器产物保持可运行的 ES2015 Custom Elements；源码仍通过根 ES5 TypeScript 配置和禁用语法审计。
- Traffic、Rules、Settings 以及 button mode 的关键工作流可操作，拥有空、加载、成功、错误状态。
- 从 Fetch/XHR 记录一键创建的 Mock 下一次请求可命中，查询参数不会破坏普通路径匹配。
- 禁用规则不会被标记为已命中；网络错误保留状态码 `0`；XHR 非文本响应不会影响业务回调。
- Vite/Webpack 的请求广播和错误响应行为一致，UI RPC 错误立即结束。
- 桌面 1440x900、1280x720 与移动 390x844 无重叠、溢出或不可达操作。
- 所有质量命令通过，构建产物继续满足现有发布校验。

## 已确认假设

- “Zeus UI”指本机相邻仓库 `zeus-ui` 发布的 `@zeus-web/*` 包。
- UI 文案统一为简洁英文，以匹配当前开发工具与 API 术语。
- 本次以稳定闭环和产品可用性优先，不以启用尚不兼容的 Zeus Vite 编译插件为完成条件。
