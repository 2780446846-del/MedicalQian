<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { get, post, del, put } from '@/utils/request'
import { sendVoiceNotify, getPatientAppointment } from '@/api/voiceNotify'
import { useAuthStore } from '@/stores/auth'
import * as echarts from 'echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import ChinaMap from '@/components/ChinaMap.vue'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
])

interface Patient {
  _id?: string
  id?: string
  name: string
  gender: string
  age?: number
  phone?: string
  address?: string
  avatar?: string
  category?: string // 患者类别：普通、成年人、老年人、儿童等
  treatmentPlan?: string // 治疗方案：门诊、住院、急诊、手术、重症监护
  paymentStatus?: string // 支付状态：已支付、未支付、部分支付、待处理
  createdAt?: string
  updatedAt?: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 数据
const patients = ref<Patient[]>([])
const loading = ref(false)
const searchKeyword = ref('')
  const timeRange = ref<'day' | 'week' | 'month'>('week') // 时间范围：日、周、月
const fileInputRef = ref<HTMLInputElement | null>(null)

// 统计数据
const totalPatients = ref(0)
const appointmentCount = ref(0)
const localPatients = ref(0)
const nonLocalPatients = ref(0)
const patientTrend = ref<number>(0) // 患者数量变化趋势（百分比）
const appointmentTrend = ref<number>(0) // 预约数量变化趋势（百分比）

// 图表引用
const barChartRef = ref<HTMLDivElement | null>(null)
const lineChartRef = ref<HTMLDivElement | null>(null)
const provinceBar2DRef = ref<HTMLDivElement | null>(null)
const provinceBar3DRef = ref<HTMLDivElement | null>(null)
const provincePie2DRef = ref<HTMLDivElement | null>(null)
const provincePie3DRef = ref<HTMLDivElement | null>(null)
let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let provinceBar2DChart: echarts.ECharts | null = null
let provinceBar3DChart: echarts.ECharts | null = null
let provincePie2DChart: echarts.ECharts | null = null
let provincePie3DChart: echarts.ECharts | null = null

// 患者地区分布数据
const patientLocationData = ref<Array<{ name: string; value: number }>>([])

// 视图模式：'2d' 或 '3d'
const viewMode = ref<'2d' | '3d'>('2d')

// 排序
const sortField = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)

// 筛选条件
const filters = ref({
  gender: '',
  category: '',
  treatmentPlan: '',
  paymentStatus: ''
})

// 表头筛选菜单显示状态
const activeFilterMenu = ref<string | null>(null)

// 批量选择
const selectedPatients = ref<string[]>([])
const isSelectMode = ref(false)

// 对话框状态
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDetailDialog = ref(false)
const editingPatient = ref<Patient | null>(null)
const selectedPatient = ref<Patient | null>(null)
const creating = ref(false)

// 表单数据
const patientForm = ref<Partial<Patient>>({
  name: '',
  gender: '',
  age: undefined,
  phone: '',
  address: '',
  category: '普通',
  treatmentPlan: '',
  paymentStatus: '待处理',
  avatar: ''
})

// 头像上传
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string>('')
const uploadingAvatar = ref(false)

// 大文件上传相关
const largeFileInputRef = ref<HTMLInputElement | null>(null)
const showUploadDialog = ref(false)
const uploadingFile = ref(false)
const uploadProgress = ref(0)
const uploadFileName = ref('')
const uploadFileSize = ref(0)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')
const uploadError = ref('')

// 暗色模式状态
const isDark = ref(false)

// 切换暗色模式
const toggleDarkMode = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// 消息列表显示状态
const showMessages = ref(false)
const showUserMenu = ref(false)

// 操作菜单显示状态（针对每个患者的操作菜单）
const activeActionMenu = ref<string | null>(null)

// 拨打电话对话框
const showCallDialog = ref(false)
const callPatient = ref<Patient | null>(null)

// 语音通知对话框
const showNotifyDialog = ref(false)
const notifyPatient = ref<Patient | null>(null)
const notifyLoading = ref(false)
const notifyForm = ref({
  doctorName: '',
  department: '',
  appointmentTime: '',
  clinicLocation: '',
  requiredDocuments: '身份证和医保卡',
  hospitalName: ''
})

// 提示消息
const showToast = ref(false)
const toastMessage = ref('')

// 全屏模态框状态
const fullscreenType = ref<'map' | 'patients' | 'appointments' | null>(null)

// 打开全屏
function openFullscreen(type: 'map' | 'patients' | 'appointments') {
  fullscreenType.value = type
  document.body.style.overflow = 'hidden' // 防止背景滚动
  // 如果是地图全屏，初始化省份图表
  if (type === 'map') {
    nextTick(() => {
      setTimeout(() => {
        initProvinceCharts()
        updateProvinceCharts()
      }, 500) // 延迟更长时间确保DOM完全渲染
    })
  }
}

// 关闭全屏
function closeFullscreen() {
  fullscreenType.value = null
  document.body.style.overflow = '' // 恢复滚动
  // 销毁省份图表
  if (provinceBar2DChart) {
    provinceBar2DChart.dispose()
    provinceBar2DChart = null
  }
  if (provinceBar3DChart) {
    provinceBar3DChart.dispose()
    provinceBar3DChart = null
  }
  if (provincePie2DChart) {
    provincePie2DChart.dispose()
    provincePie2DChart = null
  }
  if (provincePie3DChart) {
    provincePie3DChart.dispose()
    provincePie3DChart = null
  }
}

// 当前日期
const currentDate = ref(new Date())

// 格式化日期
const formatDate = (date: Date) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = weekdays[date.getDay()]
  return `${weekday} ${month}.${day.toString().padStart(2, '0')}`
}

// 获取患者列表
async function fetchPatients() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }

    // 添加筛选参数
    if (filters.value.gender) {
      params.gender = filters.value.gender
    }
    if (filters.value.category) {
      params.category = filters.value.category
    }
    if (filters.value.treatmentPlan) {
      params.treatmentPlan = filters.value.treatmentPlan
    }
    if (filters.value.paymentStatus) {
      params.paymentStatus = filters.value.paymentStatus
    }

    // 使用通用的patients集合API
    const response = await get<{
      success: boolean
      data: Patient[]
      count: number
      page?: number
      pageSize?: number
      totalPages?: number
    }>('/patients', { data: params })

    if (response.success) {
      const patientsData = response.data || []

      // 排序（前端排序，因为后端已经返回了数据）
      if (sortField.value) {
        patientsData.sort((a, b) => {
          const aValue = a[sortField.value as keyof Patient] || ''
          const bValue = b[sortField.value as keyof Patient] || ''
          if (sortOrder.value === 'asc') {
            return String(aValue).localeCompare(String(bValue))
          } else {
            return String(bValue).localeCompare(String(aValue))
          }
        })
      }

      patients.value = patientsData
      total.value = response.count || 0
      totalPages.value = response.totalPages || Math.ceil(total.value / pageSize.value)

      // 计算统计数据（异步，会获取所有患者数据）
      await calculateStatistics(patientsData)
    } else {
      // 如果API返回失败，清空数据
      patients.value = []
      total.value = 0
      totalPatients.value = 0
      totalPages.value = 0
    }
  } catch (error: unknown) {
    console.error('获取患者列表失败:', error)
    // 如果API失败，使用空数据
    patients.value = []
    total.value = 0
    totalPatients.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchPatients()
  }, 300)
}

function handleSearchImmediate() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  currentPage.value = 1
  fetchPatients()
}

// 切换时间范围
function switchTimeRange(range: 'day' | 'week' | 'month') {
  timeRange.value = range
  currentPage.value = 1
  fetchPatients()
}

// 排序
function handleSort(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  fetchPatients()
}

// 打开筛选菜单
function openFilterMenu(field: string, event: MouseEvent) {
  event.stopPropagation()
  if (activeFilterMenu.value === field) {
    activeFilterMenu.value = null
  } else {
    activeFilterMenu.value = field
  }
}

// 关闭筛选菜单
function closeFilterMenu() {
  activeFilterMenu.value = null
}

// 应用筛选
function applyFilter(field: string, value: string) {
  filters.value[field as keyof typeof filters.value] = value
  activeFilterMenu.value = null
  currentPage.value = 1
  fetchPatients()
}

// 清除筛选
function clearFilter(field: string) {
  filters.value[field as keyof typeof filters.value] = ''
  activeFilterMenu.value = null
  currentPage.value = 1
  fetchPatients()
}

// 清除所有筛选
function clearAllFilters() {
  filters.value = {
    gender: '',
    category: '',
    treatmentPlan: '',
    paymentStatus: ''
  }
  activeFilterMenu.value = null
  currentPage.value = 1
  fetchPatients()
}

// 切换选择模式
function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value
  selectedPatients.value = []
}

// 切换单个患者选择
function togglePatientSelection(patientId: string) {
  const index = selectedPatients.value.indexOf(patientId)
  if (index > -1) {
    selectedPatients.value.splice(index, 1)
  } else {
    selectedPatients.value.push(patientId)
  }
}

// 全选/取消全选
function toggleSelectAll() {
  if (selectedPatients.value.length === patients.value.length) {
    selectedPatients.value = []
  } else {
    selectedPatients.value = patients.value.map(p => p._id || p.id || '').filter(Boolean)
  }
}

// 批量删除
async function batchDelete() {
  if (selectedPatients.value.length === 0) {
    alert('请至少选择一个患者')
    return
  }

  if (!confirm(`确定要删除选中的 ${selectedPatients.value.length} 个患者吗？`)) {
    return
  }

  try {
    let successCount = 0
    for (const id of selectedPatients.value) {
      try {
        await del(`/patients/${id}`)
        successCount++
      } catch (error) {
        console.error(`删除患者失败 (${id}):`, error)
      }
    }

    showToastMessage(`成功删除 ${successCount}/${selectedPatients.value.length} 个患者`)
    selectedPatients.value = []
    isSelectMode.value = false
    await fetchPatients()
  } catch (error) {
    console.error('批量删除失败:', error)
    alert('批量删除失败，请重试')
  }
}

