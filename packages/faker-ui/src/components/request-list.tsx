import { defineComponent, onMounted, ref } from 'vue'
import { NButton, NDataTable, NInput, NTag, useMessage } from 'naive-ui'
import RequestDetail from './request-detail'

const RequestList = defineComponent({
  name: 'RequestList',
  setup() {
    const message = useMessage()
    const { requests, loading, pagination, loadRequests } = useRequest()
    const selectedRequest = ref<any>(null)
    const showDetail = ref(false)

    const columns = [
      {
        title: '请求路径',
        key: 'url',
        ellipsis: true,
        width: 300,
      },
      {
        title: '方法',
        key: 'method',
        width: 80,
        render: (row: any) => <NTag type="info">{row.method}</NTag>,
      },
      {
        title: '状态码',
        key: 'response.statusCode',
        width: 100,
        render: (row: any) => {
          const status = row.response?.statusCode || 0
          const type =
            status >= 200 && status < 300
              ? 'success'
              : status >= 400
                ? 'error'
                : 'default'
          return <NTag type={type}>{status}</NTag>
        },
      },
      {
        title: '是否Mock',
        key: 'isMocked',
        width: 100,
        render: (row: any) => (
          <NTag type={row.isMocked ? 'success' : 'default'}>
            {row.isMocked ? '是' : '否'}
          </NTag>
        ),
      },
      {
        title: '耗时',
        key: 'duration',
        width: 100,
        render: (row: any) => `${row.duration || 0}ms`,
      },
      {
        title: '时间',
        key: 'timestamp',
        width: 180,
        render: (row: any) => new Date(row.timestamp).toLocaleString(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        render: (row: any) => (
          <NButton
            size="small"
            onClick={() => {
              selectedRequest.value = row
              showDetail.value = true
            }}
          >
            详情
          </NButton>
        ),
      },
    ]

    function handleRefresh() {
      loadRequests().then(() => {
        message.success('已刷新')
      })
    }

    onMounted(() => {
      loadRequests()
    })

    return () => (
      <div>
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between;">
          <NInput placeholder="搜索请求..." style="width: 300px;" />
          <NButton onClick={handleRefresh}>刷新</NButton>
        </div>

        <NDataTable
          columns={columns}
          data={requests.value}
          loading={loading.value}
          pagination={pagination.value}
          rowKey={row => row.id || row.timestamp}
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
      </div>
    )
  },
})

export default RequestList
