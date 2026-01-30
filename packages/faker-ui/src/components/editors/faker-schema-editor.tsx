import { defineComponent, ref, watch } from 'vue'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { fakerMethodMap } from '@baicie/faker-shared'

interface SchemaItem {
  key: string
  module: string
  method: string
}

const FakerSchemaEditor = defineComponent({
  name: 'FakerSchemaEditor',
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
  setup(props) {
    const items = ref<SchemaItem[]>([])
    const modules = Object.keys(fakerMethodMap).map(key => ({
      label: key,
      value: key,
    }))

    // Parse initial value
    watch(
      () => props.value,
      newVal => {
        try {
          const parsed = JSON.parse(newVal || '{}')
          const newItems: SchemaItem[] = []
          for (const [key, config] of Object.entries(parsed)) {
            if (typeof config === 'object' && config !== null) {
              const { module, method } = config as any
              newItems.push({ key, module, method })
            }
          }
          // Only update if different to avoid cursor jumping issues if we were binding directly inputs
          // But here we are rebuilding the list.
          // Simple comparison to avoid loops
          if (JSON.stringify(newItems) !== JSON.stringify(items.value)) {
            items.value = newItems
          }
        } catch (e) {
          console.error('Failed to parse faker schema', e)
        }
      },
      { immediate: true },
    )

    const updateValue = () => {
      const schema: Record<string, { module: string; method: string }> = {}
      items.value.forEach(item => {
        if (item.key && item.module && item.method) {
          schema[item.key] = {
            module: item.module,
            method: item.method,
          }
        }
      })
      props.onChange(JSON.stringify(schema, null, 2))
    }

    const addItem = () => {
      items.value.push({ key: '', module: 'internet', method: 'email' })
      updateValue()
    }

    const removeItem = (index: number) => {
      items.value.splice(index, 1)
      updateValue()
    }

    const updateItem = (
      index: number,
      field: keyof SchemaItem,
      value: string,
    ) => {
      items.value[index][field] = value
      // If module changes, reset method to first available
      if (field === 'module') {
        const methods = fakerMethodMap[value as keyof typeof fakerMethodMap]
        if (methods && methods.length > 0) {
          items.value[index].method = methods[0]
        } else {
          items.value[index].method = ''
        }
      }
      updateValue()
    }

    return () => (
      <div class="border border-input rounded-md bg-card p-4 space-y-4">
        <div class="space-y-2">
          <div class="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
            <div class="col-span-4">Field Key</div>
            <div class="col-span-3">Module</div>
            <div class="col-span-4">Method</div>
            <div class="col-span-1"></div>
          </div>

          {items.value.map((item, index) => {
            const currentMethods = (
              fakerMethodMap[item.module as keyof typeof fakerMethodMap] || []
            ).map(m => ({
              label: m,
              value: m,
            }))

            return (
              <div key={index} class="grid grid-cols-12 gap-2 items-center">
                <div class="col-span-4">
                  <Input
                    modelValue={item.key}
                    onUpdate:modelValue={val =>
                      updateItem(index, 'key', val as string)
                    }
                    placeholder="e.g. username"
                  />
                </div>
                <div class="col-span-3">
                  <Select
                    modelValue={item.module}
                    onUpdate:modelValue={val =>
                      updateItem(index, 'module', val as string)
                    }
                    options={modules}
                  />
                </div>
                <div class="col-span-4">
                  <Select
                    modelValue={item.method}
                    onUpdate:modelValue={val =>
                      updateItem(index, 'method', val as string)
                    }
                    options={currentMethods}
                  />
                </div>
                <div class="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    class="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {items.value.length === 0 && (
            <div class="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-md">
              No fields defined. Add a field to start generating data.
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          class="w-full border-dashed"
        >
          <PlusIcon class="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>
    )
  },
})

export default FakerSchemaEditor