// 导出数据
function exportData() {
  if (patients.value.length === 0) {
    alert('暂无数据可导出')
    return
  }

  // 准备导出数据
  const exportData = patients.value.map(patient => ({
    患者姓名: patient.name || '-',
    性别: patient.gender || '-',
    年龄: patient.age?.toString() || '-',
    电话: patient.phone || '-',
    住址: patient.address || '-',
    患者类别: patient.category || '-',
    治疗方案: patient.treatmentPlan || '-',
    支付状态: patient.paymentStatus || '-'
  }))

  // 转换为CSV格式
  const headers = ['患者姓名', '性别', '年龄', '电话', '住址', '患者类别', '治疗方案', '支付状态']
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => headers.map(header => {
      const value = row[header as keyof typeof row] || ''
      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return `"${value}"`
    }).join(','))
  ].join('\n')

  // 创建Blob并下载
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `患者列表_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  showToastMessage('数据导出成功！')
}

// 获取排序图标
function getSortIcon(field: string) {
  if (sortField.value !== field) {
    return '⇅'
  }
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

// 切换页码
function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchPatients()
  }
}

// 处理每页显示数量变化
function handlePageSizeChange() {
  currentPage.value = 1
  fetchPatients()
}

// 计算可见的页码
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    // 如果总页数少于等于7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总是显示第一页
    pages.push(1)

    if (current <= 4) {
      // 当前页在前4页
      for (let i = 2; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后4页
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// 打开新建对话框
function openCreateDialog() {
  patientForm.value = {
    name: '',
    gender: '',
    age: undefined,
    phone: '',
    address: '',
    category: '普通',
    treatmentPlan: '',
    paymentStatus: '待处理',
    avatar: ''
  }
  avatarPreview.value = ''
  avatarFile.value = null
  editingPatient.value = null
  showCreateDialog.value = true
}

// 关闭对话框
function closeDialog() {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingPatient.value = null
  avatarPreview.value = ''
  avatarFile.value = null
}

// 处理头像选择
function handleAvatarSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]

    // 检查文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB')
      return
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    avatarFile.value = file

    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
      patientForm.value.avatar = e.target?.result as string // 暂时使用base64，后续可以上传到服务器
    }
    reader.readAsDataURL(file)
  }
}

// 删除头像
function removeAvatar() {
  avatarPreview.value = ''
  avatarFile.value = null
  patientForm.value.avatar = ''

  // 重置文件输入
  const fileInput = document.getElementById('avatar-input') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

// 上传头像到服务器（可选，如果需要保存到服务器）
async function uploadAvatarToServer(): Promise<string | null> {
  if (!avatarFile.value) {
    return patientForm.value.avatar || null
  }

  uploadingAvatar.value = true
  try {
    // 将文件转换为base64（简化处理，实际项目中应该上传到服务器）
    // 或者使用FormData上传到服务器
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        resolve(e.target?.result as string)
        uploadingAvatar.value = false
      }
      reader.onerror = () => {
        uploadingAvatar.value = false
        reject(new Error('读取文件失败'))
      }
      reader.readAsDataURL(avatarFile.value!)
    })
  } catch (error) {
    uploadingAvatar.value = false
    console.error('上传头像失败:', error)
    return null
  }
}

// 创建患者
async function createPatient() {
  if (!patientForm.value.name) {
    alert('请输入患者姓名')
    return
  }

  creating.value = true
  try {
    // 上传头像（如果选择了）
    let avatarUrl = patientForm.value.avatar || ''
    if (avatarFile.value) {
      const uploaded = await uploadAvatarToServer()
      if (uploaded) {
        avatarUrl = uploaded
      }
    }

    // 不手动设置id，让MongoDB自动生成_id
    const patientData = {
      ...patientForm.value,
      avatar: avatarUrl
    }

    const response = await post<{
      success: boolean
      message: string
      data: Patient
    }>('/patients', patientData)

    if (response.success) {
      alert('患者创建成功！')
      closeDialog()
      fetchPatients()
    } else {
      alert('创建失败：' + (response.message || '未知错误'))
    }
  } catch (error: unknown) {
    console.error('创建患者失败:', error)
    const errorMessage = error instanceof Error ? error.message : '创建失败，请稍后重试'
    alert('创建失败：' + errorMessage)
  } finally {
    creating.value = false
  }
}

// 编辑患者
function editPatient(patient: Patient) {
  editingPatient.value = patient
  patientForm.value = { ...patient }
  // 如果患者已有头像（base64或URL），显示预览
  if (patient.avatar) {
    avatarPreview.value = patient.avatar
  } else {
    avatarPreview.value = ''
  }
  avatarFile.value = null
  showEditDialog.value = true
}

// 更新患者
async function updatePatient() {
  if (!patientForm.value.name) {
    alert('请输入患者姓名')
    return
  }

  if (!editingPatient.value) return

  creating.value = true
  try {
    // 上传头像（如果选择了新头像）
    let avatarUrl = patientForm.value.avatar || ''
    if (avatarFile.value) {
      const uploaded = await uploadAvatarToServer()
      if (uploaded) {
        avatarUrl = uploaded
      }
    }

    const patientId = editingPatient.value._id || editingPatient.value.id
    if (!patientId) {
      alert('患者ID不存在，无法更新')
      creating.value = false
      return
    }

    const updateData = {
      ...patientForm.value,
      avatar: avatarUrl
    }

    const response = await put<{
      success: boolean
      message: string
      data: Patient
    }>(`/patients/${patientId}`, updateData)

    if (response.success) {
      alert('患者更新成功！')
      closeDialog()
      fetchPatients()
    } else {
      alert('更新失败：' + (response.message || '未知错误'))
    }
  } catch (error: unknown) {
    console.error('更新患者失败:', error)
    const errorMessage = error instanceof Error ? error.message : '更新失败，请稍后重试'
    alert('更新失败：' + errorMessage)
  } finally {
    creating.value = false
  }
}

// 删除患者
async function deletePatient(patient: Patient) {
  // 关闭操作菜单
  activeActionMenu.value = null

  if (!confirm(`确定要删除患者 "${patient.name}" 吗？此操作无法撤销。`)) {
    return
  }

  try {
    const patientId = patient._id || patient.id
    if (!patientId) {
      alert('患者ID不存在，无法删除')
      return
    }

    const response = await del<{ success: boolean; message: string }>(`/patients/${patientId}`)

    if (response.success) {
      alert('删除成功')
      fetchPatients()
    } else {
      alert('删除失败：' + (response.message || '未知错误'))
    }
  } catch (error) {
    console.error('删除患者失败:', error)
    const errorMessage = error instanceof Error ? error.message : '删除失败，请稍后重试'
    alert('删除失败：' + errorMessage)
  }
}

// 切换操作菜单显示
function toggleActionMenu(patientId: string) {
  if (activeActionMenu.value === patientId) {
    activeActionMenu.value = null
  } else {
    activeActionMenu.value = patientId
  }
}

// 获取患者唯一标识
function getPatientId(patient: Patient): string {
  return patient._id || patient.id || ''
}

// 关闭操作菜单
function closeActionMenu() {
  activeActionMenu.value = null
}

// 处理操作菜单项点击
function handleActionMenuClick(patient: Patient, action: string) {
  closeActionMenu()

  if (action === 'detail') {
    // 查看详情
    openPatientDetail(patient)
  } else if (action === 'edit') {
    editPatient(patient)
  } else if (action === 'delete') {
    deletePatient(patient)
  } else if (action === 'call') {
    // 拨打电话功能
    handleCallPatient(patient)
  } else if (action === 'notify') {
    // 语音通知功能
    handleNotifyPatient(patient)
  }
}

// 打开患者详情
function openPatientDetail(patient: Patient) {
  const patientId = patient._id || patient.id
  if (patientId) {
    router.push(`/patients/${patientId}`)
  } else {
    // 如果没有ID，使用对话框方式
    selectedPatient.value = patient
    showDetailDialog.value = true
  }
}

// 关闭患者详情
function closePatientDetail() {
  showDetailDialog.value = false
  selectedPatient.value = null
}

// 处理详情页面的操作
function handleDetailAction(action: string) {
  if (!selectedPatient.value) return

  closePatientDetail()

  if (action === 'edit') {
    editPatient(selectedPatient.value)
  } else if (action === 'call') {
    handleCallPatient(selectedPatient.value)
  }
}

// 获取类别样式类
function getCategoryClass(category: string | undefined): string {
  if (!category) return 'category-normal'
  const categoryMap: Record<string, string> = {
    '普通': 'category-normal',
    '成年人': 'category-adult',
    '老年人': 'category-elderly',
    '儿童': 'category-child',
    'VIP': 'category-vip',
    '急诊': 'category-emergency'
  }
  return categoryMap[category] || 'category-normal'
}

// 处理拨打电话
function handleCallPatient(patient: Patient) {
  if (!patient.phone) {
    alert('该患者未填写电话号码')
    return
  }

  callPatient.value = patient
  showCallDialog.value = true
}

// 处理语音通知
async function handleNotifyPatient(patient: Patient) {
  if (!patient.phone) {
    alert('该患者未填写电话号码，无法发送语音通知')
    return
  }

  notifyPatient.value = patient
  // 重置表单
  notifyForm.value = {
    doctorName: '',
    department: '',
    appointmentTime: '',
    clinicLocation: '',
    requiredDocuments: '身份证和医保卡',
    hospitalName: ''
  }

  // 尝试自动填充预约信息
  try {
    const patientId = patient._id || patient.id || ''
    if (patientId) {
      const res = await getPatientAppointment(patientId)
      if (res?.success && res?.data) {
        const appt = res.data
        notifyForm.value.doctorName = appt.doctorName || ''
        notifyForm.value.department = appt.department || ''
        notifyForm.value.appointmentTime = appt.date ? `${appt.date} ${appt.time || ''}`.trim() : ''
        notifyForm.value.clinicLocation = appt.clinicLocation || ''
      }
    }
  } catch (e) {
    console.log('自动填充预约信息失败，使用手动输入', e)
  }

  showNotifyDialog.value = true
}

// 执行语音通知发送
async function executeVoiceNotify() {
  if (!notifyPatient.value) return

  notifyLoading.value = true
  try {
    const patientId = notifyPatient.value._id || notifyPatient.value.id || ''
    const res = await sendVoiceNotify({
      patientId,
      patientName: notifyPatient.value.name || '',
      phone: notifyPatient.value.phone || '',
      doctorName: notifyForm.value.doctorName,
      department: notifyForm.value.department,
      appointmentTime: notifyForm.value.appointmentTime,
      clinicLocation: notifyForm.value.clinicLocation,
      requiredDocuments: notifyForm.value.requiredDocuments,
      hospitalName: notifyForm.value.hospitalName
    })

    if (res?.success) {
      showNotifyDialog.value = false
      notifyPatient.value = null
      showToastMessage(res.message || '语音通知发送成功！')
    } else {
      alert(res?.message || '发送失败，请重试')
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '发送失败，请稍后重试'
    alert('语音通知发送失败：' + msg)
  } finally {
    notifyLoading.value = false
  }
}

// 关闭语音通知对话框
function closeNotifyDialog() {
  if (notifyLoading.value) return
  showNotifyDialog.value = false
  notifyPatient.value = null
}

// 显示提示消息
function showToastMessage(message: string) {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 执行拨打电话
async function executeCall() {
  if (!callPatient.value || !callPatient.value.phone) {
    return
  }

  const phone = callPatient.value.phone.trim()

  // 检测是否是移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile) {
    // 移动设备：直接使用tel:协议拨打电话
    // 先关闭对话框，然后立即拨打
    showCallDialog.value = false
    const patientName = callPatient.value.name
    callPatient.value = null

    // 使用 setTimeout 确保对话框关闭后再执行拨号
    setTimeout(() => {
      window.location.href = `tel:${phone}`
    }, 300)
  } else {
    // 桌面端：复制电话号码到剪贴板，然后提示
    try {
      await navigator.clipboard.writeText(phone)
      showCallDialog.value = false
      callPatient.value = null
      // 使用提示消息替代alert
      showToastMessage(`电话号码 ${phone} 已复制到剪贴板，您可以使用系统电话应用拨打。`)
    } catch (error) {
      // 如果复制失败，使用降级方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = phone
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (success) {
          showCallDialog.value = false
          callPatient.value = null
          showToastMessage(`电话号码 ${phone} 已复制到剪贴板，您可以使用系统电话应用拨打。`)
        } else {
          alert(`电话号码：${phone}\n\n无法自动复制，请手动复制电话号码。`)
        }
      } catch (err) {
        alert(`电话号码：${phone}\n\n请手动复制电话号码。`)
      }
    }
  }
}

// 关闭拨打电话对话框
function closeCallDialog() {
  showCallDialog.value = false
  callPatient.value = null
}

// 复制电话号码
async function copyPhoneNumber() {
  if (!callPatient.value || !callPatient.value.phone) {
    return
  }

  const phone = callPatient.value.phone.trim()

  try {
    await navigator.clipboard.writeText(phone)
    showToastMessage('电话号码已复制到剪贴板！')
  } catch (error) {
    // 降级方案：使用传统方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = phone
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (success) {
        showToastMessage('电话号码已复制到剪贴板！')
      } else {
        alert(`电话号码：${phone}\n\n请手动复制电话号码。`)
      }
    } catch (e) {
      alert(`电话号码：${phone}\n\n请手动复制电话号码。`)
    }
  }
}

// 处理菜单点击
function handleMenuClick(action: string) {
  showUserMenu.value = false
  if (action === 'logout') {
    router.push('/login')
  }
}

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.messages-wrapper') && !target.closest('.user-menu-wrapper')) {
    showMessages.value = false
    showUserMenu.value = false
  }

  // 关闭操作菜单
  if (!target.closest('.action-menu-wrapper')) {
    closeActionMenu()
  }

  // 关闭筛选菜单
  if (!target.closest('.filter-dropdown') && !target.closest('.filter-btn')) {
    closeFilterMenu()
  }
}


// 计算统计数据
async function calculateStatistics(patientsData: Patient[]) {
  // 获取实际患者总数（从total字段，而不是当前页数据）
  const actualTotal = total.value || patientsData.length

  if (actualTotal > 0) {
    totalPatients.value = actualTotal
    localPatients.value = Math.floor(actualTotal * 0.75)
    nonLocalPatients.value = actualTotal - localPatients.value
    appointmentCount.value = Math.floor(actualTotal * 0.4) // 预约数约为患者数的40%
  } else {
    // 如果没有数据，显示0
    totalPatients.value = 0
    localPatients.value = 0
    nonLocalPatients.value = 0
    appointmentCount.value = 0
  }

  // 计算趋势（实际应该对比历史数据，如果没有数据则为0）
  patientTrend.value = 0
  appointmentTrend.value = 0

  // 计算地区分布 - 使用所有患者数据，而不是当前页数据
  if (actualTotal > 0) {
    // 获取所有患者数据用于统计
    const allPatients = await fetchAllPatientsForStats()
    if (allPatients.length > 0) {
      calculateLocationDistribution(allPatients)
    } else {
      // 如果获取失败，使用当前页数据作为备选
      calculateLocationDistribution(patientsData)
    }
  } else {
    patientLocationData.value = []
  }

  // 更新图表
  nextTick(() => {
    updateCharts()
  })
}

// 初始化图表
function initCharts() {
  if (barChartRef.value && !barChart) {
    barChart = echarts.init(barChartRef.value)
  }
  if (lineChartRef.value && !lineChart) {
    lineChart = echarts.init(lineChartRef.value)
  }

  // 延迟更新图表，确保DOM已完全渲染
  setTimeout(() => {
    updateCharts()
    // 初始化省份图表（在全屏地图打开时）
    initProvinceCharts()
  }, 200)
}

// 监听 patientLocationData 变化，更新省份图表
watch(() => patientLocationData.value, () => {
  // 更新全屏地图中的省份图表
  if (fullscreenType.value === 'map') {
    nextTick(() => {
      updateProvinceCharts()
    })
  }
}, { deep: true })

// 图表配置
const barChartOption = ref({
  grid: {
    left: '10%',
    right: '10%',
    bottom: '15%',
    top: '10%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 12, color: '#666' },
  },
  yAxis: {
    type: 'value',
    max: 200,
    interval: 50,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 12, color: '#666' },
    splitLine: {
      lineStyle: { color: '#f0f0f0' },
      show: true
    },
  },
  series: [
    {
      data: [120, 190, 140, 70, 90, 120, 140],
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: '#4A90E2',
        borderRadius: [4, 4, 0, 0],
      }
    }
  ]
})

const lineChartOption = ref({
  grid: {
    left: '10%',
    right: '10%',
    bottom: '15%',
    top: '10%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross'
    }
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 12, color: '#666' },
  },
  yAxis: {
    type: 'value',
    max: 200,
    interval: 50,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 12, color: '#666' },
    splitLine: {
      lineStyle: { color: '#f0f0f0' },
      show: true
    },
  },
  series: [
    {
      data: [100, 120, 150, 180, 220, 280, 320],
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#67C23A'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: 'rgba(103, 194, 58, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(103, 194, 58, 0.05)'
            }
          ]
        }
      }
    }
  ]
})

// 获取排序后的省份数据（前10名）
const topProvinceData = computed(() => {
  return [...patientLocationData.value]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

// 2D柱状图配置
const provinceBar2DOption = computed(() => {
  const isTechMode = fullscreenType.value === 'map'
  return {
    backgroundColor: isTechMode ? 'transparent' : undefined,
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: isTechMode ? 'rgba(0, 0, 0, 0.9)' : undefined,
      borderColor: isTechMode ? '#00ff00' : undefined,
      textStyle: { color: isTechMode ? '#00ff00' : undefined },
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}: ${data.value}名患者`
      }
    },
    xAxis: {
      type: 'category',
      data: topProvinceData.value.map(item => item.name),
      axisLine: {
        show: isTechMode,
        lineStyle: { color: isTechMode ? '#00ff00' : undefined }
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: isTechMode,
        lineStyle: { color: isTechMode ? '#00ff00' : undefined }
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666'
      },
      splitLine: {
        lineStyle: {
          color: isTechMode ? 'rgba(0, 255, 0, 0.2)' : '#f0f0f0'
        }
      }
    },
    series: [{
      data: topProvinceData.value.map(item => item.value),
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: isTechMode
          ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00ff00' },
              { offset: 1, color: '#003300' }
            ])
          : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ]),
        borderRadius: [4, 4, 0, 0],
        shadowBlur: isTechMode ? 10 : 0,
        shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.5)' : undefined
      },
      emphasis: {
        itemStyle: {
          color: isTechMode
            ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#66ff00' },
                { offset: 1, color: '#00ff00' }
              ])
            : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#764ba2' },
                { offset: 1, color: '#667eea' }
              ]),
          shadowBlur: isTechMode ? 20 : 0,
          shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.8)' : undefined
        }
      }
    }]
  }
})

// 3D柱状图配置（使用阴影和渐变模拟3D效果）
const provinceBar3DOption = computed(() => {
  const isTechMode = fullscreenType.value === 'map'
  const techColors = ['#00ff00', '#00aaff', '#ffa500', '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#66ff00', '#ff0066', '#0066ff']
  const techDarkColors = ['#003300', '#003366', '#663300', '#666600', '#660066', '#006666', '#663300', '#336600', '#660033', '#000066']
  return {
    backgroundColor: isTechMode ? 'transparent' : undefined,
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: isTechMode ? 'rgba(0, 0, 0, 0.9)' : undefined,
      borderColor: isTechMode ? '#00ff00' : undefined,
      textStyle: { color: isTechMode ? '#00ff00' : undefined },
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}: ${data.value}名患者`
      }
    },
    xAxis: {
      type: 'category',
      data: topProvinceData.value.map(item => item.name),
      axisLine: {
        show: isTechMode,
        lineStyle: { color: isTechMode ? '#00ff00' : undefined }
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: isTechMode,
        lineStyle: { color: isTechMode ? '#00ff00' : undefined }
      },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666'
      },
      splitLine: {
        lineStyle: {
          color: isTechMode ? 'rgba(0, 255, 0, 0.2)' : '#f0f0f0'
        }
      }
    },
    series: [{
      data: topProvinceData.value.map(item => item.value),
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: (params: any) => {
          if (isTechMode) {
            const color = techColors[params.dataIndex % techColors.length] || '#00ff00'
            const darkColor = techDarkColors[params.dataIndex % techDarkColors.length] || '#00cc00'
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color },
              { offset: 0.5, color: darkColor },
              { offset: 1, color: darkColor }
            ])
          } else {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#6C5CE7']
            const darkColors = ['#CC5555', '#3EA8A0', '#3595A5', '#CC8060', '#78B09C', '#C5B056', '#9572A4', '#6A9BB6', '#C5932D', '#5549B9']
            const color = colors[params.dataIndex % colors.length] || '#FF6B6B'
            const darkColor = darkColors[params.dataIndex % darkColors.length] || '#CC5555'
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color },
              { offset: 0.5, color: darkColor },
              { offset: 1, color: darkColor }
            ])
          }
        },
        borderRadius: [4, 4, 0, 0],
        shadowBlur: isTechMode ? 15 : 10,
        shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
        shadowOffsetY: 5
      },
      emphasis: {
        itemStyle: {
          shadowBlur: isTechMode ? 30 : 20,
          shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 0, 0, 0.5)',
          shadowOffsetY: 8
        }
      }
    }]
  }
})

// 2D饼图配置
const provincePie2DOption = computed(() => {
  const isTechMode = fullscreenType.value === 'map'
  const techColors = ['#00ff00', '#00aaff', '#ffa500', '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#66ff00', '#ff0066', '#0066ff']
  return {
    backgroundColor: isTechMode ? 'transparent' : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: isTechMode ? 'rgba(0, 0, 0, 0.9)' : undefined,
      borderColor: isTechMode ? '#00ff00' : undefined,
      textStyle: { color: isTechMode ? '#00ff00' : undefined },
      formatter: '{a} <br/>{b}: {c}名 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666'
      }
    },
    series: [{
      name: '患者分布',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: isTechMode ? '#00ff00' : '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}名\n({d}%)',
        fontSize: 12,
        color: isTechMode ? '#00ff00' : undefined
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: isTechMode ? '#ffa500' : undefined
        },
        itemStyle: {
          shadowBlur: isTechMode ? 20 : 10,
          shadowOffsetX: 0,
          shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)'
        }
      },
      data: topProvinceData.value.map((item, index) => ({
        value: item.value,
        name: item.name,
        itemStyle: isTechMode ? {
          color: techColors[index % techColors.length]
        } : undefined
      }))
    }]
  }
})

// 3D饼图配置（使用视觉映射和阴影模拟3D效果）
const provincePie3DOption = computed(() => {
  const isTechMode = fullscreenType.value === 'map'
  const techColors = ['#00ff00', '#00aaff', '#ffa500', '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#66ff00', '#ff0066', '#0066ff']
  const techDarkColors = ['#003300', '#003366', '#663300', '#666600', '#660066', '#006666', '#663300', '#336600', '#660033', '#000066']
  return {
    backgroundColor: isTechMode ? 'transparent' : undefined,
    tooltip: {
      trigger: 'item',
      backgroundColor: isTechMode ? 'rgba(0, 0, 0, 0.9)' : undefined,
      borderColor: isTechMode ? '#00ff00' : undefined,
      textStyle: { color: isTechMode ? '#00ff00' : undefined },
      formatter: '{a} <br/>{b}: {c}名 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        fontSize: 12,
        color: isTechMode ? '#00ff00' : '#666'
      }
    },
    series: [{
      name: '患者分布',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['60%', '50%'],
      roseType: 'area',
      itemStyle: {
        borderRadius: 8,
        borderColor: isTechMode ? '#00ff00' : '#fff',
        borderWidth: 2,
        shadowBlur: isTechMode ? 20 : 15,
        shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
        shadowOffsetY: 5
      },
      label: {
        show: true,
        formatter: '{b}: {c}名\n({d}%)',
        fontSize: 12,
        color: isTechMode ? '#00ff00' : undefined
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: isTechMode ? '#ffa500' : undefined
        },
        itemStyle: {
          shadowBlur: isTechMode ? 35 : 25,
          shadowOffsetX: 0,
          shadowOffsetY: 10,
          shadowColor: isTechMode ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 0, 0, 0.6)'
        }
      },
      data: topProvinceData.value.map((item, index) => {
        if (isTechMode) {
          return {
            value: item.value,
            name: item.name,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: techColors[index % techColors.length] || '#00ff00' },
                { offset: 1, color: techDarkColors[index % techDarkColors.length] || '#00cc00' }
              ])
            }
          }
        } else {
          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#6C5CE7']
          const darkColors = ['#CC5555', '#3EA8A0', '#3595A5', '#CC8060', '#78B09C', '#C5B056', '#9572A4', '#6A9BB6', '#C5932D', '#5549B9']
          return {
            value: item.value,
            name: item.name,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors[index % colors.length] || '#FF6B6B' },
                { offset: 1, color: darkColors[index % darkColors.length] || '#CC5555' }
              ])
            }
          }
        }
      })
    }]
  }
})

// 初始化省份图表
function initProvinceCharts() {
  // 2D柱状图
  if (provinceBar2DRef.value && !provinceBar2DChart) {
    provinceBar2DChart = echarts.init(provinceBar2DRef.value)
    provinceBar2DChart.setOption(provinceBar2DOption.value)
  }

  // 3D柱状图
  if (provinceBar3DRef.value && !provinceBar3DChart) {
    provinceBar3DChart = echarts.init(provinceBar3DRef.value)
    provinceBar3DChart.setOption(provinceBar3DOption.value)
  }

  // 2D饼图
  if (provincePie2DRef.value && !provincePie2DChart) {
    provincePie2DChart = echarts.init(provincePie2DRef.value)
    provincePie2DChart.setOption(provincePie2DOption.value)
  }

  // 3D饼图
  if (provincePie3DRef.value && !provincePie3DChart) {
    provincePie3DChart = echarts.init(provincePie3DRef.value)
    provincePie3DChart.setOption(provincePie3DOption.value)
  }
}

// 更新省份图表
function updateProvinceCharts() {
  if (provinceBar2DChart) {
    provinceBar2DChart.setOption(provinceBar2DOption.value)
    provinceBar2DChart.resize()
  }
  if (provinceBar3DChart) {
    provinceBar3DChart.setOption(provinceBar3DOption.value)
    provinceBar3DChart.resize()
  }
  if (provincePie2DChart) {
    provincePie2DChart.setOption(provincePie2DOption.value)
    provincePie2DChart.resize()
  }
  if (provincePie3DChart) {
    provincePie3DChart.setOption(provincePie3DOption.value)
    provincePie3DChart.resize()
  }
}

// 切换视图模式
function toggleViewMode() {
  viewMode.value = viewMode.value === '2d' ? '3d' : '2d'
  nextTick(() => {
    updateProvinceCharts()
  })
}

// 更新图表
function updateCharts() {
  // 更新柱状图配置（用于数据大屏）
  if (barChartOption.value && barChartOption.value.series && barChartOption.value.series[0]) {
    const patientData = patientTrend.value > 0
      ? [120, 140, 160, 180, 200, 220, 240]
      : [240, 220, 200, 180, 160, 140, 120]
    barChartOption.value.series[0].data = patientData
  }

  // 更新折线图配置（用于数据大屏）
  if (lineChartOption.value && lineChartOption.value.series && lineChartOption.value.series[0]) {
    const appointmentData = appointmentTrend.value > 0
      ? [100, 120, 150, 180, 220, 280, 320]
      : [320, 280, 220, 180, 150, 120, 100]
    lineChartOption.value.series[0].data = appointmentData
  }

  // 保留原有的图表更新逻辑（如果还在使用）
  if (barChart && barChartRef.value) {
    const option = {
      grid: {
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        max: 300,
        show: false,
      },
      series: [{
        data: [180, 200, 220, 210, 230, 200, 221],
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
          color: '#94a3b8',
          borderRadius: [2, 2, 0, 0],
        },
      }],
    }
    barChart.setOption(option)
  }

  // 更新折线图（预约趋势）
  if (lineChart && lineChartRef.value) {
    const option = {
      grid: {
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        min: 100,
        max: 200,
        show: false,
      },
      series: [{
        data: [120, 130, 140, 145, 150, 155, 160],
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#4CAF50', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(76, 175, 80, 0.3)' },
              { offset: 1, color: 'rgba(76, 175, 80, 0)' },
            ],
          },
        },
      }],
    }
    lineChart.setOption(option)
  }
}

// 格式化手机号
function formatPhone(phone?: string) {
  if (!phone) return ''
  if (phone.length >= 10) {
    return phone.substring(0, 3) + '****' + phone.substring(7)
  }
  return phone
}

// 获取患者头像
function getPatientAvatar(patient: Patient, index: number) {
  if (patient.avatar && patient.avatar.startsWith('data:')) {
    // 如果是base64图片，返回img标签（在模板中处理）
    return patient.avatar
  }
  // 根据性别和索引生成默认头像
  const avatars = ['👤', '👨', '👩', '🧑', '🧓', '👶']
  return avatars[index % avatars.length]
}

// 格式化地址（脱敏）
// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatAddress(address?: string) {
  if (!address) return '-'
  // 简化处理，实际应该根据真实地址格式处理
  if (address.length > 10) {
    return address.substring(0, 2) + '市,' + '*****街道' + address.substring(address.length - 6)
  }
  return address
}

// 获取支付状态颜色
function getPaymentStatusColor(status?: string) {
  const statusMap: Record<string, string> = {
    '已支付': '#4CAF50',
    '未支付': '#FF5722',
    '部分支付': '#FF9800',
    '待处理': '#FF5722'
  }
  return statusMap[status || ''] || '#9E9E9E'
}

// 获取支付状态圆点
function getPaymentStatusDot(status?: string) {
  const color = getPaymentStatusColor(status)
  return `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color}; margin-right: 4px;"></span>`
}

