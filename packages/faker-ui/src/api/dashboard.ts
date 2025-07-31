import { type DashboardQuery, IApi, type Page } from '@baicie/faker-shared'
import { request } from './index'

interface Dashboard {
  id: string
  name: string
  description: string
}

export function getDashboard(query: DashboardQuery): Promise<Page<Dashboard>> {
  return request(IApi.dashboard, {
    data: query,
  })
}
