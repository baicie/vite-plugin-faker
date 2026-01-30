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
  Transition,
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
                <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-lg bg-card border border-border p-6 text-left align-middle shadow-none transition-all">
                  <Dialog.Title
                    as="h3"
                    class="text-lg font-medium leading-6 text-foreground mb-6"
                  >
                    {formData.id ? 'Edit Mock' : 'Create Mock'}
                  </Dialog.Title>

                  <TabGroup
                    selectedIndex={activeTab.value}
                    onChange={index => {
                      activeTab.value = index
                    }}
                  >
                    <TabList class="flex space-x-6 border-b border-border mb-6">
                      {['Basic', 'Response', 'Advanced'].map(name => (
                        <Tab
                          key={name}
                          as="template"
                          v-slots={{
                            default: ({ selected }: { selected: boolean }) => (
                              <button
                                class={clsx(
                                  'pb-2 text-sm font-medium leading-5 transition-colors focus:outline-none relative text-foreground cursor-pointer',
                                  selected
                                    ? ''
                                    : 'text-muted-foreground hover:text-foreground',
                                )}
                              >
                                {name}
                                {selected && (
                                  <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-tab-underline" />
                                )}
                              </button>
                            ),
                          }}
                        />
                      ))}
                    </TabList>
                    <TabPanels>
                      <TabPanel class="space-y-4">
                        <Transition name="fade-slide" mode="out-in">
                          <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-8">
                              <label class="block text-sm font-medium text-foreground mb-1">
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
                        </Transition>
                      </TabPanel>
                      <TabPanel class="space-y-4">
                        <Transition name="fade-slide" mode="out-in">
                          <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-4">
                              <label class="block text-sm font-medium text-foreground mb-1">
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
                        </Transition>
                      </TabPanel>
                      <TabPanel>
                        <Transition name="fade-slide" mode="out-in">
                          <p class="text-muted-foreground">
                            Advanced settings coming soon...
                          </p>
                        </Transition>
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
