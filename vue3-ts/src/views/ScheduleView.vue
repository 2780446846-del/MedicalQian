<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { post, get, put, del } from '../utils/request'

const router = useRouter()
const authStore = useAuthStore()

// 返回上一页
const goBack = () => {
  router.back()
}

// 暗色模式状态
const isDark = ref(false)

// 消息列表显示状态
const showMessages = ref(false)

// 个人信息下拉菜单显示状态
const showUserMenu = ref(false)

// 示例消息数据
const messages = ref([
  { id: 1, title: '新日程提醒', content: '您有一个新的日程安排', time: '10分钟前', unread: true },
  { id: 2, title: '系统通知', content: '系统将在今晚进行维护', time: '1小时前', unread: true },
  { id: 3, title: '日程提醒', content: '您有3个待处理的日程', time: '2小时前', unread: false },
])

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

// 处理菜单点击
const handleMenuClick = (action: string) => {
  showUserMenu.value = false
  if (action === 'logout') {
    // 退出登录
    if (confirm('确定要退出登录吗？')) {
      authStore.logout()
      router.push('/login')
    }
  } else if (action === 'settings') {
    // 跳转到设置页面
    router.push('/profile')
  } else if (action === 'profile') {
    // 跳转到个人资料页面
    router.push('/profile')
  }
}

// 打开设置
const openSettings = () => {
  router.push('/profile')
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.messages-wrapper') && !target.closest('.user-menu-wrapper')) {
    showMessages.value = false
    showUserMenu.value = false
  }
  // 关闭员工选择器
  if (!target.closest('.staff-selector-wrapper')) {
    showStaffSelector.value = false
  }
}

// 日程事件类型ffsffghh 
type EventType = 'doctor' | 'surgery' | 'ward' | 'nurse' | 'ambulance'

// 日程事件接口 
interface ScheduleEvent {
  id: string
  title: string
  time: string 
  endTime: string
  type: EventType  
  responsible: string
  icon?: string
  color?: string
  date?: Date // 事件日期
}

// 当前选中的分类
const activeCategory = ref<EventType | 'all'>('all')

// 搜索关键词
const searchKeyword = ref('')

// 当前日期
const currentDate = ref(new Date())

// 格式化日期
const formatDate = (date: Date) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = weekdays[date.getDay()]
  return `${weekday}, ${month}.${day.toString().padStart(2, '0')}`
}

// 比较两个日期是否同一天（只比较年月日）
const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// 本地存储 key
const EVENTS_STORAGE_KEY = 'schedule_events_v1'

// 日程事件数据（初始为空，只从后端获取）
const events = ref<ScheduleEvent[]>([])

// 从后端获取日程数据
const fetchEventsFromBackend = async () => {
  try {
    console.log('📥 正在从后端获取日程数据...')
    const response = await get('/richeng')
    
    if (response.success && response.data && Array.isArray(response.data)) {
      console.log(`✅ 从后端获取到 ${response.data.length} 条日程数据`)
      console.log('📋 原始数据:', response.data)
      
      // 将后端数据格式转换为前端格式
      const fetchedEvents: ScheduleEvent[] = response.data.map((item: any) => {
        // 处理日期：优先使用 date 字段，如果没有则使用 createdAt，都没有则使用今天
        let eventDate = new Date()
        if (item.date) {
          eventDate = new Date(item.date)
          // 如果日期无效，使用今天
          if (isNaN(eventDate.getTime())) {
            eventDate = new Date()
          }
        } else if (item.createdAt) {
          eventDate = new Date(item.createdAt)
          if (isNaN(eventDate.getTime())) {
            eventDate = new Date()
          }
        }
        
        return {
          id: item.id || item._id?.toString() || `${Date.now()}-${Math.random()}`,
          title: item.title || '',
          time: item.time || '00:00',
          endTime: item.endTime || '00:00',
          type: item.type || 'doctor',
          responsible: item.responsible || '',
          icon: item.icon || '📋',
          color: item.color || '#4A90E2',
          date: eventDate
        }
      })
      
      console.log('🔄 转换后的数据:', fetchedEvents)
      
      // 返回获取到的数据（不做替换，让调用方决定如何处理）
      return fetchedEvents
    }
    return []
  } catch (error) {
    console.error('❌ 从后端获取日程数据失败:', error)
    return []
  }
}

// 批量同步所有日程到后端数据库（带去重检查）
const syncAllEventsToBackend = async () => {
  if (events.value.length === 0) {
    console.log('📭 没有日程数据需要同步')
    return
  }
  
  console.log(`🔄 开始批量同步 ${events.value.length} 条日程到后端...`)
  
  // 先获取后端现有数据，检查是否已存在
  let existingEvents: any[] = []
  try {
    const existingResponse = await get('/richeng')
    if (existingResponse.success && existingResponse.data) {
      existingEvents = existingResponse.data
      console.log(`📋 后端已有 ${existingEvents.length} 条记录`)
    }
  } catch (error) {
    console.warn('⚠️ 获取现有数据失败，将继续同步:', error)
  }
  
  // 创建现有数据的唯一键集合
  const existingKeys = new Set<string>()
  existingEvents.forEach(item => {
    const dateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : ''
    const key = `${item.title}_${item.time}_${dateStr}_${item.responsible}`
    existingKeys.add(key)
  })
  
  let successCount = 0
  let failCount = 0
  let skipCount = 0
  
  for (const event of events.value) {
    // 检查是否已存在
    const dateStr = event.date ? (event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0]) : ''
    const key = `${event.title}_${event.time}_${dateStr}_${event.responsible}`
    
    if (existingKeys.has(key)) {
      skipCount++
      console.log(`⏭️ 跳过已存在的日程: "${event.title}"`)
      continue
    }
    
    try {
      const scheduleData = {
        id: event.id,
        title: event.title,
        time: event.time,
        endTime: event.endTime,
        type: event.type,
        responsible: event.responsible,
        icon: event.icon,
        color: event.color,
        date: event.date ? event.date.toISOString() : null,
        createdAt: event.date ? event.date.toISOString() : new Date().toISOString()
      }
      
      const response = await post('/richeng', scheduleData)
      if (response.success) {
        successCount++
        existingKeys.add(key) // 添加到已存在集合，避免重复提交
        console.log(`✅ 日程 "${event.title}" 已同步到后端`)
      } else {
        failCount++
        console.warn(`⚠️ 日程 "${event.title}" 同步失败:`, response.message)
      }
    } catch (error) {
      failCount++
      console.error(`❌ 日程 "${event.title}" 同步失败:`, error)
    }
  }
  
  console.log(`📊 批量同步完成: 成功 ${successCount} 条, 跳过 ${skipCount} 条, 失败 ${failCount} 条`)
}

// 从本地存储恢复事件并初始化主题
onMounted(async () => {
  // 初始化主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
  
  // 添加点击外部关闭菜单的监听
  document.addEventListener('click', handleClickOutside)
  
  // 从后端获取数据
  const backendEvents = await fetchEventsFromBackend()
  
  // 获取本地存储的数据
  let localEvents: ScheduleEvent[] = []
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY)
    if (stored) {
      const parsed: any[] = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localEvents = parsed.map(item => ({
          ...item,
          date: item.date ? new Date(item.date) : undefined
        }))
        console.log(`📦 从本地存储读取到 ${localEvents.length} 条日程数据`)
      }
    }
  } catch (e) {
    console.error('读取本地存储失败:', e)
  }
  
  // 合并后端数据和本地数据（去重）
  const allEventsMap = new Map<string, ScheduleEvent>()
  
  // 先添加本地存储的数据（保留用户已有的数据）
  localEvents.forEach(event => {
    const dateStr = event.date ? (event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0]) : ''
    const key = `${event.title}_${event.time}_${dateStr}_${event.responsible}`
    if (!allEventsMap.has(key)) {
      allEventsMap.set(key, event)
    }
  })
  
  // 再添加后端数据（后端数据优先级更高，会覆盖本地重复的数据）
  backendEvents.forEach(event => {
    const dateStr = event.date ? (event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0]) : ''
    const key = `${event.title}_${event.time}_${dateStr}_${event.responsible}`
    allEventsMap.set(key, event)
  })
  
  const mergedEvents = Array.from(allEventsMap.values())
  
  if (mergedEvents.length > 0) {
    events.value = mergedEvents
    console.log(`✅ 合并后共有 ${events.value.length} 条日程（后端 ${backendEvents.length} 条，本地 ${localEvents.length} 条）`)
  } else {
    // 如果合并后仍然没有数据，保持空数组（只从后端获取数据）
    console.log('📝 没有日程数据（后端和本地都为空）')
    events.value = []
  }
  
  // 不再自动同步，避免重复数据累积
  // 只在用户手动添加数据时同步到后端
  // 注释掉自动同步逻辑，防止每次刷新都触发同步
  // if (mergedEvents.length > backendEvents.length) {
  //   console.log(`🔄 检测到本地数据（${mergedEvents.length}条）多于后端数据（${backendEvents.length}条），开始同步到后端...`)
  //   await syncAllEventsToBackend()
  // }
  
  // 始终使用今天的日期作为默认日期，不根据数据自动设置
  // 这样用户打开页面时总是看到今天的日程
  currentDate.value = new Date()
  
  if (events.value.length > 0) {
    console.log(`✅ 已加载 ${events.value.length} 条日程到界面`)
    console.log('📅 当前选择的日期（今天）:', currentDate.value.toISOString().split('T')[0])
  }
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 恢复滚动
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  // 恢复主区域样式
  const mainSection = document.querySelector('.main')
  if (mainSection) {
    ;(mainSection as HTMLElement).style.height = ''
    ;(mainSection as HTMLElement).style.overflow = ''
  }
})

