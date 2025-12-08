export function generateUUID(): string {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)

  buf[6] = (buf[6] & 0x0f) | 0x40 // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80 // variant

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
