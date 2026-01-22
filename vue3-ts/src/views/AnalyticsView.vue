<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// 使用环境变量配置的API地址，与其他模块保持一致
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// 页面名称映射表（英文标识符 -> 中文名称）
const pageNameMap: Record<string, string> = {
  // 应用级别
  'app_launch': '首页',
  'app_show': '医说',
  'app_hide': '我的',
  
  // 主要页面
  'pages/index/index': '首页',
  'index/index': '首页',
  'index': '首页',
  
  'pages/doctor/doctor': '名医',
  'doctor/doctor': '名医',
  'doctor': '名医',
  
  'pages/yishuo/yishuo': '医说',
  'yishuo/yishuo': '医说',
  'yishuo': '医说',
  
  'pages/mine/mine': '我的',
  'mine/mine': '我的',
  'mine': '我的',
  
  // 其他页面
  'pages/specialty-hospital/index': '专科专病',
  'specialty-hospital/index': '专科专病',
  'specialty-hospital': '专科专病',
  
  'pages/city/index': '切换城市',
  'city/index': '切换城市',
  'city': '切换城市',
  
  'pages/doctor/appointment-register': '预约挂号',
  'doctor/appointment-register': '预约挂号',
  'appointment-register': '预约挂号',
  
  'pages/hospital-detail/index': '医院详情',
  'hospital-detail/index': '医院详情',
  'hospital-detail': '医院详情',
  
  'pages/doctor/dept-doctors': '科室医生',
  'doctor/dept-doctors': '科室医生',
  'dept-doctors': '科室医生',
  
  'pages/doctor/schedule': '科室月排班',
  'doctor/schedule': '科室月排班',
  'schedule': '科室月排班',
  
  'pages/login/login': '登录',
  'login/login': '登录',
  'login': '登录',
  
  'pages/doctor/department': '科室选择',
  'doctor/department': '科室选择',
  'department': '科室选择',
  
  'pages/appointment/index': '预约挂号',
  'appointment/index': '预约挂号',
  'appointment': '预约挂号',
  
  'pages/doctor/disease': '疾病选择',
  'doctor/disease': '疾病选择',
  'disease': '疾病选择',
  
  'pages/doctor/detail': '医生详情',
  'doctor/detail': '医生详情',
  'doctor_detail': '医生详情',
  'detail': '医生详情',
  
  'pages/doctor/appointment': '预约信息',
  'doctor/appointment': '预约信息',
  
  'pages/mine/appointments': '我的预约',
  'mine/appointments': '我的预约',
  'appointments': '我的预约',
  
  'pages/mine/patients': '我的就诊人',
  'mine/patients': '我的就诊人',
  'patients': '我的就诊人',
  
  'pages/mine/consultations': '我的咨询',
  'mine/consultations': '我的咨询',
  'consultations': '我的咨询',
  
  'pages/mine/favorites': '我的收藏',
  'mine/favorites': '我的收藏',
  'favorites': '我的收藏',
  
  'pages/mine/help': '帮助中心',
  'mine/help': '帮助中心',
  'help': '帮助中心',
  
  'pages/settings/settings': '设置',
  'settings/settings': '设置',
  'settings': '设置',
  
  'pages/settings/account/account': '账号设置',
  'settings/account/account': '账号设置',
  'account': '账号设置',
  
  'pages/settings/notification/notification': '消息通知',
  'settings/notification/notification': '消息通知',
  'notification': '消息通知',
  
  'pages/settings/address/address': '地址管理',
  'settings/address/address': '地址管理',
  'address': '地址管理',
  
  'pages/settings/about/about': '功能介绍',
  'settings/about/about': '功能介绍',
  'about': '功能介绍',
  
  'pages/settings/legal': '法律声明',
  'settings/legal': '法律声明',
  'legal': '法律声明',
  
  'pages/settings/terms': '用户服务协议',
  'settings/terms': '用户服务协议',
  'terms': '用户服务协议',
  
  'pages/settings/privacy': '隐私政策',
  'settings/privacy': '隐私政策',
  'privacy': '隐私政策',
  
  'pages/settings/realname/realname': '实名认证',
  'settings/realname/realname': '实名认证',
  'realname': '实名认证',
  
  'pages/online-consult/index': '在线问诊',
  'online-consult/index': '在线问诊',
  'online-consult': '在线问诊',
  
  'pages/online-consult/patient': '选择就诊人',
  'online-consult/patient': '选择就诊人',
  'patient': '选择就诊人',
  
  'pages/online-consult/chat': '在线咨询',
  'online-consult/chat': '在线咨询',
  'chat': '在线咨询',
}

