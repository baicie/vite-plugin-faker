import { describe, expect, it } from 'vitest'
import { methodLineUrl } from '../src/utils'

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
})
