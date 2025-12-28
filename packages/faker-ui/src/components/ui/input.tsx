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
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => (
      <input
        class={cn(
          'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )}
        value={props.modelValue}
        onInput={e =>
          emit('update:modelValue', (e.target as HTMLInputElement).value)
        }
        {...attrs}
      />
    )
  },
})