// 处理窗口大小变化
function handleResize() {
  // 使用setTimeout避免在主流程中调用resize
  setTimeout(() => {
    if (barChart) barChart.resize()
    if (lineChart) lineChart.resize()
    // 全屏模式下的图表也需要调整大小
    if (provinceBar2DChart) provinceBar2DChart.resize()
    if (provinceBar3DChart) provinceBar3DChart.resize()
    if (provincePie2DChart) provincePie2DChart.resize()
    if (provincePie3DChart) provincePie3DChart.resize()
  }, 100)
}

// 获取所有患者数据用于统计（不分页）
async function fetchAllPatientsForStats() {
  try {
    // 获取所有患者数据，使用一个很大的pageSize
    const response = await get<{
      success: boolean
      data: Patient[]
      count: number
    }>('/patients', {
      data: {
        page: 1,
        pageSize: 10000 // 获取足够多的数据
      }
    })

    if (response.success && response.data) {
      return response.data
    }
    return []
  } catch (error) {
    console.error('获取所有患者数据失败:', error)
    return []
  }
}

// 根据患者地址统计地区分布
function calculateLocationDistribution(patientsData: Patient[]) {
  // 中国省份映射（扩展更多城市名称以提高匹配准确度）
  // 注意：顺序很重要，先匹配完整的省份名，再匹配城市名
  const provinceMap: Record<string, string> = {
    // 直辖市
    '北京市': '北京', '北京': '北京',
    '上海市': '上海', '上海': '上海',
    '天津市': '天津', '天津': '天津',
    '重庆市': '重庆', '重庆': '重庆',

    // 省份 - 按完整名称优先
    '广东省': '广东', '广东': '广东', '广州': '广东', '深圳': '广东', '珠海': '广东', '佛山': '广东', '东莞': '广东', '中山': '广东', '惠州': '广东', '江门': '广东', '肇庆': '广东', '汕头': '广东', '潮州': '广东', '揭阳': '广东', '汕尾': '广东', '湛江': '广东', '茂名': '广东', '阳江': '广东', '韶关': '广东', '清远': '广东', '云浮': '广东', '梅州': '广东', '河源': '广东',
    '浙江省': '浙江', '浙江': '浙江', '杭州': '浙江', '宁波': '浙江', '温州': '浙江', '嘉兴': '浙江', '湖州': '浙江', '绍兴': '浙江', '金华': '浙江', '衢州': '浙江', '舟山': '浙江', '台州': '浙江', '丽水': '浙江',
    '江苏省': '江苏', '江苏': '江苏', '南京': '江苏', '苏州': '江苏', '无锡': '江苏', '常州': '江苏', '镇江': '江苏', '扬州': '江苏', '泰州': '江苏', '南通': '江苏', '盐城': '江苏', '淮安': '江苏', '宿迁': '江苏', '连云港': '江苏', '徐州': '江苏',
    '山东省': '山东', '山东': '山东', '济南': '山东', '青岛': '山东', '淄博': '山东', '枣庄': '山东', '东营': '山东', '烟台': '山东', '潍坊': '山东', '济宁': '山东', '泰安': '山东', '威海': '山东', '日照': '山东', '临沂': '山东', '德州': '山东', '聊城': '山东', '滨州': '山东', '菏泽': '山东',
    '河南省': '河南', '河南': '河南', '郑州': '河南', '开封': '河南', '洛阳': '河南', '平顶山': '河南', '安阳': '河南', '鹤壁': '河南', '新乡': '河南', '焦作': '河南', '濮阳': '河南', '许昌': '河南', '漯河': '河南', '三门峡': '河南', '南阳': '河南', '商丘': '河南', '信阳': '河南', '周口': '河南', '驻马店': '河南', '济源': '河南',
    '四川省': '四川', '四川': '四川', '成都': '四川', '自贡': '四川', '攀枝花': '四川', '泸州': '四川', '德阳': '四川', '绵阳': '四川', '广元': '四川', '遂宁': '四川', '内江': '四川', '乐山': '四川', '南充': '四川', '眉山': '四川', '宜宾': '四川', '广安': '四川', '达州': '四川', '雅安': '四川', '巴中': '四川', '资阳': '四川',
    '湖北省': '湖北', '湖北': '湖北', '武汉': '湖北', '黄石': '湖北', '十堰': '湖北', '宜昌': '湖北', '襄阳': '湖北', '鄂州': '湖北', '荆门': '湖北', '孝感': '湖北', '荆州': '湖北', '黄冈': '湖北', '咸宁': '湖北', '随州': '湖北',
    '湖南省': '湖南', '湖南': '湖南', '长沙': '湖南', '株洲': '湖南', '湘潭': '湖南', '衡阳': '湖南', '邵阳': '湖南', '岳阳': '湖南', '常德': '湖南', '张家界': '湖南', '益阳': '湖南', '郴州': '湖南', '永州': '湖南', '怀化': '湖南', '娄底': '湖南',
    '安徽省': '安徽', '安徽': '安徽', '合肥': '安徽', '芜湖': '安徽', '蚌埠': '安徽', '淮南': '安徽', '马鞍山': '安徽', '淮北': '安徽', '铜陵': '安徽', '安庆': '安徽', '黄山': '安徽', '滁州': '安徽', '阜阳': '安徽', '宿州': '安徽', '六安': '安徽', '亳州': '安徽', '池州': '安徽', '宣城': '安徽',
    '河北省': '河北', '河北': '河北', '石家庄': '河北', '唐山': '河北', '秦皇岛': '河北', '邯郸': '河北', '邢台': '河北', '保定': '河北', '张家口': '河北', '承德': '河北', '沧州': '河北', '廊坊': '河北', '衡水': '河北',
    '福建省': '福建', '福建': '福建', '福州': '福建', '厦门': '福建', '莆田': '福建', '三明': '福建', '泉州': '福建', '漳州': '福建', '南平': '福建', '龙岩': '福建', '宁德': '福建',
    '江西省': '江西', '江西': '江西', '南昌': '江西', '景德镇': '江西', '萍乡': '江西', '九江': '江西', '新余': '江西', '鹰潭': '江西', '赣州': '江西', '吉安': '江西', '宜春': '江西', '抚州': '江西', '上饶': '江西',
    '辽宁省': '辽宁', '辽宁': '辽宁', '沈阳': '辽宁', '大连': '辽宁', '鞍山': '辽宁', '抚顺': '辽宁', '本溪': '辽宁', '丹东': '辽宁', '锦州': '辽宁', '营口': '辽宁', '阜新': '辽宁', '辽阳': '辽宁', '盘锦': '辽宁', '铁岭': '辽宁', '朝阳': '辽宁', '葫芦岛': '辽宁',
    '陕西省': '陕西', '陕西': '陕西', '西安': '陕西', '铜川': '陕西', '宝鸡': '陕西', '咸阳': '陕西', '渭南': '陕西', '延安': '陕西', '汉中': '陕西', '榆林': '陕西', '安康': '陕西', '商洛': '陕西',
    '云南省': '云南', '云南': '云南', '昆明': '云南', '曲靖': '云南', '玉溪': '云南', '保山': '云南', '昭通': '云南', '丽江': '云南', '普洱': '云南', '临沧': '云南',
    '贵州省': '贵州', '贵州': '贵州', '贵阳': '贵州', '六盘水': '贵州', '遵义': '贵州', '安顺': '贵州', '毕节': '贵州', '铜仁': '贵州',
    '广西壮族自治区': '广西', '广西': '广西', '南宁': '广西', '柳州': '广西', '桂林': '广西', '梧州': '广西', '北海': '广西', '防城港': '广西', '钦州': '广西', '贵港': '广西', '玉林': '广西', '百色': '广西', '贺州': '广西', '河池': '广西', '来宾': '广西', '崇左': '广西',
    '山西省': '山西', '山西': '山西', '太原': '山西', '大同': '山西', '阳泉': '山西', '长治': '山西', '晋城': '山西', '朔州': '山西', '晋中': '山西', '运城': '山西', '忻州': '山西', '临汾': '山西', '吕梁': '山西',
    '吉林省': '吉林', '吉林': '吉林', '长春': '吉林', '吉林市': '吉林', '四平': '吉林', '辽源': '吉林', '通化': '吉林', '白山': '吉林', '松原': '吉林', '白城': '吉林',
    '黑龙江省': '黑龙江', '黑龙江': '黑龙江', '哈尔滨': '黑龙江', '齐齐哈尔': '黑龙江', '鸡西': '黑龙江', '鹤岗': '黑龙江', '双鸭山': '黑龙江', '大庆': '黑龙江', '伊春': '黑龙江', '佳木斯': '黑龙江', '七台河': '黑龙江', '牡丹江': '黑龙江', '黑河': '黑龙江', '绥化': '黑龙江',
    '内蒙古自治区': '内蒙古', '内蒙古': '内蒙古', '呼和浩特': '内蒙古', '包头': '内蒙古', '乌海': '内蒙古', '赤峰': '内蒙古', '通辽': '内蒙古', '鄂尔多斯': '内蒙古', '呼伦贝尔': '内蒙古', '巴彦淖尔': '内蒙古', '乌兰察布': '内蒙古',
    '新疆维吾尔自治区': '新疆', '新疆': '新疆', '乌鲁木齐': '新疆', '克拉玛依': '新疆', '吐鲁番': '新疆', '哈密': '新疆', '昌吉': '新疆', '博尔塔拉': '新疆', '巴音郭楞': '新疆', '阿克苏': '新疆', '克孜勒苏': '新疆', '喀什': '新疆', '和田': '新疆', '伊犁': '新疆', '塔城': '新疆', '阿勒泰': '新疆',
    '甘肃省': '甘肃', '甘肃': '甘肃', '兰州': '甘肃', '嘉峪关': '甘肃', '金昌': '甘肃', '白银': '甘肃', '天水': '甘肃', '武威': '甘肃', '张掖': '甘肃', '平凉': '甘肃', '酒泉': '甘肃', '庆阳': '甘肃', '定西': '甘肃', '陇南': '甘肃',
    '宁夏回族自治区': '宁夏', '宁夏': '宁夏', '银川': '宁夏', '石嘴山': '宁夏', '吴忠': '宁夏', '固原': '宁夏', '中卫': '宁夏',
    '青海省': '青海', '青海': '青海', '西宁': '青海', '海东': '青海',
    '西藏自治区': '西藏', '西藏': '西藏', '拉萨': '西藏', '昌都': '西藏', '山南': '西藏', '日喀则': '西藏', '那曲': '西藏', '阿里': '西藏', '林芝': '西藏',
    '海南省': '海南', '海南': '海南', '海口': '海南', '三亚': '海南', '三沙': '海南', '儋州': '海南',
    '台湾省': '台湾', '台湾': '台湾',
    '香港特别行政区': '香港', '香港': '香港',
    '澳门特别行政区': '澳门', '澳门': '澳门'
  }

  // 统计各省份患者数量
  const provinceCount: Record<string, number> = {}

  patientsData.forEach(patient => {
    if (!patient.address) return

    const address = patient.address.trim()
    let matchedProvince = ''

    // 优先匹配完整的省份名称（带"省"、"市"、"自治区"等）
    // 按长度排序，优先匹配更长的关键词
    const sortedKeys = Object.keys(provinceMap).sort((a, b) => b.length - a.length)

    for (const key of sortedKeys) {
      if (address.includes(key)) {
        matchedProvince = provinceMap[key] || ''
        break
      }
    }

    // 如果匹配到了省份，统计
    if (matchedProvince) {
      provinceCount[matchedProvince] = (provinceCount[matchedProvince] || 0) + 1
    }
    // 如果没有匹配到，跳过该患者（不统计），避免数据不准确
  })

  // 转换为echarts需要的格式
  patientLocationData.value = Object.entries(provinceCount).map(([name, value]) => ({
    name,
    value
  }))

  // 如果没有数据，生成示例数据
  if (patientLocationData.value.length === 0) {
    const exampleProvinces = [
      { name: '北京', value: 150 },
      { name: '上海', value: 120 },
      { name: '广东', value: 110 },
      { name: '浙江', value: 105 },
      { name: '江苏', value: 102 },
      { name: '山东', value: 101 },
      { name: '四川', value: 100 },
      { name: '河南', value: 95 },
      { name: '湖北', value: 90 },
      { name: '湖南', value: 85 },
      { name: '安徽', value: 80 },
      { name: '河北', value: 75 },
      { name: '福建', value: 70 },
      { name: '江西', value: 65 },
      { name: '辽宁', value: 60 },
      { name: '重庆', value: 55 },
      { name: '陕西', value: 50 },
      { name: '云南', value: 45 },
      { name: '贵州', value: 40 },
      { name: '广西', value: 35 },
      { name: '山西', value: 30 },
      { name: '吉林', value: 25 },
      { name: '黑龙江', value: 20 },
      { name: '内蒙古', value: 18 },
      { name: '新疆', value: 15 },
      { name: '甘肃', value: 12 },
      { name: '宁夏', value: 10 },
      { name: '青海', value: 8 },
      { name: '西藏', value: 5 },
      { name: '海南', value: 15 },
      { name: '天津', value: 20 },
      { name: '台湾', value: 10 },
      { name: '香港', value: 8 },
      { name: '澳门', value: 3 }
    ]
    patientLocationData.value = exampleProvinces
  }
}


// 处理ESC键关闭全屏
function handleEscKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreenType.value) {
    closeFullscreen()
  }
}

