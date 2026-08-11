import { describe, expect, it } from 'vitest'
import { methodLineUrl, normalizeRequestUrl } from '../src/utils'

describe('methodLineUrl', () => {
  it('组合 url 和 method 生成 key', () => {
    expect(methodLineUrl({ url: '/api/user', method: 'GET' })).toBe(
      '/api/user-GET',
    )
  })

  it('method 不同生成不同 key', () => {
    const get = methodLineUrl({ url: '/api/user', method: 'GET' })
    const post = methodLineUrl({ url: '/api/user', method: 'POST' })
    expect(get).not.toBe(post)
  })

  it('url 不同生成不同 key', () => {
    const a = methodLineUrl({ url: '/api/user', method: 'GET' })
    const b = methodLineUrl({ url: '/api/order', method: 'GET' })
    expect(a).not.toBe(b)
  })

  it('url 和 method 均为 undefined 时生成 undefined-undefined', () => {
    expect(methodLineUrl({})).toBe('undefined-undefined')
  })

  it('ignores query and hash fragments in route identity', () => {
    expect(
      methodLineUrl({ url: '/api/user?preview=true#result', method: 'GET' }),
    ).toBe('/api/user-GET')
  })

  it('normalizes absolute request URLs to a pathname', () => {
    expect(normalizeRequestUrl('https://api.example.com/users?page=2')).toBe(
      '/users',
    )
  })
})
