import { defineComponent, onMounted, reactive } from 'vue'
import {
  NButton,
  NCard,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSpace,
  NSwitch,
  useDialog,
  useMessage,
} from 'naive-ui'
import { clearCache, getSettings, updateSettings } from '../../api'
import { ref } from 'vue'

const SettingsPanel = defineComponent({
  name: 'SettingsPanel',
  setup() {
    const { warning } = useDialog()
    const message = useMessage()
    const loading = ref(false)

    const formData = reactive({
      globalDelay: 0,
      enableAllMocks: true,
      logRequests: true,
      corsEnabled: true,
      corsAllowOrigin: '*',
    })

    async function handleSave() {
      try {
        loading.value = true
        await updateSettings(formData)
        message.success('设置已保存')
      } catch (error) {
        message.error('保存设置失败')
      } finally {
        loading.value = false
      }
    }

    async function handleClearCache() {
      warning({
        title: '确认清除',
        content: '确定要清除所有请求记录吗？此操作不可恢复。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          try {
            loading.value = true
            await clearCache()
            message.success('缓存已清除')
          } catch (error) {
            message.error('清除缓存失败')
          } finally {
            loading.value = false
          }
        },
      })
    }

    onMounted(async () => {
      loading.value = true
      try {
        const result = await getSettings()
        if (result) {
          Object.assign(formData, result)
        }
      } finally {
        loading.value = false
      }
    })

    return () => (
      <div>
        <NCard title="全局设置">
          <NForm labelPlacement="left" labelWidth="150">
            <NFormItem label="全局延迟(ms)">
              <NInputNumber
                v-model:value={formData.globalDelay}
                min={0}
                max={60000}
              />
            </NFormItem>

            <NFormItem label="默认启用所有Mock">
              <NSwitch v-model:value={formData.enableAllMocks} />
            </NFormItem>

            <NFormItem label="记录请求日志">
              <NSwitch v-model:value={formData.logRequests} />
            </NFormItem>
          </NForm>
        </NCard>

        <NDivider />

        <NCard title="高级设置">
          <NForm labelPlacement="left" labelWidth="150">
            <NFormItem label="启用CORS">
              <NSwitch v-model:value={formData.corsEnabled} />
            </NFormItem>

            <NFormItem label="CORS允许来源">
              <NInput v-model:value={formData.corsAllowOrigin} />
            </NFormItem>
          </NForm>
        </NCard>

        <NDivider />

        <NSpace>
          <NButton type="primary" onClick={handleSave} loading={loading.value}>
            保存设置
          </NButton>
          <NButton onClick={handleClearCache} loading={loading.value}>
            清除缓存
          </NButton>
        </NSpace>
      </div>
    )
  },
})

export default SettingsPanel
