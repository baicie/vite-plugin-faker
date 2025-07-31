import fs from 'node:fs'

export function ensureDirSync(dirPath: string): void {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  } catch {}
}
