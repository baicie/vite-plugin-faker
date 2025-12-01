import { defineComponent, ref } from 'vue'
import { NCode, NTabPane, NTabs } from 'naive-ui'

const RequestDetail = defineComponent({
  name: 'RequestDetail',
  props: {
    request: {
      type: Object,
      required: true,
    },
  },
  emits: ['close'],
  setup(props, {}) {
    const activeTab = ref('request')

    function formatJson(obj: any) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch (_e) {
        return String(obj)
      }
    }

    return () => (
      <div class="request-detail">
        <NTabs v-model:value={activeTab.value}>
          <NTabPane name="request" tab="请求信息">
            <div class="detail-section">
              <h4>请求头</h4>
              <NCode
                code={formatJson(props.request.request.headers)}
                language="json"
              />
            </div>

            {props.request.request.body && (
              <div class="detail-section">
                <h4>请求体</h4>
                <NCode
                  code={formatJson(props.request.request.body)}
                  language="json"
                />
              </div>
            )}
          </NTabPane>

          <NTabPane name="response" tab="响应信息">
            <div class="detail-section">
              <h4>状态: {props.request.statusCode}</h4>
              <h4>响应头</h4>
              <NCode
                code={formatJson(props.request.response.headers)}
                language="json"
              />
            </div>

            {props.request.response.body && (
              <div class="detail-section">
                <h4>响应体</h4>
                <NCode
                  code={formatJson(props.request.response.body)}
                  language="json"
                />
              </div>
            )}
          </NTabPane>
        </NTabs>
      </div>
    )
  },
})

export default RequestDetail
