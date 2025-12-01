import { defineComponent, onMounted, reactive } from 'vue'
import {
  NButton,
  NCard,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  useDialog,
  useMessage,
} from 'naive-ui'
import { useSettings } from '../composables/useSettings'

const SettingsPanel = defineComponent({
  name: 'SettingsPanel',
  setup() {
    const { warning } = useDialog()
    const message = useMessage()
    const { settings: savedSettings, loadSettings, updateSettings, clearCache } =
      useSettings()
    
    const settings = reactive({
      // 全局设置
      globalDelay: 0,
      enableAllMocks: true,
      logRequests: true,

      // 高级设置
      corsEnabled: true,
      corsAllowOrigin: '*',
      corsAllowMethods: 'GET,HEAD,PUT,PATCH,POST,DELETE',

      // 存储设置
      persistData: true,
      maxStorageSize: 50, // MB

      // 主题设置
      theme: 'light',
    })

    const themeOptions = [
      { label: '浅色', value: 'light' },
      { label: '深色', value: 'dark' },
      { label: '跟随系统', value: 'auto' },
    ]

    async function loadSettingsData() {
      try {
        await loadSettings()
        if (savedSettings.value) {
          Object.assign(settings, savedSettings.value)
        }
      } catch (error) {
        message.error('加载设置失败')
        console.error('加载设置失败', error)
      }
    }

    async function handleSaveSettings() {
      try {
        await updateSettings(settings)
        message.success('设置已保存')
      } catch (error) {
        message.error('保存设置失败')
        console.error('保存设置失败', error)
      }
    }

    async function resetSettings() {
      warning({
        title: '重置设置',
        content: '确定要重置所有设置吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          try {
            const defaultSettings = {
              globalDelay: 0,
              enableAllMocks: true,
              logRequests: true,
              corsEnabled: true,
              corsAllowOrigin: '*',
              corsAllowMethods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
              persistData: true,
              maxStorageSize: 50,
              theme: 'light',
            }
            await updateSettings(defaultSettings)
            Object.assign(settings, defaultSettings)
            message.success('设置已重置')
          } catch (error) {
            message.error('重置设置失败')
            console.error('重置设置失败', error)
          }
        },
      })
    }

    async function handleClearCache() {
      warning({
        title: '清除缓存',
        content: '确定要清除所有请求记录吗？此操作不可恢复。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          try {
            await clearCache()
            message.success('缓存已清除')
          } catch (error) {
            message.error('清除缓存失败')
            console.error('清除缓存失败', error)
          }
        },
      })
    }

    onMounted(() => {
      loadSettingsData()
    })

    return () => (
      <div class="settings-panel">
        <h3>系统设置</h3>

        <NForm labelPlacement="left" labelWidth="140">
          <NCard title="全局设置" class="setting-card">
            <NFormItem label="全局响应延迟(ms)">
              <NInputNumber
                v-model:value={settings.globalDelay}
                min={0}
                max={10000}
              />
            </NFormItem>

            <NFormItem label="启用所有模拟">
              <NSwitch v-model:value={settings.enableAllMocks} />
            </NFormItem>

            <NFormItem label="记录请求日志">
              <NSwitch v-model:value={settings.logRequests} />
            </NFormItem>
          </NCard>

          <NCard title="CORS 设置" class="setting-card">
            <NFormItem label="启用 CORS">
              <NSwitch v-model:value={settings.corsEnabled} />
            </NFormItem>

            <NFormItem label="允许的来源">
              <NInput
                v-model:value={settings.corsAllowOrigin}
                disabled={!settings.corsEnabled}
              />
            </NFormItem>

            <NFormItem label="允许的方法">
              <NInput
                v-model:value={settings.corsAllowMethods}
                disabled={!settings.corsEnabled}
              />
            </NFormItem>
          </NCard>

          <NCard title="存储设置" class="setting-card">
            <NFormItem label="持久化数据">
              <NSwitch v-model:value={settings.persistData} />
            </NFormItem>

            <NFormItem label="最大存储容量(MB)">
              <NInputNumber
                v-model:value={settings.maxStorageSize}
                min={10}
                max={1000}
              />
            </NFormItem>
          </NCard>

          <NCard title="主题设置" class="setting-card">
            <NFormItem label="界面主题">
              <NSelect v-model:value={settings.theme} options={themeOptions} />
            </NFormItem>
          </NCard>

          <NDivider />

          <NSpace justify="end">
            <NButton onClick={handleClearCache}>清除缓存</NButton>
            <NButton onClick={resetSettings}>重置设置</NButton>
            <NButton type="primary" onClick={handleSaveSettings}>
              保存设置
            </NButton>
          </NSpace>
        </NForm>
      </div>
    )
  },
})

export default SettingsPanel
