import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { type MockConfig, MockStorage } from './storage'
import { setupMockHandlers } from './mock'

// 创建一个存储实例
let mockStorage: MockStorage

/**
 * 注入UI到页面中
 */
export function injectUI(selector: string): void {
  if (typeof document === 'undefined') return

  // 从window中获取存储配置
  const storageConfig = (window as any).__FAKER_STORAGE_CONFIG__ || {
    storageDir: '.mock',
  }

  // 初始化存储
  mockStorage = new MockStorage(storageConfig)

  // 确保只注入一次
  if (document.querySelector('faker-panel')) return

  // 注册Web组件
  if (!customElements.get('faker-panel')) {
    customElements.define('faker-panel', FakerPanel)
  }

  // 等待DOM加载完成
  const appendUI = (): void => {
    const target = document.querySelector(selector)
    if (target) {
      const panel = document.createElement('faker-panel') as FakerPanel
      target.appendChild(panel)

      // 初始化MSW
      setupMockHandlers(mockStorage)
    } else {
      console.warn(
        `[vite-plugin-faker] Target element "${selector}" not found.`,
      )
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendUI)
  } else {
    appendUI()
  }
}

@customElement('faker-panel')
export class FakerPanel extends LitElement {
  @property({ type: Boolean }) open = false
  @state() mocks: MockConfig[] = []
  @state() editingMock: MockConfig | null = null
  @state() isAddingNew = false

  static styles = css`
    :host {
      --faker-primary: #4caf50;
      --faker-bg: #ffffff;
      --faker-text: #333333;
      --faker-border: #e0e0e0;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
        Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }

    .faker-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--faker-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      transition: all 0.3s ease;
    }

    .faker-toggle:hover {
      transform: scale(1.05);
    }

    .faker-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: var(--faker-bg);
      box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
      z-index: 9998;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .faker-panel.open {
      transform: translateX(0);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--faker-primary);
      color: white;
    }

    .panel-title {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .panel-close {
      cursor: pointer;
      background: none;
      border: none;
      color: white;
      font-size: 20px;
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .mock-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .mock-item {
      border: 1px solid var(--faker-border);
      border-radius: 4px;
      margin-bottom: 12px;
      padding: 12px;
    }

    .mock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .mock-path {
      font-weight: 500;
      color: var(--faker-text);
    }

    .mock-method {
      background: #f0f0f0;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }

    .mock-method.get {
      color: #2196f3;
    }
    .mock-method.post {
      color: #4caf50;
    }
    .mock-method.put {
      color: #ff9800;
    }
    .mock-method.delete {
      color: #f44336;
    }

    .mock-controls {
      display: flex;
      gap: 8px;
    }

    .btn {
      background: var(--faker-primary);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--faker-primary);
      color: var(--faker-primary);
    }

    .btn-small {
      padding: 4px 8px;
      font-size: 12px;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 20px;
    }

    .slider:before {
      position: absolute;
      content: '';
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--faker-primary);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    input,
    select,
    textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--faker-border);
      border-radius: 4px;
      font-family: inherit;
      box-sizing: border-box;
    }

    textarea {
      min-height: 100px;
      font-family: monospace;
    }

    .form-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    .panel-footer {
      padding: 16px;
      border-top: 1px solid var(--faker-border);
      display: flex;
      justify-content: space-between;
    }
  `

  connectedCallback(): void {
    super.connectedCallback()
    this.loadMocks()
  }

  loadMocks(): void {
    // 确保mockStorage已初始化
    if (mockStorage) {
      this.mocks = mockStorage.getMocks()
    }
  }

  togglePanel(): void {
    this.open = !this.open
  }

  toggleMockEnabled(id: string): void {
    mockStorage.toggleMockEnabled(id)
    this.loadMocks()
    setupMockHandlers(mockStorage)
  }

  editMock(mock: MockConfig): void {
    this.editingMock = { ...mock }
  }

  deleteMock(id: string): void {
    if (confirm('确定要删除这个模拟配置吗？')) {
      mockStorage.deleteMock(id)
      this.loadMocks()
      setupMockHandlers(mockStorage)
    }
  }

  startAddNew(): void {
    this.isAddingNew = true
    this.editingMock = {
      id: crypto.randomUUID(),
      path: '',
      method: 'GET',
      enabled: true,
      statusCode: 200,
      delay: 0,
      response: '{}',
      description: '',
    }
  }

  cancelEdit(): void {
    this.editingMock = null
    this.isAddingNew = false
  }

