import {
  NButton,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
} from 'naive-ui'
import type { PropType } from 'vue'
import { computed, defineComponent, reactive, ref, toRaw, watch } from 'vue'
import { createMock, updateMock } from '../../api'
import CodeEditor from '../../components/editors/code-editor'
import JsonEditor from '../../components/editors/json-editor'
import VisualEditor from '../../components/editors/visual-editor'

const MockEditor = defineComponent({
  name: 'MockEditor',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    mock: {
      type: Object as PropType<any>,
      default: null,
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const formRef = ref(null)
    const activeTab = ref('basic')
    const saving = ref(false)

    const _show = computed({
      get() {
        return props.show
      },
      set(value) {
        emit('cancel', value)
      },
    })

    // 表单数据
    const formData = reactive({
      id: '',
      url: '',
      method: 'GET',
      statusCode: 200,
      enabled: true,
      description: '',
      responseType: 'static',
      responseData: '{}',
      responseTemplate: '{}',
      responseCode: 'return {\n  message: "Hello World"\n};',
      delay: 0,
      headers: { 'Content-Type': 'application/json' },
    })

    // 选项数据
    const methodOptions = [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' },
      { label: 'HEAD', value: 'HEAD' },
      { label: 'OPTIONS', value: 'OPTIONS' },
    ]

    const responseTypeOptions = [
      { label: '静态数据', value: 'static' },
      { label: 'Faker模板', value: 'faker' },
      { label: '自定义函数', value: 'function' },
    ]

    // 当mock属性变化时更新表单
    watch(
      () => props.mock,
      newVal => {
        if (!newVal) {
          // 重置表单
          Object.assign(formData, {
            id: '',
            url: '',
            method: 'GET',
            statusCode: 200,
            enabled: true,
            description: '',
            responseType: 'static',
            responseData: '{}',
            responseTemplate: '{}',
            responseCode: 'return {\n  message: "Hello World"\n};',
            delay: 0,
            headers: { 'Content-Type': 'application/json' },
          })
          return
        }

        Object.keys(formData).forEach(key => {
          if (key === 'headers' && newVal.headers) {
            formData.headers = { ...newVal.headers }
            return
          }

          if (key === 'responseData' && typeof newVal[key] !== 'string') {
            formData[key] = JSON.stringify(newVal[key], null, 2)
            return
          }

          if (newVal[key] !== undefined) {
            // @ts-expect-error
            formData[key] = newVal[key]
          }
        })
      },
      { immediate: true },
    )

    // 保存
    async function handleSave() {
      try {
        saving.value = true

        const data: any = {
          ...toRaw(formData),
        }

        // 处理响应数据
        if (data.responseType === 'static') {
          try {
            data.responseData = JSON.parse(data.responseData)
          } catch (e) {
            throw new Error('响应数据格式错误')
          }
        }

        if (data.id) {
          await updateMock({ id: data.id, updates: data })
        } else {
          await createMock(data)
        }

        emit('save', data)
      } catch (error) {
        console.error('保存失败:', error)
        throw error
      } finally {
        saving.value = false
      }
    }

    // 取消
    function handleCancel() {
      emit('cancel')
    }

    return () => (
      <NModal
        v-model:show={_show.value}
        style="width: 90%; max-width: 1000px;"
        maskClosable={false}
        preset="card"
        title={formData.id ? '编辑 Mock' : '新建 Mock'}
      >
        <NTabs v-model:value={activeTab.value}>
          <NTabPane name="basic" tab="基本信息">
            <NForm ref={formRef} labelPlacement="left" labelWidth="120">
              <NFormItem label="URL路径" required>
                <NInput
                  v-model:value={formData.url}
                  placeholder="/api/example"
                />
              </NFormItem>

              <NFormItem label="请求方法" required>
                <NSelect
                  v-model:value={formData.method}
                  options={methodOptions}
                />
              </NFormItem>

              <NFormItem label="状态码" required>
                <NInputNumber
                  v-model:value={formData.statusCode}
                  min={100}
                  max={599}
                />
              </NFormItem>

              <NFormItem label="启用状态">
                <NSwitch v-model:value={formData.enabled} />
              </NFormItem>

              <NFormItem label="描述">
                <NInput
                  v-model:value={formData.description}
                  type="textarea"
                  placeholder="请输入描述信息"
                />
              </NFormItem>

              <NFormItem label="响应延迟(ms)">
                <NInputNumber
                  v-model:value={formData.delay}
                  min={0}
                  max={60000}
                />
              </NFormItem>
            </NForm>
          </NTabPane>

          <NTabPane name="response" tab="响应配置">
            <NForm labelPlacement="left" labelWidth="120">
              <NFormItem label="响应类型">
                <NSelect
                  v-model:value={formData.responseType}
                  options={responseTypeOptions}
                />
              </NFormItem>

              <NDivider>响应内容</NDivider>

              {formData.responseType === 'static' && (
                <JsonEditor
                  value={formData.responseData}
                  onChange={val => {
                    formData.responseData = val
                  }}
                />
              )}

              {formData.responseType === 'faker' && (
                <JsonEditor
                  value={formData.responseTemplate}
                  onChange={val => {
                    formData.responseTemplate = val
                  }}
                  placeholder='{"name": "{{faker.person.firstName}}"}'
                />
              )}

              {formData.responseType === 'function' && (
                <CodeEditor
                  value={formData.responseCode}
                  onChange={val => {
                    formData.responseCode = val
                  }}
                />
              )}
            </NForm>
          </NTabPane>

          <NTabPane name="visual" tab="可视化编辑">
            <VisualEditor
              value={
                formData.responseType === 'static'
                  ? formData.responseData
                  : formData.responseType === 'faker'
                    ? formData.responseTemplate
                    : null
              }
              responseType={
                formData.responseType as 'static' | 'faker' | 'function'
              }
              onChange={val => {
                if (formData.responseType === 'static') {
                  formData.responseData = val
                } else if (formData.responseType === 'faker') {
                  formData.responseTemplate = val
                }
              }}
            />
          </NTabPane>
        </NTabs>

        <NDivider />

        <div style="display: flex; justify-content: flex-end;">
          <NSpace>
            <NButton onClick={handleCancel}>取消</NButton>
            <NButton type="primary" onClick={handleSave} loading={saving.value}>
              保存
            </NButton>
          </NSpace>
        </div>
      </NModal>
    )
  },
})

export default MockEditor
