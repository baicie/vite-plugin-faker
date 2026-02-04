import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue'
import {
  type PropType,
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
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

    const showOptions = ref(false)
    const buttonRef = ref<HTMLElement | null>(null)
    const position = ref({ top: 0, left: 0, width: '100%' })

    function updatePosition() {
      if (!buttonRef.value) {
        return
      }
      const rect = buttonRef.value.getBoundingClientRect()
      position.value = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      }
    }

    watch(
      () => props.modelValue,
      () => {
        showOptions.value = false
      },
    )

    function handleOpen() {
      updatePosition()
      showOptions.value = true
      // 监听滚动以更新位置
      window.addEventListener('scroll', updatePosition, true)
    }

    function handleClose() {
      showOptions.value = false
      window.removeEventListener('scroll', updatePosition, true)
    }

    onUnmounted(() => {
      window.removeEventListener('scroll', updatePosition, true)
    })

    return () => (
      <div class={cn('relative w-full', props.class)}>
        <Listbox
          modelValue={props.modelValue}
          onUpdate:modelValue={val => emit('update:modelValue', val)}
        >
          <div class="relative mt-1">
            <ListboxButton
              ref={buttonRef}
              class="relative w-full cursor-default rounded-md bg-background py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-input focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm sm:leading-6 text-foreground min-h-[38px]"
              onClick={handleOpen}
            >
              <span class="block truncate">
                {selectedOption.value?.label ?? props.modelValue}
              </span>
              <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  class="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
            </ListboxButton>

            <teleport to="body">
              {showOptions.value && (
                <ListboxOptions
                  class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-background py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-input"
                  style={{
                    top: `${position.value.top}px`,
                    left: `${position.value.left}px`,
                    width: `${position.value.width}px`,
                    zIndex: 9999,
                  }}
                  onClick={handleClose}
                >
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
                                ? 'bg-secondary text-foreground'
                                : 'text-foreground',
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
                                  active ? 'text-foreground' : 'text-foreground',
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
              )}
            </teleport>
          </div>
        </Listbox>
      </div>
    )
  },
})
