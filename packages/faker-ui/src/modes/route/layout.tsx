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
        <div class="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
          {/* Sidebar */}
          <div class="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
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
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Footer area if needed */}
            </div>
          </div>

          {/* Main Content */}
          <div class="flex-1 flex flex-col overflow-hidden">
            <header class="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-lg font-medium">
                {props.tabs[props.selectedTab]?.name}
              </h2>
              <ThemeToggle />
            </header>
            <main class="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
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