// 监听事件列表变更并持久化到本地
watch(events, (val) => {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(val))
  } catch (e) {
    console.error('保存日程到本地存储失败:', e)
  }
}, { deep: true })

// 分类选项
const categories = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'doctor', label: '医生', icon: '👨‍⚕️' },
  { key: 'surgery', label: '手术', icon: '⚕️' },
  { key: 'ward', label: '病房', icon: '🏥' },
  { key: 'nurse', label: '护士', icon: '👩‍⚕️' },
  { key: 'ambulance', label: '救护车', icon: '🚑' }
] as const

// 时间轴时间点（动态生成，包含所有事件的时间）
const timeSlots = computed(() => {
  const times = new Set<string>()
  
  // 添加所有事件的时间
  events.value.forEach(event => {
    times.add(event.time)
  })
  
  // 如果没有事件，使用默认时间点
  if (times.size === 0) {
    return ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
  }
  
  // 按时间排序
  return Array.from(times).sort((a, b) => {
    const parts1 = a.split(':').map(Number)
    const parts2 = b.split(':').map(Number)
    const h1 = parts1[0] || 0
    const m1 = parts1[1] || 0
    const h2 = parts2[0] || 0
    const m2 = parts2[1] || 0
    return h1 * 60 + m1 - (h2 * 60 + m2)
  })
})

// 当前时间线（14:00）
const currentTime = ref('14:00')

// 选中的时间段（用于筛选）
const selectedTimeSlot = ref<string | null>(null)

// 对话框显示状态
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const isEditing = ref(false)
const showDatePicker = ref(false)
const showEventDetailDialog = ref(false)

// 日期选择器相关状态
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth() + 1)
const selectedDateInPicker = ref(new Date())
// 日期选择器当前作用目标：页面顶部日期 / 新日程表单日期
const datePickerTarget = ref<'page' | 'form'>('page')

// 当前选中的事件（用于详情弹窗）
const selectedEvent = ref<ScheduleEvent | null>(null)

// 表单数据
const formData = ref({
  serviceType: 'doctor', // 默认选择医生
  serviceName: '',
  assignedTo: '',
  date: new Date(),
  startTime: '09:00',
  endTime: '10:00'
})

// 服务类型选项（对应后端的5种类型）
const serviceTypes = [
  { key: 'doctor', label: '医生', icon: '👨‍⚕️' },
  { key: 'surgery', label: '手术', icon: '⚕️' },
  { key: 'ward', label: '病房', icon: '🏥' },
  { key: 'nurse', label: '护士', icon: '👩‍⚕️' },
  { key: 'ambulance', label: '救护车', icon: '🚑' }
]

// 可分配人员列表（从后端获取）
const staffList = ref<string[]>([])
const staffListLoading = ref(false)
const staffSearchKeyword = ref('')
const showStaffSelector = ref(false)

// 从后端获取员工列表
const fetchStaffList = async () => {
  if (staffList.value.length > 0) {
    // 如果已经加载过，不再重复加载
    return
  }
  
  staffListLoading.value = true
  try {
    const response = await get('/staff/list', {
      data: {
        page: 1,
        pageSize: 100 // 获取前100个员工
      }
    })
    
    if (response.success && response.data && response.data.list) {
      // 提取员工姓名列表
      staffList.value = response.data.list.map((staff: any) => {
        // 优先使用 name，如果没有则使用其他字段
        return staff.name || staff.employeeId || '未知'
      })
      console.log(`✅ 已加载 ${staffList.value.length} 个员工`)
    } else {
      // 如果后端没有数据，使用默认列表
      staffList.value = [
        '周医生', '李医生', '韩医生', '冯护士', '陈**', '苏医生',
        '王医生', '张医生', '刘医生', '赵医生', '孙医生', '钱医生',
        '吴医生', '郑医生', '马医生', '黄医生', '林医生', '何医生',
        '全体医生', '全体护士'
      ]
      console.log('📝 使用默认员工列表')
    }
  } catch (error) {
    console.error('❌ 获取员工列表失败:', error)
    // 失败时使用默认列表
    staffList.value = [
      '周医生', '李医生', '韩医生', '冯护士', '陈**', '苏医生',
      '王医生', '张医生', '刘医生', '赵医生', '孙医生', '钱医生',
      '吴医生', '郑医生', '马医生', '黄医生', '林医生', '何医生',
      '全体医生', '全体护士'
    ]
  } finally {
    staffListLoading.value = false
  }
}

// 过滤后的员工列表（用于搜索）
const filteredStaffList = computed(() => {
  if (!staffSearchKeyword.value.trim()) {
    return staffList.value
  }
  const keyword = staffSearchKeyword.value.toLowerCase()
  return staffList.value.filter(staff => 
    staff.toLowerCase().includes(keyword)
  )
})

// 筛选后的事件列表
const filteredEvents = computed(() => {
  let result = events.value

  // 按日期筛选 - 只显示当前选择日期的日程
  result = result.filter(event => {
    if (!event.date) {
      // 如果没有日期字段，默认显示（兼容旧数据）
      return true
    }
    // 确保 event.date 是 Date 对象
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    // 检查日期是否有效
    if (isNaN(eventDate.getTime())) {
      // 无效日期，默认显示
      return true
    }
    const isMatch = isSameDay(eventDate, currentDate.value)
    return isMatch
  })

  // 按时间段筛选 - 如果选择了时间段，只显示该时间段的事项
  if (selectedTimeSlot.value) {
    result = result.filter(event => event.time === selectedTimeSlot.value)
  }

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    result = result.filter(event => event.type === activeCategory.value)
  }

  // 按搜索关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(event =>
      event.title.toLowerCase().includes(keyword) ||
      event.responsible.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 按时间分组事件
const eventsByTime = computed(() => {
  const grouped: Record<string, ScheduleEvent[]> = {}
  
  filteredEvents.value.forEach(event => {
    const time = event.time
    if (!grouped[time]) {
      grouped[time] = []
    }
    grouped[time].push(event)
  })

  return grouped
})

// 切换分类
const selectCategory = (category: EventType | 'all') => {
  activeCategory.value = category
}

// 点击时间按钮，筛选对应时间段的事项
const selectTimeSlot = (timeSlot: string) => {
  if (selectedTimeSlot.value === timeSlot) {
    // 如果点击的是已选中的时间段，则取消筛选（显示全部）
    selectedTimeSlot.value = null
    currentTime.value = '' // 清除当前时间高亮
  } else {
    // 选择新的时间段
    selectedTimeSlot.value = timeSlot
    currentTime.value = timeSlot // 更新当前时间高亮
  }
  console.log(`🕐 选择时间段: ${selectedTimeSlot.value || '全部'}`)
}

// 添加新事件
const addEvent = async () => {
  // 重置表单
  formData.value = {
    serviceType: 'doctor', // 默认选择医生
    serviceName: '',
    assignedTo: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00'
  }
  // 获取员工列表
  await fetchStaffList()
  showAddDialog.value = true
}

// 关闭对话框
const closeDialog = () => {
  showAddDialog.value = false
}

// 选择服务类型
const selectServiceType = (type: string) => {
  formData.value.serviceType = type
}

// 移除分配人员
const removeAssigned = () => {
  formData.value.assignedTo = ''
  showStaffSelector.value = false
  staffSearchKeyword.value = ''
}

// 选择分配人员
const selectStaff = (staff: string) => {
  formData.value.assignedTo = staff
  showStaffSelector.value = false
  staffSearchKeyword.value = ''
}

// 打开员工选择器
const openStaffSelector = () => {
  showStaffSelector.value = true
  staffSearchKeyword.value = ''
}

// 关闭员工选择器
const closeStaffSelector = () => {
  showStaffSelector.value = false
  staffSearchKeyword.value = ''
}

// 格式化日期显示
const formatDateDisplay = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[date.getDay()]
  return `${year}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日 ${weekday}`
}

