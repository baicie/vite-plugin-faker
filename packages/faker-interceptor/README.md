# @baicie/faker-interceptor

浏览器端请求拦截器，用于拦截 fetch 和 XMLHttpRequest 请求并返回 Mock 数据。

## 功能

- ✅ 拦截 fetch 和 XMLHttpRequest 请求
- ✅ 使用 Faker.js 生成 Mock 数据
- ✅ 支持静态数据、Faker 模板、自定义函数三种类型
- ✅ 通过 WebSocket 同步 Mock 配置
- ✅ 自动记录请求到服务端

## 使用

这个包通常由 `vite-plugin-faker` 自动注入到页面中，无需手动使用。

## 开发

```bash
# 构建
pnpm build

# 开发模式
pnpm dev
```
