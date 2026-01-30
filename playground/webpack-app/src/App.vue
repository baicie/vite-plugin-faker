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

// 检查API状态
const checkApiStatus = async () => {
  try {
    const res = await api.get('/health')
    apiStatus.value = { text: '在线', class: 'status-online' }
    return true
  } catch (error) {
    console.error('API检查失败:', error)
    apiStatus.value = { text: '离线', class: 'status-offline' }
    showMessage('API连接失败', 'error')
    return false
  }
}

// 检查认证模式
const checkAuthMode = async () => {
  try {
    // 尝试访问受保护资源
    await api.get('/users')
    authMode.value = { text: '公开', class: 'status-public' }
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      authMode.value = { text: '需要认证', class: 'status-protected' }
    } else {
      authMode.value = { text: '未知', class: 'status-unknown' }
    }
  }
}

// 登录
const login = async () => {
  loading.value = true
  loadingText.value = '登录中...'
  try {
    const res = await api.post('/auth/login', loginForm)
    authToken.value = res.data.token
    currentUser.value = res.data.user
    showMessage('登录成功', 'success')
    showLogin.value = false
    await fetchUsers() // 登录后刷新用户列表
  } catch (error: any) {
    console.error('登录失败:', error)
    showMessage(error.response?.data?.message || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}

// 登出
const logout = async () => {
  loading.value = true
  loadingText.value = '登出中...'
  try {
    await api.post('/auth/logout')
    authToken.value = ''
    currentUser.value = null
    showMessage('已登出', 'info')
  } catch (error) {
    console.error('登出失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  loadingText.value = '获取用户列表...'
  try {
    const res = await api.get('/users')
    users.value = res.data
  } catch (error: any) {
    console.error('获取用户失败:', error)
    showMessage('获取用户列表失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loading.value = false
  }
}

// 保存用户
const saveUser = async () => {
  if (!userForm.name || !userForm.email) {
    showMessage('请填写必填项', 'error')
    return
  }

  loading.value = true
  try {
    if (userForm.id) {
      await api.put(`/users/${userForm.id}`, userForm)
      showMessage('用户更新成功', 'success')
    } else {
      await api.post('/users', userForm)
      showMessage('用户创建成功', 'success')
    }
    showUserForm.value = false
    await fetchUsers()
  } catch (error: any) {
    console.error('保存用户失败:', error)
    showMessage('保存用户失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loading.value = false
  }
}

// 删除用户
const deleteUser = async (id: number) => {
  if (!confirm('确定要删除这个用户吗？')) return

  loading.value = true
  try {
    await api.delete(`/users/${id}`)
    showMessage('用户删除成功', 'success')
    await fetchUsers()
  } catch (error: any) {
    console.error('删除用户失败:', error)
    showMessage('删除用户失败: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loading.value = false
  }
}

// 编辑用户
const editUser = (user: any) => {
  Object.assign(userForm, user)
  showUserForm.value = true
}

// 新增用户
const addUser = () => {
  Object.assign(userForm, {
    id: null,
    name: '',
    email: '',
    age: 18,
    password: '',
  })
  showUserForm.value = true
}

// 获取商品列表
const fetchProducts = async () => {
  loading.value = true
  loadingText.value = '获取商品列表...'
  try {
    const res = await api.get('/products')
    products.value = res.data
  } catch (error: any) {
    console.error('获取商品失败:', error)
    showMessage('获取商品列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 保存商品
const saveProduct = async () => {
  if (!productForm.name || !productForm.price) {
    showMessage('请填写必填项', 'error')
    return
  }

  loading.value = true
  try {
    if (productForm.id) {
      await api.put(`/products/${productForm.id}`, productForm)
      showMessage('商品更新成功', 'success')
    } else {
      await api.post('/products', productForm)
      showMessage('商品创建成功', 'success')
    }
    showProductForm.value = false
    await fetchProducts()
  } catch (error: any) {
    console.error('保存商品失败:', error)
    showMessage('保存商品失败', 'error')
  } finally {
    loading.value = false
  }
}

// 删除商品
const deleteProduct = async (id: number) => {
  if (!confirm('确定要删除这个商品吗？')) return

  loading.value = true
  try {
    await api.delete(`/products/${id}`)
    showMessage('商品删除成功', 'success')
    await fetchProducts()
  } catch (error: any) {
    console.error('删除商品失败:', error)
    showMessage('删除商品失败', 'error')
  } finally {
    loading.value = false
  }
}

// 编辑商品
const editProduct = (product: any) => {
  Object.assign(productForm, product)
  showProductForm.value = true
}

// 新增商品
const addProduct = () => {
  Object.assign(productForm, {
    id: null,
    name: '',
    price: 0,
    category: '',
    stock: 0,
    description: '',
  })
  showProductForm.value = true
}

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  loadingText.value = '获取订单列表...'
  try {
    const res = await api.get('/orders')
    orders.value = res.data
  } catch (error: any) {
    console.error('获取订单失败:', error)
    showMessage('获取订单列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 处理文件选择
const handleFileChange = (event: any) => {
  uploadFiles.value = Array.from(event.target.files)
}

// 上传文件
const uploadFile = async () => {
  if (uploadFiles.value.length === 0) {
    showMessage('请先选择文件', 'error')
    return
  }

  loading.value = true
  loadingText.value = '上传文件中...'
  
  const formData = new FormData()
  uploadFiles.value.forEach(file => {
    formData.append('file', file)
  })

  try {
    const res = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    showMessage('文件上传成功', 'success')
    uploadedFiles.value.push(res.data)
    uploadFiles.value = []
    // 重置input
    const input = document.getElementById('fileInput') as HTMLInputElement
    if (input) input.value = ''
  } catch (error: any) {
    console.error('上传失败:', error)
    showMessage('文件上传失败', 'error')
  } finally {
    loading.value = false
  }
}

// 发送自定义请求
const sendRequest = async () => {
  loading.value = true
  apiTest.response = ''
  
  try {
    let res
    const config = {
      method: apiTest.method,
      url: apiTest.path,
      data: apiTest.body ? JSON.parse(apiTest.body) : undefined,
    }
    
    res = await api(config)
    apiTest.response = JSON.stringify(res.data, null, 2)
    showMessage('请求成功', 'success')
  } catch (error: any) {
    apiTest.response = JSON.stringify(error.response?.data || error.message, null, 2)
    showMessage('请求失败', 'error')
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

// 格式化价格
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(price)
}

// 初始化
onMounted(async () => {
  await checkApiStatus()
  await checkAuthMode()
  await fetchUsers()
})
</script>

<template>
  <div class="container">
    <header>
      <h1>🛠️ Faker Playground</h1>
      <div class="status-bar">
        <div class="status-item">
          API状态: <span :class="apiStatus.class">{{ apiStatus.text }}</span>
        </div>
        <div class="status-item">
          认证模式: <span :class="authMode.class">{{ authMode.text }}</span>
        </div>
        <div class="user-info" v-if="currentUser">
          👤 {{ currentUser.name }}
          <button @click="logout" class="btn-small">登出</button>
        </div>
        <button v-else @click="showLogin = true" class="btn-primary">登录</button>
      </div>
    </header>

    <div class="main-content">
      <nav class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key; tab.key === 'users' && fetchUsers(); tab.key === 'products' && fetchProducts(); tab.key === 'orders' && fetchOrders()"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="tab-content">
        <!-- 用户管理 -->
        <div v-if="activeTab === 'users'" class="panel">
          <div class="panel-header">
            <h2>用户列表</h2>
            <button @click="addUser" class="btn-primary">➕ 新增用户</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>姓名</th>
                  <th>邮箱</th>
                  <th>年龄</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.id }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.age }}</td>
                  <td>
                    <span class="badge" :class="user.status === 'active' ? 'success' : 'warning'">
                      {{ user.status }}
                    </span>
                  </td>
                  <td>
                    <button @click="editUser(user)" class="btn-icon">✏️</button>
                    <button @click="deleteUser(user.id)" class="btn-icon delete">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 商品管理 -->
        <div v-if="activeTab === 'products'" class="panel">
          <div class="panel-header">
            <h2>商品列表</h2>
            <button @click="addProduct" class="btn-primary">➕ 新增商品</button>
          </div>
          <div class="grid-container">
            <div v-for="product in products" :key="product.id" class="card">
              <div class="card-header">
                <h3>{{ product.name }}</h3>
                <span class="price">{{ formatPrice(product.price) }}</span>
              </div>
              <p class="category">{{ product.category }}</p>
              <p class="description">{{ product.description }}</p>
              <div class="card-footer">
                <span>库存: {{ product.stock }}</span>
                <div class="actions">
                  <button @click="editProduct(product)" class="btn-icon">✏️</button>
                  <button @click="deleteProduct(product.id)" class="btn-icon delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 订单管理 -->
        <div v-if="activeTab === 'orders'" class="panel">
          <div class="panel-header">
            <h2>订单列表</h2>
            <button @click="fetchOrders" class="btn-secondary">🔄 刷新</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>客户</th>
                  <th>总金额</th>
                  <th>状态</th>
                  <th>日期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in orders" :key="order.id">
                  <td>{{ order.id }}</td>
                  <td>{{ order.customerName }}</td>
                  <td>{{ formatPrice(order.total) }}</td>
                  <td>
                    <span class="badge" :class="{
                      'success': order.status === 'completed',
                      'warning': order.status === 'pending',
                      'error': order.status === 'cancelled'
                    }">
                      {{ order.status }}
                    </span>
                  </td>
                  <td>{{ formatDate(order.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 文件上传 -->
        <div v-if="activeTab === 'upload'" class="panel">
          <div class="upload-area">
            <h3>文件上传测试</h3>
            <div class="upload-box">
              <input type="file" id="fileInput" multiple @change="handleFileChange">
              <p>拖拽文件到这里或点击上传</p>
            </div>
            <button @click="uploadFile" class="btn-primary" :disabled="!uploadFiles.length">
              ⬆️ 开始上传
            </button>
          </div>
          
          <div class="uploaded-list" v-if="uploadedFiles.length">
            <h3>已上传文件</h3>
            <ul>
              <li v-for="(file, index) in uploadedFiles" :key="index">
                📄 {{ file.filename || file.name }} ({{ file.size }} bytes)
              </li>
            </ul>
          </div>
        </div>

        <!-- API测试 -->
        <div v-if="activeTab === 'api'" class="panel">
          <div class="api-tester">
            <div class="form-group">
              <select v-model="apiTest.method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input v-model="apiTest.path" placeholder="/api/path">
              <button @click="sendRequest" class="btn-primary">发送</button>
            </div>
            <div class="form-group" v-if="['POST', 'PUT'].includes(apiTest.method)">
              <textarea v-model="apiTest.body" placeholder="Request Body (JSON)" rows="5"></textarea>
            </div>
            <div class="response-area">
              <h4>响应结果:</h4>
              <pre>{{ apiTest.response }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingText }}</p>
    </div>

    <div v-if="message.show" class="toast" :class="message.type">
      {{ message.text }}
    </div>

    <!-- 登录弹窗 -->
    <div v-if="showLogin" class="modal-overlay">
      <div class="modal">
        <h3>登录</h3>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="loginForm.email">
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" v-model="loginForm.password">
        </div>
        <div class="modal-actions">
          <button @click="showLogin = false" class="btn-secondary">取消</button>
          <button @click="login" class="btn-primary">登录</button>
        </div>
      </div>
    </div>

    <!-- 用户表单 -->
    <div v-if="showUserForm" class="modal-overlay">
      <div class="modal">
        <h3>{{ userForm.id ? '编辑用户' : '新增用户' }}</h3>
        <div class="form-group">
          <label>姓名</label>
          <input v-model="userForm.name">
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="userForm.email">
        </div>
        <div class="form-group">
          <label>年龄</label>
          <input type="number" v-model="userForm.age">
        </div>
        <div class="modal-actions">
          <button @click="showUserForm = false" class="btn-secondary">取消</button>
          <button @click="saveUser" class="btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 商品表单 -->
    <div v-if="showProductForm" class="modal-overlay">
      <div class="modal">
        <h3>{{ productForm.id ? '编辑商品' : '新增商品' }}</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="productForm.name">
        </div>
        <div class="form-group">
          <label>价格</label>
          <input type="number" v-model="productForm.price">
        </div>
        <div class="form-group">
          <label>分类</label>
          <input v-model="productForm.category">
        </div>
        <div class="form-group">
          <label>库存</label>
          <input type="number" v-model="productForm.stock">
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="productForm.description"></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showProductForm = false" class="btn-secondary">取消</button>
          <button @click="saveProduct" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #22c55e;
  --warning-color: #eab308;
  --error-color: #ef4444;
  --bg-color: #f8fafc;
  --text-color: #1e293b;
  --border-color: #e2e8f0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.status-bar {
  display: flex;
  gap: 15px;
  align-items: center;
}

.status-item {
  font-size: 0.9em;
}

.status-online { color: var(--success-color); font-weight: bold; }
.status-offline { color: var(--error-color); font-weight: bold; }
.status-public { color: var(--success-color); font-weight: bold; }
.status-protected { color: var(--warning-color); font-weight: bold; }
.status-unknown { color: var(--secondary-color); font-weight: bold; }

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.tabs button.active {
  background: var(--primary-color);
  color: white;
}

.panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 表格样式 */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background-color: #f1f5f9;
  font-weight: 600;
}

/* 按钮样式 */
button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.9em;
  transition: opacity 0.2s;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-small {
  padding: 4px 8px;
  font-size: 0.8em;
  background-color: var(--secondary-color);
  color: white;
  margin-left: 10px;
}

.btn-icon {
  background: none;
  padding: 4px;
  font-size: 1.2em;
}

/* 徽章样式 */
.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
  background: #e2e8f0;
}

.badge.success { background: #dcfce7; color: #166534; }
.badge.warning { background: #fef9c3; color: #854d0e; }
.badge.error { background: #fee2e2; color: #991b1b; }

/* 网格布局 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.price {
  font-weight: bold;
  color: var(--primary-color);
}

.card-footer {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.modal h3 {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toast消息 */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 300;
  animation: slideUp 0.3s ease;
}

.toast.info { background: var(--secondary-color); }
.toast.success { background: var(--success-color); }
.toast.error { background: var(--error-color); }

@keyframes slideUp {
  from { transform: translate(-50%, 100%); }
  to { transform: translate(-50%, 0); }
}

.upload-box {
  border: 2px dashed var(--border-color);
  padding: 40px;
  text-align: center;
  margin: 20px 0;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
}

.upload-box input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.api-tester .form-group {
  display: flex;
  gap: 10px;
}

.api-tester select {
  width: 100px;
}

.api-tester pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 15px;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
}
</style>
