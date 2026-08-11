import type {
  DashboardQuery,
  Page,
  RequestRecord,
  WSMessage,
} from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared/browser'
import { onCleanup, state } from '@zeus-js/zeus'
import { clearRequestHistory, fetchRequestHistory } from '../api/request'
import TrafficDetail from './traffic-detail'
import { dynamic, getErrorMessage, readInputValue } from '../lib/zeus'
import { formatDuration } from './traffic-utils'
import { t } from '../i18n'

export interface TrafficMessageHandler {
  (data: unknown, message: WSMessage): void
}

export interface TrafficRealtimeClient {
  on(type: WSMessageType, handler: TrafficMessageHandler): void
  off(type: WSMessageType, handler: TrafficMessageHandler): void
}

export interface TrafficWorkspaceProps {
  onCreateRule: (record: RequestRecord) => void
  client?: TrafficRealtimeClient
}

interface TrafficModel {
  records: RequestRecord[]
  selected: RequestRecord | null
  searchInput: string
  activeSearch: string
  page: number
  pageSize: number
  total: number
  totalPages: number
  loading: boolean
  clearing: boolean
  error: string
}

interface InputChangeDetail {
  value: string
  nativeEvent: Event
}

const DEFAULT_PAGE_SIZE = 20

function readSearchValue(event: Event): string {
  const detail = (event as CustomEvent<InputChangeDetail>).detail
  if (detail && typeof detail.value === 'string') {
    return detail.value
  }
  return readInputValue(event)
}

function methodLabel(record: RequestRecord): string {
  const method = record.method.trim().toUpperCase()
  return method || 'GET'
}

function recordKey(record: RequestRecord): string {
  if (record.id) {
    return record.id
  }
  return String(record.timestamp) + ':' + methodLabel(record) + ':' + record.url
}

function isRequestRecord(data: unknown): data is RequestRecord {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.url === 'string' && typeof candidate.method === 'string'
  )
}

function matchesSearch(record: RequestRecord, search: string): boolean {
  if (!search) {
    return true
  }
  const needle = search.toLowerCase()
  return (
    record.url.toLowerCase().indexOf(needle) !== -1 ||
    methodLabel(record).toLowerCase().indexOf(needle) !== -1
  )
}

function statusLabel(record: RequestRecord): string {
  if (!record.response) {
    return t('Pending')
  }
  return String(record.response.statusCode)
}

function statusTone(record: RequestRecord): string {
  if (!record.response) {
    return 'pending'
  }
  const status = record.response.statusCode
  if (status >= 200 && status < 300) {
    return 'success'
  }
  if (status >= 300 && status < 400) {
    return 'redirect'
  }
  if (status >= 400) {
    return 'error'
  }
  return 'pending'
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return isNaN(date.getTime()) ? '-' : date.toLocaleTimeString()
}

function totalLabel(total: number): string {
  return total + ' ' + t(total === 1 ? 'request' : 'requests')
}

function createInitialModel(): TrafficModel {
  return {
    records: [],
    selected: null,
    searchInput: '',
    activeSearch: '',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    loading: true,
    clearing: false,
    error: '',
  }
}

function findSelected(
  records: RequestRecord[],
  selected: RequestRecord | null,
): RequestRecord | null {
  if (selected) {
    const selectedKey = recordKey(selected)
    for (let index = 0; index < records.length; index++) {
      if (recordKey(records[index]) === selectedKey) {
        return records[index]
      }
    }
  }
  return records.length > 0 ? records[0] : null
}

function renderLoadingState(): JSX.Element {
  return (
    <div class="traffic-state traffic-state-loading" data-state="loading">
      <span class="traffic-state-spinner" aria-hidden="true" />
      <h3>{t('Loading traffic')}</h3>
      <p>{t('Waiting for captured request history.')}</p>
    </div>
  )
}

function renderErrorState(message: string, onRetry: () => void): JSX.Element {
  return (
    <div class="traffic-state traffic-state-error" data-state="error">
      <span class="traffic-state-icon" aria-hidden="true">
        !
      </span>
      <h3>{t('Could not load traffic')}</h3>
      <p>{message}</p>
      <zw-button
        variant="outline"
        size="sm"
        aria-label={t('Retry loading traffic')}
        onClick={onRetry}
      >
        {t('Try again')}
      </zw-button>
    </div>
  )
}

