import { type PropType, Transition, defineComponent, ref } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import type { RequestRecord } from '@baicie/faker-shared'
import clsx from 'clsx'

const RequestDetail = defineComponent({
  name: 'RequestDetail',
  props: {
    request: {
      type: Object as PropType<RequestRecord>,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: false,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const selectedTab = ref(0)

    function formatJson(obj: any) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch (_e) {
        return String(obj)
      }
    }

    const close = () => {
      if (props.onClose) {
        props.onClose()
      } else {
        emit('close')
      }
    }

    return () => (
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        onClick={close}
      >
        <div
          class="w-full max-w-[90vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg p-6 z-[10000]"
          onClick={e => e.stopPropagation()}
        >
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
              Request Details
            </h3>
            <button
              onClick={close}
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
            >
              <span class="sr-only">Close</span>
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <TabGroup
            selectedIndex={selectedTab.value}
            onChange={index => {
              selectedTab.value = index
            }}
          >
            <TabList class="flex space-x-6 border-b border-border mb-6">
              {['Request', 'Response'].map(name => (
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
              <TabPanel class="space-y-4 focus:outline-none">
                <Transition name="fade-slide" mode="out-in">
                  <div>
                    <h4 class="font-medium text-foreground mb-2">Headers</h4>
                    <pre class="p-3 bg-card rounded-md text-xs overflow-auto text-foreground border border-border max-h-60">
                      {formatJson(props.request.headers)}
                    </pre>
                  </div>
                  {props.request.body && (
                    <div>
                      <h4 class="font-medium text-foreground mb-2">Body</h4>
                      <pre class="p-3 bg-card rounded-md text-xs overflow-auto text-foreground border border-border max-h-96">
                        {formatJson(props.request.body)}
                      </pre>
                    </div>
                  )}
                </Transition>
              </TabPanel>
              <TabPanel class="space-y-4 focus:outline-none">
                <Transition name="fade-slide" mode="out-in">
                  <h4 class="font-medium text-foreground">
                    Status: {props.request.response?.statusCode}
                  </h4>
                  <div>
                    <h4 class="font-medium text-foreground mb-2">Headers</h4>
                    <pre class="p-3 bg-card rounded-md text-xs overflow-auto text-foreground border border-border max-h-60">
                      {formatJson(props.request.response?.headers)}
                    </pre>
                  </div>
                  {props.request.response?.body && (
                    <div>
                      <h4 class="font-medium text-foreground mb-2">Body</h4>
                      <pre class="p-3 bg-card rounded-md text-xs overflow-auto text-foreground border border-border max-h-96">
                        {formatJson(props.request.response.body)}
                      </pre>
                    </div>
                  )}
                </Transition>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    )
  },
})

export default RequestDetail
