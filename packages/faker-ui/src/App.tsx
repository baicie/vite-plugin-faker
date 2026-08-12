import type {
  MockConfig,
  RequestRecord,
  WSClient,
  WSConnectionStatus,
} from '@baicie/faker-shared'
import { onCleanup, state } from '@zeus-js/zeus'
import type { FakerTheme } from './api/setting'
import RulesWorkspace from './app/rules-workspace'
import SettingsWorkspace from './app/settings-workspace'
import TrafficWorkspace from './app/traffic-workspace'
import { createTrafficRuleDraft } from './app/traffic-utils'
import ThemeToggle from './components/theme-toggle'
import type { UIOptions } from './hooks/use-app-context'
import { getLocale, setLocale, t } from './i18n'
import type { Locale } from './i18n'
import { dynamic, focusZeusControl } from './lib/zeus'

export type WorkspaceView = 'traffic' | 'rules' | 'settings'

export interface FakerStudioAppProps {
  client: WSClient
  options: UIOptions
}

interface NavigationItem {
  label: string
  value: WorkspaceView
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Traffic', value: 'traffic' },
  { label: 'Rules', value: 'rules' },
  { label: 'Settings', value: 'settings' },
]

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function resolveInitialTheme(): FakerTheme {
  try {
    const storedTheme = window.localStorage.getItem('faker-studio-theme')
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme
    }
  } catch (_error) {
    // Storage may be unavailable in embedded or privacy-restricted contexts.
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

function getConnectionLabel(status: WSConnectionStatus): string {
  switch (status) {
    case 'connected':
      return t('Connected')
    case 'connecting':
      return t('Connecting')
    case 'reconnecting':
      return t('Reconnecting')
    case 'closed':
      return t('Closed')
    default:
      return t('Disconnected')
  }
}

function getViewLabel(view: WorkspaceView): string {
  for (const item of NAVIGATION_ITEMS) {
    if (item.value === view) {
      return t(item.label)
    }
  }
  return t('Traffic')
}

function NavigationIcon(props: { view: WorkspaceView }): JSX.Element {
  if (props.view === 'rules') {
    return <zw-icon-menu size="17" />
  }
  if (props.view === 'settings') {
    return <zw-icon-settings size="17" />
  }
  return <zw-icon-eye size="17" />
}

export default function FakerStudioApp(
  props: FakerStudioAppProps,
): JSX.Element {
  const activeView = state<WorkspaceView>('traffic')
  const connectionStatus = state<WSConnectionStatus>(props.client.getStatus())
  const panelOpen = state(props.options.mode === 'route')
  const theme = state<FakerTheme>(resolveInitialTheme())
  const locale = state<Locale>(getLocale())
  const ruleDraft = state<MockConfig | null>(null)
  const trafficFocus = state('')
  let studioPanel: HTMLDivElement | null = null
  let focusRetryTimer: number | undefined

  function focusTarget(target: HTMLElement | null): void {
    focusZeusControl(target)
  }

  function retryFocus(resolveTarget: () => HTMLElement | null): void {
    if (focusRetryTimer !== undefined) {
      window.clearTimeout(focusRetryTimer)
    }
    focusRetryTimer = window.setTimeout(function () {
      focusRetryTimer = undefined
      const target = resolveTarget()
      const active = document.activeElement
      if (
        target &&
        active !== target &&
        (!active || !target.contains(active))
      ) {
        focusTarget(target)
      }
    }, 0)
  }

  function openPanel(): void {
    panelOpen.value = true
    focusTarget(
      studioPanel
        ? studioPanel.querySelector<HTMLElement>('[data-studio-close]')
        : null,
    )
    retryFocus(function () {
      return studioPanel
        ? studioPanel.querySelector<HTMLElement>('[data-studio-close]')
        : null
    })
  }

  function closePanel(): void {
    panelOpen.value = false
    const host = studioPanel ? studioPanel.parentElement : null
    focusTarget(
      host ? host.querySelector<HTMLElement>('[data-studio-launcher]') : null,
    )
    retryFocus(function () {
      return host
        ? host.querySelector<HTMLElement>('[data-studio-launcher]')
        : null
    })
  }

  function handlePanelKeyDown(event: KeyboardEvent): void {
    if (props.options.mode !== 'button' || !panelOpen.value || !studioPanel) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
      return
    }
    if (event.key !== 'Tab') {
      return
    }

    const focusable = Array.from(
      studioPanel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(function (element) {
      if (
        element.hasAttribute('disabled') ||
        element.tabIndex < 0 ||
        element.closest('[hidden], [inert]')
      ) {
        return false
      }

      let current: HTMLElement | null = element
      while (current && current !== studioPanel) {
        const style = window.getComputedStyle(current)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false
        }
        current = current.parentElement
      }
      return true
    })
    if (focusable.length === 0) {
      event.preventDefault()
      studioPanel.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleStatus(status: WSConnectionStatus): void {
    connectionStatus.value = status
  }

  function setTheme(nextTheme: FakerTheme): void {
    theme.value = nextTheme
    try {
      window.localStorage.setItem('faker-studio-theme', nextTheme)
    } catch (_error) {
      // The selected theme still applies for this session when storage fails.
    }
  }

  function setStudioLocale(nextLocale: Locale): void {
    setLocale(nextLocale)
    locale.value = nextLocale
  }

  function handleCreateRule(record: RequestRecord): void {
    ruleDraft.value = createTrafficRuleDraft(record)
    activeView.value = 'rules'
    panelOpen.value = true
  }

  function handleDraftConsumed(): void {
    ruleDraft.value = null
  }

  function handleRuleSaved(rule: MockConfig, fromTraffic: boolean): void {
    if (!fromTraffic) {
      return
    }
    trafficFocus.value = rule.url
    activeView.value = 'traffic'
  }

  function handleTrafficFocusConsumed(): void {
    trafficFocus.value = ''
  }

  props.client.onStatus(handleStatus)
  onCleanup(function () {
    props.client.offStatus(handleStatus)
    if (focusRetryTimer !== undefined) {
      window.clearTimeout(focusRetryTimer)
    }
  })

  return (
    <div
      class="faker-studio-host"
      data-faker-studio=""
      data-mode={props.options.mode}
      data-panel-open={function () {
        return String(panelOpen.value)
      }}
      data-theme={function () {
        return theme.value
      }}
    >
      {props.options.mode === 'button' ? (
        <zw-button
          class="studio-launcher"
          variant="primary"
          size="icon"
          aria-label={function () {
            locale.value
            return t('Open Faker Studio')
          }}
          title={function () {
            locale.value
            return t('Open Faker Studio')
          }}
          aria-expanded={function () {
            return String(panelOpen.value)
          }}
          data-studio-launcher=""
          onClick={openPanel}
        >
          <span class="studio-launcher-mark">F</span>
        </zw-button>
      ) : null}

      {props.options.mode === 'button' ? (
        <button
          class="studio-backdrop"
          type="button"
          aria-label={function () {
            locale.value
            return t('Close Faker Studio')
          }}
          onClick={closePanel}
        />
      ) : null}

      <div
        class="faker-studio"
        ref={function (element: HTMLDivElement | null): void {
          studioPanel = element
        }}
        role={props.options.mode === 'button' ? 'dialog' : undefined}
        aria-modal={props.options.mode === 'button' ? 'true' : undefined}
        aria-label={function () {
          if (props.options.mode !== 'button') {
            return undefined
          }
          locale.value
          return t('Faker Studio workspace')
        }}
        aria-hidden={function () {
          return props.options.mode === 'button' && !panelOpen.value
            ? 'true'
            : 'false'
        }}
        inert={function () {
          return props.options.mode === 'button' && !panelOpen.value
        }}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
      >
        <aside class="studio-sidebar">
          <div class="studio-brand">
            <span class="studio-brand-mark">F</span>
            <span class="studio-brand-copy">
              <strong>
                {dynamic(function () {
                  locale.value
                  return t('Faker Studio')
                })}
              </strong>
              <small>
                {dynamic(function () {
                  locale.value
                  return t('Built with Zeus')
                })}
              </small>
            </span>
          </div>
          <nav
            class="studio-navigation"
            aria-label={function () {
              locale.value
              return t('Workspace')
            }}
          >
            {NAVIGATION_ITEMS.map(function (item) {
              return (
                <zw-button
                  class="studio-navigation-item"
                  variant="ghost"
                  size="md"
                  pressed={function () {
                    return activeView.value === item.value
                  }}
                  aria-current={function () {
                    return activeView.value === item.value ? 'page' : 'false'
                  }}
                  onClick={function (): void {
                    activeView.value = item.value
                  }}
                >
                  <NavigationIcon view={item.value} />
                  <span>
                    {dynamic(function () {
                      locale.value
                      return t(item.label)
                    })}
                  </span>
                </zw-button>
              )
            })}
          </nav>
          <div class="studio-sidebar-footer">
            <div
              class="studio-connection"
              data-status={function () {
                return connectionStatus.value
              }}
            >
              <span class="studio-connection-dot" />
              <span>
                {dynamic(function () {
                  locale.value
                  return getConnectionLabel(connectionStatus.value)
                })}
              </span>
            </div>
            <small>v0.1 beta</small>
          </div>
        </aside>

        <div class="studio-workbench">
          <header class="studio-header">
            <div class="studio-header-copy">
              <span class="studio-eyebrow">
                {dynamic(function () {
                  locale.value
                  return t('Developer mock workspace')
                })}
              </span>
              <strong>
                {dynamic(function () {
                  locale.value
                  return getViewLabel(activeView.value)
                })}
              </strong>
            </div>
            <div class="studio-header-actions">
              {dynamic(function () {
                locale.value
                return <ThemeToggle theme={theme.value} onChange={setTheme} />
              })}
              {props.options.mode === 'button' ? (
                <zw-button
                  class="studio-icon-button"
                  variant="ghost"
                  size="icon"
                  aria-label={function () {
                    locale.value
                    return t('Close Faker Studio')
                  }}
                  title={function () {
                    locale.value
                    return t('Close Faker Studio')
                  }}
                  data-studio-close=""
                  onClick={closePanel}
                >
                  <zw-icon-x size="18" />
                </zw-button>
              ) : null}
            </div>
          </header>

          <main class="studio-main">
            <div
              class="studio-view"
              data-workspace-view="traffic"
              data-active={function () {
                return String(activeView.value === 'traffic')
              }}
              hidden={function () {
                return activeView.value !== 'traffic'
              }}
            >
              {dynamic(function () {
                locale.value
                return (
                  <TrafficWorkspace
                    client={props.client}
                    onCreateRule={handleCreateRule}
                    focusTarget={function () {
                      return trafficFocus.value
                    }}
                    onFocusTargetConsumed={handleTrafficFocusConsumed}
                  />
                )
              })}
            </div>
            <div
              class="studio-view"
              data-workspace-view="rules"
              data-active={function () {
                return String(activeView.value === 'rules')
              }}
              hidden={function () {
                return activeView.value !== 'rules'
              }}
            >
              {dynamic(function () {
                locale.value
                return (
                  <RulesWorkspace
                    client={props.client}
                    theme={function () {
                      return theme.value
                    }}
                    draft={function () {
                      return ruleDraft.value
                    }}
                    onDraftConsumed={handleDraftConsumed}
                    onRuleSaved={handleRuleSaved}
                  />
                )
              })}
            </div>
            <div
              class="studio-view"
              data-workspace-view="settings"
              data-active={function () {
                return String(activeView.value === 'settings')
              }}
              hidden={function () {
                return activeView.value !== 'settings'
              }}
            >
              {dynamic(function () {
                locale.value
                return (
                  <SettingsWorkspace
                    client={props.client}
                    theme={function () {
                      return theme.value
                    }}
                    locale={function () {
                      return locale.value
                    }}
                    onThemeChange={setTheme}
                    onLocaleChange={setStudioLocale}
                  />
                )
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