function renderEmptyState(search: string): JSX.Element {
  return (
    <div class="traffic-state traffic-state-empty" data-state="empty">
      <span class="traffic-state-icon" aria-hidden="true">
        {search ? '/' : '0'}
      </span>
      <h3>{t(search ? 'No matching requests' : 'No requests captured')}</h3>
      <p>
        {search
          ? t('Try a different path or method.')
          : t('Captured requests will appear here as your app runs.')}
      </p>
    </div>
  )
}

function renderRequestRow(
  record: RequestRecord,
  selected: RequestRecord | null,
  onSelect: (record: RequestRecord) => void,
  onCreateRule: (record: RequestRecord) => void,
): JSX.Element {
  const key = recordKey(record)
  return (
    <tr
      key={key}
      data-request-id={key}
      data-selected={function () {
        return selected !== null && recordKey(selected) === key
          ? 'true'
          : 'false'
      }}
      tabIndex={0}
      aria-label={record.url + ' ' + methodLabel(record)}
      onClick={function () {
        onSelect(record)
      }}
      onKeyDown={function (event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(record)
        }
      }}
    >
      <td class="traffic-cell-route">
        <strong>{record.url}</strong>
        <small>{formatTimestamp(record.timestamp)}</small>
      </td>
      <td>
        <span class="traffic-method" data-method={methodLabel(record)}>
          {methodLabel(record)}
        </span>
      </td>
      <td>
        <span class="traffic-status" data-status-tone={statusTone(record)}>
          {statusLabel(record)}
        </span>
      </td>
      <td>
        <span
          class="traffic-mock-state"
          data-mocked={record.isMocked ? 'true' : 'false'}
        >
          {record.isMocked ? t('Mock hit') : t('Network')}
        </span>
      </td>
      <td class="traffic-cell-duration">{formatDuration(record.duration)}</td>
      <td class="traffic-cell-action">
        <zw-button
          variant="ghost"
          size="icon"
          aria-label={t('Create rule for request')}
          title={t('Create rule')}
          onClick={function (event: MouseEvent) {
            event.stopPropagation()
            onCreateRule(record)
          }}
        >
          <zw-icon-plus size="16" />
        </zw-button>
      </td>
    </tr>
  )
}

