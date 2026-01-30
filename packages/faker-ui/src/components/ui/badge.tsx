import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Badge = defineComponent({
  name: 'Badge',
  props: {
    variant: {
      type: String as PropType<
        'default' | 'secondary' | 'destructive' | 'outline' | 'success'
      >,
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
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success:
          'border-transparent bg-green-500 text-white hover:bg-green-600',
      }
      return (
        <div
          class={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            variants[props.variant],
            props.class,
          )}
        >
          {slots.default?.()}
        </div>
      )
    }
  },
})
