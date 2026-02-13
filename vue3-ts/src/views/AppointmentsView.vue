<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { get, post } from '../utils/request'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent
])

// 医生信息接口
interface DoctorInfo {
  name: string
  title: string
  introduction: string
  department: string
  departmentLocation: string // 科室位置/导航信息
  floor: string // 楼层
  room: string // 诊室号
}

// 预约数据类型定义
interface Appointment {
  id: string
  patient: {
    name: string
    avatar: string
    gender: '男' | '女'
    age: number
    phone: string // 患者手机号
  }
  time: string
  department: string
  doctor: string
  doctorInfo?: DoctorInfo // 医生详细信息
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

// 提醒记录接口
interface ReminderRecord {
  id: string
  appointmentId: string
  patientName: string
  appointmentTime: string
  reminderTime: string
  type: 'sms' | 'app' | 'both'
  status: 'pending' | 'sent' | 'failed'
  message: string
}

// 医生信息数据库
const doctorDatabase: Record<string, DoctorInfo> = {
  '李医生': {
    name: '李医生',
    title: '主任医师',
    introduction: '从事内科临床工作20余年，擅长心血管疾病、高血压、糖尿病的诊治，具有丰富的临床经验。',
    department: '内科',
    departmentLocation: '门诊大楼2楼东侧',
    floor: '2楼',
    room: '201'
  },
  '王医生': {
    name: '王医生',
    title: '副主任医师',
    introduction: '外科专家，擅长普外科、微创手术，在肝胆外科领域有深入研究。',
    department: '外科',
    departmentLocation: '门诊大楼3楼西侧',
    floor: '3楼',
    room: '305'
  },
  '赵医生': {
    name: '赵医生',
    title: '主任医师',
    introduction: '儿科专家，从事儿科临床30年，擅长儿童常见病、多发病的诊治，对儿童生长发育有深入研究。',
    department: '儿科',
    departmentLocation: '门诊大楼1楼南侧',
    floor: '1楼',
    room: '108'
  },
  '孙医生': {
    name: '孙医生',
    title: '副主任医师',
    introduction: '妇科专家，擅长妇科常见病、妇科肿瘤的诊治，在微创手术方面经验丰富。',
    department: '妇科',
    departmentLocation: '门诊大楼2楼西侧',
    floor: '2楼',
    room: '215'
  },
  '周医生': {
    name: '周医生',
    title: '主任医师',
    introduction: '眼科专家，从事眼科临床25年，擅长白内障、青光眼、眼底病的诊治。',
    department: '眼科',
    departmentLocation: '门诊大楼4楼东侧',
    floor: '4楼',
    room: '401'
  },
  '吴医生': {
    name: '吴医生',
    title: '副主任医师',
    introduction: '皮肤科专家，擅长皮肤病、性病的诊治，在皮肤美容方面有丰富经验。',
    department: '皮肤科',
    departmentLocation: '门诊大楼3楼东侧',
    floor: '3楼',
    room: '312'
  }
}

// 预约数据
const appointments = ref<Appointment[]>([])

// 提醒记录
const reminderRecords = ref<ReminderRecord[]>([])

// 显示提醒管理面板
const showReminderPanel = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 过滤后的预约列表
const filteredAppointments = computed(() => {
  if (!searchKeyword.value.trim()) {
    return appointments.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return appointments.value.filter(appointment => 
    appointment.patient.name.toLowerCase().includes(keyword) ||
    appointment.id.toLowerCase().includes(keyword) ||
    appointment.department.toLowerCase().includes(keyword) ||
    appointment.doctor.toLowerCase().includes(keyword)
  )
})

// ECharts 配置
const lineChartOption = ref({
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6a7985'
      }
    }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
  },
  yAxis: {
    type: 'value',
    min: 100,
    max: 400,
    interval: 50,
    axisLabel: {
      formatter: '{value}',
      fontSize: 12,
      color: '#666'
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'solid'
      },
      show: true
    }
  },
  series: [
    {
      name: '预约量',
      type: 'line',
      smooth: false,
      symbol: 'none',
      sampling: 'lttb',
      itemStyle: {
        color: '#409eff'
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
              color: 'rgba(64, 158, 255, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(64, 158, 255, 0.05)'
            }
          ]
        }
      },
      emphasis: {
        focus: 'series'
      },
      data: [100, 120, 150, 180, 220, 280, 320, 350, 380, 360, 340, 320, 300, 280, 300, 320, 300, 280, 250, 220, 200, 180, 160, 140]
    }
  ]
})

