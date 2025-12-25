import { extend } from '@baicie/faker-shared'
import { type InjectionKey, inject } from 'vue'

export interface UIOPtions {
  wsUrl: string
  timeout: number
  mode: 'button' | 'route'
}

export const appContextKey = Symbol('app-config') as InjectionKey<UIOPtions>

const defaultOptions: UIOPtions = {
  wsUrl: '',
  timeout: 10 * 1000,
  mode: 'route',
}

export function useAppContext() {
  return extend(defaultOptions, inject(appContextKey, defaultOptions))
}
