import { faker } from '@faker-js/faker'
import { logger } from '@baicie/logger'

export class BrowserFakerGenerator {
  /**
   * 生成静态数据
   */
  generateStatic(data: any): any {
    return JSON.parse(JSON.stringify(data))
  }

  generateFromTemplate(template: string, _request?: any): any {
    try {
      // 检查 faker 是否可用
      if (typeof faker === 'undefined') {
        logger.error('faker 对象未定义，请确保已加载 Faker.js')
        return { error: 'Faker.js not loaded' }
      }

      const processed = template.replace(
        /\{\{\s*([^{}]+)\s*\}\}/g,
        (_, path) => {
          try {
            // 解析路径，例如：faker.person.firstName
            const pathParts = path.trim().split('.')
            let value: any = faker

            for (const part of pathParts) {
              if (value && typeof value === 'object' && part in value) {
                value = value[part]
              } else {
                throw new Error(`Path not found: ${path}`)
              }
            }

            // 如果是函数，调用它
            if (typeof value === 'function') {
              const result = value()
              return JSON.stringify(result)
            }

            return JSON.stringify(value)
          } catch (e) {
            logger.error(`解析路径失败: ${path}`, e)
            return 'null'
          }
        },
      )

      return JSON.parse(processed)
    } catch (e) {
      logger.error('生成模板数据失败:', e)
      return { error: '模板格式错误' }
    }
  }

  /**
   * 执行自定义函数生成数据
   * 函数中可以访问 faker 和 req 对象
   */
  executeFunction(code: string, request: any): any {
    try {
      // 检查 faker 是否可用
      if (typeof faker === 'undefined') {
        logger.error('faker 对象未定义')
        return { error: 'Faker.js not loaded' }
      }

      // 在浏览器端执行函数
      // 使用 Function 构造函数创建函数，提供 faker 和 req
      const func = new Function(
        'faker',
        'req',
        `
        try {
          return (function() {
            ${code}
          })();
        } catch (e) {
          console.error('函数执行错误:', e);
          return { error: e.message };
        }
        `,
      )

      return func(faker, request)
    } catch (e) {
      logger.error('执行函数失败:', e)
      return { error: '函数执行错误' }
    }
  }
}
