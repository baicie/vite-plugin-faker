import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
// @ts-expect-error
import 'monaco-editor/esm/vs/language/typescript/ts.worker'
// @ts-expect-error
import 'monaco-editor/esm/vs/language/json/json.worker'

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
    let editor: monaco.editor.IStandaloneCodeEditor | null = null

    onMounted(() => {
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
          monaco.editor.setModelLanguage(editor.getModel()!, newLanguage)
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
