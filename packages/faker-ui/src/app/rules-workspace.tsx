import type {
  DashboardQuery,
  MockConfig,
  Page,
  WSClient,
} from '@baicie/faker-shared'
import { WSMessageType } from '@baicie/faker-shared/browser'
import { effect, onCleanup, state } from '@zeus-js/zeus'
import {
  deleteMock,
  fetchGroups,
  fetchMockList,
  importMocks,
  updateMock,
} from '../api'
import type { FakerTheme } from '../api/setting'
import { dynamic, focusZeusControl, getErrorMessage } from '../lib/zeus'
import { t } from '../i18n'
import RuleEditor from './rule-editor'
import { getRuleIdentity } from './rule-editor-utils'
import { parseOpenApiImport } from './openapi-import-utils'

export interface RulesWorkspaceProps {
  client: WSClient
  theme: () => FakerTheme
  draft?: () => MockConfig | null
  onDraftConsumed?: () => void
  onRuleSaved?: (rule: MockConfig, fromTraffic: boolean) => void
}

interface RulesWorkspaceState {
  rules: MockConfig[]
  groups: string[]
  search: string
  group: string
  page: number
  pageSize: number
  total: number
  totalPages: number
  loading: boolean
  error: string
  pendingId: string
  editorOpen: boolean
  editorRule: MockConfig | null
  editorCreate: boolean
  importOpen: boolean
  importSource: string
  importPreview: MockConfig[]
  importStatus: ImportStatus
  importProgress: number
  importError: string
}

type ImportStatus = 'idle' | 'preview' | 'importing' | 'error'

interface ValueChangeDetail {
  value: string
}

interface CheckedChangeDetail {
  checked: boolean
}

interface ZeusDialogElement extends HTMLElement {
  show(): void
}

interface MockConfigUpdateHandler {
  (data: MockConfig[]): void
}

const PAGE_SIZE = 12
const SEARCH_DELAY = 180
const REMOTE_REFRESH_DELAY = 40

function readValueChange(event: Event): string {
  const detail = (event as CustomEvent<ValueChangeDetail>).detail
  if (detail && typeof detail.value === 'string') {
    return detail.value
  }
  const target = event.target
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
    ? target.value
    : ''
}

function readCheckedChange(event: Event): boolean {
  const detail = (event as CustomEvent<CheckedChangeDetail>).detail
  if (detail && typeof detail.checked === 'boolean') {
    return detail.checked
  }
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}

function getTotalPages(page: Page<MockConfig>): number {
  if (page.pagination.totalPages !== undefined) {
    return Math.max(1, page.pagination.totalPages)
  }
  return Math.max(
    1,
    Math.ceil(page.pagination.total / page.pagination.pageSize),
  )
}

function formatRuleType(type: MockConfig['type']): string {
  if (type === 'stateful') return t('Stateful')
  if (type === 'template') return t('Template')
  if (type === 'function') return t('Function')
  if (type === 'proxy') return t('Proxy')
  if (type === 'error') return t('Error')
  return t('Static')
}

function renderGroupOptions(groups: string[]): JSX.Element[] {
  const options: JSX.Element[] = [
    <option value="" key="all">
      {t('All groups')}
    </option>,
    <option value="__none__" key="ungrouped">
      {t('Ungrouped')}
    </option>,
  ]
  groups.forEach(function (group) {
    options.push(
      <option value={group} key={group}>
        {group}
      </option>,
    )
  })
  return options
}

function renderTags(rule: MockConfig): JSX.Element {
  if (!rule.tags || rule.tags.length === 0) {
    return <span class="rule-table-muted">{t('No tags')}</span>
  }
  return (
    <span class="rule-tags">
      {rule.tags.slice(0, 2).map(function (tag) {
        return (
          <span class="rule-tag" key={tag}>
            {tag}
          </span>
        )
      })}
      {rule.tags.length > 2 ? (
        <span class="rule-tag-count">+{rule.tags.length - 2}</span>
      ) : null}
    </span>
  )
}

