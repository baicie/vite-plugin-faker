import { defineComponent, ref } from 'vue'
import { NButton, NFormItem, NInput, NSelect, NSpace } from 'naive-ui'

interface Field {
  key: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  faker?: string
  children?: Field[]
}

interface Props {
  value: string | null
  responseType: 'static' | 'faker' | 'function'
  onChange: (value: string) => void
}

const VisualEditor = defineComponent({
  name: 'VisualEditor',
  props: {
    value: {
      type: String as () => string | null,
      default: null,
    },
    responseType: {
      type: String as () => 'static' | 'faker' | 'function',
      required: true,
    },
    onChange: {
      type: Function as unknown as () => (value: string) => void,
      required: true,
    },
  },
  setup(props: Props) {
    const fields = ref<Field[]>([])

    const typeOptions = [
      { label: '文本', value: 'string' },
      { label: '数字', value: 'number' },
      { label: '布尔值', value: 'boolean' },
      { label: '日期', value: 'date' },
      { label: '对象', value: 'object' },
      { label: '数组', value: 'array' },
    ]

    const fakerOptions = [
      { label: '姓名', value: 'faker.person.firstName' },
      { label: '邮箱', value: 'faker.internet.email' },
      { label: '数字', value: 'faker.number.int' },
      { label: '日期', value: 'faker.date.past' },
      { label: 'UUID', value: 'faker.string.uuid' },
    ]

    function addField() {
      fields.value.push({
        key: `field_${Date.now()}`,
        type: 'string',
      })
      updateOutput()
    }

    function removeField(index: number) {
      fields.value.splice(index, 1)
      updateOutput()
    }

    function updateOutput() {
      const obj: any = {}
      fields.value.forEach(field => {
        if (props.responseType === 'faker' && field.faker) {
          obj[field.key] = `{{${field.faker}}}`
        } else {
          obj[field.key] = getDefaultValue(field.type)
        }
      })
      props.onChange(JSON.stringify(obj, null, 2))
    }

    function getDefaultValue(type: string): any {
      switch (type) {
        case 'string':
          return ''
        case 'number':
          return 0
        case 'boolean':
          return false
        case 'date':
          return new Date().toISOString()
        case 'object':
          return {}
        case 'array':
          return []
        default:
          return ''
      }
    }

    return () => (
      <div>
        <div style="margin-bottom: 16px;">
          <NButton onClick={addField}>添加字段</NButton>
        </div>

        {fields.value.map((field, index) => (
          <div
            key={field.key}
            style="margin-bottom: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 4px;"
          >
            <NSpace vertical>
              <NFormItem label="字段名">
                <NInput
                  value={field.key}
                  onUpdateValue={val => {
                    field.key = val
                    updateOutput()
                  }}
                />
              </NFormItem>

              <NFormItem label="类型">
                <NSelect
                  value={field.type}
                  options={typeOptions}
                  onUpdateValue={val => {
                    field.type = val as any
                    updateOutput()
                  }}
                />
              </NFormItem>

              {props.responseType === 'faker' && (
                <NFormItem label="Faker方法">
                  <NSelect
                    value={field.faker}
                    options={fakerOptions}
                    onUpdateValue={val => {
                      field.faker = val
                      updateOutput()
                    }}
                  />
                </NFormItem>
              )}

              <NButton
                size="small"
                type="error"
                onClick={() => removeField(index)}
              >
                删除
              </NButton>
            </NSpace>
          </div>
        ))}

        {fields.value.length === 0 && (
          <div style="text-align: center; color: #999; padding: 40px;">
            点击"添加字段"开始创建
          </div>
        )}
      </div>
    )
  },
})

export default VisualEditor
