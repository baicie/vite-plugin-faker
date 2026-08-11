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
})
