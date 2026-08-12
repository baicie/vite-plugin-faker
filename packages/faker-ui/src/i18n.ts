export type Locale = 'en-US' | 'zh-CN'

export interface TranslationParams {
  [key: string]: string | number
}

const LOCALE_STORAGE_KEY = 'faker-studio-locale'

const ZH_CN: { [key: string]: string } = {
  'Open Faker Studio': '打开 Faker Studio',
  'Close Faker Studio': '关闭 Faker Studio',
  'Faker Studio workspace': 'Faker Studio 工作区',
  'Faker Studio': 'Faker Studio',
  'Built with Zeus': '基于 Zeus 构建',
  Workspace: '工作区',
  Connected: '已连接',
  Connecting: '连接中',
  Reconnecting: '重新连接中',
  Closed: '已关闭',
  Disconnected: '未连接',
  'Developer mock workspace': '开发者 Mock 工作台',
  Traffic: '流量',
  Rules: '规则',
  Settings: '设置',
  'Use dark theme': '使用深色主题',
  'Live network inspector': '实时网络检查器',
  'Capture, inspect, and turn real exchanges into deterministic mock rules.':
    '捕获并检查真实交互，将其转换为确定性的 Mock 规则。',
  'Loading traffic': '正在加载流量',
  'Waiting for captured request history.': '正在等待已捕获的请求记录。',
  'Could not load traffic': '无法加载流量',
  'Retry loading traffic': '重试加载流量',
  'Try again': '重试',
  'No matching requests': '没有匹配的请求',
  'No requests captured': '暂无捕获的请求',
  'Try a different path or method.': '请尝试其他路径或方法。',
  'Captured requests will appear here as your app runs.':
    '应用运行后，捕获的请求会显示在这里。',
  'Mock hit': '命中 Mock',
  Network: '网络',
  'Create rule for request': '为请求创建规则',
  'Create rule': '创建规则',
  Route: '路由',
  Method: '方法',
  Status: '状态',
  Source: '来源',
  Time: '时间',
  Actions: '操作',
  'Clear all captured request history?': '确定清空所有已捕获的请求记录吗？',
  'Request history could not be cleared': '请求记录清空失败',
  'Refresh traffic': '刷新流量',
  Refresh: '刷新',
  'Clear traffic': '清空流量',
  Clear: '清空',
  'Search captured requests': '搜索已捕获的请求',
  'Search path or method': '搜索路径或方法',
  'Search traffic': '搜索流量',
  Search: '搜索',
  'Captured exchanges': '已捕获的交互',
  'Recent requests': '最近请求',
  'Updating...': '更新中...',
  'Previous page': '上一页',
  'Next page': '下一页',
  Pagination: '分页',
  item: '项',
  items: '项',
  request: '请求',
  requests: '请求',
  Pending: '等待中',
  'Request details': '请求详情',
  'Selected exchange': '当前交互',
  'Create rule from request': '根据请求创建规则',
  'Select a request to inspect it': '选择一个请求查看详情',
  'Select a captured exchange to inspect its request and response.':
    '选择一条已捕获的交互，查看它的请求和响应。',
  Captured: '捕获时间',
  'Request headers': '请求头',
  'Query parameters': '查询参数',
  'Request body': '请求体',
  'Response not captured': '未捕获响应',
  'The request ended before a response payload was available.':
    '请求结束时还没有可用的响应内容。',
  'HTTP status': 'HTTP 状态',
  Duration: '耗时',
  'Response headers': '响应头',
  'Response body': '响应体',
  'Network response': '网络响应',
  'Response source': '响应来源',
  'Replay request': '重放请求',
  'Replaying...': '正在重放...',
  'Replay {{method}} request? It may change data.':
    '确定重放 {{method}} 请求吗？这可能会修改数据。',
  'Replay completed: HTTP {{status}}': '重放完成：HTTP {{status}}',
  'Replay failed: {{error}}': '重放失败：{{error}}',
  'Rule saved. Replay the request to verify the mock.':
    '规则已保存。重放请求以验证 Mock 效果。',
  'Dismiss notice': '关闭提示',
  Dismiss: '关闭',
  Request: '请求',
  Response: '响应',
  'Request detail views': '请求详情视图',
  'Interception registry': '拦截规则注册表',
  'Define exactly which requests are intercepted and what response is returned.':
    '精确定义要拦截的请求，以及需要返回的响应。',
  'Import OpenAPI': '导入 OpenAPI',
  'Search rules': '搜索规则',
  'Search URL, method, or description': '搜索 URL、方法或描述',
  'Filter by group': '按分组筛选',
  Rule: '规则',
  'Group / Tags': '分组 / 标签',
  Enabled: '已启用',
  'Loading rules...': '正在加载规则...',
  'No rules found': '未找到规则',
  'Adjust the filters to see more rules.': '调整筛选条件以查看更多规则。',
  'Create the first response rule for this project.':
    '为此项目创建第一条响应规则。',
  'No description': '暂无描述',
  Ungrouped: '未分组',
  'No tags': '无标签',
  Edit: '编辑',
  'Delete rule': '删除规则',
  Retry: '重试',
  'Retry editor': '重试编辑器',
  'Schema ingestion': 'Schema 导入',
  'Close OpenAPI import': '关闭 OpenAPI 导入',
  Close: '关闭',
  'Paste an OpenAPI 3 or Swagger 2 JSON document. Rules are previewed before they are created.':
    '粘贴 OpenAPI 3 或 Swagger 2 JSON 文档。创建规则前会先预览结果。',
  'Specification JSON': '规范 JSON',
  'OpenAPI JSON specification': 'OpenAPI JSON 规范',
  '{{count}} rules ready to import': '准备导入 {{count}} 条规则',
  'Each operation becomes an enabled static JSON rule.':
    '每个操作都会转换为一条已启用的静态 JSON 规则。',
  'Importing rules': '正在导入规则',
  'OpenAPI import progress': 'OpenAPI 导入进度',
  'Local schema references are resolved in memory.':
    '本地 Schema 引用会在内存中解析。',
  'Import rules': '导入规则',
  'Parse OpenAPI': '解析 OpenAPI',
  'Rule identity': '规则标识',
  'Enable rule': '启用规则',
  Enable: '启用',
  Disable: '停用',
  Example: '示例',
  'All groups': '全部分组',
  results: '条结果',
  'Page {{page}} of {{totalPages}}': '第 {{page}} / {{totalPages}} 页',
  'Request contract': '请求契约',
  'Shared by every response mode': '所有响应模式共用',
  Name: '名称',
  'URL pattern': 'URL 模式',
  Priority: '优先级',
  Group: '分组',
  Tags: '标签',
  Description: '描述',
  'Rule enabled': '启用规则',
  'Disabled rules stay in the registry but never intercept traffic.':
    '停用的规则会保留在注册表中，但不会拦截流量。',
  'Response strategy': '响应策略',
  'What should the client receive?': '客户端应该收到什么？',
  'The interceptor applies this server-side': '拦截器会在服务端应用此策略',
  'Response type': '响应类型',
  'Target URL': '目标 URL',
  'Timeout (ms)': '超时（毫秒）',
  'Rewrite response headers': '改写响应头',
  'Pass through response headers': '透传响应头',
  'Rewrite response status': '改写响应状态',
  'Pass through response status': '透传响应状态',
  'Item count': '条目数量',
  'Faker schema': 'Faker Schema',
  'Map fields to faker modules, for example string.uuid.':
    '将字段映射到 Faker 模块，例如 string.uuid。',
  'Handler source': '处理函数源码',
  'The function receives the request context and returns a response object.':
    '函数接收请求上下文，并返回响应对象。',
  'Current state index': '当前状态索引',
  'Response sequence': '响应序列',
  'Responses are served in order and then loop back to the first state.':
    '响应按顺序返回，之后会循环回第一个状态。',
  'Error status': '错误状态',
  'Status code': '状态码',
  'Delay (ms)': '延迟（毫秒）',
  'Error payload': '错误载荷',
  'Any valid JSON value is accepted.': '支持任意有效的 JSON 值。',
  'Header values must be strings.': '响应头的值必须是字符串。',
  'Advanced matching': '高级匹配',
  'Match beyond method and path': '按方法和路径之外的条件匹配',
  'Optional JSON contract': '可选的 JSON 契约',
  'Match rule JSON': '匹配规则 JSON',
  'Use url, headers, query, or body conditions. Leave empty for the basic URL match.':
    '可使用 URL、请求头、查询参数或请求体条件。留空则仅匹配基础 URL。',
  'Rule sections': '规则分区',
  'Rules pagination': '规则分页',
  'Faker Studio / Rules': 'Faker Studio / 规则',
  'Configure request matching and the response returned by this mock rule.':
    '配置请求匹配条件以及此 Mock 规则返回的响应。',
  'Close rule editor': '关闭规则编辑器',
  'Edit rule': '编辑规则',
  Matching: '匹配条件',
  Cancel: '取消',
  'Save rule': '保存规则',
  'Saving...': '保存中...',
  'Runtime policy': '运行时策略',
  Reload: '重新加载',
  'Save changes': '保存更改',
  'Connection closed. Reopen Faker Studio to manage settings.':
    '连接已关闭。请重新打开 Faker Studio 管理设置。',
  'Loading settings...': '正在加载设置...',
  Appearance: '外观',
  'Dark theme': '深色主题',
  Language: '语言',
  English: 'English',
  'Simplified Chinese': '简体中文',
  'Use light theme': '使用浅色主题',
  'Request policy': '请求策略',
  'Global delay': '全局延迟',
  'Global delay in milliseconds': '全局延迟（毫秒）',
  'Enable all mocks by default': '默认启用全部 Mock',
  'Capture request history': '捕获请求记录',
  'Network policy': '网络策略',
  'Enable CORS': '启用 CORS',
  'CORS allowed origin': 'CORS 允许的来源',
  'Allowed origin': '允许的来源',
  Data: '数据',
  'Export rules': '导出规则',
  'Clear history': '清空记录',
  'Settings could not be saved': '设置保存失败',
  'Settings saved.': '设置已保存。',
  'Rules could not be imported': '规则导入失败',
  'Request history cleared.': '请求记录已清空。',
  'The selected file could not be read as text': '无法将所选文件读取为文本',
  'Could not read the file': '文件读取失败',
  'Exported {{count}} {{unit}}.': '已导出 {{count}} 条{{unit}}。',
  'Imported {{count}} {{unit}}.': '已导入 {{count}} 条{{unit}}。',
  'Imported {{count}} of {{total}} rules.':
    '已导入 {{count}} / {{total}} 条规则。',
  'Import failed: {{error}}': '导入失败：{{error}}',
  'This rule has no persistent ID': '此规则没有持久化 ID',
  'The rule could not be updated': '规则更新失败',
  'Delete rule "{{name}}"?': '确定删除规则“{{name}}”吗？',
  'The rule could not be deleted': '规则删除失败',
  rule: '规则',
  rules: '规则',
  'Code editor': '代码编辑器',
  'Loading code editor...': '正在加载代码编辑器...',
  'Code editor unavailable': '代码编辑器不可用',
  'Unexpected error': '发生未知错误',
  'Static JSON': '静态 JSON',
  Template: '模板',
  Function: '函数',
  Error: '错误',
  Stateful: '有状态',
  Static: '静态',
  Proxy: '代理',
  'Response body must be valid JSON': '响应体必须是有效 JSON',
  'Method is required': '必须填写方法',
  'Status must be an integer between 100 and 599':
    '状态码必须是 100 到 599 之间的整数',
  'Delay must be a non-negative number': '延迟必须是非负数',
}

