import type { MockConfig } from '@baicie/faker-shared'
import { EventBusType, WSMessageType } from '@baicie/faker-shared'
import { describe, expect, it, vi } from 'vitest'
import type { DBManager } from '../src/db'
import { MockHandler } from '../src/api/mock-handler'

function createMock(): MockConfig {
  return {
    id: 'users-rule',
    url: '/api/users',
    method: 'GET',
    type: 'static',
    enabled: true,
    response: { status: 200, body: {} },
  }
}

describe('MockHandler update events', function () {
  it('does not broadcast a configuration update when persistence rejects it', function () {
    const eventBus = {
      emit: vi.fn(),
    }
    const db = {
      updateMock: vi.fn(function () {
        return false
      }),
    }
    const manager = {
      getMocksDB: function () {
        return db
      },
    } as unknown as DBManager
    const handler = new MockHandler(manager, eventBus)

    const response = handler.handleUpdate({
      id: 'users-rule',
      updates: { url: '/api/conflict' },
    })

    expect(response).toEqual({
      type: WSMessageType.MOCK_UPDATED,
      data: {
        success: false,
        error:
          'Update conflict: the rule signature matches another existing mock',
      },
    })
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      EventBusType.DB_MOCK_UPDATED,
      expect.anything(),
    )
  })

  it('broadcasts the persisted update only after success', function () {
    const eventBus = {
      emit: vi.fn(),
    }
    const db = {
      updateMock: vi.fn(function () {
        return true
      }),
    }
    const manager = {
      getMocksDB: function () {
        return db
      },
    } as unknown as DBManager
    const handler = new MockHandler(manager, eventBus)

    handler.handleUpdate({ id: 'users-rule', updates: createMock() })

    expect(eventBus.emit).toHaveBeenCalledWith(EventBusType.DB_MOCK_UPDATED, {
      id: 'users-rule',
      updates: createMock(),
    })
  })
})
