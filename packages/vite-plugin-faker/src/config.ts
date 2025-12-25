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

  return extend(defaultConfig, config)
}
