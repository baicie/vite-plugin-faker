# vite-plugin-faker

使用Lit编写UI界面的Vite插件，利用faker和MSW劫持项目的API请求并在项目中缓存，通过UI界面配置接口伪造。

## 功能

- 🔄 拦截API请求并返回模拟数据
- 🎭 使用Faker.js生成逼真的测试数据
- 🎨 通过友好的UI界面配置和管理模拟接口
- ⚡ 与Vite开发服务器无缝集成
- 💾 支持自定义存储路径，默认保存在项目根目录的`.mock`文件夹中

## 安装

```bash
npm install vite-plugin-faker --save-dev
# 或
yarn add vite-plugin-faker -D
# 或
pnpm add vite-plugin-faker -D
```

## 使用方法

在你的Vite配置文件中添加插件：

```js
// vite.config.js / vite.config.ts
import { defineConfig } from 'vite'
import { viteFaker } from 'vite-plugin-faker'

export default defineConfig({
  plugins: [
    viteFaker({
      // 配置选项
      mountTarget: '#app', // UI面板挂载目标
      storageDir: '.mock', // 自定义存储路径，默认为'.mock'
    }),
  ],
})
```

## 配置选项

| 选项名        | 类型    | 默认值    | 说明                                 |
| ------------- | ------- | --------- | ------------------------------------ |
| `enable`      | boolean | `true`    | 是否启用插件                         |
| `mountTarget` | string  | `'#app'`  | UI面板挂载的目标元素选择器           |
| `storageDir`  | string  | `'.mock'` | 存储配置的目录路径，相对于项目根目录 |

## 开发

```bash
# 安装依赖
pnpm install:deps

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 许可证

MIT
