import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  type PropType,
  Transition,
  defineComponent,
  reactive,
  ref,
  watch,
} from 'vue'
import type { MatchRule, MockConfig, UrlMatchType } from '@baicie/faker-shared'
import { createMock, updateMock } from '../../api'
import CodeEditor from '../../components/editors/code-editor'
import JsonEditor from '../../components/editors/json-editor'
import FakerSchemaEditor from '../../components/editors/faker-schema-editor'
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
    const isDark = ref(document.documentElement.classList.contains('dark'))

    const extraLibs = [
      {
        content: `
          declare interface MockContext {
            req: any;
            url: string;
            method?: string;
            headers: Record<string, string | string[] | undefined>;
            query: Record<string, any>;
            body: any;
          }
          declare interface MockResponse<T = any> {
            status: number;
            headers?: Record<string, string>;
            body: T;
            delay?: number;
          }
          declare function handler(ctx: MockContext): MockResponse | Promise<MockResponse>;
        `,
        filePath: 'types.d.ts',
      },
    ]

    watch(
      () => props.show,
      val => {
        if (val) {
          isDark.value = document.documentElement.classList.contains('dark')
        }
      },
    )

    // 表单数据
    const formData = reactive({
      id: '',
      name: '',
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
      headers: JSON.stringify({ 'Content-Type': 'application/json' }, null, 2),
      // Proxy 代理配置
      proxyTarget: '',
      proxyTimeout: 30000,
      proxyRewriteHeaders: true,
      // 高级匹配规则
      urlPattern: '',
      urlMatchType: 'exact' as UrlMatchType,
      priority: 0,
      // 分组和标签
      group: '',
      tags: '',
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
      { label: '代理转发', value: 'proxy' },
      { label: 'Faker模板', value: 'faker' },
      { label: '自定义函数', value: 'function' },
      { label: '错误响应', value: 'error' },
      { label: '状态机', value: 'stateful' },
    ]

    const urlMatchTypeOptions = [
      { label: '精确匹配', value: 'exact' },
      { label: '通配符', value: 'wildcard' },
      { label: '正则表达式', value: 'regex' },
      { label: '前缀匹配', value: 'prefix' },
    ]

    watch(
      () => props.mock,
      newVal => {
        if (!newVal) {
          // 重置表单
          Object.assign(formData, {
            id: '',
            name: '',
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
            headers: JSON.stringify(
              { 'Content-Type': 'application/json' },
              null,
              2,
            ),
            // 新增字段
            proxyTarget: '',
            proxyTimeout: 30000,
            proxyRewriteHeaders: true,
            urlPattern: '',
            urlMatchType: 'exact',
            priority: 0,
            group: '',
            tags: '',
          })
        } else {
          // Map MockConfig to formData
          formData.id = newVal.id || ''
          formData.name = newVal.name || ''
          formData.url = newVal.url
          formData.method = newVal.method
          formData.enabled = newVal.enabled
          formData.description = newVal.description || ''
          formData.priority = newVal.priority || 0
          formData.group = newVal.group || ''
          formData.tags = (newVal.tags || []).join(', ')

          // 匹配规则
          if (newVal.matchRule) {
            const rule = newVal.matchRule
            formData.urlPattern = rule.url?.pattern || ''
            formData.urlMatchType = rule.url?.type || 'exact'
          } else {
            formData.urlPattern = ''
            formData.urlMatchType = 'exact'
          }

          if (newVal.type === 'static') {
            formData.responseType = 'static'
            // Add safety check for response property
            const response = newVal.response || {
              status: 200,
              headers: {},
              body: {},
              delay: 0,
            }
            formData.statusCode = response.status || 200
            formData.delay = response.delay || 0
            formData.headers = JSON.stringify(response.headers || {}, null, 2)
            formData.responseData = JSON.stringify(response.body || {}, null, 2)
          } else if (newVal.type === 'proxy') {
            formData.responseType = 'proxy'
            formData.proxyTarget = (newVal as any).target || ''
            formData.proxyTimeout = (newVal as any).timeout || 30000
            formData.proxyRewriteHeaders =
              (newVal as any).rewriteHeaders !== false
          } else if (newVal.type === 'template') {
            formData.responseType = 'faker'
            formData.responseTemplate = JSON.stringify(
              newVal.schema || {},
              null,
              2,
            )
          } else if (newVal.type === 'function') {
            formData.responseType = 'function'
            // Function handler editing not fully supported yet
          } else if (newVal.type === 'error') {
            formData.responseType = 'error'
            const response = newVal.response || {
              status: 500,
              headers: {},
              body: {},
              delay: 0,
            }
            formData.statusCode = response.status || 500
            formData.delay = response.delay || 0
            formData.headers = JSON.stringify(response.headers || {}, null, 2)
            formData.responseData = JSON.stringify(response.body || {}, null, 2)
          } else if (newVal.type === 'stateful') {
            formData.responseType = 'stateful'
            // Stateful editing logic can be complex, for now we can just show the first state or handle it similarly
            // Ideally we need a list editor for states
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
          name: formData.name || undefined,
          url: formData.url,
          method: formData.method,
          enabled: formData.enabled,
          description: formData.description || undefined,
          priority: formData.priority || undefined,
          group: formData.group || undefined,
          tags:
            formData.tags
              ?.split(',')
              .map(t => t.trim())
              .filter(Boolean) || undefined,
        }

        // 构建匹配规则
        const matchRule: MatchRule = {}
        if (formData.urlPattern) {
          matchRule.url = {
            pattern: formData.urlPattern,
            type: formData.urlMatchType,
          }
        }

        let headers = {}
        try {
          headers = JSON.parse(formData.headers)
        } catch (e) {
          alert('Headers is not valid JSON')
          saving.value = false
          return
        }

        // 如果有匹配规则，添加到 base 中
        if (Object.keys(matchRule).length > 0) {
          ;(base as any).matchRule = matchRule
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
              headers: headers as Record<string, string>,
            },
          }
        } else if (formData.responseType === 'proxy') {
          // 代理类型
          if (!formData.proxyTarget) {
            alert('代理目标 URL 不能为空')
            saving.value = false
            return
          }
          data = {
            ...base,
            type: 'proxy',
            target: formData.proxyTarget,
            timeout: formData.proxyTimeout,
            rewriteHeaders: formData.proxyRewriteHeaders,
          } as any
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
        } else if (formData.responseType === 'error') {
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
            type: 'error',
            response: {
              status: formData.statusCode,
              body,
              delay: formData.delay,
              headers: headers as Record<string, string>,
            },
          }
        } else if (formData.responseType === 'stateful') {
          // Simplified stateful creation
          data = {
            ...base,
            type: 'stateful',
            states: [
              {
                status: formData.statusCode,
                body: {},
                delay: formData.delay,
                headers: headers as Record<string, string>,
              },
            ],
            current: 0,
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
        <Dialog as="div" class="relative z-[100000]" onClose={close}>
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="fixed inset-0 bg-black/25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as="template"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel class="w-full max-w-[90vw] transform overflow-hidden rounded-lg bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    class="text-lg font-medium leading-6 text-foreground mb-6"
                  >
                    {formData.id ? 'Edit Mock' : 'Create Mock'}
                  </DialogTitle>

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
                          <div key="basic-tab">
                            <div class="grid grid-cols-12 gap-4">
                              <div class="col-span-6">
                                <label class="block text-sm font-medium text-foreground mb-1">
                                  Name
                                </label>
                                <Input
                                  modelValue={formData.name}
                                  onUpdate:modelValue={val =>
                                    (formData.name = val as string)
                                  }
                                  placeholder="Mock Name"
                                />
                              </div>
                              <div class="col-span-6">
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
                            </div>
                            <div class="grid grid-cols-12 gap-4">
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
                              <div class="col-span-4">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Priority
                                </label>
                                <Input
                                  type="number"
                                  modelValue={formData.priority}
                                  onUpdate:modelValue={val =>
                                    (formData.priority = Number(val))
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div class="grid grid-cols-12 gap-4">
                              <div class="col-span-6">
                                <label class="block text-sm font-medium text-foreground mb-1">
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
                              <div class="col-span-6">
                                <label class="block text-sm font-medium text-foreground mb-1">
                                  Group
                                </label>
                                <Input
                                  modelValue={formData.group}
                                  onUpdate:modelValue={val =>
                                    (formData.group = val as string)
                                  }
                                  placeholder="e.g., users, orders"
                                />
                              </div>
                            </div>
                            <div class="grid grid-cols-12 gap-4">
                              <div class="col-span-12">
                                <label class="block text-sm font-medium text-foreground mb-1">
                                  Tags (逗号分隔)
                                </label>
                                <Input
                                  modelValue={formData.tags}
                                  onUpdate:modelValue={val =>
                                    (formData.tags = val as string)
                                  }
                                  placeholder="e.g., v1, deprecated, test"
                                />
                              </div>
                            </div>
                          </div>
                        </Transition>
                      </TabPanel>
                      <TabPanel class="space-y-4">
                        <Transition name="fade-slide" mode="out-in">
                          <div key="response-tab">
                            <div class="mb-4">
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

                            {['static', 'error'].includes(
                              formData.responseType,
                            ) && (
                              <div class="space-y-4">
                                <div class="grid grid-cols-12 gap-4">
                                  <div class="col-span-6">
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
                                  <div class="col-span-6">
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
                                  <JsonEditor
                                    value={formData.responseData as string}
                                    onChange={val =>
                                      (formData.responseData = val)
                                    }
                                    theme={isDark.value ? 'vs-dark' : 'vs'}
                                  />
                                </div>
                              </div>
                            )}

                            {formData.responseType === 'proxy' && (
                              <div class="space-y-4">
                                <div class="grid grid-cols-12 gap-4">
                                  <div class="col-span-12">
                                    <label class="block text-sm font-medium text-foreground mb-1">
                                      代理目标 URL
                                    </label>
                                    <Input
                                      modelValue={formData.proxyTarget}
                                      onUpdate:modelValue={val =>
                                        (formData.proxyTarget = val as string)
                                      }
                                      placeholder="http://localhost:3000/api/users"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                      请求将被转发到该目标地址
                                    </p>
                                  </div>
                                </div>
                                <div class="grid grid-cols-12 gap-4">
                                  <div class="col-span-6">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      超时时间 (ms)
                                    </label>
                                    <Input
                                      type="number"
                                      modelValue={formData.proxyTimeout}
                                      onUpdate:modelValue={val =>
                                        (formData.proxyTimeout = Number(val))
                                      }
                                    />
                                  </div>
                                  <div class="col-span-6 flex items-center pt-6">
                                    <label class="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                      透传 Headers
                                    </label>
                                    <Switch
                                      modelValue={formData.proxyRewriteHeaders}
                                      onUpdate:modelValue={val =>
                                        (formData.proxyRewriteHeaders = val)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {formData.responseType === 'faker' && (
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Faker Schema
                                </label>
                                <FakerSchemaEditor
                                  value={formData.responseTemplate as string}
                                  onChange={val =>
                                    (formData.responseTemplate = val)
                                  }
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                  Use Faker.js schema to generate dynamic data.
                                </p>
                              </div>
                            )}

                            {formData.responseType === 'function' && (
                              <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Function Handler
                                </label>
                                <CodeEditor
                                  value={formData.responseCode}
                                  onChange={val =>
                                    (formData.responseCode = val)
                                  }
                                  theme={isDark.value ? 'vs-dark' : 'vs'}
                                  extraLibs={extraLibs}
                                />
                              </div>
                            )}

                            {formData.responseType === 'stateful' && (
                              <div class="text-center py-8 text-muted-foreground">
                                <p>
                                  Stateful mock editing is not fully supported
                                  in UI yet.
                                </p>
                                <p class="text-sm mt-2">
                                  It will create a default stateful mock which
                                  you can modify later.
                                </p>
                              </div>
                            )}
                          </div>
                        </Transition>
                      </TabPanel>
                      <TabPanel>
                        <Transition name="fade-slide" mode="out-in">
                          <div key="advanced-tab" class="space-y-6">
                            {/* URL 匹配规则 */}
                            <div class="bg-card border border-border rounded-lg p-4">
                              <h4 class="text-sm font-medium text-foreground mb-4">
                                URL 匹配规则
                              </h4>
                              <div class="grid grid-cols-12 gap-4">
                                <div class="col-span-6">
                                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    匹配模式
                                  </label>
                                  <Input
                                    modelValue={formData.urlPattern}
                                    onUpdate:modelValue={val =>
                                      (formData.urlPattern = val as string)
                                    }
                                    placeholder="/api/users/*"
                                  />
                                </div>
                                <div class="col-span-6">
                                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    匹配类型
                                  </label>
                                  <Select
                                    modelValue={formData.urlMatchType}
                                    onUpdate:modelValue={val =>
                                      (formData.urlMatchType =
                                        val as UrlMatchType)
                                    }
                                    options={urlMatchTypeOptions}
                                  />
                                </div>
                              </div>
                              <p class="text-xs text-muted-foreground mt-2">
                                当 Basic 中的 URL
                                无法精确匹配时，使用此规则进行高级匹配
                              </p>
                            </div>

                            {/* Response Headers */}
                            <div class="bg-card border border-border rounded-lg p-4">
                              <h4 class="text-sm font-medium text-foreground mb-4">
                                Response Headers
                              </h4>
                              <JsonEditor
                                value={formData.headers}
                                onChange={val => (formData.headers = val)}
                                theme={isDark.value ? 'vs-dark' : 'vs'}
                              />
                            </div>
                          </div>
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
