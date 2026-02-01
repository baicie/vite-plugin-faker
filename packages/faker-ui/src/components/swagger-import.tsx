import { defineComponent, ref } from 'vue'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { importMocks } from '../api/mock'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import type { MockConfig } from '@baicie/faker-shared'
import { XMarkIcon } from '@heroicons/vue/24/outline'

export default defineComponent({
  name: 'SwaggerImport',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'success'],
  setup(props, { emit }) {
    const url = ref('')
    const loading = ref(false)
    const error = ref('')

    // Simple schema to example generator
    function generateExample(schema: any, spec: any, depth = 0): any {
      if (depth > 5) return null // Prevent infinite recursion

      if (!schema) return null

      if (schema.$ref) {
        const refPath = schema.$ref.replace('#/', '').split('/')
        let refSchema = spec
        for (const part of refPath) {
          refSchema = refSchema?.[part]
        }
        return generateExample(refSchema, spec, depth + 1)
      }

      if (schema.example) return schema.example

      switch (schema.type) {
        case 'object':
          if (schema.properties) {
            const obj: any = {}
            for (const key in schema.properties) {
              obj[key] = generateExample(
                schema.properties[key],
                spec,
                depth + 1,
              )
            }
            return obj
          }
          return {}
        case 'array':
          if (schema.items) {
            return [generateExample(schema.items, spec, depth + 1)]
          }
          return []
        case 'string':
          if (schema.format === 'date-time') return new Date().toISOString()
          if (schema.enum) return schema.enum[0]
          return 'string'
        case 'integer':
        case 'number':
          return 0
        case 'boolean':
          return true
        default:
          return null
      }
    }

    async function parseSwagger() {
      if (!url.value) return
      loading.value = true
      error.value = ''
      try {
        const response = await fetch(url.value)
        const spec = await response.json()
        const mocks: MockConfig[] = []

        if (spec.paths) {
          for (const [path, methods] of Object.entries(spec.paths)) {
            for (const [method, operation] of Object.entries(methods as any)) {
              // Try to find a success response
              const op = operation as any
              const successResponse =
                op.responses?.['200'] ||
                op.responses?.['201'] ||
                op.responses?.['default']
              let responseData = {}

              // Handle OpenAPI 3.0
              if (successResponse?.content?.['application/json']?.schema) {
                responseData =
                  generateExample(
                    successResponse.content['application/json'].schema,
                    spec,
                  ) || {}
              }
              // Handle Swagger 2.0
              else if (successResponse?.schema) {
                responseData =
                  generateExample(successResponse.schema, spec) || {}
              }

              mocks.push({
                url: path.replace(/{([^}]+)}/g, ':$1'), // Convert {param} to :param
                method: method.toUpperCase(),
                type: 'static',
                enabled: true,
                statusCode: 200,
                responseData: responseData,
                name: op.summary || op.operationId || path,
              } as unknown as MockConfig)
            }
          }
        }

        if (mocks.length > 0) {
          const result = await importMocks(mocks)
          if (result.success) {
            emit('success', result.count)
            close()
          } else {
            error.value = 'Import failed'
          }
        } else {
          error.value = 'No mocks found in swagger'
        }
      } catch (e: any) {
        error.value = e.message || 'Failed to parse swagger'
      } finally {
        loading.value = false
      }
    }

    function close() {
      emit('close')
      url.value = ''
      error.value = ''
    }

    return () => (
      <TransitionRoot appear show={props.show} as="template">
        <Dialog as="div" class="relative z-[99999]" onClose={close}>
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="duration-200 ease-in"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="fixed inset-0 bg-black/25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as="template"
                enter="duration-300 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="duration-200 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center"
                  >
                    Import Swagger/OpenAPI
                    <button
                      onClick={close}
                      class="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon class="h-5 w-5" />
                    </button>
                  </DialogTitle>

                  <div class="mt-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Enter the URL of your Swagger/OpenAPI JSON specification.
                    </p>
                    <div class="flex gap-2">
                      <Input
                        modelValue={url.value}
                        onUpdate:modelValue={v => (url.value = v as string)}
                        placeholder="https://petstore.swagger.io/v2/swagger.json"
                        class="flex-1"
                      />
                    </div>
                    {error.value && (
                      <p class="text-red-500 text-sm mt-2">{error.value}</p>
                    )}
                  </div>

                  <div class="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={close}>
                      Cancel
                    </Button>
                    <Button
                      onClick={parseSwagger}
                      disabled={loading.value || !url.value}
                    >
                      {loading.value ? 'Importing...' : 'Import'}
                    </Button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    )
  },
})
