import {
  Dialog,
  DialogPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  Fragment,
  type PropType,
  defineComponent,
  reactive,
  ref,
  watch,
} from 'vue'
import type { MockConfig } from '@baicie/faker-shared'
import { createMock, updateMock } from '../../api'
import CodeEditor from '../../components/editors/code-editor'
import JsonEditor from '../../components/editors/json-editor'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import { Select } from '../../components/ui/select'
import clsx from 'clsx'

const MockEditor = defineComponent({
  name: 'MockEditor',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    mock: {
      type: Object as PropType<any>,
      default: null,
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const activeTab = ref(0) // 0: basic, 1: response, 2: advanced
    const saving = ref(false)

    // 表单数据
    const formData = reactive({
      id: '',
      url: '',
      method: 'GET',
      statusCode: 200,
      enabled: true,
      description: '',
      responseType: 'static',
      responseData: '{}',
      responseTemplate: '{}',
      responseCode: '',
      delay: 0,
      headers: { 'Content-Type': 'application/json' },
    })

    const methodOptions = [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' },
      { label: 'HEAD', value: 'HEAD' },
      { label: 'OPTIONS', value: 'OPTIONS' },
    ]

    const responseTypeOptions = [
      { label: '静态数据', value: 'static' },
      { label: 'Faker模板', value: 'faker' },
      { label: '自定义函数', value: 'function' },
    ]

    watch(
      () => props.mock,
      newVal => {
        if (!newVal) {
          // 重置表单
          Object.assign(formData, {
            id: '',
            url: '',
            method: 'GET',
            statusCode: 200,
            enabled: true,
            description: '',
            responseType: 'static',
            responseData: '{}',
            responseTemplate: '{}',
            responseCode: '',
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
          })
        } else {
          Object.assign(formData, { ...newVal })
          // Ensure string format for editors
          if (typeof formData.responseData === 'object') {
            formData.responseData = JSON.stringify(
              formData.responseData,
              null,
              2,
            )
          }
          if (typeof formData.responseTemplate === 'object') {
            formData.responseTemplate = JSON.stringify(
              formData.responseTemplate,
              null,
              2,
            )
          }
        }
      },
      { immediate: true },
    )

    async function handleSave() {
      if (!formData.url) {
        alert('URL is required')
        return
      }

      saving.value = true
      try {
        let data: MockConfig
        const base = {
          id: formData.id || undefined,
          url: formData.url,
          method: formData.method,
          enabled: formData.enabled,
          description: formData.description,
        }

        if (formData.responseType === 'static') {
          let body = formData.responseData
          try {
            if (typeof body === 'string') {
              body = JSON.parse(body)
            }
          } catch (e) {
            alert('Response Data is not valid JSON')
            saving.value = false
            return
          }
          data = {
            ...base,
            type: 'static',
            response: {
              status: formData.statusCode,
              body,
              delay: formData.delay,
              headers: formData.headers,
            },
          }
        } else if (formData.responseType === 'faker') {
          let schema: any = formData.responseTemplate
          try {
            if (typeof schema === 'string') {
              schema = JSON.parse(schema)
            }
          } catch (e) {
            alert('Response Template is not valid JSON')
            saving.value = false
            return
          }
          data = {
            ...base,
            type: 'template',
            schema,
          }
        } else {
          // Function type
          data = {
            ...base,
            type: 'function',
            handler: () => ({ status: 200, body: {} }),
          } as unknown as MockConfig
        }

        if (data.id) {
          await updateMock({ id: data.id, updates: data })
        } else {
          await createMock(data)
        }
        emit('save', data)
      } catch (error) {
        console.error(error)
        alert('Failed to save mock')
      } finally {
        saving.value = false
      }
    }

    const close = () => {
      emit('cancel')
    }

    return () => (
      <TransitionRoot appear show={props.show} as="template">
        <Dialog as="div" class="relative z-50" onClose={close}>
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4"
                  >
                    {formData.id ? 'Edit Mock' : 'Create Mock'}
                  </Dialog.Title>

                  <TabGroup
                    selectedIndex={activeTab.value}
                    onChange={index => {
                      activeTab.value = index
                    }}
                  >
                    <TabList class="flex space-x-1 rounded-xl bg-blue-900/20 p-1 dark:bg-gray-700/50 mb-4">
                      {['Basic', 'Response', 'Advanced'].map(name => (
                        <Tab
                          key={name}
                          as="template"
                          v-slots={{
                            default: ({ selected }: { selected: boolean }) => (
                              <button
                                class={clsx(
                                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                  selected
                                    ? 'bg-white shadow text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white dark:text-gray-300 dark:hover:bg-gray-700',
                                )}
                              >
                                {name}
                              </button>
                            ),
                          }}
                        />
                      ))}
                    </TabList>
                    <TabPanels>
                      <TabPanel class="space-y-4">
                        <div class="grid grid-cols-12 gap-4">
                          <div class="col-span-8">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              URL
                            </label>
                            <Input
                              modelValue={formData.url}
                              onUpdate:modelValue={val =>
                                (formData.url = val as string)
                              }
                              placeholder="/api/users"
                            />
                          </div>
                          <div class="col-span-4">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Method
                            </label>
                            <Select
                              modelValue={formData.method}
                              onUpdate:modelValue={val =>
                                (formData.method = val as string)
                              }
                              options={methodOptions}
                            />
                          </div>
                        </div>
                        <div class="grid grid-cols-12 gap-4">
                          <div class="col-span-8">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <Input
                              modelValue={formData.description}
                              onUpdate:modelValue={val =>
                                (formData.description = val as string)
                              }
                              placeholder="Description of this mock"
                            />
                          </div>
                          <div class="col-span-4 flex items-center pt-6">
                            <label class="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Enabled
                            </label>
                            <Switch
                              modelValue={formData.enabled}
                              onUpdate:modelValue={val =>
                                (formData.enabled = val)
                              }
                            />
                          </div>
                        </div>
                      </TabPanel>
                      <TabPanel class="space-y-4">
                        <div class="grid grid-cols-12 gap-4">
                          <div class="col-span-4">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Status Code
                            </label>
                            <Input
                              type="number"
                              modelValue={formData.statusCode}
                              onUpdate:modelValue={val =>
                                (formData.statusCode = Number(val))
                              }
                            />
                          </div>
                          <div class="col-span-4">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Response Type
                            </label>
                            <Select
                              modelValue={formData.responseType}
                              onUpdate:modelValue={val =>
                                (formData.responseType = val as string)
                              }
                              options={responseTypeOptions}
                            />
                          </div>
                          <div class="col-span-4">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Delay (ms)
                            </label>
                            <Input
                              type="number"
                              modelValue={formData.delay}
                              onUpdate:modelValue={val =>
                                (formData.delay = Number(val))
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Response Body
                          </label>
                          {formData.responseType === 'static' && (
                            <JsonEditor
                              value={formData.responseData as string}
                              onChange={val => (formData.responseData = val)}
                            />
                          )}
                          {formData.responseType === 'faker' && (
                            <JsonEditor
                              value={formData.responseTemplate as string}
                              onChange={val =>
                                (formData.responseTemplate = val)
                              }
                            />
                          )}
                          {formData.responseType === 'function' && (
                            <CodeEditor
                              value={formData.responseCode}
                              onChange={val => (formData.responseCode = val)}
                            />
                          )}
                        </div>
                      </TabPanel>
                      <TabPanel>
                        <p class="text-gray-500">
                          Advanced settings coming soon...
                        </p>
                      </TabPanel>
                    </TabPanels>
                  </TabGroup>

                  <div class="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving.value}>
                      {saving.value ? 'Saving...' : 'Save'}
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

export default MockEditor
