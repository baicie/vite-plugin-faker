// src/App.tsx
import { defineComponent, reactive } from 'vue'
import {
  NDialogProvider,
  NDrawer,
  NFloatButton,
  NTabPane,
  NTabs,
} from 'naive-ui'
import RequestList from './components/request-list'
import MockList from './components/mock-list'
import SettingsPanel from './components/settings-panel'

const App = defineComponent({
  setup() {
    const state = reactive({
      open: false,
      activeTab: 'requests',
    })

    const handleOpen = () => {
      state.open = true
    }

    return () => (
      <NDialogProvider>
        <NFloatButton
          type="primary"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          onClick={handleOpen}
          position="fixed"
          bottom={24}
          right={0}
        >
          open
        </NFloatButton>

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
      </NDialogProvider>
    )
  },
})

export default App
