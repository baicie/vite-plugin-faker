import type { RequestRecord } from './ws'

export function generateUUID(): string {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)

  buf[6] = ((buf[6] as number) & 0x0f) | 0x40 // version 4
  buf[8] = ((buf[8] as number) & 0x3f) | 0x80 // variant

  const toHex = (num: number) => num.toString(16).padStart(2, '0')

  return [...buf]
    .map(toHex)
    .join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}

/**
 * 转义替换值，用于字符串替换
 * 返回 JSON 序列化后的字符串，可以直接用于 String.replace()
 */
export function escapeReplacement(
  value: string | number | boolean | null,
): string {
  return JSON.stringify(value)
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

export async function createRequestKey(data: RequestRecord): Promise<string> {
  const { method, url } = data

  const raw = `${method}|${url}`
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  )
  return [...new Uint8Array(buf)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

export function safeJsonParse<T>(input: string, fallback: Partial<T>): T {
  if (typeof input !== 'string') return fallback as T

  try {
    const parsed = JSON.parse(input)
    return parsed as T
  } catch {
    return fallback as T
  }
}

export function isValidJSON(str: unknown): str is string {
  if (typeof str !== 'string') return false
  if (str.trim() === '') return false

  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
