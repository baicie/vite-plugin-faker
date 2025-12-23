import { computed, defineComponent, onMounted, ref } from 'vue'
import {
  type DataTableColumns,
  NButton,
  NDataTable,
  NInput,
  NTag,
  useMessage,
} from 'naive-ui'
import RequestDetail from './request-detail'
import { fetchRequestHistory } from '../../api'
import type { RequestRecord } from '@baicie/faker-shared'

const RequestList = defineComponent({
  name: 'RequestList',
  setup() {
    const message = useMessage()
    const requests = ref<RequestRecord[]>([])
    const loading = ref(false)
    const page = ref(1)
    const pageSize = ref(20)
    const total = ref(0)
    const search = ref('')
    const selectedRequest = ref<RequestRecord | null>(null)
    const showDetail = ref(false)

    const columns: DataTableColumns<RequestRecord> = [
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
        render: row => <NTag type="info">{row.method}</NTag>,
      },
      {
        title: '状态码',
        key: 'response.statusCode',
        width: 100,
        render: row => {
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
        render: row => (
          <NTag type={row.isMocked ? 'success' : 'default'}>
            {row.isMocked ? '是' : '否'}
          </NTag>
        ),
      },
      {
        title: '耗时',
        key: 'duration',
        width: 100,
        render: row => `${row.duration || 0}ms`,
      },
      {
        title: '时间',
        key: 'timestamp',
        width: 180,
        render: row => new Date(row.timestamp).toLocaleString(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        fixed: 'right',
        render: row => (
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
        message.error('加载请求列表失败')
      } finally {
        loading.value = false
      }
    }

    const pagination = computed(() => ({
      page: page.value,
      pageSize: pageSize.value,
      itemCount: total.value,
      showSizePicker: false,
      onChange(newPage: number) {
        loadRequests(newPage)
      },
    }))

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
          <NInput
            placeholder="搜索请求..."
            style="width: 300px;"
            value={search.value}
            onUpdateValue={value => {
              search.value = value
              loadRequests(1)
            }}
          />
          <NButton onClick={handleRefresh}>刷新</NButton>
        </div>

        <NDataTable
          columns={columns}
          data={requests.value}
          loading={loading.value}
          pagination={pagination.value}
          rowKey={row => row.id || row.timestamp}
          scrollX={columns.reduce((pre, next) => pre + Number(next.width), 0)}
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
