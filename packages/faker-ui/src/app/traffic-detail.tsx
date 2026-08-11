import type { RequestRecord } from '@baicie/faker-shared'
import { state } from '@zeus-js/zeus'
import { dynamic } from '../lib/zeus'
import { formatDuration, formatTrafficValue } from './traffic-utils'

export interface TrafficDetailProps {
  record: RequestRecord | null
  onCreateRule: (record: RequestRecord) => void
}

type DetailTab = 'request' | 'response'

interface TabChangeDetail {
  value: string
}

function readTab(event: Event): DetailTab {
  const detail = (event as CustomEvent<TabChangeDetail>).detail
  if (detail && detail.value === 'response') {
    return 'response'
  }
  return 'request'
}

function methodLabel(record: RequestRecord): string {
  const method = record.method.trim().toUpperCase()
  return method || 'GET'
}

function statusLabel(record: RequestRecord): string {
  if (!record.response) {
    return 'Pending'
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

function renderDataBlock(
  label: string,
  value: unknown,
  extraClass = '',
): JSX.Element {
  return (
    <section class={'traffic-detail-block ' + extraClass}>
      <div class="traffic-detail-block-heading">
        <span>{label}</span>
      </div>
      <pre class="traffic-code-value">{formatTrafficValue(value)}</pre>
    </section>
  )
}

function renderRequestTab(record: RequestRecord): JSX.Element {
  return (
    <div class="traffic-detail-tab-panel" data-detail-panel="request">
      <div class="traffic-detail-summary-grid">
        <div class="traffic-detail-summary-item">
          <span class="traffic-detail-label">Method</span>
          <strong>{methodLabel(record)}</strong>
        </div>
        <div class="traffic-detail-summary-item">
          <span class="traffic-detail-label">Captured</span>
          <strong>{new Date(record.timestamp).toLocaleString()}</strong>
        </div>
      </div>
      {renderDataBlock('Request headers', record.headers)}
      {record.query ? renderDataBlock('Query parameters', record.query) : null}
      {record.body !== undefined
        ? renderDataBlock(
            'Request body',
            record.body,
            'traffic-detail-block-tall',
          )
        : null}
    </div>
  )
}

function renderResponseTab(record: RequestRecord): JSX.Element {
  if (!record.response) {
    return (
      <div class="traffic-detail-tab-panel traffic-detail-empty-response">
        <span class="traffic-empty-mark">...</span>
        <h3>Response not captured</h3>
        <p>The request ended before a response payload was available.</p>
      </div>
    )
  }

  return (
    <div class="traffic-detail-tab-panel" data-detail-panel="response">
      <div class="traffic-detail-summary-grid">
        <div class="traffic-detail-summary-item">
          <span class="traffic-detail-label">HTTP status</span>
          <strong data-status-tone={statusTone(record)}>
            {String(record.response.statusCode)}
          </strong>
        </div>
        <div class="traffic-detail-summary-item">
          <span class="traffic-detail-label">Duration</span>
          <strong>{formatDuration(record.duration)}</strong>
        </div>
      </div>
      {renderDataBlock('Response headers', record.response.headers)}
      {renderDataBlock(
        'Response body',
        record.response.body,
        'traffic-detail-block-tall',
      )}
    </div>
  )
}

export default function TrafficDetail(props: TrafficDetailProps): JSX.Element {
  const selectedTab = state<DetailTab>('request')

  return (
    <aside class="traffic-detail" aria-labelledby="traffic-detail-title">
      <header class="traffic-detail-header">
        <div class="traffic-detail-heading">
          <span class="workspace-eyebrow">Selected exchange</span>
          <h2 id="traffic-detail-title">Request details</h2>
        </div>
        {dynamic(function () {
          if (!props.record) {
            return null
          }
          return (
            <zw-button
              variant="primary"
              size="sm"
              aria-label="Create rule from request"
              onClick={function () {
                if (props.record) {
                  props.onCreateRule(props.record)
                }
              }}
            >
              Create rule
            </zw-button>
          )
        })}
      </header>

      {dynamic(function () {
        const record = props.record
        if (!record) {
          return (
            <div class="traffic-detail-empty" data-state="empty-detail">
              <span class="traffic-empty-mark">+</span>
              <h3>Select a request to inspect it</h3>
              <p>
                Select a captured exchange to inspect its request and response.
              </p>
            </div>
          )
        }

        return (
          <div class="traffic-detail-content">
            <div class="traffic-detail-route">
              <span class="traffic-method" data-method={methodLabel(record)}>
                {methodLabel(record)}
              </span>
              <code title={record.url}>{record.url}</code>
              <span
                class="traffic-status"
                data-status-tone={statusTone(record)}
              >
                {statusLabel(record)}
              </span>
              <span class="traffic-detail-duration">
                {formatDuration(record.duration)}
              </span>
            </div>
            <div class="traffic-detail-meta">
              <span>{record.isMocked ? 'Mock hit' : 'Network response'}</span>
              {record.mockId ? <code>#{record.mockId}</code> : null}
            </div>

            <zw-tabs
              value={function () {
                return selectedTab.value
              }}
              aria-label="Request detail views"
              onValue-change={function (event: Event) {
                selectedTab.value = readTab(event)
              }}
            >
              <zw-tabs-list class="traffic-detail-tabs">
                <zw-tabs-trigger value="request">Request</zw-tabs-trigger>
                <zw-tabs-trigger value="response">Response</zw-tabs-trigger>
              </zw-tabs-list>
              <zw-tabs-content value="request">
                {dynamic(function () {
                  return selectedTab.value === 'request'
                    ? renderRequestTab(record)
                    : null
                })}
              </zw-tabs-content>
              <zw-tabs-content value="response">
                {dynamic(function () {
                  return selectedTab.value === 'response'
                    ? renderResponseTab(record)
                    : null
                })}
              </zw-tabs-content>
            </zw-tabs>
          </div>
        )
      })}
    </aside>
  )
}
