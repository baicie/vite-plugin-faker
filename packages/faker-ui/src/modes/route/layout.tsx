import { type PropType, Transition, defineComponent } from 'vue'
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
        <div class="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
          {/* Sidebar */}
          <div class="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
            <div class="p-6 border-b border-border flex items-center justify-between">
              <h1 class="text-xl font-bold text-foreground tracking-tight">
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
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
            <div class="p-4 border-t border-border">
              {/* Footer area if needed */}
            </div>
          </div>

          {/* Main Content */}
          <div class="flex-1 flex flex-col overflow-hidden">
            <header class="bg-card z-10 p-4 flex items-center justify-between border-b border-border">
              <h2 class="text-lg font-medium tracking-tight">
                {props.tabs[props.selectedTab]?.name}
              </h2>
              <ThemeToggle />
            </header>
            <main class="flex-1 overflow-auto p-6 bg-secondary">
              <div class="max-w-7xl mx-auto">
                <Transition name="fade-slide" mode="out-in">
                  {ActiveComponent && <ActiveComponent key={props.selectedTab} />}
                </Transition>
              </div>
            </main>
          </div>
        </div>
      )
    }
  },
})
