import { runInNewContext } from 'node:vm'
import type { Faker } from '@faker-js/faker'
import { faker } from '@faker-js/faker'

export class MockDataGenerator {
  private faker: Faker

  constructor() {
    this.faker = faker
  }
  generateStatic(data: any): any {
    return JSON.parse(JSON.stringify(data))
  }

  generateFromTemplate(template: string): any {
    try {
      const processed = template.replace(
        /\{\{\s*([^{}]+)\s*\}\}/g,
        (_, path) => {
          try {
            // 解析路径并获取值
            const value = path
              .split('.')
              .reduce((obj, prop) => obj[prop], this.faker)
            if (typeof value === 'function') {
              return JSON.stringify(value())
            }
            return JSON.stringify(value)
          } catch (_e) {
            return 'null'
          }
        },
      )
      return JSON.parse(processed)
    } catch (_e) {
      return { error: '模板格式错误' }
    }
  }

  generateFromFunction(code: string, req: any): any {
    try {
      const context = {
        faker: this.faker,
        req,
        result: null,
        console,
      }

      const script = `
        (function() {
          try {
            result = (function() {
              ${code}
            })();
          } catch (e) {
            console.error(e);
            result = { error: e.message };
          }
        })()
      `

      runInNewContext(script, context)
      return context.result
    } catch (_e) {
      return { error: '函数执行错误' }
    }
  }
}
