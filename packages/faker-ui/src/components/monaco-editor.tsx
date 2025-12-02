import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

type MonacoType = typeof Monaco

let monacoPromise: Promise<MonacoType> | null = null

const loadMonaco = (): Promise<MonacoType> => {
  if (!monacoPromise) {
    // 使用 loader 懒加载 Monaco，避免在主 bundle 中直接打入全部编辑器代码
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
  },
  emits: ['change'],
  setup(props, { emit }) {
    const containerRef = ref<HTMLElement | null>(null)
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null

    onMounted(async () => {
      if (!containerRef.value) return
      const monaco = await loadMonaco()
      if (!containerRef.value) return

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

    // 组件销毁前释放资源
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