onMounted(async () => {
  // 初始化主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }

  // 检查是否有编辑参数（从详情页跳转过来）
  if (route.query.edit) {
    const editId = route.query.edit as string
    const patientData = route.query.patient as string

    // 如果有患者数据，直接使用
    if (patientData) {
      try {
        const patient = JSON.parse(patientData)
        editPatient(patient)
      } catch (e) {
        console.error('解析患者数据失败:', e)
      }
    } else {
      // 否则从列表中查找
      await fetchPatients()
      const foundPatient = patients.value.find((p: Patient) =>
        (p._id && p._id === editId) || (p.id && p.id === editId)
      )
      if (foundPatient) {
        editPatient(foundPatient)
      }
    }

    // 清除query参数
    router.replace({ path: '/patients', query: {} })
  } else {
    // 正常加载患者列表
    fetchPatients()
  }

  // 添加点击外部关闭菜单的监听
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleEscKey)

  // 首先初始化地图数据（确保地图始终显示）
  if (patientLocationData.value.length === 0) {
    const exampleStates = [
      { name: 'California', value: 150 },
      { name: 'Texas', value: 120 },
      { name: 'Florida', value: 110 },
      { name: 'New York', value: 105 },
      { name: 'Pennsylvania', value: 102 },
      { name: 'Illinois', value: 101 },
      { name: 'Ohio', value: 100 },
      { name: 'Georgia', value: 105 },
      { name: 'North Carolina', value: 103 },
      { name: 'Michigan', value: 100 },
      { name: 'New Jersey', value: 100 },
      { name: 'Virginia', value: 100 },
      { name: 'Washington', value: 100 },
      { name: 'Arizona', value: 100 },
      { name: 'Massachusetts', value: 100 },
      { name: 'Tennessee', value: 100 },
      { name: 'Indiana', value: 100 },
      { name: 'Missouri', value: 100 },
      { name: 'Maryland', value: 100 },
      { name: 'Minnesota', value: 100 },
      { name: 'South Carolina', value: 100 },
      { name: 'Alabama', value: 100 },
      { name: 'Louisiana', value: 100 },
      { name: 'Kentucky', value: 100 },
      { name: 'Oregon', value: 100 },
      { name: 'Oklahoma', value: 100 },
      { name: 'Connecticut', value: 100 },
      { name: 'Iowa', value: 100 },
      { name: 'Arkansas', value: 100 },
      { name: 'Mississippi', value: 100 },
      { name: 'Kansas', value: 100 },
      { name: 'Utah', value: 100 },
      { name: 'Nevada', value: 15 },
      { name: 'Colorado', value: 75 },
      { name: 'Wyoming', value: 80 },
      { name: 'Wisconsin', value: 70 },
      { name: 'New Mexico', value: 60 },
      { name: 'Nebraska', value: 55 },
      { name: 'West Virginia', value: 65 },
      { name: 'Idaho', value: 58 },
      { name: 'Maine', value: 100 },
      { name: 'New Hampshire', value: 100 },
      { name: 'Rhode Island', value: 100 },
      { name: 'Delaware', value: 100 },
      { name: 'South Dakota', value: 100 },
      { name: 'North Dakota', value: 100 },
      { name: 'Vermont', value: 100 },
      { name: 'Montana', value: 100 }
    ]
    patientLocationData.value = exampleStates
  }

  // 先尝试获取数据
  await fetchPatients()

  // 如果没有数据，添加示例数据
  if (patients.value.length === 0) {
    console.log('📝 未找到患者数据，添加示例数据...')
    await addExamplePatients()
  } else {
    // 如果有真实数据，重新计算地区分布
    calculateLocationDistribution(patients.value)
  }

  // 计算统计数据
  calculateStatistics(patients.value)

  // 初始化图表
  await nextTick()
  initCharts()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleEscKey)
  // 恢复body滚动
  document.body.style.overflow = ''
  if (barChart) {
    barChart.dispose()
    barChart = null
  }
  if (lineChart) {
    lineChart.dispose()
    lineChart = null
  }
})

// 添加示例患者数据
async function addExamplePatients() {
  // 使用美国州名作为地址，以便地图功能能正确识别
  const examplePatients: Partial<Patient>[] = [
    {
      name: 'John Smith',
      gender: '男',
      age: 65,
      phone: '02923065401',
      address: 'California, Los Angeles, Main Street 1234',
      category: '老年人',
      treatmentPlan: '门诊',
      paymentStatus: '待处理'
    },
    {
      name: 'Mary Johnson',
      gender: '女',
      age: 35,
      phone: '02923065402',
      address: 'Texas, Houston, Broadway Street 5678',
      category: '成年人',
      treatmentPlan: '住院',
      paymentStatus: '已支付'
    },
    {
      name: 'Robert Williams',
      gender: '男',
      age: 28,
      phone: '02923065403',
      address: 'Florida, Miami, Ocean Drive 9012',
      category: '成年人',
      treatmentPlan: '急诊',
      paymentStatus: '部分支付'
    },
    {
      name: 'Patricia Brown',
      gender: '女',
      age: 72,
      phone: '02923065404',
      address: 'New York, Manhattan, Central Park West 3456',
      category: '老年人',
      treatmentPlan: '手术',
      paymentStatus: '待处理'
    },
    {
      name: 'James Davis',
      gender: '男',
      age: 8,
      phone: '02923065405',
      address: 'Pennsylvania, Philadelphia, Market Street 7890',
      category: '儿童',
      treatmentPlan: '重症监护',
      paymentStatus: '已支付'
    }
  ]

  // 批量创建示例患者（添加延迟避免ID冲突）
  let successCount = 0
  for (let i = 0; i < examplePatients.length; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200 * i)) // 延迟200ms * i

      // 不手动设置id，让MongoDB自动生成_id
      const patientData = {
        ...examplePatients[i]
      }

      const response = await post<{
        success: boolean
        message: string
        data: Patient
      }>('/patients', patientData)

      if (response.success) {
        successCount++
        console.log(`✅ 创建患者成功: ${patientData.name}`)
      }
    } catch (error) {
      const patientName = examplePatients[i]?.name || '未知患者'
      console.error(`❌ 创建示例患者失败 (${patientName}):`, error)
      // 继续尝试创建下一个患者
    }
  }

  console.log(`📊 成功创建 ${successCount}/${examplePatients.length} 个示例患者`)

  // 重新获取数据
  if (successCount > 0) {
    await fetchPatients()
  }
}

// 添加14条真实的患者数据
async function add14Patients() {
  const patients: any[] = [
    { name: '张明', gender: '男', age: 32, phone: '13800138001', idCard: '110101199001011234', relation: '本人', address: '北京市朝阳区建国路88号', category: '成年人', treatmentPlan: '门诊', paymentStatus: '已支付' },
    { name: '李芳', gender: '女', age: 28, phone: '13800138002', idCard: '110101199205152345', relation: '配偶', address: '北京市海淀区中关村大街1号', category: '成年人', treatmentPlan: '住院', paymentStatus: '已支付' },
    { name: '王强', gender: '男', age: 65, phone: '13800138003', idCard: '110101195807203456', relation: '父亲', address: '北京市西城区西单北大街120号', category: '老年人', treatmentPlan: '门诊', paymentStatus: '待处理' },
    { name: '赵丽', gender: '女', age: 62, phone: '13800138004', idCard: '110101196102254567', relation: '母亲', address: '北京市东城区王府井大街255号', category: '老年人', treatmentPlan: '手术', paymentStatus: '部分支付' },
    { name: '刘小华', gender: '男', age: 8, phone: '13800138005', idCard: '110101201512156789', relation: '儿子', address: '北京市丰台区丰台路18号', category: '儿童', treatmentPlan: '门诊', paymentStatus: '已支付' },
    { name: '陈静', gender: '女', age: 35, phone: '13800138006', idCard: '110101198805208901', relation: '本人', address: '上海市浦东新区陆家嘴环路1000号', category: '成年人', treatmentPlan: '急诊', paymentStatus: '已支付' },
    { name: '杨波', gender: '男', age: 41, phone: '13800138007', idCard: '110101198207123012', relation: '本人', address: '上海市黄浦区南京东路20号', category: '成年人', treatmentPlan: '门诊', paymentStatus: '待处理' },
    { name: '周娟', gender: '女', age: 29, phone: '13800138008', idCard: '110101199311074523', relation: '本人', address: '广州市天河区天河路123号', category: '成年人', treatmentPlan: '住院', paymentStatus: '已支付' },
    { name: '吴建国', gender: '男', age: 58, phone: '13800138009', idCard: '110101196403185634', relation: '父亲', address: '深圳市南山区深南大道9678号', category: '老年人', treatmentPlan: '重症监护', paymentStatus: '部分支付' },
    { name: '徐秀英', gender: '女', age: 55, phone: '13800138010', idCard: '110101196811227845', relation: '母亲', address: '杭州市西湖区文三路259号', category: '成年人', treatmentPlan: '门诊', paymentStatus: '已支付' },
    { name: '孙小美', gender: '女', age: 12, phone: '13800138011', idCard: '110101201104039056', relation: '女儿', address: '成都市锦江区春熙路98号', category: '儿童', treatmentPlan: '急诊', paymentStatus: '已支付' },
    { name: '马军', gender: '男', age: 45, phone: '13800138012', idCard: '110101197708161267', relation: '本人', address: '武汉市洪山区珞喻路461号', category: '成年人', treatmentPlan: '手术', paymentStatus: '待处理' },
    { name: '朱丽', gender: '女', age: 38, phone: '13800138013', idCard: '110101198503224578', relation: '本人', address: '西安市雁塔区小寨东路126号', category: '成年人', treatmentPlan: '门诊', paymentStatus: '已支付' },
    { name: '胡强', gender: '男', age: 26, phone: '13800138014', idCard: '110101199708038901', relation: '本人', address: '南京市鼓楼区中山路321号', category: '成年人', treatmentPlan: '住院', paymentStatus: '部分支付' }
  ]

  let successCount = 0
  for (let i = 0; i < patients.length; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200 * i)) // 延迟200ms * i

      const patientData = {
        ...patients[i]
      }

      const response = await post<{
        success: boolean
        message: string
        data: Patient
      }>('/patients', patientData)

      if (response.success) {
        successCount++
        console.log(`✅ 创建患者成功: ${patientData.name}`)
      }
    } catch (error) {
      const patientName = patients[i]?.name || '未知患者'
      console.error(`❌ 创建患者失败 (${patientName}):`, error)
    }
  }

  console.log(`📊 成功创建 ${successCount}/${patients.length} 个患者`)

  // 重新获取数据
  if (successCount > 0) {
    await fetchPatients()
    alert(`成功添加 ${successCount} 条数据`)
  } else {
    alert('添加失败，请查看控制台')
  }
}

// 触发文件选择
function triggerImport() {
  fileInputRef.value?.click()
}

// 触发大文件上传
function triggerLargeFileUpload() {
  largeFileInputRef.value?.click()
}

