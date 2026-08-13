import loader from '@monaco-editor/loader'
import { effect, onCleanup, state } from '@zeus-js/zeus'
import type * as Monaco from 'monaco-editor'
import { dynamic, getErrorMessage } from '../lib/zeus'
import { t } from '../i18n'

type MonacoType = typeof Monaco

interface MonacoExtraLib {
  content: string
  filePath?: string
}

export interface MonacoEditorProps {
  value: string | (() => string)
  language?: string | (() => string)
  theme?: string | (() => string)
  readOnly?: boolean
  height?: string
  ariaLabel?: string
  extraLibs?: MonacoExtraLib[]
  onChange?: (value: string) => void
}

let monacoPromise: Promise<MonacoType> | undefined

function loadMonaco(): Promise<MonacoType> {
  if (!monacoPromise) {
    monacoPromise = loader.init() as Promise<MonacoType>
  }
  return monacoPromise
}

function resolveValue<T>(value: T | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value
}

export default function MonacoEditor(props: MonacoEditorProps): JSX.Element {
  let container: HTMLDivElement | null = null
  let editor: Monaco.editor.IStandaloneCodeEditor | null = null
  let changeSubscription: Monaco.IDisposable | undefined
  let stopSync: (() => void) | undefined
  let disposed = false
  const status = state<'loading' | 'ready' | 'error'>('loading')
  const errorMessage = state('')

  function releaseEditor(): void {
    if (stopSync) {
      stopSync()
      stopSync = undefined
    }
    if (changeSubscription) {
      changeSubscription.dispose()
      changeSubscription = undefined
    }
    if (editor) {
      editor.dispose()
      editor = null
    }
  }

  function initialize(): void {
    status.value = 'loading'
    errorMessage.value = ''
    const pending = loadMonaco()

    pending
      .then(function (monaco) {
        if (disposed || !container) {
          return
        }

        if (props.extraLibs && props.extraLibs.length > 0) {
          monaco.typescript.javascriptDefaults.setExtraLibs(props.extraLibs)
        }

        editor = monaco.editor.create(container, {
          value: resolveValue(props.value),
          language: props.language ? resolveValue(props.language) : 'json',
          theme: props.theme ? resolveValue(props.theme) : 'vs',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          readOnly: Boolean(props.readOnly),
          fontSize: 13,
          lineHeight: 20,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          padding: { top: 12, bottom: 12 },
          ariaLabel: props.ariaLabel || t('Code editor'),
        })

        changeSubscription = editor.onDidChangeModelContent(function () {
          if (editor && props.onChange) {
            props.onChange(editor.getValue())
          }
        })

        const runner = effect(function () {
          if (!editor) {
            return
          }
          const nextValue = resolveValue(props.value)
          if (editor.getValue() !== nextValue) {
            editor.setValue(nextValue)
          }
          if (props.language) {
            const model = editor.getModel()
            if (model) {
              monaco.editor.setModelLanguage(
                model,
                resolveValue(props.language),
              )
            }
          }
          if (props.theme) {
            monaco.editor.setTheme(resolveValue(props.theme))
          }
        })
        stopSync = function (): void {
          runner.effect.stop()
        }
        status.value = 'ready'
      })
      .catch(function (error) {
        if (monacoPromise === pending) {
          monacoPromise = undefined
        }
        if (disposed) {
          return
        }
        releaseEditor()
        status.value = 'error'
        errorMessage.value = getErrorMessage(error)
      })
  }

  const element = (
    <div
      class="studio-code-editor"
      data-testid="monaco-editor"
      data-state={function () {
        return status.value
      }}
      aria-busy={function () {
        return status.value === 'loading' ? 'true' : 'false'
      }}
      style={{ height: props.height || '320px' }}
    >
      <div
        class="studio-code-editor-surface"
        ref={function (value: HTMLDivElement | null): void {
          container = value
        }}
      />
      {dynamic(function () {
        if (status.value === 'loading') {
          return (
            <div class="studio-editor-state" role="status">
              {t('Loading code editor...')}
            </div>
          )
        }
        if (status.value === 'error') {
          return (
            <div class="studio-editor-state" role="alert">
              <strong>{t('Code editor unavailable')}</strong>
              <span>{errorMessage.value}</span>
              <zw-button variant="outline" size="sm" onClick={initialize}>
                {t('Retry editor')}
              </zw-button>
            </div>
          )
        }
        return null
      })}
    </div>
  )

  initialize()

  onCleanup(function () {
    disposed = true
    releaseEditor()
  })

  return element
}