export default function RulesWorkspace(
  props: RulesWorkspaceProps,
): JSX.Element {
  const view = state<RulesWorkspaceState>({
    rules: [],
    groups: [],
    search: '',
    group: '',
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    loading: false,
    error: '',
    pendingId: '',
    editorOpen: false,
    editorRule: null,
    editorCreate: true,
    importOpen: false,
    importSource: '',
    importPreview: [],
    importStatus: 'idle',
    importProgress: 0,
    importError: '',
  })

  let disposed = false
  let requestVersion = 0
  let searchTimer: number | undefined
  let refreshTimer: number | undefined
  let importReturnFocus: HTMLElement | null = null
  let importCloseControl: HTMLElement | null = null
  let importFocusTimer: number | undefined
  let createRuleControl: HTMLElement | null = null
  let editorReturnFocus: HTMLElement | null = null
  let editorFocusTimer: number | undefined
  let editorFromTraffic = false

  function createQuery(): DashboardQuery {
    const query: DashboardQuery = {
      page: view.page,
      pageSize: view.pageSize,
    }
    if (view.search.trim()) {
      query.search = view.search.trim()
    }
    if (view.group) {
      query.group = view.group
    }
    return query
  }

  function loadRules(): Promise<void> {
    const version = ++requestVersion
    view.loading = true
    view.error = ''

    return fetchMockList(createQuery()).then(
      function (result) {
        if (disposed || version !== requestVersion) {
          return
        }
        view.rules = result.items
        view.page = result.pagination.page
        view.pageSize = result.pagination.pageSize
        view.total = result.pagination.total
        view.totalPages = getTotalPages(result)
        view.loading = false
      },
      function (error: unknown) {
        if (disposed || version !== requestVersion) {
          return
        }
        view.loading = false
        view.error = getErrorMessage(error)
      },
    )
  }

  function loadGroups(): Promise<void> {
    return fetchGroups().then(
      function (groups) {
        if (!disposed) {
          view.groups = groups
        }
      },
      function (error: unknown) {
        if (!disposed) {
          view.error = getErrorMessage(error)
        }
      },
    )
  }

  function refreshWorkspace(): void {
    loadRules()
    loadGroups()
  }

  function scheduleRemoteRefresh(): void {
    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer)
    }
    refreshTimer = window.setTimeout(function () {
      refreshTimer = undefined
      refreshWorkspace()
    }, REMOTE_REFRESH_DELAY)
  }

  function scheduleSearch(): void {
    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer)
    }
    searchTimer = window.setTimeout(function () {
      searchTimer = undefined
      view.page = 1
      loadRules()
    }, SEARCH_DELAY)
  }

  function openEditor(
    rule: MockConfig | null,
    create: boolean,
    trigger?: HTMLElement | null,
    fromTraffic = false,
  ): void {
    const active = document.activeElement
    editorReturnFocus =
      trigger ||
      (active instanceof HTMLElement && active !== document.body
        ? active
        : createRuleControl)
    view.editorRule = rule
    view.editorCreate = create
    editorFromTraffic = fromTraffic
    view.editorOpen = true
  }

  function closeEditor(): void {
    const returnFocus = editorReturnFocus
    editorReturnFocus = null
    view.editorOpen = false
    view.editorRule = null
    view.editorCreate = true
    editorFromTraffic = false
    if (editorFocusTimer !== undefined) {
      window.clearTimeout(editorFocusTimer)
    }
    editorFocusTimer = window.setTimeout(function () {
      editorFocusTimer = undefined
      focusZeusControl(returnFocus)
    }, 0)
  }

  function handleSaved(rule: MockConfig): void {
    const fromTraffic = editorFromTraffic
    closeEditor()
    refreshWorkspace()
    if (props.onRuleSaved) {
      props.onRuleSaved(rule, fromTraffic)
    }
  }

  function openImport(): void {
    importReturnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    view.importOpen = true
    view.importSource = ''
    view.importPreview = []
    view.importStatus = 'idle'
    view.importProgress = 0
    view.importError = ''
    if (importFocusTimer !== undefined) {
      window.clearTimeout(importFocusTimer)
    }
    if (editorFocusTimer !== undefined) {
      window.clearTimeout(editorFocusTimer)
    }
    importFocusTimer = window.setTimeout(function () {
      importFocusTimer = undefined
      focusZeusControl(importCloseControl)
    }, 0)
  }

  function handleImportDialogChange(event: Event): void {
    const detail = (event as CustomEvent<{ open: boolean }>).detail
    if (!detail || detail.open) {
      return
    }
    if (view.importStatus === 'importing') {
      const dialog = event.currentTarget as ZeusDialogElement
      dialog.show()
      return
    }
    closeImport()
  }

  function closeImport(): void {
    if (view.importStatus === 'importing') {
      return
    }
    view.importOpen = false
    view.importSource = ''
    view.importPreview = []
    view.importStatus = 'idle'
    view.importProgress = 0
    view.importError = ''
    if (importFocusTimer !== undefined) {
      window.clearTimeout(importFocusTimer)
      importFocusTimer = undefined
    }
    if (importReturnFocus && importReturnFocus.isConnected) {
      importReturnFocus.focus()
    }
    importReturnFocus = null
  }

  function parseImport(): void {
    view.importError = ''
    try {
      view.importPreview = parseOpenApiImport(view.importSource)
      view.importStatus = 'preview'
    } catch (error: unknown) {
      view.importPreview = []
      view.importStatus = 'error'
      view.importError = getErrorMessage(error)
    }
  }

  function confirmImport(): void {
    if (view.importStatus !== 'preview' || view.importPreview.length === 0) {
      return
    }
    view.importStatus = 'importing'
    view.importProgress = 0
    view.importError = ''
    const expectedCount = view.importPreview.length
    importMocks(view.importPreview).then(
      function (result) {
        if (disposed || view.importStatus !== 'importing') {
          return
        }
        view.importProgress = result.count
        if (!result.success || result.count !== expectedCount) {
          view.importStatus = 'error'
          view.importError = t('Imported {{count}} of {{total}} rules.', {
            count: result.count,
            total: expectedCount,
          })
          return
        }
        refreshWorkspace()
        view.importStatus = 'idle'
        closeImport()
      },
      function (error: unknown) {
        if (disposed) {
          return
        }
        view.importStatus = 'error'
        view.importError = t('Import failed: {{error}}', {
          error: getErrorMessage(error),
        })
      },
    )
  }

  function handleToggle(rule: MockConfig, enabled: boolean): void {
    const id = rule.id
    if (!id || view.pendingId) {
      if (!id) view.error = t('This rule has no persistent ID')
      return
    }

    view.pendingId = id
    view.error = ''
    updateMock({ id, updates: { enabled } }).then(
      function (result) {
        view.pendingId = ''
        if (!result.success) {
          view.error = t('Update conflict detected')
          return
        }
        loadRules()
      },
      function (error: unknown) {
        view.pendingId = ''
        view.error = t('The rule could not be updated: {{error}}', {
          error: getErrorMessage(error),
        })
      },
    )
  }

  function handleDelete(rule: MockConfig): void {
    const id = rule.id
    if (!id || view.pendingId) {
      if (!id) view.error = t('This rule has no persistent ID')
      return
    }
    if (
      !window.confirm(
        t('Delete rule "{{name}}"?', { name: rule.name || rule.url }),
      )
    ) {
      return
    }

    view.pendingId = id
    view.error = ''
    deleteMock({ id }).then(
      function (result) {
        view.pendingId = ''
        if (!result.success) {
          view.error = t('The rule could not be deleted')
          return
        }
        if (view.rules.length === 1 && view.page > 1) {
          view.page -= 1
        }
        refreshWorkspace()
      },
      function (error: unknown) {
        view.pendingId = ''
        view.error = t('The rule could not be deleted: {{error}}', {
          error: getErrorMessage(error),
        })
      },
    )
  }

  function goToPage(page: number): void {
    if (view.loading || page < 1 || page > view.totalPages) {
      return
    }
    view.page = page
    loadRules()
  }

  const handleConfigUpdated: MockConfigUpdateHandler = function () {
    scheduleRemoteRefresh()
  }
  props.client.on(WSMessageType.MOCK_CONFIG_UPDATED, handleConfigUpdated)

  const draftEffect = effect(function () {
    const incoming = props.draft ? props.draft() : null
    if (!incoming) {
      return
    }
    openEditor(incoming, true, null, true)
    if (props.onDraftConsumed) {
      props.onDraftConsumed()
    }
  })

  onCleanup(function () {
    disposed = true
    requestVersion += 1
    props.client.off(WSMessageType.MOCK_CONFIG_UPDATED, handleConfigUpdated)
    draftEffect.effect.stop()
    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer)
    }
    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer)
    }
    if (importFocusTimer !== undefined) {
      window.clearTimeout(importFocusTimer)
    }
  })

  refreshWorkspace()

  return (
    <section class="rules-workspace" data-workspace="rules">
      <header class="workspace-toolbar rules-toolbar">
        <div class="workspace-heading">
          <span class="studio-eyebrow">{t('Interception registry')}</span>
          <h1>{t('Rules')}</h1>
          <p>
            {t(
              'Define exactly which requests are intercepted and what response is returned.',
            )}
          </p>
        </div>
        <zw-button
          variant="primary"
          ref={function (element: HTMLElement | null): void {
            createRuleControl = element
          }}
          onClick={function (event: MouseEvent) {
            openEditor(null, true, event.currentTarget as HTMLElement)
          }}
        >
          <zw-icon-plus size="16" aria-hidden="true" />
          <span>{t('Create rule')}</span>
        </zw-button>
        <zw-button
          variant="outline"
          onClick={openImport}
          aria-label={t('Import OpenAPI')}
        >
          <zw-icon-upload size="16" aria-hidden="true" />
          <span>{t('Import OpenAPI')}</span>
        </zw-button>
      </header>

      <div class="rules-filterbar">
        <label class="rules-search">
          <span class="sr-only">{t('Search rules')}</span>
          <zw-icon-search size="16" aria-hidden="true" />
          <zw-input
            type="search"
            placeholder={t('Search URL, method, or description')}
            value={function () {
              return view.search
            }}
            onValue-change={function (event: Event) {
              view.search = readValueChange(event)
              scheduleSearch()
            }}
          />
        </label>
        <label class="rules-group-filter">
          <span class="sr-only">{t('Filter by group')}</span>
          {dynamic(function () {
            return (
              <zw-select
                aria-label={t('Filter by group')}
                value={function () {
                  return view.group
                }}
                onValue-change={function (event: Event) {
                  view.group = readValueChange(event)
                  view.page = 1
                  loadRules()
                }}
              >
                {renderGroupOptions(view.groups)}
              </zw-select>
            )
          })}
        </label>
        <span class="rules-result-count">
          {dynamic(function () {
            return view.total + ' ' + t(view.total === 1 ? 'rule' : 'rules')
          })}
        </span>
      </div>

      {dynamic(function () {
        if (!view.error) {
          return <span class="workspace-notice" data-level="error" />
        }
        return (
          <div class="workspace-notice" data-level="error" role="alert">
            <zw-icon-alert-triangle size="16" aria-hidden="true" />
            <span>{view.error}</span>
            <zw-button
              variant="ghost"
              size="sm"
              onClick={function () {
                refreshWorkspace()
              }}
            >
              {t('Retry')}
            </zw-button>
          </div>
        )
      })}

      <div
        class="rules-table-shell"
        aria-busy={function () {
          return view.loading
        }}
      >
        <table class="rules-table">
          <thead>
            <tr>
              <th scope="col">{t('Rule')}</th>
              <th scope="col">{t('Method')}</th>
              <th scope="col">{t('Response')}</th>
              <th scope="col">{t('Group / Tags')}</th>
              <th scope="col">{t('Enabled')}</th>
              <th scope="col">
                <span class="sr-only">{t('Actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {dynamic(function () {
              if (view.loading && view.rules.length === 0) {
                return (
                  <tr>
                    <td colspan={6} class="rules-empty-state">
                      <zw-icon-loader size="18" aria-hidden="true" />
                      <span>{t('Loading rules...')}</span>
                    </td>
                  </tr>
                )
              }
              if (view.rules.length === 0) {
                return (
                  <tr>
                    <td colspan={6} class="rules-empty-state">
                      <strong>{t('No rules found')}</strong>
                      <span>
                        {view.search || view.group
                          ? t('Adjust the filters to see more rules.')
                          : t(
                              'Create the first response rule for this project.',
                            )}
                      </span>
                    </td>
                  </tr>
                )
              }

              return view.rules.map(function (rule) {
                const identity = getRuleIdentity(rule)
                const pending = view.pendingId === identity
                return (
                  <tr
                    key={identity}
                    data-disabled={rule.enabled ? undefined : ''}
                  >
                    <td>
                      <button
                        class="rule-primary-cell"
                        type="button"
                        onClick={function (event: MouseEvent) {
                          openEditor(
                            rule,
                            false,
                            event.currentTarget as HTMLElement,
                          )
                        }}
                      >
                        <strong>{rule.name || rule.url}</strong>
                        <code>{rule.url}</code>
                        <small>{rule.description || t('No description')}</small>
                      </button>
                    </td>
                    <td>
                      <span
                        class="http-method"
                        data-method={rule.method.toLowerCase()}
                      >
                        {rule.method.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span class="rule-type" data-type={rule.type}>
                        {formatRuleType(rule.type)}
                      </span>
                    </td>
                    <td>
                      <div class="rule-taxonomy">
                        <span>{rule.group || t('Ungrouped')}</span>
                        {renderTags(rule)}
                      </div>
                    </td>
                    <td>
                      <zw-switch
                        checked={function () {
                          return rule.enabled
                        }}
                        disabled={function () {
                          return pending || Boolean(view.pendingId)
                        }}
                        aria-label={
                          (rule.enabled ? t('Disable') : t('Enable')) +
                          ' ' +
                          (rule.name || rule.url)
                        }
                        onChecked-change={function (event: Event) {
                          handleToggle(rule, readCheckedChange(event))
                        }}
                      />
                    </td>
                    <td>
                      <div class="rule-row-actions">
                        <zw-button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={function (event: MouseEvent) {
                            openEditor(
                              rule,
                              false,
                              event.currentTarget as HTMLElement,
                            )
                          }}
                        >
                          {t('Edit')}
                        </zw-button>
                        <zw-button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            t('Delete rule') + ': ' + (rule.name || rule.url)
                          }
                          title={t('Delete rule')}
                          disabled={function () {
                            return pending || Boolean(view.pendingId)
                          }}
                          onClick={function () {
                            handleDelete(rule)
                          }}
                        >
                          <zw-icon-trash size="16" aria-hidden="true" />
                        </zw-button>
                      </div>
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      <footer class="rules-pagination" aria-label={t('Rules pagination')}>
        <span>
          {dynamic(function () {
            if (view.total === 0) return '0 ' + t('results')
            const first = (view.page - 1) * view.pageSize + 1
            const last = Math.min(view.page * view.pageSize, view.total)
            return first + '-' + last + ' / ' + view.total
          })}
        </span>
        <div>
          <zw-button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('Previous page')}
            disabled={function () {
              return view.loading || view.page <= 1
            }}
            onClick={function () {
              goToPage(view.page - 1)
            }}
          >
            <zw-icon-chevron-left size="16" aria-hidden="true" />
          </zw-button>
          <span class="rules-page-indicator">
            {dynamic(function () {
              return t('Page {{page}} of {{totalPages}}', {
                page: view.page,
                totalPages: view.totalPages,
              })
            })}
          </span>
          <zw-button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('Next page')}
            disabled={function () {
              return view.loading || view.page >= view.totalPages
            }}
            onClick={function () {
              goToPage(view.page + 1)
            }}
          >
            <zw-icon-chevron-right size="16" aria-hidden="true" />
          </zw-button>
        </div>
      </footer>

      {dynamic(function () {
        if (!view.editorOpen) {
          return null
        }
        return (
          <RuleEditor
            rule={view.editorRule}
            create={view.editorCreate}
            useStableIdentity={editorFromTraffic}
            theme={props.theme}
            onCancel={closeEditor}
            onSaved={handleSaved}
          />
        )
      })}

      {dynamic(function () {
        if (!view.importOpen) {
          return null
        }
        return (
          <zw-dialog
            open={true}
            modal={true}
            onOpen-change={handleImportDialogChange}
          >
            <zw-dialog-content>
              <div class="rule-editor-backdrop openapi-import-backdrop">
                <section class="rule-editor openapi-import-surface">
                  <header class="rule-editor-header">
                    <div>
                      <span class="rule-editor-kicker">
                        {t('Schema ingestion')}
                      </span>
                      <zw-dialog-title>
                        <h2 id="openapi-import-title">{t('Import OpenAPI')}</h2>
                      </zw-dialog-title>
                    </div>
                    <zw-button
                      variant="ghost"
                      size="icon"
                      aria-label={t('Close OpenAPI import')}
                      title={t('Close')}
                      ref={function (element: HTMLElement | null): void {
                        importCloseControl = element
                      }}
                      disabled={function () {
                        return view.importStatus === 'importing'
                      }}
                      onClick={closeImport}
                    >
                      <zw-icon-x size="18" aria-hidden="true" />
                    </zw-button>
                  </header>
                  <div class="rule-editor-scroll openapi-import-scroll">
                    <zw-dialog-description>
                      <p class="openapi-import-intro">
                        {t(
                          'Paste an OpenAPI 3 or Swagger 2 JSON document. Rules are previewed before they are created.',
                        )}
                      </p>
                    </zw-dialog-description>
                    <label class="rule-field rule-field-wide">
                      <span class="rule-field-label">
                        {t('Specification JSON')}
                      </span>
                      <textarea
                        class="rule-code-input openapi-import-source"
                        aria-label={t('OpenAPI JSON specification')}
                        value={function () {
                          return view.importSource
                        }}
                        disabled={function () {
                          return view.importStatus === 'importing'
                        }}
                        onInput={function (event: Event) {
                          view.importSource = readValueChange(event)
                          view.importStatus = 'idle'
                          view.importError = ''
                        }}
                      />
                    </label>
                    {view.importError ? (
                      <div
                        class="workspace-notice"
                        data-level="error"
                        role="alert"
                      >
                        <zw-icon-alert-triangle size="16" aria-hidden="true" />
                        <span>{view.importError}</span>
                      </div>
                    ) : null}
                    {view.importStatus === 'preview' ? (
                      <div class="openapi-import-preview" role="status">
                        <strong>
                          {t('{{count}} rules ready to import', {
                            count: view.importPreview.length,
                          })}
                        </strong>
                        <span>
                          {t(
                            'Each operation becomes an enabled static JSON rule.',
                          )}
                        </span>
                      </div>
                    ) : null}
                    {view.importStatus === 'importing' ? (
                      <div class="openapi-import-progress" role="status">
                        <div>
                          <strong>{t('Importing rules')}</strong>
                          <span>
                            {view.importProgress} / {view.importPreview.length}
                          </span>
                        </div>
                        <progress
                          max={view.importPreview.length}
                          value={view.importProgress}
                          aria-label={t('OpenAPI import progress')}
                        />
                      </div>
                    ) : null}
                  </div>
                  <footer class="rule-editor-footer">
                    <span class="rule-editor-section-note">
                      {t('Local schema references are resolved in memory.')}
                    </span>
                    <div class="rule-editor-actions">
                      <zw-button
                        variant="ghost"
                        disabled={function () {
                          return view.importStatus === 'importing'
                        }}
                        onClick={closeImport}
                      >
                        {t('Cancel')}
                      </zw-button>
                      {view.importStatus === 'preview' ? (
                        <zw-button variant="primary" onClick={confirmImport}>
                          <zw-icon-check size="16" aria-hidden="true" />
                          <span>{t('Import rules')}</span>
                        </zw-button>
                      ) : (
                        <zw-button
                          variant="primary"
                          onClick={parseImport}
                          disabled={function () {
                            return view.importStatus === 'importing'
                          }}
                        >
                          <zw-icon-upload size="16" aria-hidden="true" />
                          <span>{t('Parse OpenAPI')}</span>
                        </zw-button>
                      )}
                    </div>
                  </footer>
                </section>
              </div>
            </zw-dialog-content>
          </zw-dialog>
        )
      })}
    </section>
  )
}