let activeLocale: Locale | undefined

function localeFromValue(value: string | null | undefined): Locale | undefined {
  if (!value) {
    return undefined
  }
  return value.toLowerCase().indexOf('zh') === 0 ? 'zh-CN' : 'en-US'
}

export function getLocale(): Locale {
  if (activeLocale) {
    return activeLocale
  }

  let storedLocale: Locale | undefined
  try {
    storedLocale = localeFromValue(
      typeof window !== 'undefined'
        ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
        : undefined,
    )
  } catch (_error) {
    storedLocale = undefined
  }

  activeLocale =
    storedLocale ||
    localeFromValue(
      typeof navigator !== 'undefined' ? navigator.language : undefined,
    ) ||
    'en-US'
  return activeLocale
}

export function setLocale(locale: Locale): void {
  activeLocale = locale
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    }
  } catch (_error) {
    // The language still applies for this session when storage is unavailable.
  }
}

export function translate(key: string, params?: TranslationParams): string {
  const template = getLocale() === 'zh-CN' && ZH_CN[key] ? ZH_CN[key] : key
  if (!params) {
    return template
  }

  return template.replace(/\{\{([^}]+)\}\}/g, function (_, name: string) {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      return '{{' + name + '}}'
    }
    const value = String(params[name])
    return getLocale() === 'zh-CN' && ZH_CN[value] ? ZH_CN[value] : value
  })
}

export const t: typeof translate = translate
