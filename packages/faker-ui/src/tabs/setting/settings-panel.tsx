import {
  type SetupContext,
  defineComponent,
  onMounted,
  reactive,
  ref,
} from 'vue'
import { clearCache, getSettings, updateSettings } from '../../api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'

const SettingsPanel = defineComponent({
  name: 'SettingsPanel',
  setup() {
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
        // message.success('设置已保存')
      } catch (error) {
        console.error('保存设置失败', error)
      } finally {
        loading.value = false
      }
    }

    async function handleClearCache() {
      if (!confirm('确定要清除所有请求记录吗？此操作不可恢复。')) {
        return
      }

      try {
        loading.value = true
        await clearCache()
        // message.success('缓存已清除')
      } catch (error) {
        console.error('清除缓存失败', error)
      } finally {
        loading.value = false
      }
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

    const Section = (props: { title: string }, { slots }: SetupContext) => (
      <div class="bg-card border border-border rounded-lg mb-6">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-base font-semibold leading-6 text-foreground mb-6">
            {props.title}
          </h3>
          <div class="space-y-6 max-w-xl">{slots.default?.()}</div>
        </div>
      </div>
    )

    const FormItem = (props: { label: string }, { slots }: SetupContext) => (
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium leading-6 text-foreground">
          {props.label}
        </label>
        <div class="ml-4 flex-shrink-0">{slots.default?.()}</div>
      </div>
    )

    const FormInputItem = (
      props: { label: string },
      { slots }: SetupContext,
    ) => (
      <div>
        <label class="block text-sm font-medium leading-6 text-foreground mb-2">
          {props.label}
        </label>
        {slots.default?.()}
      </div>
    )

    return () => (
      <div class="p-4 max-w-4xl mx-auto">
        <Section title="全局设置">
          <FormItem label="全局延迟(ms)">
            <Input
              type="number"
              modelValue={formData.globalDelay}
              onUpdate:modelValue={val => (formData.globalDelay = Number(val))}
              min={0}
              max={60000}
              class="w-32 text-right"
            />
          </FormItem>

          <FormItem label="默认启用所有Mock">
            <Switch
              modelValue={formData.enableAllMocks}
              onUpdate:modelValue={(val: boolean) =>
                (formData.enableAllMocks = val)
              }
            />
          </FormItem>

          <FormItem label="记录请求日志">
            <Switch
              modelValue={formData.logRequests}
              onUpdate:modelValue={(val: boolean) =>
                (formData.logRequests = val)
              }
            />
          </FormItem>
        </Section>

        <Section title="高级设置">
          <FormItem label="启用CORS">
            <Switch
              modelValue={formData.corsEnabled}
              onUpdate:modelValue={(val: boolean) =>
                (formData.corsEnabled = val)
              }
            />
          </FormItem>

          <FormInputItem label="CORS允许来源">
            <Input
              modelValue={formData.corsAllowOrigin}
              onUpdate:modelValue={val =>
                (formData.corsAllowOrigin = String(val))
              }
            />
          </FormInputItem>
        </Section>

        <div class="flex items-center gap-4 mt-6">
          <Button onClick={handleSave} disabled={loading.value}>
            {loading.value ? '保存中...' : '保存设置'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearCache}
            disabled={loading.value}
          >
            {loading.value ? '处理中...' : '清除缓存'}
          </Button>
        </div>
      </div>
    )
  },
})

export default SettingsPanel
