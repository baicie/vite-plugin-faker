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
        default: 'bg-slate-900 text-white hover:bg-slate-900/90',
        destructive: 'bg-red-500 text-white hover:bg-red-500/90',
        outline:
          'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-100/80',
        ghost: 'hover:bg-slate-100 hover:text-slate-900',
        link: 'text-slate-900 underline-offset-4 hover:underline',
      }
      const sizes: Record<string, string> = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      }
      return (
        <button
          class={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
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
