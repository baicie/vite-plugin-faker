import { defineComponent, onMounted, ref } from 'vue'
import RequestDetail from './request-detail'
import { fetchRequestHistory } from '../../api'
import type { RequestRecord } from '@baicie/faker-shared'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'

const RequestList = defineComponent({
  name: 'RequestList',
  setup() {
    const requests = ref<RequestRecord[]>([])
    const loading = ref(false)
    const page = ref(1)
    const pageSize = ref(20)
    const total = ref(0)
    const search = ref('')
    const selectedRequest = ref<RequestRecord | null>(null)
    const showDetail = ref(false)

    async function loadRequests(targetPage?: number) {
      if (typeof targetPage === 'number') {
        page.value = targetPage
      }

      loading.value = true
      try {
        const result = await fetchRequestHistory({
          page: page.value,
          pageSize: pageSize.value,
          search: search.value || undefined,
        })
        requests.value = result.items
        total.value = result.pagination.total
        page.value = result.pagination.page
        pageSize.value = result.pagination.pageSize
      } catch (error) {
        console.error('加载请求列表失败', error)
      } finally {
        loading.value = false
      }
    }

    function handleRefresh() {
      loadRequests(1)
    }

    onMounted(() => {
      loadRequests()
    })

    const getMethodColor = (method: string) => {
      switch (method?.toUpperCase()) {
        case 'GET':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        case 'POST':
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        case 'PUT':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        case 'DELETE':
          return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        case 'PATCH':
          return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    }

    const getStatusColor = (status: number) => {
      if (status >= 200 && status < 300)
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      if (status >= 300 && status < 400)
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      if (status >= 400)
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }

    return () => (
      <div>
        <div class="mb-4 flex justify-between items-center gap-4">
          <div class="flex-1 max-w-sm">
            <Input
              type="text"
              placeholder="Search requests..."
              modelValue={search.value}
              onUpdate:modelValue={(val: string | number) => {
                search.value = val as string
                loadRequests(1)
              }}
            />
          </div>
          <Button onClick={handleRefresh} variant="outline">
            Refresh
          </Button>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Path
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Method
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Mocked
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Time
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {loading.value ? (
                <tr>
                  <td
                    colspan={7}
                    class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : requests.value.length === 0 ? (
                <tr>
                  <td
                    colspan={7}
                    class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.value.map(row => (
                  <tr
                    key={row.id || row.timestamp}
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td
                      class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate"
                      title={row.url}
                    >
                      {row.url}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 border-0',
                          getMethodColor(row.method),
                        )}
                      >
                        {row.method}
                      </Badge>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 border-0',
                          getStatusColor(row.response?.statusCode || 0),
                        )}
                      >
                        {row.response?.statusCode || 0}
                      </Badge>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 border-0',
                          row.isMocked
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                        )}
                      >
                        {row.isMocked ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {row.duration || 0}ms
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          selectedRequest.value = row
                          showDetail.value = true
                        }}
                        class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple Pagination */}
        <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:bg-gray-900 dark:border-gray-700 mt-2 rounded-lg">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => loadRequests(page.value - 1)}
              disabled={page.value <= 1}
              class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => loadRequests(page.value + 1)}
              disabled={page.value * pageSize.value >= total.value}
              class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700 dark:text-gray-400">
                Showing{' '}
                <span class="font-medium">
                  {(page.value - 1) * pageSize.value + 1}
                </span>{' '}
                to{' '}
                <span class="font-medium">
                  {Math.min(page.value * pageSize.value, total.value)}
                </span>{' '}
                of <span class="font-medium">{total.value}</span> results
              </p>
            </div>
            <div>
              <nav
                class="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => loadRequests(page.value - 1)}
                  disabled={page.value <= 1}
                  class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-gray-600 dark:hover:bg-gray-800"
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
                </button>
                <button
                  onClick={() => loadRequests(page.value + 1)}
                  disabled={page.value * pageSize.value >= total.value}
                  class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-gray-600 dark:hover:bg-gray-800"
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
                </button>
              </nav>
            </div>
          </div>
        </div>

        {showDetail.value && selectedRequest.value && (
          <RequestDetail
            request={selectedRequest.value}
            onClose={() => {
              showDetail.value = false
              selectedRequest.value = null
            }}
          />
        )}
      </div>
    )
  },
})

export default RequestList