// 计算文件哈希值（用于断点续传）
async function calculateFileHash(file: File): Promise<string> {
  // 使用文件名、大小和时间戳生成唯一标识
  // 实际项目中可以使用更复杂的哈希算法
  const data = `${file.name}_${file.size}_${file.lastModified}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

// 处理大文件上传
async function handleLargeFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 检查文件大小（限制为500MB）
  const maxSize = 500 * 1024 * 1024 // 500MB
  if (file.size > maxSize) {
    alert('文件大小不能超过500MB')
    target.value = ''
    return
  }

  // 显示上传对话框
  uploadFileName.value = file.name
  uploadFileSize.value = file.size
  uploadProgress.value = 0
  uploadStatus.value = 'idle'
  uploadError.value = ''
  showUploadDialog.value = true

  // 开始上传
  await uploadLargeFile(file)

  // 清空文件输入
  target.value = ''
}

// 分片上传大文件
async function uploadLargeFile(file: File) {
  try {
    uploadingFile.value = true
    uploadStatus.value = 'uploading'
    uploadProgress.value = 0

    // 计算文件哈希
    const fileHash = await calculateFileHash(file)
    const fileExt = file.name.split('.').pop() || ''
    const chunkSize = 5 * 1024 * 1024 // 5MB per chunk
    const totalChunks = Math.ceil(file.size / chunkSize)

    // 检查上传状态（断点续传）
    try {
      const checkResponse = await post<{
        success: boolean
        data: { alreadyUploaded: boolean; uploadedChunks: number[] }
      }>('/video/check', { fileHash })

      if (checkResponse.success && checkResponse.data.alreadyUploaded) {
        // 文件已完整上传，直接合并
        await mergeChunks(fileHash, file.name, fileExt, totalChunks)
        return
      }
    } catch (error) {
      console.warn('检查上传状态失败，继续上传:', error)
    }

    // 上传所有分片
    const uploadedChunks: number[] = []
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('fileHash', fileHash)
      formData.append('chunkIndex', String(i))
      formData.append('totalChunks', String(totalChunks))
      formData.append('filename', file.name)
      formData.append('ext', fileExt)

      try {
        // 使用fetch直接上传，因为需要FormData
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
        const token = authStore.getToken() || ''

        const response = await fetch(`${API_BASE_URL}/video/upload-chunk`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: '上传失败' }))
          throw new Error(errorData.message || '上传分片失败')
        }

        const result = await response.json()
        if (result.success) {
          uploadedChunks.push(i)
          uploadProgress.value = Math.round(((i + 1) / totalChunks) * 90) // 90%用于上传，10%用于合并
        } else {
          throw new Error(result.message || '上传分片失败')
        }
      } catch (error) {
        console.error(`上传第 ${i + 1} 个分片失败:`, error)
        throw error
      }
    }

    // 所有分片上传完成，合并文件
    uploadProgress.value = 95
    await mergeChunks(fileHash, file.name, fileExt, totalChunks)

    uploadProgress.value = 100
    uploadStatus.value = 'success'

    // 3秒后自动关闭对话框
    setTimeout(() => {
      showUploadDialog.value = false
      uploadStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    console.error('大文件上传失败:', error)
    uploadStatus.value = 'error'
    uploadError.value = error instanceof Error ? error.message : '上传失败，请重试'
  } finally {
    uploadingFile.value = false
  }
}

// 合并分片
async function mergeChunks(fileHash: string, filename: string, ext: string, totalChunks: number) {
  try {
    const response = await post<{
      success: boolean
      message: string
      data?: { url: string; filename: string }
    }>('/video/merge', {
      fileHash,
      filename,
      ext,
      totalChunks
    })

    if (!response.success) {
      throw new Error(response.message || '合并文件失败')
    }

    console.log('文件上传成功:', response.data?.url)
    return response.data
  } catch (error) {
    console.error('合并文件失败:', error)
    throw error
  }
}

// 处理文件导入
async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (fileExtension === 'csv') {
      await importCSVFile(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      await importExcelFile(file)
    } else {
      alert('不支持的文件格式，请上传CSV或Excel文件')
      return
    }

    // 清空文件输入，允许重复选择同一文件
    if (target) target.value = ''
  } catch (error) {
    console.error('导入文件失败:', error)
    alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 导入CSV文件
async function importCSVFile(file: File) {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    alert('CSV文件格式错误，至少需要包含表头和一行数据')
    return
  }

  // 解析表头
  const headers = parseCSVLine(lines[0] || '')
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.trim()] = index
  })

  // 字段映射
  const fieldMap: Record<string, string> = {
    '姓名': 'name',
    '名字': 'name',
    'name': 'name',
    '性别': 'gender',
    'gender': 'gender',
    '年龄': 'age',
    'age': 'age',
    '电话': 'phone',
    '手机': 'phone',
    'phone': 'phone',
    '手机号': 'phone',
    '身份证': 'idCard',
    '身份证号': 'idCard',
    'idCard': 'idCard',
    '关系': 'relation',
    'relation': 'relation',
    '地址': 'address',
    'address': 'address',
    '类别': 'category',
    'category': 'category',
    '治疗方案': 'treatmentPlan',
    '治疗': 'treatmentPlan',
    'treatmentPlan': 'treatmentPlan',
    '支付状态': 'paymentStatus',
    '支付': 'paymentStatus',
    'paymentStatus': 'paymentStatus'
  }

  // 解析数据行
  const patientsToImport: Partial<Patient>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i] || '')
    if (values.length === 0) continue

    const patient: Partial<Patient> = {}

    // 映射字段
    Object.keys(headerMap).forEach(headerKey => {
      const fieldKey = fieldMap[headerKey] || headerKey.toLowerCase()
      const valueIndex = headerMap[headerKey]
      if (valueIndex !== undefined && valueIndex < values.length) {
        const value = values[valueIndex]?.trim()

        // 类型转换
        if (fieldKey === 'age' && value) {
          const age = parseInt(value)
          if (!isNaN(age)) patient[fieldKey as keyof Patient] = age as any
        } else if (value && (fieldKey === 'name' || fieldKey === 'gender' || fieldKey === 'phone' || fieldKey === 'idCard' || fieldKey === 'relation' || fieldKey === 'address' || fieldKey === 'category' || fieldKey === 'treatmentPlan' || fieldKey === 'paymentStatus')) {
          patient[fieldKey as keyof Patient] = value as any
        }
      }
    })

    // 验证必要字段
    if (patient.name) {
      patientsToImport.push(patient)
    }
  }

  if (patientsToImport.length === 0) {
    alert('CSV文件中没有有效的数据行')
    return
  }

  // 确认导入
  const confirmMessage = `将要导入 ${patientsToImport.length} 条数据，是否继续？`
  if (!confirm(confirmMessage)) {
    return
  }

  // 批量导入数据
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < patientsToImport.length; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)) // 延迟避免请求过快

      const response = await post<{
        success: boolean
        message: string
        data: Patient
      }>('/patients', patientsToImport[i])

      if (response.success) {
        successCount++
      } else {
        failCount++
      }
    } catch (error) {
      failCount++
      const patientName = patientsToImport[i]?.name || '未知患者'
      console.error(`❌ 导入患者失败 (${patientName}):`, error)
    }
  }

  // 显示导入结果
  const message = `导入完成！\n成功: ${successCount} 条\n失败: ${failCount} 条`
  alert(message)

  // 重新获取数据
  if (successCount > 0) {
    await fetchPatients()
  }
}

// 解析CSV行（处理逗号在引号内的情况）
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // 跳过下一个引号
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

// 导入Excel文件
async function importExcelFile(file: File) {
  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')

    // 读取文件
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      alert('Excel文件格式错误，没有找到工作表')
      return
    }
    const worksheet = workbook.Sheets[firstSheetName]
    if (!worksheet) {
      alert('Excel文件格式错误，工作表不存在')
      return
    }

    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      alert('Excel文件格式错误，至少需要包含表头和一行数据')
      return
    }

    // 解析表头
    if (!jsonData[0]) {
      alert('Excel文件格式错误，没有找到表头')
      return
    }
    const headers = jsonData[0].map((h: any) => String(h || '').trim())
    const headerMap: Record<string, number> = {}
    headers.forEach((header, index) => {
      if (header) headerMap[header] = index
    })

    // 字段映射（与CSV导入相同）
    const fieldMap: Record<string, string> = {
      '姓名': 'name',
      '名字': 'name',
      'name': 'name',
      '性别': 'gender',
      'gender': 'gender',
      '年龄': 'age',
      'age': 'age',
      '电话': 'phone',
      '手机': 'phone',
      'phone': 'phone',
      '手机号': 'phone',
      '身份证': 'idCard',
      '身份证号': 'idCard',
      'idCard': 'idCard',
      '关系': 'relation',
      'relation': 'relation',
      '地址': 'address',
      'address': 'address',
      '类别': 'category',
      'category': 'category',
      '治疗方案': 'treatmentPlan',
      '治疗': 'treatmentPlan',
      'treatmentPlan': 'treatmentPlan',
      '支付状态': 'paymentStatus',
      '支付': 'paymentStatus',
      'paymentStatus': 'paymentStatus'
    }

    // 解析数据行
    const patientsToImport: Partial<Patient>[] = []
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || row.length === 0) continue

      const patient: Partial<Patient> = {}

      // 映射字段
    Object.keys(headerMap).forEach(headerKey => {
      const fieldKey = fieldMap[headerKey] || headerKey.toLowerCase()
      const valueIndex = headerMap[headerKey]
      if (valueIndex !== undefined && valueIndex < row.length) {
        let value = row[valueIndex]
          if (value !== null && value !== undefined) {
            value = String(value).trim()

            // 类型转换
            if (fieldKey === 'age' && value) {
              const age = parseInt(value)
              if (!isNaN(age)) patient[fieldKey as keyof Patient] = age as any
            } else if (value && (fieldKey === 'name' || fieldKey === 'gender' || fieldKey === 'phone' || fieldKey === 'idCard' || fieldKey === 'relation' || fieldKey === 'address' || fieldKey === 'category' || fieldKey === 'treatmentPlan' || fieldKey === 'paymentStatus')) {
              patient[fieldKey as keyof Patient] = value as any
            }
          }
        }
      })

      // 验证必要字段
      if (patient.name) {
        patientsToImport.push(patient)
      }
    }

    if (patientsToImport.length === 0) {
      alert('Excel文件中没有有效的数据行')
      return
    }

    // 确认导入
    const confirmMessage = `将要导入 ${patientsToImport.length} 条数据，是否继续？`
    if (!confirm(confirmMessage)) {
      return
    }

    // 批量导入数据
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < patientsToImport.length; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)) // 延迟避免请求过快

        const response = await post<{
          success: boolean
          message: string
          data: Patient
        }>('/patients', patientsToImport[i])

        if (response.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
        const patientName = patientsToImport[i]?.name || '未知患者'
        console.error(`❌ 导入患者失败 (${patientName}):`, error)
      }
    }

    // 显示导入结果
    const message = `导入完成！\n成功: ${successCount} 条\n失败: ${failCount} 条`
    alert(message)

    // 重新获取数据
    if (successCount > 0) {
      await fetchPatients()
    }
  } catch (error) {
    console.error('导入Excel文件失败:', error)
    alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}
</script>

<template>
  <div class="patients-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <div class="search-section">
        <input
          type="text"
          class="search-input"
          placeholder="搜索"
          v-model="searchKeyword"
          @input="handleSearch"
          @keyup.enter="handleSearchImmediate"
        />
      </div>
      <div class="top-actions">
        <!-- 设置按钮 -->
        <button class="icon-btn settings-btn" title="设置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        <!-- 通知按钮 -->
        <button class="icon-btn notification-btn" title="消息">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>

        <!-- 用户菜单 -->
        <div class="user-menu-wrapper">
          <button class="user-btn" @click.stop="showUserMenu = !showUserMenu">
            <div class="user-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="currentColor"/>
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="currentColor"/>
              </svg>
            </div>
            <span class="user-name">叶**</span>
            <span class="chevron">▼</span>
          </button>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="handleMenuClick('profile')">个人</div>
            <div class="dropdown-item" @click="handleMenuClick('settings')">设置</div>
            <div class="dropdown-item" @click="handleMenuClick('logout')">退出</div>
          </div>
        </div>

        <!-- 日期显示 -->
        <div class="date-section">
          <svg class="calendar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="9" y1="14" x2="9" y2="14" stroke-width="2" stroke-linecap="round"></line>
            <line x1="13" y1="14" x2="13" y2="14" stroke-width="2" stroke-linecap="round"></line>
            <line x1="17" y1="14" x2="17" y2="14" stroke-width="2" stroke-linecap="round"></line>
            <line x1="9" y1="18" x2="9" y2="18" stroke-width="2" stroke-linecap="round"></line>
            <line x1="13" y1="18" x2="13" y2="18" stroke-width="2" stroke-linecap="round"></line>
          </svg>
          <span class="date-text">{{ formatDate(currentDate) }}</span>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 统计卡片区域 -->
      <div class="stats-section">
        <!-- 患者位置分布（大卡片） -->
        <div class="stat-card large-card">
          <div class="card-header">
            <div class="card-icon">🏠</div>
            <h3 class="card-title">患者位置分布</h3>
          </div>
          <div class="map-container">
            <!-- 左侧统计数据 -->
            <div class="map-stats-panel">
              <div class="stat-item-large">
                <div class="stat-label">患者总数</div>
                <div class="stat-value-large">{{ totalPatients }}</div>
              </div>
              <div class="stat-item-medium">
                <div class="stat-label">本地患者</div>
                <div class="stat-value-medium">
                  {{ localPatients }}
                  <span class="avatar-group">
                    <span class="mini-avatar">👤</span>
                    <span class="mini-avatar">👤</span>
                    <span class="mini-avatar">👤</span>
                  </span>
                </div>
              </div>
              <div class="stat-item-medium">
                <div class="stat-label">外地患者</div>
                <div class="stat-value-medium">
                  {{ nonLocalPatients }}
                  <span class="avatar-group">
                    <span class="mini-avatar">🇪🇸</span>
                    <span class="mini-avatar">🇸🇪</span>
                    <span class="mini-avatar">🇩🇪</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 右侧地图 -->
            <div class="map-chart-wrapper">
              <div class="map-chart">
                <!-- 地图展开按钮 -->
                <button class="map-expand-btn" title="展开地图" @click="openFullscreen('map')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </button>

                <!-- 中国地图 -->
                <div class="map-content">
                  <ChinaMap :data="patientLocationData" />
                </div>
              </div>
              <!-- 图例 -->
              <div class="map-legend">
                <div class="legend-item">
                  <span class="legend-dot legend-dot-striped"></span>
                  <span>无患者</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #FFEB3B"></span>
                  <span>1-20名患者</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #4CAF50"></span>
                  <span>21-50名患者</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #FF9800"></span>
                  <span>51-100名患者</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #2E7D32"></span>
                  <span>100+名患者</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧数据大屏卡片 -->
        <div class="small-cards">
          <!-- 患者总数 -->
          <div class="stat-card data-screen-card">
            <div class="stat-header">
              <h3 class="stat-title">患者总数</h3>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="stat-icon">👥</span>
                <button class="expand-btn-small" title="全屏显示" @click="openFullscreen('patients')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="stat-value">{{ totalPatients }}</div>
            <div class="stat-trend">
              <span :class="patientTrend > 0 ? 'trend-up' : 'trend-down'">
                {{ patientTrend > 0 ? '↑' : '↓' }} {{ Math.abs(patientTrend) }}%
              </span>
              <span class="trend-label">
                {{ patientTrend > 0 ? '患者数量已上升' : '患者数量已下降' }} {{ Math.abs(patientTrend) }}%
              </span>
            </div>
            <!-- 柱状图 -->
            <div class="chart-container">
              <div class="bar-chart">
                <v-chart
                  :option="barChartOption"
                  autoresize
                  style="height: 180px; width: 100%;"
                />
              </div>
            </div>
          </div>

          <!-- 预约总数 -->
          <div class="stat-card data-screen-card">
            <div class="stat-header">
              <h3 class="stat-title">预约总数</h3>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="stat-icon">📅</span>
                <button class="expand-btn-small" title="全屏显示" @click="openFullscreen('appointments')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="stat-value">{{ appointmentCount }}</div>
            <div class="stat-trend">
              <span class="trend-up">↑ {{ appointmentTrend }}%</span>
              <span class="trend-label">预约量增加了 {{ appointmentTrend }}%</span>
            </div>
            <!-- 折线图 -->
            <div class="chart-container">
              <div class="line-chart">
                <v-chart
                  :option="lineChartOption"
                  autoresize
                  style="height: 180px; width: 100%;"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 患者列表表格 -->
      <div class="table-section">
        <div class="table-header">
          <!-- 时间范围切换 -->
          <div class="time-tabs">
            <button
              class="time-tab"
              :class="{ active: timeRange === 'day' }"
              @click="switchTimeRange('day')"
            >
              日
            </button>
            <button
              class="time-tab"
              :class="{ active: timeRange === 'week' }"
              @click="switchTimeRange('week')"
            >
              周
            </button>
            <button
              class="time-tab"
              :class="{ active: timeRange === 'month' }"
              @click="switchTimeRange('month')"
            >
              月
            </button>
          </div>

          <!-- 搜索和操作按钮 -->
          <div class="table-actions">
            <div class="search-wrapper">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索"
                class="search-input-small"
                @input="handleSearch"
                @keyup.enter="handleSearchImmediate"
              />
            </div>
            <div class="action-buttons-group">
              <!-- 刷新按钮 -->
              <button class="action-btn" @click="fetchPatients" title="刷新">
                <span class="action-icon">🔄</span>
              </button>
              <!-- 导出按钮 -->
              <button class="action-btn" @click="exportData" title="导出数据">
                <span class="action-icon">📥</span>
              </button>
              <!-- 导入数据按钮 -->
              <button class="action-btn add-data-btn" @click="triggerImport" title="导入数据">
                <span class="action-icon">📁</span>
              </button>
              <!-- 大文件上传按钮 -->
              <button class="action-btn large-upload-btn" @click="triggerLargeFileUpload" title="大文件上传">
                <span class="action-icon">📤</span>
              </button>
              <!-- 隐藏的文件输入 -->
              <input
                ref="fileInputRef"
                type="file"
                accept=".csv,.xlsx,.xls"
                style="display: none"
                @change="handleFileImport"
              />
              <!-- 隐藏的大文件输入 -->
              <input
                ref="largeFileInputRef"
                type="file"
                style="display: none"
                @change="handleLargeFileUpload"
              />
              <!-- 批量操作按钮 -->
              <button
                class="action-btn"
                :class="{ active: isSelectMode }"
                @click="toggleSelectMode"
                title="批量操作"
              >
                <span class="action-icon">☑️</span>
              </button>
              <!-- 新增按钮 -->
              <button class="add-btn-circle" @click="openCreateDialog" title="新增患者">
                <span class="add-icon">+</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 批量操作栏 -->
        <div v-if="isSelectMode" class="batch-action-bar">
          <div class="batch-info">
            <span>已选择 {{ selectedPatients.length }} 项</span>
            <button class="batch-select-all" @click="toggleSelectAll">
              {{ selectedPatients.length === patients.length ? '取消全选' : '全选' }}
            </button>
          </div>
          <div class="batch-actions">
            <button class="batch-btn batch-delete" @click="batchDelete" :disabled="selectedPatients.length === 0">
              批量删除
            </button>
            <button class="batch-btn batch-cancel" @click="toggleSelectMode">取消</button>
          </div>
        </div>

        <!-- 筛选条件显示 -->
        <div v-if="filters.gender || filters.category || filters.treatmentPlan || filters.paymentStatus" class="filter-tags">
          <span class="filter-tags-label">筛选条件：</span>
          <span v-if="filters.gender" class="filter-tag">
            性别: {{ filters.gender }}
            <span class="filter-tag-close" @click="clearFilter('gender')">×</span>
          </span>
          <span v-if="filters.category" class="filter-tag">
            类别: {{ filters.category }}
            <span class="filter-tag-close" @click="clearFilter('category')">×</span>
          </span>
          <span v-if="filters.treatmentPlan" class="filter-tag">
            方案: {{ filters.treatmentPlan }}
            <span class="filter-tag-close" @click="clearFilter('treatmentPlan')">×</span>
          </span>
          <span v-if="filters.paymentStatus" class="filter-tag">
            状态: {{ filters.paymentStatus }}
            <span class="filter-tag-close" @click="clearFilter('paymentStatus')">×</span>
          </span>
          <button class="clear-all-filters" @click="clearAllFilters">清除全部</button>
        </div>

        <!-- 表格 -->
        <div class="table-container">
          <table class="patients-table">
            <thead>
              <tr>
                <th v-if="isSelectMode" class="select-column">
                  <input
                    type="checkbox"
                    :checked="selectedPatients.length === patients.length && patients.length > 0"
                    @change="toggleSelectAll"
                    class="select-checkbox"
                  />
                </th>
                <th @click.stop="handleSort('name')" class="sortable">
                  <div class="th-content">
                    <span>患者姓名</span>
                    <span class="sort-icon">{{ getSortIcon('name') }}</span>
                  </div>
                </th>
                <th @click.stop="handleSort('address')" class="sortable">
                  <div class="th-content">
                    <span>住址</span>
                    <span class="sort-icon">{{ getSortIcon('address') }}</span>
                  </div>
                </th>
                <th @click.stop="handleSort('gender')" class="sortable">
                  <div class="th-content">
                    <span>性别</span>
                    <span class="sort-icon">{{ getSortIcon('gender') }}</span>
                    <button
                      class="filter-btn"
                      @click.stop="openFilterMenu('gender', $event)"
                      title="筛选"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                      </svg>
                    </button>
                    <!-- 筛选菜单 -->
                    <div v-if="activeFilterMenu === 'gender'" class="filter-dropdown" @click.stop>
                      <div
                        class="filter-item"
                        :class="{ active: filters.gender === '' }"
                        @click="applyFilter('gender', '')"
                      >
                        全部
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.gender === '男' }"
                        @click="applyFilter('gender', '男')"
                      >
                        男
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.gender === '女' }"
                        @click="applyFilter('gender', '女')"
                      >
                        女
                      </div>
                    </div>
                  </div>
                </th>
                <th @click.stop="handleSort('category')" class="sortable">
                  <div class="th-content">
                    <span>患者类别</span>
                    <span class="sort-icon">{{ getSortIcon('category') }}</span>
                    <button
                      class="filter-btn"
                      @click.stop="openFilterMenu('category', $event)"
                      title="筛选"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                      </svg>
                    </button>
                    <!-- 筛选菜单 -->
                    <div v-if="activeFilterMenu === 'category'" class="filter-dropdown" @click.stop>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '' }"
                        @click="applyFilter('category', '')"
                      >
                        全部
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '普通' }"
                        @click="applyFilter('category', '普通')"
                      >
                        普通
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '成年人' }"
                        @click="applyFilter('category', '成年人')"
                      >
                        成年人
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '老年人' }"
                        @click="applyFilter('category', '老年人')"
                      >
                        老年人
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '儿童' }"
                        @click="applyFilter('category', '儿童')"
                      >
                        儿童
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === 'VIP' }"
                        @click="applyFilter('category', 'VIP')"
                      >
                        VIP
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.category === '急诊' }"
                        @click="applyFilter('category', '急诊')"
                      >
                        急诊
                      </div>
                    </div>
                  </div>
                </th>
                <th @click.stop="handleSort('treatmentPlan')" class="sortable">
                  <div class="th-content">
                    <span>治疗方案</span>
                    <span class="sort-icon">{{ getSortIcon('treatmentPlan') }}</span>
                    <button
                      class="filter-btn"
                      @click.stop="openFilterMenu('treatmentPlan', $event)"
                      title="筛选"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                      </svg>
                    </button>
                    <!-- 筛选菜单 -->
                    <div v-if="activeFilterMenu === 'treatmentPlan'" class="filter-dropdown" @click.stop>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '' }"
                        @click="applyFilter('treatmentPlan', '')"
                      >
                        全部
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '门诊' }"
                        @click="applyFilter('treatmentPlan', '门诊')"
                      >
                        门诊
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '住院' }"
                        @click="applyFilter('treatmentPlan', '住院')"
                      >
                        住院
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '急诊' }"
                        @click="applyFilter('treatmentPlan', '急诊')"
                      >
                        急诊
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '手术' }"
                        @click="applyFilter('treatmentPlan', '手术')"
                      >
                        手术
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.treatmentPlan === '重症监护' }"
                        @click="applyFilter('treatmentPlan', '重症监护')"
                      >
                        重症监护
                      </div>
                    </div>
                  </div>
                </th>
                <th @click.stop="handleSort('paymentStatus')" class="sortable">
                  <div class="th-content">
                    <span>支付状态</span>
                    <span class="sort-icon">{{ getSortIcon('paymentStatus') }}</span>
                    <button
                      class="filter-btn"
                      @click.stop="openFilterMenu('paymentStatus', $event)"
                      title="筛选"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                      </svg>
                    </button>
                    <!-- 筛选菜单 -->
                    <div v-if="activeFilterMenu === 'paymentStatus'" class="filter-dropdown" @click.stop>
                      <div
                        class="filter-item"
                        :class="{ active: filters.paymentStatus === '' }"
                        @click="applyFilter('paymentStatus', '')"
                      >
                        全部
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.paymentStatus === '已支付' }"
                        @click="applyFilter('paymentStatus', '已支付')"
                      >
                        已支付
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.paymentStatus === '未支付' }"
                        @click="applyFilter('paymentStatus', '未支付')"
                      >
                        未支付
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.paymentStatus === '部分支付' }"
                        @click="applyFilter('paymentStatus', '部分支付')"
                      >
                        部分支付
                      </div>
                      <div
                        class="filter-item"
                        :class="{ active: filters.paymentStatus === '待处理' }"
                        @click="applyFilter('paymentStatus', '待处理')"
                      >
                        待处理
                      </div>
                    </div>
                  </div>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="isSelectMode ? 8 : 7" class="loading-cell">
                  <div class="loading-spinner"></div>
                  <span>加载中...</span>
                </td>
              </tr>
              <tr v-else-if="patients.length === 0">
                <td :colspan="isSelectMode ? 8 : 7" class="empty-cell">
                  <div class="empty-icon">📄</div>
                  <div>无数据</div>
                  <div class="empty-hint">您暂无任何患者数据</div>
                </td>
              </tr>
              <tr v-else v-for="(patient, index) in patients" :key="patient._id || patient.id">
                <td v-if="isSelectMode" class="select-column">
                  <input
                    type="checkbox"
                    :checked="selectedPatients.includes(patient._id || patient.id || '')"
                    @change="togglePatientSelection(patient._id || patient.id || '')"
                    class="select-checkbox"
                  />
                </td>
                <td>
                  <div class="patient-name-cell">
                    <span class="patient-avatar" v-if="!patient.avatar || !patient.avatar.startsWith('data:')">
                      {{ getPatientAvatar(patient, index) }}
                    </span>
                    <img v-else :src="patient.avatar" alt="头像" class="patient-avatar-img" />
                    <div class="patient-info">
                      <div class="patient-name clickable" @click="openPatientDetail(patient)" title="点击查看详情">
                        {{ patient.name }}
                      </div>
                      <div class="patient-phone" v-if="patient.phone">{{ formatPhone(patient.phone) }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ formatAddress(patient.address) }}</td>
                <td>{{ patient.gender || '-' }}</td>
                <td>{{ patient.category || '普通' }}</td>
                <td>{{ patient.treatmentPlan || '-' }}</td>
                <td>
                  <span
                    class="payment-status"
                    :style="{ color: getPaymentStatusColor(patient.paymentStatus) }"
                  >
                    <span
                      class="status-dot"
                      :style="{ backgroundColor: getPaymentStatusColor(patient.paymentStatus) }"
                    ></span>
                    {{ patient.paymentStatus || '待处理' }}
                  </span>
                </td>
                <td class="actions-cell">
                  <div class="actions-wrapper">
                    <button
                      class="action-icon-btn call-btn"
                      :title="patient.phone ? '拨打电话' : '该患者未填写电话号码'"
                      @click="handleActionMenuClick(patient, 'call')"
                      :disabled="!patient.phone"
                    >
                      📞
                    </button>
                    <div class="action-menu-wrapper">
                      <button
                        class="action-icon-btn more-btn"
                        title="更多操作"
                        @click.stop="toggleActionMenu(getPatientId(patient))"
                      >
                        ⋯
                      </button>
                      <div
                        v-if="activeActionMenu === getPatientId(patient)"
                        class="action-menu-dropdown"
                        @click.stop
                      >
                        <div
                          class="action-menu-item"
                          @click="handleActionMenuClick(patient, 'detail')"
                        >
                          <span class="menu-icon">👁️</span>
                          <span>查看详情</span>
                        </div>
                        <div
                          class="action-menu-item"
                          @click="handleActionMenuClick(patient, 'edit')"
                        >
                          <span class="menu-icon">✏️</span>
                          <span>编辑</span>
                        </div>
                        <div
                          class="action-menu-item"
                          @click="handleActionMenuClick(patient, 'notify')"
                        >
                          <span class="menu-icon">📢</span>
                          <span>语音通知</span>
                        </div>
                        <div
                          class="action-menu-item delete-item"
                          @click="handleActionMenuClick(patient, 'delete')"
                        >
                          <span class="menu-icon">🗑️</span>
                          <span>删除</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 表格底部信息栏 -->
        <div class="table-footer">
          <!-- 统计信息 -->
          <div class="table-stats">
            <span class="stats-text">
              共 <strong>{{ total }}</strong> 条记录
              <span v-if="selectedPatients.length > 0" class="selected-count">
                ，已选择 <strong>{{ selectedPatients.length }}</strong> 条
              </span>
            </span>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              上一页
            </button>
            <div class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                class="page-number-btn"
                :class="{ active: page === currentPage, ellipsis: page === '...' }"
                :disabled="page === '...'"
                @click="page !== '...' && changePage(page as number)"
              >
                {{ page }}
              </button>
            </div>
            <span class="page-info">
              第 {{ currentPage }} / {{ totalPages || 1 }} 页
            </span>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages || totalPages === 0"
              @click="changePage(currentPage + 1)"
            >
              下一页
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <div class="page-size-selector">
              <label>每页显示：</label>
              <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑对话框 -->
    <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingPatient ? '编辑患者' : '新增患者' }}</h3>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
        <div class="modal-content">
          <!-- 头像上传 -->
          <div class="form-group avatar-group">
            <label class="form-label">头像</label>
            <div class="avatar-upload-section">
              <div class="avatar-preview-wrapper">
                <div v-if="avatarPreview" class="avatar-preview">
                  <img :src="avatarPreview" alt="头像预览" class="avatar-preview-img" />
                  <div class="avatar-overlay">
                    <label for="avatar-input" class="avatar-change-btn">更换</label>
                    <button type="button" class="avatar-delete-btn" @click="removeAvatar">删除</button>
                  </div>
                </div>
                <div v-else class="avatar-placeholder">
                  <div class="avatar-icon">👤</div>
                  <label for="avatar-input" class="avatar-upload-label">上传头像</label>
                </div>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  class="avatar-input"
                  @change="handleAvatarSelect"
                />
              </div>
              <div class="avatar-hint">图片最大尺寸为2mb</div>
            </div>
          </div>

          <!-- 姓名 -->
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input v-model="patientForm.name" type="text" class="form-input" placeholder="患者姓名" />
          </div>

          <!-- 地址 -->
          <div class="form-group">
            <label class="form-label">地址</label>
            <input v-model="patientForm.address" type="text" class="form-input" placeholder="患者地址" />
          </div>

          <!-- 性别 -->
          <div class="form-group">
            <label class="form-label">性别</label>
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="男"
                  v-model="patientForm.gender"
                  class="radio-input"
                />
                <span class="radio-text">男性</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="女"
                  v-model="patientForm.gender"
                  class="radio-input"
                />
                <span class="radio-text">女性</span>
              </label>
            </div>
          </div>

          <!-- 治疗方案 -->
          <div class="form-group">
            <label class="form-label">治疗方案</label>
            <select v-model="patientForm.treatmentPlan" class="form-input form-select">
              <option value="" disabled>患者治疗方案</option>
              <option value="门诊">门诊</option>
              <option value="住院">住院</option>
              <option value="急诊">急诊</option>
              <option value="手术">手术</option>
              <option value="重症监护">重症监护</option>
            </select>
          </div>

          <!-- 支付状态 -->
          <div class="form-group">
            <label class="form-label">支付</label>
            <select v-model="patientForm.paymentStatus" class="form-input form-select">
              <option value="待处理">待处理</option>
              <option value="未支付">未支付</option>
              <option value="部分支付">部分支付</option>
              <option value="已支付">已支付</option>
            </select>
          </div>

          <!-- 手机号（编辑时显示） -->
          <div class="form-group" v-if="editingPatient">
            <label class="form-label">手机号</label>
            <input v-model="patientForm.phone" type="tel" class="form-input" placeholder="请输入手机号" />
          </div>

          <!-- 其他可选字段（编辑时显示） -->
          <div class="form-group" v-if="editingPatient">
            <label class="form-label">年龄</label>
            <input v-model.number="patientForm.age" type="number" class="form-input" placeholder="请输入年龄" />
          </div>
          <div class="form-group" v-if="editingPatient">
            <label class="form-label">患者类别</label>
            <select v-model="patientForm.category" class="form-input">
              <option value="普通">普通</option>
              <option value="成年人">成年人</option>
              <option value="老年人">老年人</option>
              <option value="儿童">儿童</option>
              <option value="VIP">VIP</option>
              <option value="急诊">急诊</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="save-btn" @click="editingPatient ? updatePatient() : createPatient()" :disabled="creating || uploadingAvatar">
            {{ (creating || uploadingAvatar) ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 患者详情对话框 -->
    <!-- 大文件上传进度对话框 -->
    <div v-if="showUploadDialog" class="modal-overlay" @click.self="!uploadingFile && (showUploadDialog = false)">
      <div class="modal-dialog upload-dialog">
        <div class="modal-header">
          <h3 class="modal-title">大文件上传</h3>
          <button
            class="close-btn"
            @click="showUploadDialog = false"
            :disabled="uploadingFile"
          >×</button>
        </div>
        <div class="modal-content upload-content">
          <!-- 文件信息 -->
          <div class="upload-file-info">
            <div class="file-name">{{ uploadFileName }}</div>
            <div class="file-size">{{ formatFileSize(uploadFileSize) }}</div>
          </div>

          <!-- 上传进度 -->
          <div class="upload-progress-section">
            <div class="progress-bar-wrapper">
              <div
                class="progress-bar"
                :style="{ width: uploadProgress + '%' }"
                :class="{
                  'progress-success': uploadStatus === 'success',
                  'progress-error': uploadStatus === 'error'
                }"
              ></div>
            </div>
            <div class="progress-text">
              <span v-if="uploadStatus === 'uploading'">{{ uploadProgress }}%</span>
              <span v-else-if="uploadStatus === 'success'" class="success-text">上传成功！</span>
              <span v-else-if="uploadStatus === 'error'" class="error-text">上传失败</span>
              <span v-else>准备上传...</span>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="uploadStatus === 'error' && uploadError" class="upload-error">
            <div class="error-icon">⚠️</div>
            <div class="error-message">{{ uploadError }}</div>
          </div>

          <!-- 操作按钮 -->
          <div class="upload-actions">
            <button
              v-if="uploadStatus === 'error'"
              class="btn btn-primary"
              @click="showUploadDialog = false"
            >
              关闭
            </button>
            <button
              v-else-if="uploadStatus === 'success'"
              class="btn btn-primary"
              @click="showUploadDialog = false"
            >
              完成
            </button>
            <button
              v-else
              class="btn btn-secondary"
              @click="showUploadDialog = false"
              :disabled="uploadingFile"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDetailDialog && selectedPatient" class="modal-overlay" @click.self="closePatientDetail">
      <div class="modal-dialog detail-dialog">
        <div class="modal-header detail-header">
          <div class="detail-header-content">
            <div class="detail-avatar-wrapper">
              <span v-if="!selectedPatient.avatar || !selectedPatient.avatar.startsWith('data:')" class="detail-avatar">
                {{ getPatientAvatar(selectedPatient, 0) }}
              </span>
              <img v-else :src="selectedPatient.avatar" alt="头像" class="detail-avatar-img" />
            </div>
            <div class="detail-title-section">
              <h3 class="modal-title detail-title">{{ selectedPatient.name }}</h3>
              <div class="detail-subtitle">患者详情信息</div>
            </div>
          </div>
          <button class="close-btn" @click="closePatientDetail">×</button>
        </div>
        <div class="modal-content detail-content">
          <div class="detail-grid">
            <!-- 基本信息 -->
            <div class="detail-section">
              <div class="detail-section-title">
                <span class="section-icon">👤</span>
                基本信息
              </div>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="detail-label">姓名</span>
                  <span class="detail-value">{{ selectedPatient.name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">性别</span>
                  <span class="detail-value">{{ selectedPatient.gender || '-' }}</span>
                </div>
                <div class="detail-item" v-if="selectedPatient.age">
                  <span class="detail-label">年龄</span>
                  <span class="detail-value">{{ selectedPatient.age }} 岁</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">患者类别</span>
                  <span class="detail-value">
                    <span class="category-badge" :class="getCategoryClass(selectedPatient.category)">
                      {{ selectedPatient.category || '普通' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 联系方式 -->
            <div class="detail-section">
              <div class="detail-section-title">
                <span class="section-icon">📞</span>
                联系方式
              </div>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="detail-label">手机号</span>
                  <span class="detail-value">{{ selectedPatient.phone || '未填写' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">地址</span>
                  <span class="detail-value">{{ formatAddress(selectedPatient.address) || '未填写' }}</span>
                </div>
              </div>
            </div>

            <!-- 医疗信息 -->
            <div class="detail-section">
              <div class="detail-section-title">
                <span class="section-icon">🏥</span>
                医疗信息
              </div>
              <div class="detail-items">
                <div class="detail-item">
                  <span class="detail-label">治疗方案</span>
                  <span class="detail-value">{{ selectedPatient.treatmentPlan || '未设置' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">支付状态</span>
                  <span class="detail-value">
                    <span
                      class="payment-status-badge"
                      :style="{
                        color: getPaymentStatusColor(selectedPatient.paymentStatus),
                        backgroundColor: getPaymentStatusColor(selectedPatient.paymentStatus) + '15'
                      }"
                    >
                      <span
                        class="status-dot"
                        :style="{ backgroundColor: getPaymentStatusColor(selectedPatient.paymentStatus) }"
                      ></span>
                      {{ selectedPatient.paymentStatus || '待处理' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 其他信息 -->
            <div class="detail-section" v-if="selectedPatient._id || selectedPatient.id">
              <div class="detail-section-title">
                <span class="section-icon">📋</span>
                其他信息
              </div>
              <div class="detail-items">
                <div class="detail-item" v-if="selectedPatient._id">
                  <span class="detail-label">患者ID</span>
                  <span class="detail-value detail-id">{{ selectedPatient._id }}</span>
                </div>
                <div class="detail-item" v-else-if="selectedPatient.id">
                  <span class="detail-label">患者ID</span>
                  <span class="detail-value detail-id">{{ selectedPatient.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer detail-footer">
          <button class="detail-btn secondary-btn" @click="closePatientDetail">关闭</button>
          <button class="detail-btn primary-btn" @click="handleDetailAction('edit')">
            <span class="btn-icon">✏️</span>
            编辑
          </button>
          <button class="detail-btn call-btn" @click="handleDetailAction('call')" :disabled="!selectedPatient.phone">
            <span class="btn-icon">📞</span>
            拨打电话
          </button>
        </div>
      </div>
    </div>

    <!-- 拨打电话对话框 -->
    <div v-if="showCallDialog && callPatient" class="modal-overlay" @click.self="closeCallDialog">
      <div class="call-dialog">
        <div class="call-dialog-header">
          <h3 class="call-dialog-title">拨打电话</h3>
          <button class="close-btn" @click="closeCallDialog">×</button>
        </div>
        <div class="call-dialog-content">
          <div class="call-patient-info">
            <div class="call-patient-avatar">
              <span v-if="!callPatient.avatar || !callPatient.avatar.startsWith('data:')">
                👤
              </span>
              <img v-else :src="callPatient.avatar" alt="头像" class="call-avatar-img" />
            </div>
            <div class="call-patient-details">
              <div class="call-patient-name">{{ callPatient.name }}</div>
              <div class="call-patient-phone">{{ callPatient.phone }}</div>
            </div>
          </div>
          <div class="call-dialog-actions">
            <button class="call-action-btn copy-btn" @click="copyPhoneNumber">
              <span class="call-btn-icon">📋</span>
              <span>复制号码</span>
            </button>
            <button class="call-action-btn call-primary-btn" @click="executeCall">
              <span class="call-btn-icon">📞</span>
              <span>拨打</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 语音通知对话框 -->
    <div v-if="showNotifyDialog && notifyPatient" class="modal-overlay" @click.self="closeNotifyDialog">
      <div class="notify-dialog">
        <div class="notify-dialog-header">
          <h3 class="notify-dialog-title">📢 语音通知</h3>
          <button class="close-btn" @click="closeNotifyDialog">×</button>
        </div>
        <div class="notify-dialog-content">
          <div class="notify-patient-info">
            <div class="notify-patient-avatar">
              <span v-if="!notifyPatient.avatar || !notifyPatient.avatar.startsWith('data:')">👤</span>
              <img v-else :src="notifyPatient.avatar" alt="头像" class="notify-avatar-img" />
            </div>
            <div class="notify-patient-details">
              <div class="notify-patient-name">{{ notifyPatient.name }}</div>
              <div class="notify-patient-phone">{{ notifyPatient.phone }}</div>
            </div>
          </div>

          <div class="notify-form">
            <div class="notify-form-group">
              <label class="notify-label">医院名称</label>
              <input v-model="notifyForm.hospitalName" class="notify-input" placeholder="选填, 默认本院" />
            </div>
            <div class="notify-form-group">
              <label class="notify-label">科室</label>
              <input v-model="notifyForm.department" class="notify-input" placeholder="如：内科" />
            </div>
            <div class="notify-form-group">
              <label class="notify-label">医生姓名</label>
              <input v-model="notifyForm.doctorName" class="notify-input" placeholder="如：李医生" />
            </div>
            <div class="notify-form-group">
              <label class="notify-label">就诊时间</label>
              <input v-model="notifyForm.appointmentTime" class="notify-input" placeholder="如：2026年2月15日上午9:00" />
            </div>
            <div class="notify-form-group">
              <label class="notify-label">就诊地点</label>
              <input v-model="notifyForm.clinicLocation" class="notify-input" placeholder="如：门诊楼2楼203诊室" />
            </div>
            <div class="notify-form-group">
              <label class="notify-label">携带证件</label>
              <input v-model="notifyForm.requiredDocuments" class="notify-input" placeholder="身份证和医保卡" />
            </div>
          </div>

          <div class="notify-preview">
            <div class="notify-preview-label">通知内容预览：</div>
            <div class="notify-preview-text">
              您预约的{{ notifyForm.hospitalName || '本院' }}{{ notifyForm.department }}{{ notifyForm.doctorName || '医生' }}医生{{ notifyForm.appointmentTime ? '的就诊时间为' + notifyForm.appointmentTime : '' }}，请准时前往{{ notifyForm.clinicLocation }}，并携带{{ notifyForm.requiredDocuments || '身份证和医保卡' }}。
            </div>
          </div>

          <div class="notify-dialog-actions">
            <button class="notify-action-btn notify-cancel-btn" @click="closeNotifyDialog" :disabled="notifyLoading">
              取消
            </button>
            <button class="notify-action-btn notify-send-btn" @click="executeVoiceNotify" :disabled="notifyLoading">
              <span v-if="notifyLoading">发送中...</span>
              <span v-else>📢 发送语音通知</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏模态框 -->
    <transition name="fade">
      <div v-if="fullscreenType" class="fullscreen-overlay" @click.self="fullscreenType !== 'map' ? closeFullscreen() : null">
        <div class="fullscreen-container">
          <!-- 地图全屏 - 3D科技感大屏 -->
          <div v-if="fullscreenType === 'map'" class="fullscreen-content fullscreen-map-tech">
            <!-- 科技感背景装饰 -->
            <div class="tech-background">
              <div class="tech-grid"></div>
              <div class="tech-particles"></div>
            </div>

            <!-- 顶部标题栏 -->
            <div class="tech-header">
              <div class="tech-title-wrapper">
                <div class="tech-title-icon">📊</div>
                <h2 class="tech-title">患者位置分布 - 3D可视化大屏</h2>
                <div class="tech-time">{{ formatDate(currentDate) }}</div>
              </div>
              <button class="tech-close-btn" @click="closeFullscreen">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- 左侧数据面板 -->
            <div class="tech-panel tech-panel-left">
              <div class="tech-panel-title">核心指标</div>
              <div class="tech-stat-card">
                <div class="tech-stat-icon">👥</div>
                <div class="tech-stat-content">
                  <div class="tech-stat-label">患者总数</div>
                  <div class="tech-stat-value tech-glow-green">{{ totalPatients }}</div>
                </div>
              </div>
              <div class="tech-stat-card">
                <div class="tech-stat-icon">🏠</div>
                <div class="tech-stat-content">
                  <div class="tech-stat-label">本地患者</div>
                  <div class="tech-stat-value tech-glow-blue">{{ localPatients }}</div>
                </div>
              </div>
              <div class="tech-stat-card">
                <div class="tech-stat-icon">🌍</div>
                <div class="tech-stat-content">
                  <div class="tech-stat-label">外地患者</div>
                  <div class="tech-stat-value tech-glow-orange">{{ nonLocalPatients }}</div>
                </div>
              </div>
              <div class="tech-stat-card">
                <div class="tech-stat-icon">📅</div>
                <div class="tech-stat-content">
                  <div class="tech-stat-label">预约总数</div>
                  <div class="tech-stat-value tech-glow-yellow">{{ appointmentCount }}</div>
                </div>
              </div>
            </div>

            <!-- 中央3D地图区域 -->
            <div class="tech-map-container">
              <div class="map-content tech-map-content">
                <ChinaMap :data="patientLocationData" />
              </div>
            </div>

            <!-- 右侧数据面板 -->
            <div class="tech-panel tech-panel-right">
              <div class="tech-panel-title">数据统计</div>
              <div class="tech-chart-mini">
                <div class="tech-chart-title">省份分布</div>
                <div ref="provinceBar2DRef" class="tech-chart-content"></div>
              </div>
              <div class="tech-legend">
                <div class="tech-legend-item">
                  <span class="tech-legend-dot tech-dot-none"></span>
                  <span>无患者</span>
                </div>
                <div class="tech-legend-item">
                  <span class="tech-legend-dot tech-dot-low"></span>
                  <span>1-20名</span>
                </div>
                <div class="tech-legend-item">
                  <span class="tech-legend-dot tech-dot-mid"></span>
                  <span>21-50名</span>
                </div>
                <div class="tech-legend-item">
                  <span class="tech-legend-dot tech-dot-high"></span>
                  <span>51-100名</span>
                </div>
                <div class="tech-legend-item">
                  <span class="tech-legend-dot tech-dot-max"></span>
                  <span>100+名</span>
                </div>
              </div>
            </div>

            <!-- 底部数据面板 -->
            <div class="tech-panel tech-panel-bottom">
              <div class="tech-panel-title">省份数据统计</div>
              <div class="tech-charts-row">
                <div class="tech-chart-item">
                  <div class="tech-chart-title-small">2D柱状图</div>
                  <div ref="provinceBar2DRef" class="tech-chart-small"></div>
                </div>
                <div class="tech-chart-item">
                  <div class="tech-chart-title-small">2D饼图</div>
                  <div ref="provincePie2DRef" class="tech-chart-small"></div>
                </div>
                <div class="tech-chart-item">
                  <div class="tech-chart-title-small">3D柱状图</div>
                  <div ref="provinceBar3DRef" class="tech-chart-small"></div>
                </div>
                <div class="tech-chart-item">
                  <div class="tech-chart-title-small">3D饼图</div>
                  <div ref="provincePie3DRef" class="tech-chart-small"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 患者总数图表全屏 -->
          <div v-if="fullscreenType === 'patients'" class="fullscreen-content fullscreen-chart">
            <div class="fullscreen-header">
              <h2 class="fullscreen-title">患者总数</h2>
            </div>
            <div class="fullscreen-body">
              <div class="fullscreen-stat-value-large">{{ totalPatients }}</div>
              <div class="fullscreen-stat-trend">
                <span :class="patientTrend > 0 ? 'trend-up' : 'trend-down'">
                  {{ patientTrend > 0 ? '↑' : '↓' }} {{ Math.abs(patientTrend) }}%
                </span>
                <span class="trend-label">
                  {{ patientTrend > 0 ? '患者数量已上升' : '患者数量已下降' }} {{ Math.abs(patientTrend) }}%
                </span>
              </div>
              <div class="fullscreen-chart-wrapper">
                <v-chart
                  :option="barChartOption"
                  autoresize
                  style="height: 500px; width: 100%;"
                />
              </div>
            </div>
          </div>

          <!-- 预约总数图表全屏 -->
          <div v-if="fullscreenType === 'appointments'" class="fullscreen-content fullscreen-chart">
            <div class="fullscreen-header">
              <h2 class="fullscreen-title">预约总数</h2>
            </div>
            <div class="fullscreen-body">
              <div class="fullscreen-stat-value-large">{{ appointmentCount }}</div>
              <div class="fullscreen-stat-trend">
                <span class="trend-up">↑ {{ appointmentTrend }}%</span>
                <span class="trend-label">预约量增加了 {{ appointmentTrend }}%</span>
              </div>
              <div class="fullscreen-chart-wrapper">
                <v-chart
                  :option="lineChartOption"
                  autoresize
                  style="height: 500px; width: 100%;"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 提示消息Toast -->
    <transition name="toast-fade">
      <div v-if="showToast" class="toast-container">
        <div class="toast-message">
          <span class="toast-icon">✓</span>
          <span class="toast-text">{{ toastMessage }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.patients-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  padding: 24px;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.search-section {
  flex: 1;
  max-width: 300px;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  outline: none;
  transition: all 0.2s;
  color: #1e293b;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  border-color: #a78bfa;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.icon-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

.settings-btn {
  color: #a78bfa; /* 浅紫色 */
}

.notification-btn {
  color: #fbbf24; /* 亮黄色 */
}

.user-menu-wrapper {
  position: relative;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border: none;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-btn:hover {
  background: #f8fafc;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8f5e9; /* 浅绿色背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9c27b0; /* 紫色图标 */
  flex-shrink: 0;
}

.user-avatar svg {
  width: 20px;
  height: 20px;
}

.user-name {
  font-size: 14px;
  color: #1e293b; /* 深灰色 */
  font-weight: 500;
}

.chevron {
  font-size: 10px;
  color: #6e736c;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  color: #2d2f31;
  font-size: 14px;
}

.dropdown-item:hover {
  background: #f8faf8;
}

.dropdown-item:last-child {
  border-top: 1px solid #eef1eb;
  color: #ff4444;
}

.date-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b; /* 深灰色文本 */
  font-weight: 500;
}

.calendar-icon {
  color: #a78bfa; /* 浅紫色 */
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.date-text {
  color: #1e293b;
}

/* 主要内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 统计卡片区域 */
.stats-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.large-card {
  min-height: 300px;
}

.small-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.small-card {
  flex: 1;
  min-height: 138px;
}

/* 数据大屏卡片样式 */
.data-screen-card {
  background: var(--card-bg);
  padding: 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: var(--transition);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  height: 460px;
  display: flex;
  flex-direction: column;
}

.data-screen-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), #667eea);
}

.data-screen-card:nth-child(2)::before {
  background: linear-gradient(90deg, var(--success-color), #56b4d3);
}

.data-screen-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-icon {
  font-size: 24px;
  opacity: 0.8;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.trend-up {
  color: var(--success-color);
  font-size: 13px;
  font-weight: 600;
}

.trend-down {
  color: var(--danger-color);
  font-size: 13px;
  font-weight: 600;
}

.trend-label {
  color: var(--text-muted);
  font-size: 12px;
  flex: 1;
  min-width: 120px;
}

/* 图表容器 */
.chart-container {
  margin-top: 16px;
  padding: 12px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 12px;
  height: 180px;
  padding: 15px 15px 25px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

/* 折线图 */
.line-chart {
  height: 180px;
  padding: 20px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

/* 暗色模式支持 */
:global(.dark) .data-screen-card {
  background: #1e293b;
  border-color: #334155;
}

:global(.dark) .stat-title {
  color: #94a3b8;
}

:global(.dark) .stat-value {
  color: #f1f5f9;
}

:global(.dark) .trend-label {
  color: #64748b;
}

:global(.dark) .bar-chart,
:global(.dark) .line-chart {
  background: #0f172a;
  border-color: #334155;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 60px);
}

.stat-number {
  font-size: 48px;
  font-weight: 700;
  color: #667eea;
}

.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 60px);
  gap: 12px;
}

.empty-text {
  font-size: 16px;
  color: #94a3b8;
  font-weight: 500;
}

.empty-hint {
  font-size: 14px;
  color: #cbd5e1;
}

.add-link {
  margin-top: 8px;
  color: #4CAF50;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.add-link:hover {
  text-decoration: underline;
}

.map-container {
  display: flex;
  gap: 24px;
  height: 100%;
  min-height: 400px;
}

.map-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 200px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.map-chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-chart {
  flex: 1;
  min-height: 300px;
  width: 100%;
  position: relative;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
}

.map-expand-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-expand-btn:hover {
  background: #f8fafc;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.map-expand-btn svg {
  color: #64748b;
  width: 16px;
  height: 16px;
}

/* 小卡片展开按钮 */
.expand-btn-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 0;
}

.expand-btn-small:hover {
  background: #f8fafc;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.expand-btn-small svg {
  color: #64748b;
  width: 14px;
  height: 14px;
}

.expand-btn-small:hover svg {
  color: #667eea;
}

/* 全屏模态框 */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fullscreen-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.fullscreen-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.fullscreen-close-btn:hover {
  background: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: #f44336;
}

.fullscreen-close-btn svg {
  color: #64748b;
  width: 20px;
  height: 20px;
}

.fullscreen-close-btn:hover svg {
  color: #f44336;
}

/* 科技感大屏专用关闭按钮 */
.tech-close-btn {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #ff0000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: #ff0000;
  z-index: 100;
}

.tech-close-btn:hover {
  background: rgba(255, 0, 0, 0.4);
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
  transform: scale(1.1);
}

.tech-close-btn svg {
  width: 24px;
  height: 24px;
}

.fullscreen-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-header {
  padding: 30px 40px 20px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.fullscreen-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.fullscreen-body {
  flex: 1;
  overflow-y: auto;
  padding: 30px 40px;
}

/* 地图全屏样式 - 3D科技感大屏 */
.fullscreen-map-tech {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  grid-template-rows: 80px 1fr 200px;
  grid-template-areas:
    "header header header"
    "left map right"
    "bottom bottom bottom";
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

/* 科技感背景 */
.tech-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.tech-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.tech-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 165, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(0, 255, 0, 0.05) 0%, transparent 50%);
  animation: particleFloat 15s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

/* 顶部标题栏 */
.tech-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 20, 0, 0.8) 100%);
  border: 2px solid #00ff00;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1);
  z-index: 10;
  position: relative;
}

.tech-title-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
}

.tech-title-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
}

.tech-title {
  font-size: 28px;
  font-weight: bold;
  color: #00ff00;
  margin: 0;
  text-shadow: 0 0 20px rgba(0, 255, 0, 0.8), 0 0 10px rgba(0, 255, 0, 0.5);
  letter-spacing: 2px;
}

.tech-time {
  font-size: 16px;
  color: #00ff00;
  opacity: 0.8;
  margin-left: 20px;
  font-family: 'Consolas', monospace;
}

.tech-close-btn {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  background: rgba(255, 0, 0, 0.2);
  border: 2px solid #ff0000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: #ff0000;
}

.tech-close-btn:hover {
  background: rgba(255, 0, 0, 0.4);
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
  transform: scale(1.1);
}

/* 数据面板 */
.tech-panel {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 0, 0.9) 100%);
  border: 2px solid #00ff00;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.3), inset 0 0 30px rgba(0, 255, 0, 0.1);
  z-index: 10;
  position: relative;
  overflow: hidden;
}

.tech-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.1), transparent);
  animation: scanLine 3s linear infinite;
}

@keyframes scanLine {
  0% { left: -100%; }
  100% { left: 100%; }
}

.tech-panel-left {
  grid-area: left;
}

.tech-panel-right {
  grid-area: right;
}

.tech-panel-bottom {
  grid-area: bottom;
  display: flex;
  flex-direction: column;
}

.tech-panel-title {
  font-size: 18px;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 20px;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
  border-bottom: 2px solid rgba(0, 255, 0, 0.3);
  padding-bottom: 10px;
}

/* 统计卡片 */
.tech-stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  margin-bottom: 15px;
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 8px;
  transition: all 0.3s;
}

.tech-stat-card:hover {
  background: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.6);
  transform: translateX(5px);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
}

.tech-stat-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.6));
}

.tech-stat-content {
  flex: 1;
}

.tech-stat-label {
  font-size: 14px;
  color: rgba(0, 255, 0, 0.7);
  margin-bottom: 5px;
}

.tech-stat-value {
  font-size: 32px;
  font-weight: bold;
  font-family: 'Consolas', monospace;
  text-shadow: 0 0 20px currentColor;
}

.tech-glow-green {
  color: #00ff00;
}

.tech-glow-blue {
  color: #00aaff;
}

.tech-glow-orange {
  color: #ffa500;
}

.tech-glow-yellow {
  color: #ffff00;
}

/* 地图容器 */
.tech-map-container {
  grid-area: map;
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #00ff00;
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(0, 255, 0, 0.4), inset 0 0 40px rgba(0, 255, 0, 0.1);
  overflow: hidden;
  z-index: 10;
}

.tech-map-content {
  width: 100%;
  height: 100%;
}

/* 图例 */
.tech-legend {
  margin-top: 20px;
}

.tech-legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  color: #00ff00;
  font-size: 14px;
  margin-bottom: 8px;
}

.tech-legend-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #00ff00;
  box-shadow: 0 0 10px currentColor;
}

.tech-dot-none {
  background: rgba(100, 100, 100, 0.3);
  border-color: rgba(100, 100, 100, 0.5);
}

.tech-dot-low {
  background: #ffff00;
  box-shadow: 0 0 10px #ffff00;
}

.tech-dot-mid {
  background: #00ff00;
  box-shadow: 0 0 10px #00ff00;
}

.tech-dot-high {
  background: #ffa500;
  box-shadow: 0 0 10px #ffa500;
}

.tech-dot-max {
  background: #ff0000;
  box-shadow: 0 0 10px #ff0000;
}

/* 图表区域 */
.tech-chart-mini {
  margin-top: 20px;
}

.tech-chart-title {
  font-size: 14px;
  color: #00ff00;
  margin-bottom: 10px;
  text-align: center;
}

.tech-chart-content {
  height: 150px;
}

.tech-charts-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-top: 15px;
}

.tech-chart-item {
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 8px;
  padding: 10px;
}

.tech-chart-title-small {
  font-size: 12px;
  color: #00ff00;
  text-align: center;
  margin-bottom: 8px;
}

.tech-chart-small {
  height: 120px;
}

/* 地图全屏样式（保留原有样式用于兼容） */
.fullscreen-map {
  background: #f8fafc;
}

.fullscreen-map-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.fullscreen-stat-item {
  flex: 1;
  text-align: center;
}

.fullscreen-stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.fullscreen-stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.fullscreen-map-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fullscreen-map-content {
  flex: 1;
  min-height: 600px;
  height: calc(100vh - 350px);
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.fullscreen-map-svg {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.fullscreen-legend {
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 数据可视化区域 */
.fullscreen-charts-section {
  margin-top: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.charts-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.view-toggle-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-item {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 15px;
  text-align: center;
}

.chart-content {
  width: 100%;
  height: 400px;
}

@media (max-width: 1200px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}

/* 图表全屏样式 */
.fullscreen-chart {
  background: #f8fafc;
}

.fullscreen-stat-value-large {
  font-size: 72px;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  margin-bottom: 20px;
}

.fullscreen-stat-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.fullscreen-stat-trend .trend-up,
.fullscreen-stat-trend .trend-down {
  font-size: 24px;
  font-weight: 600;
}

.fullscreen-stat-trend .trend-label {
  font-size: 18px;
  color: #64748b;
}

.fullscreen-chart-wrapper {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  height: calc(100% - 250px);
  min-height: 500px;
}

/* 暗色模式全屏支持 */
:global(.dark) .fullscreen-container {
  background: #1e293b;
}

:global(.dark) .fullscreen-title {
  color: #f1f5f9;
}

:global(.dark) .fullscreen-header {
  border-bottom-color: #334155;
}

:global(.dark) .fullscreen-body {
  background: #0f172a;
}

:global(.dark) .fullscreen-map-stats,
:global(.dark) .fullscreen-map-content,
:global(.dark) .fullscreen-legend,
:global(.dark) .fullscreen-chart-wrapper {
  background: #1e293b;
  border-color: #334155;
}

:global(.dark) .fullscreen-stat-label {
  color: #94a3b8;
}

:global(.dark) .fullscreen-stat-value,
:global(.dark) .fullscreen-stat-value-large {
  color: #f1f5f9;
}

:global(.dark) .fullscreen-stat-trend .trend-label {
  color: #94a3b8;
}

:global(.dark) .fullscreen-close-btn {
  background: rgba(30, 41, 59, 0.9);
  border-color: #334155;
}

:global(.dark) .fullscreen-close-btn:hover {
  background: #1e293b;
  border-color: #f44336;
}

:global(.dark) .fullscreen-close-btn svg {
  color: #cbd5e1;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.usa-map-svg {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #f8fafc;
  display: block;
}

.map-content {
  width: 100%;
  height: 100%;
  position: relative;
  min-height: 400px;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.usa-map-svg {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: block;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  color: #94a3b8;
  font-size: 14px;
}

.state-area {
  cursor: pointer;
  transition: all 0.3s ease;
}

.state-area:hover {
  opacity: 1 !important;
  stroke-width: 3;
  filter: brightness(1.15) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transform: scale(1.1);
  transform-origin: center;
}

.state-label,
.state-count {
  pointer-events: none;
  user-select: none;
}

.state-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.state-label-small {
  pointer-events: none;
  font-weight: 500;
}

.map-tooltip {
  position: absolute;
  background: rgba(50, 50, 50, 0.95);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  border: 1px solid #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tooltip-state {
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-count {
  color: #94a3b8;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* 无患者斜纹样式 */
.legend-dot-striped {
  background: #9E9E9E !important;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    #9E9E9E 2px,
    #9E9E9E 4px
  ) !important;
}

.patient-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  gap: 16px;
}

.stat-item-large {
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.stat-item-medium {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value-large {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-value-medium {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1.2;
}

.avatar-group {
  display: flex;
  gap: 4px;
}

.mini-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.trend-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-left: 8px;
}

.trend-badge.positive {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.trend-badge.negative {
  background: rgba(255, 87, 34, 0.1);
  color: #FF5722;
}

.stat-number-large {
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.chart-container-small {
  width: 100%;
  height: 80px;
  margin-bottom: 8px;
}

.mini-chart {
  width: 100%;
  height: 100%;
}

.trend-text {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

/* 表格区域 */
.table-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.time-tabs {
  display: flex;
  gap: 8px;
}

.time-tab {
  padding: 8px 16px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.time-tab:hover {
  border-color: #667eea;
  color: #667eea;
}

.time-tab.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: white;
  border: 1px solid rgba(102, 126, 234, 0.2);
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(102, 126, 234, 0.05);
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-1px);
}

.action-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.action-icon {
  font-size: 16px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  background: white;
}

.search-icon {
  font-size: 16px;
  color: #94a3b8;
}

.search-input-small {
  border: none;
  outline: none;
  font-size: 14px;
  width: 150px;
}

.add-btn-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #4CAF50;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.add-btn-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

/* 批量操作栏 */
.batch-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f0f4ff;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
}

.batch-select-all {
  padding: 4px 12px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 6px;
  background: white;
  color: #667eea;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-select-all:hover {
  background: rgba(102, 126, 234, 0.05);
  border-color: #667eea;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.batch-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.batch-delete {
  background: #ff4444;
  color: white;
}

.batch-delete:hover:not(:disabled) {
  background: #ff6666;
  transform: translateY(-1px);
}

.batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-cancel {
  background: white;
  color: #64748b;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.batch-cancel:hover {
  background: #f8fafc;
  border-color: #667eea;
  color: #667eea;
}

/* 筛选标签 */
.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tags-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #1e293b;
}

.filter-tag-close {
  cursor: pointer;
  color: #94a3b8;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s;
}

.filter-tag-close:hover {
  color: #f44336;
}

.clear-all-filters {
  margin-left: auto;
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: #667eea;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-all-filters:hover {
  color: #5568d3;
  text-decoration: underline;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.15);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
  margin-top: 24px;
}

.patients-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.patients-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
  font-size: 14px;
}

.patients-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  position: relative;
}

.patients-table th.sortable:hover {
  background: rgba(102, 126, 234, 0.05);
}

/* 表头内容 */
.th-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.sort-icon {
  font-size: 12px;
  color: #94a3b8;
  min-width: 12px;
}

.filter-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0.6;
}

.filter-btn:hover {
  opacity: 1;
  color: #667eea;
  transform: scale(1.1);
}

.filter-btn svg {
  width: 12px;
  height: 12px;
}

/* 筛选下拉菜单 */
.filter-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  color: #1e293b;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.filter-item.active {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 500;
}

.filter-item.active::after {
  content: '✓';
  color: #667eea;
  font-weight: bold;
}

/* 选择列 */
.select-column {
  width: 50px;
  text-align: center;
}

.select-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

.patients-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
  font-size: 14px;
}

.patients-table tbody tr:hover {
  background: rgba(102, 126, 234, 0.02);
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
}

.loading-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.patient-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.patient-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.patient-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.patient-name.clickable {
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}

.patient-name.clickable:hover {
  color: #667eea;
  text-decoration: underline;
}

.patient-phone {
  font-size: 12px;
  color: #94a3b8;
}

.payment-status {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.actions-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  position: relative;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}

.action-icon-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.2);
  transform: scale(1.1);
}

.action-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.call-btn {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.call-btn:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.2);
}

.call-btn:disabled {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  opacity: 0.6;
  cursor: not-allowed;
}

.more-btn {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
}

.more-btn:hover {
  background: rgba(158, 158, 158, 0.2);
}

.action-menu-wrapper {
  position: relative;
}

.action-menu-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  z-index: 1000;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.action-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  color: #1e293b;
  font-size: 14px;
}

.action-menu-item:hover {
  background: #f8fafc;
}

.action-menu-item.delete-item {
  color: #ff4d4f;
  border-top: 1px solid #f1f5f9;
}

.action-menu-item.delete-item:hover {
  background: rgba(255, 77, 77, 0.1);
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.edit-btn {
  background: rgba(74, 144, 226, 0.1);
  color: #4A90E2;
}

.edit-btn:hover {
  background: rgba(74, 144, 226, 0.2);
}

.delete-btn {
  background: rgba(255, 77, 77, 0.1);
  color: #ff4d4f;
}

.delete-btn:hover {
  background: rgba(255, 77, 77, 0.2);
}

/* 分页 */
/* 表格底部信息栏 */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.15);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
}

.table-stats {
  display: flex;
  align-items: center;
}

.stats-text {
  font-size: 14px;
  color: #64748b;
}

.stats-text strong {
  color: #667eea;
  font-weight: 600;
}

.selected-count {
  color: #f59e0b;
  margin-left: 8px;
}

.selected-count strong {
  color: #f59e0b;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn svg {
  width: 16px;
  height: 16px;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-number-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number-btn:hover:not(:disabled):not(.ellipsis) {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.page-number-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.page-number-btn.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
}

.page-number-btn:disabled {
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #64748b;
  padding: 0 8px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid rgba(102, 126, 234, 0.2);
}

.page-size-selector label {
  font-size: 14px;
  color: #64748b;
}

.page-size-select {
  padding: 6px 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  outline: none;
}

.page-size-select:hover {
  border-color: #667eea;
}

.page-size-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 对话框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

/* 头像上传样式 */
.avatar-group {
  margin-bottom: 24px;
}

.avatar-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-preview-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e2e8f0;
  cursor: pointer;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-change-btn {
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  user-select: none;
}

.avatar-change-btn:hover {
  background: white;
  transform: scale(1.05);
}

.avatar-delete-btn {
  background: rgba(255, 77, 77, 0.9);
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.avatar-delete-btn:hover {
  background: rgba(255, 77, 77, 1);
  transform: scale(1.05);
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 2px dashed #cbd5e1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-placeholder:hover {
  border-color: #667eea;
  background: #f8fafc;
}

.avatar-icon {
  font-size: 32px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.avatar-upload-label {
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
}

.avatar-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  pointer-events: none;
}

/* 确保label可以触发文件选择 */
.avatar-change-btn,
.avatar-upload-label {
  pointer-events: auto;
  cursor: pointer;
}

.avatar-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

/* 单选按钮样式 */
.radio-group {
  display: flex;
  gap: 24px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4CAF50;
}

.radio-text {
  font-size: 14px;
  color: #1e293b;
  user-select: none;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

/* 患者详情对话框样式 */
.detail-dialog {
  max-width: 700px;
}

.detail-header {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
}

.detail-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-avatar-wrapper {
  flex-shrink: 0;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.detail-avatar-img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.detail-title-section {
  flex: 1;
}

.detail-title {
  color: white;
  margin: 0 0 4px 0;
  font-size: 24px;
}

.detail-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.detail-header .close-btn {
  color: white;
}

.detail-header .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.detail-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  gap: 24px;
}

.detail-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.section-icon {
  font-size: 20px;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  min-width: 100px;
}

.detail-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
  text-align: right;
  flex: 1;
}

.detail-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #94a3b8;
  word-break: break-all;
}

.category-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.category-normal {
  background: #f1f5f9;
  color: #64748b;
}

.category-adult {
  background: #d1fae5;
  color: #065f46;
}

.category-elderly {
  background: #dbeafe;
  color: #1e40af;
}

.category-child {
  background: #fef3c7;
  color: #92400e;
}

.category-vip {
  background: #fce7f3;
  color: #9f1239;
}

.category-emergency {
  background: #fee2e2;
  color: #991b1b;
}

.payment-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-footer {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.detail-btn.secondary-btn {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.detail-btn.secondary-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.detail-btn.primary-btn {
  background: #667eea;
  color: white;
}

.detail-btn.primary-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.detail-btn.call-btn {
  background: #4CAF50;
  color: white;
}

.detail-btn.call-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.detail-btn.call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

.cancel-btn,
.save-btn {
  padding: 14px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 120px;
}

.cancel-btn {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.cancel-btn:hover {
  background: #f8fafc;
}

.save-btn {
  background: #4CAF50;
  color: white;
  width: 100%;
  max-width: 100%;
}

.save-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 暗色模式 */
:global(.dark) .patients-page {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: #ffffff;
}

:global(.dark) .top-bar {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:global(.dark) .stat-card,
:global(.dark) .table-section {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .search-input {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .search-input::placeholder {
  color: #64748b;
}

:global(.dark) .icon-btn {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .icon-btn:hover {
  background: rgba(30, 41, 59, 1);
  border-color: rgba(102, 126, 234, 0.5);
}

:global(.dark) .settings-btn {
  color: #a78bfa;
}

:global(.dark) .notification-btn {
  color: #fbbf24;
}

:global(.dark) .user-btn {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .user-btn:hover {
  background: rgba(30, 41, 59, 1);
}

:global(.dark) .user-name {
  color: #e2e8f0;
}

:global(.dark) .date-section {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .calendar-icon {
  color: #a78bfa;
}

:global(.dark) .date-text {
  color: #e2e8f0;
}

:global(.dark) .search-input,
:global(.dark) .search-input-small,
:global(.dark) .form-input {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .card-title,
:global(.dark) .patients-table th,
:global(.dark) .patients-table td {
  color: #e2e8f0;
}

:global(.dark) .empty-text,
:global(.dark) .empty-hint {
  color: #94a3b8;
}

/* 暗色模式 - 表头筛选和批量操作 */
:global(.dark) .batch-action-bar {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .batch-info {
  color: #e2e8f0;
}

:global(.dark) .batch-select-all {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #667eea;
}

:global(.dark) .batch-select-all:hover {
  background: rgba(30, 41, 59, 1);
}

:global(.dark) .batch-cancel {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .filter-tags {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .filter-tags-label {
  color: #94a3b8;
}

:global(.dark) .filter-tag {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #e2e8f0;
}

:global(.dark) .filter-tag-close {
  color: #94a3b8;
}

:global(.dark) .clear-all-filters {
  color: #667eea;
}

:global(.dark) .action-btn {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #cbd5e1;
}

:global(.dark) .action-btn:hover {
  background: rgba(30, 41, 59, 1);
  border-color: #667eea;
  color: #667eea;
}

:global(.dark) .filter-dropdown {
  background: #1e293b;
  border-color: #334155;
}

:global(.dark) .filter-item {
  color: #e2e8f0;
}

:global(.dark) .filter-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

:global(.dark) .filter-item.active {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

:global(.dark) .filter-btn {
  color: #94a3b8;
}

:global(.dark) .filter-btn:hover {
  color: #667eea;
}

:global(.dark) .sort-icon {
  color: #94a3b8;
}

:global(.dark) .modal-dialog {
  background: #1e293b;
  color: #ffffff;
}

:global(.dark) .modal-title {
  color: #ffffff;
}

/* 拨打电话对话框样式 */
.call-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.call-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.call-dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.call-dialog-content {
  padding: 24px;
}

.call-patient-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.call-patient-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.call-avatar-img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.call-patient-details {
  flex: 1;
}

.call-patient-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.call-patient-phone {
  font-size: 16px;
  color: #4CAF50;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.call-dialog-actions {
  display: flex;
  gap: 12px;
}

.call-action-btn {
  flex: 1;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.copy-btn {
  background: #f1f5f9;
  color: #64748b;
}

.copy-btn:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.call-primary-btn {
  background: #4CAF50;
  color: white;
}

.call-primary-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.call-btn-icon {
  font-size: 20px;
}

/* 暗色模式支持 */
:global(.dark) .call-dialog {
  background: #1e293b;
  color: #ffffff;
}

:global(.dark) .call-dialog-title {
  color: #ffffff;
}

:global(.dark) .call-patient-info {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .call-patient-name {
  color: #e2e8f0;
}

:global(.dark) .copy-btn {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
}

:global(.dark) .copy-btn:hover {
  background: rgba(30, 41, 59, 1);
}

:global(.dark) .form-label {
  color: #e2e8f0;
}

:global(.dark) .avatar-placeholder {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .avatar-placeholder:hover {
  border-color: #667eea;
  background: rgba(30, 41, 59, 1);
}

:global(.dark) .avatar-icon {
  color: #94a3b8;
}

:global(.dark) .avatar-upload-label {
  color: #cbd5e1;
}

:global(.dark) .avatar-hint {
  color: #64748b;
}

:global(.dark) .radio-text {
  color: #e2e8f0;
}

:global(.dark) .avatar-preview {
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .avatar-overlay {
  background: rgba(0, 0, 0, 0.7);
}

:global(.dark) .avatar-change-btn {
  background: rgba(255, 255, 255, 0.95);
  color: #1e293b;
}

:global(.dark) .avatar-change-btn:hover {
  background: white;
}

:global(.dark) .action-menu-dropdown {
  background: #1e293b;
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .action-menu-item {
  color: #e2e8f0;
}

:global(.dark) .action-menu-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

:global(.dark) .action-menu-item.delete-item {
  border-top-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .action-menu-item.delete-item:hover {
  background: rgba(255, 77, 77, 0.2);
}

/* 拨打电话对话框样式 */
.call-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.call-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.call-dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.call-dialog-content {
  padding: 24px;
}

.call-patient-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.call-patient-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.call-avatar-img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.call-patient-details {
  flex: 1;
}

.call-patient-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.call-patient-phone {
  font-size: 16px;
  color: #4CAF50;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.call-dialog-actions {
  display: flex;
  gap: 12px;
}

.call-action-btn {
  flex: 1;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.copy-btn {
  background: #f1f5f9;
  color: #64748b;
}

.copy-btn:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.call-primary-btn {
  background: #4CAF50;
  color: white;
}

.call-primary-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.call-btn-icon {
  font-size: 20px;
}

/* 暗色模式支持 */
:global(.dark) .call-dialog {
  background: #1e293b;
  color: #ffffff;
}

:global(.dark) .call-dialog-header {
  border-bottom-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .call-dialog-title {
  color: #ffffff;
}

:global(.dark) .call-patient-info {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .call-patient-name {
  color: #e2e8f0;
}

:global(.dark) .copy-btn {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
}

:global(.dark) .copy-btn:hover {
  background: rgba(30, 41, 59, 1);
}

/* Toast提示消息样式 */
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  pointer-events: none;
}

.toast-message {
  background: rgba(50, 50, 50, 0.95);
  color: white;
  padding: 14px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 300px;
  max-width: 500px;
  animation: slideDown 0.3s ease;
}

.toast-icon {
  font-size: 18px;
  color: #4CAF50;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-text {
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* 暗色模式Toast */
:global(.dark) .toast-message {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

/* 大文件上传对话框样式 */
.upload-dialog {
  max-width: 500px;
  width: 90%;
}

.upload-content {
  padding: 30px;
}

.upload-file-info {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  word-break: break-all;
}

.file-size {
  font-size: 14px;
  color: #64748b;
}

.upload-progress-section {
  margin-bottom: 24px;
}

.progress-bar-wrapper {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-bar.progress-success {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-bar.progress-error {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.progress-text .success-text {
  color: #10b981;
}

.progress-text .error-text {
  color: #ef4444;
}

.upload-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 24px;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-message {
  flex: 1;
  font-size: 14px;
  color: #dc2626;
  line-height: 1.5;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

/* 暗色模式 - 上传对话框 */
:global(.dark) .upload-file-info {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .file-name {
  color: #e2e8f0;
}

:global(.dark) .file-size {
  color: #94a3b8;
}

:global(.dark) .progress-bar-wrapper {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .progress-text {
  color: #94a3b8;
}

:global(.dark) .upload-error {
  background: rgba(127, 29, 29, 0.2);
  border-color: rgba(220, 38, 38, 0.3);
}

:global(.dark) .error-message {
  color: #fca5a5;
}

:global(.dark) .btn-secondary {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
}

:global(.dark) .btn-secondary:hover:not(:disabled) {
  background: rgba(30, 41, 59, 1);
}

/* 语音通知对话框样式 */
.notify-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.notify-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.notify-dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.notify-dialog-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.notify-patient-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 20px;
}

.notify-patient-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  overflow: hidden;
}

.notify-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notify-patient-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.notify-patient-phone {
  font-size: 14px;
  color: #64748b;
  margin-top: 2px;
}

.notify-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.notify-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notify-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.notify-input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.notify-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.notify-input::placeholder {
  color: #94a3b8;
}

.notify-preview {
  padding: 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  margin-bottom: 20px;
}

.notify-preview-label {
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 6px;
}

.notify-preview-text {
  font-size: 14px;
  color: #78350f;
  line-height: 1.6;
}

.notify-dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.notify-action-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.notify-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notify-cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.notify-cancel-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.notify-send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.notify-send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #6a4293 100%);
}

/* 暗色模式 - 语音通知对话框 */
:global(.dark) .notify-dialog {
  background: #1e293b;
}

:global(.dark) .notify-dialog-header {
  border-bottom-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .notify-dialog-title {
  color: #fff;
}

:global(.dark) .notify-patient-info {
  background: rgba(30, 41, 59, 0.9);
}

:global(.dark) .notify-patient-name {
  color: #e2e8f0;
}

:global(.dark) .notify-label {
  color: #94a3b8;
}

:global(.dark) .notify-input {
  background: #0f172a;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.dark) .notify-input:focus {
  border-color: #667eea;
}

:global(.dark) .notify-preview {
  background: rgba(120, 53, 15, 0.15);
  border-color: rgba(253, 230, 138, 0.3);
}

:global(.dark) .notify-preview-label {
  color: #fcd34d;
}

:global(.dark) .notify-preview-text {
  color: #fde68a;
}

:global(.dark) .notify-cancel-btn {
  background: rgba(30, 41, 59, 0.9);
  color: #cbd5e1;
}
</style>
