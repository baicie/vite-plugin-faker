import type { ViteDevServer } from 'vite'
import type { DBManager } from './db'

/**
 * 虚拟模块：提供配置同步
 */
export function setupVirtualModules(
  server: ViteDevServer,
  dbManager: DBManager,
): void {
  // 提供 Mock 配置虚拟模块
  server.moduleGraph.onFileChange('/@faker-config', () => {
    const module = server.moduleGraph.getModuleById('/@faker-config')
    if (module) {
      server.moduleGraph.invalidateModule(module)
    }
  })
}

/**
 * 加载虚拟模块
 */
export function loadVirtualModule(id: string, dbManager: DBManager): string | null {
  if (id === '/@faker-config') {
    const mocksDB = dbManager.getMocksDB()
    const mocks = mocksDB.getAllMocks()
    return `export default ${JSON.stringify(mocks)}`
  }

  return null
}

