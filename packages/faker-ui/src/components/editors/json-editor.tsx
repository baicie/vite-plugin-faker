import { defineComponent, ref, watch } from 'vue'
import MonacoEditor from '../monaco-editor'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  theme?: string
}

const JsonEditor = defineComponent({
  name: 'JsonEditor',
  props: {
    value: {
      type: String,
      required: true,
    },
    onChange: {
      type: Function as unknown as () => (value: string) => void,
      required: true,
    },
    placeholder: {
      type: String,
      default: '{}',
    },
    theme: {
      type: String,
      default: 'vs',
    },
  },
  setup(props: Props) {
    const textValue = ref(props.value)

    watch(
      () => props.value,
      newVal => {
        textValue.value = newVal
      },
    )

    function handleChange(value: string) {
      textValue.value = value
      props.onChange(value)
    }

    return () => (
      <div class="h-[400px] border border-input rounded-md overflow-hidden bg-card">
        <MonacoEditor
          value={textValue.value}
          language="json"
          onChange={handleChange}
          height="400px"
          theme={props.theme}
        />
      </div>
    )
  },
})

export default JsonEditor
