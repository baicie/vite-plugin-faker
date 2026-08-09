import { extend } from 'lodash-es'
import type { FakerConfig, FakerOptions } from './types'
import { initLogger } from '@baicie/logger'

export const defaultConfig: FakerConfig = {
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

export function resolveConfig(config: FakerOptions): FakerConfig {
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
