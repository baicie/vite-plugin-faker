import { generateUUID } from '@baicie/faker-shared'
import { BaseDB } from './base'

export class ProxyConfigDB extends BaseDB<ProxyRule[]> {
  private static instance: ProxyConfigDB

  private constructor() {
    super('proxy-config', [])
  }

  static getInstance(): ProxyConfigDB {
    if (!ProxyConfigDB.instance) {
      ProxyConfigDB.instance = new ProxyConfigDB()
    }
    return ProxyConfigDB.instance
  }

  addProxyRule(rule: ProxyRule): string {
    const id = generateUUID()
    const newRule = { ...rule, id, createdAt: Date.now() }
    this.db.data.push(newRule)
    this.save()
    return id
  }

  getProxyRule(id: string): ProxyRule | undefined {
    return this.db.data.find(rule => rule.id === id)
  }

  updateProxyRule(id: string, updates: Partial<ProxyRule>): boolean {
    const index = this.db.data.findIndex(rule => rule.id === id)
    if (index !== -1) {
      this.db.data[index] = { ...this.db.data[index], ...updates }
      this.save()
      return true
    }
    return false
  }

  deleteProxyRule(id: string): boolean {
    const initialLength = this.db.data.length
    this.db.data = this.db.data.filter(rule => rule.id !== id)
    if (this.db.data.length !== initialLength) {
      this.save()
      return true
    }
    return false
  }

  getAllProxyRules(): ProxyRule[] {
    return [...this.db.data]
  }

  findMatchingRules(url: string): ProxyRule[] {
    return this.db.data
      .filter(rule => {
        if (rule.matchType === 'exact' && rule.url === url) {
          return true
        }
        if (rule.matchType === 'prefix' && url.startsWith(rule.url)) {
          return true
        }
        if (rule.matchType === 'regex') {
          try {
            const regex = new RegExp(rule.url)
            return regex.test(url)
          } catch (_e) {
            return false
          }
        }
        return false
      })
      .sort((a, b) => {
        // 优先级排序：exact > prefix > regex
        const typeOrder = { exact: 0, prefix: 1, regex: 2 }
        return typeOrder[a.matchType] - typeOrder[b.matchType]
      })
  }
}

// 代理规则类型定义
interface ProxyRule {
  id?: string
  name: string
  description?: string
  enabled: boolean
  url: string
  matchType: 'exact' | 'prefix' | 'regex'
  target: string
  changeOrigin?: boolean
  pathRewrite?: Record<string, string>
  headers?: Record<string, string>
  createdAt?: number
  updatedAt?: number
  group?: string // 可按组织代理规则
  priority?: number // 可设置优先级
}
