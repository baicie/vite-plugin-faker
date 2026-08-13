import { describe, expect, it } from 'vitest'
import { getRequestLocation } from '../src/request-record'

describe('getRequestLocation', () => {
  it('preserves repeated query parameters as an array', () => {
    const location = getRequestLocation('/api?tag=a&tag=b')

    expect(location.query).toEqual({ tag: ['a', 'b'] })
  })

  it('keeps a single query parameter as a string', () => {
    const location = getRequestLocation('/api?mode=preview')

    expect(location.query).toEqual({ mode: 'preview' })
  })
})
