import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { Fragment, defineComponent } from 'vue'

export const Modal = defineComponent({
  name: 'Modal',
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    onClose: {
      type: Function,
      default: () => {},
    },
  },
  setup(props, { slots }) {
    return () => (
      <TransitionRoot appear show={props.show} as={Fragment}>
        <Dialog as="div" class="relative z-100" onClose={() => props.onClose()}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div class="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-card border border-border p-6 text-left align-middle shadow-none transition-all">
                  {props.title && (
                    <DialogTitle
                      as="h3"
                      class="text-lg font-medium leading-6 text-foreground mb-4"
                    >
                      {props.title}
                    </DialogTitle>
                  )}
                  {slots.default?.()}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    )
  },
})
