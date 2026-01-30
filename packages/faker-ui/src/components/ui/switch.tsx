import { Switch as HeadlessSwitch } from '@headlessui/vue'
import { defineComponent } from 'vue'
import { cn } from '../../lib/utils'

export const Switch = defineComponent({
  name: 'Switch',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    class: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => (
      <HeadlessSwitch
        modelValue={props.modelValue}
        onUpdate:modelValue={(val: boolean) => emit('update:modelValue', val)}
        class={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          props.modelValue ? 'bg-primary' : 'bg-input',
          props.class,
        )}
      >
        <span
          class={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            props.modelValue ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </HeadlessSwitch>
    )
  },
})
