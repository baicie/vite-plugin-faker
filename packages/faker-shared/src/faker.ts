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

export interface FakerCall<M extends Module = any> {
  module: M
  method: MethodsOf<M>
  args?: any[]
}

export type FakerValue<M extends Module = any> =
  | FakerCall<M>
  | FakerValue<M>[]
  | { [key: string]: FakerValue<M> }
  | string
  | number
  | boolean
  | null

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

function isFakerCall(value: any): value is FakerCall {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.module === 'string' &&
    typeof value.method === 'string'
  )
}

function callFaker({ module, method, args = [] }: FakerCall): any {
  const fakerModule = (faker as any)[module]

  if (!fakerModule) {
    throw new Error(`faker module "${module}" not found`)
  }

  const fn = fakerModule[method]

  if (typeof fn !== 'function') {
    throw new Error(`faker method "${module}.${method}" not found`)
  }

  return fn(...args)
}

export function resolveFakerValue(value: FakerValue): any {
  if (isFakerCall(value)) {
    return callFaker(value)
  }

  if (Array.isArray(value)) {
    return value.map(v => resolveFakerValue(v))
  }

  if (value && typeof value === 'object') {
    const result: Record<string, any> = {}
    for (const key in value) {
      result[key] = resolveFakerValue(value[key]!)
    }
    return result
  }

  return value
}
