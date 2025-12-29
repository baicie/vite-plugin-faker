import { defineComponent, ref, watch } from 'vue'
import MonacoEditor from '../monaco-editor'

interface Props {
  value: string
  onChange: (value: string) => void
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
      <div class="h-[400px] border border-gray-200 rounded-md dark:border-gray-800 overflow-hidden">
        <MonacoEditor
          value={codeValue.value}
          language="javascript"
          onChange={handleChange}
          height="400px"
        />
      </div>
    )
  },
})

export default CodeEditor
