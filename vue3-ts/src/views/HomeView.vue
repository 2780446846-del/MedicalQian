<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import * as echarts from 'echarts'
// @ts-ignore
import { use } from 'echarts/core'
// @ts-ignore
import { CanvasRenderer } from 'echarts/renderers'
// @ts-ignore
import { GaugeChart, LineChart } from 'echarts/charts'
// @ts-ignore
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
// @ts-ignore
import VChart from 'vue-echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  GaugeChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const router = useRouter()
const authStore = useAuthStore()

// 是否为暗色模式（根据 html 上是否有 .dark class 判断）
const isDark = computed(() => {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
})

// 获取用户名（格式化显示：只显示第一个字符+**）
const displayUsername = computed(() => {
  if (authStore.userInfo?.username) {
    const username = authStore.userInfo.username
    if (username.length > 0) {
      return username.length > 1 ? `${username[0]}**` : `${username}**`
    }
  }
  return '用户**'
})

// 获取完整用户名（用于下拉菜单显示）
const fullUsername = computed(() => {
  return authStore.userInfo?.username || '用户'
})

// 消息类型定义
interface Message {
  id: number
  title: string
  content: string
  time: string
  unread: boolean
}

// 消息列表显示状态
const showMessages = ref(false)

// 个人信息下拉菜单显示状态
const showUserMenu = ref(false)

// 示例消息数据
const messages = ref([
  { id: 1, title: '新患者预约', content: '患者张三预约了明天的门诊', time: '10分钟前', unread: true },
  { id: 2, title: '系统通知', content: '系统将在今晚进行维护', time: '1小时前', unread: true },
  { id: 3, title: '预约提醒', content: '您有3个待处理的预约', time: '2小时前', unread: false },
] as Message[])

// 计算属性
const hasUnreadMessages = computed(() => {
  return messages.value.some((m: Message) => m.unread)
})

const unreadCount = computed(() => {
  return messages.value.filter((m: Message) => m.unread).length
})

// 将消息标记为已读
const markAsRead = (message: Message) => {
  message.unread = false
}

// 标记所有消息为已读
const markAllAsRead = () => {
  messages.value = messages.value.map((m: Message) => {
    return { ...m, unread: false }
  })
}

// 预约筛选
const appointmentFilter = ref('all') // all, male, female

// 预约项类型
interface Appointment {
  id: number
  name: string
  gender: 'male' | 'female'
  time: string
  reason: string
  avatar: string
}

// 预约列表数据
const appointments = ref<Appointment[]>([
  { id: 1, name: '苏**', gender: 'female', time: '13:00-00', reason: '头痛病', avatar: '👩' },
  { id: 2, name: '刘**', gender: 'male', time: '12:30-00', reason: '牙痛', avatar: '👨' },
  { id: 3, name: '杜**', gender: 'female', time: '14:00-00', reason: '减肥', avatar: '👩' },
  { id: 4, name: '徐**', gender: 'male', time: '15:30-00', reason: '感冒', avatar: '👨' },
  { id: 5, name: '韩**', gender: 'female', time: '16:00-00', reason: '体检', avatar: '👩' },
])

// 患者统计数据
const patientStats = ref({
  inTreatment: 125,
  recovered: 96,
  monthlyData: [120, 130, 115, 140, 125, 135, 125] // 1-7月数据
})

// 患者总数
const totalPatients = ref({
  value: 221,
  change: -25,
  changeType: 'decrease'
})

// 科室数据
const departments = ref([
  { name: '全科', change: 20, changeType: 'increase', patients: 200, progress: 65 },
  { name: '儿科', change: -25, changeType: 'decrease', patients: 320, progress: 80 },
  { name: '心脏科', change: 10, changeType: 'increase', patients: 100, progress: 50 },
  { name: '皮肤科', change: 10, changeType: 'increase', patients: 80, progress: 40 },
])

// 预约总数
const totalAppointments = ref({
  value: 160,
  change: 25,
  changeType: 'increase'
})

// 空闲诊室
const availableRooms = ref({
  total: 200,
  available: 150,
  unavailable: 50,
  availablePercent: 75
})

// 救护车总数
const totalAmbulances = ref({
  value: 100,
  change: 25,
  changeType: 'increase'
})

// 患者性别分布
const patientGender = ref({
  male: 75,
  female: 25
})

// 医生与护士
const staffStats = ref({
  nurses: 200000,
  doctors: 80000
})

// 图表引用
const patientChartRef = ref<HTMLDivElement | null>(null)
const totalPatientsChartRef = ref<HTMLDivElement | null>(null)
const appointmentsChartRef = ref<HTMLDivElement | null>(null)
const ambulancesChartRef = ref<HTMLDivElement | null>(null)
const roomsChartRef = ref<HTMLDivElement | null>(null)
const genderChartRef = ref<HTMLDivElement | null>(null)

