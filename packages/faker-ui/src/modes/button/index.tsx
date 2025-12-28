import { Fragment, defineComponent, ref } from 'vue'
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
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import MockList from '../../tabs/mock/mock-list'
import RequestList from '../../tabs/request/request-list'
import SettingsPanel from '../../tabs/setting/settings-panel'
import ThemeToggle from '../../components/ThemeToggle'

export default defineComponent({
  name: 'ButtonMode',
  setup() {
    const open = ref(false)
    const selectedTab = ref(0)

    const tabs = [
      { name: 'Requests', component: RequestList },
      { name: 'Mocks', component: MockList },
      { name: 'Settings', component: SettingsPanel },
    ]

    const handleOpen = () => {
      open.value = true
    }

    const close = () => {
      open.value = false
    }

    return () => (
      <Fragment>
        <div class="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-2 font-sans">
          <Button onClick={handleOpen} class="shadow-lg">
            Open
          </Button>
        </div>

        <TransitionRoot appear show={open.value} as="template">
          <Dialog as="div" class="relative z-[99999]" onClose={close}>
            <TransitionChild
              as="template"
              enter="ease-in-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in-out duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div class="fixed inset-0 bg-black/30" />
            </TransitionChild>

            <div class="fixed inset-0 overflow-hidden font-sans">
              <div class="absolute inset-0 overflow-hidden">
                <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                  <TransitionChild
                    as="template"
                    enter="transform transition ease-in-out duration-500 sm:duration-700"
                    enterFrom="translate-x-full"
                    enterTo="translate-x-0"
                    leave="transform transition ease-in-out duration-500 sm:duration-700"
                    leaveFrom="translate-x-0"
                    leaveTo="translate-x-full"
                  >
                    <DialogPanel class="pointer-events-auto w-screen max-w-2xl">
                      <div class="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-800 shadow-xl">
                        <div class="px-4 py-6 sm:px-6">
                          <div class="flex items-start justify-between">
                            <div class="flex items-center gap-4">
                              <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Faker UI
                              </h2>
                              <ThemeToggle />
                            </div>
                            <div class="ml-3 flex h-7 items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={close}
                              >
                                <span class="sr-only">Close panel</span>
                                <svg
                                  class="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke-width="1.5"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div class="relative mt-6 flex-1 px-4 sm:px-6">
                          <TabGroup
                            selectedIndex={selectedTab.value}
                            onChange={index => (selectedTab.value = index)}
                          >
                            <TabList class="flex space-x-1 rounded-xl bg-blue-900/20 p-1 dark:bg-gray-700/50">
                              {tabs.map(tab => (
                                <Tab
                                  key={tab.name}
                                  as="template"
                                  v-slots={{
                                    default: ({
                                      selected,
                                    }: {
                                      selected: boolean
                                    }) => (
                                      <button
                                        class={cn(
                                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                          'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                          selected
                                            ? 'bg-white shadow text-blue-700 dark:bg-gray-800 dark:text-blue-400'
                                            : 'text-blue-100 hover:bg-white/[0.12] hover:text-white dark:text-gray-300 dark:hover:bg-gray-700',
                                        )}
                                      >
                                        {tab.name}
                                      </button>
                                    ),
                                  }}
                                />
                              ))}
                            </TabList>
                            <TabPanels class="mt-2 h-full">
                              {tabs.map((tab, idx) => (
                                <TabPanel
                                  key={idx}
                                  class={cn(
                                    'rounded-xl bg-white p-3 dark:bg-gray-900',
                                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                  )}
                                >
                                  <tab.component />
                                </TabPanel>
                              ))}
                            </TabPanels>
                          </TabGroup>
                        </div>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </div>
            </div>
          </Dialog>
        </TransitionRoot>
      </Fragment>
    )
  },
})
