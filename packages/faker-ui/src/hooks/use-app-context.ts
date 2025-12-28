import { getContext } from 'svelte'

export const appContextKey = Symbol('app-context')

export interface UIOptions {
  wsUrl?: string
  timeout?: number
  mode?: 'hash' | 'history' | 'button'
}

export function useAppContext(): UIOptions {
  return getContext<UIOptions>(appContextKey)
}
