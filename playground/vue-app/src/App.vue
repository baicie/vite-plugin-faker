<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

// API基础配置 - 测试绝对路径和相对路径
const API_BASE = '/api' // 相对路径：走 Vite 代理
// const API_BASE = 'http://localhost:3000/api'  // 绝对路径：不走代理，但会被全局监听器捕获
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// 响应式数据
const activeTab = ref('users')
const loading = ref(false)
const loadingText = ref('加载中1...')
const authToken = ref('')
const currentUser = ref<any>(null)

// 状态数据
const apiStatus = ref({ text: '未检查', class: 'status-unknown' })
const authMode = ref({ text: '未知', class: 'status-unknown' })

// 数据列表
const users = ref<any[]>([])
const products = ref<any[]>([])
const orders = ref<any[]>([])
const uploadFiles = ref<File[]>([])
const uploadedFiles = ref<any[]>([])

// 表单显示状态
const showLogin = ref(false)
const showUserForm = ref(false)
const showProductForm = ref(false)
const showOrderForm = ref(false)

// 表单数据
const loginForm = reactive({
  email: 'admin@example.com',
  password: 'password123',
})

const userForm = reactive({
  id: null,
  name: '',
  email: '',
  age: 18,
  password: '',
})

const productForm = reactive({
  id: null,
  name: '',
  price: 0,
  category: '',
  stock: 0,
  description: '',
})

// API测试
const apiTest = reactive({
  method: 'GET',
  path: '/api/health',
  body: '',
  response: '',
})

// 消息提示
const message = reactive({
  show: false,
  type: 'info',
  text: '',
})

// 标签页配置
const tabs = [
  { key: 'users', label: '👥 用户管理' },
  { key: 'products', label: '🛍️ 商品管理' },
  { key: 'orders', label: '📦 订单管理' },
  { key: 'upload', label: '📁 文件上传' },
  { key: 'api', label: '🔧 API测试' },
]

// 设置请求拦截器
api.interceptors.request.use(config => {
  if (authToken.value) {
    config.headers.Authorization = `Bearer ${authToken.value}`
  }
  return config
})

// 工具函数
const showMessage = (text: string, type = 'info') => {
  message.text = text
  message.type = type
  message.show = true
  setTimeout(() => {
    message.show = false
  }, 3000)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// API调用函数
const checkHealth = async () => {
  try {
    apiStatus.value = { text: '正常', class: 'status-success' }
    console.log(new Date().toISOString(), 'checkHealth')
    // 检测认证模式
    try {
      await api.get('/users')
      authMode.value = { text: '已禁用', class: 'status-warning' }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authMode.value = { text: '已启用', class: 'status-success' }
      } else {
        authMode.value = { text: '未知错误', class: 'status-error' }
      }
    }
  } catch (error: any) {
    apiStatus.value = { text: '异常', class: 'status-error' }
    showMessage('API连接失败', 'error')
  }
}

const login = async () => {
  try {
    loading.value = true
    loadingText.value = '登录中...'

    const response = await api.post('/auth/login', loginForm)
    authToken.value = response.data.access_token
    currentUser.value = response.data.user
    showLogin.value = false
    showMessage('登录成功', 'success')

    // 登录后刷新数据
    await loadAllData()
  } catch (error: any) {
    showMessage(
      '登录失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    console.log(new Date().toISOString(), 'loadUsers')
    const response = await api.get('/users')
    console.log('app response', response)
    users.value =
      response.data.data?.data || response.data.data || response.data
  } catch (error: any) {
    console.error('加载用户失败:', error)
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      showMessage('加载用户失败', 'error')
    }
  }
}

const loadProducts = async () => {
  try {
    const response = await api.get('/products')
    // API返回格式: {success: true, data: {data: [...], meta: {...}}}
    products.value =
      response.data.data?.data || response.data.data || response.data
  } catch (error: any) {
    console.error('加载商品失败:', error)
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      showMessage('加载商品失败', 'error')
    }
  }
}

const loadOrders = async () => {
  try {
    const response = await api.get('/orders')
    // API返回格式: {success: true, data: {data: [...], meta: {...}}}
    orders.value =
      response.data.data?.data || response.data.data || response.data
  } catch (error: any) {
    console.error('加载订单失败:', error)
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      showMessage('加载订单失败', 'error')
    }
  }
}

const loadAllData = async () => {
  await Promise.all([loadUsers(), loadProducts(), loadOrders()])
}

// 用户管理
const editUser = (user: any) => {
  Object.assign(userForm, user)
  showUserForm.value = true
}

