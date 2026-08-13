import type { MockConfig, MockType } from '@baicie/faker-shared'
import { onCleanup, state } from '@zeus-js/zeus'
import { createMock, updateMock } from '../api'
import type { FakerTheme } from '../api/setting'
import type { MockOperationResult, SimpleResult } from '../api/mock'
import MonacoEditor from '../components/monaco-editor'
import {
  dynamic,
  focusZeusControl,
  getErrorMessage,
  readInputValue,
} from '../lib/zeus'
import { t } from '../i18n'
import {
  createRuleConfig,
  createRuleEditorDraft,
  validateRuleEditorDraft,
} from './rule-editor-utils'
import type { RuleEditorDraft } from './rule-editor-utils'

export interface RuleEditorProps {
  rule: MockConfig | null
  create?: boolean
  /**
   * 当为 true 时，如果草稿没有 id，将根据 URL/方法生成稳定 id。
   * 用于 Traffic 草稿，让"保存为规则"在同一路由的第一次创建时使用一致的 id。
   */
  useStableIdentity?: boolean
  theme: () => FakerTheme
  onCancel: () => void
  onSaved: (rule: MockConfig) => void
}

type EditorSection = 'response' | 'matching'

interface RuleEditorState {
  saving: boolean
  errors: string[]
}

interface ValueChangeDetail {
  value: string
}

interface CheckedChangeDetail {
  checked: boolean
}

