import { describe, expect, it } from 'vitest'
import {
  cleanUrl,
  generateUUID,
  isValidJSON,
  safeJsonParse,
  sleep,
} from '../src/utils'

describe('generateUUID', () => {
  it('生成符合 UUID v4 格式的字符串', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('每次生成的 UUID 都不同', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()))
    expect(uuids.size).toBe(100)
  })
})

describe('cleanUrl', () => {
  it('移除 query string', () => {
    expect(cleanUrl('/api/user?id=1&name=test')).toBe('/api/user')
  })

  it('移除 hash fragment', () => {
    expect(cleanUrl('/api/user#section')).toBe('/api/user')
  })

  it('同时移除 query 和 hash', () => {
    expect(cleanUrl('/api/user?id=1#section')).toBe('/api/user')
  })

  it('不修改无参数的 URL', () => {
    expect(cleanUrl('/api/user')).toBe('/api/user')
  })

  it('处理根路径', () => {
    expect(cleanUrl('/')).toBe('/')
  })
})

describe('safeJsonParse', () => {
  it('正确解析合法的 JSON 字符串', () => {
    const result = safeJsonParse<{ name: string }>('{"name":"Alice"}', {})
    expect(result).toEqual({ name: 'Alice' })
  })

  it('解析失败时返回 fallback 值', () => {
    const fallback = { name: 'default' }
    const result = safeJsonParse<{ name: string }>('invalid json', fallback)
    expect(result).toBe(fallback)
  })

  it('非字符串输入返回 fallback', () => {
    const fallback = { name: 'default' }
    const result = safeJsonParse<{ name: string }>(
      123 as unknown as string,
      fallback,
    )
    expect(result).toBe(fallback)
  })
})

describe('isValidJSON', () => {
  it('合法 JSON 对象返回 true', () => {
    expect(isValidJSON('{"key":"value"}')).toBe(true)
  })

  it('合法 JSON 数组返回 true', () => {
    expect(isValidJSON('[1,2,3]')).toBe(true)
  })

  it('合法 JSON 数字返回 true', () => {
    expect(isValidJSON('42')).toBe(true)
  })

  it('非法 JSON 返回 false', () => {
    expect(isValidJSON('not json')).toBe(false)
  })

  it('空字符串返回 false', () => {
    expect(isValidJSON('')).toBe(false)
  })

  it('空白字符串返回 false', () => {
    expect(isValidJSON('   ')).toBe(false)
  })

  it('非字符串返回 false', () => {
    expect(isValidJSON(123)).toBe(false)
    expect(isValidJSON(null)).toBe(false)
    expect(isValidJSON(undefined)).toBe(false)
  })
})

describe('sleep', () => {
  it('等待指定的毫秒数', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })
})
