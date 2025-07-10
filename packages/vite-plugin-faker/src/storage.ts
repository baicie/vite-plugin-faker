import type { MockConfig } from './types'

const DEFAULT_STORAGE_DIR = '.mock'

export interface StorageOptions {
  /**
   * 存储目录路径，默认为当前工作目录下的.mock
   */
  storageDir?: string
  /**
   * 服务器端适配器，用于在服务器端保存/加载模拟配置
   */
  serverAdapter?: any
}

class MockStorage {
  private mocks: MockConfig[] = []
  private storageDir: string
  private serverAdapter: any | null = null

  constructor(options: StorageOptions = {}) {
    const { storageDir = DEFAULT_STORAGE_DIR, serverAdapter = null } = options
    this.storageDir = storageDir
    this.serverAdapter = serverAdapter

    // 加载存储的模拟配置
    this.load()
  }

  /**
   * 加载存储的模拟配置
   */
  private load(): void {
    try {
      // 如果在服务器端，使用服务器适配器
      if (this.serverAdapter) {
        this.mocks = this.serverAdapter.loadMocks()
      }
      // 在浏览器端，尝试从localStorage加载
      else if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(
          `vite-plugin-faker:${this.storageDir}`,
        )
        if (stored) {
          this.mocks = JSON.parse(stored)
        }
      }
    } catch (error) {
      console.error('[vite-plugin-faker] Failed to load mock configs:', error)
    }
  }

  /**
   * 保存模拟配置到存储
   */
  private save(): void {
    try {
      // 如果在服务器端，使用服务器适配器
      if (this.serverAdapter) {
        this.serverAdapter.saveMocks(this.mocks)
      }
      // 在浏览器端，保存到localStorage
      else if (typeof window !== 'undefined') {
        localStorage.setItem(
          `vite-plugin-faker:${this.storageDir}`,
          JSON.stringify(this.mocks),
        )
      }
    } catch (error) {
      console.error('[vite-plugin-faker] Failed to save mock configs:', error)
    }
  }

  /**
   * 获取所有模拟配置
   */
  getMocks(): MockConfig[] {
    return [...this.mocks]
  }

  /**
   * 获取所有启用的模拟配置
   */
  getEnabledMocks(): MockConfig[] {
    return this.mocks.filter(mock => mock.enabled)
  }

  /**
   * 通过ID获取模拟配置
   */
  getMockById(id: string): MockConfig | undefined {
    return this.mocks.find(mock => mock.id === id)
  }

  /**
   * 添加模拟配置
   */
  addMock(mock: MockConfig): void {
    this.mocks.push(mock)
    this.save()
  }

  /**
   * 更新模拟配置
   */
  updateMock(updatedMock: MockConfig): void {
    const index = this.mocks.findIndex(mock => mock.id === updatedMock.id)
    if (index !== -1) {
      this.mocks[index] = updatedMock
      this.save()
    }
  }

  /**
   * 删除模拟配置
   */
  deleteMock(id: string): void {
    this.mocks = this.mocks.filter(mock => mock.id !== id)
    this.save()
  }

  /**
   * 切换模拟配置的启用状态
   */
  toggleMockEnabled(id: string): void {
    const mock = this.getMockById(id)
    if (mock) {
      mock.enabled = !mock.enabled
      this.save()
    }
  }

  /**
   * 初始化模拟配置
   */
  initMocks(mocks: MockConfig[]): void {
    this.mocks = mocks
    this.save()
  }
}

export { MockStorage }
export type { MockConfig } from './types'
