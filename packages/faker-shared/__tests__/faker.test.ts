import { describe, expect, it } from 'vitest'
import { resolveFakerValue } from '../src/faker'

function isFakerCallShape(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as any).module === 'string' &&
    typeof (value as any).method === 'string'
  )
}

describe('resolveFakerValue', () => {
  it('直接返回基本类型：字符串', () => {
    expect(resolveFakerValue('hello')).toBe('hello')
  })

  it('直接返回基本类型：数字', () => {
    expect(resolveFakerValue(42)).toBe(42)
  })

  it('直接返回基本类型：布尔', () => {
    expect(resolveFakerValue(true)).toBe(true)
  })

  it('直接返回 null', () => {
    expect(resolveFakerValue(null)).toBeNull()
  })

  it('执行 FakerCall 并返回生成的值', () => {
    const result = resolveFakerValue({
      module: 'number',
      method: 'int',
      args: [{ min: 1, max: 10 }],
    })
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(10)
  })

  it('执行 person.fullName 并返回字符串', () => {
    const result = resolveFakerValue({ module: 'person', method: 'fullName' })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('递归处理数组中的 FakerCall', () => {
    const result = resolveFakerValue([
      { module: 'number', method: 'int', args: [{ min: 1, max: 5 }] },
      'static-value',
    ])
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(typeof result[0]).toBe('number')
    expect(result[1]).toBe('static-value')
  })

  it('递归处理嵌套对象', () => {
    const result = resolveFakerValue({
      name: { module: 'person', method: 'firstName' },
      age: { module: 'number', method: 'int', args: [{ min: 18, max: 60 }] },
      city: 'Beijing',
    })
    expect(typeof result.name).toBe('string')
    expect(typeof result.age).toBe('number')
    expect(result.city).toBe('Beijing')
  })

  it('未知模块抛出错误', () => {
    expect(() =>
      resolveFakerValue({ module: '__non_existent__', method: 'foo' }),
    ).toThrow()
  })

  it('未知方法抛出错误', () => {
    expect(() =>
      resolveFakerValue({ module: 'person', method: '__non_existent__' }),
    ).toThrow()
  })
})

describe('isFakerCallShape（内部辅助）', () => {
  it('有效的 FakerCall 结构返回 true', () => {
    expect(isFakerCallShape({ module: 'person', method: 'fullName' })).toBe(
      true,
    )
  })

  it('缺少 module 返回 false', () => {
    expect(isFakerCallShape({ method: 'fullName' })).toBe(false)
  })

  it('缺少 method 返回 false', () => {
    expect(isFakerCallShape({ module: 'person' })).toBe(false)
  })

  it('null 返回 false', () => {
    expect(isFakerCallShape(null)).toBe(false)
  })

  it('基本类型返回 false', () => {
    expect(isFakerCallShape('string')).toBe(false)
    expect(isFakerCallShape(42)).toBe(false)
  })
})
