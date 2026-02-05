import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { Switch } from '../../components/ui/switch'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Pagination } from '../../components/ui/pagination'
import MockEditor from './mock-editor'
import SwaggerImport from '../../components/swagger-import'
import type { MockConfig, Page } from '@baicie/faker-shared'
import {
  deleteMock as apiDeleteMock,
  fetchGroups,
  fetchMockList,
  updateMock,
} from '../../api'

const MockList = defineComponent({
  name: 'MockList',
  setup() {
    const mocks = ref<MockConfig[]>([])
    const loading = ref(false)
    const showEditor = ref(false)
    const showSwaggerImport = ref(false)
    const currentMock = ref<any>(null)
    const search = ref('')
    const groups = ref<string[]>([])
    const selectedGroup = ref<string>('')

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      itemCount: 0,
      total: 0,
    })

    // 分组选项（包括"全部"和"未分组"）
    const groupOptions = computed(() => [
      { label: '全部分组', value: '' },
      { label: '未分组', value: '__none__' },
      ...groups.value.map(g => ({ label: g, value: g })),
    ])

    async function loadGroups() {
      try {
        const result: string[] = await fetchGroups()
        groups.value = result
      } catch (error) {
        console.error('Failed to load groups', error)
      }
    }

    async function loadMocks(params?: {
      page?: number
      pageSize?: number
      search?: string
      group?: string
    }) {
      loading.value = true
      try {
        const query: any = {
          page: params && params.page ? params.page : pagination.page,
          pageSize:
            params && params.pageSize ? params.pageSize : pagination.pageSize,
          search:
            params && params.search !== undefined
              ? params.search
              : search.value || undefined,
        }

        // 如果有 group 参数，添加到查询中
        if (params && params.group !== undefined) {
          query.group = params.group
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
        type: 'static',
        response: {
          status: 200,
          body: {},
          headers: {
            'Content-Type': 'application/json',
          },
          delay: 0,
        },
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
      loadGroups()
    }

    function handleEditorCancel() {
      showEditor.value = false
      currentMock.value = null
    }

    function handleImportSuccess() {
      showSwaggerImport.value = false
      loadMocks({ page: 1 })
      loadGroups()
    }

    function handleGroupChange(group: string) {
      selectedGroup.value = group
      // 通过 search 参数传递分组筛选
      loadMocks({
        page: 1,
        search: search.value || undefined,
        group: group,
      })
    }

    onMounted(() => {
      loadMocks({ page: 1, pageSize: pagination.pageSize })
      loadGroups()
    })

    return () => (
      <div>
        <div class="mb-4 flex justify-between items-center gap-4">
          <div class="flex gap-4 flex-1">
            <div class="flex-1 max-w-xs">
              <Input
                type="text"
                placeholder="Search mocks..."
                modelValue={search.value}
                onUpdate:modelValue={(val: string | number) => {
                  search.value = val as string
                  loadMocks({
                    page: 1,
                    search: search.value,
                    group: selectedGroup.value,
                  })
                }}
              />
            </div>
            <div class="w-48">
              <Select
                modelValue={selectedGroup.value}
                onUpdate:modelValue={handleGroupChange}
                options={groupOptions.value}
              />
            </div>
          </div>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => (showSwaggerImport.value = true)}
            >
              Import Swagger
            </Button>
            <Button onClick={handleCreate}>Create Mock</Button>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-card">
          <Table class="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[15%]" fixed="left">
                  Group
                </TableHead>
                <TableHead class="w-[20%]" fixed="left">
                  URL
                </TableHead>
                <TableHead class="w-[8%]">Method</TableHead>
                <TableHead class="w-[8%]">Status</TableHead>
                <TableHead class="w-[8%]">Type</TableHead>
                <TableHead class="w-[25%]">Description</TableHead>
                <TableHead class="w-[16%] text-right" fixed="right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mocks.value.length === 0 && !loading.value ? (
                <TableRow>
                  <TableCell
                    colspan={7}
                    class="text-center text-muted-foreground h-24"
                  >
                    No mocks found
                  </TableCell>
                </TableRow>
              ) : (
                mocks.value.map(row => (
                  <TableRow key={row.id}>
                    <TableCell class="font-medium" fixed="left">
                      <span
                        class={
                          row.group
                            ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary'
                            : 'text-muted-foreground text-sm'
                        }
                      >
                        {row.group || '—'}
                      </span>
                    </TableCell>
                    <TableCell class="font-medium" fixed="left">
                      {row.url}
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {row.method}
                    </TableCell>
                    <TableCell>
                      <div
                        onClick={e => {
                          e.stopPropagation()
                          handleToggle(row.id!, !row.enabled)
                        }}
                      >
                        <Switch
                          modelValue={row.enabled}
                          onUpdate:modelValue={(val: boolean) =>
                            handleToggle(row.id!, val)
                          }
                          class="pointer-events-none"
                        />
                      </div>
                    </TableCell>
                    <TableCell class="text-muted-foreground">
                      {row.type}
                    </TableCell>
                    <TableCell class="text-muted-foreground max-w-xs truncate">
                      {row.description}
                    </TableCell>
                    <TableCell class="text-right" fixed="right">
                      <Button
                        onClick={() => handleEdit(row)}
                        variant="text"
                        size="sm"
                        class="mr-2"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(row.id!)}
                        variant="text"
                        size="sm"
                        class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={(page: number) => loadMocks({ page })}
        />

        {showEditor.value && (
          <MockEditor
            show={showEditor.value}
            mock={currentMock.value}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        )}

        <SwaggerImport
          show={showSwaggerImport.value}
          onClose={() => (showSwaggerImport.value = false)}
          onSuccess={handleImportSuccess}
        />
      </div>
    )
  },
})

export default MockList
