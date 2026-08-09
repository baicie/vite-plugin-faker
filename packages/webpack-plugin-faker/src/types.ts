import type { LoggerConfig } from '@baicie/logger'
import type { UiOptionsMode } from '@baicie/faker-shared'

export interface FakerOptions {
  /**
   * ui target mount element id
   * @default '#mock-ui'
   */
  mountTarget?: string
  /**
   * mock config directory
   * @default '.mock'
   */
  storeDir?: string
  /**
   * @description logger options
   */
  loggerOptions?: Partial<LoggerConfig>
  /**
   * Execute persisted function mock source.
   * @default false
   */
  allowFunctionHandlerSource?: boolean
  /**
   * Maximum persisted function handler execution time in milliseconds.
   * @default 1000
   */
  functionHandlerTimeout?: number

  uiOptions?: {
    /**
     * @description ws server port
     * @default 3456
     */
    wsPort?: number
    /**
     * @description default request timeout times
     * @default 10 * 1000
     */
    timeout?: number
    /**
     * @description button or route mode
     * @default 'route'
     */
    mode?: UiOptionsMode
  }
}

export interface FakerConfig extends FakerOptions {
  storeDir: string
  silent: boolean
}
