import { defineComponent, inject, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NPopover,
  NSpace,
  useMessage,
} from 'naive-ui'
import { getDashboard } from '../api'
import RequestDetail from './request-detail'

const RequestList = defineComponent({
  name: 'RequestList',
  setup() {
    const requests = ref([])
    const loading = ref(false)
    const selectedRequest = ref<any>(null)
    const showDetail = ref(false)
    const message = useMessage()

    const setActiveTab = inject('setActiveTab') as (tab: string) => void
    const createOrEditMock = inject('createOrEditMock') as (
      mockData: any,
    ) => void

    const pagination = reactive({
      page: 1,
      pageSize: 10,
      itemCount: 0,
      showSizePicker: true,
      pageSizes: [10, 20, 50],
      onChange: (page: number) => {
        pagination.page = page
        loadRequests()
      },
      onUpdatePageSize: (pageSize: number) => {
        pagination.pageSize = pageSize
        pagination.page = 1
        loadRequests()
      },
    })

    const searchQuery = ref('')

    const columns = [
      {
        title: '请求路径',
        key: 'url',
        ellipsis: true,
        render: (row: any) => {
          return (
            <NPopover trigger="hover" placement="top">
              {{
                trigger: () => <span class="url-cell">{row.url}</span>,
                default: () => <span>{row.url}</span>,
              }}
            </NPopover>
          )
        },
      },
      { title: '方法', key: 'method', width: 80 },
      { title: '状态码', key: 'statusCode', width: 100 },
      { title: '耗时(ms)', key: 'duration', width: 100 },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        render: (row: any) => {
          return (
            <NSpace>
              <NButton size="small" onClick={() => viewDetail(row)}>
                详情
              </NButton>
              <NButton
                size="small"
                type="primary"
                onClick={() => mockRequest(row)}
              >
                模拟
              </NButton>
            </NSpace>
          )
        },
      },
    ]

    async function loadRequests() {
      loading.value = true
      try {
        const result = await getDashboard({
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: searchQuery.value,
        })

        requests.value = result.items.map((item: any) => ({
          key: item.key,
          url: item.key,
          method: item.value.req.method || 'GET',
          statusCode: item.value.res.statusCode || 200,
          duration: item.value.duration || 0,
          request: item.value.req,
          response: item.value.res,
        }))

        pagination.itemCount = result.pagination.total
      } catch (_) {
      } finally {
        loading.value = false
      }
    }

    function viewDetail(row: any) {
      selectedRequest.value = row
      showDetail.value = true
    }

    async function mockRequest(row: any) {
      try {
        const existingMock = await getMockByUrl({
          url: row.url,
          method: row.method,
        })

        if (existingMock) {
          message.info('发现已有模拟配置，进入编辑模式')
          createOrEditMock(existingMock)
        } else {
          message.success('创建新的模拟配置')

          const contentType =
            row.response.headers?.['content-type'] || 'application/json'

          let responseData = {}
          try {
            if (row.response.body) {
              responseData =
                typeof row.response.body === 'string'
                  ? JSON.parse(row.response.body)
                  : row.response.body
            }
          } catch (e) {
            responseData = { message: 'Mock response' }
          }

          const newMockConfig = {
            url: row.url,
            method: row.method,
            statusCode: row.statusCode,
            enabled: true,
            description: `从请求记录自动生成的模拟配置 (${new Date().toLocaleString()})`,
            responseType: 'static',
            responseData: responseData,
            delay: 0,
            headers: {
              'Content-Type': contentType,
            },
          }

          createOrEditMock(newMockConfig)
        }
      } catch (error) {
        message.error('处理模拟配置失败: ' + (error.message || '未知错误'))
      }
    }

    function handleSearch() {
      pagination.page = 1
      loadRequests()
    }

    onMounted(() => {
      loadRequests()
    })

    return () => (
      <div class="request-list">
        <div class="list-header">
          <NSpace align="center" justify="space-between">
            <h3>请求记录</h3>
            <NSpace>
              <NInput
                v-model:value={searchQuery.value}
                placeholder="搜索请求路径"
                onKeydown={e => e.key === 'Enter' && handleSearch()}
              />
              <NButton onClick={handleSearch}>搜索</NButton>
              <NButton onClick={loadRequests}>刷新</NButton>
            </NSpace>
          </NSpace>
        </div>

        <NDataTable
          columns={columns}
          data={requests.value}
          pagination={pagination}
          loading={loading.value}
          bordered={false}
          striped
        />

        {showDetail.value && selectedRequest.value && (
          <NCard
            title={`${selectedRequest.value?.method} ${selectedRequest.value?.url}`}
            style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; max-width: 900px; max-height: 80vh; overflow: auto; z-index: 1000;"
            onClose={() => {
              showDetail.value = false
            }}
          >
            <RequestDetail request={selectedRequest.value} />
          </NCard>
        )}
      </div>
    )
  },
})

export default RequestList
