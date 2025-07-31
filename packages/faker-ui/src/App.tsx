// App.tsx
import { defineComponent, provide, reactive, ref } from 'vue'
import {
  NDialogProvider,
  NDrawer,
  NFloatButton,
  NMessageProvider,
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

    // 控制模拟配置编辑器的状态
    const showMockEditor = ref(false)
    const currentMock = ref(null)

    // 设置当前标签页
    const setActiveTab = (tab: string) => {
      state.activeTab = tab
    }

    // 创建或编辑模拟配置
    const createOrEditMock = (mockData: any) => {
      currentMock.value = mockData
      showMockEditor.value = true
      // 切换到模拟配置标签
      setActiveTab('mocks')
    }

    const handleOpen = () => {
      state.open = true
    }

    // 提供给子组件的共享状态和函数
    provide('activeTab', state.activeTab)
    provide('setActiveTab', setActiveTab)
    provide('createOrEditMock', createOrEditMock)
    provide('showMockEditor', showMockEditor)
    provide('currentMock', currentMock)

    return () => (
      <NDialogProvider>
        <NMessageProvider>
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
                  <MockList
                    showEditor={showMockEditor.value}
                    currentEditingMock={currentMock.value}
                    onUpdateShowEditor={val => {
                      showMockEditor.value = val
                    }}
                    onUpdateCurrentMock={val => {
                      currentMock.value = val
                    }}
                  />
                </NTabPane>
                <NTabPane name="settings" tab="设置">
                  <SettingsPanel />
                </NTabPane>
              </NTabs>
            </div>
          </NDrawer>
        </NMessageProvider>
      </NDialogProvider>
    )
  },
})

export default App
