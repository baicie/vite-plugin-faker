import { describe, expect, it } from 'vitest'
import { isAllowedWebSocketClient } from '../src/ws-security'

describe('isAllowedWebSocketClient', () => {
  it('allows same-origin browser clients for an attached server', () => {
    expect(
      isAllowedWebSocketClient({
        origin: 'http://dev.example.test:8080',
        host: 'dev.example.test:8080',
        remoteAddress: '192.0.2.10',
      }),
    ).toBe(true)
  })

  it('rejects cross-origin browser clients for an attached server', () => {
    expect(
      isAllowedWebSocketClient({
        origin: 'https://untrusted.example.test',
        host: 'dev.example.test:8080',
        remoteAddress: '192.0.2.10',
      }),
    ).toBe(false)
  })

  it('allows loopback browser origins for a loopback-only server', () => {
    expect(
      isAllowedWebSocketClient({
        origin: 'http://localhost:5173',
        host: '127.0.0.1:3456',
        remoteAddress: '127.0.0.1',
        loopbackOnly: true,
      }),
    ).toBe(true)
  })

  it('rejects external browser origins for a loopback-only server', () => {
    expect(
      isAllowedWebSocketClient({
        origin: 'https://untrusted.example.test',
        host: '127.0.0.1:3456',
        remoteAddress: '127.0.0.1',
        loopbackOnly: true,
      }),
    ).toBe(false)
    expect(
      isAllowedWebSocketClient({
        origin: 'https://127.attacker.example',
        host: '127.0.0.1:3456',
        remoteAddress: '127.0.0.1',
        loopbackOnly: true,
      }),
    ).toBe(false)
  })

  it('only allows origin-less clients from a loopback address', () => {
    expect(
      isAllowedWebSocketClient({ remoteAddress: '::ffff:127.0.0.1' }),
    ).toBe(true)
    expect(isAllowedWebSocketClient({ remoteAddress: '192.0.2.10' })).toBe(
      false,
    )
  })
})
