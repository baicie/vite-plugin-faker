import { describe, expect, it } from 'vitest'
import { defaultConfig, resolveConfig } from '../src/config'

describe('resolveConfig', () => {
  it('使用空选项时返回默认配置', () => {
    const config = resolveConfig({})
    expect(config.mountTarget).toBe(defaultConfig.mountTarget)
    expect(config.storeDir).toBe(defaultConfig.storeDir)
    expect(config.silent).toBe(defaultConfig.silent)
  })

  it('自定义 mountTarget 被正确合并', () => {
    const config = resolveConfig({ mountTarget: '#custom-ui' })
    expect(config.mountTarget).toBe('#custom-ui')
  })

  it('自定义 storeDir 被正确合并', () => {
    const config = resolveConfig({ storeDir: '.my-mock' })
    expect(config.storeDir).toBe('.my-mock')
  })

  it('自定义 uiOptions.mode 被正确合并', () => {
    const config = resolveConfig({ uiOptions: { mode: 'button' } })
    expect(config.uiOptions?.mode).toBe('button')
  })

  it('自定义 uiOptions.wsPort 被正确合并', () => {
    const config = resolveConfig({ uiOptions: { wsPort: 4000 } })
    expect(config.uiOptions?.wsPort).toBe(4000)
  })

  it('自定义 loggerOptions 被正确合并', () => {
    const config = resolveConfig({ loggerOptions: { level: 'debug' } })
    expect(config.loggerOptions?.level).toBe('debug')
  })
})
