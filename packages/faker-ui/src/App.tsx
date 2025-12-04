// App.tsx
import { defineComponent, reactive } from 'vue'
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NDrawer,
  NMessageProvider,
  NTabPane,
  NTabs,
} from 'naive-ui'
import { useWebSocket } from './composables/useWebSocket'
import RequestList from './components/request-list'
import MockList from './components/mock-list'
import SettingsPanel from './components/settings-panel'

const App = defineComponent({
  setup() {
    useWebSocket() // 初始化 WebSocket 连接
    const state = reactive({
      open: false,
      activeTab: 'requests',
    })

    const handleOpen = () => {
      state.open = true
    }

    return () => (
      <NConfigProvider>
        <NDialogProvider>
          <NMessageProvider>
            <NButton
              type="primary"
              onClick={handleOpen}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 1000,
              }}
            >
              open
            </NButton>

            <NDrawer v-model:show={state.open} defaultWidth={720} resizable>
              <div class="drawer-content">
                <NTabs v-model:value={state.activeTab} type="line" animated>
                  <NTabPane name="requests" tab="请求记录">
                    <RequestList />
                  </NTabPane>
                  <NTabPane name="mocks" tab="接口模拟">
                    <MockList />
                  </NTabPane>
                  <NTabPane name="settings" tab="设置">
                    <SettingsPanel />
                  </NTabPane>
                </NTabs>
              </div>
            </NDrawer>
          </NMessageProvider>
        </NDialogProvider>
      </NConfigProvider>
    )
  },
})

export default App