  handleSubmit(e: Event): void {
    e.preventDefault()

    if (!this.editingMock) return

    // 处理response字段，尝试将字符串转为对象
    let response = this.editingMock.response
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response)
      } catch (err) {
        // 如果不是有效的JSON，保持为字符串
      }
    }

    const mock = {
      ...this.editingMock,
      response,
    }

    if (this.isAddingNew) {
      mockStorage.addMock(mock)
    } else {
      mockStorage.updateMock(mock)
    }

    this.loadMocks()
    this.editingMock = null
    this.isAddingNew = false
    setupMockHandlers(mockStorage)
  }

  handleInputChange(e: Event): void {
    const target = e.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    const field = target.name
    let value: string | boolean | number = target.value

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked
    } else if (field === 'delay' || field === 'statusCode') {
      value = parseInt(value as string, 10) || 0
    }

    if (this.editingMock) {
      this.editingMock = {
        ...this.editingMock,
        [field]: value,
      }
    }
  }

  renderMockForm() {
    if (!this.editingMock) return null

    let responseValue = this.editingMock.response
    if (typeof responseValue === 'object') {
      responseValue = JSON.stringify(responseValue, null, 2)
    }

    return html`
      <form @submit="${this.handleSubmit}">
        <div class="form-group">
          <label for="path">API路径</label>
          <input
            type="text"
            id="path"
            name="path"
            .value="${this.editingMock.path}"
            @input="${this.handleInputChange}"
            required
          />
        </div>

        <div class="form-group">
          <label for="method">HTTP方法</label>
          <select
            id="method"
            name="method"
            .value="${this.editingMock.method}"
            @change="${this.handleInputChange}"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTIONS">OPTIONS</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>

        <div class="form-group">
          <label for="statusCode">状态码</label>
          <input
            type="number"
            id="statusCode"
            name="statusCode"
            .value="${this.editingMock.statusCode || 200}"
            @input="${this.handleInputChange}"
            min="100"
            max="599"
          />
        </div>

        <div class="form-group">
          <label for="delay">延迟(毫秒)</label>
          <input
            type="number"
            id="delay"
            name="delay"
            .value="${this.editingMock.delay || 0}"
            @input="${this.handleInputChange}"
            min="0"
          />
        </div>

        <div class="form-group">
          <label for="response">响应数据 (JSON)</label>
          <textarea
            id="response"
            name="response"
            .value="${responseValue}"
            @input="${this.handleInputChange}"
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label for="description">描述</label>
          <input
            type="text"
            id="description"
            name="description"
            .value="${this.editingMock.description || ''}"
            @input="${this.handleInputChange}"
          />
        </div>

        <div class="form-group">
          <label class="switch">
            <input
              type="checkbox"
              name="enabled"
              .checked="${this.editingMock.enabled}"
              @change="${this.handleInputChange}"
            />
            <span class="slider"></span>
          </label>
          <span>启用</span>
        </div>

        <div class="form-footer">
          <button
            type="button"
            class="btn btn-outline"
            @click="${this.cancelEdit}"
          >
            取消
          </button>
          <button type="submit" class="btn">保存</button>
        </div>
      </form>
    `
  }

  renderMockList() {
    return html`
      <div class="panel-content">
        <div class="mock-list-header">
          <h3>API模拟列表</h3>
          <button class="btn btn-small" @click="${this.startAddNew}">
            添加模拟
          </button>
        </div>

        <ul class="mock-list">
          ${this.mocks.length === 0
            ? html`<li class="mock-item">
                暂无模拟配置。点击"添加模拟"开始。
              </li>`
            : this.mocks.map(
                mock => html`
                  <li class="mock-item">
                    <div class="mock-header">
                      <span class="mock-path">${mock.path}</span>
                      <span class="mock-method ${mock.method.toLowerCase()}"
                        >${mock.method}</span
                      >
                    </div>

                    <div class="mock-controls">
                      <label class="switch">
                        <input
                          type="checkbox"
                          .checked="${mock.enabled}"
                          @change="${() => this.toggleMockEnabled(mock.id)}"
                        />
                        <span class="slider"></span>
                      </label>

                      <button
                        class="btn btn-small btn-outline"
                        @click="${() => this.editMock(mock)}"
                      >
                        编辑
                      </button>

                      <button
                        class="btn btn-small btn-outline"
                        @click="${() => this.deleteMock(mock.id)}"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                `,
              )}
        </ul>
      </div>
    `
  }

  render() {
    return html`
      <div class="faker-toggle" @click="${this.togglePanel}">F</div>

      <div class="faker-panel ${this.open ? 'open' : ''}">
        <div class="panel-header">
          <h2 class="panel-title">Vite Faker</h2>
          <button class="panel-close" @click="${this.togglePanel}">×</button>
        </div>

        ${this.editingMock ? this.renderMockForm() : this.renderMockList()}

        <div class="panel-footer">
          <span>总计: ${this.mocks.length} 模拟</span>
          <span>启用: ${this.mocks.filter(m => m.enabled).length}</span>
        </div>
      </div>
    `
  }
}
