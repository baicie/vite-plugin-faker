import { defineComponent, onMounted, reactive, ref } from 'vue'
import { Switch } from '../../components/ui/switch'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import MockEditor from './mock-editor'
import type { MockConfig, Page } from '@baicie/faker-shared'
import {
  deleteMock as apiDeleteMock,
  fetchMockList,
  updateMock,
} from '../../api'

const MockList = defineComponent({
  name: 'MockList',
  setup() {
    const mocks = ref<MockConfig[]>([])
    const loading = ref(false)
    const showEditor = ref(false)
    const currentMock = ref<any>(null)
    const search = ref('')

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      itemCount: 0,
      total: 0,
    })

    async function loadMocks(params?: {
      page?: number
      pageSize?: number
      search?: string
    }) {
      loading.value = true
      try {
        const query = {
          page: params && params.page ? params.page : pagination.page,
          pageSize:
            params && params.pageSize ? params.pageSize : pagination.pageSize,
          search: params ? params.search : search.value || undefined,
        }
        const result: Page<MockConfig> = await fetchMockList(query)
        mocks.value = result.items
        pagination.total = result.pagination.total
        pagination.itemCount = result.pagination.total
        pagination.page = result.pagination.page
        pagination.pageSize = result.pagination.pageSize
      } catch (error) {
        console.error('Failed to load mocks', error)
      } finally {
        loading.value = false
      }
    }

    function handleEdit(mock: any) {
      currentMock.value = { ...mock }
      showEditor.value = true
    }

    function handleCreate() {
      currentMock.value = {
        url: '',
        method: 'GET',
        enabled: true,
        statusCode: 200,
        type: 'static',
        responseData: {},
      }
      showEditor.value = true
    }

    async function handleDelete(id: string) {
      if (!confirm('Are you sure you want to delete this Mock?')) return

      try {
        await apiDeleteMock({ id })
        loadMocks()
      } catch (error) {
        console.error('Failed to delete mock', error)
      }
    }

    async function handleToggle(id: string, enabled: boolean) {
      try {
        await updateMock({ id, updates: { enabled } })
        loadMocks()
      } catch (error) {
        console.error('Failed to toggle mock', error)
      }
    }

    function handleEditorSave(_mock: any) {
      showEditor.value = false
      loadMocks({ page: pagination.page, pageSize: pagination.pageSize })
    }

    function handleEditorCancel() {
      showEditor.value = false
      currentMock.value = null
    }

    onMounted(() => {
      loadMocks({ page: 1, pageSize: pagination.pageSize })
    })

    return () => (
      <div>
        <div class="mb-4 flex justify-between items-center gap-4">
          <div class="flex-1 max-w-sm">
            <Input
              type="text"
              placeholder="Search mocks..."
              modelValue={search.value}
              onUpdate:modelValue={(val: string | number) => {
                search.value = val as string
                loadMocks({ page: 1, search: search.value })
              }}
            />
          </div>
          <Button onClick={handleCreate}>Create Mock</Button>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border bg-card">
          <table class="min-w-full divide-y divide-(--border)">
            <thead class="bg-secondary">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  URL
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Method
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-card divide-y divide-(--border)">
              {loading.value ? (
                <tr>
                  <td
                    colspan={6}
                    class="px-6 py-4 text-center text-sm text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : mocks.value.length === 0 ? (
                <tr>
                  <td
                    colspan={6}
                    class="px-6 py-4 text-center text-sm text-muted-foreground"
                  >
                    No mocks found
                  </td>
                </tr>
              ) : (
                mocks.value.map(row => (
                  <tr key={row.id} class="hover:bg-secondary">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {row.url}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {row.method}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <Switch
                        modelValue={row.enabled}
                        onUpdate:modelValue={(val: boolean) =>
                          handleToggle(row.id!, val)
                        }
                      />
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {row.type}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground max-w-xs truncate">
                      {row.description}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => handleEdit(row)}
                        variant="link"
                        class="text-foreground hover:text-foreground underline underline-offset-4 p-0 mr-4 h-auto"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(row.id!)}
                        variant="link"
                        class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div class="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 mt-2 rounded-lg">
          {/* Reuse pagination logic from RequestList or extract to component */}
          <div class="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => loadMocks({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => loadMocks({ page: pagination.page + 1 })}
              disabled={
                pagination.page * pagination.pageSize >= pagination.total
              }
              class="ml-3"
            >
              Next
            </Button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700 dark:text-gray-400">
                Showing{' '}
                <span class="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span class="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total,
                  )}
                </span>{' '}
                of <span class="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav
                class="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => loadMocks({ page: pagination.page - 1 })}
                  disabled={pagination.page <= 1}
                  class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-gray-700 dark:hover:bg-gray-900"
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
                  onClick={() => loadMocks({ page: pagination.page + 1 })}
                  disabled={
                    pagination.page * pagination.pageSize >= pagination.total
                  }
                  class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-gray-700 dark:hover:bg-gray-900"
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

        {showEditor.value && (
          <MockEditor
            show={showEditor.value}
            mock={currentMock.value}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        )}
      </div>
    )
  },
})

export default MockList
