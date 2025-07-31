import { MockDataGenerator } from '../../faker-generator'
import type { MockConfig, MockPreviewRequest } from '../types'
import type { DBManager } from '../../db'

export function getMockList(data: unknown, dbManager: DBManager): any {
  const params = data as {
    page: number
    pageSize: number
    search?: string
    sortBy?: string
    sortDesc?: boolean
  }

  return dbManager
    .getMocksDB()
    .getMocksWithPagination(
      params.page,
      params.pageSize,
      params.search,
      params.sortBy,
      params.sortDesc,
    )
}

export function createMock(data: unknown, dbManager: DBManager): any {
  const mockConfig = data as MockConfig
  return dbManager.getMocksDB().addMock(mockConfig)
}

export function updateMock(data: unknown, dbManager: DBManager): any {
  const { id, data: updateData } = data as {
    id: string
    data: Partial<MockConfig>
  }
  return dbManager.getMocksDB().updateMock(id, updateData)
}

export function deleteMock(data: unknown, dbManager: DBManager): any {
  const id = data as string
  return dbManager.getMocksDB().deleteMock(id)
}

export function toggleMockStatus(data: unknown, dbManager: DBManager): any {
  const { id, enabled } = data as { id: string; enabled: boolean }
  return dbManager.getMocksDB().updateMock(id, { enabled })
}

export function previewMockResponse(data: unknown, dbManager: DBManager): any {
  const request = data as MockPreviewRequest
  const generator = new MockDataGenerator()

  switch (request.responseType) {
    case 'faker':
      return generator.generateFromTemplate(request.responseTemplate || '{}')
    case 'function':
      return generator.generateFromFunction(
        request.responseCode || '',
        request.requestInfo,
      )
    case 'static':
    default:
      return generator.generateStatic(request.responseData)
  }
}
