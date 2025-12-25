import { defineComponent, ref, watch } from 'vue'
import MonacoEditor from '../monaco-editor'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
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
      <div style="height: 400px; border: 1px solid #ddd; border-radius: 4px;">
        <MonacoEditor
          value={textValue.value}
          language="json"
          onChange={handleChange}
          height="400px"
        />
      </div>
    )
  },
})

export default JsonEditor