// 患者总数柱状图配置
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

// 空闲诊室饼图配置
const pieChartOption = ref({
  tooltip: {
    trigger: 'item',
  },
  series: [{
    type: 'pie',
    radius: ['50%', '70%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 10,
      borderColor: '#fff',
      borderWidth: 2,
    },
    label: {
      show: true,
      position: 'center',
      fontSize: 32,
      fontWeight: 'bold',
      color: '#4CAF50',
      formatter: '25%',
    },
    labelLine: {
      show: false,
    },
    data: [
      { value: 25, name: '可用', itemStyle: { color: '#4CAF50' } },
      { value: 75, name: '不可用', itemStyle: { color: '#E0E0E0' } },
    ],
  }],
})

// 统计数据
const stats = ref({
  patientTotal: 221,
  patientTrend: -22,
  appointmentTotal: 160,
  appointmentTrend: 20,
  availableRooms: 200,
  roomUsage: {
    available: 25,
    occupied: 75
  },
  roomDetails: {
    available: 200,
    unavailable: 600
  }
})

// 获取状态文本和样式
const getStatusInfo = (status: Appointment['status']) => {
  switch (status) {
    case 'pending':
      return { text: '待就诊', class: 'status-pending' }
    case 'confirmed':
      return { text: '已接受', class: 'status-confirmed' }
    case 'cancelled':
      return { text: '已取消', class: 'status-cancelled' }
    case 'completed':
      return { text: '已完成', class: 'status-completed' }
    default:
      return { text: '未知', class: 'status-pending' }
  }
}

// 接受预约
const acceptAppointment = (appointment: Appointment) => {
  if (confirm(`确定要接受 ${appointment.patient.name} 的预约吗？`)) {
    appointment.status = 'confirmed'
    alert('预约已接受')
  }
}

// 取消预约
const cancelAppointment = (appointment: Appointment) => {
  if (confirm(`确定要取消 ${appointment.patient.name} 的预约吗？`)) {
    appointment.status = 'cancelled'
    alert('预约已取消')
  }
}

// 生成提醒消息
const generateReminderMessage = (appointment: Appointment): string => {
  const doctorInfo = appointment.doctorInfo || doctorDatabase[appointment.doctor]
  if (!doctorInfo) {
    return `【Heal.Care】${appointment.patient.name}，您预约的${appointment.department}${appointment.doctor}就诊时间为${appointment.time}，请提前1小时到达。`
  }
  
  return `【Heal.Care就诊提醒】
${appointment.patient.name}，您好！

您的预约信息：
📅 就诊时间：${appointment.time}
🏥 科室：${appointment.department}
👨‍⚕️ 医生：${doctorInfo.name}（${doctorInfo.title}）

📍 科室导航：
${doctorInfo.departmentLocation}
${doctorInfo.floor} ${doctorInfo.room}诊室

👨‍⚕️ 医生简介：
${doctorInfo.introduction}

请提前1小时到达医院，祝您就诊顺利！`
}

// 发送短信提醒（模拟）
const sendSMSReminder = async (appointment: Appointment): Promise<boolean> => {
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const message = generateReminderMessage(appointment)
  console.log(`发送短信到 ${appointment.patient.phone}:`, message)
  
  // 在实际项目中，这里应该调用后端API发送短信
  // const response = await fetch('/api/sms/send', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     phone: appointment.patient.phone,
  //     message: message
  //   })
  // })
  
  return true // 模拟成功
}

// 发送APP推送提醒（模拟）
const sendAppPushReminder = async (appointment: Appointment): Promise<boolean> => {
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const message = generateReminderMessage(appointment)
  console.log(`发送APP推送到 ${appointment.patient.name}:`, message)
  
  // 在实际项目中，这里应该调用后端API发送推送
  // const response = await fetch('/api/push/send', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     userId: appointment.patient.id,
  //     title: '就诊提醒',
  //     message: message
  //   })
  // })
  
  return true // 模拟成功
}