let patientChart: echarts.ECharts | null = null
let totalPatientsChart: echarts.ECharts | null = null
let appointmentsChart: echarts.ECharts | null = null
let ambulancesChart: echarts.ECharts | null = null
let roomsChart: echarts.ECharts | null = null
let genderChart: echarts.ECharts | null = null

// 初始化
onMounted(() => {
  // 初始化图表
  nextTick(() => {
    initCharts()
  })
})

// 获取图表颜色
const getChartColors = () => {
  return {
    textColor: '#6e736c',
    gridColor: '#f5f7f4',
    axisLineColor: '#e3e7e1'
  }
}

// 初始化所有图表
const initCharts = () => {
  // 优化：使用 requestAnimationFrame 分批初始化，避免阻塞UI
  requestAnimationFrame(() => {
  initPatientChart()
  initTotalPatientsChart()
    
    requestAnimationFrame(() => {
  initAppointmentsChart()
  initAmbulancesChart()
      
      requestAnimationFrame(() => {
  initRoomsChart()
  initGenderChart()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
      })
    })
  })
}

// 处理窗口大小变化（添加防抖）
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  // 优化：防抖处理，避免频繁触发
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  resizeTimer = setTimeout(() => {
  patientChart?.resize()
  totalPatientsChart?.resize()
  appointmentsChart?.resize()
  ambulancesChart?.resize()
  roomsChart?.resize()
  genderChart?.resize()
  }, 150)
}

// 初始化患者图表（柱状图）
const initPatientChart = () => {
  if (!patientChartRef.value) return

  patientChart = echarts.init(patientChartRef.value)
  const colors = getChartColors()
  const option = {
    grid: { left: '10%', right: '10%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
      axisLabel: { fontSize: 10, color: colors.textColor },
      axisLine: { lineStyle: { color: colors.axisLineColor } }
    },
    yAxis: {
      type: 'value',
      max: 150,
      axisLabel: { fontSize: 10, color: colors.textColor },
      splitLine: { lineStyle: { color: colors.gridColor } }
    },
    series: [{
      data: patientStats.value.monthlyData,
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#2f9b52' },
          { offset: 1, color: '#35b15a' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '50%'
    }]
  }
  patientChart.setOption(option)
}

// 初始化患者总数图表（趋势图）
const initTotalPatientsChart = () => {
  if (!totalPatientsChartRef.value) return

  totalPatientsChart = echarts.init(totalPatientsChartRef.value)
  const option = {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [{
      data: [250, 240, 230, 225, 221],
      type: 'line',
      smooth: true,
      lineStyle: { color: '#ff4444', width: 2 },
      areaStyle: { color: 'rgba(255, 68, 68, 0.1)' },
      symbol: 'circle',
      symbolSize: 4
    }]
  }
  totalPatientsChart.setOption(option)
}

// 初始化预约总数图表（趋势图）
const initAppointmentsChart = () => {
  if (!appointmentsChartRef.value) return

  appointmentsChart = echarts.init(appointmentsChartRef.value)
  const option = {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [{
      data: [120, 130, 140, 150, 160],
      type: 'line',
      smooth: true,
      lineStyle: { color: '#2f9b52', width: 2 },
      areaStyle: { color: 'rgba(47, 155, 82, 0.1)' },
      symbol: 'circle',
      symbolSize: 4
    }]
  }
  appointmentsChart.setOption(option)
}

// 初始化救护车图表（趋势图）
const initAmbulancesChart = () => {
  if (!ambulancesChartRef.value) return

  ambulancesChart = echarts.init(ambulancesChartRef.value)
  const option = {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [{
      data: [75, 80, 85, 90, 95, 100],
      type: 'bar',
      itemStyle: {
        color: '#2f9b52',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '60%'
    }]
  }
  ambulancesChart.setOption(option)
}

// 初始化诊室图表（饼图）
const initRoomsChart = () => {
  if (!roomsChartRef.value) return

  roomsChart = echarts.init(roomsChartRef.value)
  const option = {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      center: ['50%', '50%'],
      data: [
        { value: availableRooms.value.availablePercent, name: '可用', itemStyle: { color: '#2f9b52' } },
        { value: 100 - availableRooms.value.availablePercent, name: '不可用', itemStyle: { color: '#ffc107' } }
      ],
      label: { show: false },
      emphasis: { label: { show: false } }
    }]
  }
  roomsChart.setOption(option)
}

