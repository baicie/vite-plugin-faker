import type { MockConfig, WSConnectionStatus } from '@baicie/faker-shared'
import type { WSStatusHandler } from '@baicie/faker-shared'
import { onCleanup, state } from '@zeus-js/zeus'
import { exportMocks, importMocks } from '../api/mock'
import type { FakerSettings, FakerTheme, RuntimeSettings } from '../api/setting'
import { clearCache, getSettings, updateSettings } from '../api/setting'
import {
  dynamic,
  getErrorMessage,
  readChecked,
  readInputValue,
} from '../lib/zeus'
import { getLocale, t } from '../i18n'
import type { Locale } from '../i18n'
import {
  createDefaultRuntimeSettings,
  createSettingsUpdate,
  normalizeRuntimeSettings,
  parseMockImport,
  serializeMockExport,
} from './settings-utils'

type SettingsActivity =
  | 'idle'
  | 'loading'
  | 'saving'
  | 'exporting'
  | 'importing'
  | 'clearing'

type FeedbackKind = 'none' | 'success' | 'error'

export interface SettingsWorkspaceProps {
  client: SettingsStatusClient
  theme: () => FakerTheme
  locale?: () => Locale
  onThemeChange(theme: FakerTheme): void
  onLocaleChange?: (locale: Locale) => void
}

export interface SettingsStatusClient {
  getStatus(): WSConnectionStatus
  onStatus(handler: WSStatusHandler): void
  offStatus(handler: WSStatusHandler): void
}

interface InputValueChangeDetail {
  value: string
  nativeEvent: Event
}

interface SwitchCheckedChangeDetail {
  checked: boolean
  nativeEvent: Event
}

function readValueChange(event: Event): string {
  const detail = (event as CustomEvent<InputValueChangeDetail>).detail
  if (detail && typeof detail.value === 'string') {
    return detail.value
  }
  return readInputValue(event)
}

function readZeusInputValue(
  event: CustomEvent<InputValueChangeDetail>,
): string {
  const nativeValue = readInputValue(event.detail.nativeEvent)
  return nativeValue === event.detail.value ? nativeValue : event.detail.value
}

function readZeusChecked(
  event: CustomEvent<SwitchCheckedChangeDetail>,
): boolean {
  const nativeChecked = readChecked(event.detail.nativeEvent)
  return nativeChecked === event.detail.checked
    ? nativeChecked
    : event.detail.checked
}

function readFileAsText(file: File): Promise<string> {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader()
    reader.onload = function () {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error(t('The selected file could not be read as text')))
    }
    reader.onerror = function () {
      reject(
        reader.error ? reader.error : new Error(t('Could not read the file')),
      )
    }
    reader.readAsText(file)
  })
}

function createExportFilename(date: Date): string {
  return 'faker-mocks-' + date.toISOString().slice(0, 10) + '.json'
}

