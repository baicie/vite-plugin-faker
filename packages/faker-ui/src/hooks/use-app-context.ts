export interface UIOptions {
  wsUrl: string
  timeout: number
  mode: 'button' | 'route'
}

export interface UIOptionsInput {
  wsUrl?: string
  timeout?: number
  mode?: 'button' | 'route'
}

/** @deprecated Use UIOptions instead. */
export interface UIOPtions extends UIOptions {}

const DEFAULT_OPTIONS: UIOptions = {
  wsUrl: '',
  timeout: 10 * 1000,
  mode: 'route',
}

let appOptions: UIOptions = DEFAULT_OPTIONS

export function configureAppContext(options?: UIOptionsInput): UIOptions {
  appOptions = Object.assign({}, DEFAULT_OPTIONS, options || {})
  return appOptions
}

export function useAppContext(): UIOptions {
  return appOptions
}
