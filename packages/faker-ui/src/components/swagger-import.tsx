import { defineComponent, ref, computed } from 'vue'
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
    const progress = ref(0)
    const status = ref('') // 'parsing', 'importing', 'success', 'error'
    const importedCount = ref(0)
    const totalCount = ref(0)

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
      progress.value = 0
      status.value = 'parsing'
      importedCount.value = 0
      totalCount.value = 0

      try {
        const response = await window.fetch(url.value)
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

        totalCount.value = mocks.length

        if (mocks.length > 0) {
          status.value = 'importing'

          // Batch import
          const batchSize = 10
          const batches = []
          for (let i = 0; i < mocks.length; i += batchSize) {
            batches.push(mocks.slice(i, i + batchSize))
          }

          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]
            await importMocks(batch)
            importedCount.value += batch.length
            progress.value = Math.round(
              (importedCount.value / totalCount.value) * 100,
            )

            // Small delay to allow UI update and prevent blocking
            await new Promise(resolve => setTimeout(resolve, 50))
          }

          status.value = 'success'
          emit('success', importedCount.value)

          // Auto close after success
          setTimeout(() => {
            close()
          }, 1500)
        } else {
          error.value = 'No mocks found in swagger'
          status.value = 'error'
        }
      } catch (e: any) {
        error.value = e.message || 'Failed to parse swagger'
        status.value = 'error'
      } finally {
        loading.value = false
      }
    }

    function close() {
      if (loading.value) return // Prevent closing while loading
      emit('close')
      url.value = ''
      error.value = ''
      progress.value = 0
      status.value = ''
    }

    const progressColor = computed(() => {
      if (status.value === 'error') return 'bg-red-500'
      if (status.value === 'success') return 'bg-green-500'
      return 'bg-blue-600'
    })

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
                      disabled={loading.value}
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
                        disabled={loading.value}
                      />
                    </div>

                    {/* Progress Bar */}
                    {loading.value && (
                      <div class="mt-4">
                        <div class="flex justify-between text-xs mb-1 text-gray-500">
                          <span>
                            {status.value === 'parsing'
                              ? 'Parsing JSON...'
                              : `Importing: ${importedCount.value}/${totalCount.value}`}
                          </span>
                          <span>{progress.value}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                          <div
                            class={`h-2.5 rounded-full transition-all duration-300 ${progressColor.value}`}
                            style={{ width: `${progress.value}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {error.value && (
                      <p class="text-red-500 text-sm mt-2">{error.value}</p>
                    )}
                    {status.value === 'success' && (
                      <p class="text-green-500 text-sm mt-2">
                        Successfully imported {importedCount.value} mocks!
                      </p>
                    )}
                  </div>

                  <div class="mt-6 flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={close}
                      disabled={loading.value}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={parseSwagger}
                      disabled={loading.value || !url.value}
                    >
                      {loading.value
                        ? status.value === 'parsing'
                          ? 'Parsing...'
                          : 'Importing...'
                        : 'Import'}
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
