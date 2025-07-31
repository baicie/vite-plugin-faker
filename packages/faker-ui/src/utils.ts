export function generateUUID(): string {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)

  // 设置版本号和变种位
  buf[6] = (buf[6] & 0x0f) | 0x40 // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80 // variant

  const toHex = (num: number) => num.toString(16).padStart(2, '0')

  return [...buf]
    .map(toHex)
    .join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}
