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
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600 shadow-sm',
        outline:
          'border border-input bg-background shadow-sm hover:bg-secondary hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
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
            'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
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
