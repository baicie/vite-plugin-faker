import fs from 'fs'
import path from 'path'
import type { MockConfig } from './types'

// 服务器端存储适配器，用于处理文件系统操作
export class ServerAdapter {
  private storageDir: string
  private configPath: string

  constructor(options: { storageDir: string }) {
    const { storageDir } = options
    this.storageDir = path.resolve(process.cwd(), storageDir)
    this.configPath = path.join(this.storageDir, 'mock-config.json')

    // 确保存储目录存在
    this.ensureStorageDir()
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }
  }

  /**
   * 加载模拟配置
   */
  loadMocks(): MockConfig[] {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('[vite-plugin-faker] Failed to load mock configs:', error)
    }
    return []
  }

  /**
   * 保存模拟配置
   */
  saveMocks(mocks: MockConfig[]): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(mocks, null, 2), 'utf-8')
    } catch (error) {
      console.error('[vite-plugin-faker] Failed to save mock configs:', error)
    }
  }
}
