import { beforeEach, describe, expect, it } from 'vitest'
import { getLocale, setLocale, translate } from '../src/i18n'

describe('faker studio i18n', function () {
  beforeEach(function () {
    window.localStorage.clear()
    setLocale('en-US')
  })

  it('keeps English as the default message source', function () {
    expect(getLocale()).toBe('en-US')
    expect(translate('Traffic')).toBe('Traffic')
    expect(
      translate('Exported {{count}} {{unit}}.', { count: 2, unit: 'rules' }),
    ).toBe('Exported 2 rules.')
  })

  it('translates messages and interpolates values for Simplified Chinese', function () {
    setLocale('zh-CN')

    expect(translate('Traffic')).toBe('流量')
    expect(
      translate('Exported {{count}} {{unit}}.', { count: 1, unit: 'rule' }),
    ).toBe('已导出 1 条规则。')
  })

  it('persists the selected locale for the next mount', function () {
    setLocale('zh-CN')

    expect(window.localStorage.getItem('faker-studio-locale')).toBe('zh-CN')
  })

  it('translates new rule fidelity messages with interpolated errors', function () {
    expect(translate('Save failed: {{error}}', { error: 'duplicate id' })).toBe(
      'Save failed: duplicate id',
    )
    expect(translate('Mock conflict detected')).toBe('Mock conflict detected')
    expect(translate('Update conflict detected')).toBe(
      'Update conflict detected',
    )
    expect(translate('Variant created for the same route')).toBe(
      'Variant created for the same route',
    )
    expect(translate('Replay headers stripped')).toBe('Replay headers stripped')

    setLocale('zh-CN')
    expect(translate('Save failed: {{error}}', { error: 'id 冲突' })).toBe(
      '保存失败：id 冲突',
    )
    expect(translate('Mock conflict detected')).toBe('检测到重复的 Mock')
    expect(translate('Import failed: {{error}}', { error: '导入失败' })).toBe(
      '导入失败：导入失败',
    )
  })
})
