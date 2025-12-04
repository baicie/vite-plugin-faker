import { defineComponent, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NInput,
  NMessageProvider,
  NPopconfirm,
  NSpace,
  NSwitch,
  useMessage,
} from 'naive-ui'
import { useMock } from '../composables/useMock'
import MockEditor from './mock-editor'

const MockList = defineComponent({
  name: 'MockList',
  setup() {
    const message = useMessage()
    const { mocks, loading, loadMocks, deleteMock, toggleMock } = useMock()
    const showEditor = ref(false)
    const currentMock = ref<any>(null)

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      itemCount: 0,
      showSizePicker: true,
      pageSizes: [10, 20, 50],
      onChange: (page: number) => {
        pagination.page = page
        loadMocks({ page, pageSize: pagination.pageSize }).then(result => {
          if (result?.pagination) {
            pagination.itemCount = result.pagination.total
          }
        })
      },
      onUpdatePageSize: (pageSize: number) => {
        pagination.pageSize = pageSize
        pagination.page = 1
        loadMocks({ page: 1, pageSize }).then(result => {
          if (result?.pagination) {
            pagination.itemCount = result.pagination.total
          }
        })
      },
    })

    const columns = [
      {
        title: 'URL',
        key: 'url',
        width: 200,
      },
      {
        title: '方法',
        key: 'method',
        width: 80,
      },
      {
        title: '状态',
        key: 'enabled',
        width: 80,
        render: (row: any) => (
          <NSwitch
            value={row.enabled}
            onUpdateValue={val => handleToggle(row.id, val)}
          />
        ),
      },
      {
        title: '类型',
        key: 'responseType',
        width: 100,
      },
      {
        title: '描述',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (row: any) => (
          <NSpace>
            <NButton size="small" onClick={() => handleEdit(row)}>
              编辑
            </NButton>
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                trigger: () => (
                  <NButton size="small" type="error">
                    删除
                  </NButton>
                ),
                default: () => '确定要删除这个 Mock 吗？',
              }}
            </NPopconfirm>
          </NSpace>
        ),
      },
    ]

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
        responseType: 'static',
        responseData: {},
      }
      showEditor.value = true
    }

    async function handleDelete(id: string) {
      try {
        await deleteMock(id)
        message.success('删除成功')
      } catch (error) {
        message.error('删除失败')
      }
    }

    async function handleToggle(id: string, enabled: boolean) {
      try {
        await toggleMock(id, enabled)
        message.success(enabled ? '已启用' : '已禁用')
      } catch (error) {
        message.error('操作失败')
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
      loadMocks({ page: 1, pageSize: pagination.pageSize }).then(result => {
        if (result?.pagination) {
          pagination.itemCount = result.pagination.total
        }
      })
    })

    return () => (
      <NMessageProvider>
        <div>
          <div style="margin-bottom: 16px; display: flex; justify-content: space-between;">
            <NInput
              placeholder="搜索 Mock..."
              style="width: 300px;"
              onUpdateValue={val => {
                loadMocks({
                  page: 1,
                  pageSize: pagination.pageSize,
                  search: val,
                })
              }}
            />
            <NButton type="primary" onClick={handleCreate}>
              新建 Mock
            </NButton>
          </div>

          <NDataTable
            columns={columns}
            data={mocks.value}
            loading={loading.value}
            pagination={pagination}
            rowKey={row => row.id}
          />

          {showEditor.value && (
            <MockEditor
              show={showEditor.value}
              mock={currentMock.value}
              onSave={handleEditorSave}
              onCancel={handleEditorCancel}
            />
          )}
        </div>
      </NMessageProvider>
    )
  },
})

export default MockList
