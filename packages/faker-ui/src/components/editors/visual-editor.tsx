import { defineComponent, ref } from 'vue'
import { Button } from '../ui/button'

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
      { label: 'String', value: 'string' },
      { label: 'Number', value: 'number' },
      { label: 'Boolean', value: 'boolean' },
      { label: 'Date', value: 'date' },
      { label: 'Object', value: 'object' },
      { label: 'Array', value: 'array' },
    ]

    const fakerOptions = [
      { label: 'Name', value: 'faker.person.firstName' },
      { label: 'Email', value: 'faker.internet.email' },
      { label: 'Number', value: 'faker.number.int' },
      { label: 'Date', value: 'faker.date.past' },
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
        <div class="mb-4">
          <Button onClick={addField}>
            Add Field
          </Button>
        </div>

        <div class="space-y-4">
          {fields.value.map((field, index) => (
            <div
              key={index}
              class="flex items-center space-x-4 p-4 border border-border rounded-lg bg-card/50"
            >
              <div class="flex-1">
                <label class="block text-sm font-medium leading-6 text-foreground">
                  Key
                </label>
                <div class="mt-1">
                  <input
                    type="text"
                    value={field.key}
                    onInput={e => {
                      field.key = (e.target as HTMLInputElement).value
                      updateOutput()
                    }}
                    class="block w-full rounded-md border-0 py-1.5 bg-background text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-ring sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div class="w-32">
                <label class="block text-sm font-medium leading-6 text-foreground">
                  Type
                </label>
                <div class="mt-1">
                  <select
                    value={field.type}
                    onChange={e => {
                      field.type = (e.target as HTMLSelectElement).value as any
                      updateOutput()
                    }}
                    class="block w-full rounded-md border-0 py-1.5 bg-background text-foreground shadow-sm ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-ring sm:text-sm sm:leading-6"
                  >
                    {typeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {props.responseType === 'faker' && (
                <div class="w-48">
                  <label class="block text-sm font-medium leading-6 text-foreground">
                    Faker
                  </label>
                  <div class="mt-1">
                    <select
                      value={field.faker || ''}
                      onChange={e => {
                        field.faker = (e.target as HTMLSelectElement).value
                        updateOutput()
                      }}
                      class="block w-full rounded-md border-0 py-1.5 bg-background text-foreground shadow-sm ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-ring sm:text-sm sm:leading-6"
                    >
                      <option value="">Select...</option>
                      {fakerOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div class="pt-6">
                <Button
                  onClick={() => removeField(index)}
                  variant="link"
                  class="text-red-500 hover:text-red-600 p-0 h-auto"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
})

export default VisualEditor
