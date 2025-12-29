import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import { type PropType, computed, defineComponent } from 'vue'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { cn } from '../../lib/utils'

export interface SelectOption {
  label: string
  value: string | number
}

export const Select = defineComponent({
  name: 'Select',
  props: {
    modelValue: {
      type: [String, Number] as PropType<string | number>,
      required: true,
    },
    options: {
      type: Array as PropType<SelectOption[]>,
      default: () => [],
    },
    class: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const selectedOption = computed(
      () =>
        props.options.find(opt => opt.value === props.modelValue) ||
        props.options[0],
    )

    return () => (
      <div class={cn('relative w-full', props.class)}>
        <Listbox
          modelValue={props.modelValue}
          onUpdate:modelValue={val => emit('update:modelValue', val)}
        >
          <div class="relative mt-1">
            <ListboxButton class="relative w-full cursor-default rounded-md bg-white dark:bg-gray-950 py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 sm:text-sm sm:leading-6 text-gray-900 dark:text-gray-100 min-h-[38px]">
              <span class="block truncate">
                {selectedOption.value?.label ?? props.modelValue}
              </span>
              <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  class="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </ListboxButton>

            <transition
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-950 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-gray-800">
                {props.options.map(option => (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    as="template"
                    v-slots={{
                      default: ({
                        active,
                        selected,
                      }: {
                        active: boolean
                        selected: boolean
                      }) => (
                        <li
                          class={[
                            active
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                              : 'text-gray-900 dark:text-gray-100',
                            'relative cursor-default select-none py-2 pl-10 pr-4',
                          ]}
                        >
                          <span
                            class={[
                              selected ? 'font-medium' : 'font-normal',
                              'block truncate',
                            ]}
                          >
                            {option.label}
                          </span>
                          {selected ? (
                            <span
                              class={[
                                active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100',
                                'absolute inset-y-0 left-0 flex items-center pl-3',
                              ]}
                            >
                              <CheckIcon class="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </li>
                      ),
                    }}
                  />
                ))}
              </ListboxOptions>
            </transition>
          </div>
        </Listbox>
      </div>
    )
  },
})