// 发送提醒（使用推送助手API实现打电话提醒）
const sendReminder = async (appointment: Appointment, type: 'sms' | 'app' | 'both' = 'both') => {
  const reminderId = `REM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const reminderTime = new Date().toLocaleString('zh-CN')
  
  let status: 'sent' | 'failed' = 'sent'
  let message = generateReminderMessage(appointment)
  
  try {
    // 使用推送助手API发送打电话提醒
    const pushApiUrl = 'https://push.spug.cc/send/My5R7m0d7lmV2DgG'
    const pushMessage = `【Heal.Care就诊提醒】${appointment.patient.name}，您预约的${appointment.department}${appointment.doctor}就诊时间为${appointment.time}，请提前1小时到达。联系电话：${appointment.patient.phone}`
    
    console.log('📞 调用推送助手API发送打电话提醒:', pushMessage)
    
    // 构建请求参数（根据接口文档要求）
    const requestData = {
      status: 'PROBLEM', // 匹配触发条件
      phone: appointment.patient.phone, // 接收手机号
      hostname: 'server-01' // 可选，语音模板变量
    }
    
    console.log('📤 发送请求到推送助手:', pushApiUrl, requestData)
    
    try {
      // 调用推送助手API
      const pushResponse = await fetch(pushApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      console.log('📥 推送助手API响应状态:', pushResponse.status, pushResponse.statusText)
      
      // 尝试解析响应
      try {
        const pushResult = await pushResponse.json()
        console.log('✅ 推送助手API响应数据:', pushResult)
        
        if (pushResponse.ok) {
          message += '\n[打电话提醒已发送]'
          console.log('✅ 打电话提醒发送成功')
        } else {
          status = 'failed'
          message += '\n[打电话提醒发送失败]'
          console.error('推送助手API调用失败:', pushResult)
        }
      } catch (jsonError) {
        console.error('解析推送助手API响应失败:', jsonError)
        // 即使响应不是JSON，只要状态码是200，也认为成功
        if (pushResponse.ok) {
          message += '\n[打电话提醒已发送]'
          console.log('✅ 打电话提醒发送成功（响应非JSON）')
        } else {
          status = 'failed'
          message += '\n[打电话提醒发送失败]'
          console.error('推送助手API调用失败（响应非JSON）')
        }
      }
    } catch (apiError) {
      console.error('调用推送助手API失败:', apiError)
      status = 'failed'
      message += '\n[打电话提醒发送失败]'
      
      // 即使API调用失败，也继续执行其他提醒方式
      console.log('⚠️ 推送助手API调用失败，继续执行其他提醒方式')
    }
    
    // 同时发送短信提醒（保持原有功能）
    if (type === 'sms' || type === 'both') {
      const smsSuccess = await sendSMSReminder(appointment)
      if (!smsSuccess) {
        status = 'failed'
        message += '\n[短信发送失败]'
      }
    }
    
    // 同时发送APP推送提醒（保持原有功能）
    if (type === 'app' || type === 'both') {
      const appSuccess = await sendAppPushReminder(appointment)
      if (!appSuccess) {
        status = 'failed'
        message += '\n[APP推送失败]'
      }
    }
    
    // 记录提醒
    reminderRecords.value.unshift({
      id: reminderId,
      appointmentId: appointment.id,
      patientName: appointment.patient.name,
      appointmentTime: appointment.time,
      reminderTime: reminderTime,
      type: type,
      status: status,
      message: message
    })
    
    // 保存到localStorage
    localStorage.setItem('reminderRecords', JSON.stringify(reminderRecords.value))
    
    return status === 'sent'
  } catch (error) {
    console.error('发送提醒失败:', error)
    reminderRecords.value.unshift({
      id: reminderId,
      appointmentId: appointment.id,
      patientName: appointment.patient.name,
      appointmentTime: appointment.time,
      reminderTime: reminderTime,
      type: type,
      status: 'failed',
      message: message + '\n[发送失败]'
    })
    return false
  }
}

// 手动发送提醒
const sendManualReminder = (appointment: Appointment) => {
  if (confirm(`确定要给 ${appointment.patient.name} 发送就诊提醒吗？`)) {
    sendReminder(appointment, 'both').then(success => {
      if (success) {
        alert('提醒已发送')
      } else {
        alert('提醒发送失败，请稍后重试')
      }
    })
  }
}

// 检查并自动发送提醒
const checkAndSendReminders = () => {
  const now = new Date()
  
  // 确保appointments.value是数组
  if (!Array.isArray(appointments.value)) {
    console.warn('⚠️ appointments.value不是数组，跳过提醒检查')
    return
  }
  
  appointments.value.forEach(appointment => {
    // 确保appointment和patient对象存在
    if (!appointment || !appointment.patient) {
      console.warn('⚠️ 预约数据格式错误，跳过提醒检查')
      return
    }
    
    // 只处理待就诊和已接受的预约
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      return
    }
    
    // 解析预约时间
    const appointmentTime = new Date(appointment.time.replace(/\s/, 'T'))
    if (isNaN(appointmentTime.getTime())) {
      return
    }
    
    // 计算提醒时间（就诊前1小时）
    const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000)
    
    // 检查是否到了提醒时间（允许5分钟误差）
    const timeDiff = now.getTime() - reminderTime.getTime()
    const fiveMinutes = 5 * 60 * 1000
    
    if (timeDiff >= 0 && timeDiff <= fiveMinutes) {
      // 检查是否已经发送过提醒
      const alreadySent = reminderRecords.value.some(
        record => record.appointmentId === appointment.id && 
                  record.status === 'sent'
      )
      
      if (!alreadySent) {
        console.log(`自动发送提醒: ${appointment.patient.name} - ${appointment.time}`)
        sendReminder(appointment, 'both')
      }
    }
  })
}

// 定时检查提醒（每分钟检查一次）
let reminderCheckInterval: number | null = null

// 加载预约数据
const loadAppointments = async () => {
  try {
    const response = await get<Appointment[]>('/appointment')
    // 确保response是数组
    if (Array.isArray(response)) {
      appointments.value = response
      console.log('✅ 从后端加载预约数据成功:', appointments.value.length, '条记录')
    } else {
      throw new Error('后端返回数据格式错误，不是数组')
    }
  } catch (error) {
    console.error('加载预约数据失败:', error)
    // 无论如何确保appointments.value是数组
    if (!Array.isArray(appointments.value)) {
      appointments.value = []
    }
    // 如果没有数据，添加真实的预约数据
    if (appointments.value.length === 0) {
      console.log('⚠️ 后端API不可用或无数据，使用本地真实数据')
      // 添加真实的预约数据
      const realAppointments = [
        {
          id: 'APM-' + Date.now(),
          patient: {
            name: '王航',
            avatar: 'https://picsum.photos/seed/wanghang/100/100',
            gender: '男',
            age: 30,
            phone: '17630512293'
          },
          time: new Date().toISOString().replace('T', ' ').substring(0, 16),
          department: '内科',
          doctor: '李医生',
          doctorInfo: doctorDatabase['李医生'],
          status: 'pending'
        },
        {
          id: 'APM-' + (Date.now() + 1),
          patient: {
            name: '张三',
            avatar: 'https://picsum.photos/seed/zhangsan/100/100',
            gender: '男',
            age: 35,
            phone: '13800138001'
          },
          time: new Date(Date.now() + 3600000).toISOString().replace('T', ' ').substring(0, 16),
          department: '外科',
          doctor: '王医生',
          doctorInfo: doctorDatabase['王医生'],
          status: 'confirmed'
        },
        {
          id: 'APM-' + (Date.now() + 2),
          patient: {
            name: '李四',
            avatar: 'https://picsum.photos/seed/lisi/100/100',
            gender: '女',
            age: 28,
            phone: '13800138002'
          },
          time: new Date(Date.now() + 7200000).toISOString().replace('T', ' ').substring(0, 16),
          department: '儿科',
          doctor: '赵医生',
          doctorInfo: doctorDatabase['赵医生'],
          status: 'completed'
        }
      ]
      appointments.value = realAppointments as Appointment[]
      console.log('✅ 添加了', realAppointments.length, '条真实预约数据')
    }
  }
}

// 创建新预约
const createAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
  try {
    const response = await post<Appointment>('/appointment', appointmentData)
    appointments.value.push(response)
    return response
  } catch (error) {
    console.error('创建预约失败:', error)
    throw error
  }
}

// 清理定时器
onUnmounted(() => {
  if (reminderCheckInterval !== null) {
    clearInterval(reminderCheckInterval)
  }
})

// 组件挂载时加载数据
onMounted(async () => {
  // 从localStorage加载提醒记录
  const savedRecords = localStorage.getItem('reminderRecords')
  if (savedRecords) {
    try {
      reminderRecords.value = JSON.parse(savedRecords)
    } catch (e) {
      console.error('加载提醒记录失败:', e)
    }
  }
  
  // 加载预约数据
  await loadAppointments()
  
  // 启动定时检查
  reminderCheckInterval = window.setInterval(() => {
    checkAndSendReminders()
  }, 60 * 1000) // 每分钟检查一次
  
  // 立即检查一次
  checkAndSendReminders()
})
</script>

<template>
  <div class="appointments-container">
    <!-- 页面标题和搜索 -->
    <div class="page-header">
      <h2 class="page-title">预约管理</h2>
      <div class="header-actions">
        <button class="btn-reminder-manage" @click="showReminderPanel = true">
          <span class="btn-icon">🔔</span>
          <span>提醒管理</span>
          <span v-if="reminderRecords.length > 0" class="reminder-badge">{{ reminderRecords.length }}</span>
        </button>
        <div class="search-box">
          <input 
            type="text" 
            placeholder="搜索预约..." 
            v-model="searchKeyword"
            class="search-input"
          />
        </div>
      </div>
    </div>

    <!-- 预约就诊流程说明 -->
    <div class="appointment-guide">
      <div class="guide-header">
        <span class="guide-icon">📋</span>
        <h3 class="guide-title">预约就诊流程</h3>
      </div>
      <div class="guide-content">
        <div class="guide-step">
          <span class="step-number">1</span>
          <div class="step-content">
            <div class="step-title">确认信息</div>
            <div class="step-desc">核对预约时间、科室、医生等信息是否正确</div>
          </div>
        </div>
        <div class="guide-step">
          <span class="step-number">2</span>
          <div class="step-content">
            <div class="step-title">等待就诊</div>
            <div class="step-desc">在预约时间前到达医院，凭预约编号等信息签到候诊</div>
          </div>
        </div>
        <div class="guide-step">
          <span class="step-number">3</span>
          <div class="step-content">
            <div class="step-title">就诊提醒</div>
            <div class="step-desc">部分医院可能会推送就诊提醒（也可以手动点击界面里的 "提醒" 按钮设置），避免错过时间</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <!-- 患者总数卡片 -->
      <div class="stat-card">
        <div class="stat-header">
          <h3 class="stat-title">患者总数</h3>
          <span class="stat-icon">�</span>
        </div>
        <div class="stat-value">{{ stats.patientTotal }}</div>
        <div class="stat-trend">
          <span :class="stats.patientTrend > 0 ? 'trend-up' : 'trend-down'">
            {{ stats.patientTrend > 0 ? '↑' : '↓' }} {{ Math.abs(stats.patientTrend) }}%
          </span>
          <span class="trend-label">
            {{ stats.patientTrend > 0 ? '患者数量已上升' : '患者数量已下降' }} {{ Math.abs(stats.patientTrend) }}%
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

      <!-- 预约总数卡片 -->
      <div class="stat-card">
        <div class="stat-header">
          <h3 class="stat-title">预约总数</h3>
          <span class="stat-icon">�</span>
        </div>
        <div class="stat-value">{{ stats.appointmentTotal }}</div>
        <div class="stat-trend">
          <span class="trend-up">↑ {{ stats.appointmentTrend }}%</span>
          <span class="trend-label">预约量增加了 {{ stats.appointmentTrend }}%</span>
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

      <!-- 空闲诊室卡片 -->
      <div class="stat-card">
        <div class="stat-header">
          <h3 class="stat-title">空闲诊室</h3>
          <span class="stat-icon">🏥</span>
        </div>
        <div class="stat-value">{{ stats.availableRooms }}</div>
        <div class="stat-trend">
          <span class="trend-up">↑ {{ stats.roomUsage.available }}%</span>
          <span class="trend-label">{{ stats.roomUsage.available }}% 空闲、{{ stats.roomUsage.occupied }}% 占用</span>
        </div>
        <!-- 饼图 -->
        <div class="chart-container">
          <div class="pie-chart">
            <v-chart 
              :option="pieChartOption" 
              autoresize 
              style="height: 200px; width: 100%;"
            />
          </div>
          <!-- 诊室明细 -->
          <div class="room-details">
            <div class="detail-item">
              <div class="dot-indicator available"></div>
              <span class="detail-label">可用</span>
              <span class="detail-value">{{ stats.roomDetails.available }} 间</span>
            </div>
            <div class="detail-item">
              <div class="dot-indicator unavailable"></div>
              <span class="detail-label">不可用</span>
              <span class="detail-value">{{ stats.roomDetails.unavailable }} 间</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 预约列表 -->
    <div class="appointments-list">
      <!-- 空状态 -->
      <div v-if="filteredAppointments.length === 0" class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">暂无预约数据</h3>
        <p class="empty-state-text">当前没有任何预约记录，请稍后再试</p>
      </div>
      
      <!-- 预约卡片 -->
      <div 
        v-for="appointment in filteredAppointments" 
        :key="appointment.id"
        class="appointment-card"
      >
        <!-- 患者信息 -->
        <div class="patient-info">
          <img 
            :src="appointment.patient.avatar" 
            :alt="appointment.patient.name"
            class="patient-avatar"
          />
          <div class="patient-details">
            <div class="patient-name" :data-id="appointment.id">{{ appointment.patient.name }}</div>
            <div class="patient-meta">
              <span class="patient-gender">{{ appointment.patient.gender }}</span>
              <span class="patient-age">{{ appointment.patient.age }}岁</span>
            </div>
          </div>
        </div>

        <!-- 预约详情 -->
        <div class="appointment-details">
          <div class="detail-item">
            <span class="detail-label">预约时间</span>
            <span class="detail-value">{{ appointment.time }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">预约编号</span>
            <span class="detail-value">{{ appointment.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">科室</span>
            <span class="detail-value">{{ appointment.department }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">医生</span>
            <span class="detail-value">{{ appointment.doctor }}</span>
          </div>
        </div>

        <!-- 状态和操作 -->
        <div class="appointment-actions">
          <div :class="['status-tag', getStatusInfo(appointment.status).class]">
            {{ getStatusInfo(appointment.status).text }}
          </div>
          <div class="action-buttons">
            <button 
              v-permission="'reminder:send'"
              class="btn btn-reminder"
              :disabled="appointment.status === 'cancelled' || appointment.status === 'completed'"
              @click="sendManualReminder(appointment)"
              title="发送就诊提醒"
            >
              <span class="btn-icon-small">🔔</span>
              提醒
            </button>
            <button 
              v-permission="'appointment:cancel'"
              class="btn btn-cancel"
              :disabled="appointment.status === 'cancelled' || appointment.status === 'completed'"
              @click="cancelAppointment(appointment)"
            >
              取消
            </button>
            <button 
              v-permission="'appointment:accept'"
              class="btn btn-accept"
              :disabled="appointment.status === 'confirmed' || appointment.status === 'completed'"
              @click="acceptAppointment(appointment)"
            >
              接受
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提醒管理面板 -->
    <div v-if="showReminderPanel" class="reminder-panel-overlay" @click.self="showReminderPanel = false">
      <div class="reminder-panel">
        <div class="reminder-panel-header">
          <h3 class="reminder-panel-title">智能提醒管理</h3>
          <button class="btn-close" @click="showReminderPanel = false">✕</button>
        </div>
        <div class="reminder-panel-content">
          <div class="reminder-stats">
            <div class="reminder-stat-item">
              <span class="stat-label">总提醒数</span>
              <span class="stat-value">{{ reminderRecords.length }}</span>
            </div>
            <div class="reminder-stat-item">
              <span class="stat-label">已发送</span>
              <span class="stat-value success">{{ reminderRecords.filter(r => r.status === 'sent').length }}</span>
            </div>
            <div class="reminder-stat-item">
              <span class="stat-label">失败</span>
              <span class="stat-value danger">{{ reminderRecords.filter(r => r.status === 'failed').length }}</span>
            </div>
          </div>
          <div class="reminder-list">
            <div v-if="reminderRecords.length === 0" class="empty-reminders">
              <div class="empty-icon">📭</div>
              <div class="empty-text">暂无提醒记录</div>
            </div>
            <div 
              v-for="record in reminderRecords" 
              :key="record.id"
              class="reminder-item"
              :class="{ 'reminder-failed': record.status === 'failed' }"
            >
              <div class="reminder-item-header">
                <div class="reminder-patient">{{ record.patientName }}</div>
                <div :class="['reminder-status', `status-${record.status}`]">
                  {{ record.status === 'sent' ? '✓ 已发送' : '✗ 失败' }}
                </div>
              </div>
              <div class="reminder-item-body">
                <div class="reminder-info-row">
                  <span class="info-label">预约时间：</span>
                  <span class="info-value">{{ record.appointmentTime }}</span>
                </div>
                <div class="reminder-info-row">
                  <span class="info-label">提醒时间：</span>
                  <span class="info-value">{{ record.reminderTime }}</span>
                </div>
                <div class="reminder-info-row">
                  <span class="info-label">提醒方式：</span>
                  <span class="info-value">
                    <span v-if="record.type === 'sms' || record.type === 'both'">📱 短信</span>
                    <span v-if="record.type === 'both'"> + </span>
                    <span v-if="record.type === 'app' || record.type === 'both'">📲 APP推送</span>
                  </span>
                </div>
                <div class="reminder-message">
                  <div class="message-label">提醒内容：</div>
                  <div class="message-content">{{ record.message }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 全局样式变量 */
:root {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --text-primary: #1d2129;
  --text-secondary: #4e5969;
  --text-muted: #86909c;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 主容器 */
.appointments-container {
  padding: 24px;
  background-color: var(--bg-color);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 页面标题和搜索 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-reminder-manage {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  box-shadow: var(--shadow-md);
}

.btn-reminder-manage:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-reminder-manage .btn-icon {
  font-size: 16px;
}

.reminder-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  width: 240px;
  outline: none;
  transition: var(--transition);
  background-color: var(--card-bg);
  box-shadow: var(--shadow-sm);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

/* 预约就诊流程说明 */
.appointment-guide {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.guide-icon {
  font-size: 24px;
}

.guide-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.guide-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.guide-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 20px;
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.guide-step::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary-color), #667eea);
  transform: scaleY(0);
  transition: var(--transition);
  transform-origin: top;
}

.guide-step:hover::before {
  transform: scaleY(1);
}

.guide-step:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--primary-color);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), #667eea);
  color: white;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.step-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 统计卡片 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
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

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), #667eea);
}

.stat-card:nth-child(2)::before {
  background: linear-gradient(90deg, var(--success-color), #56b4d3);
}

.stat-card:nth-child(3)::before {
  background: linear-gradient(90deg, var(--warning-color), #f39c12);
}

.stat-card:hover {
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

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar {
  position: relative;
  width: 100%;
  max-width: 30px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
  overflow: hidden;
  transition: all 0.3s ease;
}

.bar-inner {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(180deg, #409eff 0%, #667eea 100%);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
  animation: barGrow 1s ease-out forwards;
  transform-origin: bottom;
}

@keyframes barGrow {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

.bar-wrapper:hover .bar-inner {
  transform: scaleY(1.05);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.bar-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 4px;
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

.line-chart svg {
  width: 100%;
  height: 100%;
}

.line-chart .grid line {
  opacity: 0.5;
}

.line-chart polygon {
  transition: opacity 0.3s ease;
}

.line-chart:hover polygon {
  opacity: 0.3;
}

.line-chart circle {
  transition: all 0.3s ease;
  cursor: pointer;
}

.line-chart circle:hover {
  transform: scale(1.3);
  filter: drop-shadow(0 2px 4px rgba(103, 194, 58, 0.4));
}

/* 环形进度条 */
.gauge-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 140px;
  padding: 10px;
}

.gauge-container svg {
  width: 100%;
  height: 100%;
  transform: none;
  transition: all 0.3s ease;
}

.gauge-container:hover circle {
  filter: drop-shadow(0 0 15px rgba(103, 194, 58, 0.3));
}

.center-text text {
  transition: all 0.3s ease;
}

.gauge-container:hover .center-text text {
  transform: scale(1.05);
}

/* 诊室明细 */
.room-details {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
  padding: 20px;
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.room-details .detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

/* 状态指示器 */
.dot-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}

.dot-indicator.available {
  background: #ffffff;
  border: 2px solid var(--success-color);
}

.dot-indicator.unavailable {
  background: #ffffff;
  border: 2px solid var(--text-muted);
}

.room-details .detail-label {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 500;
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
}

.room-details .detail-label::before {
  display: none;
}

.room-details .detail-value {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.room-details .detail-value.available {
  color: var(--success-color);
}

.room-details .detail-value.unavailable {
  color: var(--danger-color);
}

/* 预约列表 */
.appointments-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.appointment-card {
  background: var(--card-bg);
  padding: 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.appointment-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--success-color));
  transform: scaleX(0);
  transition: var(--transition);
  transform-origin: left;
}

.appointment-card:hover::before {
  transform: scaleX(1);
}

.appointment-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--primary-color);
}

/* 患者信息 */
.patient-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0;
  padding: 0;
  border: none;
}

.patient-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f0f4f8;
  box-shadow: var(--shadow-md);
  transition: var(--transition);
  flex-shrink: 0;
}

.appointment-card:hover .patient-avatar {
  border-color: var(--primary-color);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.patient-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.patient-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-name::after {
  content: attr(data-id);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: #f8fafc;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.patient-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 500;
}

.patient-gender::before {
  content: '👤';
  margin-right: 6px;
}

.patient-age::before {
  content: '📅';
  margin-right: 6px;
}

/* 预约详情 */
.appointment-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 0;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  padding: 0;
  margin: 0;
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.detail-label::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary-color);
  opacity: 1;
}

.detail-value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 15px;
  margin: 0;
  text-align: left;
}

/* 状态和操作 */
.appointment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.status-tag {
  padding: 8px 20px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  min-width: 80px;
  transition: var(--transition);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.status-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: var(--transition);
}

.status-tag:hover::before {
  left: 100%;
}

.status-pending {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  color: var(--warning-color);
  border-color: #fde68a;
}

.status-confirmed {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  color: var(--success-color);
  border-color: #bbf7d0;
}

.status-cancelled {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: var(--danger-color);
  border-color: #fecaca;
}

.status-completed {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: var(--primary-color);
  border-color: #bfdbfe;
}

.status-tag:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin: 0;
}

.btn {
  padding: 9px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  outline: none;
  box-shadow: var(--shadow-sm);
  min-width: 85px;
  text-align: center;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  transform: scaleX(0);
  transition: var(--transition);
  transform-origin: left;
  z-index: -1;
}

.btn:hover:not(:disabled)::before {
  transform: scaleX(1);
}

.btn-cancel {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
}

.btn-accept {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.btn-accept:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.btn-reminder {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-reminder:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  transform: translateY(-1px);
}

.btn-icon-small {
  font-size: 14px;
  margin-right: 4px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 提醒管理面板 */
.reminder-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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

.reminder-panel {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
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

.reminder-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.reminder-panel-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.btn-close:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.reminder-panel-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.reminder-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.reminder-stat-item {
  background: var(--bg-color);
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: center;
}

.reminder-stat-item .stat-label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.reminder-stat-item .stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.reminder-stat-item .stat-value.success {
  color: var(--success-color);
}

.reminder-stat-item .stat-value.danger {
  color: var(--danger-color);
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-reminders {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.reminder-item {
  background: var(--bg-color);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.reminder-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.reminder-item.reminder-failed {
  border-left: 4px solid var(--danger-color);
}

.reminder-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.reminder-patient {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.reminder-status {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.reminder-status.status-sent {
  background: #d1fae5;
  color: #065f46;
}

.reminder-status.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.reminder-item-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-info-row {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: var(--text-muted);
  min-width: 80px;
}

.info-value {
  color: var(--text-primary);
  font-weight: 500;
}

.reminder-message {
  margin-top: 8px;
  padding: 16px;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.message-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.message-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.empty-state-text {
  font-size: 14px;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .appointments-list {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .appointments-list {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  
  .appointment-card {
    padding: 20px;
  }
}

@media (max-width: 992px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .appointments-list {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  
  .patient-avatar {
    width: 50px;
    height: 50px;
  }
  
  .patient-name {
    font-size: 16px;
  }
}

@media (max-width: 768px) {
  .appointments-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .appointment-guide {
    padding: 20px;
  }
  
  .guide-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .guide-step {
    padding: 16px;
  }
  
  .stats-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .stat-value {
    font-size: 32px;
  }
  
  .appointments-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .appointment-card {
    padding: 16px;
  }
  
  .appointment-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons {
    margin-left: 0;
    justify-content: stretch;
  }
  
  .btn {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .patient-info {
    gap: 12px;
  }
  
  .patient-avatar {
    width: 48px;
    height: 48px;
  }
  
  .appointment-details {
    padding: 12px;
    gap: 12px;
  }
}
</style>

1
