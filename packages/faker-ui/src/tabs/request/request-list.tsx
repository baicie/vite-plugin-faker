import { defineComponent, onMounted, ref } from 'vue'
import RequestDetail from './request-detail'
import MockEditor from '../mock/mock-editor'
import { clearRequestHistory, fetchMock, fetchRequestHistory } from '../../api'
import type { MockConfig, RequestRecord } from '@baicie/faker-shared'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Pagination } from '../../components/ui/pagination'
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
    const showMockEditor = ref(false)
    const currentMock = ref<MockConfig | null>(null)

    async function handleMock(row: RequestRecord) {
      if (row.isMocked && row.mockId) {
        try {
          const mock = await fetchMock({ id: row.mockId })
          currentMock.value = mock
          showMockEditor.value = true
        } catch (e) {
          console.error('Failed to fetch mock', e)
          alert('Failed to fetch mock details')
        }
      } else {
        // Create new mock from request
        currentMock.value = {
          url: row.url,
          method: row.method,
          enabled: true,
          type: 'static',
          response: {
            status: row.response?.statusCode || 200,
            headers: row.response?.headers || {},
            body: row.response?.body || {},
            delay: 0,
          },
        } as unknown as MockConfig
        showMockEditor.value = true
      }
    }

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
        // Only update the list after successfully fetching data to avoid jitter
        requests.value = result.items
        total.value = result.pagination.total
        page.value = result.pagination.page
        pageSize.value = result.pagination.pageSize
      } catch (error) {
        console.error('Failed to load request list', error)
      } finally {
        loading.value = false
      }
    }

    function handleRefresh() {
      loadRequests(1)
    }

    async function handleClear() {
      if (!confirm('Are you sure you want to clear all requests?')) return

      try {
        await clearRequestHistory(null)
        loadRequests(1)
      } catch (error) {
        console.error('Failed to clear requests', error)
      }
    }

    function handleMockEditorSave() {
      showMockEditor.value = false
      loadRequests()
    }

    function handleMockEditorCancel() {
      showMockEditor.value = false
      currentMock.value = null
    }

    onMounted(() => {
      loadRequests()
    })

    const getMethodColor = (method: string) => {
      switch (method?.toUpperCase()) {
        case 'GET':
          return 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800'
        case 'POST':
          return 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800'
        case 'PUT':
          return 'text-yellow-600 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800'
        case 'DELETE':
          return 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'
        case 'PATCH':
          return 'text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800'
        default:
          return 'text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-800'
      }
    }

    const getStatusColor = (status: number) => {
      if (status >= 200 && status < 300)
        return 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800'
      if (status >= 300 && status < 400)
        return 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800'
      if (status >= 400)
        return 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800'
      return 'text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-800'
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
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            Refresh
          </Button>
        </div>

        <div class="rounded-lg border border-border bg-card">
          <Table class="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[30%]">Path</TableHead>
                <TableHead class="w-[10%]">Method</TableHead>
                <TableHead class="w-[10%]">Status</TableHead>
                <TableHead class="w-[10%]">Mocked</TableHead>
                <TableHead class="w-[10%]">Duration</TableHead>
                <TableHead class="w-[20%]">Time</TableHead>
                <TableHead class="w-[10%] text-right" fixed="right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.value.length === 0 && !loading.value ? (
                <TableRow>
                  <TableCell
                    colspan={7}
                    class="text-center text-muted-foreground h-24"
                  >
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.value.map(row => (
                  <TableRow
                    key={row.id || row.timestamp}
                    class="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell
                      class="max-w-xs truncate text-foreground"
                      title={row.url}
                    >
                      {row.url}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium border bg-transparent',
                          getMethodColor(row.method),
                        )}
                      >
                        {row.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium border bg-transparent',
                          getStatusColor(row.response?.statusCode || 0),
                        )}
                      >
                        {row.response?.statusCode || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        class={cn(
                          'rounded-md px-2 py-1 text-xs font-medium border bg-transparent',
                          row.isMocked
                            ? 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-800'
                            : 'text-muted-foreground border-border',
                        )}
                      >
                        {row.isMocked ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {row.duration || 0}ms
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {new Date(row.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell class="text-right" fixed="right">
                      <button
                        onClick={() => handleMock(row)}
                        class="text-primary hover:text-primary/80 underline underline-offset-4 cursor-pointer mr-3"
                      >
                        {row.isMocked ? 'Edit Mock' : 'Mock'}
                      </button>
                      <button
                        onClick={() => {
                          selectedRequest.value = row
                          showDetail.value = true
                        }}
                        class="text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 underline underline-offset-4 cursor-pointer"
                      >
                        Details
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={page.value}
          pageSize={pageSize.value}
          total={total.value}
          onPageChange={(targetPage: number) => loadRequests(targetPage)}
        />

        {showDetail.value && selectedRequest.value && (
          <RequestDetail
            request={selectedRequest.value}
            onClose={() => {
              showDetail.value = false
              selectedRequest.value = null
            }}
          />
        )}

        {showMockEditor.value && (
          <MockEditor
            show={showMockEditor.value}
            mock={currentMock.value}
            onSave={handleMockEditorSave}
            onCancel={handleMockEditorCancel}
          />
        )}
      </div>
    )
  },
})

export default RequestList
