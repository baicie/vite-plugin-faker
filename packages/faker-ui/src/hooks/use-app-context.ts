import { type InjectionKey, inject } from 'vue'

export interface UIOPtions {
  wsUrl: string
}

export const appContextKey = Symbol('app-config') as InjectionKey<UIOPtions>

export function useAppContext() {
  return inject(appContextKey)!
}