const RULE_TYPES: Array<{ label: string; value: MockType }> = [
  { label: 'Static JSON', value: 'static' },
  { label: 'Proxy', value: 'proxy' },
  { label: 'Template', value: 'template' },
  { label: 'Function', value: 'function' },
  { label: 'Error', value: 'error' },
  { label: 'Stateful', value: 'stateful' },
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

function readValueChange(event: Event): string {
  const detail = (event as CustomEvent<ValueChangeDetail>).detail
  if (detail && typeof detail.value === 'string') {
    return detail.value
  }
  return readInputValue(event)
}

function readCheckedChange(event: Event): boolean {
  const detail = (event as CustomEvent<CheckedChangeDetail>).detail
  if (detail && typeof detail.checked === 'boolean') {
    return detail.checked
  }
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : false
}

function setText(
  draft: RuleEditorDraft,
  field:
    | 'name'
    | 'url'
    | 'method'
    | 'description'
    | 'group'
    | 'tags'
    | 'matchRule'
    | 'headers'
    | 'body'
    | 'target'
    | 'schema'
    | 'handlerSource'
    | 'states',
  value: string,
): void {
  draft[field] = value
}

function renderFieldLabel(text: string, required = false): JSX.Element {
  return (
    <span class="rule-field-label">
      <span>{t(text)}</span>
      {required ? <em aria-hidden="true">*</em> : null}
    </span>
  )
}

function renderTextInput(
  draft: RuleEditorDraft,
  field: 'name' | 'url' | 'description' | 'group' | 'tags' | 'target',
  label: string,
  placeholder: string,
  required = false,
): JSX.Element {
  return (
    <label class="rule-field">
      {renderFieldLabel(label, required)}
      <zw-input
        value={function () {
          return draft[field]
        }}
        placeholder={t(placeholder)}
        onValue-change={function (event: Event) {
          setText(draft, field, readValueChange(event))
        }}
      />
    </label>
  )
}

function renderJsonEditor(
  draft: RuleEditorDraft,
  theme: () => FakerTheme,
  field: 'headers' | 'body' | 'schema' | 'states' | 'matchRule',
  label: string,
  description: string,
): JSX.Element {
  return (
    <div class="rule-field rule-field-wide">
      {renderFieldLabel(label)}
      <MonacoEditor
        value={function () {
          return draft[field]
        }}
        language="json"
        ariaLabel={label}
        theme={function () {
          return theme() === 'dark' ? 'vs-dark' : 'vs'
        }}
        height="180px"
        onChange={function (value: string) {
          setText(draft, field, value)
        }}
      />
      <small class="rule-field-hint">{t(description)}</small>
    </div>
  )
}

function renderMethodOptions(): JSX.Element[] {
  return HTTP_METHODS.map(function (method) {
    return (
      <option value={method} key={method}>
        {method}
      </option>
    )
  })
}

function renderTypeOptions(): JSX.Element[] {
  return RULE_TYPES.map(function (item) {
    return (
      <option value={item.value} key={item.value}>
        {t(item.label)}
      </option>
    )
  })
}

function renderCommonFields(draft: RuleEditorDraft): JSX.Element {
  return (
    <div class="rule-editor-section" data-section="common">
      <div class="rule-editor-section-heading">
        <div>
          <span class="rule-editor-kicker">{t('Rule identity')}</span>
          <h3>{t('Request contract')}</h3>
        </div>
        <span class="rule-editor-section-note">
          {t('Shared by every response mode')}
        </span>
      </div>
      <div class="rule-fields-grid">
        {renderTextInput(draft, 'name', 'Name', 'e.g. List users')}
        {renderTextInput(draft, 'url', 'URL pattern', '/api/users/:id', true)}
        <label class="rule-field">
          {renderFieldLabel('Method', true)}
          <zw-select
            value={function () {
              return draft.method
            }}
            onValue-change={function (event: Event) {
              draft.method = readValueChange(event).toUpperCase()
            }}
          >
            {renderMethodOptions()}
          </zw-select>
        </label>
        <label class="rule-field">
          {renderFieldLabel('Priority')}
          <zw-input
            type="number"
            value={function () {
              return String(draft.priority)
            }}
            onValue-change={function (event: Event) {
              const value = Number(readValueChange(event))
              draft.priority = isFinite(value) ? value : 0
              draft.priorityDefined = true
            }}
          />
        </label>
        {renderTextInput(draft, 'group', 'Group', 'users')}
        {renderTextInput(draft, 'tags', 'Tags', 'smoke, critical')}
        {renderTextInput(
          draft,
          'description',
          'Description',
          'What does this rule simulate?',
        )}
      </div>
      <label class="rule-toggle-row">
        <zw-switch
          checked={function () {
            return draft.enabled
          }}
          aria-label={t('Enable rule')}
          onChecked-change={function (event: Event) {
            draft.enabled = readCheckedChange(event)
          }}
        />
        <span>
          <strong>{t('Rule enabled')}</strong>
          <small>
            {t(
              'Disabled rules stay in the registry but never intercept traffic.',
            )}
          </small>
        </span>
      </label>
    </div>
  )
}

function renderResponseFields(
  draft: RuleEditorDraft,
  theme: () => FakerTheme,
): JSX.Element {
  return (
    <div class="rule-editor-section" data-section="response">
      <div class="rule-editor-section-heading">
        <div>
          <span class="rule-editor-kicker">{t('Response strategy')}</span>
          <h3>{t('What should the client receive?')}</h3>
        </div>
        <span class="rule-editor-section-note">
          {t('The interceptor applies this server-side')}
        </span>
      </div>
      <label class="rule-field rule-field-wide">
        {renderFieldLabel('Response type', true)}
        <zw-select
          value={function () {
            return draft.type
          }}
          onValue-change={function (event: Event) {
            draft.type = readValueChange(event) as MockType
          }}
        >
          {renderTypeOptions()}
        </zw-select>
      </label>
      {dynamic(function () {
        if (draft.type === 'proxy') {
          return (
            <div class="rule-response-panel" data-response-type="proxy">
              {renderTextInput(
                draft,
                'target',
                'Target URL',
                'https://api.example.com',
                true,
              )}
              <label class="rule-field">
                {renderFieldLabel('Timeout (ms)')}
                <zw-input
                  type="number"
                  value={function () {
                    return String(draft.timeout)
                  }}
                  onValue-change={function (event: Event) {
                    const value = Number(readValueChange(event))
                    draft.timeout = isFinite(value) ? value : 0
                  }}
                />
              </label>
              <label class="rule-toggle-row compact">
                <zw-switch
                  checked={function () {
                    return draft.rewriteHeaders
                  }}
                  aria-label={t('Rewrite response headers')}
                  onChecked-change={function (event: Event) {
                    draft.rewriteHeaders = readCheckedChange(event)
                  }}
                />
                <span>{t('Pass through response headers')}</span>
              </label>
              <label class="rule-toggle-row compact">
                <zw-switch
                  checked={function () {
                    return draft.rewriteStatus
                  }}
                  aria-label={t('Rewrite response status')}
                  onChecked-change={function (event: Event) {
                    draft.rewriteStatus = readCheckedChange(event)
                  }}
                />
                <span>{t('Pass through response status')}</span>
              </label>
            </div>
          )
        }

        if (draft.type === 'template') {
          return (
            <div class="rule-response-panel" data-response-type="template">
              <label class="rule-field">
                {renderFieldLabel('Item count')}
                <zw-input
                  type="number"
                  value={function () {
                    return String(draft.count)
                  }}
                  onValue-change={function (event: Event) {
                    const value = Number(readValueChange(event))
                    draft.count = isFinite(value) ? value : 0
                  }}
                />
              </label>
              {renderJsonEditor(
                draft,
                theme,
                'schema',
                'Faker schema',
                'Map fields to faker modules, for example string.uuid.',
              )}
            </div>
          )
        }

        if (draft.type === 'function') {
          return (
            <div class="rule-response-panel" data-response-type="function">
              <div class="rule-field rule-field-wide">
                {renderFieldLabel('Handler source', true)}
                <MonacoEditor
                  value={function () {
                    return draft.handlerSource
                  }}
                  language="javascript"
                  ariaLabel={t('Handler source')}
                  theme={function () {
                    return theme() === 'dark' ? 'vs-dark' : 'vs'
                  }}
                  height="260px"
                  onChange={function (value: string) {
                    draft.handlerSource = value
                  }}
                />
                <small class="rule-field-hint">
                  {t(
                    'The function receives the request context and returns a response object.',
                  )}
                </small>
              </div>
            </div>
          )
        }

        if (draft.type === 'stateful') {
          return (
            <div class="rule-response-panel" data-response-type="stateful">
              <label class="rule-field">
                {renderFieldLabel('Current state index')}
                <zw-input
                  type="number"
                  value={function () {
                    return String(draft.current)
                  }}
                  onValue-change={function (event: Event) {
                    const value = Number(readValueChange(event))
                    draft.current = isFinite(value) ? value : 0
                  }}
                />
              </label>
              {renderJsonEditor(
                draft,
                theme,
                'states',
                'Response sequence',
                'Responses are served in order and then loop back to the first state.',
              )}
            </div>
          )
        }

        return (
          <div class="rule-response-panel" data-response-type={draft.type}>
            <div class="rule-fields-grid">
              <label class="rule-field">
                {renderFieldLabel(
                  draft.type === 'error' ? 'Error status' : 'Status code',
                  true,
                )}
                <zw-input
                  type="number"
                  value={function () {
                    return String(draft.status)
                  }}
                  onValue-change={function (event: Event) {
                    const value = Number(readValueChange(event))
                    draft.status = isFinite(value) ? value : 0
                  }}
                />
              </label>
              <label class="rule-field">
                {renderFieldLabel('Delay (ms)')}
                <zw-input
                  type="number"
                  value={function () {
                    return String(draft.delay)
                  }}
                  onValue-change={function (event: Event) {
                    const value = Number(readValueChange(event))
                    draft.delay = isFinite(value) ? value : 0
                  }}
                />
              </label>
            </div>
            {renderJsonEditor(
              draft,
              theme,
              'body',
              draft.type === 'error' ? 'Error payload' : 'Response body',
              'Any valid JSON value is accepted.',
            )}
            {renderJsonEditor(
              draft,
              theme,
              'headers',
              'Response headers',
              'Header values must be strings.',
            )}
          </div>
        )
      })}
    </div>
  )
}

function renderMatchingFields(
  draft: RuleEditorDraft,
  theme: () => FakerTheme,
): JSX.Element {
  return (
    <div class="rule-editor-section" data-section="matching">
      <div class="rule-editor-section-heading">
        <div>
          <span class="rule-editor-kicker">{t('Advanced matching')}</span>
          <h3>{t('Match beyond method and path')}</h3>
        </div>
        <span class="rule-editor-section-note">
          {t('Optional JSON contract')}
        </span>
      </div>
      {renderJsonEditor(
        draft,
        theme,
        'matchRule',
        'Match rule JSON',
        'Use url, headers, query, or body conditions. Leave empty for the basic URL match.',
      )}
      <div class="rule-matching-example">
        <zw-icon-info size="16" aria-hidden="true" />
        <span>
          {t('Example') + ': '}
          {`{"query":[{"key":"tenant","operator":"equals","value":"acme"}]}`}
        </span>
      </div>
    </div>
  )
}

function renderErrors(view: RuleEditorState): JSX.Element {
  return dynamic(function () {
    if (view.errors.length === 0) {
      return <span class="rule-editor-feedback" data-level="success" />
    }
    return (
      <div class="rule-editor-feedback" data-level="error" role="alert">
        <zw-icon-alert-triangle size="16" aria-hidden="true" />
        <ul>
          {view.errors.map(function (error) {
            return <li key={error}>{t(error)}</li>
          })}
        </ul>
      </div>
    )
  })
}

export default function RuleEditor(props: RuleEditorProps): JSX.Element {
  const initialDraft = createRuleEditorDraft(props.rule)
  if (props.create && !props.useStableIdentity) {
    delete initialDraft.id
  }
  const draft = state<RuleEditorDraft>(initialDraft)
  const activeSection = state<EditorSection>('response')
  const view = state<RuleEditorState>({ saving: false, errors: [] })
  let closeControl: HTMLElement | null = null
  const focusTimer = window.setTimeout(function () {
    focusZeusControl(closeControl)
  }, 0)

  function handleDialogChange(event: Event): void {
    const detail = (event as CustomEvent<{ open: boolean }>).detail
    if (detail && !detail.open && !view.saving) {
      props.onCancel()
    }
  }

  onCleanup(function () {
    window.clearTimeout(focusTimer)
  })

  function setSection(section: EditorSection): void {
    activeSection.value = section
  }

  function handleSubmit(event: Event): void {
    event.preventDefault()
    if (view.saving) {
      return
    }

    const validationErrors = validateRuleEditorDraft(draft)
    view.errors = validationErrors
    if (validationErrors.length > 0) {
      return
    }

    let config: MockConfig
    try {
      config = createRuleConfig(draft, {
        useStableIdentity: props.useStableIdentity === true,
      })
    } catch (error) {
      view.errors = [getErrorMessage(error)]
      return
    }

    view.saving = true
    const request = draft.id
      ? updateMock({ id: draft.id, updates: config })
      : createMock(config)

    request
      .then(function (
        result: MockConfig | MockOperationResult<MockConfig> | SimpleResult,
      ) {
        view.saving = false
        const saved =
          result && typeof result === 'object' && 'mock' in result
            ? (result as { mock?: MockConfig }).mock
            : (result as MockConfig)
        if (!saved) {
          view.errors = [t('Save failed: server returned no rule.')]
          return
        }
        props.onSaved(saved)
      })
      .catch(function (error: unknown) {
        view.saving = false
        view.errors = [
          t('Save failed: {{error}}', {
            error: getErrorMessage(error),
          }),
        ]
      })
  }

  return (
    <zw-dialog open={true} modal={true} onOpen-change={handleDialogChange}>
      <zw-dialog-content>
        <div
          class="rule-editor-backdrop"
          data-rule-editor=""
          role="presentation"
        >
          <aside class="rule-editor">
            <header class="rule-editor-header">
              <div>
                <span class="rule-editor-kicker">
                  {t('Faker Studio / Rules')}
                </span>
                <zw-dialog-title>
                  <h2 id="rule-editor-title">
                    {t(
                      props.create || !props.rule ? 'Create rule' : 'Edit rule',
                    )}
                  </h2>
                </zw-dialog-title>
                <zw-dialog-description class="sr-only">
                  {t(
                    'Configure request matching and the response returned by this mock rule.',
                  )}
                </zw-dialog-description>
              </div>
              <zw-button
                variant="ghost"
                size="icon"
                aria-label={t('Close rule editor')}
                ref={function (element: HTMLElement | null): void {
                  closeControl = element
                }}
                onClick={function () {
                  if (!view.saving) props.onCancel()
                }}
              >
                <zw-icon-x size="18" aria-hidden="true" />
              </zw-button>
            </header>
            <form class="rule-editor-form" onSubmit={handleSubmit}>
              <div
                class="rule-editor-tabs"
                role="tablist"
                aria-label={t('Rule sections')}
              >
                <zw-button
                  type="button"
                  variant="ghost"
                  pressed={function () {
                    return activeSection.value === 'response'
                  }}
                  onClick={function () {
                    setSection('response')
                  }}
                >
                  {t('Response')}
                </zw-button>
                <zw-button
                  type="button"
                  variant="ghost"
                  pressed={function () {
                    return activeSection.value === 'matching'
                  }}
                  onClick={function () {
                    setSection('matching')
                  }}
                >
                  {t('Matching')}
                </zw-button>
              </div>
              <div class="rule-editor-scroll">
                {renderCommonFields(draft)}
                {dynamic(function () {
                  if (activeSection.value === 'matching') {
                    return renderMatchingFields(draft, props.theme)
                  }
                  return renderResponseFields(draft, props.theme)
                })}
              </div>
              <footer class="rule-editor-footer">
                {renderErrors(view)}
                <div class="rule-editor-actions">
                  <zw-button
                    type="button"
                    variant="outline"
                    disabled={function () {
                      return view.saving
                    }}
                    onClick={function () {
                      if (!view.saving) props.onCancel()
                    }}
                  >
                    {t('Cancel')}
                  </zw-button>
                  <zw-button
                    type="submit"
                    variant="primary"
                    loading={function () {
                      return view.saving
                    }}
                    disabled={function () {
                      return view.saving
                    }}
                  >
                    <span>
                      {dynamic(function () {
                        return view.saving ? t('Saving...') : t('Save rule')
                      })}
                    </span>
                  </zw-button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      </zw-dialog-content>
    </zw-dialog>
  )
}
