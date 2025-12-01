import type { PropType } from 'vue'
import { defineComponent, reactive, ref, toRaw, watch } from 'vue'
import {
  NButton,
  NCode,
  NDivider,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
} from 'naive-ui'
import { Add, Remove } from '@vicons/ionicons5'
import { previewMockResponse } from '../api/dashboard'
import { logger } from '@baicie/logger'

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
  emits: ['update:show', 'save'],
  setup(props, { emit }) {
    const formRef = ref(null)
    const activeTab = ref('basic')
    const previewLoading = ref(false)
    const previewResult = ref('')
    const showPreview = ref(false)

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
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      tags: [],
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
        if (!newVal) return

        Object.keys(formData).forEach(key => {
          if (key === 'headers' && newVal.headers) {
            formData.headers = Object.entries(newVal.headers).map(([k, v]) => ({
              key: k,
              value: v as string,
            }))
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
      { immediate: true, deep: true },
    )

    // 添加响应头
    function addHeader() {
      formData.headers.push({ key: '', value: '' })
    }

    // 移除响应头
    function removeHeader(index: number) {
      formData.headers.splice(index, 1)
    }

    // 预览响应
    async function handlePreview() {
      try {
        previewLoading.value = true
        const payload: any = {}

        if (formData.responseType === 'static') {
          try {
            payload.responseData = JSON.parse(formData.responseData)
          } catch (e) {
            payload.responseData = { error: 'Invalid JSON' }
          }
        } else if (formData.responseType === 'faker') {
          payload.responseTemplate = formData.responseTemplate
        } else {
          payload.responseCode = formData.responseCode
        }

        payload.responseType = formData.responseType
        payload.requestInfo = {
          url: formData.url,
          method: formData.method,
        }

        const result = await previewMockResponse(payload)
        previewResult.value =
          typeof result === 'object'
            ? JSON.stringify(result, null, 2)
            : String(result)
        showPreview.value = true
      } catch (error) {
        logger.error('预览失败:', error)
        previewResult.value = `Error: ${error instanceof Error ? error.message : '未知错误'}`
        showPreview.value = true
      } finally {
        previewLoading.value = false
      }
    }

    // 保存表单数据
    function handleSave() {
      // 转换表单数据格式
      const result: any = { ...toRaw(formData) }

      // 将响应头从数组转换为对象
      const headers = {}
      formData.headers.forEach(h => {
        if (h.key && h.value) {
          // @ts-expect-error
          headers[h.key] = h.value
        }
      })
      result.headers = headers

      // 解析静态JSON响应
      if (result.responseType === 'static') {
        try {
          result.responseData = JSON.parse(result.responseData)
        } catch (e) {
          // 如果解析失败，使用原始字符串
          logger.error('JSON解析失败:', e)
        }
      }

      emit('save', result)
      emit('update:show', false)
    }

    // 取消编辑
    function handleCancel() {
      emit('update:show', false)
    }

    return () => (
      <NModal
        v-model:show={props.show}
        style="width: 80%; max-width: 900px;"
        maskClosable={false}
        preset="card"
        title={formData.id ? '编辑模拟配置' : '新建模拟配置'}
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

              <NFormItem label="响应头">
                <div style="margin-bottom: 16px;">
                  {formData.headers.map((header, index) => (
                    <div key={index} style="display: flex; margin-bottom: 8px;">
                      <NInput
                        v-model:value={header.key}
                        placeholder="名称"
                        style="width: 200px; margin-right: 8px;"
                      />
                      <NInput
                        v-model:value={header.value}
                        placeholder="值"
                        style="flex-grow: 1; margin-right: 8px;"
                      />
                      <NButton
                        circle
                        type="error"
                        style="flex-shrink: 0;"
                        onClick={() => removeHeader(index)}
                      >
                        <NIcon>
                          <Remove />
                        </NIcon>
                      </NButton>
                    </div>
                  ))}
                  <NButton onClick={addHeader}>
                    <NIcon>
                      <Add />
                    </NIcon>
                    添加响应头
                  </NButton>
                </div>
              </NFormItem>

              <NDivider>响应内容</NDivider>

              {formData.responseType === 'static' && (
                <div style="height: 400px;">
                  {/* <MonacoEditor
                    value={formData.responseData}
                    language="json"
                    onChange={v => (formData.responseData = v)}
                    height="400px"
                  /> */}
                </div>
              )}

              {formData.responseType === 'faker' && (
                <div>
                  <p class="helper-text" style="margin-bottom: 8px;">
                    使用 &#123;&#123;faker.method&#125;&#125;
                    语法引用faker数据，例如
                    &#123;&#123;name.firstName&#125;&#125;
                  </p>
                  <div style="height: 400px;">
                    {/* <MonacoEditor
                      value={formData.responseTemplate}
                      language="json"
                      onChange={v => (formData.responseTemplate = v)}
                      height="370px"
                    /> */}
                  </div>
                </div>
              )}

              {formData.responseType === 'function' && (
                <div>
                  <p class="helper-text" style="margin-bottom: 8px;">
                    编写函数生成响应，可使用faker和req对象，必须return返回值
                  </p>
                  <div style="height: 400px;">
                    {/* <MonacoEditor
                      value={formData.responseCode}
                      language="javascript"
                      onChange={v => (formData.responseCode = v)}
                      height="370px"
                    /> */}
                  </div>
                </div>
              )}
            </NForm>
          </NTabPane>
        </NTabs>

        <NDivider />

        <div style="display: flex; justify-content: flex-end;">
          <NSpace>
            <NButton onClick={handlePreview} loading={previewLoading.value}>
              预览响应
            </NButton>
            <NButton onClick={handleCancel}>取消</NButton>
            <NButton type="primary" onClick={handleSave}>
              保存
            </NButton>
          </NSpace>
        </div>

        {/* 预览结果弹窗 */}
        <NModal v-model:show={showPreview.value} preset="card" title="响应预览">
          <NCode
            code={previewResult.value}
            language="json"
            showLineNumbers
            style="max-height: 500px; overflow: auto;"
          />
          <div style="margin-top: 16px; text-align: right;">
            <NButton onClick={() => (showPreview.value = false)}>关闭</NButton>
          </div>
        </NModal>
      </NModal>
    )
  },
})

export default MockEditor
