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
          props.modelValue
            ? 'bg-gray-900 dark:bg-gray-100'
            : 'bg-gray-200 dark:bg-gray-700',
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:focus:ring-gray-300',
          props.class,
        )}
      >
        <span
          class={cn(
            props.modelValue ? 'translate-x-6' : 'translate-x-1',
            'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition',
          )}
        />
      </HeadlessSwitch>
    )
  },
})
