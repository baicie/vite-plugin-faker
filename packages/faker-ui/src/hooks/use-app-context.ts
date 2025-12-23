import { extend } from '@baicie/faker-shared'
import { type InjectionKey, inject } from 'vue'

export interface UIOPtions {
  wsUrl: string
  timeout: number
}

export const appContextKey = Symbol('app-config') as InjectionKey<UIOPtions>

const defaultOptions: UIOPtions = {
  wsUrl: '',
  timeout: 10 * 1000,
}

export function useAppContext() {
  return extend(defaultOptions, inject(appContextKey, defaultOptions))
}