const saveUser = async () => {
  try {
    loading.value = true
    loadingText.value = userForm.id ? '更新用户...' : '创建用户...'

    if (userForm.id) {
      await api.put(`/users/${userForm.id}`, userForm)
      showMessage('用户更新成功', 'success')
    } else {
      await api.post('/users', userForm)
      showMessage('用户创建成功', 'success')
    }

    closeUserForm()
    await loadUsers()
  } catch (error: any) {
    showMessage(
      '保存用户失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  } finally {
    loading.value = false
  }
}

const deleteUser = async (id: number) => {
  if (!confirm('确定要删除这个用户吗？')) return

  try {
    await api.delete(`/users/${id}`)
    showMessage('用户删除成功', 'success')
    await loadUsers()
  } catch (error: any) {
    showMessage(
      '删除用户失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  }
}

const closeUserForm = () => {
  showUserForm.value = false
  Object.assign(userForm, {
    id: null,
    name: '',
    email: '',
    age: 18,
    password: '',
  })
}

// 商品管理
const editProduct = (product: any) => {
  Object.assign(productForm, product)
  showProductForm.value = true
}

const saveProduct = async () => {
  try {
    loading.value = true
    loadingText.value = productForm.id ? '更新商品...' : '创建商品...'

    if (productForm.id) {
      await api.put(`/products/${productForm.id}`, productForm)
      showMessage('商品更新成功', 'success')
    } else {
      await api.post('/products', productForm)
      showMessage('商品创建成功', 'success')
    }

    closeProductForm()
    await loadProducts()
  } catch (error: any) {
    showMessage(
      '保存商品失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  } finally {
    loading.value = false
  }
}

const deleteProduct = async (id: number) => {
  if (!confirm('确定要删除这个商品吗？')) return

  try {
    await api.delete(`/products/${id}`)
    showMessage('商品删除成功', 'success')
    await loadProducts()
  } catch (error: any) {
    showMessage(
      '删除商品失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  }
}

const closeProductForm = () => {
  showProductForm.value = false
  Object.assign(productForm, {
    id: null,
    name: '',
    price: 0,
    category: '',
    stock: 0,
    description: '',
  })
}

// 订单管理
const viewOrderItems = async (order: any) => {
  showMessage(`订单 ${order.id} 的详细信息`, 'info')
}

const deleteOrder = async (id: number) => {
  if (!confirm('确定要删除这个订单吗？')) return

  try {
    await api.delete(`/orders/${id}`)
    showMessage('订单删除成功', 'success')
    await loadOrders()
  } catch (error: any) {
    showMessage(
      '删除订单失败: ' + (error.response?.data?.message || error.message),
      'error',
    )
  }
}

// 文件上传
const handleFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files) {
    uploadFiles.value.push(...Array.from(files))
  }
}

const removeFile = (file: File) => {
  const index = uploadFiles.value.indexOf(file)
  if (index > -1) {
    uploadFiles.value.splice(index, 1)
  }
}

const uploadFile = async (file: File) => {
  try {
    loading.value = true
    loadingText.value = `上传 ${file.name}...`

    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    uploadedFiles.value.push(response.data)
    removeFile(file)
    showMessage(`文件 ${file.name} 上传成功`, 'success')
  } catch (error: any) {
    showMessage(
      `上传 ${file.name} 失败: ` +
        (error.response?.data?.message || error.message),
      'error',
    )
  } finally {
    loading.value = false
  }
}

// API测试
const testApi = async () => {
  try {
    loading.value = true
    loadingText.value = '发送API请求...'

    let response
    const config = {
      method: apiTest.method.toLowerCase(),
      url: apiTest.path.startsWith('/') ? apiTest.path : `/${apiTest.path}`,
      data:
        apiTest.method !== 'GET' && apiTest.body
          ? JSON.parse(apiTest.body)
          : undefined,
    }

    response = await api.request(config)
    apiTest.response = JSON.stringify(response.data, null, 2)
    showMessage('API请求成功', 'success')
  } catch (error: any) {
    apiTest.response = JSON.stringify(
      {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      },
      null,
      2,
    )
    showMessage('API请求失败', 'error')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  console.log('onMounted')
  await checkHealth()
  await loadAllData()
})
</script>

<template>
  <div id="app">
    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span>🌐 API状态:</span>
        <span :class="apiStatus.class">{{ apiStatus.text }}</span>
        <button @click="checkHealth" class="btn btn-sm">检查</button>
      </div>
      <div class="status-item">
        <span>🔐 认证模式:</span>
        <span :class="authMode.class">{{ authMode.text }}</span>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 标签页导航 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 用户管理 -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="section-header">
          <h2>👥 用户管理</h2>
          <button @click="showUserForm = true" class="btn btn-primary">
            添加用户
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>姓名</th>
                <th>邮箱</th>
                <th>年龄</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.age }}</td>
                <td>{{ user.role }}</td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>
                  <button
                    @click="editUser(user)"
                    class="btn btn-sm btn-secondary"
                  >
                    编辑
                  </button>
                  <button
                    @click="deleteUser(user.id)"
                    class="btn btn-sm btn-danger"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 商品管理 -->
      <div v-if="activeTab === 'products'" class="tab-content">
        <div class="section-header">
          <h2>🛍️ 商品管理</h2>
          <button @click="showProductForm = true" class="btn btn-primary">
            添加商品
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>商品名称</th>
                <th>价格</th>
                <th>分类</th>
                <th>库存</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in products" :key="product.id">
                <td>{{ product.id }}</td>
                <td>{{ product.name }}</td>
                <td>¥{{ product.price }}</td>
                <td>{{ product.category }}</td>
                <td>{{ product.stock }}</td>
                <td>{{ product.description }}</td>
                <td>
                  <button
                    @click="editProduct(product)"
                    class="btn btn-sm btn-secondary"
                  >
                    编辑
                  </button>
                  <button
                    @click="deleteProduct(product.id)"
                    class="btn btn-sm btn-danger"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 订单管理 -->
      <div v-if="activeTab === 'orders'" class="tab-content">
        <div class="section-header">
          <h2>📦 订单管理</h2>
          <button @click="showOrderForm = true" class="btn btn-primary">
            创建订单
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>订单ID</th>
                <th>用户ID</th>
                <th>总金额</th>
                <th>地址</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td>{{ order.id }}</td>
                <td>{{ order.userId }}</td>
                <td>¥{{ order.totalAmount }}</td>
                <td>{{ order.address }}</td>
                <td>{{ order.status }}</td>
                <td>{{ formatDate(order.createdAt) }}</td>
                <td>
                  <button
                    @click="viewOrderItems(order)"
                    class="btn btn-sm btn-info"
                  >
                    查看详情
                  </button>
                  <button
                    @click="deleteOrder(order.id)"
                    class="btn btn-sm btn-danger"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 文件上传 -->
      <div v-if="activeTab === 'upload'" class="tab-content">
        <div class="section-header">
          <h2>📁 文件上传</h2>
        </div>

        <div class="upload-section">
          <div class="upload-area">
            <p>点击选择文件或拖拽文件到此处</p>
            <input
              ref="fileInput"
              type="file"
              multiple
              @change="handleFileSelect"
              style="display: none"
            />
          </div>

          <div v-if="uploadFiles.length > 0" class="file-list">
            <h3>上传队列</h3>
            <div v-for="file in uploadFiles" :key="file.name" class="file-item">
              <span>{{ file.name }} ({{ formatFileSize(file.size) }})</span>
              <button @click="uploadFile(file)" class="btn btn-sm btn-primary">
                上传
              </button>
              <button @click="removeFile(file)" class="btn btn-sm btn-danger">
                移除
              </button>
            </div>
          </div>

          <div v-if="uploadedFiles.length > 0" class="uploaded-files">
            <h3>已上传文件</h3>
            <div
              v-for="file in uploadedFiles"
              :key="file.filename"
              class="uploaded-file"
            >
              <a :href="file.url" target="_blank">{{ file.originalname }}</a>
              <span>({{ formatFileSize(file.size) }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- API测试 -->
      <div v-if="activeTab === 'api'" class="tab-content">
        <div class="section-header">
          <h2>🔧 API 测试</h2>
        </div>

        <div class="api-test-section">
          <div class="test-form">
            <div class="form-group">
              <label>请求方法:</label>
              <select v-model="apiTest.method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div class="form-group">
              <label>API路径:</label>
              <input
                v-model="apiTest.path"
                placeholder="/api/users"
                class="form-input"
              />
            </div>

            <div class="form-group" v-if="apiTest.method !== 'GET'">
              <label>请求体 (JSON):</label>
              <textarea
                v-model="apiTest.body"
                placeholder='{"name": "test"}'
                class="form-textarea"
              ></textarea>
            </div>

            <button @click="testApi" class="btn btn-primary">发送请求</button>
          </div>

          <div class="test-result">
            <h3>响应结果:</h3>
            <pre>{{ apiTest.response }}</pre>
          </div>
        </div>
      </div>
    </main>

    <!-- 登录弹窗 -->
    <div v-if="showLogin" class="modal">
      <div class="modal-content">
        <h3>用户登录</h3>
        <form @submit.prevent="login">
          <div class="form-group">
            <label>邮箱:</label>
            <input
              v-model="loginForm.email"
              type="email"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>密码:</label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              class="form-input"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">登录</button>
            <button
              type="button"
              @click="showLogin = false"
              class="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 用户表单弹窗 -->
    <div v-if="showUserForm" class="modal">
      <div class="modal-content">
        <h3>{{ userForm.id ? '编辑用户' : '添加用户' }}</h3>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>姓名:</label>
            <input v-model="userForm.name" required class="form-input" />
          </div>
          <div class="form-group">
            <label>邮箱:</label>
            <input
              v-model="userForm.email"
              type="email"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>年龄:</label>
            <input
              v-model.number="userForm.age"
              type="number"
              required
              class="form-input"
            />
          </div>
          <div class="form-group" v-if="!userForm.id">
            <label>密码:</label>
            <input
              v-model="userForm.password"
              type="password"
              required
              class="form-input"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">保存</button>
            <button
              type="button"
              @click="closeUserForm"
              class="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 商品表单弹窗 -->
    <div v-if="showProductForm" class="modal">
      <div class="modal-content">
        <h3>{{ productForm.id ? '编辑商品' : '添加商品' }}</h3>
        <form @submit.prevent="saveProduct">
          <div class="form-group">
            <label>商品名称:</label>
            <input v-model="productForm.name" required class="form-input" />
          </div>
          <div class="form-group">
            <label>价格:</label>
            <input
              v-model.number="productForm.price"
              type="number"
              step="0.01"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>分类:</label>
            <input v-model="productForm.category" required class="form-input" />
          </div>
          <div class="form-group">
            <label>库存:</label>
            <input
              v-model.number="productForm.stock"
              type="number"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>描述:</label>
            <textarea
              v-model="productForm.description"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">保存</button>
            <button
              type="button"
              @click="closeProductForm"
              class="btn btn-secondary"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ loadingText }}</p>
    </div>

    <!-- 消息提示 -->
    <div v-if="message.show" :class="['message', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #e0e0e0;
  background-color: #1a1a1a;
  min-height: 100vh;
}

/* 头部样式 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.auth-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 状态栏样式 */
.status-bar {
  background: #2d2d2d;
  padding: 0.75rem 2rem;
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid #404040;
  color: #e0e0e0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.status-success {
  color: #4caf50;
  font-weight: bold;
}

.status-warning {
  color: #ff9800;
  font-weight: bold;
}

.status-error {
  color: #f44336;
  font-weight: bold;
}

.status-unknown {
  color: #888;
}

/* 主要内容区域 */
.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* 标签页样式 */
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #404040;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #999;
  transition: all 0.3s ease;
}