/**
 * 获取页面的中文名称
 */
function getPageNameCN(pageName: string | undefined | null): string {
  if (!pageName) return '未知页面'
  
  // 直接匹配
  if (pageNameMap[pageName]) {
    return pageNameMap[pageName]
  }
  
  // 尝试匹配部分路径
  const keys = Object.keys(pageNameMap)
  for (const key of keys) {
    if (pageName.includes(key) || key.includes(pageName)) {
      return pageNameMap[key] || '未知页面'
    }
  }
  
  // 如果都不匹配，返回原值
  return pageName
}

// 数据
const stats = ref<any[]>([])
const popularPages = ref<any[]>([])
const events = ref<any[]>([])
const loading = ref(false)

// 筛选条件
// 设置结束日期为当前月份的31号
const now = new Date()
const endDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

const dateRange = ref({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: endDateStr
})
const selectedType = ref('')
const groupBy = ref('day')

// 统计数据
const totalEvents = computed(() => {
  return stats.value.reduce((sum, item) => sum + item.count, 0)
})

const totalUsers = computed(() => {
  const users = new Set()
  stats.value.forEach(item => {
    if (item.uniqueUsers) {
      users.add(item.uniqueUsers)
    }
  })
  return users.size
})

// 获取统计数据
async function fetchStats() {
  loading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
      groupBy: groupBy.value
    }
    if (selectedType.value) {
      params.type = selectedType.value
    }
    
    const response = await axios.get(`${API_BASE_URL}/tracking/stats`, { params })
    stats.value = response.data.data || []
  } catch (error) {
    console.error('获取统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取热门页面
async function fetchPopularPages() {
  try {
    const params = {
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
      limit: 10
    }
    const response = await axios.get(`${API_BASE_URL}/tracking/popular-pages`, { params })
    popularPages.value = response.data.data || []
  } catch (error) {
    console.error('获取热门页面失败:', error)
  }
}

// 获取事件列表
async function fetchEvents() {
  try {
    const params: any = {
      page: 1,
      pageSize: 50,
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate
    }
    if (selectedType.value) {
      params.type = selectedType.value
    }
    
    const response = await axios.get(`${API_BASE_URL}/tracking/events`, { params })
    events.value = response.data.data || []
  } catch (error) {
    console.error('获取事件列表失败:', error)
  }
}

// 加载所有数据
async function loadData() {
  await Promise.all([
    fetchStats(),
    fetchPopularPages(),
    fetchEvents()
  ])
}

// 格式化日期
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 格式化数字
function formatNumber(num: number) {
  return num.toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="analytics-container">
    <header class="page-header">
      <h1 class="page-title">数据统计分析</h1>
      <p class="page-subtitle">用户行为数据监控与分析</p>
    </header>

    <!-- 筛选条件 -->
    <div class="filters">
      <div class="filter-group">
        <label>开始日期：</label>
        <input 
          type="date" 
          v-model="dateRange.startDate"
          @change="loadData"
        />
      </div>
      <div class="filter-group">
        <label>结束日期：</label>
        <input 
          type="date" 
          v-model="dateRange.endDate"
          @change="loadData"
        />
      </div>
      <div class="filter-group">
        <label>事件类型：</label>
        <select v-model="selectedType" @change="loadData">
          <option value="">全部</option>
          <option value="page_view">页面浏览</option>
          <option value="click">点击事件</option>
          <option value="custom">自定义事件</option>
          <option value="error">错误事件</option>
          <option value="performance">性能事件</option>
        </select>
      </div>
      <div class="filter-group">
        <label>分组方式：</label>
        <select v-model="groupBy" @change="loadData">
          <option value="hour">按小时</option>
          <option value="day">按天</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
        </select>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">总事件数</div>
          <div class="stat-value">{{ formatNumber(totalEvents) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-label">独立用户</div>
          <div class="stat-value">{{ formatNumber(totalUsers) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-content">
          <div class="stat-label">热门页面数</div>
          <div class="stat-value">{{ popularPages.length }}</div>
        </div>
      </div>
    </div>

    <!-- 热门页面 -->
    <div class="section">
      <h2 class="section-title">热门页面 TOP 10</h2>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>页面名称</th>
              <th>访问次数</th>
              <th>独立用户</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(page, index) in popularPages" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ getPageNameCN(page.pageName) }}</td>
              <td>{{ formatNumber(page.count) }}</td>
              <td>{{ formatNumber(page.uniqueUsers) }}</td>
            </tr>
            <tr v-if="popularPages.length === 0">
              <td colspan="4" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 统计数据表格 -->
    <div class="section">
      <h2 class="section-title">统计数据</h2>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>事件类型</th>
              <th>事件名称</th>
              <th>数量</th>
              <th>独立用户</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stat, index) in stats" :key="index">
              <td>{{ stat.date }}</td>
              <td>
                <span class="type-badge" :class="`type-${stat.type}`">
                  {{ stat.type }}
                </span>
              </td>
              <td>{{ getPageNameCN(stat.displayName || stat.pageName || stat.eventName) }}</td>
              <td>{{ formatNumber(stat.count) }}</td>
              <td>{{ formatNumber(stat.uniqueUsers) }}</td>
            </tr>
            <tr v-if="stats.length === 0">
              <td colspan="5" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 最近事件 -->
    <div class="section">
      <h2 class="section-title">最近事件</h2>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>事件名称</th>
              <th>用户ID</th>
              <th>页面</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(event, index) in events" :key="index">
              <td>{{ formatDate(event.timestamp) }}</td>
              <td>
                <span class="type-badge" :class="`type-${event.type}`">
                  {{ event.type }}
                </span>
              </td>
              <td>{{ getPageNameCN(event.eventName) }}</td>
              <td>{{ event.userId }}</td>
              <td>{{ getPageNameCN(event.pageName) || '-' }}</td>
            </tr>
            <tr v-if="events.length === 0">
              <td colspan="5" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6e736c;
  margin: 0;
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: #2d2f31;
  white-space: nowrap;
}

.filter-group input,
.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6e736c;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2d2f31;
}

.section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0 0 16px 0;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2d2f31;
  border-bottom: 2px solid #ddd;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  color: #2d2f31;
}

.data-table tr:hover {
  background: #f8f9fa;
}

.empty {
  text-align: center;
  color: #6e736c;
  padding: 40px !important;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-page_view {
  background: #e3f2fd;
  color: #1976d2;
}

.type-click {
  background: #f3e5f5;
  color: #7b1fa2;
}

.type-custom {
  background: #e8f5e9;
  color: #388e3c;
}

.type-error {
  background: #ffebee;
  color: #c62828;
}

.type-performance {
  background: #fff3e0;
  color: #e65100;
}

/* 暗色模式覆盖 */
:global(.dark) .analytics-container {
  background: transparent !important;
  color: #ffffff !important;
}

:global(.dark) .page-title,
:global(.dark) .page-subtitle,
:global(.dark) .section-title,
:global(.dark) .stat-label,
:global(.dark) .stat-value {
  color: #ffffff !important;
}

:global(.dark) .filters,
:global(.dark) .stat-card,
:global(.dark) .section {
  background: #1e2a3a !important;
  border-color: #253447 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
  color: #ffffff !important;
}

:global(.dark) .filter-group label {
  color: #ffffff !important;
}

:global(.dark) .filter-group input,
:global(.dark) .filter-group select {
  background: #16202d !important;
  border-color: #253447 !important;
  color: #ffffff !important;
}

:global(.dark) .data-table th {
  background: #16202d !important;
  color: #ffffff !important;
  border-bottom-color: #253447 !important;
}

:global(.dark) .data-table td {
  color: #ffffff !important;
  border-bottom-color: #253447 !important;
}

:global(.dark) .data-table tr:hover {
  background: #253447 !important;
}

:global(.dark) .empty {
  color: #9eb3c7 !important;
}

:global(.dark) .type-badge {
  color: #ffffff !important;
  border: 1px solid #253447 !important;
}
</style>

