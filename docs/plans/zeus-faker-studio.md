# Implementation Plan: Zeus Faker Studio

## 架构决策

- 先修正请求与响应数据契约，再迁移 UI；界面只消费可信的命中信息。
- 使用 Zeus JSX runtime fallback 保持 Node 20 + Vite 7 兼容，Signal getter 显式包裹动态 DOM。
- 使用 `@zeus-web/ui` 的 styled button/input，并直接组合 Zeus Web 原生 primitives；表格与工作台布局由应用层实现。
- 保留 Monaco 和现有 Mock 编辑能力，但将“请求详情”从模态框改为工作区详情面板。

## Phase 1: 响应闭环

### Task 1: 统一 URL 匹配语义

- Acceptance: 普通规则忽略 query 匹配 pathname；高级 query/body 规则仍可用。
- Verify: faker-core、Vite 和 Webpack 中间件回归测试。
- Files: core URL helper、MocksDB、对应测试。

### Task 2: 修复 Fetch/XHR 观测

- Acceptance: 记录相对 URL、请求体、真实状态和显式 Mock header；XHR 每次发送只记录一次且不覆盖业务回调。
- Verify: Fetch 与新增 XHR jsdom 测试先失败后通过。
- Files: 两个 interceptor、共享 helper、测试。

### Task 3: 修复请求持久化与实时广播

- Acceptance: core 不再猜测 Mock 命中；Vite/webpack 均广播请求新增；Vite RPC 定向回复调用端。
- Verify: RequestHandler 与两类 WS server 测试。
- Files: request handler、Vite/webpack WS server、测试。

### Checkpoint: 响应闭环

- `pnpm test --run --project unit`
- `pnpm test --run --project unit-jsdom`
- `pnpm typecheck`

## Phase 2: Zeus 基础设施

### Task 4: 迁移构建与挂载入口

- Acceptance: 移除 Vue 依赖和插件，加入锁定的 Zeus/Zeus Web 版本；`fakerUI` 使用 Zeus `render` 挂载并可释放旧实例。
- Verify: 最小挂载测试、UI typecheck、build、verify-build。
- Files: package/lock、tsconfig、Vite/Vitest config、entry。

### Task 5: 建立 WS RPC 与应用状态

- Acceptance: 连接状态可订阅；请求 ERROR 立即拒绝；关闭连接后无无限重试；广播驱动 Traffic/Rules 刷新。
- Verify: WSClient 与 RPC 并发/错误/清理测试。
- Files: shared WSClient、UI API client、tests。

### Task 6: 建立 Zeus UI 适配层

- Acceptance: button/input/tabs/dialog/select/switch/icon 可在 Zeus JSX 中可靠使用；Monaco 生命周期可清理。
- Verify: jsdom 事件与属性测试、构建 tree-shaking 验证。
- Files: UI primitives adapter、Monaco adapter、styles、tests。

### Checkpoint: Zeus 基础设施

- `pnpm --filter @baicie/faker-ui typecheck`
- `pnpm --filter @baicie/faker-ui build`
- `pnpm test --run --project unit-jsdom`

## Phase 3: 产品工作流

### Task 7: Traffic Inspector

- Acceptance: 搜索/刷新/清空/分页/实时新增、行选择、请求与响应详情、从记录创建或编辑 Mock 均可操作。
- Verify: Traffic 组件测试与浏览器闭环。
- Files: traffic workspace、detail inspector、state/API tests。

### Task 8: Rules Workspace

- Acceptance: 搜索/分组/分页、启停、创建、编辑、删除、Swagger 导入均有清晰反馈。
- Verify: Rules 组件测试与 CRUD 集成。
- Files: rules workspace、mock editor、import dialog、tests。

### Task 9: Settings 与壳层

- Acceptance: route/button mode、导航、主题、连接状态、设置保存、导入导出和清理历史完整工作。
- Verify: shell/settings/button mode tests。
- Files: app shell、settings、button mode、tests。

### Checkpoint: 产品工作流

- `pnpm test --run`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format-check`

## Phase 4: 运行时与视觉验收

### Task 10: 浏览器闭环与响应式 QA

- Acceptance: 创建规则后 Fetch/XHR 命中并在 Traffic 中实时出现；三种视口和明暗主题无布局问题；控制台无错误。
- Verify: 本地 playground + Chromium 截图、DOM、console、network 检查。
- Files: 必要的 E2E fixture/test 与局部修正。

### Task 11: 发布质量门禁

- Acceptance: 全仓测试、typecheck、lint、format、build、产物验证全部通过；无 Vue 残留。
- Verify: 根命令与 `rg` 审计。
- Files: 仅修复门禁发现的本次相关问题。

## 风险与缓解

| 风险                              | 影响           | 缓解                                              |
| --------------------------------- | -------------- | ------------------------------------------------- |
| Zeus Vite 插件与当前 CI 不兼容    | 无法安装或构建 | 使用官方 JSX runtime fallback 并锁定兼容版本      |
| Zeus UI 聚合包组件较少            | 控件视觉不一致 | styled button/input + primitives + 统一应用 token |
| 原生 Custom Elements 无法降级 ES5 | UI 运行时损坏  | 源码保留 ES5 约束，浏览器产物明确以 ES2015 为下限 |
| Vue 迁移面较大                    | 回归风险高     | 以用户工作流纵向切片，每片独立测试                |
| Vite HMR WS 与标准 WebSocket 差异 | 实时行为分叉   | 公共 RPC 契约测试，两种 transport 分别覆盖        |
| Monaco 体积与异步生命周期         | 空白或泄漏     | 保留 loader 懒加载，组件 cleanup 销毁 editor      |
