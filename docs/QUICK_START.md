# 快速开始指南

## 实现完成情况

✅ **核心功能已实现**

1. **浏览器端拦截**：通过注入脚本 hack fetch/XHR
2. **Faker.js 集成**：在浏览器端直接生成 Mock 数据
3. **WebSocket 通信**：使用 Vite HMR WebSocket 进行配置同步
4. **JSON DB 存储**：使用 LowDB 管理配置和请求记录
5. **UI 界面**：完整的可视化界面，支持多种编辑器

## 使用步骤

### 1. 构建依赖包

```bash
# 构建拦截器（必须）
cd packages/faker-interceptor
pnpm build

# 构建 UI（可选，如果需要 UI）
cd packages/faker-ui
pnpm build

# 构建插件
cd packages/vite-plugin-faker
pnpm build
```

### 2. 在项目中使用

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { viteFaker } from 'vite-plugin-faker'

export default defineConfig({
  plugins: [
    viteFaker({
      mountTarget: '#faker-ui',
      storeDir: '.mock',
    }),
  ],
})
```

### 3. 启动开发服务器

```bash
pnpm dev
```

拦截脚本会自动注入到页面中，UI 面板会出现在页面右下角。

## 功能说明

### 创建 Mock

1. 点击 UI 面板的"接口模拟"标签
2. 点击"新建 Mock"按钮
3. 配置：
   - **基本信息**：URL、方法、状态码等
   - **响应配置**：选择响应类型
     - **静态数据**：直接输入 JSON
     - **Faker 模板**：使用 `{{faker.person.firstName}}` 语法
     - **自定义函数**：编写 JS 函数，可使用 `faker` 和 `req` 对象
   - **可视化编辑**：通过表单选择字段类型

### 查看请求记录

1. 点击"请求记录"标签
2. 查看所有拦截的请求
3. 点击"详情"查看完整请求/响应信息

### 设置

1. 点击"设置"标签
2. 配置全局选项
3. 清除缓存等

## 注意事项

1. **拦截脚本构建**：必须先构建 `faker-interceptor`，否则拦截功能不可用
2. **WebSocket 连接**：确保 Vite 开发服务器正在运行
3. **Faker.js 体积**：拦截脚本包含 Faker.js，体积较大（~500KB）

## 已知限制

1. WebSocket 通信需要进一步测试和优化
2. 可视化编辑器功能较基础
3. 错误处理需要完善

## 下一步优化

- [ ] 优化拦截脚本体积（Tree-shaking）
- [ ] 完善错误处理
- [ ] 增强可视化编辑器
- [ ] 添加单元测试