function renderTrafficTable(
  model: TrafficModel,
  onSelect: (record: RequestRecord) => void,
  onCreateRule: (record: RequestRecord) => void,
): JSX.Element {
  return (
    <div class="traffic-table-wrap">
      <table class="traffic-table">
        <thead>
          <tr>
            <th>{t('Route')}</th>
            <th>{t('Method')}</th>
            <th>{t('Status')}</th>
            <th>{t('Source')}</th>
            <th>{t('Time')}</th>
            <th aria-label={t('Actions')} />
          </tr>
        </thead>
        <tbody>
          {model.records.map(function (record) {
            return renderRequestRow(
              record,
              model.selected,
              onSelect,
              onCreateRule,
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function TrafficWorkspace(
  props: TrafficWorkspaceProps,
): JSX.Element {
  const model = state<TrafficModel>(createInitialModel())
  const client = props.client
  let active = true
  let requestSequence = 0

  function applyPage(
    result: Page<RequestRecord>,
    search: string,
    requestedPage: number,
  ): void {
    const pagination = result.pagination
    const items = Array.isArray(result.items) ? result.items.slice() : []
    const pageSize =
      pagination && pagination.pageSize > 0
        ? pagination.pageSize
        : DEFAULT_PAGE_SIZE
    const total =
      pagination && pagination.total >= 0 ? pagination.total : items.length
    let totalPages = pagination ? pagination.totalPages : undefined
    if (!totalPages || totalPages < 1) {
      totalPages = Math.max(1, Math.ceil(total / pageSize))
    }

    model.records = items
    const safeRequestedPage = requestedPage > 0 ? requestedPage : 1
    model.page = Math.min(safeRequestedPage, totalPages)
    model.pageSize = pageSize
    model.total = total
    model.totalPages = totalPages
    model.activeSearch = search
    model.selected = findSelected(items, model.selected)
  }

  function finishLoadError(error: unknown, sequence: number): void {
    if (!active || sequence !== requestSequence) {
      return
    }
    model.loading = false
    model.error = getErrorMessage(error)
  }

  function loadRequests(targetPage: number, search: string): void {
    const sequence = requestSequence + 1
    requestSequence = sequence
    model.loading = true
    model.error = ''

    const query: DashboardQuery = {
      page: targetPage > 0 ? targetPage : 1,
      pageSize: model.pageSize > 0 ? model.pageSize : DEFAULT_PAGE_SIZE,
    }
    if (search) {
      query.search = search
    }

    let request: Promise<Page<RequestRecord>>
    try {
      request = fetchRequestHistory(query)
    } catch (error) {
      finishLoadError(error, sequence)
      return
    }

    request.then(
      function (result) {
        if (!active || sequence !== requestSequence) {
          return
        }
        applyPage(result, search, query.page)
        model.loading = false
      },
      function (error) {
        finishLoadError(error, sequence)
      },
    )
  }

  function handleSelect(record: RequestRecord): void {
    model.selected = record
  }

  function handleSearch(): void {
    loadRequests(1, model.searchInput.trim())
  }

  function handleRefresh(): void {
    loadRequests(model.page, model.activeSearch)
  }

  function handleRetry(): void {
    loadRequests(model.page, model.activeSearch)
  }

  function handlePageChange(page: number): void {
    if (page < 1 || page > model.totalPages || page === model.page) {
      return
    }
    loadRequests(page, model.activeSearch)
  }

  function handleRecorded(data: unknown): void {
    if (!isRequestRecord(data) || !matchesSearch(data, model.activeSearch)) {
      return
    }

    const key = recordKey(data)
    for (let index = 0; index < model.records.length; index++) {
      if (recordKey(model.records[index]) === key) {
        return
      }
    }

    model.total += 1
    model.totalPages = Math.max(1, Math.ceil(model.total / model.pageSize))
    if (model.page !== 1) {
      return
    }

    const nextRecords = [data].concat(model.records)
    model.records = nextRecords.slice(0, model.pageSize)
    if (!model.selected) {
      model.selected = data
    }
  }

  function handleCleared(): void {
    model.records = []
    model.selected = null
    model.total = 0
    model.totalPages = 1
    model.page = 1
    model.loading = false
    model.error = ''
  }

  function finishClearError(error: unknown): void {
    if (!active) {
      return
    }
    model.clearing = false
    model.error = getErrorMessage(error)
  }

  function handleClear(): void {
    if (model.clearing || model.loading) {
      return
    }
    if (!window.confirm(t('Clear all captured request history?'))) {
      return
    }

    model.clearing = true
    model.error = ''
    let request: Promise<{ success: boolean }>
    try {
      request = clearRequestHistory(null)
    } catch (error) {
      finishClearError(error)
      return
    }

    request.then(function (result) {
      if (!active) {
        return
      }
      if (!result.success) {
        finishClearError(new Error(t('Request history could not be cleared')))
        return
      }
      model.clearing = false
      handleCleared()
    }, finishClearError)
  }

  if (client) {
    client.on(WSMessageType.REQUEST_RECORDED, handleRecorded)
    client.on(WSMessageType.REQUEST_CLEARED, handleCleared)
  }

  loadRequests(1, '')

  onCleanup(function () {
    active = false
    requestSequence += 1
    if (client) {
      client.off(WSMessageType.REQUEST_RECORDED, handleRecorded)
      client.off(WSMessageType.REQUEST_CLEARED, handleCleared)
    }
  })

  return (
    <section class="traffic-workspace" aria-labelledby="traffic-title">
      <header class="workspace-header traffic-header">
        <div>
          <span class="workspace-eyebrow">{t('Live network inspector')}</span>
          <h1 id="traffic-title">{t('Traffic')}</h1>
          <p class="workspace-description">
            {t(
              'Capture, inspect, and turn real exchanges into deterministic mock rules.',
            )}
          </p>
        </div>
        <div class="workspace-actions traffic-actions">
          <zw-button
            variant="ghost"
            size="md"
            aria-label={t('Refresh traffic')}
            disabled={function () {
              return model.loading || model.clearing
            }}
            onClick={handleRefresh}
          >
            {t('Refresh')}
          </zw-button>
          <zw-button
            variant="outline"
            size="md"
            aria-label={t('Clear traffic')}
            disabled={function () {
              return model.loading || model.clearing
            }}
            loading={function () {
              return model.clearing
            }}
            onClick={handleClear}
          >
            {t('Clear')}
          </zw-button>
        </div>
      </header>

      <div class="traffic-toolbar">
        <form
          class="traffic-search"
          role="search"
          onSubmit={function (event: SubmitEvent) {
            event.preventDefault()
            handleSearch()
          }}
        >
          <zw-input
            type="search"
            size="md"
            aria-label={t('Search captured requests')}
            placeholder={t('Search path or method')}
            value={function () {
              return model.searchInput
            }}
            onValue-change={function (event: Event) {
              model.searchInput = readSearchValue(event)
            }}
          />
          <zw-button
            variant="primary"
            size="md"
            aria-label={t('Search traffic')}
            type="submit"
            disabled={function () {
              return model.loading || model.clearing
            }}
          >
            {t('Search')}
          </zw-button>
        </form>
        <div class="traffic-toolbar-summary" aria-live="polite">
          {dynamic(function () {
            return totalLabel(model.total)
          })}
        </div>
      </div>

      {dynamic(function () {
        if (model.error && model.records.length > 0) {
          return (
            <p
              class="traffic-inline-error"
              data-state="inline-error"
              aria-live="polite"
            >
              {model.error}
            </p>
          )
        }
        return null
      })}

      <div class="traffic-content">
        <section
          class="traffic-list-panel"
          aria-labelledby="traffic-list-title"
        >
          <header class="traffic-list-header">
            <div>
              <span class="workspace-eyebrow">{t('Captured exchanges')}</span>
              <h2 id="traffic-list-title">{t('Recent requests')}</h2>
            </div>
            {dynamic(function () {
              return model.loading && model.records.length > 0 ? (
                <span class="traffic-refreshing" data-state="refreshing">
                  {t('Updating...')}
                </span>
              ) : null
            })}
          </header>
          {dynamic(function () {
            if (model.loading && model.records.length === 0) {
              return renderLoadingState()
            }
            if (model.error && model.records.length === 0) {
              return renderErrorState(model.error, handleRetry)
            }
            if (model.records.length === 0) {
              return renderEmptyState(model.activeSearch)
            }
            return renderTrafficTable(model, handleSelect, props.onCreateRule)
          })}
          <footer class="traffic-pagination">
            {dynamic(function () {
              return totalLabel(model.total)
            })}
            <div class="traffic-pagination-controls">
              <zw-button
                variant="outline"
                size="icon"
                aria-label={t('Previous page')}
                title={t('Previous page')}
                disabled={function () {
                  return model.page <= 1 || model.loading || model.clearing
                }}
                onClick={function () {
                  handlePageChange(model.page - 1)
                }}
              >
                <zw-icon-chevron-left size="16" />
              </zw-button>
              <span class="traffic-page-number">
                {dynamic(function () {
                  return model.page + ' / ' + model.totalPages
                })}
              </span>
              <zw-button
                variant="outline"
                size="icon"
                aria-label={t('Next page')}
                title={t('Next page')}
                disabled={function () {
                  return (
                    model.page >= model.totalPages ||
                    model.loading ||
                    model.clearing
                  )
                }}
                onClick={function () {
                  handlePageChange(model.page + 1)
                }}
              >
                <zw-icon-chevron-right size="16" />
              </zw-button>
            </div>
          </footer>
        </section>

        {dynamic(function () {
          return (
            <TrafficDetail
              record={model.selected}
              onCreateRule={props.onCreateRule}
            />
          )
        })}
      </div>
    </section>
  )
}