// 调整时间
const adjustTime = (field: 'startTime' | 'endTime', delta: number) => {
  const timeParts = formData.value[field].split(':')
  const hours = Number(timeParts[0]) || 0
  const minutes = Number(timeParts[1]) || 0
  const totalMinutes = hours * 60 + minutes + delta
  
  if (totalMinutes < 0) return
  if (totalMinutes >= 24 * 60) return
  
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60
  
  formData.value[field] = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
}

// 保存新日程
const saveEvent = async () => {
  // 表单验证
  if (!formData.value.serviceName || formData.value.serviceName.trim() === '') {
    alert('请输入服务名称')
    return
  }
  
  if (!formData.value.assignedTo || formData.value.assignedTo.trim() === '') {
    alert('请选择分配人员')
    return
  }
  
  if (!formData.value.startTime || !formData.value.endTime) {
    alert('请设置时间')
    return
  }
  
  // 验证结束时间必须晚于开始时间
  const startParts = formData.value.startTime.split(':').map(Number)
  const endParts = formData.value.endTime.split(':').map(Number)
  const startHour = startParts[0] || 0
  const startMin = startParts[1] || 0
  const endHour = endParts[0] || 0
  const endMin = endParts[1] || 0
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  if (endMinutes <= startMinutes) {
    alert('结束时间必须晚于开始时间')
    return
  }
  
  // 根据服务类型确定事件类型、图标和颜色
  const typeMap: Record<string, { type: EventType; icon: string; color: string }> = {
    'doctor': { type: 'doctor', icon: '👨‍⚕️', color: '#4CAF50' },
    'surgery': { type: 'surgery', icon: '⚕️', color: '#9C27B0' },
    'ward': { type: 'ward', icon: '🏥', color: '#009688' },
    'nurse': { type: 'nurse', icon: '👩‍⚕️', color: '#00BCD4' },
    'ambulance': { type: 'ambulance', icon: '🚑', color: '#FFB84D' }
  }
  
  const typeConfig = typeMap[formData.value.serviceType] || typeMap['doctor']
  const eventType = typeConfig!.type
  const icon = typeConfig!.icon
  const color = typeConfig!.color
  
  // 创建新事件
  const newEvent: ScheduleEvent = {
    id: Date.now().toString(),
    title: formData.value.serviceName.trim(),
    time: formData.value.startTime,
    endTime: formData.value.endTime,
    type: eventType,
    responsible: formData.value.assignedTo,
    icon,
    color,
    date: new Date(formData.value.date) // 使用表单中选择的日期
  }
  
  // 添加到事件列表
  events.value.push(newEvent)
  
  // 同步到后端数据库 richeng
  try {
    const scheduleData = {
      id: newEvent.id,
      title: newEvent.title,
      time: newEvent.time,
      endTime: newEvent.endTime,
      type: newEvent.type,
      responsible: newEvent.responsible,
      icon: newEvent.icon,
      color: newEvent.color,
      date: newEvent.date ? newEvent.date.toISOString() : null,
      createdAt: new Date().toISOString()
    }
    
    const response = await post('/richeng', scheduleData)
    if (response.success) {
      console.log('✅ 日程安排已保存到后端数据库:', response.data)
    } else {
      console.warn('⚠️ 保存到后端失败:', response.message || '未知错误')
    }
  } catch (error) {
    console.error('❌ 保存日程到后端失败:', error)
    // 即使保存失败，也不影响本地使用
  }
  
  // 关闭对话框
  closeDialog()
  
  // 可选：滚动到新添加的事件位置
  setTimeout(() => {
    const eventElement = document.querySelector(`[data-event-id="${newEvent.id}"]`)
    if (eventElement) {
      eventElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, 100)
}

// 打开事件详情
const openEventDetail = (event: ScheduleEvent) => {
  selectedEvent.value = event
  showEventDetailDialog.value = true
}

// 关闭事件详情
const closeEventDetail = () => {
  showEventDetailDialog.value = false
  selectedEvent.value = null
}

// 编辑日程
const editEvent = (event: ScheduleEvent) => {
  selectedEvent.value = event
  isEditing.value = true
  
  // 填充表单数据
  formData.value = {
    serviceType: event.type,
    serviceName: event.title,
    assignedTo: event.responsible,
    date: event.date ? new Date(event.date) : new Date(),
    startTime: event.time,
    endTime: event.endTime
  }
  
  // 获取员工列表
  fetchStaffList()
  showEditDialog.value = true
  showEventDetailDialog.value = false
}

// 更新日程
const updateEvent = async () => {
  if (!selectedEvent.value) return
  
  // 表单验证
  if (!formData.value.serviceName || formData.value.serviceName.trim() === '') {
    alert('请输入服务名称')
    return
  }
  
  if (!formData.value.assignedTo || formData.value.assignedTo.trim() === '') {
    alert('请选择分配人员')
    return
  }
  
  if (!formData.value.startTime || !formData.value.endTime) {
    alert('请设置时间')
    return
  }
  
  // 验证结束时间必须晚于开始时间
  const startParts = formData.value.startTime.split(':').map(Number)
  const endParts = formData.value.endTime.split(':').map(Number)
  const startHour = startParts[0] || 0
  const startMin = startParts[1] || 0
  const endHour = endParts[0] || 0
  const endMin = endParts[1] || 0
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  if (endMinutes <= startMinutes) {
    alert('结束时间必须晚于开始时间')
    return
  }
  
  // 根据服务类型确定事件类型、图标和颜色
  const typeMap: Record<string, { type: EventType; icon: string; color: string }> = {
    'doctor': { type: 'doctor', icon: '👨‍⚕️', color: '#4CAF50' },
    'surgery': { type: 'surgery', icon: '⚕️', color: '#9C27B0' },
    'ward': { type: 'ward', icon: '🏥', color: '#009688' },
    'nurse': { type: 'nurse', icon: '👩‍⚕️', color: '#00BCD4' },
    'ambulance': { type: 'ambulance', icon: '🚑', color: '#FFB84D' }
  }
  
  const typeConfig = typeMap[formData.value.serviceType] || typeMap['doctor']
  const eventType = typeConfig!.type
  const icon = typeConfig!.icon
  const color = typeConfig!.color
  
  // 更新事件
  const eventIndex = events.value.findIndex(e => e.id === selectedEvent.value!.id)
  if (eventIndex !== -1) {
    events.value[eventIndex] = {
      ...selectedEvent.value,
      title: formData.value.serviceName.trim(),
      time: formData.value.startTime,
      endTime: formData.value.endTime,
      type: eventType,
      responsible: formData.value.assignedTo,
      icon,
      color,
      date: new Date(formData.value.date)
    }
    
    // 同步到后端
    try {
      const scheduleData = {
        id: selectedEvent.value.id,
        title: formData.value.serviceName.trim(),
        time: formData.value.startTime,
        endTime: formData.value.endTime,
        type: eventType,
        responsible: formData.value.assignedTo,
        icon,
        color,
        date: new Date(formData.value.date).toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // 尝试使用 PUT 方法更新
      const response = await put(`/richeng/${selectedEvent.value.id}`, scheduleData).catch(async () => {
        // 如果 PUT 失败，尝试使用 POST 更新
        return await post('/richeng', scheduleData)
      })
      
      if (response && response.success) {
        console.log('✅ 日程已更新到后端数据库')
      } else {
        console.warn('⚠️ 更新到后端失败:', response?.message || '未知错误')
      }
    } catch (error) {
      console.error('❌ 更新日程到后端失败:', error)
    }
  }
  
  // 关闭对话框
  closeEditDialog()
}

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false
  isEditing.value = false
  selectedEvent.value = null
  formData.value = {
    serviceType: 'doctor',
    serviceName: '',
    assignedTo: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00'
  }
}

// 删除日程
const deleteEvent = async (event: ScheduleEvent) => {
  if (!confirm(`确定要删除日程"${event.title}"吗？`)) {
    return
  }
  
  // 从列表中移除
  const index = events.value.findIndex(e => e.id === event.id)
  if (index !== -1) {
    events.value.splice(index, 1)
    
    // 同步到后端删除
    try {
      const response = await del(`/richeng/${event.id}`).catch(async () => {
        // 如果 DELETE 失败，尝试使用 POST 删除
        return await post('/richeng/delete', { id: event.id })
      })
      
      if (response && response.success) {
        console.log('✅ 日程已从后端删除')
      } else {
        console.warn('⚠️ 从后端删除失败:', response?.message || '未知错误')
      }
    } catch (error) {
      console.error('❌ 删除日程到后端失败:', error)
    }
  }
  
  // 如果正在查看详情，关闭详情对话框
  if (showEventDetailDialog.value && selectedEvent.value?.id === event.id) {
    closeEventDetail()
  }
}

// 日程统计
const scheduleStats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayEvents = events.value.filter(event => {
    if (!event.date) return false
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate.getTime() === today.getTime()
  })
  
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  
  const weekEvents = events.value.filter(event => {
    if (!event.date) return false
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    return eventDate >= weekStart && eventDate <= weekEnd
  })
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  const monthEvents = events.value.filter(event => {
    if (!event.date) return false
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    return eventDate >= monthStart && eventDate <= monthEnd
  })
  
  // 按类型统计
  const typeStats: Record<string, number> = {}
  events.value.forEach(event => {
    typeStats[event.type] = (typeStats[event.type] || 0) + 1
  })
  
  return {
    total: events.value.length,
    today: todayEvents.length,
    week: weekEvents.length,
    month: monthEvents.length,
    byType: typeStats
  }
})

