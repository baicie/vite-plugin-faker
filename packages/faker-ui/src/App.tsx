import { logger } from '@baicie/logger'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NDrawer,
  NMessageProvider,
  NTabPane,
  NTabs,
} from 'naive-ui'
import { defineComponent, onMounted, reactive } from 'vue'
import { useAppContext } from './hooks/use-app-context'
import { connect } from './hooks/use-ws'
import MockList from './tabs/mock/mock-list'
import RequestList from './tabs/request/request-list'
import SettingsPanel from './tabs/setting/settings-panel'

hljs.registerLanguage('json', json)

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

    onMounted(() => {
      logger.info('ui mounted')
    })

    connect(wsUrl, logger)

    return () => (
      <NConfigProvider hljs={hljs}>
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

            <NDrawer
              v-model:show={state.open}
              defaultWidth={720}
              resizable
              contentStyle={{ padding: '12px' }}
            >
              <div class="drawer-content">
                <NTabs v-model:value={state.activeTab} type="line" animated>
                  <NTabPane
                    name="requests"
                    tab="请求记录"
                    displayDirective="show:lazy"
                  >
                    <RequestList />
                  </NTabPane>
                  <NTabPane
                    name="mocks"
                    tab="接口模拟"
                    displayDirective="show:lazy"
                  >
                    <MockList />
                  </NTabPane>
                  <NTabPane
                    name="settings"
                    tab="设置"
                    displayDirective="show:lazy"
                  >
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
