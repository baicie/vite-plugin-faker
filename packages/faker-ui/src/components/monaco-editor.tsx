import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

type MonacoType = typeof Monaco

let monacoPromise: Promise<MonacoType> | null = null

const loadMonaco = (): Promise<MonacoType> => {
  if (!monacoPromise) {
    monacoPromise = loader.init() as Promise<MonacoType>
  }
  return monacoPromise
}

const MonacoEditor = defineComponent({
  name: 'MonacoEditor',
  props: {
    value: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'javascript',
    },
    theme: {
      type: String,
      default: 'vs',
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    height: {
      type: String,
      default: '300px',
    },
    extraLibs: {
      type: Array as () => { content: string; filePath?: string }[],
      default: () => [],
    },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const containerRef = ref<HTMLElement | null>(null)
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null

    onMounted(async () => {
      if (!containerRef.value) return
      const monaco = await loadMonaco()
      if (!containerRef.value) return

      // Register extra libs
      if (props.extraLibs.length > 0) {
        // @ts-expect-error - Monaco editor types might be outdated or incomplete
        monaco.languages.typescript.javascriptDefaults.setExtraLibs(
          props.extraLibs,
        )
      }

      // 创建编辑器实例
      editor = monaco.editor.create(containerRef.value, {
        value: props.value,
        language: props.language,
        theme: props.theme,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly: props.readOnly,
        fontSize: 14,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
      })

      // 监听内容变化
      editor.onDidChangeModelContent(() => {
        const value = editor?.getValue() || ''
        if (value !== props.value) {
          emit('change', value)
        }
      })
    })

    // 监听props变化
    watch(
      () => props.value,
      newValue => {
        if (editor && editor.getValue() !== newValue) {
          editor.setValue(newValue)
        }
      },
    )

    watch(
      () => props.language,
      newLanguage => {
        if (editor) {
          loadMonaco().then(monaco => {
            const model = editor && editor.getModel()
            if (model) {
              monaco.editor.setModelLanguage(model, newLanguage)
            }
          })
        }
      },
    )

    watch(
      () => props.theme,
      newTheme => {
        if (editor) {
          loadMonaco().then(monaco => {
            monaco.editor.setTheme(newTheme)
          })
        }
      },
    )

    watch(
      () => props.extraLibs,
      newLibs => {
        if (newLibs.length > 0) {
          loadMonaco().then(monaco => {
            // @ts-expect-error - Monaco editor types might be outdated or incomplete
            monaco.languages.typescript.javascriptDefaults.setExtraLibs(newLibs)
          })
        }
      },
      { deep: true },
    )

    onBeforeUnmount(() => {
      if (editor) {
        editor.dispose()
        editor = null
      }
    })

    return () => (
      <div
        ref={containerRef}
        style={{ width: '100%', height: props.height }}
      ></div>
    )
  },
})

export default MonacoEditor