// 初始化患者性别图表（饼图）
const initGenderChart = () => {
  if (!genderChartRef.value) return

  genderChart = echarts.init(genderChartRef.value)
  const option = {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      center: ['50%', '50%'],
      data: [
        { value: patientGender.value.male, name: '男性', itemStyle: { color: '#2f9b52' } },
        { value: patientGender.value.female, name: '女性', itemStyle: { color: '#ffc107' } }
      ],
      label: { show: false },
      emphasis: { label: { show: false } }
    }]
  }
  genderChart.setOption(option)
}

// 切换预约筛选
const setAppointmentFilter = (filter: string) => {
  appointmentFilter.value = filter
}

// 打电话
const callPatient = (appointment: Appointment) => {
  console.log('打电话给:', appointment.name)
}

// 发消息
const sendMessage = (appointment: Appointment) => {
  console.log('发消息给:', appointment.name)
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-menu-wrapper') && !target.closest('.user-btn')) {
    showUserMenu.value = false
  }
  if (!target.closest('.messages-dropdown') && !target.closest('.messages-btn')) {
    showMessages.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  
  // 清理防抖定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  // 销毁图表
  patientChart?.dispose()
  totalPatientsChart?.dispose()
  appointmentsChart?.dispose()
  ambulancesChart?.dispose()
  roomsChart?.dispose()
  genderChart?.dispose()
})

// 处理菜单项点击
const handleMenuClick = (action: string) => {
  showUserMenu.value = false
  if (action === 'logout') {
    // 退出登录
    authStore.logout()
    router.push('/login')
  } else if (action === 'settings') {
    // 这里可以添加跳转到设置页面的逻辑
    console.log('打开设置')
  } else if (action === 'profile') {
    // 跳转到个人资料页面
    router.push('/profile')
  }
}

// 数据健康仪表盘数据
const satisfactionScore = ref(6000) // 满意度分数
const industryAverage = ref(5500) // 行业平均分
const contactsCount = ref(15) // 当前联系人数量

// 联系人增长趋势数据（最近7个月）
const contactsTrendData = ref({
  months: ['7月', '8月', '9月', '10月', '11月', '12月', '1月'],
  values: [8, 10, 12, 11, 13, 14, 15]
})

// 计算本月增长
const monthlyGrowth = computed(() => {
  const values = contactsTrendData.value?.values ?? []
  if (values.length < 2) return 0
  const lastValue = values[values.length - 1] || 0
  const prevValue = values[values.length - 2] || 0
  return lastValue - prevValue
})

// 计算增长率
const growthRate = computed(() => {
  const values = contactsTrendData.value?.values ?? []
  if (values.length === 0 || values[0] === 0) return '0'
  const firstValue = values[0] || 1
  const lastValue = values[values.length - 1] || 0
  const rate = ((lastValue - firstValue) / firstValue) * 100
  return rate.toFixed(1)
})

