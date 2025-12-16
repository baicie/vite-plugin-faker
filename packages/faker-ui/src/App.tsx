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
import RequestList from './components/request-list'
import MockList from './components/mock-list'
import SettingsPanel from './components/settings-panel'
import { WebSocketProvider } from './hooks/use-ws'
import { useAppContext } from './hooks/use-app-context'
import { logger } from '@baicie/logger'

const App = defineComponent({
  setup() {
    const state = reactive({
      open: false,
      activeTab: 'requests',
    })

    const { wsUrl } = useAppContext()

    const handleOpen = () => {
      state.open = true
    }

    return () => (
      <WebSocketProvider wsUrl={wsUrl} logger={logger}>
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
      </WebSocketProvider>
    )
  },
})

export default App
