import { type PropType, defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Input = defineComponent({
  name: 'Input',
  props: {
    modelValue: {
      type: [String, Number] as PropType<string | number>,
      default: '',
    },
    class: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    placeholder: {
      type: String,
      default: '',
    },
    min: {
      type: Number,
      default: undefined,
    },
    max: {
      type: Number,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => (
      <input
        class={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )}
        value={props.modelValue}
        type={props.type}
        placeholder={props.placeholder}
        min={props.min}
        max={props.max}
        onInput={e =>
          emit('update:modelValue', (e.target as HTMLInputElement).value)
        }
        {...attrs}
      />
    )
  },
})