export default function SettingsWorkspace(
  props: SettingsWorkspaceProps,
): JSX.Element {
  const form = state<RuntimeSettings>(createDefaultRuntimeSettings())
  const activity = state<SettingsActivity>('loading')
  const feedbackKind = state<FeedbackKind>('none')
  const feedbackMessage = state('')
  const settingsLoaded = state(false)
  const connectionStatus = state<WSConnectionStatus>(props.client.getStatus())
  let fileInput: HTMLInputElement | null = null
  let downloadUrl: string | undefined
  let active = true

  function isBusy(): boolean {
    return activity.value !== 'idle' || connectionStatus.value === 'closed'
  }

  function cannotEditSettings(): boolean {
    return !settingsLoaded.value || isBusy()
  }

  function setFeedback(kind: FeedbackKind, message: string): void {
    feedbackKind.value = kind
    feedbackMessage.value = message
  }

  function clearFeedback(): void {
    setFeedback('none', '')
  }

  function applySettings(settings: RuntimeSettings): void {
    form.globalDelay = settings.globalDelay
    form.enableAllMocks = settings.enableAllMocks
    form.logRequests = settings.logRequests
    form.corsEnabled = settings.corsEnabled
    form.corsAllowOrigin = settings.corsAllowOrigin
  }

  function finishWithError(error: unknown): void {
    if (!active) {
      return
    }
    activity.value = 'idle'
    setFeedback('error', getErrorMessage(error))
  }

  function loadSettings(): void {
    activity.value = 'loading'
    clearFeedback()
    getSettings().then(
      function (settings) {
        if (!active) {
          return
        }
        applySettings(normalizeRuntimeSettings(settings))
        if (settings.theme === 'light' || settings.theme === 'dark') {
          props.onThemeChange(settings.theme)
        }
        settingsLoaded.value = true
        activity.value = 'idle'
      },
      function (error: unknown) {
        settingsLoaded.value = false
        finishWithError(error)
      },
    )
  }

  function handleSave(): void {
    if (cannotEditSettings()) {
      return
    }
    const update = createSettingsUpdate(form)
    const payload: Partial<FakerSettings> = {
      globalDelay: update.globalDelay,
      enableAllMocks: update.enableAllMocks,
      logRequests: update.logRequests,
      corsEnabled: update.corsEnabled,
      corsAllowOrigin: update.corsAllowOrigin,
      theme: props.theme(),
    }
    activity.value = 'saving'
    clearFeedback()
    updateSettings(payload).then(function (result) {
      if (!active) {
        return
      }
      if (!result.success) {
        finishWithError(new Error(t('Settings could not be saved')))
        return
      }
      applySettings(update)
      activity.value = 'idle'
      setFeedback('success', t('Settings saved.'))
    }, finishWithError)
  }

  function releaseDownloadUrl(): void {
    if (downloadUrl !== undefined) {
      URL.revokeObjectURL(downloadUrl)
      downloadUrl = undefined
    }
  }

  function downloadMocks(mocks: MockConfig[]): void {
    releaseDownloadUrl()
    const blob = new Blob([serializeMockExport(mocks)], {
      type: 'application/json',
    })
    const anchor = document.createElement('a')
    downloadUrl = URL.createObjectURL(blob)
    anchor.href = downloadUrl
    anchor.download = createExportFilename(new Date())
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    releaseDownloadUrl()
  }

  function handleExport(): void {
    activity.value = 'exporting'
    clearFeedback()
    exportMocks().then(function (mocks) {
      if (!active) {
        return
      }
      downloadMocks(mocks)
      activity.value = 'idle'
      setFeedback(
        'success',
        t('Exported {{count}} {{unit}}.', {
          count: mocks.length,
          unit: mocks.length === 1 ? t('rule') : t('rules'),
        }),
      )
    }, finishWithError)
  }

  function resetFileInput(): void {
    if (fileInput) {
      fileInput.value = ''
    }
  }

  function handleImport(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.files) {
      return
    }
    const file = target.files[0]
    if (!file) {
      return
    }

    activity.value = 'importing'
    clearFeedback()
    readFileAsText(file)
      .then(function (source) {
        return importMocks(parseMockImport(source))
      })
      .then(
        function (result) {
          resetFileInput()
          if (!active) {
            return
          }
          if (!result.success) {
            finishWithError(new Error(t('Rules could not be imported')))
            return
          }
          activity.value = 'idle'
          setFeedback(
            'success',
            t('Imported {{count}} {{unit}}.', {
              count: result.count,
              unit: result.count === 1 ? t('rule') : t('rules'),
            }),
          )
        },
        function (error) {
          resetFileInput()
          finishWithError(error)
        },
      )
  }

  function triggerImport(): void {
    if (fileInput) {
      fileInput.click()
    }
  }

  function handleClearHistory(): void {
    if (!window.confirm(t('Clear all captured request history?'))) {
      return
    }
    activity.value = 'clearing'
    clearFeedback()
    clearCache().then(function (result) {
      if (!active) {
        return
      }
      if (!result.success) {
        finishWithError(new Error(t('Request history could not be cleared')))
        return
      }
      activity.value = 'idle'
      setFeedback('success', t('Request history cleared.'))
    }, finishWithError)
  }

  function handleConnectionStatus(status: WSConnectionStatus): void {
    connectionStatus.value = status
  }

  props.client.onStatus(handleConnectionStatus)

  loadSettings()

  onCleanup(function () {
    active = false
    props.client.offStatus(handleConnectionStatus)
    releaseDownloadUrl()
  })

  return (
    <section class="settings-workspace" aria-labelledby="settings-title">
      <header class="workspace-header settings-header">
        <div>
          <span class="workspace-eyebrow">{t('Runtime policy')}</span>
          <h1 id="settings-title">{t('Settings')}</h1>
        </div>
        <div class="workspace-actions">
          <zw-button
            variant="ghost"
            size="md"
            disabled={function () {
              return cannotEditSettings()
            }}
            onClick={loadSettings}
          >
            {t('Reload')}
          </zw-button>
          <zw-button
            variant="primary"
            size="md"
            loading={function () {
              return activity.value === 'saving'
            }}
            disabled={function () {
              return cannotEditSettings()
            }}
            onClick={handleSave}
          >
            <span>
              {dynamic(function () {
                return activity.value === 'saving'
                  ? t('Saving...')
                  : t('Save changes')
              })}
            </span>
          </zw-button>
        </div>
      </header>

      <div class="settings-status" aria-live="polite">
        {dynamic(function () {
          if (feedbackKind.value === 'none') {
            if (connectionStatus.value === 'closed') {
              return (
                <p role="alert" data-state="error">
                  {t(
                    'Connection closed. Reopen Faker Studio to manage settings.',
                  )}
                </p>
              )
            }
            return activity.value === 'loading' ? (
              <p data-state="loading">{t('Loading settings...')}</p>
            ) : null
          }
          if (feedbackKind.value === 'error' && !settingsLoaded.value) {
            return (
              <div class="settings-retry" role="alert" data-state="error">
                <p>{feedbackMessage.value}</p>
                <zw-button
                  variant="outline"
                  size="sm"
                  disabled={function () {
                    return isBusy()
                  }}
                  onClick={loadSettings}
                >
                  {t('Retry')}
                </zw-button>
              </div>
            )
          }
          return (
            <p
              role={feedbackKind.value === 'error' ? 'alert' : 'status'}
              data-state={feedbackKind.value}
            >
              {feedbackMessage.value}
            </p>
          )
        })}
      </div>

      <div class="settings-layout">
        <section class="settings-section" aria-labelledby="appearance-title">
          <header class="settings-section-header">
            <h2 id="appearance-title">{t('Appearance')}</h2>
          </header>
          <div class="settings-fields">
            <label class="settings-field settings-field-switch">
              <span>{t('Dark theme')}</span>
              <zw-switch
                size="md"
                checked={function () {
                  return props.theme() === 'dark'
                }}
                disabled={function () {
                  return cannotEditSettings()
                }}
                aria-label={t('Use dark theme')}
                onChecked-change={function (
                  event: CustomEvent<SwitchCheckedChangeDetail>,
                ) {
                  props.onThemeChange(readZeusChecked(event) ? 'dark' : 'light')
                }}
              />
            </label>
            <label class="settings-field settings-field-input">
              <span>{t('Language')}</span>
              <zw-select
                value={function () {
                  return props.locale ? props.locale() : getLocale()
                }}
                aria-label={t('Language')}
                onValue-change={function (event: Event) {
                  const value = readValueChange(event)
                  if (props.onLocaleChange) {
                    props.onLocaleChange(value === 'zh-CN' ? 'zh-CN' : 'en-US')
                  }
                }}
              >
                <option value="en-US">{t('English')}</option>
                <option value="zh-CN">{t('Simplified Chinese')}</option>
              </zw-select>
            </label>
          </div>
        </section>

        <section
          class="settings-section"
          aria-labelledby="request-policy-title"
        >
          <header class="settings-section-header">
            <h2 id="request-policy-title">{t('Request policy')}</h2>
          </header>
          <div class="settings-fields">
            <label class="settings-field settings-field-input">
              <span>{t('Global delay')}</span>
              <zw-input
                type="number"
                size="md"
                min="0"
                max="60000"
                value={function () {
                  return String(form.globalDelay)
                }}
                disabled={function () {
                  return cannotEditSettings()
                }}
                aria-label={t('Global delay in milliseconds')}
                onValue-change={function (
                  event: CustomEvent<InputValueChangeDetail>,
                ) {
                  const delay = Number(readZeusInputValue(event))
                  form.globalDelay = isFinite(delay) ? delay : 0
                }}
              />
              <small>ms</small>
            </label>

            <label class="settings-field settings-field-switch">
              <span>{t('Enable all mocks by default')}</span>
              <zw-switch
                size="md"
                checked={function () {
                  return form.enableAllMocks
                }}
                disabled={function () {
                  return cannotEditSettings()
                }}
                aria-label={t('Enable all mocks by default')}
                onChecked-change={function (
                  event: CustomEvent<SwitchCheckedChangeDetail>,
                ) {
                  form.enableAllMocks = readZeusChecked(event)
                }}
              />
            </label>

            <label class="settings-field settings-field-switch">
              <span>{t('Capture request history')}</span>
              <zw-switch
                size="md"
                checked={function () {
                  return form.logRequests
                }}
                disabled={function () {
                  return cannotEditSettings()
                }}
                aria-label={t('Capture request history')}
                onChecked-change={function (
                  event: CustomEvent<SwitchCheckedChangeDetail>,
                ) {
                  form.logRequests = readZeusChecked(event)
                }}
              />
            </label>
          </div>
        </section>

        <section
          class="settings-section"
          aria-labelledby="network-policy-title"
        >
          <header class="settings-section-header">
            <h2 id="network-policy-title">{t('Network policy')}</h2>
          </header>
          <div class="settings-fields">
            <label class="settings-field settings-field-switch">
              <span>{t('Enable CORS')}</span>
              <zw-switch
                size="md"
                checked={function () {
                  return form.corsEnabled
                }}
                disabled={function () {
                  return cannotEditSettings()
                }}
                aria-label={t('Enable CORS')}
                onChecked-change={function (
                  event: CustomEvent<SwitchCheckedChangeDetail>,
                ) {
                  form.corsEnabled = readZeusChecked(event)
                }}
              />
            </label>

            <label class="settings-field settings-field-input">
              <span>{t('Allowed origin')}</span>
              <zw-input
                type="text"
                size="md"
                value={function () {
                  return form.corsAllowOrigin
                }}
                disabled={function () {
                  return cannotEditSettings() || !form.corsEnabled
                }}
                aria-label={t('CORS allowed origin')}
                onValue-change={function (
                  event: CustomEvent<InputValueChangeDetail>,
                ) {
                  form.corsAllowOrigin = readZeusInputValue(event)
                }}
              />
            </label>
          </div>
        </section>

        <section
          class="settings-section settings-data"
          aria-labelledby="data-title"
        >
          <header class="settings-section-header">
            <h2 id="data-title">{t('Data')}</h2>
          </header>
          <div class="settings-data-actions">
            <zw-button
              variant="outline"
              size="md"
              loading={function () {
                return activity.value === 'exporting'
              }}
              disabled={function () {
                return isBusy()
              }}
              onClick={handleExport}
            >
              {t('Export rules')}
            </zw-button>
            <zw-button
              variant="outline"
              size="md"
              loading={function () {
                return activity.value === 'importing'
              }}
              disabled={function () {
                return isBusy()
              }}
              onClick={triggerImport}
            >
              {t('Import rules')}
            </zw-button>
            <zw-button
              variant="danger"
              size="md"
              loading={function () {
                return activity.value === 'clearing'
              }}
              disabled={function () {
                return isBusy()
              }}
              onClick={handleClearHistory}
            >
              {t('Clear history')}
            </zw-button>
            <input
              ref={function (element) {
                fileInput = element
              }}
              class="settings-file-input"
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
            />
          </div>
        </section>
      </div>
    </section>
  )
}
