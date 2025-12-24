import { type Faker, faker } from '@faker-js/faker'

type Module = Exclude<
  {
    [K in keyof Faker]: Faker[K] extends object
      ? K extends `_${string}`
        ? never
        : K
      : never
  }[keyof Faker],
  undefined
>

type MethodsOf<M extends Module> = {
  [K in keyof Faker]: K extends M
    ? {
        [F in keyof Faker[K]]: Faker[K][F] extends (...args: any) => any
          ? F
          : never
      }[keyof Faker[K]]
    : never
}[keyof Faker]

export type FakerMethodMap = {
  [K in Module]?: MethodsOf<K>[]
}

export type FakerMethods = {
  [K in keyof Faker]: {
    [F in keyof Faker[K]]: Faker[K][F] extends (...args: any) => any
      ? `${K & string}.${F & string}`
      : never
  }[keyof Faker[K]]
}[keyof Faker]

function isValidModule(moduleName: string): moduleName is Module {
  return moduleName in faker && !moduleName.startsWith('_')
}

function getFakerMethodMap() {
  const map: FakerMethodMap = {}

  for (let moduleName of Object.keys(faker)) {
    moduleName = moduleName as Module
    if (!isValidModule(moduleName)) continue
    if (moduleName.startsWith('_')) continue
    const module = faker[moduleName]
    type Methods = keyof typeof module
    if (typeof module === 'object' && module !== null) {
      map[moduleName] = Object.keys(module).filter(
        method =>
          typeof module[method as Methods] === 'function' &&
          !method.startsWith('_'),
      ) as Methods[]

      if (!map[moduleName]?.length) {
        delete map[moduleName]
      }
    }
  }

  return map
}

export const fakerMethodMap: FakerMethodMap = getFakerMethodMap()
