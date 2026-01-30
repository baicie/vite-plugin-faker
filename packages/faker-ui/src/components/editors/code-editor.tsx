import { defineComponent, ref, watch } from 'vue'
import MonacoEditor from '../monaco-editor'

interface Props {
  value: string
  onChange: (value: string) => void
  theme?: string
  extraLibs?: { content: string; filePath?: string }[]
}

const CodeEditor = defineComponent({
  name: 'CodeEditor',
  props: {
    value: {
      type: String,
      required: true,
    },
    onChange: {
      type: Function as unknown as () => (value: string) => void,
      required: true,
    },
    theme: {
      type: String,
      default: 'vs',
    },
    extraLibs: {
      type: Array as () => { content: string; filePath?: string }[],
      default: () => [],
    },
  },
  setup(props: Props) {
    const codeValue = ref(props.value)

    watch(
      () => props.value,
      newVal => {
        codeValue.value = newVal
      },
    )

    function handleChange(value: string) {
      codeValue.value = value
      props.onChange(value)
    }

    return () => (
      <div class="h-[400px] border border-input rounded-md overflow-hidden bg-card">
        <MonacoEditor
          value={codeValue.value}
          language="javascript"
          onChange={handleChange}
          height="400px"
          theme={props.theme}
          extraLibs={props.extraLibs}
        />
      </div>
    )
  },
})

export default CodeEditor
