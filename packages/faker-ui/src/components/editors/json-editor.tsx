import { defineComponent, ref, watch } from 'vue'
import { NInput } from 'naive-ui'

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

    function handleBlur() {
      // 尝试格式化 JSON
      try {
        const parsed = JSON.parse(textValue.value)
        textValue.value = JSON.stringify(parsed, null, 2)
        props.onChange(textValue.value)
      } catch {
        // 不是有效 JSON，保持原样
      }
    }

    return () => (
      <NInput
        v-model:value={textValue.value}
        type="textarea"
        placeholder={props.placeholder}
        rows={15}
        onUpdateValue={handleChange}
        onBlur={handleBlur}
        style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;"
      />
    )
  },
})

export default JsonEditor
