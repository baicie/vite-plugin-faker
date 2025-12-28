import { type PropType, defineComponent, ref } from 'vue'
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
        required: false
    }
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
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={close}>
        <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
             <div class="flex justify-between items-center mb-4">
                 <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Request Details</h3>
                 <button onClick={close} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <span class="sr-only">Close</span>
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
             </div>

             <TabGroup selectedIndex={selectedTab.value} onChange={(index) => { selectedTab.value = index }}>
                 <TabList class="flex space-x-1 rounded-xl bg-blue-900/20 p-1 dark:bg-gray-700/50">
                     {['Request', 'Response'].map(name => (
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
                                                 : 'text-blue-100 hover:bg-white/[0.12] hover:text-white dark:text-gray-300 dark:hover:bg-gray-700'
                                         )}
                                     >
                                         {name}
                                     </button>
                                 )
                             }}
                         />
                     ))}
                 </TabList>
                 <TabPanels class="mt-2">
                     <TabPanel class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2">
                         <div class="space-y-4">
                             <div>
                                 <h4 class="font-medium text-gray-700 dark:text-gray-300">Headers</h4>
                                 <pre class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto text-gray-800 dark:text-gray-200 border dark:border-gray-700 max-h-60">
                                     {formatJson(props.request.headers)}
                                 </pre>
                             </div>
                             {props.request.body && (
                                 <div>
                                     <h4 class="font-medium text-gray-700 dark:text-gray-300">Body</h4>
                                     <pre class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto text-gray-800 dark:text-gray-200 border dark:border-gray-700 max-h-96">
                                         {formatJson(props.request.body)}
                                     </pre>
                                 </div>
                             )}
                         </div>
                     </TabPanel>
                     <TabPanel class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2">
                         <div class="space-y-4">
                             <h4 class="font-medium text-gray-700 dark:text-gray-300">Status: {props.request.response?.statusCode}</h4>
                             <div>
                                 <h4 class="font-medium text-gray-700 dark:text-gray-300">Headers</h4>
                                 <pre class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto text-gray-800 dark:text-gray-200 border dark:border-gray-700 max-h-60">
                                     {formatJson(props.request.response?.headers)}
                                 </pre>
                             </div>
                             {props.request.response?.body && (
                                 <div>
                                     <h4 class="font-medium text-gray-700 dark:text-gray-300">Body</h4>
                                     <pre class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto text-gray-800 dark:text-gray-200 border dark:border-gray-700 max-h-96">
                                         {formatJson(props.request.response.body)}
                                     </pre>
                                 </div>
                             )}
                         </div>
                     </TabPanel>
                 </TabPanels>
             </TabGroup>
        </div>
      </div>
    )
  },
})

export default RequestDetail
