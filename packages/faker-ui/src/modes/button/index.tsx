import { Fragment, Transition, defineComponent, ref } from 'vue'
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
import ThemeToggle from '../../components/theme-toggle'

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
          <Button
            onClick={handleOpen}
            class="h-12 w-12 rounded-full border border-border bg-card"
          >
            Faker
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
              <div class="fixed inset-0 bg-black/20 backdrop-blur-sm" />
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
                    <DialogPanel class="pointer-events-auto w-screen max-w-2xl border-l border-border bg-card">
                      <div class="flex h-full flex-col overflow-y-scroll bg-card shadow-none">
                        <div class="px-6 py-6 border-b border-border">
                          <div class="flex items-start justify-between">
                            <div class="flex items-center gap-4">
                              <h2 class="text-lg font-semibold text-foreground tracking-tight">
                                Faker UI
                              </h2>
                              <ThemeToggle />
                            </div>
                            <div class="ml-3 flex h-7 items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={close}
                                class="hover:bg-secondary"
                              >
                                <span class="sr-only">Close panel</span>
                                <svg
                                  class="h-5 w-5"
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
                        <div class="flex-1 flex flex-col">
                          <TabGroup
                            selectedIndex={selectedTab.value}
                            onChange={index => (selectedTab.value = index)}
                          >
                            <div class="px-6 border-b border-border">
                              <TabList class="flex space-x-8">
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
                                            'py-4 text-sm font-medium leading-5 outline-none transition-colors relative text-foreground',
                                            selected
                                              ? ''
                                              : 'text-muted-foreground hover:text-foreground',
                                          )}
                                        >
                                          {tab.name}
                                          {selected && (
                                            <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-tab-underline" />
                                          )}
                                        </button>
                                      ),
                                    }}
                                  />
                                ))}
                              </TabList>
                            </div>
                            <TabPanels class="flex-1 bg-secondary p-6">
                              {tabs.map((tab, idx) => (
                                <TabPanel key={idx} class="h-full outline-none">
                                  <Transition name="fade-slide" mode="out-in">
                                    <tab.component />
                                  </Transition>
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
