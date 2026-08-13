export {
  BLOCKED_RESPONSE_HEADERS,
  sanitizeResponseHeaders,
} from '@baicie/faker-shared'

// 保留旧名，确保与中间件/UI 既有用法兼容。
export { sanitizeResponseHeaders as sanitizeMockResponseHeaders } from '@baicie/faker-shared'
