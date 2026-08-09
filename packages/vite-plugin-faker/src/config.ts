import { extend } from 'lodash-es'
import type { ViteFakerOptions } from './index'
import { initLogger } from '@baicie/logger'

export interface ViteFakerConfig extends ViteFakerOptions {
  storeDir: string
  silent: boolean
}

export const defaultConfig: ViteFakerConfig = {
  mountTarget: '#mock-ui',
  storeDir: '.mock',
  silent: false,
  allowFunctionHandlerSource: false,
  functionHandlerTimeout: 1000,
  loggerOptions: {
    enabled: true,
    level: 'error',
    showTimestamp: true,
    showLevel: true,
  },
  uiOptions: {
    mode: 'route',
    timeout: 10 * 1000,
  },
}

export function resolveConfig(config: ViteFakerOptions): ViteFakerConfig {
  const _loggerOptions = extend(
    {
      enabled: true,
      level: 'error',
      showTimestamp: true,
      showLevel: true,
    },
    config.loggerOptions,
  )

  initLogger(
    extend(
      {
        prefix: '[Faker Plugin]',
      },
      _loggerOptions,
    ),
  )

  const _uiOptions = extend({}, defaultConfig.uiOptions, config.uiOptions)

  return extend({}, defaultConfig, config, {
    loggerOptions: _loggerOptions,
    uiOptions: _uiOptions,
  })
}
