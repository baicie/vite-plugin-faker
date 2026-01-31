import { extend } from 'lodash-es'
import type { FakerOptions, FakerConfig } from './types'
import { initLogger } from '@baicie/logger'

export const defaultConfig: FakerConfig = {
  mountTarget: '#mock-ui',
  storeDir: '.mock',
  silent: false,
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

  return extend(defaultConfig, config)
}
