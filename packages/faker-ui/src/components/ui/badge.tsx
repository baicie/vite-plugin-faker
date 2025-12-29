import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Badge = defineComponent({
  name: 'Badge',
  props: {
    variant: {
      type: String as PropType<'default' | 'secondary' | 'destructive' | 'outline' | 'success'>,
      default: 'default',
    },
    class: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () => {
      const variants: Record<string, string> = {
        default: 'border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80',
        destructive: 'border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80 dark:text-gray-50',
        outline: 'text-gray-950 dark:text-gray-50 border-gray-200 dark:border-gray-800',
        success: 'border-transparent bg-green-500 text-white hover:bg-green-500/80',
      }
      return (
        <div
          class={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:focus:ring-gray-300',
            variants[props.variant],
            props.class
          )}
        >
          {slots.default?.()}
        </div>
      )
    }
  },
})