// 满意度温度计式进度条配置
const satisfactionGaugeOption = computed(() => {
  // 使用可选链和默认值避免对象可能为“未定义”的错误
  const satisfactionValue = satisfactionScore.value || 0
  const industryValue = industryAverage.value || 0
  
  return {
    series: [
      {
        name: '满意度',
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 10000,
        splitNumber: 10,
        itemStyle: {
          color: '#2f9b52'
        },
        progress: {
          show: true,
          width: 18
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 18
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        title: {
          show: false
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 20,
          borderRadius: 8,
          offsetCenter: [0, '-15%'],
          fontSize: 20,
          fontWeight: 'bold',
          formatter: '{value}',
          color: '#2f9b52'
        },
        data: [
          {
            value: satisfactionValue,
            name: '满意度'
          }
        ]
      },
      {
        name: '行业平均',
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 10000,
        itemStyle: {
          color: '#7a8088'
        },
        progress: {
          show: true,
          width: 12,
          overlap: false,
          roundCap: true
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 12
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        title: {
          show: false
        },
        detail: {
          show: false
        },
        data: [
          {
            value: industryValue,
            name: '行业平均'
          }
        ]
      }
    ]
  }
})

// 联系人增长曲线图配置
const contactsLineOption = computed(() => {
  const isDarkMode = isDark.value
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDarkMode ? '#1e2a3a' : '#fff',
      borderColor: isDarkMode ? '#253447' : '#eef1eb',
      textStyle: {
        color: isDarkMode ? '#ffffff' : '#2d2f31'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: contactsTrendData.value.months,
      axisLine: {
        lineStyle: {
          color: isDarkMode ? '#253447' : '#eef1eb'
        }
      },
      axisLabel: {
        color: isDarkMode ? '#9eb3c7' : '#6e736c',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: isDarkMode ? '#9eb3c7' : '#6e736c',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: isDarkMode ? '#253447' : '#eef1eb',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '联系人数量',
        type: 'line',
        smooth: true,
        data: contactsTrendData.value.values,
        itemStyle: {
          color: '#2f9b52'
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
                color: 'rgba(47, 155, 82, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(47, 155, 82, 0.05)'
              }
            ]
          }
        },
        lineStyle: {
          width: 3
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
})
</script>

<template>
  <div class="content">
    <header class="topbar">
      <div class="search">
        <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M8.5 2a6.5 6.5 0 0 1 5.174 10.39l3.468 3.468a1 1 0 1 1-1.414 1.414l-3.468-3.468A6.5 6.5 0 1 1 8.5 2Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"
            fill="currentColor"
          />
        </svg>
        <input type="text" placeholder="搜索" />
      </div>
      <div class="top-actions">
        <!-- 消息按钮 -->
        <div class="messages-wrapper">
          <button
            class="icon-btn messages-btn"
            aria-label="messages"
            @click.stop="showMessages = !showMessages"
            :class="{ 'has-unread': hasUnreadMessages }"
          >
            💬
            <span v-if="hasUnreadMessages" class="badge">{{ unreadCount }}</span>
          </button>

          <!-- 消息下拉列表 -->
          <div v-if="showMessages" class="messages-dropdown">
            <div class="dropdown-header">
              <h3>消息</h3>
              <button class="clear-btn" @click="markAllAsRead">全部已读</button>
            </div>
            <div class="messages-list">
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-item"
                :class="{ unread: message.unread }"
                @click="markAsRead(message)"
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
            <span class="user-name">{{ displayUsername }}</span>
            <span class="chevron">▼</span>
          </button>

          <!-- 个人信息下拉菜单 -->
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="handleMenuClick('profile')">
              <span class="item-icon">👤</span>
              <span>{{ fullUsername }}</span>
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
    </header>

    <section class="dashboard-grid">
      <div class="panel-grid">
        <div class="card appointments span-2">
          <div class="card-header">
            <div class="title">预约</div>
            <div class="filters">
              <button
                class="chip"
                :class="{ active: appointmentFilter === 'all' }"
                @click="setAppointmentFilter('all')"
              >全部</button>
              <button
                class="chip"
                :class="{ active: appointmentFilter === 'male' }"
                @click="setAppointmentFilter('male')"
              >男性</button>
              <button
                class="chip"
                :class="{ active: appointmentFilter === 'female' }"
                @click="setAppointmentFilter('female')"
              >女性</button>
              <button class="chip light">今天</button>
            </div>
          </div>
          <div class="appointments-list">
            <div
              v-for="appointment in appointments"
              :key="appointment.id"
              class="appointment-item"
            >
              <div class="appointment-avatar">{{ appointment.avatar }}</div>
              <div class="appointment-content">
                <div class="appointment-header">
                  <span class="appointment-time">{{ appointment.time }}</span>
                  <span class="appointment-gender" :class="appointment.gender">
                    {{ appointment.gender === 'male' ? '♂' : '♀' }}
                  </span>
                </div>
                <div class="appointment-name">{{ appointment.name }}</div>
                <div class="appointment-reason">{{ appointment.reason }}</div>
              </div>
              <div class="appointment-actions">
                <button class="action-btn call-btn" @click="callPatient(appointment)">📞</button>
                <button class="action-btn message-btn" @click="sendMessage(appointment)">✈️</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="title">患者</div>
            <span class="chip light">本月</span>
          </div>
          <div class="patient-stats">
            <div class="patient-numbers">
              <div class="patient-number-item">
                <div class="patient-number-value">{{ patientStats.inTreatment }}</div>
                <div class="patient-number-label">治疗中</div>
              </div>
              <div class="patient-number-item">
                <div class="patient-number-value">{{ patientStats.recovered }}</div>
                <div class="patient-number-label">已康复</div>
              </div>
            </div>
            <div class="patient-chart" ref="patientChartRef"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="title">科室</div>
            <span class="chip light">本月</span>
          </div>
          <div class="departments-list">
            <div
              v-for="dept in departments"
              :key="dept.name"
              class="department-item"
            >
              <div class="department-header">
                <span class="department-name">{{ dept.name }}</span>
                <span
                  class="department-change"
                  :class="dept.changeType"
                >
                  {{ dept.changeType === 'increase' ? '+' : '' }}{{ dept.change }}%
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: dept.progress + '%', backgroundColor: dept.changeType === 'increase' ? '#2f9b52' : '#ffc107' }"
                ></div>
              </div>
              <div class="department-patients">{{ dept.patients }} 患者</div>
            </div>
          </div>
        </div>


        <div class="card">
          <div class="card-header">
            <div class="title">患者性别</div>
          </div>
          <div class="gender-chart-container">
            <div class="gender-chart" ref="genderChartRef"></div>
            <div class="gender-legend">
              <div class="legend-item">
                <span class="legend-dot male"></span>
                <span class="legend-label">男性</span>
                <span class="legend-value">{{ patientGender.male }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot female"></span>
                <span class="legend-label">女性</span>
                <span class="legend-value">{{ patientGender.female }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="title">医生与护士</div>
          </div>
          <div class="staff-stats">
            <div class="staff-item">
              <span class="staff-dot green"></span>
              <span class="staff-label">护士</span>
              <span class="staff-value">{{ staffStats.nurses.toLocaleString() }}</span>
            </div>
            <div class="staff-item">
              <span class="staff-dot yellow"></span>
              <span class="staff-label">医生</span>
              <span class="staff-value">{{ staffStats.doctors.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="stat-column">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-label">患者总数</div>
            <span
              class="stat-change"
              :class="totalPatients.changeType"
            >
              {{ totalPatients.changeType === 'increase' ? '+' : '' }}{{ totalPatients.change }}%
            </span>
          </div>
          <div class="stat-value">{{ totalPatients.value }}</div>
          <div class="stat-chart-small" ref="totalPatientsChartRef"></div>
          <div class="stat-desc">患者数量已下降 {{ Math.abs(totalPatients.change) }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-label">预约总数</div>
            <span
              class="stat-change"
              :class="totalAppointments.changeType"
            >
              +{{ totalAppointments.change }}%
            </span>
          </div>
          <div class="stat-value">{{ totalAppointments.value }}</div>
          <div class="stat-chart-small" ref="appointmentsChartRef"></div>
          <div class="stat-desc">预约量增加了 {{ totalAppointments.change }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-label">空闲诊室</div>
          </div>
          <div class="stat-value">{{ availableRooms.total }}</div>
          <div class="rooms-chart-container">
            <div class="rooms-chart" ref="roomsChartRef"></div>
            <div class="rooms-legend">
              <div class="rooms-legend-item">
                <span>{{ availableRooms.availablePercent }}% 可用</span>
              </div>
              <div class="rooms-legend-item">
                <span>{{ 100 - availableRooms.availablePercent }}% 不可用</span>
              </div>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-label">救护车总数</div>
          </div>
          <div class="stat-value">{{ totalAmbulances.value }}</div>
          <div class="stat-chart-small" ref="ambulancesChartRef"></div>
          <div class="stat-desc">救护车数量增长了{{ totalAmbulances.change }}%</div>
        </div>
      </div>
    </section>

    <!-- 数据健康仪表盘 -->
    <section class="health-dashboard">
      <div class="dashboard-title">数据健康仪表盘</div>
      <div class="dashboard-grid">
        <!-- 满意度卡片 -->
        <div class="health-card satisfaction-card">
          <div class="health-card-header">
            <h3 class="health-card-title">满意度</h3>
            <div class="health-card-badge">
              <span class="badge-text">行业对比</span>
            </div>
          </div>
          <div class="satisfaction-content-wrapper">
            <div class="gauge-container">
              <v-chart
                class="gauge-chart"
                :option="satisfactionGaugeOption"
                autoresize
              />
            </div>
            <div class="satisfaction-info">
              <div class="satisfaction-main-score">{{ satisfactionScore.toLocaleString() }}</div>
              <div class="satisfaction-subtitle">当前满意度分数</div>
              <div class="satisfaction-comparison">
                <div class="comparison-item">
                  <span class="comparison-label">行业平均</span>
                  <span class="comparison-value">{{ industryAverage.toLocaleString() }}</span>
                </div>
                <div class="comparison-item highlight">
                  <span class="comparison-label">超出</span>
                  <span class="comparison-value positive">
                    +{{ (satisfactionScore - industryAverage).toLocaleString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系人增长卡片 -->
        <div class="health-card contacts-card">
          <div class="health-card-header">
            <h3 class="health-card-title">联系人</h3>
            <div class="health-card-badge">
              <span class="badge-text">增长趋势</span>
            </div>
          </div>
          <div class="contacts-content-wrapper">
            <div class="contacts-main-value">
              <span class="contacts-number">{{ contactsCount }}</span>
              <span class="contacts-label">当前联系人</span>
            </div>
            <div class="contacts-chart-container">
              <v-chart
                class="contacts-chart"
                :option="contactsLineOption"
                autoresize
              />
            </div>
            <div class="contacts-trend-info">
              <div class="trend-item">
                <span class="trend-label">本月增长</span>
                <span class="trend-value positive">+{{ monthlyGrowth }}</span>
              </div>
              <div class="trend-item">
                <span class="trend-label">增长率</span>
                <span class="trend-value positive">{{ growthRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.content {
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 10px 14px;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
  min-width: 280px;
}

.search input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 14px;
  background: transparent;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #9aa29a;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  border: none;
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  position: relative;
}

.icon-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
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

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 0.9fr;
  gap: 16px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.stat-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card,
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  border: 1px solid #eef1eb;
}

.appointments {
  height: 260px;
  background: linear-gradient(135deg, #f5fbf6, #f2f6f2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-weight: 700;
  font-size: 16px;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid #e3e7e1;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  color: #5c625b;
  cursor: pointer;
}

.chip.active {
  background: #2f9b52;
  color: #fff;
  border-color: #2f9b52;
}

.chip.light {
  background: #f2f5f1;
  color: #5c625b;
}

.empty {
  height: calc(100% - 40px);
  display: grid;
  place-items: center;
  text-align: center;
  color: #6e736c;
}

.empty.small {
  height: auto;
  padding: 14px 0;
}

.empty-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #e7f4eb;
  display: grid;
  place-items: center;
  margin: 0 auto 8px;
  color: #2f9b52;
  font-size: 18px;
}

.empty-title {
  font-weight: 700;
  color: #2f9b52;
  margin-bottom: 4px;
}

.empty-subtitle {
  font-size: 13px;
  color: #7a8078;
}

.span-2 {
  grid-column: span 2;
}

.pill-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.pill {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  background: #f6f8f4;
  border-radius: 12px;
}

.pill-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
}

.pill-icon.green {
  background: #35b15a;
}

.pill-icon.blue {
  background: #2f7bd9;
}

.pill-icon.gray {
  background: #7a8088;
}

.pill-title {
  font-weight: 700;
  color: #3a4037;
}

.pill-subtitle {
  color: #7a8078;
  font-size: 13px;
}

.stat-card {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(145deg, #f7fbf7, #f0f5f0);
}

.stat-label {
  font-size: 14px;
  color: #4b5148;
}

.stat-value {
  font-weight: 700;
  color: #2f9b52;
  font-size: 24px;
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-change {
  font-size: 12px;
  font-weight: 600;
}

.stat-change.increase {
  color: #2f9b52;
}

.stat-change.decrease {
  color: #ff4444;
}

.stat-desc {
  font-size: 12px;
  color: #7a8078;
  margin-top: 8px;
}

.stat-chart-small {
  width: 100%;
  height: 50px;
  margin: 8px 0;
}

/* 预约列表样式 */
.appointments-list {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.appointment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f7f4;
}

.appointment-item:last-child {
  border-bottom: none;
}

.appointment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e8f4eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.appointment-content {
  flex: 1;
  min-width: 0;
}

.appointment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.appointment-time {
  font-size: 12px;
  color: #6e736c;
  font-weight: 500;
}

.appointment-gender {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.appointment-gender.male {
  background: #e3f2fd;
  color: #2f7bd9;
}

.appointment-gender.female {
  background: #fce4ec;
  color: #e91e63;
}

.appointment-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d2f31;
  margin-bottom: 2px;
}

.appointment-reason {
  font-size: 12px;
  color: #7a8078;
}

.appointment-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f5f7f4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #e8f4eb;
  transform: scale(1.05);
}

.call-btn:hover {
  background: #e8f4eb;
}

.message-btn:hover {
  background: #e8f4eb;
}

/* 患者统计样式 */
.patient-stats {
  padding-top: 8px;
}

.patient-numbers {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12px;
}

.patient-number-item {
  text-align: center;
}

.patient-number-value {
  font-size: 24px;
  font-weight: 700;
  color: #2f9b52;
  margin-bottom: 4px;
}

.patient-number-label {
  font-size: 12px;
  color: #7a8078;
}

.patient-chart {
  width: 100%;
  height: 120px;
}

/* 科室列表样式 */
.departments-list {
  padding-top: 8px;
}

.department-item {
  margin-bottom: 16px;
}

.department-item:last-child {
  margin-bottom: 0;
}

.department-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.department-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d2f31;
}

.department-change {
  font-size: 12px;
  font-weight: 600;
}

.department-change.increase {
  color: #2f9b52;
}

.department-change.decrease {
  color: #ff4444;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f5f7f4;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.department-patients {
  font-size: 12px;
  color: #7a8078;
}

/* 性别图表样式 */
.gender-chart-container {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gender-chart {
  width: 120px;
  height: 120px;
  margin-bottom: 12px;
}

.gender-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot.male {
  background: #2f9b52;
}

.legend-dot.female {
  background: #ffc107;
}

.legend-label {
  font-size: 13px;
  color: #5c625b;
  flex: 1;
}

.legend-value {
  font-size: 13px;
  font-weight: 600;
  color: #2d2f31;
}

/* 医生与护士样式 */
.staff-stats {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.staff-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.staff-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.staff-dot.green {
  background: #2f9b52;
}

.staff-dot.yellow {
  background: #ffc107;
}

.staff-label {
  font-size: 14px;
  color: #5c625b;
  flex: 1;
}

.staff-value {
  font-size: 16px;
  font-weight: 700;
  color: #2d2f31;
}

/* 诊室图表样式 */
.rooms-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.rooms-chart {
  width: 100px;
  height: 100px;
  margin-bottom: 8px;
}

.rooms-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  font-size: 12px;
  color: #7a8078;
}

.rooms-legend-item {
  text-align: center;
}

@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 200px 1fr;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .stat-column {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .stat-card {
    flex: 1 1 200px;
  }
}

@media (max-width: 820px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}


:global(.dark) .card,
:global(.dark) .stat-card {
  background: #1e2a3a !important;
  border-color: #253447 !important;
  color: #ffffff !important;
}

:global(.dark) .appointments {
  background: linear-gradient(135deg, #1e2a3a, #16202d) !important;
}

:global(.dark) .title,
:global(.dark) .stat-label,
:global(.dark) .stat-value {
  color: #ffffff !important;
}

:global(.dark) .chip {
  background: #253447 !important;
  border-color: #2d3f54 !important;
  color: #ffffff !important;
}

:global(.dark) .chip.active {
  background: #4fc3f7 !important;
  border-color: #4fc3f7 !important;
  color: #ffffff !important;
}

:global(.dark) .chip.light {
  background: #253447 !important;
  color: #9eb3c7 !important;
}

:global(.dark) .empty {
  color: #ffffff !important;
}

:global(.dark) .empty-title {
  color: #4fc3f7 !important;
}

:global(.dark) .empty-subtitle {
  color: #9eb3c7 !important;
}

:global(.dark) .empty-icon {
  background: #253447 !important;
  color: #4fc3f7 !important;
}

:global(.dark) .pill {
  background: #253447 !important;
}

:global(.dark) .pill-title {
  color: #ffffff !important;
}

:global(.dark) .pill-subtitle {
  color: #9eb3c7 !important;
}

:global(.dark) .search {
  background: #1e2a3a !important;
  border-color: #253447 !important;
}

:global(.dark) .search input {
  color: #ffffff !important;
}

:global(.dark) .search input::placeholder {
  color: #9eb3c7 !important;
}

:global(.dark) .icon-btn,
:global(.dark) .user-btn {
  background: #1e2a3a !important;
  border-color: #253447 !important;
  color: #ffffff !important;
}

:global(.dark) .user-name {
  color: #ffffff !important;
}

:global(.dark) .chevron {
  color: #9eb3c7 !important;
}

:global(.dark) .messages-dropdown,
:global(.dark) .user-dropdown {
  background: #1e2a3a !important;
  border-color: #253447 !important;
}

:global(.dark) .dropdown-header h3 {
  color: #ffffff !important;
}

:global(.dark) .clear-btn {
  color: #4fc3f7 !important;
}

:global(.dark) .clear-btn:hover {
  background: #253447 !important;
}

:global(.dark) .message-item {
  border-bottom-color: #253447 !important;
  color: #ffffff !important;
}

:global(.dark) .message-item:hover {
  background: #253447 !important;
}

:global(.dark) .message-item.unread {
  background: #1a2332 !important;
}

:global(.dark) .message-title {
  color: #ffffff !important;
}

:global(.dark) .message-text {
  color: #9eb3c7 !important;
}

:global(.dark) .message-time {
  color: #6b8aa3 !important;
}

:global(.dark) .empty-messages {
  color: #9eb3c7 !important;
}

:global(.dark) .dropdown-item {
  color: #ffffff !important;
}

:global(.dark) .dropdown-item:hover {
  background: #253447 !important;
}

:global(.dark) .dropdown-item:last-child {
  border-top-color: #253447 !important;
  color: #ff6b6b !important;
}

:global(.dark) .appointment-item {
  border-bottom-color: #253447 !important;
}

:global(.dark) .appointment-name {
  color: #ffffff !important;
}

:global(.dark) .appointment-reason {
  color: #9eb3c7 !important;
}

:global(.dark) .action-btn {
  background: #253447 !important;
}

:global(.dark) .action-btn:hover {
  background: #2d3f54 !important;
}

:global(.dark) .department-name {
  color: #ffffff !important;
}

:global(.dark) .department-patients {
  color: #9eb3c7 !important;
}

:global(.dark) .progress-bar {
  background: #253447 !important;
}

:global(.dark) .legend-label,
:global(.dark) .staff-label {
  color: #9eb3c7 !important;
}

:global(.dark) .legend-value,
:global(.dark) .staff-value {
  color: #ffffff !important;
}

:global(.dark) .rooms-legend-item {
  color: #9eb3c7 !important;
}

/* 数据健康仪表盘样式 */
.health-dashboard {
  margin-top: 24px;
}

.dashboard-title {
  font-size: 20px;
  font-weight: 700;
  color: #2d2f31;
  margin-bottom: 16px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.health-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  border: 1px solid #eef1eb;
}

.health-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.health-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d2f31;
  margin: 0;
}

.health-card-badge {
  background: #f2f5f1;
  padding: 4px 12px;
  border-radius: 12px;
}

.badge-text {
  font-size: 12px;
  color: #5c625b;
  font-weight: 500;
}

/* 满意度卡片 */
.satisfaction-content-wrapper {
  display: flex;
  gap: 24px;
  align-items: center;
}

.gauge-container {
  flex-shrink: 0;
  width: 200px;
  height: 150px;
}

.gauge-chart {
  width: 100%;
  height: 100%;
}

.satisfaction-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.satisfaction-main-score {
  font-size: 36px;
  font-weight: 700;
  color: #2f9b52;
  line-height: 1;
}

.satisfaction-subtitle {
  font-size: 14px;
  color: #6e736c;
}

.satisfaction-comparison {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #eef1eb;
}

.comparison-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-item.highlight {
  padding: 8px 12px;
  background: #f0f8f4;
  border-radius: 8px;
}

.comparison-label {
  font-size: 13px;
  color: #6e736c;
}

.comparison-value {
  font-size: 14px;
  font-weight: 600;
  color: #2d2f31;
}

.comparison-value.positive {
  color: #2f9b52;
}

/* 联系人卡片 */
.contacts-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contacts-main-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.contacts-number {
  font-size: 48px;
  font-weight: 700;
  color: #2f9b52;
  line-height: 1;
}

.contacts-label {
  font-size: 16px;
  color: #6e736c;
  font-weight: 500;
}

.contacts-chart-container {
  width: 100%;
  height: 200px;
}

.contacts-chart {
  width: 100%;
  height: 100%;
}

.contacts-trend-info {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid #eef1eb;
}

.trend-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-label {
  font-size: 12px;
  color: #6e736c;
}

.trend-value {
  font-size: 18px;
  font-weight: 700;
  color: #2d2f31;
}

.trend-value.positive {
  color: #2f9b52;
}

/* 暗色模式 - 数据健康仪表盘 */
:global(.dark) .dashboard-title {
  color: #ffffff !important;
}

:global(.dark) .health-card {
  background: #1e2a3a !important;
  border-color: #253447 !important;
}

:global(.dark) .health-card-title {
  color: #ffffff !important;
}

:global(.dark) .health-card-badge {
  background: #253447 !important;
}

:global(.dark) .badge-text {
  color: #9eb3c7 !important;
}

:global(.dark) .satisfaction-main-score {
  color: #4fc3f7 !important;
}

:global(.dark) .satisfaction-subtitle {
  color: #9eb3c7 !important;
}

:global(.dark) .satisfaction-comparison {
  border-top-color: #253447 !important;
}

:global(.dark) .comparison-label {
  color: #9eb3c7 !important;
}

:global(.dark) .comparison-value {
  color: #ffffff !important;
}

:global(.dark) .comparison-value.positive {
  color: #4fc3f7 !important;
}

:global(.dark) .comparison-item.highlight {
  background: #253447 !important;
}

:global(.dark) .contacts-number {
  color: #4fc3f7 !important;
}

:global(.dark) .contacts-label {
  color: #9eb3c7 !important;
}

:global(.dark) .contacts-trend-info {
  border-top-color: #253447 !important;
}

:global(.dark) .trend-label {
  color: #9eb3c7 !important;
}

:global(.dark) .trend-value {
  color: #ffffff !important;
}

:global(.dark) .trend-value.positive {
  color: #4fc3f7 !important;
}

/* 响应式设计 */
@media (max-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .satisfaction-content-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }

  .gauge-container {
    width: 100%;
    height: 180px;
  }
}

@media (max-width: 768px) {
  .health-card {
    padding: 16px;
  }

  .contacts-chart-container {
    height: 160px;
  }
}
</style>

