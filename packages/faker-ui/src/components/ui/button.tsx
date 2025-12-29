import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Button = defineComponent({
  name: 'Button',
  props: {
    variant: {
      type: String as PropType<
        'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
      >,
      default: 'default',
    },
    size: {
      type: String as PropType<'default' | 'sm' | 'lg' | 'icon'>,
      default: 'default',
    },
    class: {
      type: String,
      default: '',
    },
    onClick: {
      type: Function as PropType<(e: MouseEvent) => void>,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const variants: Record<string, string> = {
        default:
          'bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 shadow-sm',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600 shadow-sm',
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300',
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700',
        ghost:
          'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50',
        link: 'text-gray-900 underline-offset-4 hover:underline dark:text-gray-50',
      }
      const sizes: Record<string, string> = {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      }
      return (
        <button
          class={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-gray-300',
            variants[props.variant],
            sizes[props.size],
            props.class,
          )}
          onClick={props.onClick}
          {...attrs}
        >
          {slots.default?.()}
        </button>
      )
    }
  },
})
