import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'
import ThemeToggle from '../../components/ThemeToggle'

export default defineComponent({
  name: 'RouteLayout',
  props: {
    tabs: {
      type: Array as PropType<Array<{ name: string; component: any }>>,
      required: true,
    },
    selectedTab: {
      type: Number,
      required: true,
    },
    onSelect: {
      type: Function as PropType<(index: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const ActiveComponent = props.tabs[props.selectedTab]?.component

      return (
        <div class="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
          {/* Sidebar */}
          <div class="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
            <div class="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Faker UI
              </h1>
            </div>
            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
              {props.tabs.map((tab, index) => (
                <button
                  key={tab.name}
                  onClick={() => props.onSelect(index)}
                  class={cn(
                    'w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    props.selectedTab === index
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100',
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
            <div class="p-4 border-t border-gray-200 dark:border-gray-800">
              {/* Footer area if needed */}
            </div>
          </div>

          {/* Main Content */}
          <div class="flex-1 flex flex-col overflow-hidden">
            <header class="bg-white dark:bg-gray-950 z-10 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <h2 class="text-lg font-medium tracking-tight">
                {props.tabs[props.selectedTab]?.name}
              </h2>
              <ThemeToggle />
            </header>
            <main class="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-950/50">
              <div class="max-w-7xl mx-auto">
                {ActiveComponent && <ActiveComponent />}
              </div>
            </main>
          </div>
        </div>
      )
    }
  },
})
