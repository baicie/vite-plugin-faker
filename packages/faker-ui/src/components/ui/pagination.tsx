import { type PropType, defineComponent } from 'vue'
import { Button } from './button'

export const Pagination = defineComponent({
  name: 'Pagination',
  props: {
    page: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
    onPageChange: {
      type: Function as PropType<(page: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 mt-2 rounded-lg">
        {/* Mobile Pagination */}
        <div class="flex flex-1 justify-between sm:hidden">
          <Button
            variant="outline"
            onClick={() => props.onPageChange(props.page - 1)}
            disabled={props.page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => props.onPageChange(props.page + 1)}
            disabled={props.page * props.pageSize >= props.total}
            class="ml-3"
          >
            Next
          </Button>
        </div>

        {/* Desktop Pagination */}
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-muted-foreground">
              Showing{' '}
              <span class="font-medium tabular-nums inline-block min-w-[1rem] text-center">
                {(props.page - 1) * props.pageSize + 1}
              </span>{' '}
              to{' '}
              <span class="font-medium tabular-nums inline-block min-w-[1rem] text-center">
                {Math.min(props.page * props.pageSize, props.total)}
              </span>{' '}
              of{' '}
              <span class="font-medium tabular-nums inline-block min-w-[1rem] text-center">
                {props.total}
              </span>{' '}
              results
            </p>
          </div>
          <div>
            <nav
              class="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <Button
                onClick={() => props.onPageChange(props.page - 1)}
                disabled={props.page <= 1}
                variant="outline"
                size="icon"
                class="rounded-l-md rounded-r-none"
              >
                <span class="sr-only">Previous</span>
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </Button>
              <Button
                onClick={() => props.onPageChange(props.page + 1)}
                disabled={props.page * props.pageSize >= props.total}
                variant="outline"
                size="icon"
                class="rounded-l-none rounded-r-md ml-0"
              >
                <span class="sr-only">Next</span>
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </Button>
            </nav>
          </div>
        </div>
      </div>
    )
  },
})