.tab:hover {
  background-color: #2d2d2d;
  color: #e0e0e0;
}

.tab.active {
  color: #8b9aff;
  border-bottom-color: #8b9aff;
  background-color: #2a2a3a;
}

/* 内容区域 */
.tab-content {
  background: #2d2d2d;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #e0e0e0;
  font-size: 1.5rem;
}

/* 表格样式 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: #2d2d2d;
  color: #e0e0e0;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #404040;
}

.data-table th {
  background-color: #1f1f1f;
  font-weight: 600;
  color: #ccc;
}

.data-table tr:hover {
  background-color: #353535;
}

/* 按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background-color: #8b9aff;
  color: white;
}

.btn-primary:hover {
  background-color: #7a8aef;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #138496;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  margin: 0 0.25rem;
}

/* 表单样式 */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #ccc;
}

.form-input,
.form-textarea,
select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #404040;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #1f1f1f;
  color: #e0e0e0;
}

.form-input:focus,
.form-textarea:focus,
select:focus {
  outline: none;
  border-color: #8b9aff;
  box-shadow: 0 0 0 2px rgba(139, 154, 255, 0.2);
}

.form-textarea {
  height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* 弹窗样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #2d2d2d;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  color: #e0e0e0;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #e0e0e0;
}

/* 文件上传样式 */
.upload-section {
  max-width: 600px;
}

.upload-area {
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #e0e0e0;
}

.upload-area:hover {
  border-color: #8b9aff;
  background-color: #2a2a3a;
}

.file-list,
.uploaded-files {
  margin-top: 1.5rem;
}

.file-item,
.uploaded-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #404040;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background-color: #1f1f1f;
  color: #e0e0e0;
}

/* API测试样式 */
.api-test-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.test-result pre {
  background-color: #1f1f1f;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
  border: 1px solid #404040;
  color: #e0e0e0;
}

/* 加载状态 */
.loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 3000;
  animation: slideIn 0.3s ease;
}

.message.info {
  background-color: #2196f3;
}

.message.success {
  background-color: #4caf50;
}

.message.error {
  background-color: #f44336;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .main-content {
    padding: 1rem;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab {
    padding: 0.5rem 1rem;
  }

  .tab-content {
    padding: 1rem;
  }

  .api-test-section {
    grid-template-columns: 1fr;
  }

  .data-table {
    font-size: 0.8rem;
  }

  .modal-content {
    width: 95%;
    padding: 1rem;
  }
}
</style>
