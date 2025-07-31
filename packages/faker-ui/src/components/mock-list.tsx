import { defineComponent, onMounted, reactive, ref, watch } from 'vue'
import {
  NButton,
  NDataTable,
  NInput,
  NPopconfirm,
  NSpace,
  NSwitch,
} from 'naive-ui'
import { deleteMock, getMockList, toggleMockStatus } from '../api'
import MockEditor from './mock-editor'

const MockList = defineComponent({
  name: 'MockList',
  props: {
    showEditor: {
      type: Boolean,
      default: false,
    },
    currentEditingMock: {
      type: Object,
      default: null,
    },
  },
  emits: ['updateShowEditor', 'updateCurrentMock'],
  setup(props, { emit }) {
    const mocks = ref([])
    const loading = ref(false)
    const currentMock = ref(null)

    watch(
      () => props.currentEditingMock,
      val => {
        if (val) {
          currentMock.value = val
        }
      },
      { immediate: true },
    )

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      itemCount: 0,
      showSizePicker: true,
      pageSizes: [10, 20, 50],
      onChange: page => {
        pagination.page = page
        loadMocks()
      },
      onUpdatePageSize: pageSize => {
        pagination.pageSize = pageSize
        pagination.page = 1
        loadMocks()
      },
    })

    const searchQuery = ref('')

    const columns = [
      { title: 'URL', key: 'url', ellipsis: true },
      { title: '请求方法', key: 'method', width: 100 },
      { title: '状态码', key: 'statusCode', width: 100 },
      {
        title: '启用状态',
        key: 'enabled',
        width: 100,
        render: row => {
          return (
            <NSwitch
              value={row.enabled}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
            />
          )
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: row => {
          return (
            <NSpace>
              <NButton size="small" onClick={() => handleEdit(row)}>
                编辑
              </NButton>
              <NPopconfirm
                onPositiveClick={() => handleDelete(row.id)}
                negativeText="取消"
                positiveText="确认删除"
              >
                {{
                  trigger: () => (
                    <NButton size="small" type="error">
                      删除
                    </NButton>
                  ),
                  default: () => '确认删除这条模拟配置吗?',
                }}
              </NPopconfirm>
            </NSpace>
          )
        },
      },
    ]

    async function loadMocks() {
      loading.value = true
      try {
        const result = await getMockList({
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: searchQuery.value,
        })

        mocks.value = result.items
        pagination.itemCount = result.pagination.total
      } catch (error) {
        console.error('加载模拟配置失败', error)
      } finally {
        loading.value = false
      }
    }

    function handleCreate() {
      currentMock.value = {
        url: '',
        method: 'GET',
        enabled: true,
        statusCode: 200,
        responseType: 'static',
        responseData: {},
        headers: {
          'Content-Type': 'application/json',
        },
      }
      emit('updateShowEditor', true)
    }

    function handleEdit(mock) {
      currentMock.value = { ...mock }
      emit('updateShowEditor', true)
    }

    async function handleToggleStatus(id, enabled) {
      try {
        await toggleMockStatus(id, enabled)
        loadMocks()
      } catch (error) {
        console.error('切换状态失败', error)
      }
    }

    async function handleDelete(id) {
      try {
        await deleteMock(id)
        loadMocks()
      } catch (error) {
        console.error('删除配置失败', error)
      }
    }

    function handleSearch() {
      pagination.page = 1
      loadMocks()
    }

    function handleSave() {
      emit('updateShowEditor', false)
      emit('updateCurrentMock', null)
      loadMocks()
    }

    function handleCancel() {
      emit('updateShowEditor', false)
      emit('updateCurrentMock', null)
    }

    onMounted(() => {
      loadMocks()
    })

    return () => (
      <div class="mock-list">
        <div class="list-header">
          <NSpace align="center" justify="space-between">
            <h3>接口模拟配置</h3>
            <NSpace>
              <NInput
                v-model:value={searchQuery.value}
                placeholder="搜索模拟接口"
                onKeydown={e => e.key === 'Enter' && handleSearch()}
              />
              <NButton onClick={handleSearch}>搜索</NButton>
              <NButton type="primary" onClick={handleCreate}>
                新建模拟
              </NButton>
            </NSpace>
          </NSpace>
        </div>

        <NDataTable
          columns={columns}
          data={mocks.value}
          pagination={pagination}
          loading={loading.value}
          bordered={false}
          striped
        />

        <MockEditor
          v-model:show={props.showEditor}
          mock={currentMock.value}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  },
})

export default MockList
