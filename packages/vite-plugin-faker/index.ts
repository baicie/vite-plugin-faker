import { faker } from '@faker-js/faker'

// 遍历 faker，生成 { module: [methods] } 对象
function getFakerMethodMap() {
  const map: Record<string, string[]> = {}

  for (const moduleName of Object.keys(faker)) {
    if (moduleName.startsWith('_')) continue // 过滤私有模块
    const module = (faker as any)[moduleName]
    if (typeof module === 'object' && module !== null) {
      map[moduleName] = Object.keys(module).filter(
        method =>
          typeof module[method] === 'function' && !method.startsWith('_'),
      )
    }
  }

  return map
}
const fakerMethodMap = getFakerMethodMap()
console.log(fakerMethodMap)