// 导出日程
const exportSchedule = () => {
  if (events.value.length === 0) {
    alert('没有日程可导出')
    return
  }
  
  // 准备导出数据
  const exportData = events.value.map(event => ({
    '日期': event.date ? formatDateDisplay(event.date) : '未设置',
    '时间': `${event.time} - ${event.endTime}`,
    '服务名称': event.title,
    '类型': event.type,
    '分配人员': event.responsible
  }))
  
  // 转换为CSV格式
  const headers = ['日期', '时间', '服务名称', '类型', '分配人员']
  const csvRows = [headers.join(',')]
  
  exportData.forEach(row => {
    const values = headers.map(header => {
      let value = row[header as keyof typeof row] || ''
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`
      } else {
        value = `"${value}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  })
  
  const csvContent = csvRows.join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = `日程安排_${new Date().toISOString().split('T')[0]}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  alert('日程已导出')
}

// 获取事件颜色
const getEventColor = (event: ScheduleEvent) => {
  return event.color || '#4A90E2'
}

// 打开日期选择器
const openDatePicker = (target: 'page' | 'form' = 'page') => {
  datePickerTarget.value = target

  // 根据目标初始化当前选中日期
  let baseDate: Date
  if (target === 'page') {
    // 页面日期选择器：使用当前选择的日期（默认是今天）
    baseDate = currentDate.value
  } else {
    // 表单日期选择器：使用表单中的日期，如果表单日期无效或未设置，使用今天
    const formDate = formData.value.date
    if (formDate && formDate instanceof Date && !isNaN(formDate.getTime())) {
      baseDate = formDate
    } else {
      baseDate = new Date() // 使用今天的日期
    }
  }
  
  selectedDateInPicker.value = new Date(baseDate)
  calendarYear.value = baseDate.getFullYear()
  calendarMonth.value = baseDate.getMonth() + 1
  showDatePicker.value = true
}

// 关闭日期选择器
const closeDatePicker = () => {
  showDatePicker.value = false
}

// 切换到上一个月
const prevMonth = () => {
  if (calendarMonth.value === 1) {
    calendarMonth.value = 12
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

// 切换到下一个月
const nextMonth = () => {
  if (calendarMonth.value === 12) {
    calendarMonth.value = 1
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

// 获取月份的第一天是星期几（0=周日，1=周一...）
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month - 1, 1).getDay()
}

// 获取月份的天数
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate()
}

// 获取上个月的最后几天
const getPrevMonthDays = () => {
  const prevMonth = calendarMonth.value === 1 ? 12 : calendarMonth.value - 1
  const prevYear = calendarMonth.value === 1 ? calendarYear.value - 1 : calendarYear.value
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)
  const firstDay = getFirstDayOfMonth(calendarYear.value, calendarMonth.value)
  const days: number[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(daysInPrevMonth - i)
  }
  return days
}

// 获取当前月的所有天数
const getCurrentMonthDays = () => {
  const days = getDaysInMonth(calendarYear.value, calendarMonth.value)
  return Array.from({ length: days }, (_, i) => i + 1)
}

// 获取下个月的前几天
const getNextMonthDays = () => {
  const totalCells = 42 // 6行 x 7天
  const firstDay = getFirstDayOfMonth(calendarYear.value, calendarMonth.value)
  const daysInMonth = getDaysInMonth(calendarYear.value, calendarMonth.value)
  const prevDays = firstDay
  const remainingCells = totalCells - prevDays - daysInMonth
  return Array.from({ length: remainingCells }, (_, i) => i + 1)
}

// 选择日期
const selectDate = (day: number, isCurrentMonth: boolean = true, isPrevMonth: boolean = false) => {
  let targetYear = calendarYear.value
  let targetMonth = calendarMonth.value
  
  if (!isCurrentMonth) {
    if (isPrevMonth) {
      // 上个月的日期
      if (targetMonth === 1) {
        targetMonth = 12
        targetYear--
      } else {
        targetMonth--
      }
    } else {
      // 下个月的日期
      if (targetMonth === 12) {
        targetMonth = 1
        targetYear++
      } else {
        targetMonth++
      }
    }
  }
  
  const newDate = new Date(targetYear, targetMonth - 1, day)
  selectedDateInPicker.value = newDate
  
  // 如果切换了月份，更新显示的月份
  if (!isCurrentMonth) {
    calendarYear.value = targetYear
    calendarMonth.value = targetMonth
  }
}

// 保存选择的日期
const saveSelectedDate = () => {
  const picked = new Date(selectedDateInPicker.value)

  if (datePickerTarget.value === 'page') {
    // 更新页面顶部日期
    currentDate.value = picked
  } else {
    // 更新“添加新日程”表单中的日期
    formData.value.date = picked
  }

  closeDatePicker()
}

// 判断日期是否被选中
const isDateSelected = (day: number) => {
  const date = new Date(calendarYear.value, calendarMonth.value - 1, day)
  const selected = selectedDateInPicker.value
  return date.getFullYear() === selected.getFullYear() &&
         date.getMonth() === selected.getMonth() &&
         date.getDate() === selected.getDate()
}

// 判断是否是今天
const isToday = (day: number) => {
  const today = new Date()
  return calendarYear.value === today.getFullYear() &&
         calendarMonth.value === today.getMonth() + 1 &&
         day === today.getDate()
}
</script>

<template>
  <div class="schedule-page">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="search-section">
        <input 
          type="text" 
          class="search-input" 
          placeholder="搜索"
          v-model="searchKeyword"
        />
      </div>
      <div class="top-actions">
        <!-- 设置按钮 -->
        <button
          class="icon-btn settings-btn"
          aria-label="settings"
          title="设置"
          @click="openSettings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        <!-- 消息按钮 -->
        <div class="messages-wrapper">
          <button
            class="icon-btn messages-btn"
            aria-label="messages"
            @click.stop="showMessages = !showMessages"
            :class="{ 'has-unread': messages.some(m => m.unread) }"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span v-if="messages.some(m => m.unread)" class="badge">{{ messages.filter(m => m.unread).length }}</span>
          </button>

          <!-- 消息下拉列表 -->
          <div v-if="showMessages" class="messages-dropdown">
            <div class="dropdown-header">
              <h3>消息</h3>
              <button class="clear-btn" @click="messages = messages.map(m => ({ ...m, unread: false }))">全部已读</button>
            </div>
            <div class="messages-list">
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-item"
                :class="{ unread: message.unread }"
                @click="message.unread = false"
              >
                <div class="message-content">
                  <div class="message-title">{{ message.title }}</div>
                  <div class="message-text">{{ message.content }}</div>
                  <div class="message-time">{{ message.time }}</div>
                </div>
                <span v-if="message.unread" class="unread-dot"></span>
              </div>
              <div v-if="messages.length === 0" class="empty-messages">暂无消息</div>
            </div>
          </div>
        </div>

        <!-- 个人信息按钮 -->
        <div class="user-menu-wrapper">
          <button
            class="user-btn"
            aria-label="user"
            @click.stop="showUserMenu = !showUserMenu"
          >
            <div class="user-avatar">👤</div>
            <span class="user-name">叶**</span>
            <span class="chevron">▼</span>
          </button>

          <!-- 个人信息下拉菜单 -->
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="handleMenuClick('profile')">
              <span class="item-icon">👤</span>
              <span>个人</span>
            </div>
            <div class="dropdown-item" @click="handleMenuClick('settings')">
              <span class="item-icon">⚙️</span>
              <span>设置</span>
            </div>
            <div class="dropdown-item" @click="handleMenuClick('logout')">
              <span class="item-icon">🚪</span>
              <span>退出</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 日期显示 -->
    <div class="date-section" @click="openDatePicker('page')">
      <span class="calendar-icon">📅</span>
      <span class="date-text">{{ formatDate(currentDate) }}</span>
    </div>

    <!-- 日程主体 -->
    <div class="schedule-main">
      <!-- 标题和分类筛选 -->
      <div class="schedule-header">
        <h2 class="schedule-title">日程</h2>
        <div class="category-filters">
          <button
            v-for="category in categories"
            :key="category.key"
            class="category-btn"
            :class="{ active: activeCategory === category.key }"
            @click="selectCategory(category.key)"
          >
            {{ category.label }}
          </button>
        </div>
      </div>

      <!-- 搜索和操作 -->
      <div class="action-bar">
        <input
          type="text"
          class="action-search"
          placeholder="搜索"
          v-model="searchKeyword"
        />
        <button class="action-btn export-btn" @click="exportSchedule" title="导出日程">
          <span>📥</span>
        </button>
        <button class="add-btn" @click="addEvent">
          <span class="add-icon">+</span>
        </button>
      </div>

      <!-- 日程统计 -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">总计</span>
          <span class="stat-value">{{ scheduleStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">今天</span>
          <span class="stat-value today">{{ scheduleStats.today }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周</span>
          <span class="stat-value week">{{ scheduleStats.week }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本月</span>
          <span class="stat-value month">{{ scheduleStats.month }}</span>
        </div>
      </div>

      <!-- 时间轴视图 - 横向布局 -->
      <div class="timeline-container-horizontal">
        <div class="timeline-horizontal">
          <!-- 时间标记行 -->
          <div class="time-header-row">
            <div
              v-for="slot in timeSlots"
              :key="`header-${slot}`"
              class="time-header-column"
              :class="{ 
                'current-time-header': slot === currentTime,
                'selected-time-slot': selectedTimeSlot === slot
              }"
              @click="selectTimeSlot(slot)"
            >
              <div class="time-label-horizontal">{{ slot }}</div>
              <!-- 当前时间指示线 -->
              <div
                v-if="slot === currentTime"
                class="current-time-indicator-horizontal"
              ></div>
            </div>
          </div>

          <!-- 事件行 -->
          <div class="events-row">
            <!-- 如果选中了时间段，只显示该时间段的事项 -->
            <template v-if="selectedTimeSlot">
              <div
                :key="`events-${selectedTimeSlot}`"
                class="events-column events-column-full"
              >
                <div class="events-in-column">
                  <div
                    v-for="event in filteredEvents"
                    :key="event.id"
                    class="event-card-horizontal"
                    :style="{ 
                      borderLeftColor: getEventColor(event),
                      backgroundColor: getEventColor(event) + '15'
                    }"
                    :data-event-id="event.id"
                    @click="openEventDetail(event)"
                  >
                    <div class="event-icon-horizontal">{{ event.icon || '📋' }}</div>
                    <div class="event-content-horizontal">
                      <div class="event-title-horizontal">{{ event.title }}</div>
                      <div class="event-time-horizontal">{{ event.time }} - {{ event.endTime }}</div>
                      <div class="event-responsible-horizontal">{{ event.responsible }}</div>
                    </div>
                  </div>
                  <div v-if="filteredEvents.length === 0" class="no-events-message">
                    <p>该时间段暂无日程安排</p>
                  </div>
                </div>
              </div>
            </template>
            <!-- 如果没有选中时间段，显示所有时间段的事项 -->
            <template v-else>
              <div
                v-for="slot in timeSlots"
                :key="`events-${slot}`"
                class="events-column"
              >
                <div class="events-in-column">
                  <div
                    v-for="event in eventsByTime[slot] || []"
                    :key="event.id"
                    class="event-card-horizontal"
                    :style="{ 
                      borderLeftColor: getEventColor(event),
                      backgroundColor: getEventColor(event) + '15'
                    }"
                    :data-event-id="event.id"
                    @click="openEventDetail(event)"
                  >
                    <div class="event-icon-horizontal">{{ event.icon || '📋' }}</div>
                    <div class="event-content-horizontal">
                      <div class="event-title-horizontal">{{ event.title }}</div>
                      <div class="event-time-horizontal">{{ event.time }} - {{ event.endTime }}</div>
                      <div class="event-responsible-horizontal">{{ event.responsible }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑日程对话框 -->
    <div v-if="showAddDialog || showEditDialog" class="modal-overlay" @click.self="isEditing ? closeEditDialog() : closeDialog()">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '编辑日程' : '添加新日程' }}</h3>
          <button class="close-btn" @click="isEditing ? closeEditDialog() : closeDialog()">×</button>
        </div>

        <div class="modal-content">
          <!-- 服务类型 -->
          <div class="form-section">
            <label class="form-label">服务</label>
            <div class="service-type-buttons">
              <button
                v-for="type in serviceTypes"
                :key="type.key"
                class="service-type-btn"
                :class="{ active: formData.serviceType === type.key }"
                @click="selectServiceType(type.key)"
              >
                <span v-if="type.icon" class="service-type-icon">{{ type.icon }}</span>
                {{ type.label }}
              </button>
            </div>
            <input
              type="text"
              class="form-input"
              v-model="formData.serviceName"
              placeholder="输入服务名称"
            />
          </div>

          <!-- 分配给 -->
          <div class="form-section">
            <label class="form-label">分配给</label>
            <div v-if="formData.assignedTo" class="assigned-tag">
              <span>{{ formData.assignedTo }}</span>
              <button class="remove-btn" @click="removeAssigned">×</button>
            </div>
            <div v-else class="staff-selector-wrapper" @click.stop>
              <button 
                class="select-staff-btn" 
                @click="openStaffSelector"
                :disabled="staffListLoading"
              >
                {{ staffListLoading ? '加载中...' : '选择人员' }}
              </button>
              
              <!-- 员工选择下拉框 -->
              <div v-if="showStaffSelector" class="staff-selector-dropdown">
                <div class="staff-search-wrapper">
                  <input
                    type="text"
                    class="staff-search-input"
                    v-model="staffSearchKeyword"
                    placeholder="搜索员工..."
                    @click.stop
                  />
                </div>
                <div class="staff-list-container">
                  <div v-if="filteredStaffList.length === 0" class="no-staff-message">
                    {{ staffListLoading ? '加载中...' : '没有找到员工' }}
                  </div>
                  <button
                    v-for="staff in filteredStaffList"
                    :key="staff"
                    class="staff-option-btn"
                    @click="selectStaff(staff)"
                  >
                    {{ staff }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 日期 -->
          <div class="form-section">
            <label class="form-label">日期</label>
            <div class="date-input-wrapper" @click.stop="openDatePicker('form')">
              <input
                type="text"
                class="form-input"
                :value="formatDateDisplay(formData.date)"
                readonly
              />
              <span class="calendar-icon-input">📅</span>
            </div>
          </div>

          <!-- 时间 -->
          <div class="form-section">
            <label class="form-label">时间</label>
            <div class="time-inputs">
              <div class="time-input-wrapper">
                <button class="time-arrow up" @click="adjustTime('startTime', 15)">▲</button>
                <input
                  type="text"
                  class="time-input"
                  v-model="formData.startTime"
                  readonly
                />
                <button class="time-arrow down" @click="adjustTime('startTime', -15)">▼</button>
              </div>
              <span class="time-separator">→</span>
              <div class="time-input-wrapper">
                <button class="time-arrow up" @click="adjustTime('endTime', 15)">▲</button>
                <input
                  type="text"
                  class="time-input"
                  v-model="formData.endTime"
                  readonly
                />
                <button class="time-arrow down" @click="adjustTime('endTime', -15)">▼</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="save-btn" @click="isEditing ? updateEvent() : saveEvent()">{{ isEditing ? '更新' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 日期选择器对话框 -->
    <div v-if="showDatePicker" class="modal-overlay" @click.self="closeDatePicker">
      <div class="date-picker-dialog">
        <!-- 当前选择的日期显示（右上角） -->
        <div class="date-picker-header-info">
          <span class="selected-date-display">{{ formatDate(selectedDateInPicker) }}</span>
          <span class="calendar-icon-small">📅</span>
        </div>

        <!-- 日历主体 -->
        <div class="calendar-container">
          <!-- 月份导航 -->
          <div class="calendar-header">
            <button class="month-nav-btn" @click="prevMonth">‹</button>
            <span class="month-year">{{ calendarYear }}.{{ calendarMonth.toString().padStart(2, '0') }}</span>
            <button class="month-nav-btn" @click="nextMonth">›</button>
          </div>

          <!-- 星期标题 -->
          <div class="weekdays">
            <div class="weekday" v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</div>
          </div>

          <!-- 日期网格 -->
          <div class="calendar-grid">
            <!-- 上个月的日期 -->
            <div
              v-for="day in getPrevMonthDays()"
              :key="`prev-${day}`"
              class="calendar-day other-month"
              @click="selectDate(day, false, true)"
            >
              {{ day }}
            </div>

            <!-- 当前月的日期 -->
            <div
              v-for="day in getCurrentMonthDays()"
              :key="day"
              class="calendar-day"
              :class="{
                'selected': isDateSelected(day),
                'today': isToday(day)
              }"
              @click="selectDate(day, true)"
            >
              {{ day }}
            </div>

            <!-- 下个月的日期 -->
            <div
              v-for="day in getNextMonthDays()"
              :key="`next-${day}`"
              class="calendar-day other-month"
              @click="selectDate(day, false, false)"
            >
              {{ day }}
            </div>
          </div>
        </div>

        <!-- 保存按钮 -->
        <div class="date-picker-footer">
          <button class="save-date-btn" @click="saveSelectedDate">保存</button>
        </div>
      </div>
    </div>

    <!-- 日程详情对话框 -->
    <div v-if="showEventDetailDialog && selectedEvent" class="modal-overlay" @click.self="closeEventDetail">
      <div class="modal-dialog detail-modal">
        <div class="modal-header detail-header">
          <div class="detail-header-content">
            <div class="detail-icon-wrapper" :style="{ backgroundColor: getEventColor(selectedEvent) + '20' }">
              <span class="detail-icon">{{ selectedEvent.icon || '📋' }}</span>
            </div>
            <h3 class="modal-title detail-title">日程详情</h3>
          </div>
          <button class="close-btn" @click="closeEventDetail">×</button>
        </div>

        <div class="modal-content detail-content">
          <div class="detail-section">
            <div class="detail-label">
              <span class="label-icon">📝</span>
              服务名称
            </div>
            <div class="detail-value">{{ selectedEvent.title }}</div>
          </div>

          <div class="detail-section">
            <div class="detail-label">
              <span class="label-icon">📅</span>
              日期
            </div>
            <div class="detail-value">
              {{ selectedEvent.date ? formatDateDisplay(selectedEvent.date) : formatDateDisplay(currentDate) }}
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-label">
              <span class="label-icon">🕐</span>
              时间
            </div>
            <div class="detail-value time-value">
              <span class="time-start">{{ selectedEvent.time }}</span>
              <span class="time-separator">→</span>
              <span class="time-end">{{ selectedEvent.endTime }}</span>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-label">
              <span class="label-icon">👤</span>
              分配给
            </div>
            <div class="detail-value responsible-value">
              {{ selectedEvent.responsible || '未分配' }}
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-label">
              <span class="label-icon">🏷️</span>
              类型
            </div>
            <div class="detail-value">
              <span 
                class="type-badge"
                :style="{ 
                  backgroundColor: getEventColor(selectedEvent) + '20',
                  color: getEventColor(selectedEvent),
                  borderColor: getEventColor(selectedEvent) + '40'
                }"
              >
                <span v-if="selectedEvent.type === 'doctor'">👨‍⚕️ 医生</span>
                <span v-else-if="selectedEvent.type === 'surgery'">⚕️ 手术</span>
                <span v-else-if="selectedEvent.type === 'ward'">🏥 病房</span>
                <span v-else-if="selectedEvent.type === 'nurse'">👩‍⚕️ 护士</span>
                <span v-else-if="selectedEvent.type === 'ambulance'">🚑 救护车</span>
                <span v-else>{{ selectedEvent.type }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer detail-footer">
          <button class="detail-btn danger-btn" @click="deleteEvent(selectedEvent); closeEventDetail()">删除</button>
          <button class="detail-btn secondary-btn" @click="closeEventDetail">关闭</button>
          <button class="detail-btn primary-btn" @click="editEvent(selectedEvent)">编辑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-page {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 科技感背景装饰 */
.schedule-page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.schedule-page::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(102, 126, 234, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 126, 234, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.schedule-page > * {
  position: relative;
  z-index: 1;
}

/* 隐藏滚动条但保持滚动功能 */
.timeline-container-horizontal::-webkit-scrollbar {
  display: none;
}

.timeline-container-horizontal {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 顶部导航栏 */
.header {
  background-color: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 15px;
  position: relative;
}

.nav-back {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-back:hover {
  background-color: var(--bg-color, #f5f5f5);
}

.nav-back-icon {
  font-size: 20px;
  color: var(--text-color, #333333);
  font-weight: 500;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #333333);
  transition: color 0.3s ease;
}

.nav-placeholder {
  width: 30px;
}

/* 顶部栏 - 保留原有样式供其他地方使用 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.15);
  box-shadow: 
    0 8px 32px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.search-section {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 12px 20px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  color: #1e293b;
  outline: none;
  transition: all 0.3s;
}

.search-input::placeholder {
  color: rgba(100, 116, 139, 0.6);
}

.search-input:focus {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 
    0 0 20px rgba(102, 126, 234, 0.2),
    inset 0 0 10px rgba(102, 126, 234, 0.05);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  border: none;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 
    0 4px 18px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.icon-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 1);
  box-shadow: 
    0 6px 20px rgba(102, 126, 234, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  border-color: rgba(102, 126, 234, 0.3);
}

/* 消息按钮样式 */
.messages-wrapper {
  position: relative;
}

.messages-btn {
  position: relative;
}

.messages-btn .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.messages-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 320px;
  max-width: 400px;
  max-height: 500px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #eef1eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d2f31;
}

.clear-btn {
  border: none;
  background: transparent;
  color: #2f9b52;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.clear-btn:hover {
  background: #e8f4eb;
}

.messages-list {
  max-height: 400px;
  overflow-y: auto;
}

.message-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f7f4;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: background 0.2s ease;
  position: relative;
}

.message-item:hover {
  background: #f8faf8;
}

.message-item.unread {
  background: #f0f8f4;
}

.message-item:last-child {
  border-bottom: none;
}

.message-content {
  flex: 1;
}

.message-title {
  font-weight: 600;
  font-size: 14px;
  color: #2d2f31;
  margin-bottom: 4px;
}

.message-text {
  font-size: 13px;
  color: #6e736c;
  margin-bottom: 4px;
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  color: #99a29b;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #2f9b52;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.empty-messages {
  padding: 40px 16px;
  text-align: center;
  color: #99a29b;
  font-size: 14px;
}

/* 个人信息按钮样式 */
.user-menu-wrapper {
  position: relative;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.user-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8f4eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.user-name {
  font-size: 14px;
  color: #2d2f31;
  font-weight: 500;
}

.chevron {
  font-size: 10px;
  color: #6e736c;
  transition: transform 0.2s ease;
}

.user-btn:hover .chevron {
  transform: translateY(2px);
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

/* 日期显示（在导航栏中） */
.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 
    0 4px 18px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.date-display:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 1);
  box-shadow: 
    0 6px 20px rgba(102, 126, 234, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  border-color: rgba(102, 126, 234, 0.3);
}

.calendar-icon {
  font-size: 16px;
}

.date-text {
  font-size: 14px;
  color: #2d2f31;
  font-weight: 500;
}

.settings-btn svg {
  color: #667eea;
}

.messages-btn svg {
  color: #fbbf24;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
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

.item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

/* 日期显示 */
.date-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  box-shadow: 
    0 4px 16px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.2);
  max-width: fit-content;
  position: relative;
  overflow: hidden;
}

.date-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    rgba(102, 126, 234, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.date-section:hover::before {
  left: 100%;
}

.date-section:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 
    0 6px 24px rgba(102, 126, 234, 0.2),
    0 0 25px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.date-section:hover .date-text {
  color: #667eea;
}

.calendar-icon {
  font-size: 22px;
  transition: transform 0.3s;
}

.date-section:hover .calendar-icon {
  transform: rotate(15deg) scale(1.1);
}

.date-text {
  font-size: 18px;
  color: #475569;
  font-weight: 600;
  transition: all 0.3s;
}

/* 日程主体 */
.schedule-main {
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 24px;
  box-shadow: 
    0 8px 32px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: none;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.schedule-main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%,
    #667eea 50%,
    transparent 100%
  );
  animation: shimmer 3s ease-in-out infinite;
  opacity: 0.6;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* 标题和分类筛选 */
.schedule-header {
  margin-bottom: 20px;
}

.schedule-title {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%, #667eea 200%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
  position: relative;
  animation: titleGlow 3s ease-in-out infinite;
}

@keyframes titleGlow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
}

.category-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 12px 28px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 2px 8px rgba(102, 126, 234, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.category-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    rgba(102, 126, 234, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.category-btn:hover::before {
  left: 100%;
}

.category-btn:hover {
  border-color: rgba(102, 126, 234, 0.4);
  color: #667eea;
  transform: translateY(-2px);
  box-shadow: 
    0 4px 16px rgba(102, 126, 234, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 1);
}

.category-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 
    0 4px 20px rgba(102, 126, 234, 0.4),
    0 0 30px rgba(102, 126, 234, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  animation: activePulse 2s ease-in-out infinite;
}

@keyframes activePulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4), 0 0 30px rgba(102, 126, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.5), 0 0 40px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
}

/* 搜索和添加 */
.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.action-search {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  color: #1e293b;
  transition: all 0.3s;
  box-shadow: 
    0 2px 8px rgba(102, 126, 234, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.action-search::placeholder {
  color: rgba(100, 116, 139, 0.6);
}

.action-search:focus {
  border-color: rgba(102, 126, 234, 0.5);
  background: rgba(255, 255, 255, 1);
  box-shadow: 
    0 4px 16px rgba(102, 126, 234, 0.2),
    0 0 20px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  transform: translateY(-1px);
}

.add-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 20px rgba(102, 126, 234, 0.5),
    0 0 30px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
}

.add-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.add-btn:hover::before {
  width: 200px;
  height: 200px;
}

.add-btn:hover {
  transform: scale(1.15) rotate(90deg);
  box-shadow: 
    0 6px 30px rgba(102, 126, 234, 0.7),
    0 0 50px rgba(102, 126, 234, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.add-btn:active {
  transform: scale(1.05) rotate(90deg);
}

.add-icon {
  line-height: 1;
}

/* 时间轴容器 - 横向布局 */
.timeline-container-horizontal {
  max-height: 600px;
  overflow-x: auto;
  overflow-y: auto;
  padding: 24px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.15);
  box-shadow: 
    inset 0 2px 10px rgba(102, 126, 234, 0.05),
    0 0 30px rgba(102, 126, 234, 0.08);
}

.timeline-horizontal {
  position: relative;
  min-width: fit-content;
}

/* 时间表头行 */
.time-header-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  position: relative;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.05);
}

.time-header-column {
  position: relative;
  min-width: 200px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
}

.time-header-column:hover {
  transform: translateY(-2px);
}

.time-header-column.selected-time-slot .time-label-horizontal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: rgba(102, 126, 234, 0.6);
  box-shadow: 
    0 4px 20px rgba(102, 126, 234, 0.4),
    0 0 30px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.time-header-column.current-time-header .time-label-horizontal {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  box-shadow: 0 4px 12px rgba(254, 243, 199, 0.5);
  transform: scale(1.1);
}

.time-label-horizontal {
  font-size: 16px;
  color: #475569;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 20px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
  box-shadow: 
    0 4px 16px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.2);
  transition: all 0.3s;
  min-width: 90px;
}

.time-header-column.current-time-header .time-label-horizontal {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-color: rgba(251, 191, 36, 0.4);
  box-shadow: 
    0 4px 20px rgba(251, 191, 36, 0.3),
    0 0 25px rgba(251, 191, 36, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  animation: timePulse 2s ease-in-out infinite;
}

@keyframes timePulse {
  0%, 100% { 
    box-shadow: 
      0 4px 20px rgba(251, 191, 36, 0.3),
      0 0 25px rgba(251, 191, 36, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
  50% { 
    box-shadow: 
      0 4px 25px rgba(251, 191, 36, 0.4),
      0 0 35px rgba(251, 191, 36, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }
}

/* 当前时间指示线 */
.current-time-indicator-horizontal {
  position: absolute;
  top: 50px;
  bottom: -20px;
  width: 3px;
  background: linear-gradient(180deg, #ff4444 0%, #ff6b6b 100%);
  z-index: 10;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 
    0 0 8px rgba(255, 68, 68, 0.6),
    0 0 15px rgba(255, 68, 68, 0.4);
  animation: indicatorPulse 2s ease-in-out infinite;
}

@keyframes indicatorPulse {
  0%, 100% { 
    opacity: 1;
    box-shadow: 
      0 0 8px rgba(255, 68, 68, 0.6),
      0 0 15px rgba(255, 68, 68, 0.4);
  }
  50% { 
    opacity: 0.9;
    box-shadow: 
      0 0 12px rgba(255, 68, 68, 0.8),
      0 0 20px rgba(255, 68, 68, 0.6);
  }
}

.current-time-indicator-horizontal::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -8px;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  background: radial-gradient(circle, #ff4444 0%, #ff6b6b 100%);
  border-radius: 50%;
  box-shadow: 
    0 0 8px rgba(255, 68, 68, 0.6),
    0 0 15px rgba(255, 68, 68, 0.4),
    0 0 0 3px rgba(255, 68, 68, 0.2);
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.15); }
}

/* 事件行 */
.events-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.events-column {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.events-column-full {
  width: 100%;
  max-width: none;
}

.events-in-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100px;
}

/* 事件卡片 - 横向布局 */
.event-card-horizontal {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border-left: 4px solid;
  box-shadow: 
    0 4px 16px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.event-card-horizontal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: inherit;
  border-left-color: inherit;
  box-shadow: 0 0 15px currentColor;
  transition: width 0.3s, box-shadow 0.3s;
}

.event-card-horizontal::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 100%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 8px,
    rgba(102, 126, 234, 0.05) 8px,
    rgba(102, 126, 234, 0.05) 16px
  );
  opacity: 0.4;
}

.event-card-horizontal:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 1);
  box-shadow: 
    0 8px 32px rgba(102, 126, 234, 0.2),
    0 0 25px currentColor,
    inset 0 1px 0 rgba(255, 255, 255, 1);
  border-left-width: 6px;
}

.event-card-horizontal:hover::before {
  width: 6px;
  box-shadow: 0 0 20px currentColor;
}

.event-icon-horizontal {
  font-size: 28px;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(102, 126, 234, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s;
}

.event-card-horizontal:hover .event-icon-horizontal {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  box-shadow: 
    0 6px 20px rgba(102, 126, 234, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  transform: scale(1.1) rotate(5deg);
}

.event-content-horizontal {
  flex: 1;
  min-width: 0;
}

.event-title-horizontal {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 10px;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

.event-time-horizontal {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-time-horizontal::before {
  content: '🕐';
  font-size: 12px;
}

.event-responsible-horizontal {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-responsible-horizontal::before {
  content: '👤';
  font-size: 12px;
}

/* 无事件提示 */
.no-events-message {
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.no-events-message p {
  margin: 0;
  padding: 12px;
  background: rgba(241, 245, 249, 0.8);
  border-radius: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
}

/* 滚动条样式 */
.timeline-container-horizontal::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.timeline-container-horizontal::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.timeline-container-horizontal::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: all 0.3s;
  box-shadow: 
    0 0 8px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.timeline-container-horizontal::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  box-shadow: 
    0 0 12px rgba(102, 126, 234, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* 对话框样式 */
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

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

/* 服务类型按钮 */
.service-type-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.service-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.service-type-btn:hover {
  border-color: #4A90E2;
  color: #4A90E2;
  background: #f0f7ff;
}

.service-type-btn.active {
  background: #4A90E2;
  color: white;
  border-color: #4A90E2;
}

.service-type-icon {
  font-size: 16px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #4A90E2;
}

/* 分配给 */
.assigned-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
}

.remove-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #e0e0e0;
  color: #333;
}

/* 员工选择器 */
.staff-selector-wrapper {
  position: relative;
}

.select-staff-btn {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.select-staff-btn:hover:not(:disabled) {
  border-color: #4A90E2;
  color: #4A90E2;
  background: #f0f7ff;
}

.select-staff-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.staff-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.staff-search-wrapper {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.staff-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.staff-search-input:focus {
  border-color: #4A90E2;
}

.staff-list-container {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.staff-option-btn {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.staff-option-btn:hover {
  background: #f0f7ff;
  color: #4A90E2;
}

.no-staff-message {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 日期输入 */
.date-input-wrapper {
  position: relative;
  cursor: pointer;
}

.date-input-wrapper:hover .form-input {
  border-color: #4A90E2;
  background-color: #f9f9f9;
}

.calendar-icon-input {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  pointer-events: none;
}

/* 时间输入 */
.time-inputs {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-arrow {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  width: 32px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
  padding: 0;
}

.time-arrow:hover {
  background: #e0e0e0;
  color: #333;
}

.time-input {
  width: 80px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  text-align: center;
  outline: none;
  font-weight: 500;
}

.time-input:focus {
  border-color: #4A90E2;
}

.time-separator {
  font-size: 18px;
  color: #999;
  font-weight: 500;
}

/* 模态底部 */
.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
}

.save-btn {
  width: 100%;
  padding: 14px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.save-btn:active {
  transform: translateY(0);
}

/* 日程详情弹窗 */
.detail-modal {
  max-width: 520px;
  animation: slideUpDetail 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUpDetail {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.detail-header {
  padding: 24px 28px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.detail-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.detail-icon {
  font-size: 32px;
}

.detail-title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.detail-content {
  padding: 28px;
}

/* 日程详情项 */
.detail-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #e2e8f0;
  transition: all 0.3s;
}

.detail-section:hover {
  background: #f1f5f9;
  border-left-color: #667eea;
  transform: translateX(4px);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-icon {
  font-size: 16px;
  opacity: 0.8;
}

.detail-value {
  font-size: 16px;
  color: #1e293b;
  font-weight: 500;
  line-height: 1.6;
  word-break: break-word;
}

.time-value {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.time-start,
.time-end {
  padding: 8px 16px;
  background: white;
  border-radius: 8px;
  color: #667eea;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.time-separator {
  color: #94a3b8;
  font-size: 16px;
  font-weight: 400;
}

.responsible-value {
  font-size: 17px;
  font-weight: 600;
  color: #475569;
}

.type-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.detail-footer {
  padding: 20px 28px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #fafbfc;
}

.detail-btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  min-width: 100px;
}

.secondary-btn {
  background: white;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

.secondary-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.detail-btn.danger-btn {
  background: #ff4444;
  color: white;
}

.detail-btn.danger-btn:hover {
  background: #cc0000;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4);
}

/* 日期选择器样式 */
.date-picker-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  position: relative;
  padding: 20px;
}

.date-picker-header-info {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
}

.calendar-icon-small {
  font-size: 16px;
}

.calendar-container {
  margin-top: 50px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.month-nav-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-nav-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.month-year {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}

.weekday {
  text-align: center;
  font-size: 14px;
  color: #999;
  font-weight: 500;
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  position: relative;
}

.calendar-day:hover {
  background: #f0f7ff;
  color: #4A90E2;
}

.calendar-day.other-month {
  color: #ccc;
}

.calendar-day.today {
  font-weight: 600;
  color: #4A90E2;
}

.calendar-day.today::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid #4A90E2;
  border-radius: 8px;
  box-sizing: border-box;
}

.calendar-day.selected {
  background: #4CAF50;
  color: white;
  font-weight: 600;
}

.calendar-day.selected.today::before {
  border-color: white;
}

.date-picker-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.save-date-btn {
  width: 100%;
  padding: 14px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-date-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.save-date-btn:active {
  transform: translateY(0);
}

/* 暗色模式样式 */
:global(.dark) .schedule-page {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: #ffffff;
}

:global(.dark) .schedule-page::before {
  background: 
    radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
}

:global(.dark) .top-bar {
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
  color: rgba(148, 163, 184, 0.6);
}

:global(.dark) .date-display {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .date-display .date-text {
  color: #e2e8f0;
}

:global(.dark) .date-section {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .date-text {
  color: #e2e8f0;
}

:global(.dark) .schedule-main {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .schedule-title {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark) .category-btn {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #cbd5e1;
}

:global(.dark) .category-btn:hover {
  border-color: rgba(102, 126, 234, 0.5);
  color: #ffffff;
  background: rgba(51, 65, 85, 0.9);
}

:global(.dark) .category-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

:global(.dark) .action-search {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .action-search::placeholder {
  color: rgba(148, 163, 184, 0.6);
}

:global(.dark) .timeline-container-horizontal {
  background: rgba(15, 23, 42, 0.5);
  border-color: rgba(102, 126, 234, 0.3);
}

:global(.dark) .time-label-horizontal {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(102, 126, 234, 0.3);
  color: #cbd5e1;
}

:global(.dark) .time-header-column.selected-time-slot .time-label-horizontal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

:global(.dark) .event-card-horizontal {
  background: rgba(30, 41, 59, 0.95);
  color: #ffffff;
}

:global(.dark) .event-title-horizontal {
  color: #ffffff;
}

:global(.dark) .event-time-horizontal {
  color: #94a3b8;
}

:global(.dark) .event-responsible-horizontal {
  color: #cbd5e1;
}

:global(.dark) .modal-dialog {
  background: #1e293b;
  color: #ffffff;
}

:global(.dark) .modal-title {
  color: #ffffff;
}

:global(.dark) .form-input {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #ffffff;
}

:global(.dark) .form-input::placeholder {
  color: rgba(148, 163, 184, 0.6);
}

:global(.dark) .detail-section {
  background: rgba(30, 41, 59, 0.9);
  border-left-color: #667eea;
}

:global(.dark) .detail-label {
  color: #94a3b8;
}

:global(.dark) .detail-value {
  color: #ffffff;
}

:global(.dark) .no-events-message {
  color: #94a3b8;
}

:global(.dark) .no-events-message p {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(102, 126, 234, 0.3);
  color: #94a3b8;
}
</style>
