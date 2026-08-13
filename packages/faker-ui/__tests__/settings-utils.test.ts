import type { MockConfig } from '@baicie/faker-shared'
import { describe, expect, it } from 'vitest'
import {
  createSettingsUpdate,
  normalizeRuntimeSettings,
  parseMockImport,
  serializeMockExport,
} from '../src/app/settings-utils'

describe('settings workspace utilities', function () {
  it('normalizes missing and invalid runtime policy values', function () {
    expect(
      normalizeRuntimeSettings({
        version: 1,
        globalDelay: 90000,
        corsAllowOrigin: '',
      }),
    ).toEqual({
      globalDelay: 60000,
      enableAllMocks: true,
      logRequests: true,
      corsEnabled: true,
      corsAllowOrigin: '*',
    })

    expect(
      normalizeRuntimeSettings({
        version: 1,
        globalDelay: -20,
        enableAllMocks: false,
        logRequests: false,
        corsEnabled: false,
        corsAllowOrigin: ' https://example.test ',
      }),
    ).toEqual({
      globalDelay: 0,
      enableAllMocks: false,
      logRequests: false,
      corsEnabled: false,
      corsAllowOrigin: 'https://example.test',
    })
  })

  it('builds a bounded settings update without retaining form references', function () {
    const form = {
      globalDelay: 120.6,
      enableAllMocks: false,
      logRequests: true,
      corsEnabled: true,
      corsAllowOrigin: ' https://api.example.test ',
    }
    const update = createSettingsUpdate(form)

    form.globalDelay = 5
    form.corsAllowOrigin = '*'

    expect(update).toEqual({
      globalDelay: 121,
      enableAllMocks: false,
      logRequests: true,
      corsEnabled: true,
      corsAllowOrigin: 'https://api.example.test',
    })
  })

  it('parses exported mock rules before importing them', function () {
    const source = JSON.stringify([
      {
        url: '/api/users',
        method: 'GET',
        type: 'static',
        enabled: true,
        response: { status: 200, body: [] },
      },
    ])
    const mocks = parseMockImport(source)

    expect(mocks).toHaveLength(1)
    expect(mocks[0]).toMatchObject({
      url: '/api/users',
      method: 'GET',
      type: 'static',
      enabled: true,
    })
    expect(JSON.parse(serializeMockExport(mocks)) as MockConfig[]).toEqual(
      mocks,
    )
  })

  it('rejects malformed or unsupported mock import data', function () {
    expect(function () {
      parseMockImport('{')
    }).toThrow('valid JSON')
    expect(function () {
      parseMockImport('{}')
    }).toThrow('JSON array')
    expect(function () {
      parseMockImport('[]')
    }).toThrow('at least one rule')
    expect(function () {
      parseMockImport(
        JSON.stringify([
          {
            url: '',
            method: 'GET',
            type: 'static',
            enabled: true,
          },
        ]),
      )
    }).toThrow('Rule 1 must have a URL')
    expect(function () {
      parseMockImport(
        JSON.stringify([
          {
            url: '/api/users',
            method: 'GET',
            type: 'unknown',
            enabled: true,
          },
        ]),
      )
    }).toThrow('Rule 1 has an unsupported response type')
  })
})
