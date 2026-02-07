<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  connectSocket,
  disconnectSocket,
  sendMessage,
  onMessage,
  offMessage,
  setCurrentUserId,
  isSocketConnected,
  getSocketInstance,
  onIncomingCall,
  offIncomingCall
} from '@/utils/socket'
import { useAuthStore } from '@/stores/auth'
import getCallManager from '@/utils/callManager'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

interface PatientCardData {
  patientInfo: {
    name: string
    gender: string
    age: number
  }
  symptomDescription: string
  images: Array<{
    url: string
    type: string
    thumb?: string
  }>
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'doctor'
  senderName: string
  avatar?: string
  timestamp: number
  type: 'text' | 'image' | 'file' | 'patient-card'
  imageUrl?: string
  patientCardData?: PatientCardData
}

const route = useRoute()
const messages = ref<Message[]>([])
const inputText = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const isConnected = ref(false)

// 图片预览相关
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageList = ref<string[]>([])
const previewCurrentIndex = ref(0)
const previewImageError = ref(false) // 图片加载错误状态

// 表情选择器相关
const showEmojiPicker = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 通话相关状态
const isInCall = ref(false)
const callType = ref<'audio' | 'video'>('video')
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const callStatusText = ref('')
const localVideoRef = ref<HTMLVideoElement | null>(null)
const remoteVideoRef = ref<HTMLVideoElement | null>(null)
/** 语音通话时播放远程声音，避免用 video 播纯音频导致无声 */
const remoteAudioRef = ref<HTMLAudioElement | null>(null)
let callManager: ReturnType<typeof getCallManager> | null = null

/**
 * 在用户点击"发起/接听语音通话"这类交互之后，主动尝试播放远程音频。
 * 这样可以尽量绕过浏览器对自动播放带声音媒体的限制。
 */
function ensureRemoteAudioPlaying() {
  // 优先使用 ref，如果不存在则从 DOM 查询
  let audioEl = remoteAudioRef.value
  if (!audioEl || audioEl.tagName !== 'AUDIO') {
    audioEl = document.querySelector('audio.remote-audio') as HTMLAudioElement
  }
  
  if (!audioEl || audioEl.tagName !== 'AUDIO') {
    console.warn('⚠️ [医者端]ensureRemoteAudioPlaying: 当前不存在远程音频元素，将等待 callManager 的兜底方案')
    return
  }

  try {
    audioEl.muted = false
    audioEl.volume = 1
    const playResult = audioEl.play()
    if (playResult && typeof (playResult as any).then === 'function') {
      ;(playResult as Promise<void>)
        .then(() => {
          console.log('✅ [医者端]用户操作后主动播放远程音频成功')
        })
        .catch((err) => {
          console.warn('⚠️ [医者端]用户操作后播放远程音频失败:', err)
        })
    }
  } catch (error) {
    console.error('❌ [医者端]ensureRemoteAudioPlaying 调用异常:', error)
  }
}

// 简单防抖函数，用于控制自动拉取频率
function debounce(fn: (...args: any[]) => any, wait = 500) {
  let timer: any
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

// 患者列表相关
interface Patient {
  id: string
  name: string
  avatar?: string
  isOnline?: boolean
  lastMessage?: string
  lastMessageTime?: number
  unreadCount?: number
}

const patientList = ref<Patient[]>([])
const selectedPatientId = ref<string>('')

// 调试用：将患者列表挂到 window，方便在浏览器控制台查看在线状态
if (typeof window !== 'undefined') {
  // @ts-ignore
  ;(window as any).__patientList = patientList
  // @ts-ignore
  ;(window as any).__selectedPatientId = selectedPatientId
}
const searchKeyword = ref('')
const isLoadingHistory = ref(false) // 加载历史消息状态

// 自动拉取消息相关
let autoPullTimer: any = null // 定时器
let lastPullTimestamp: number = 0 // 上次拉取的时间戳
let isPullingMessages = false // 是否正在拉取消息（防止重复拉取）
const AUTO_PULL_INTERVAL = 30000 // 自动拉取间隔：30秒

// 分页加载相关
const INITIAL_MESSAGE_LIMIT = 50 // 初始加载消息数量（从200减少到50）
const PAGE_SIZE = 30 // 每次加载更多消息的数量
const isLoadingMore = ref(false) // 是否正在加载更多消息
const hasMoreMessages = ref(true) // 是否还有更多消息
const oldestMessageTimestamp = ref<number | null>(null) // 最旧消息的时间戳
let currentAbortController: AbortController | null = null // 当前请求的取消控制器

// 获取登录信息
const authStore = useAuthStore()

// 医生在岗状态（从localStorage恢复）
const getDutyStorageKey = (doctorId?: string) => {
  const doctor = doctorId ? { id: doctorId } : doctorInfo.value
  return `doctor_duty_${doctor.id}`
}

const isOnDuty = ref(false)

// 从localStorage恢复上岗状态
const restoreDutyStatus = () => {
  const doctor = doctorInfo.value
  if (!doctor || !doctor.id) {
    console.warn('⚠️ 无法恢复上岗状态：医生信息未加载')
    return
  }
  const storageKey = getDutyStorageKey()
  const savedStatus = localStorage.getItem(storageKey)
  if (savedStatus === 'true') {
    isOnDuty.value = true
    console.log('✅ 恢复上岗状态:', doctor.id)
  }
}

// 保存上岗状态到localStorage
const saveDutyStatus = (onDuty: boolean) => {
  const doctor = doctorInfo.value
  if (!doctor || !doctor.id) {
    console.warn('⚠️ 无法保存上岗状态：医生信息未加载')
    return
  }
  const storageKey = getDutyStorageKey()
  if (onDuty) {
    localStorage.setItem(storageKey, 'true')
  } else {
    localStorage.removeItem(storageKey)
  }
  console.log(`${onDuty ? '✅' : '❌'} 保存上岗状态:`, onDuty, doctor.id)
}

// 医生信息（从登录信息获取）
const doctorInfo = computed(() => {
  const user = authStore.userInfo
  if (user) {
    // 处理 role 可能是对象的情况
    const roleValue = typeof user.role === 'string' 
      ? user.role 
      : (user.role && typeof user.role === 'object' && 'name' in user.role 
          ? (user.role as { name: string }).name 
          : undefined)
    
    return {
      name: user.username || '医生',
      avatar: user.avatar || '👨‍⚕️',
      id: user.id || 'doctor_001',
      email: user.email,
      role: roleValue
    }
  }
  // 如果没有登录信息，使用默认值
  return {
    name: '医生',
    avatar: '👨‍⚕️',
    id: 'doctor_001'
  }
})

// 患者信息（从路由参数或选中的患者获取）
const patientInfo = ref({
  name: (route.query.patientName as string) || '患者',
  avatar: '👤',
  id: (route.query.patientId as string) || 'patient_001' // 患者ID，如果没有路由参数则使用默认值
})

// 初始化 Socket.IO 连接
onMounted(async () => {
  // 恢复上岗状态
  restoreDutyStatus()
  
  // 先初始化患者列表（从数据库加载）
  await initPatientList()
  // 然后初始化Socket连接
  await initSocketService()
  
  // Socket连接成功后，如果之前是上岗状态，自动重新上岗
  if (isOnDuty.value) {
    // 等待Socket连接稳定后再上岗（确保连接成功）
    const checkAndSetDuty = () => {
      if (isSocketConnected()) {
        console.log('✅ Socket已连接，自动恢复上岗状态')
        toggleDuty(true)
      } else {
        // 如果还没连接，再等一会儿
        setTimeout(checkAndSetDuty, 500)
      }
    }
    setTimeout(checkAndSetDuty, 1000)
  }
  
  // 设置点击外部关闭表情选择器
  handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    const emojiPicker = document.querySelector('.emoji-picker-container')
    const emojiBtn = document.querySelector('.emoji-btn')
    
    if (showEmojiPicker.value && 
        emojiPicker && 
        !emojiPicker.contains(target) && 
        emojiBtn && 
        !emojiBtn.contains(target)) {
      closeEmojiPicker()
    }
  }
  
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 停止自动拉取定时器
  stopAutoPullTimer()
  
  // 不再自动下岗，保持状态（除非用户主动退出登录）
  // 只断开Socket连接，但保持上岗状态在localStorage中
  // 注意：不发送下岗消息，这样后端会保持医生在岗状态
  offMessage()
  // 暂时不断开Socket，让它在后台保持连接（如果可能）
  // 如果必须断开，则断开但不发送下岗消息
  const socketInstance = getSocketInstance()
  if (socketInstance) {
    // 移除所有事件监听器，但不断开连接
    // 这样切换页面时Socket保持连接，回到页面时不需要重新连接
    // 如果必须断开，则只断开连接，不发送下岗事件
    console.log('📱 页面切换，保持上岗状态，Socket连接保持')
  }
  // 注意：这里不调用disconnectSocket()，让Socket保持连接
  // 如果确实需要断开，可以在路由守卫中处理
  
  // 清理通话资源
  cleanupCallManager()
  
  // 移除点击外部关闭表情选择器的事件监听
  if (handleClickOutside) {
    document.removeEventListener('click', handleClickOutside)
    handleClickOutside = null
  }
})

/**
 * 初始化 Socket.IO 服务
 */
async function initSocketService() {
  try {
    const doctor = doctorInfo.value
    console.log('🔄 开始初始化 Socket.IO 服务...')
    console.log('👨‍⚕️ 医生ID:', doctor.id)
    console.log('👨‍⚕️ 医生信息:', doctor)
    console.log('👤 患者ID:', patientInfo.value.id)
    
    // 检查是否已经连接
    if (isSocketConnected()) {
      console.log('✅ Socket已连接，复用现有连接')
      isConnected.value = true
      // 重新设置当前用户ID
      setCurrentUserId(doctor.id)
      // 重新监听消息
      onMessage(handleReceiveMessage)
      // 重新设置Socket事件监听
      setupSocketEventListeners()
      // 确保通话管理器已初始化（即使Socket已连接）
      if (!callManager) {
        initCallManager()
      }
      // 启动自动拉取消息定时器
      startAutoPullTimer()
      // 设置页面可见性监听
      setupVisibilityListener()
      return
    }
    
    // 设置当前用户ID（必须在连接前设置）
    setCurrentUserId(doctor.id)
    
    // 连接 Socket.IO，传递真实的医生信息
    await connectSocket(doctor.id, {
      name: doctor.name,
      avatar: doctor.avatar,
      email: doctor.email,
      role: doctor.role || undefined,
      userId: doctor.id
    })
    
    isConnected.value = true
    console.log('✅ Socket.IO 连接成功')
    
    // 设置Socket事件监听
    setupSocketEventListeners()
    
    // 监听接收消息
    onMessage(handleReceiveMessage)
    
    // 监听Socket重连事件，重连成功后自动拉取最新消息
    const socketInstance = getSocketInstance()
    if (socketInstance) {
      socketInstance.on('reconnect', () => {
        console.log('🔄 Socket.IO 重连成功，自动拉取最新消息')
        setTimeout(() => {
          if (selectedPatientId.value) {
            autoPullLatestMessages()
          }
        }, 1000) // 延迟1秒，确保连接稳定
      })
    }
    
    // 初始化通话管理器
    initCallManager()
    
    // 启动自动拉取消息定时器
    startAutoPullTimer()
    
    // 设置页面可见性监听
    setupVisibilityListener()
    
  scrollToBottom()
  } catch (error: any) {
    console.error('❌ Socket.IO 初始化失败:', error)
    isConnected.value = false
    
    // 分析错误类型，提供更友好的错误信息
    let errorMessage = '连接失败'
    let errorDetails = ''
    
    if (error.message) {
      if (error.message.includes('Invalid frame header') || error.message.includes('websocket error')) {
        errorMessage = 'WebSocket 连接失败'
        errorDetails = '可能原因：\n1. 后端服务未启动\n2. 端口3000被其他服务占用\n3. 网络连接问题\n\n解决方案：\n请确保后端服务正在运行（http://localhost:3000）'
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到服务器'
        errorDetails = '后端服务可能未启动，请检查：\n1. 后端服务是否在运行\n2. 端口3000是否被占用\n3. 防火墙设置'
      } else {
        errorDetails = error.message
      }
    }
    
    // 只在首次连接失败时显示弹窗，避免重复提示
    const hasShownError = sessionStorage.getItem('socket_error_shown')
    if (!hasShownError) {
      sessionStorage.setItem('socket_error_shown', 'true')
      // 使用更友好的提示方式
      // 使用更简洁的错误提示
      const fullMessage = `${errorMessage}\n\n${errorDetails}\n\n提示：\n1. 确保后端服务正在运行（http://localhost:3000）\n2. 检查后端控制台是否有错误\n3. 尝试清除浏览器缓存后刷新页面\n4. 连接失败不影响部分功能使用（如通话管理器）`
      
      // 使用 confirm 而不是 alert，让用户可以选择是否查看详细信息
      const userChoice = confirm(fullMessage + '\n\n是否查看详细错误信息？')
      if (userChoice) {
        console.group('🔍 Socket.IO 连接错误详情')
        console.error('错误对象:', error)
        console.error('错误类型:', error.type)
        console.error('错误消息:', error.message)
        console.error('原始错误:', (error as any).originalError)
        console.groupEnd()
      }
      // 5秒后清除标记，允许再次提示（如果用户解决了问题后刷新页面）
      setTimeout(() => {
        sessionStorage.removeItem('socket_error_shown')
      }, 5000)
    } else {
      // 已显示过错误，只在控制台记录
      console.warn('⚠️ Socket.IO 连接失败（已提示用户）:', error.message || '未知错误')
    }
    
    // 即使Socket连接失败，也尝试初始化通话管理器（用于本地测试）
    if (!callManager) {
      try {
        initCallManager()
        console.log('✅ 通话管理器已初始化（Socket连接失败但通话功能可用）')
      } catch (callError) {
        console.error('❌ 通话管理器初始化也失败:', callError)
      }
    }
    
    // 设置自动重试（可选，避免过于频繁）
    // 注意：Socket.IO客户端已经有自动重连机制，这里只是作为备用
  }
}

/**
 * 设置Socket事件监听器
 */
function setupSocketEventListeners() {
  const socketInstance = getSocketInstance()
  if (socketInstance) {
    // 先移除旧的事件监听器，避免重复注册
    socketInstance.off('doctor:duty:success')
    socketInstance.off('doctor:duty:error')
    socketInstance.off('patient:online')
    socketInstance.off('patient:offline')
    socketInstance.off('patient:list:update')
    
    // 监听上岗/下岗状态确认
    socketInstance.on('doctor:duty:success', (data: any) => {
      console.log('✅ 上岗状态更新成功:', data)
      isOnDuty.value = data.onDuty
      // 保存状态到localStorage
      saveDutyStatus(data.onDuty)
      // 移除弹窗提示，状态已通过按钮显示
    })
    
    socketInstance.on('doctor:duty:error', (error: any) => {
      console.error('❌ 上岗状态更新失败:', error)
      alert('操作失败: ' + (error.error || '未知错误'))
      // 恢复状态
      isOnDuty.value = !isOnDuty.value
    })
    
    // 监听患者上线
    socketInstance.on('patient:online', (data: any) => {
      console.log('👤 患者上线事件:', data)
      if (data && data.patientId) {
        updatePatientInList(data.patientId, {
          name: data.patientInfo?.name,
          avatar: data.patientInfo?.avatar,
          isOnline: true,
          lastMessage: data.patientInfo?.lastMessage,
          lastMessageTime: data.patientInfo?.lastMessageTime,
          unreadCount: data.patientInfo?.unreadCount || 0
        })
      } else {
        console.warn('⚠️ patient:online 数据格式不正确:', data)
      }
    })
    
    // 监听患者下线
    socketInstance.on('patient:offline', (data: any) => {
      console.log('👋 患者下线事件:', data)
      if (data && data.patientId) {
        updatePatientInList(data.patientId, { isOnline: false })
      } else {
        console.warn('⚠️ patient:offline 数据格式不正确:', data)
      }
    })
    
    // 监听患者列表更新（新消息）
    socketInstance.on('patient:list:update', (data: any) => {
      console.log('📋 患者列表更新事件:', data)
      if (data && data.patientId && data.patientInfo) {
        updatePatientInList(data.patientId, {
          name: data.patientInfo.name,
          avatar: data.patientInfo.avatar,
          lastMessage: data.patientInfo.lastMessage,
          lastMessageTime: data.patientInfo.lastMessageTime,
          unreadCount: data.patientInfo.unreadCount,
          isOnline: data.patientInfo.isOnline
        })
      } else {
        console.warn('⚠️ patient:list:update 数据格式不正确:', data)
      }
    })
  } else {
    console.warn('⚠️ Socket实例不存在，无法设置事件监听器')
  }
}

/**
 * 处理接收到的消息（医生端接收患者消息）
 */
function handleReceiveMessage(message: any) {
  const doctor = doctorInfo.value
  
  console.log('📨 医生端收到消息:', {
    messageId: message.id || message.messageId,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    currentDoctorId: doctor.id,
    currentPatientId: patientInfo.value.id,
    content: message.content?.substring(0, 50),
    type: message.type
  })
  
  // 忽略自己发送的消息（避免重复显示）
  if (message.fromUserId === doctor.id) {
    console.log('⚠️ 忽略自己发送的消息，避免重复显示')
    return
  }
  
  // 检查消息是否已处理过（根据消息ID）
  if (message.id || message.messageId) {
    const messageId = message.id || message.messageId
    const existingMessage = messages.value.find(m => m.id === messageId)
    if (existingMessage) {
      console.warn('⚠️ 消息已处理过，跳过:', messageId)
      return
    }
  }
  
  // 医生端接收所有发送给当前医生的消息（fromUserId 是患者ID）
  // 先解析患者信息卡片（如果存在），以便获取准确的患者姓名
  let patientCardDataForList: PatientCardData | undefined = undefined
  if (message.type === 'patient-card') {
    try {
      patientCardDataForList = message.extra?.patientCardData || JSON.parse(message.content)
    } catch (e) {
      console.error('解析患者信息卡片失败（列表更新）:', e)
    }
  }
  
  // 更新患者列表中的最后一条消息（如果是患者发送的消息）
  if (message.fromUserId && !message.fromUserId.startsWith('doctor_')) {
    // 优先从患者信息卡片中提取患者姓名
    let patientNameForList = message.fromUserName || '患者'
    if (patientCardDataForList && patientCardDataForList.patientInfo) {
      patientNameForList = patientCardDataForList.patientInfo.name || patientNameForList
    }
    
    updatePatientInList(message.fromUserId, {
      name: patientNameForList, // 使用从消息中提取的准确姓名
      lastMessage: message.type === 'text' 
        ? message.content.substring(0, 50) 
        : (message.type === 'image' ? '[图片]' : message.type === 'patient-card' ? '[咨询]' : '[消息]'),
      lastMessageTime: message.timestamp || Date.now(),
      unreadCount: message.fromUserId !== selectedPatientId.value 
        ? ((patientList.value.find(p => p.id === message.fromUserId)?.unreadCount || 0) + 1)
        : 0,
      isOnline: true // 收到消息时，更新患者为在线状态
    })
  }
  
  // 检查消息是否发送给当前医生
  // 1. 直接匹配：toUserId === doctor.id
  // 2. 患者发送给医生：fromUserId是患者ID，toUserId是医生ID（可能是默认值'doctor_001'或其他医生ID）
  // 3. 消息来自当前选中的患者（如果选中了患者）
  // 4. 关键：如果消息是患者发送的（fromUserId不是医生），且当前医生在岗，就应该接收
  //    这样可以确保在岗医生能收到所有患者发送的消息，即使toUserId不完全匹配
  const isMessageForCurrentDoctor = message.toUserId === doctor.id
  const isMessageToAnyDoctor = message.toUserId && message.toUserId.startsWith('doctor_') && !message.fromUserId.startsWith('doctor_')
  const isMessageFromSelectedPatient = selectedPatientId.value && message.fromUserId === selectedPatientId.value
  // 如果消息是患者发送的（fromUserId不是医生）
  const isPatientMessage = message.fromUserId && !message.fromUserId.startsWith('doctor_')
  
  // 判断是否应该接收此消息
  // 核心逻辑：
  // 1. 消息直接发送给当前医生（toUserId === doctor.id）
  // 2. 消息发送给任意医生（toUserId以'doctor_'开头）且医生在岗
  // 3. 消息来自当前选中的患者
  // 4. 消息来自患者且医生在岗（无论toUserId是什么，因为后端可能已经路由到当前医生）
  const shouldReceiveMessage = isMessageForCurrentDoctor || 
    (isMessageToAnyDoctor && isOnDuty.value) || 
    isMessageFromSelectedPatient || 
    (isPatientMessage && isOnDuty.value)
  
  if (shouldReceiveMessage) {
    console.log('✅ 消息匹配成功，添加到聊天列表', {
      isMessageForCurrentDoctor,
      isMessageToAnyDoctor,
      isMessageFromSelectedPatient,
      isPatientMessage,
      isOnDuty: isOnDuty.value,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      doctorId: doctor.id
    })
    
    // 如果是患者信息卡片类型，解析数据
    let patientCardData: PatientCardData | undefined = undefined
    if (message.type === 'patient-card') {
      try {
        patientCardData = message.extra?.patientCardData || JSON.parse(message.content)
        
              // 确保图片URL格式正确（处理base64）
              if (patientCardData && patientCardData.images) {
                patientCardData.images = patientCardData.images.map((img: any) => ({
                  ...img,
                  url: img.url ? processImageUrl(img.url) : img.url,
                  thumb: img.thumb ? processImageUrl(img.thumb) : img.thumb
                }))
              }
      } catch (e) {
        console.error('解析患者信息卡片失败:', e)
      }
    }
    
    // 更新患者信息（如果消息中包含患者信息）
    if (message.fromUserId && !message.fromUserId.startsWith('doctor_')) {
      // 优先从患者信息卡片中提取患者姓名
      let patientName = message.fromUserName || '患者'
      let patientAvatar = message.fromUserAvatar || '👤'
      
      if (patientCardData && patientCardData.patientInfo) {
        patientName = patientCardData.patientInfo.name || patientName
        // 可以从患者信息中提取更多信息，如性别、年龄等
      }
      
      const patient = patientList.value.find(p => p.id === message.fromUserId)
      if (patient) {
        // 如果患者信息卡片中有更准确的姓名，更新患者列表
        if (patientCardData && patientCardData.patientInfo && patientCardData.patientInfo.name) {
          updatePatientInList(message.fromUserId, {
            name: patientCardData.patientInfo.name,
            isOnline: true
          })
        } else if (!patient.isOnline) {
          updatePatientInList(message.fromUserId, { isOnline: true })
        }
        
        // 如果当前选中的患者不是消息发送者，只更新患者列表，不更新当前聊天窗口
        if (selectedPatientId.value === message.fromUserId) {
          patientInfo.value = {
            name: patient.name,
            avatar: patient.avatar || '👤',
            id: patient.id
          }
        }
      } else {
        // 如果患者不在列表中，添加并标记为在线
        updatePatientInList(message.fromUserId, {
          name: patientName,
          avatar: patientAvatar,
          isOnline: true
        })
        
        // 如果当前没有选中患者，或者选中的患者不是消息发送者，自动选中新患者
        if (!selectedPatientId.value || selectedPatientId.value !== message.fromUserId) {
          console.log('🔄 自动选中新患者:', message.fromUserId, patientName)
          selectedPatientId.value = message.fromUserId
          const newPatient = patientList.value.find(p => p.id === message.fromUserId)
          if (newPatient) {
            patientInfo.value = {
              name: newPatient.name,
              avatar: newPatient.avatar || '👤',
              id: newPatient.id
            }
          }
        }
      }
    }
    
    // 关键：只有当消息来自当前选中的患者时，才添加到当前聊天窗口
    // 如果消息来自其他患者，只更新患者列表，不显示在当前聊天窗口
    // 但如果当前没有选中患者，则自动选中并显示消息
    if (message.fromUserId && message.fromUserId !== selectedPatientId.value) {
      // 如果当前没有选中患者，自动选中并显示消息
      if (!selectedPatientId.value) {
        console.log('🔄 当前没有选中患者，自动选中消息发送者:', message.fromUserId)
        selectedPatientId.value = message.fromUserId
        const newPatient = patientList.value.find(p => p.id === message.fromUserId)
        if (newPatient) {
          patientInfo.value = {
            name: newPatient.name,
            avatar: newPatient.avatar || '👤',
            id: newPatient.id
          }
        } else {
          // 如果患者不在列表中，使用消息中的信息
          patientInfo.value = {
            name: patientCardData?.patientInfo?.name || message.fromUserName || '患者',
            avatar: message.fromUserAvatar || '👤',
            id: message.fromUserId
          }
        }
        // 继续处理，显示消息
      } else {
        console.log('ℹ️ 消息来自其他患者，只更新患者列表，不显示在当前聊天窗口', {
          fromUserId: message.fromUserId,
          selectedPatientId: selectedPatientId.value
        })
        // 更新最后拉取时间戳（即使不显示，也要更新，避免重复拉取）
        if (message.timestamp) {
          lastPullTimestamp = Math.max(lastPullTimestamp, message.timestamp)
        }
        return // 不添加到当前聊天窗口
      }
    }
    
    const chatMessage: Message = {
      id: message.id || message.messageId || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: message.content || '',
      sender: 'user', // 患者发送的消息
      senderName: patientInfo.value.name,
      avatar: patientInfo.value.avatar,
      timestamp: message.timestamp || Date.now(),
      type: message.type || 'text',
      // 如果是图片消息，保存图片URL（使用processImageUrl处理）
      imageUrl: message.type === 'image' 
        ? processImageUrl(message.content || message.extra?.imageUrl) 
        : undefined,
      // 如果是患者信息卡片，保存完整数据
      patientCardData: patientCardData
    }
    
    addMessage(chatMessage)
    
    // 新消息到达后自动拉取最新历史，确保与后端一致（防抖）
    // 但只在消息来自当前选中患者时才拉取，避免重复
    if (message.fromUserId === selectedPatientId.value) {
      reloadMessagesDebounced()
    }
    
    // 清空未读计数（因为正在查看）
    const patient = patientList.value.find(p => p.id === message.fromUserId)
    if (patient) {
      patient.unreadCount = 0
    }
    
    // 更新最后拉取时间戳
    if (message.timestamp) {
      lastPullTimestamp = Math.max(lastPullTimestamp, message.timestamp)
    }
    
    scrollToBottom()
  } else {
    console.warn('⚠️ 消息不匹配当前医生或患者', {
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      currentDoctorId: doctor.id,
      isOnDuty: isOnDuty.value,
      isPatientMessage: message.fromUserId && !message.fromUserId.startsWith('doctor_'),
      selectedPatientId: selectedPatientId.value
    })
    // 注意：这里不添加消息，因为消息匹配条件不满足
    // 但如果医生在岗且消息来自患者，理论上应该接收
    // 这种情况可能是消息路由有问题，需要检查后端日志
  }
}

/**
 * 添加消息（带去重逻辑）
 */
function addMessage(message: Omit<Message, 'id' | 'timestamp'> | Message) {
  const newMessage: Message = {
    ...message,
    id: (message as Message).id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: (message as Message).timestamp || Date.now()
  }
  
  // 检查消息是否已存在（根据消息ID或内容+时间戳去重）
  const existingMessage = messages.value.find(m => {
    // 如果有ID，使用ID匹配
    if (m.id && newMessage.id && m.id === newMessage.id) {
      return true
    }
    // 如果没有ID，使用内容+时间戳匹配（允许1秒内的误差）
    if (m.content === newMessage.content && 
        m.sender === newMessage.sender &&
        Math.abs((m.timestamp || 0) - (newMessage.timestamp || 0)) < 1000) {
      return true
    }
    return false
  })
  
  if (existingMessage) {
    console.warn('⚠️ 消息已存在，跳过添加:', newMessage.id || newMessage.content.substring(0, 30))
    return
  }
  
  // 过滤掉空消息（没有内容且不是图片或患者卡片）
  if (!newMessage.content && newMessage.type !== 'image' && newMessage.type !== 'patient-card') {
    console.warn('⚠️ 跳过空消息:', newMessage.id)
    return
  }
  
  // 确保消息按时间戳排序后添加（如果时间戳比现有消息小，插入到正确位置）
  const insertIndex = messages.value.findIndex(m => (m.timestamp || 0) > (newMessage.timestamp || 0))
  if (insertIndex === -1) {
    // 如果新消息的时间戳最大，添加到末尾
  messages.value.push(newMessage)
  } else {
    // 如果新消息的时间戳不是最大，插入到正确位置
    messages.value.splice(insertIndex, 0, newMessage)
  }
  
  // 限制消息数量，只保留最近200条消息（避免页面过长）
  if (messages.value.length > 200) {
    messages.value = messages.value.slice(-200)
    console.log('⚠️ 消息数量超过200条，已移除最旧的消息')
  }
  
  console.log('✅ 添加新消息:', newMessage.id || newMessage.content.substring(0, 30), '时间戳:', newMessage.timestamp)
  
  // 滚动到底部显示最新消息
  nextTick(() => {
    scrollToBottom()
  })
}

/**
 * 发送消息（医生端发送给患者）
 */
async function sendChatMessage() {
  if (!inputText.value.trim()) {
    return
  }

  if (!isSocketConnected()) {
    alert('未连接，请稍候...')
    return
  }

  try {
    const content = inputText.value.trim()
    const messageToSend = content
    
    // 先添加到本地消息列表（乐观更新）
    const doctor = doctorInfo.value
    const doctorMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: messageToSend,
      sender: 'doctor',
      senderName: doctor.name,
      avatar: doctor.avatar,
      timestamp: Date.now(),
      type: 'text'
    }
    addMessage(doctorMessage)
    
    // 清空输入框
    inputText.value = ''
    
    // 通过 Socket.IO 发送消息给患者
    console.log('📤 医生端发送消息:', {
      fromUserId: doctor.id,
      toUserId: patientInfo.value.id,
      content: messageToSend
    })
    
    const result = await sendMessage(patientInfo.value.id, messageToSend, 'text')
    
    // 更新消息ID为服务器返回的ID（如果有）
    if (result && result.messageId) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.sender === 'doctor' && lastMessage.content === messageToSend) {
        lastMessage.id = result.messageId
        lastMessage.timestamp = result.timestamp || lastMessage.timestamp
      }
    }
    
    // 发送成功后，从后端重新加载最新消息，确保数据同步
    try {
      await reloadMessagesFromServer()
    } catch (reloadError) {
      console.warn('⚠️ 重新加载消息失败（不影响发送）:', reloadError)
    }
    
    console.log('✅ 消息发送成功（医生 -> 患者），已保存到后端')
  } catch (error: any) {
    console.error('发送消息失败:', error)
    // 移除刚才添加的消息
    const lastMessage = messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
    if (lastMessage && lastMessage.sender === 'doctor') {
      messages.value.pop()
    }
    alert(error.message || '发送失败，请重试')
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 回车发送
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
}

// 选择图片（医生端）
function chooseImages() {
  if (!isSocketConnected()) {
    alert('未连接，请稍候...')
    return
  }

  if (!selectedPatientId.value) {
    alert('请先选择患者')
    return
  }

  // 创建文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.style.display = 'none'
  
  // 清理函数
  const cleanup = () => {
    if (input.parentNode) {
      input.parentNode.removeChild(input)
    }
  }
  
  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (!files || files.length === 0) {
      cleanup()
      return
    }

    // 处理每个选中的图片
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        await sendImageMessage(file)
      }
    }

    // 清理
    cleanup()
  }

  // 监听取消事件（某些浏览器可能不支持）
  input.oncancel = () => {
    cleanup()
  }

  // 添加到DOM并触发点击
  document.body.appendChild(input)
  input.click()
  
  // 延迟清理（防止某些浏览器不触发onchange）
  setTimeout(() => {
    if (input.parentNode) {
      cleanup()
    }
  }, 1000)
}

// 发送图片消息（医生端）
async function sendImageMessage(file: File) {
  if (!isSocketConnected()) {
    return
  }

  try {
    // 将图片转换为base64
    const base64Image = await convertFileToBase64(file)
    
    // 先添加到本地消息列表（乐观更新）
    const doctor = doctorInfo.value
    const doctorMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: base64Image,
      sender: 'doctor',
      senderName: doctor.name,
      avatar: doctor.avatar,
      timestamp: Date.now(),
      type: 'image',
      imageUrl: base64Image
    }
    addMessage(doctorMessage)
    
    // 滚动到底部
    scrollToBottom()
    
    // 通过 Socket.IO 发送图片消息给患者
    console.log('📤 医生端发送图片消息:', {
      fromUserId: doctor.id,
      toUserId: patientInfo.value.id,
      imageSize: base64Image.length
    })
    
    const result = await sendMessage(patientInfo.value.id, base64Image, 'image')
    
    // 更新消息ID为服务器返回的ID（如果有）
    if (result && result.messageId) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.sender === 'doctor' && lastMessage.type === 'image') {
        lastMessage.id = result.messageId
        lastMessage.timestamp = result.timestamp || lastMessage.timestamp
      }
    }
    
    // 发送成功后，从后端重新加载最新消息，确保数据同步
    try {
      await reloadMessagesFromServer()
    } catch (reloadError) {
      console.warn('⚠️ 重新加载消息失败（不影响发送）:', reloadError)
    }
    
    console.log('✅ 图片消息发送成功（医生 -> 患者），已保存到后端')
  } catch (error: any) {
    console.error('发送图片消息失败:', error)
    alert(error.message || '发送图片失败，请重试')
    // 移除刚才添加的消息
    const lastMessage = messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
    if (lastMessage && lastMessage.sender === 'doctor' && lastMessage.type === 'image') {
      const index = messages.value.indexOf(lastMessage)
      if (index > -1) {
        messages.value.splice(index, 1)
      }
    }
  }
}

// 将文件转换为base64
function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }
    reader.readAsDataURL(file)
  })
}

// 切换表情选择器显示/隐藏
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

// 关闭表情选择器
function closeEmojiPicker() {
  showEmojiPicker.value = false
}

// 选择表情后的处理
function onSelectEmoji(emoji: any) {
  if (emoji && emoji.i) {
    // 将表情插入到输入框当前光标位置
    const textarea = textareaRef.value
    if (textarea) {
      const start = textarea.selectionStart || 0
      const end = textarea.selectionEnd || 0
      const textBefore = inputText.value.substring(0, start)
      const textAfter = inputText.value.substring(end)
      inputText.value = textBefore + emoji.i + textAfter
      
      // 设置光标位置到插入表情后
      nextTick(() => {
        const newPosition = start + emoji.i.length
        textarea.setSelectionRange(newPosition, newPosition)
        textarea.focus()
      })
    } else {
      // 如果没有焦点，直接追加到末尾
      inputText.value += emoji.i
    }
  }
}

// 点击外部关闭表情选择器的处理函数
let handleClickOutside: ((event: MouseEvent) => void) | null = null

// 预览图片
const previewImage = (imageUrl: string | undefined, allImages?: string[]) => {
  if (!imageUrl) {
    console.warn('⚠️ 图片URL为空，无法预览')
    return
  }
  
  console.log('🖼️ 预览图片:', imageUrl, '图片列表:', allImages?.length || 0)
  
  // 重置错误状态
  previewImageError.value = false
  
  // 处理图片URL（包括blob URL、base64、相对路径等）
  let processedUrl = processImageUrl(imageUrl)
  
  // 如果处理后的URL是blob URL，尝试从allImages中找到非blob的URL
  if (processedUrl.startsWith('blob:') && allImages && allImages.length > 0) {
    const nonBlobUrl = allImages.find(url => url && !url.startsWith('blob:'))
    if (nonBlobUrl) {
      processedUrl = processImageUrl(nonBlobUrl)
      console.log('🔄 使用非blob URL:', processedUrl.substring(0, 100))
    }
  }
  
  previewImageUrl.value = processedUrl
  
  // 如果有图片列表，使用列表；否则只显示当前图片
  if (allImages && allImages.length > 0) {
    previewImageList.value = allImages.map(url => processImageUrl(url)).filter(url => url)
    previewCurrentIndex.value = previewImageList.value.indexOf(processedUrl)
    if (previewCurrentIndex.value === -1) {
      previewCurrentIndex.value = 0
      previewImageList.value = [processedUrl].filter(url => url)
    }
  } else {
    previewImageList.value = processedUrl ? [processedUrl] : []
    previewCurrentIndex.value = 0
  }
  
  showImagePreview.value = true
  console.log('✅ 图片预览模态框已打开')
}

// 关闭图片预览
const closeImagePreview = () => {
  showImagePreview.value = false
  previewImageUrl.value = ''
  previewImageList.value = []
  previewCurrentIndex.value = 0
  previewImageError.value = false
}

// 处理图片预览错误
const handleImagePreviewError = () => {
  console.error('❌ 图片预览加载失败:', previewImageUrl.value)
  previewImageError.value = true
  
  // 如果是blob URL失败，尝试从列表中找其他可用的URL
  if (previewImageUrl.value.startsWith('blob:') && previewImageList.value.length > 0) {
    const nonBlobUrl = previewImageList.value.find(url => url && !url.startsWith('blob:'))
    if (nonBlobUrl) {
      console.log('🔄 尝试使用非blob URL:', nonBlobUrl.substring(0, 100))
      previewImageUrl.value = nonBlobUrl
      previewImageError.value = false
      return
    }
  }
  
  // 尝试加载下一张图片（如果有）
  if (previewImageList.value.length > 1 && previewCurrentIndex.value < previewImageList.value.length - 1) {
    setTimeout(() => {
      nextImage()
    }, 500)
  }
}

// 切换上一张图片
const prevImage = () => {
  if (previewCurrentIndex.value > 0) {
    previewCurrentIndex.value--
    const imageUrl = previewImageList.value[previewCurrentIndex.value]
    if (imageUrl) {
      previewImageUrl.value = imageUrl
      previewImageError.value = false // 重置错误状态
    }
  }
}

// 切换下一张图片
const nextImage = () => {
  if (previewCurrentIndex.value < previewImageList.value.length - 1) {
    previewCurrentIndex.value++
    const imageUrl = previewImageList.value[previewCurrentIndex.value]
    if (imageUrl) {
      previewImageUrl.value = imageUrl
      previewImageError.value = false // 重置错误状态
    }
  }
}

// 键盘事件处理（ESC关闭，左右箭头切换）
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showImagePreview.value) return
  
  if (e.key === 'Escape') {
    closeImagePreview()
  } else if (e.key === 'ArrowLeft') {
    prevImage()
  } else if (e.key === 'ArrowRight') {
    nextImage()
  }
}

// 监听键盘事件
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// 获取 API 基础 origin（用于相对路径拼完整 URL，与医生端实际请求的后端一致）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const getApiOrigin = (): string => {
  try {
    const u = new URL(API_BASE_URL)
    return u.origin
  } catch {
    return 'http://localhost:3000'
  }
}

// 处理图片URL，确保base64图片有正确的前缀，并处理blob URL
const processImageUrl = (url: string | undefined): string => {
  if (!url) return ''
  
  // 如果已经是完整的data URL，直接返回
  if (url.startsWith('data:')) {
    return url
  }
  
  // 如果是blob URL，尝试转换为base64（如果可能）
  // 注意：blob URL 可能在页面刷新后失效，需要从原始数据重新创建
  if (url.startsWith('blob:')) {
    console.warn('⚠️ 检测到blob URL，可能已失效:', url.substring(0, 50))
    // blob URL 无法跨页面使用，如果失效则返回空字符串，让错误处理函数处理
    // 这里返回原URL，让错误处理函数尝试使用备用URL
    return url
  }
  
  // 如果是base64字符串（没有前缀），添加前缀
  // 检查是否是base64格式（通常很长且只包含base64字符）
  if (url.length > 100 && /^[A-Za-z0-9+/=]+$/.test(url.substring(0, 100))) {
    // 尝试检测图片类型
    const isPng = url.includes('iVBORw0KGgo') || url.startsWith('iVBOR')
    const mimeType = isPng ? 'image/png' : 'image/jpeg'
    return `data:${mimeType};base64,${url}`
  }
  
  // 如果是HTTP/HTTPS URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 如果是相对路径，使用与环境变量一致的 API origin 拼完整 URL（避免医生端与后端不同域时加载失败）
  if (url.startsWith('/')) {
    return `${getApiOrigin()}${url}`
  }
  
  // 其他情况（如 file://、本地 path）：医生端无法加载，返回空由占位符处理
  if (url.startsWith('file:') || /^[a-zA-Z]:[\\/]/.test(url) || url.includes('tmp/') || url.includes('tempFile')) {
    console.warn('⚠️ 跳过无法加载的本地路径:', url.substring(0, 80))
    return ''
  }
  
  return url
}

// 处理图片加载错误
const handleImageError = (e: Event, imgData?: any) => {
  const img = e.target as HTMLImageElement
  const originalSrc = img.src
  console.error('❌ 图片加载失败:', {
    src: originalSrc.substring(0, 100),
    isBlob: originalSrc.startsWith('blob:'),
    imgData: imgData,
    hasUrl: !!imgData?.url,
    hasThumb: !!imgData?.thumb
  })
  
  // 如果是blob URL失败，尝试从imgData获取原始数据
  if (originalSrc.startsWith('blob:')) {
    console.log('🔄 blob URL失效，尝试使用备用数据')
    
    // 尝试使用imgData中的URL
    if (imgData) {
      let imageUrl = imgData.url || imgData.thumb
      if (imageUrl) {
        // 处理URL格式
        imageUrl = processImageUrl(imageUrl)
        console.log('🔄 尝试使用备用URL:', imageUrl.substring(0, 100))
        
        // 如果URL不同，尝试重新加载
        if (imageUrl !== originalSrc && imageUrl) {
          img.src = imageUrl
          return // 等待新的加载结果
        }
      }
    }
    
    // 如果imgData中有base64数据，尝试直接使用
    if (imgData && (imgData.base64 || imgData.content)) {
      const base64Data = imgData.base64 || imgData.content
      if (base64Data && typeof base64Data === 'string') {
        const processedUrl = processImageUrl(base64Data)
        if (processedUrl && processedUrl !== originalSrc) {
          console.log('🔄 尝试使用base64数据')
          img.src = processedUrl
          return
        }
      }
    }
  } else {
    // 非blob URL的错误，尝试使用备用URL
    if (imgData) {
      let imageUrl = imgData.url || imgData.thumb
      if (imageUrl) {
        imageUrl = processImageUrl(imageUrl)
        console.log('🔄 尝试使用备用URL:', imageUrl.substring(0, 100))
        
        if (imageUrl !== originalSrc && imageUrl) {
          img.src = imageUrl
          return
        }
      }
    }
  }
  
  // 如果所有尝试都失败，隐藏图片并显示占位符
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.image-placeholder')
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'block'
    ;(placeholder as HTMLElement).textContent = '图片加载失败'
  } else {
    // 如果没有占位符，创建一个
    const errorDiv = document.createElement('div')
    errorDiv.className = 'image-placeholder'
    errorDiv.textContent = '图片加载失败'
    errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #999; background: #f5f5f5; border-radius: 4px;'
    img.parentElement?.appendChild(errorDiv)
  }
}

// 处理图片加载成功
const handleImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  console.log('图片加载成功:', img.src)
}

// 获取所有图片消息的URL列表（用于预览时切换）
const getAllImageUrls = (): string[] => {
  return messages.value
    .filter(msg => msg.type === 'image')
    .map(msg => {
      const url = msg.imageUrl || msg.content
      return url ? processImageUrl(url) : ''
    })
    .filter(url => url && url.trim() !== '' && !url.startsWith('blob:')) // 排除blob URL
}

// 获取头像颜色（根据患者ID生成固定颜色）
function getAvatarColor(patientId: string | undefined): string {
  if (!patientId) {
    return '#9C27B0' // 默认颜色
  }
  const id: string = patientId // 类型断言，确保是 string
  if (id.length === 0) {
    return '#9C27B0' // 默认颜色
  }
  const colors = [
    '#9C27B0', // 紫色
    '#2196F3', // 蓝色
    '#4CAF50', // 绿色
    '#FF9800', // 橙色
    '#F44336', // 红色
    '#00BCD4', // 青色
    '#E91E63', // 粉色
    '#795548'  // 棕色
  ]
  // 根据ID的hash值选择颜色
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  const color = colors[index]
  return color || '#9C27B0'
}

/**
 * 初始化患者列表（从数据库和Socket.IO事件动态获取）
 */
async function initPatientList() {
  // 初始化为空列表
  patientList.value = []
  
  // 从数据库加载咨询记录
  try {
    const doctor = doctorInfo.value
    console.log('🔄 开始加载咨询记录，医生ID:', doctor.id)
    
    if (!doctor.id) {
      console.warn('⚠️ 医生ID为空，无法加载咨询记录')
      return
    }
    
    const apiUrl = `${API_BASE_URL}/chat/consultations?doctorId=${doctor.id}`
    console.log('📡 请求URL:', apiUrl)
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      console.error('❌ API请求失败:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('错误详情:', errorText)
      return
    }
    
    const result = await response.json()
    console.log('📦 API响应:', result)
    
    if (result.success && result.data && result.data.length > 0) {
      // 将咨询记录转换为患者列表
      result.data.forEach((consultation: any) => {
        console.log('📋 处理咨询记录:', consultation)
        updatePatientInList(consultation.patientId, {
          name: consultation.patientInfo?.name || '患者',
          avatar: consultation.patientInfo?.avatar || '👤',
          lastMessage: consultation.lastMessage || '',
          lastMessageTime: consultation.lastMessageTime ? new Date(consultation.lastMessageTime).getTime() : Date.now(),
          unreadCount: 0, // 从数据库加载的默认为0，实时消息会更新
          isOnline: false // 需要从Socket.IO事件中更新
        })
      })
      
      console.log('✅ 从数据库加载咨询记录:', result.data.length, '条')
      console.log('📋 当前患者列表:', patientList.value)
    } else {
      console.log('ℹ️ 数据库中没有咨询记录，等待实时消息...')
    }
  } catch (error: any) {
    console.error('❌ 加载咨询记录失败:', error)
    console.error('错误详情:', error.message, error.stack)
    // 即使加载失败，也继续（可以通过Socket.IO实时接收患者）
  }
  
  // 如果有路由参数，选中对应的患者
  const routePatientId = route.query.patientId as string
  if (routePatientId) {
    selectedPatientId.value = routePatientId
  }
}

/**
 * 更新患者列表中的患者信息
 */
function updatePatientInList(patientId: string, patientInfo: Partial<Patient>) {
  if (!patientId) {
    console.warn('⚠️ updatePatientInList: patientId为空', patientInfo)
    return
  }
  
  console.log('🔄 更新患者列表:', { patientId, patientInfo })
  
  // 首先尝试根据 patientId 匹配
  let existingIndex = patientList.value.findIndex(p => p.id === patientId)
  
  // 如果根据 patientId 没找到，尝试根据姓名匹配（同姓名患者去重）
  if (existingIndex < 0 && patientInfo.name) {
    existingIndex = patientList.value.findIndex(p => p.name === patientInfo.name)
    if (existingIndex >= 0) {
      console.log('🔍 根据姓名找到同名患者，进行合并:', patientInfo.name)
    }
  }
  
  if (existingIndex >= 0) {
    // 更新现有患者信息（合并数据）
    const existingPatient = patientList.value[existingIndex]
    if (existingPatient) {
      patientList.value[existingIndex] = {
        ...existingPatient,
        ...patientInfo,
        // 确保 id 存在
        id: existingPatient.id || patientId,
        // 确保 name 存在
        name: existingPatient.name || patientInfo.name || '患者',
        // 保留最新的消息时间和未读计数
        lastMessageTime: Math.max(
          existingPatient.lastMessageTime || 0,
          patientInfo.lastMessageTime || 0
        ),
        unreadCount: (existingPatient.unreadCount || 0) + (patientInfo.unreadCount || 0),
        // 如果新数据有更晚的消息，更新最后一条消息
        lastMessage: (patientInfo.lastMessageTime || 0) > (existingPatient.lastMessageTime || 0)
          ? (patientInfo.lastMessage || existingPatient.lastMessage)
          : (existingPatient.lastMessage || patientInfo.lastMessage)
      }
      console.log('✅ 更新现有患者（去重后）:', patientList.value[existingIndex])
    }
  } else {
    // 添加新患者
    const newPatient: Patient = {
      id: patientId,
      name: patientInfo.name || '患者',
      avatar: patientInfo.avatar || '👤',
      isOnline: patientInfo.isOnline !== undefined ? patientInfo.isOnline : true,
      lastMessage: patientInfo.lastMessage || '',
      lastMessageTime: patientInfo.lastMessageTime || Date.now(),
      unreadCount: patientInfo.unreadCount || 0
    }
    patientList.value.push(newPatient)
    console.log('✅ 添加新患者:', newPatient)
  }
  
  // 按最后消息时间排序（最新的在前）
  patientList.value.sort((a, b) => {
    const timeA = a.lastMessageTime || 0
    const timeB = b.lastMessageTime || 0
    return timeB - timeA
  })
  
  console.log('📋 当前患者列表（排序后）:', patientList.value.length, '条', patientList.value.map(p => ({ id: p.id, name: p.name })))
  
  // 如果当前没有选中的患者，且列表不为空，选中第一个
  if (!selectedPatientId.value && patientList.value.length > 0) {
    const firstPatient = patientList.value[0]
    if (firstPatient && firstPatient.id) {
      selectedPatientId.value = firstPatient.id
      // 更新患者信息（使用外部的 patientInfo ref，不是函数参数）
      patientInfo.value = {
        name: firstPatient.name as string,
        avatar: (firstPatient.avatar || '👤') as string,
        id: firstPatient.id as string
      }
      console.log('✅ 自动选中第一个患者:', firstPatient)
    }
  }
}

/**
 * 从后端重新加载最新消息（用于同步数据）
 * @param incremental - 是否增量拉取（只拉取新消息，默认false）
 * @param sinceTimestamp - 增量拉取的起始时间戳（只拉取此时间之后的消息）
 */
async function reloadMessagesFromServer(incremental: boolean = false, sinceTimestamp?: number) {
  if (!selectedPatientId.value) {
    return
  }
  
  // 如果正在拉取，避免重复请求
  if (isPullingMessages) {
    return
  }
  
  // 取消之前的请求
  if (currentAbortController) {
    currentAbortController.abort()
  }
  
  isPullingMessages = true
  
  try {
    const doctor = doctorInfo.value
    const patient = patientList.value.find(p => p.id === selectedPatientId.value)
    if (!patient) {
      isPullingMessages = false
      return
    }
    
    // 构建请求URL
    let requestUrl = `${API_BASE_URL}/chat/consultation?patientId=${patient.id}&doctorId=${doctor.id}`
    
    // 如果是增量拉取，添加时间戳参数（如果后端支持）
    if (incremental && sinceTimestamp) {
      requestUrl += `&since=${sinceTimestamp}`
    } else {
      // 非增量拉取时限制数量
      requestUrl += `&limit=${INITIAL_MESSAGE_LIMIT}`
    }
    
    // 创建新的AbortController
    currentAbortController = new AbortController()
    const response = await fetch(requestUrl, {
      signal: currentAbortController.signal
    })
    const result = await response.json()
    
    if (result.success && result.data) {
      const historyMessages = result.data.messages || []
      
      if (historyMessages.length > 0) {
        // 更新最后拉取时间戳
        const maxTimestamp = Math.max(...historyMessages.map((msg: any) => 
          msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now())
        ))
        lastPullTimestamp = Math.max(lastPullTimestamp, maxTimestamp)
      }
      
      // 转换为消息格式
      const sortedMessages = historyMessages
        .map((msg: any) => {
          const isFromDoctor = msg.fromUserId === doctor.id || msg.fromUserId.startsWith('doctor_')
          
          // 解析患者信息卡片（如果存在）
          let patientCardData: PatientCardData | undefined = undefined
          if (msg.type === 'patient-card') {
            try {
              // 优先从 extra 中获取
              if (msg.extra?.patientCardData) {
                patientCardData = msg.extra.patientCardData
              } else if (msg.content) {
                // 尝试从 content 中解析 JSON
                try {
                  patientCardData = JSON.parse(msg.content)
                } catch (e) {
                  console.error('❌ 解析患者信息卡片失败:', e)
                }
              }
              
              // 确保图片URL格式正确（处理base64）
              if (patientCardData && patientCardData.images) {
                patientCardData.images = patientCardData.images.map((img: any) => ({
                  ...img,
                  url: img.url ? processImageUrl(img.url) : img.url,
                  thumb: img.thumb ? processImageUrl(img.thumb) : img.thumb
                }))
              }
            } catch (e) {
              console.error('❌ 处理患者信息卡片失败:', e)
            }
          }
          
          return {
            id: msg.messageId || msg._id,
            content: msg.content || '',
            sender: isFromDoctor ? 'doctor' : 'user',
            senderName: isFromDoctor ? doctor.name : patientInfo.value.name,
            avatar: isFromDoctor ? doctor.avatar : patientInfo.value.avatar,
            timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()),
            type: msg.type || 'text',
            imageUrl: msg.type === 'image' ? processImageUrl(msg.content) : undefined,
            // 添加患者信息卡片数据
            patientCardData: patientCardData
          }
        })
        .filter((msg: any) => {
          // 过滤掉空消息（没有内容且不是图片或患者卡片）
          // 对于患者信息卡片，即使 content 为空，只要有 patientCardData 就保留
          if (msg.type === 'patient-card') {
            return !!msg.patientCardData
          }
          return msg.content || msg.type === 'image' || msg.type === 'patient-card'
        })
        .sort((a: Message, b: Message) => (a.timestamp || 0) - (b.timestamp || 0))
      
      // 合并到现有消息（去重）
      mergeMessages(sortedMessages)
      
      console.log('✅ 从后端重新加载消息:', messages.value.length, '条', incremental ? '(增量)' : '')
    }
  } catch (error) {
    console.error('❌ 重新加载消息失败:', error)
  } finally {
    isPullingMessages = false
  }
}

/**
 * 合并服务器消息到本地消息列表（去重）
 */
function mergeMessages(serverMessages: Message[]) {
  if (!serverMessages || serverMessages.length === 0) {
    return
  }
  
  // 使用Map进行去重（以消息ID为key）
  const messageMap = new Map<string, Message>()
  
  // 先添加现有消息
  messages.value.forEach(msg => {
    const key = msg.id || `${msg.timestamp}_${msg.content}`
    messageMap.set(key, msg)
  })
  
  // 添加服务器消息（如果有相同的ID则更新，否则添加）
  serverMessages.forEach(msg => {
    const key = msg.id || `${msg.timestamp}_${msg.content}`
    const existing = messageMap.get(key)
    if (!existing || (existing.timestamp < msg.timestamp)) {
      messageMap.set(key, msg)
    }
  })
  
  // 更新消息列表（按时间排序）
  const mergedMessages = Array.from(messageMap.values()).sort((a: Message, b: Message) => (a.timestamp || 0) - (b.timestamp || 0))
  
  // 只有当有新消息时才更新列表
  if (mergedMessages.length !== messages.value.length || 
      mergedMessages.some((msg, index) => msg.id !== messages.value[index]?.id)) {
    messages.value = mergedMessages
    
    // 滚动到底部显示最新消息
    nextTick(() => {
      scrollToBottom()
    })
  }
}

/**
 * 自动拉取最新消息（增量拉取）
 */
async function autoPullLatestMessages() {
  if (!selectedPatientId.value) {
    return
  }
  
  // 如果Socket已连接，优先使用Socket接收消息，这里作为补充
  // 只在Socket未连接或需要同步时使用
  if (!isSocketConnected()) {
    // Socket未连接时，使用全量拉取
    await reloadMessagesFromServer(false)
    return
  }
  
  // Socket已连接时，使用增量拉取（只拉取新消息）
  const sinceTimestamp = lastPullTimestamp || (messages.value.length > 0 
    ? Math.max(...messages.value.map(msg => msg.timestamp || 0))
    : Date.now() - 24 * 60 * 60 * 1000) // 如果没有消息，拉取最近24小时的消息
  
  await reloadMessagesFromServer(true, sinceTimestamp)
}

/**
 * 启动自动拉取消息定时器
 */
function startAutoPullTimer() {
  // 清除现有定时器
  stopAutoPullTimer()
  
  // 设置定时器，每30秒自动拉取一次
  autoPullTimer = setInterval(() => {
    if (selectedPatientId.value && isSocketConnected()) {
      // Socket已连接时，使用增量拉取
      autoPullLatestMessages()
    } else if (selectedPatientId.value) {
      // Socket未连接时，使用全量拉取
      reloadMessagesFromServer(false)
    }
  }, AUTO_PULL_INTERVAL)
  
  console.log('✅ 已启动自动拉取消息定时器（间隔', AUTO_PULL_INTERVAL / 1000, '秒）')
}

/**
 * 停止自动拉取消息定时器
 */
function stopAutoPullTimer() {
  if (autoPullTimer) {
    clearInterval(autoPullTimer)
    autoPullTimer = null
    console.log('✅ 已停止自动拉取消息定时器')
  }
}

/**
 * 监听页面可见性变化（当页面重新可见时自动拉取最新消息）
 */
function setupVisibilityListener() {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && selectedPatientId.value) {
        console.log('👁️ 页面重新可见，自动拉取最新消息')
        autoPullLatestMessages()
      }
    })
  }
}

// 防抖版的消息拉取，避免高频触发
const reloadMessagesDebounced = debounce(async () => {
  try {
    await reloadMessagesFromServer()
  } catch (error) {
    console.warn('reloadMessagesDebounced 失败:', error)
  }
}, 500)

/**
 * 选择患者
 */
async function selectPatient(patient: Patient) {
  selectedPatientId.value = patient.id
  patientInfo.value = {
    name: patient.name,
    avatar: patient.avatar || '👤',
    id: patient.id
  }
  
  // 清空未读计数
  const patientInList = patientList.value.find(p => p.id === patient.id)
  if (patientInList) {
    patientInList.unreadCount = 0
  }
  
  // 重置分页状态
  hasMoreMessages.value = true
  oldestMessageTimestamp.value = null
  isLoadingMore.value = false
  
  // 取消之前的请求
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
  
  // 从数据库加载历史消息
  isLoadingHistory.value = true
  try {
    const doctor = doctorInfo.value
    
    let historyMessages: any[] = []
    let consultation: any = null
    
    // 首先尝试从咨询接口获取历史消息（限制初始加载数量）
    try {
      // 创建新的AbortController
      currentAbortController = new AbortController()
      const response = await fetch(`${API_BASE_URL}/chat/consultation?patientId=${patient.id}&doctorId=${doctor.id}&limit=${INITIAL_MESSAGE_LIMIT}`, {
        signal: currentAbortController.signal
      })
      if (response.ok) {
        const result = await response.json()
        console.log('📦 咨询接口API响应:', {
          success: result.success,
          hasConsultation: !!result.data?.consultation,
          messageCount: result.data?.messages?.length || 0
        })
        
        if (result.success && result.data) {
          consultation = result.data.consultation
          historyMessages = result.data.messages || []
          
          // 记录消息数量（简化日志）
          if (historyMessages.length > 0) {
            console.log('📋 收到消息:', historyMessages.length, '条')
          }
          
          // 更新患者信息（使用数据库中的真实信息）
          if (consultation && consultation.patientInfo) {
            patientInfo.value = {
              name: consultation.patientInfo.name || patient.name,
              avatar: consultation.patientInfo.avatar || patient.avatar || '👤',
              id: patient.id
            }
            
            // 更新患者列表中的信息
            updatePatientInList(patient.id, {
              name: consultation.patientInfo.name,
              avatar: consultation.patientInfo.avatar
            })
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ 从咨询接口加载历史消息失败，尝试从历史消息接口加载:', err)
    }
    
    // 如果咨询接口没有返回消息，尝试从历史消息接口加载
    if (historyMessages.length === 0) {
      try {
        // 创建新的AbortController
        currentAbortController = new AbortController()
        const historyResponse = await fetch(`${API_BASE_URL}/chat/history?userId=${patient.id}&targetId=${doctor.id}&limit=${INITIAL_MESSAGE_LIMIT}`, {
          signal: currentAbortController.signal
        })
        if (historyResponse.ok) {
          const historyResult = await historyResponse.json()
          console.log('📦 历史消息接口API响应:', {
            success: historyResult.success,
            messageCount: historyResult.messages?.length || 0
          })
          
          if (historyResult.success && historyResult.messages && historyResult.messages.length > 0) {
            historyMessages = historyResult.messages
          }
        }
      } catch (err) {
        console.warn('⚠️ 从历史消息接口加载失败:', err)
      }
    }
    
    // 处理历史消息，并按时间戳排序（最早的在前，最新的在后）
    if (historyMessages.length > 0) {
      const sortedMessages = historyMessages
        .map((msg: any) => {
          // 使用医生ID准确判断消息发送者（确保医生消息显示在右侧）
          const isFromDoctor = msg.fromUserId === doctor.id || msg.fromUserId.startsWith('doctor_')
          
          // 解析患者信息卡片（如果存在）
          let patientCardData: PatientCardData | undefined = undefined
          if (msg.type === 'patient-card') {
            try {
              // 优先从 extra 中获取
              if (msg.extra?.patientCardData) {
                patientCardData = msg.extra.patientCardData
              } else if (msg.content) {
                // 尝试从 content 中解析 JSON
                try {
                  patientCardData = JSON.parse(msg.content)
                } catch (e) {
                  console.error('❌ 解析患者信息卡片失败:', e)
                }
              }
              
              // 确保图片URL格式正确（处理base64）
              if (patientCardData && patientCardData.images) {
                patientCardData.images = patientCardData.images.map((img: any) => ({
                  ...img,
                  url: img.url ? processImageUrl(img.url) : img.url,
                  thumb: img.thumb ? processImageUrl(img.thumb) : img.thumb
                }))
              }
            } catch (e) {
              console.error('❌ 处理患者信息卡片失败:', e)
            }
          }
          
          return {
            id: msg.messageId || msg._id,
            content: msg.content || '',
            sender: isFromDoctor ? 'doctor' : 'user', // 医生消息 sender='doctor' 显示在右侧
            senderName: isFromDoctor ? doctor.name : patientInfo.value.name,
            avatar: isFromDoctor ? doctor.avatar : patientInfo.value.avatar,
            timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()),
            type: msg.type || 'text',
            imageUrl: msg.type === 'image' ? processImageUrl(msg.content) : undefined,
            // 添加患者信息卡片数据
            patientCardData: patientCardData
          }
        })
        .filter((msg: any) => {
          // 过滤掉空消息（没有内容且不是图片或患者卡片）
          // 对于患者信息卡片，即使 content 为空，只要有 patientCardData 就保留
          if (msg.type === 'patient-card') {
            return !!msg.patientCardData
          }
          return msg.content || msg.type === 'image' || msg.type === 'patient-card'
        })
        .sort((a: Message, b: Message) => (a.timestamp || 0) - (b.timestamp || 0)) // 按时间戳升序排序（最早的在前）
      
      messages.value = sortedMessages
      
      // 调试：检查patient-card消息的图片数据
      const patientCardMessages = sortedMessages.filter(m => m.type === 'patient-card')
      console.log('📋 patient-card消息数量:', patientCardMessages.length)
      patientCardMessages.forEach((msg, index) => {
        console.log(`📦 patient-card消息 ${index + 1}:`, {
          id: msg.id,
          hasPatientCardData: !!msg.patientCardData,
          imageCount: msg.patientCardData?.images?.length || 0,
          images: msg.patientCardData?.images?.map((img: any) => ({
            hasUrl: !!img.url,
            hasThumb: !!img.thumb,
            urlLength: img.url?.length || 0,
            urlPreview: img.url?.substring(0, 50),
            urlStartsWithData: img.url?.startsWith('data:') || false
          }))
        })
      })
      
      console.log('✅ 加载历史消息成功:', {
        count: sortedMessages.length,
        patientId: patient.id,
        doctorId: doctor.id,
        patientCardCount: patientCardMessages.length,
        messages: sortedMessages.map(m => ({
          id: m.id,
          sender: m.sender,
          type: m.type,
          content: m.content?.substring(0, 30),
          hasPatientCardData: !!m.patientCardData,
          imageCount: m.patientCardData?.images?.length || 0,
          timestamp: m.timestamp
        }))
      })
      
      // 更新分页状态
      if (messages.value.length > 0) {
        oldestMessageTimestamp.value = Math.min(...messages.value.map(m => m.timestamp))
        // 如果返回的消息数量少于限制，说明没有更多消息了
        hasMoreMessages.value = historyMessages.length >= INITIAL_MESSAGE_LIMIT
      } else {
        hasMoreMessages.value = false
      }
      
      // 滚动到底部显示最新消息
      nextTick(() => {
        scrollToBottom()
      })
    } else {
      // 如果没有历史记录，清空消息列表
      hasMoreMessages.value = false
      messages.value = []
    }
  } catch (error: any) {
    console.error('❌ 加载历史消息失败:', error)
    // 加载失败时清空消息列表，显示空状态
    messages.value = []
    // 可以在这里添加错误提示，但不阻塞界面
    console.warn('⚠️ 加载历史消息失败，但可以继续使用实时消息功能')
  } finally {
    isLoadingHistory.value = false
  }
  
  // 重新初始化Socket连接（切换患者）
  initSocketService()
}

/**
 * 加载更多历史消息（滚动到顶部时触发）
 */
async function loadMoreMessages() {
  if (!selectedPatientId.value || isLoadingMore.value || !hasMoreMessages.value || !oldestMessageTimestamp.value) {
    return
  }
  
  isLoadingMore.value = true
  
  try {
    const doctor = doctorInfo.value
    const patient = patientList.value.find(p => p.id === selectedPatientId.value)
    if (!patient) {
      isLoadingMore.value = false
      return
    }
    
    // 取消之前的请求
    if (currentAbortController) {
      currentAbortController.abort()
    }
    
    // 创建新的AbortController
    currentAbortController = new AbortController()
    
    // 获取当前滚动位置
    const container = chatContainer.value
    const scrollHeight = container?.scrollHeight || 0
    
    // 请求更早的消息
    const response = await fetch(
      `${API_BASE_URL}/chat/history?userId=${patient.id}&targetId=${doctor.id}&limit=${PAGE_SIZE}&before=${oldestMessageTimestamp.value}`,
      { signal: currentAbortController.signal }
    )
    
    if (!response.ok) {
      throw new Error('加载更多消息失败')
    }
    
    const result = await response.json()
    
    if (result.success && result.data && result.data.length > 0) {
      const olderMessages = result.data.map((msg: any) => {
        const isFromDoctor = msg.fromUserId === doctor.id || msg.fromUserId.startsWith('doctor_')
        
        // 解析患者信息卡片
        let patientCardData: PatientCardData | undefined = undefined
        if (msg.type === 'patient-card') {
          try {
            if (msg.extra?.patientCardData) {
              patientCardData = msg.extra.patientCardData
            } else if (msg.content) {
              try {
                patientCardData = JSON.parse(msg.content)
              } catch (e) {
                console.error('❌ 解析患者信息卡片失败:', e)
              }
            }
            
            if (patientCardData && patientCardData.images) {
              patientCardData.images = patientCardData.images.map((img: any) => ({
                ...img,
                url: img.url ? processImageUrl(img.url) : img.url,
                thumb: img.thumb ? processImageUrl(img.thumb) : img.thumb
              }))
            }
          } catch (e) {
            console.error('❌ 处理患者信息卡片失败:', e)
          }
        }
        
        return {
          id: msg.messageId || msg._id || `msg_${Date.now()}_${Math.random()}`,
          content: msg.content || '',
          sender: isFromDoctor ? 'doctor' : 'user',
          senderName: isFromDoctor ? (doctor.name || '医生') : (msg.fromUserName || patient.name || '患者'),
          avatar: isFromDoctor ? (doctor.avatar || '👨‍⚕️') : (patient.avatar || '👤'),
          timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()),
          type: msg.type || 'text',
          imageUrl: msg.imageUrl,
          patientCardData
        }
      })
      
      // 将旧消息插入到数组开头
      messages.value = [...olderMessages, ...messages.value]
      
      // 更新最旧消息的时间戳
      if (olderMessages.length > 0) {
        oldestMessageTimestamp.value = Math.min(...olderMessages.map(m => m.timestamp))
        // 如果返回的消息数量少于分页大小，说明没有更多消息了
        hasMoreMessages.value = olderMessages.length >= PAGE_SIZE
      } else {
        hasMoreMessages.value = false
      }
      
      // 保持滚动位置（避免跳到底部）
      nextTick(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - scrollHeight
        }
      })
    } else {
      hasMoreMessages.value = false
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // 请求被取消，忽略错误
      return
    }
    console.error('❌ 加载更多消息失败:', error)
    hasMoreMessages.value = false
  } finally {
    isLoadingMore.value = false
  }
}

/**
 * 处理滚动事件（检测是否滚动到顶部）
 */
function handleScroll() {
  const container = chatContainer.value
  if (!container || isLoadingMore.value || !hasMoreMessages.value) {
    return
  }
  
  // 当滚动到顶部附近（100px内）时加载更多
  if (container.scrollTop < 100) {
    loadMoreMessages()
  }
}

/**
 * 获取患者名称首字母（用于头像）
 */
function getPatientInitial(name: string): string {
  if (!name) return '?'
  // 提取中文或英文首字母
  const firstChar = name.charAt(0)
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    return firstChar
  } else if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase()
  }
  return '?'
}

/**
 * 格式化时间
 */
function formatLastMessageTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/**
 * 过滤患者列表（带去重逻辑）
 */
const filteredPatientList = computed(() => {
  // 先去重：根据姓名去重，保留最新的记录
  const uniquePatients = new Map<string, Patient>()
  
  patientList.value.forEach(patient => {
    const name = patient.name || '患者'
    const existing = uniquePatients.get(name)
    
    // 如果已存在同名患者，保留消息时间更晚的
    if (existing) {
      const existingTime = existing.lastMessageTime || 0
      const currentTime = patient.lastMessageTime || 0
      if (currentTime > existingTime) {
        uniquePatients.set(name, patient)
      }
    } else {
      uniquePatients.set(name, patient)
    }
  })
  
  // 转换为数组
  let result = Array.from(uniquePatients.values())

  // 只显示在线用户（谁在线显示谁）
  result = result.filter(patient => !!patient.isOnline)
  
  // 如果有搜索关键词，进行过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(patient => {
      const name = (patient.name || '').toLowerCase()
      const id = (patient.id || '').toLowerCase()
      return name.includes(keyword) || id.includes(keyword)
    }
    )
  }
  
  return result
})

/**
 * 获取选中患者的在线状态
 */
const selectedPatientOnlineStatus = computed(() => {
  if (!selectedPatientId.value) {
    return false
  }
  const patient = patientList.value.find(p => p.id === selectedPatientId.value)
  return patient?.isOnline ?? false
})

/**
 * 切换上岗/下岗状态
 */
async function toggleDuty(onDuty: boolean) {
  try {
    const doctor = doctorInfo.value
    const socketInstance = getSocketInstance()
    
    if (!socketInstance || !isConnected.value) {
      alert('未连接，请先连接Socket.IO')
      return
    }
    
    // 发送上岗/下岗事件（含 username，供患者端展示实际聊天医生）
    socketInstance.emit('doctor:duty', {
      doctorId: doctor.id,
      onDuty: onDuty,
      doctorInfo: {
        username: doctor.name,
        name: doctor.name,
        avatar: doctor.avatar,
        email: doctor.email,
        role: doctor.role
      }
    })
    
    // 注意：实际状态由服务器确认后更新（通过doctor:duty:success事件）
    // 这里先乐观更新
    isOnDuty.value = onDuty
    // 暂时保存状态（如果服务器确认失败，会在doctor:duty:error中恢复）
    saveDutyStatus(onDuty)
    
    console.log(`📤 发送${onDuty ? '上岗' : '下岗'}请求:`, doctor.id)
  } catch (error: any) {
    console.error('切换上岗状态失败:', error)
    alert('操作失败: ' + (error.message || '未知错误'))
    // 恢复状态
    isOnDuty.value = !onDuty
    saveDutyStatus(!onDuty)
  }
}

/**
 * ==================== 通话相关方法 ====================
 */

// 发起视频通话
async function startVideoCall() {
  if (!callManager) {
    alert('通话功能未初始化')
    return
  }
  
  if (!selectedPatientId.value) {
    alert('请先选择患者')
    return
  }
  
  try {
    callType.value = 'video'
    isInCall.value = true
    callStatusText.value = '正在连接...'
    
    // 等待DOM更新，确保视频元素已渲染
    await nextTick()
    // 额外等待一小段时间，确保视频元素完全渲染
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 获取视频元素（确保获取到真实的DOM元素）
    let localVideo: HTMLVideoElement | null = null
    let remoteVideo: HTMLVideoElement | null = null
    
    if (localVideoRef.value) {
      localVideo = localVideoRef.value as HTMLVideoElement
      console.log('📹 本地视频元素:', localVideo, localVideo.tagName)
    }
    
    if (remoteVideoRef.value) {
      remoteVideo = remoteVideoRef.value as HTMLVideoElement
      console.log('📹 远程视频元素:', remoteVideo, remoteVideo.tagName)
    }
    
    // 如果ref获取失败，尝试通过DOM查询
    if (!localVideo || localVideo.tagName !== 'VIDEO') {
      const localEl = document.querySelector('video.local-video') as HTMLVideoElement
      if (localEl) {
        localVideo = localEl
        console.log('✅ 通过DOM查询找到本地视频元素')
      }
    }
    
    if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
      const remoteEl = document.querySelector('video.remote-video') as HTMLVideoElement
      if (remoteEl) {
        remoteVideo = remoteEl
        console.log('✅ 通过DOM查询找到远程视频元素')
      }
    }
    
    if (!remoteVideo) {
      console.error('❌ 无法找到远程视频元素')
      alert('无法找到视频元素，请刷新页面重试')
      isInCall.value = false
      return
    }
    
    await callManager.startCall(
      selectedPatientId.value,
      'video',
      localVideo,
      remoteVideo
    )
    callStatusText.value = '通话中...'
  } catch (error: any) {
    console.error('发起视频通话失败:', error)
    alert(error.message || '发起通话失败')
    isInCall.value = false
  }
}

// 发起语音通话
async function startAudioCall() {
  if (!callManager) {
    alert('通话功能未初始化')
    return
  }
  
  if (!selectedPatientId.value) {
    alert('请先选择患者')
    return
  }
  
  try {
    callType.value = 'audio'
    isInCall.value = true
    callStatusText.value = '正在连接...'
    
    // 等待DOM更新
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 获取视频元素
    let localVideo: HTMLVideoElement | null = null
    let remoteVideo: HTMLVideoElement | null = null
    
    if (localVideoRef.value) {
      localVideo = localVideoRef.value as HTMLVideoElement
    }
    
    if (remoteVideoRef.value) {
      remoteVideo = remoteVideoRef.value as HTMLVideoElement
    }
    
    // 如果ref获取失败，尝试通过DOM查询
    if (!localVideo || localVideo.tagName !== 'VIDEO') {
      const localEl = document.querySelector('video.local-video') as HTMLVideoElement
      if (localEl) localVideo = localEl
    }
    
    if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
      const remoteEl = document.querySelector('video.remote-video') as HTMLVideoElement
      if (remoteEl) remoteVideo = remoteEl
    }
    
    // 语音通话必须传入远程音频元素，否则对方声音可能无声
    let remoteAudio: HTMLAudioElement | null = null
    // 多次尝试获取音频元素，因为 DOM 可能还在更新
    for (let i = 0; i < 3 && !remoteAudio; i++) {
      if (remoteAudioRef.value) {
        remoteAudio = remoteAudioRef.value as HTMLAudioElement
      }
      if (!remoteAudio) {
        const audioEl = document.querySelector('audio.remote-audio') as HTMLAudioElement
        if (audioEl && audioEl.tagName === 'AUDIO') {
          remoteAudio = audioEl
        }
      }
      if (!remoteAudio && i < 2) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    if (!remoteAudio) {
      console.warn('⚠️ [医者端]无法找到远程音频元素，将使用兜底方案')
    } else {
      console.log('✅ [医者端]找到远程音频元素:', remoteAudio)
    }
    
    await callManager.startCall(
      selectedPatientId.value,
      'audio',
      localVideo,
      remoteVideo,
      remoteAudio
    )
    // 在用户点击"发起语音通话"按钮后，主动尝试播放远程音频一次
    // 延迟一下，确保音频元素已经设置好
    setTimeout(() => {
      ensureRemoteAudioPlaying()
    }, 200)
    callStatusText.value = '通话中...'
  } catch (error: any) {
    console.error('发起语音通话失败:', error)
    alert(error.message || '发起通话失败')
    isInCall.value = false
  }
}

// 处理来电
async function handleIncomingCall(data: any) {
  const { callId, fromUserId, callType: incomingCallType } = data
  
  // 🔧 修复：收到新来电时，先清理旧通话状态（如果有）
  if (callManager) {
    const currentCallId = callManager.getCurrentCallId()
    if (currentCallId && currentCallId !== callId) {
      console.log('🔄 [医者端]收到新来电，清理旧通话状态', {
        oldCallId: currentCallId,
        newCallId: callId
      })
      // 清理旧通话
      callManager.endCall()
      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // 🔧 修复：立即设置新的 currentCallId，这样后续的信令就不会被忽略
    callManager.setCurrentCallId(callId)
    console.log('✅ [医者端]已设置新通话ID:', callId)
  }
  
  const confirm = window.confirm(
    `来自 ${fromUserId} 的${incomingCallType === 'video' ? '视频' : '语音'}通话，是否接听？`
  )
  
  if (confirm) {
    try {
      callType.value = incomingCallType
      isInCall.value = true
      callStatusText.value = '通话中...'
      
      // 等待DOM更新
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 获取视频元素
      let localVideo: HTMLVideoElement | null = null
      let remoteVideo: HTMLVideoElement | null = null
      
      if (localVideoRef.value) {
        localVideo = localVideoRef.value as HTMLVideoElement
      }
      
      if (remoteVideoRef.value) {
        remoteVideo = remoteVideoRef.value as HTMLVideoElement
      }
      
      // 如果ref获取失败，尝试通过DOM查询
      if (!localVideo || localVideo.tagName !== 'VIDEO') {
        const localEl = document.querySelector('video.local-video') as HTMLVideoElement
        if (localEl) localVideo = localEl
      }
      
      if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
        const remoteEl = document.querySelector('video.remote-video') as HTMLVideoElement
        if (remoteEl) remoteVideo = remoteEl
      }
      
      if (!remoteVideo) {
        console.error('❌ 无法找到远程视频元素')
        alert('无法找到视频元素，请刷新页面重试')
        isInCall.value = false
        return
      }
      
      // 语音通话时传入远程音频元素，确保能听到对方声音
      let remoteAudio: HTMLAudioElement | null = null
      // 多次尝试获取音频元素，因为 DOM 可能还在更新
      for (let i = 0; i < 3 && !remoteAudio; i++) {
        if (remoteAudioRef.value) {
          remoteAudio = remoteAudioRef.value as HTMLAudioElement
        }
        if (!remoteAudio) {
          const audioEl = document.querySelector('audio.remote-audio') as HTMLAudioElement
          if (audioEl && audioEl.tagName === 'AUDIO') {
            remoteAudio = audioEl
          }
        }
        if (!remoteAudio && i < 2) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      if (!remoteAudio && incomingCallType === 'audio') {
        console.warn('⚠️ [医者端]接听语音来电时无法找到远程音频元素，将使用兜底方案')
      } else if (remoteAudio) {
        console.log('✅ [医者端]接听来电时找到远程音频元素:', remoteAudio)
      }
      
      await callManager!.answerCall(
        callId,
        fromUserId,
        incomingCallType,
        localVideo,
        remoteVideo,
        remoteAudio
      )
      // 如果是语音来电，接听后主动尝试播放远程音频
      // 延迟一下，确保音频元素已经设置好
      if (incomingCallType === 'audio') {
        setTimeout(() => {
          ensureRemoteAudioPlaying()
        }, 200)
      }
    } catch (error: any) {
      console.error('接听通话失败:', error)
      alert('接听失败')
      isInCall.value = false
    }
  } else {
    if (callManager) {
      callManager.rejectCall(callId)
      // 如果拒绝了，清除 currentCallId
      callManager.setCurrentCallId(null)
    }
  }
}

// 挂断通话
function endCall() {
  if (callManager) {
    callManager.endCall()
  }
  isInCall.value = false
  callStatusText.value = ''
}

// 切换静音
function toggleMute() {
  if (callManager) {
    isMuted.value = !callManager.toggleMute()
  }
}

// 切换视频
function toggleVideo() {
  if (callManager) {
    isVideoEnabled.value = callManager.toggleVideo()
  }
}

// 切换摄像头
function switchCamera() {
  if (callManager) {
    callManager.switchCamera()
  }
}

// 初始化通话管理器
function initCallManager() {
  if (!callManager) {
    callManager = getCallManager()
    console.log('✅ [医者端]通话管理器已初始化')
  }
  // 对方挂断时显示「对方已挂断」，约 1.5 秒后关闭通话界面
  callManager.setOnEndedByRemote(() => {
    callStatusText.value = '对方已挂断'
    setTimeout(() => {
      isInCall.value = false
      callStatusText.value = ''
    }, 1500)
  })
  // 先移除旧监听再注册，避免 initCallManager 被多次调用时重复注册导致弹两次窗
  offIncomingCall()
  onIncomingCall(handleIncomingCall)
  console.log('✅ [医者端]已注册来电监听')
}

// 清理通话资源
function cleanupCallManager() {
  if (callManager) {
    callManager.cleanup()
  }
  offIncomingCall()
}

/**
 * ==================== 通话相关方法结束 ====================
 */

</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1 class="page-title">在线咨询</h1>
      <p class="page-subtitle">与医生实时沟通，获取专业医疗建议</p>
    </header>

    <div class="chat-layout">
      <!-- 左侧患者列表 -->
      <div class="patient-list-panel">
        <div class="patient-list-header">
          <h3 class="patient-list-title">用户列表</h3>
          <div class="duty-controls">
            <button 
              v-if="!isOnDuty"
              class="duty-btn duty-on"
              @click.stop="toggleDuty(true)"
            >
              上岗
            </button>
            <button 
              v-else
              class="duty-btn duty-off"
              @click.stop="toggleDuty(false)"
            >
              下岗
            </button>
          </div>
        </div>
        <div class="patient-list-search">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索用户..."
            class="search-input"
          />
        </div>
        <div class="patient-list-content">
          <div
            v-for="patient in filteredPatientList"
            :key="patient.id"
            class="patient-item"
            :class="{ active: selectedPatientId === patient.id }"
            @click="selectPatient(patient)"
          >
            <div class="patient-status" :class="{ online: patient.isOnline }"></div>
            <div class="patient-avatar-circle" :style="{ backgroundColor: getAvatarColor(patient.id) }">
              {{ getPatientInitial(patient.name) }}
            </div>
            <div class="patient-info">
              <div class="patient-name-row">
                <span class="patient-name-text">{{ patient.name }}</span>
              </div>
              <div v-if="patient.lastMessage" class="patient-last-message">
                {{ patient.lastMessage }}
              </div>
            </div>
            <div v-if="patient.unreadCount && patient.unreadCount > 0" class="patient-unread">
              {{ patient.unreadCount > 99 ? '99+' : patient.unreadCount }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
    <div class="chat-wrapper">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="patient-avatar-header">{{ getPatientInitial(patientInfo.name) }}</div>
          <div class="chat-header-info">
            <div class="chat-header-name">{{ patientInfo.name }}</div>
            <div class="chat-header-status">
              <span class="status-dot" :class="{ online: selectedPatientOnlineStatus }"></span>
              <span>{{ selectedPatientOnlineStatus ? '在线' : '离线' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天消息区域 -->
      <div ref="chatContainer" class="chat-messages" @scroll="handleScroll">
        <!-- 加载更多消息提示 -->
        <div v-if="isLoadingMore" class="loading-more">
          <div class="loading-spinner-small"></div>
          <span>正在加载更多消息...</span>
        </div>
        <div v-else-if="!hasMoreMessages && messages.length > 0" class="no-more-messages">
          <span>没有更多消息了</span>
        </div>
        
        <!-- 加载历史消息提示 -->
        <div v-if="isLoadingHistory" class="loading-history">
          <div class="loading-spinner"></div>
          <span class="loading-text">正在加载历史消息...</span>
        </div>
        
        <!-- 空状态提示 -->
        <div v-else-if="!isLoadingHistory && selectedPatientId && messages.length === 0" class="empty-messages">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无消息</div>
          <div class="empty-hint">开始与 {{ patientInfo.name }} 的对话吧</div>
        </div>
        
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-wrapper"
          :class="message.sender === 'user' ? 'user-wrapper' : 'doctor-wrapper'"
        >
          <!-- 患者消息：头像在左，消息在右 -->
          <template v-if="message.sender === 'user'">
            <div class="user-avatar">👤</div>
            <div class="message-card user-message">
            <!-- 患者信息卡片 -->
            <template v-if="message.type === 'patient-card' && message.patientCardData">
              <div class="patient-card">
                <div class="patient-header">
                  <div class="patient-avatar">👤</div>
                  <span class="patient-info">
                    {{ message.patientCardData.patientInfo.name }} 
                    {{ message.patientCardData.patientInfo.gender }} | 
                    {{ message.patientCardData.patientInfo.age }}岁
                  </span>
          </div>
                <div class="symptom-section" v-if="message.patientCardData.symptomDescription">
                  <div class="symptom-label">症状描述:</div>
                  <div class="symptom-text">{{ message.patientCardData.symptomDescription }}</div>
            </div>
                <div class="symptom-images" v-if="message.patientCardData.images && message.patientCardData.images.length > 0">
                  <div
                    v-for="(img, index) in message.patientCardData.images"
                    :key="index"
                    class="image-item"
                    @click="() => { const u = processImageUrl(img.thumb || img.url); const list = message.patientCardData.images.map(i => processImageUrl(i.thumb || i.url)).filter(Boolean); if (u && list.length) previewImage(u, list); }"
                  >
                    <template v-if="processImageUrl(img.thumb || img.url)">
                      <img 
                        :src="processImageUrl(img.thumb || img.url)" 
                        :alt="`图片 ${index + 1}`" 
                        class="symptom-img"
                        @error="(e) => handleImageError(e, img)"
                        @load="handleImageLoad"
                      />
                      <div v-if="img.type === 'video'" class="video-badge">视频</div>
                    </template>
                    <div v-else class="image-placeholder">图片加载失败</div>
          </div>
            </div>
              </div>
            </template>
            
            <!-- 普通消息（文本或图片） -->
            <template v-else>
              <!-- 文本内容 -->
              <div v-if="(message.type === 'text' || !message.type) && message.content" class="message-text">
              {{ message.content }}
            </div>
              <!-- 图片内容 -->
              <div v-if="message.type === 'image'" class="message-image-wrapper">
                <img 
                  :src="processImageUrl(message.imageUrl || message.content)" 
                  alt="图片"
                  class="message-image"
                  @click="previewImage(processImageUrl(message.imageUrl || message.content), getAllImageUrls())"
                  @error="(e) => {
                    console.error('❌ 图片加载失败:', {
                      originalUrl: message.imageUrl || message.content,
                      processedUrl: (e.target as HTMLImageElement).src,
                      messageId: message.id
                    });
                    handleImageError(e, { url: message.imageUrl, content: message.content });
                  }"
                />
                <div v-if="!message.imageUrl && !message.content" class="image-placeholder">图片加载中...</div>
          </div>
              <!-- 如果消息内容为空且不是图片，不显示 -->
              <div v-if="!message.content && message.type !== 'image' && message.type !== 'patient-card'" class="message-text" style="color: #999; font-style: italic;">
                [空消息]
        </div>
            </template>
            </div>
          </template>
          
          <!-- 医生消息：消息在左，头像在右（显示在右侧） -->
          <template v-else>
            <div class="message-card doctor-message">
              <!-- 文本内容 -->
              <div v-if="(message.type === 'text' || !message.type) && message.content" class="message-text">
                {{ message.content }}
              </div>
              <!-- 图片内容 -->
              <div v-if="message.type === 'image'" class="message-image-wrapper">
                <img 
                  :src="processImageUrl(message.imageUrl || message.content)" 
                  alt="图片"
                  class="message-image"
                  @click="previewImage(processImageUrl(message.imageUrl || message.content), getAllImageUrls())"
                  @error="(e) => {
                    console.error('❌ 图片加载失败:', {
                      originalUrl: message.imageUrl || message.content,
                      processedUrl: (e.target as HTMLImageElement).src,
                      messageId: message.id
                    });
                    handleImageError(e, { url: message.imageUrl, content: message.content });
                  }"
                />
                <div v-if="!message.imageUrl && !message.content" class="image-placeholder">图片加载中...</div>
              </div>
              <!-- 如果消息内容为空且不是图片，不显示 -->
              <div v-if="!message.content && message.type !== 'image' && message.type !== 'patient-card'" class="message-text" style="color: #999; font-style: italic;">
                [空消息]
              </div>
            </div>
            <div class="doctor-avatar">👨‍⚕️</div>
          </template>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="call-buttons-wrapper">
          <button class="call-btn" @click="startVideoCall" title="视频通话" :disabled="!selectedPatientId || !isConnected">
            📹
          </button>
          <button class="call-btn" @click="startAudioCall" title="语音通话" :disabled="!selectedPatientId || !isConnected">
            📞
          </button>
          <button class="call-btn album-btn" @click="chooseImages" title="相册" :disabled="!selectedPatientId || !isConnected">
            📷
          </button>
          <button class="call-btn emoji-btn" @click="toggleEmojiPicker" title="表情" :disabled="!selectedPatientId || !isConnected">
            😊
          </button>
        </div>
        <div class="input-wrapper">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            class="chat-input"
            placeholder="输入消息..."
            rows="1"
            @keydown="handleKeyPress"
            @input="(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = target.scrollHeight + 'px'
            }"
          ></textarea>
          <button
            class="send-button"
            :disabled="!inputText.trim() || !isConnected"
            @click="sendChatMessage"
          >
            发送
          </button>
          <!-- 表情选择器 -->
          <div v-if="showEmojiPicker" class="emoji-picker-container">
            <EmojiPicker 
              :native="true" 
              @select="onSelectEmoji"
              :theme="'light'"
            />
          </div>
        </div>
        <div class="input-tips">
          <span>按 Enter 发送，Shift + Enter 换行</span>
        </div>
      </div>

        <!-- 图片预览模态框 -->
        <div v-if="showImagePreview" class="image-preview-modal" @click="closeImagePreview">
        <div class="image-preview-content" @click.stop>
          <div class="image-preview-header">
            <span class="image-preview-title">
              图片预览 ({{ previewCurrentIndex + 1 }}/{{ previewImageList.length }})
            </span>
            <button class="image-preview-close" @click="closeImagePreview">×</button>
          </div>
          <div class="image-preview-body">
            <button 
              v-if="previewImageList.length > 1 && previewCurrentIndex > 0"
              class="image-preview-nav image-preview-prev"
              @click.stop="prevImage"
            >
              ‹
            </button>
            <img 
              v-if="!previewImageError"
              :src="previewImageUrl" 
              alt="预览图片"
              class="image-preview-img"
              @error="handleImagePreviewError"
              @load="previewImageError = false"
            />
            <div v-else class="image-preview-error">
              <div class="error-icon">⚠️</div>
              <div class="error-text">图片加载失败</div>
              <div class="error-hint">图片URL: {{ previewImageUrl.substring(0, 50) }}{{ previewImageUrl.length > 50 ? '...' : '' }}</div>
              <button class="error-retry-btn" @click.stop="previewImageError = false; previewImageUrl = previewImageUrl">重试</button>
            </div>
            <button 
              v-if="previewImageList.length > 1 && previewCurrentIndex < previewImageList.length - 1"
              class="image-preview-nav image-preview-next"
              @click.stop="nextImage"
            >
              ›
            </button>
          </div>
          <div class="image-preview-footer" v-if="previewImageList.length > 1">
            <div class="image-preview-dots">
              <span
                v-for="(img, index) in previewImageList"
                :key="index"
                class="image-preview-dot"
                :class="{ active: index === previewCurrentIndex }"
                @click.stop="previewCurrentIndex = index; previewImageUrl = img; previewImageError = false"
              ></span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- 通话界面 -->
    <div v-if="isInCall" class="call-modal">
      <div class="call-content">
        <!-- 远程视频（视频通话显示；语音通话时仅用远程音频） -->
        <video
          ref="remoteVideoRef"
          class="remote-video"
          autoplay
          playsinline
        ></video>
        <!-- 语音通话时用此 audio 播放对方声音，避免 video 无视频轨时无声 -->
        <audio ref="remoteAudioRef" class="remote-audio" autoplay playsinline></audio>
        
        <!-- 本地视频（小窗口） -->
        <video
          ref="localVideoRef"
          class="local-video"
          autoplay
          playsinline
          muted
        ></video>
        
        <!-- 通话控制按钮 -->
        <div class="call-controls">
          <button class="call-control-btn" @click="toggleMute">
            {{ isMuted ? '🔇' : '🎤' }}
          </button>
          <button v-if="callType === 'video'" class="call-control-btn" @click="toggleVideo">
            {{ isVideoEnabled ? '📹' : '📷' }}
          </button>
          <button v-if="callType === 'video'" class="call-control-btn" @click="switchCamera">
            🔄
          </button>
          <button class="call-control-btn end-call" @click="endCall">
            📴
          </button>
        </div>
        
        <!-- 通话状态 -->
        <div class="call-status">
          <span>{{ callStatusText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f7f4;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

/* 聊天布局 */
.chat-layout {
  display: flex;
  gap: 24px;
  flex: 1;
  min-height: 0;
}

/* 左侧患者列表面板 */
.patient-list-panel {
  width: 320px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.patient-list-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.duty-controls {
  display: flex;
  align-items: center;
}

.duty-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.duty-btn.duty-on {
  background-color: #4CAF50;
  color: #fff;
}

.duty-btn.duty-on:hover {
  background-color: #45a049;
}

.duty-btn.duty-off {
  background-color: #f44336;
  color: #fff;
}

.duty-btn.duty-off:hover {
  background-color: #da190b;
}

.patient-list-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0;
}

.patient-list-search {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007aff;
}

.patient-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.patient-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.patient-item:hover {
  background-color: #f8f9fa;
}

.patient-item.active {
  background-color: #e3f2fd;
}

.patient-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #c0c4cc;
  flex-shrink: 0;
}

.patient-status.online {
  background-color: #4CAF50;
}

.patient-avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.patient-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-name-text {
  font-size: 15px;
  font-weight: 500;
  color: #2d2f31;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-last-message {
  font-size: 13px;
  color: #6e736c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-unread {
  background-color: #f44336;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
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

.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  min-height: 500px;
  max-height: calc(100vh - 100px);
  height: calc(100vh - 100px);
  position: relative;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 固定高度，不收缩 */
  z-index: 10; /* 确保头部在最上层 */
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.patient-avatar-header {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.chat-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-header-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d2f31;
}

.chat-header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6e736c;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
}

.status-dot.online {
  background: #4CAF50;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc3545;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #28a745;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 12px;
  color: #6e736c;
}

.doctor-name {
  font-size: 14px;
  font-weight: 500;
  color: #2d2f31;
}

.patient-name {
  margin-left: auto;
  font-size: 12px;
  color: #6e736c;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(to bottom, #f0f2f5 0%, #ffffff 100%);
  min-height: 0;
  /* 可滚动区域，自动填充剩余空间 */
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 加载历史消息提示 */
.loading-history {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0e0e0;
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #666;
  font-size: 14px;
}

/* 空状态样式 */
.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9e9e9e;
  min-height: 300px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: #6e736c;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #9e9e9e;
  text-align: center;
}

/* 加载更多消息样式 */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: #666;
  font-size: 13px;
}

.loading-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid #e0e0e0;
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.no-more-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #999;
  font-size: 12px;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 4px;
  width: 100%;
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 患者消息（左侧） */
.user-wrapper {
  justify-content: flex-start;
  align-self: flex-start;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: #fff;
  font-weight: 600;
}

/* 医生消息（右侧） */
.doctor-wrapper {
  justify-content: flex-end !important;
  flex-direction: row !important; /* 正常顺序：消息在左，头像在右 */
  align-self: flex-end !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  width: fit-content !important;
  max-width: 85% !important;
}

.doctor-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: #fff;
  font-weight: 600;
}

/* 消息卡片 */
.message-card {
  max-width: 70%;
  border-radius: 12px;
  padding: 10px 14px;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* 患者消息卡片（左侧，灰色背景） */
.user-message {
  background-color: #ffffff !important;
  color: #333;
  border: 1px solid #e5e5e5;
  border-bottom-left-radius: 4px;
}

/* 医生消息卡片（右侧，蓝色背景） */
.doctor-message {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff;
  border-bottom-right-radius: 4px;
}

/* 文本消息 */
.message-text {
  font-size: 14px;
  line-height: 1.5;
  color: inherit;
}

.user-message .message-text {
  color: #333 !important;
}

.doctor-message .message-text {
  color: #fff !important;
}

/* 图片消息 */
.message-image-wrapper {
  margin: -4px;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  cursor: pointer;
  object-fit: cover;
  display: block;
  width: 100%;
  height: auto;
  transition: opacity 0.2s, transform 0.2s;
  user-select: none;
  -webkit-user-select: none;
}

.message-image:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.message-image:active {
  opacity: 0.8;
}

.patient-card {
  background: transparent;
  border-radius: 0;
  padding: 0;
  
  .patient-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    
    .patient-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
  background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    
    .patient-info {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
  }
  
  .symptom-section {
    margin-bottom: 16px;
    
    .symptom-label {
      font-size: 14px;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }
    
    .symptom-text {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
  word-wrap: break-word;
      display: block;
    }
  }
  
  .symptom-images {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    
    .image-item {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      background: #f0f0f0;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .symptom-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      
      .video-badge {
        position: absolute;
        left: 4px;
        top: 4px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        z-index: 1;
      }
      
      .image-placeholder {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #999;
        font-size: 12px;
        text-align: center;
      }
    }
  }
}

.message-user {
  /* 患者消息显示在左侧（正常方向） */
  display: flex;
}

.chat-input-area {
  border-top: 1px solid #e9ecef;
  padding: 12px 16px;
  background: #ffffff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 固定高度，不收缩 */
  position: sticky;
  bottom: 0;
  z-index: 10; /* 确保输入框在最上层 */
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  overflow-y: auto;
  background: #ffffff;
  transition: border-color 0.2s;
}

.chat-input:focus {
  outline: none;
  border-color: #46c266;
}

.send-button {
  padding: 10px 24px;
  background: #46c266;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.send-button:hover:not(:disabled) {
  background: #3da855;
}

.send-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.input-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #6e736c;
  text-align: center;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 暗色模式 */
:global(.dark) .page-container {
  background: #1a1f2e;
}

:global(.dark) .chat-wrapper {
  background: #16202d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:global(.dark) .chat-status-bar {
  background: #1e2a3a;
}

/* 图片预览模态框样式 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-in;
}

.image-preview-content {
  position: relative;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.image-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 图片预览模态框样式 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-in;
}

.image-preview-content {
  position: relative;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.image-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.image-preview-title {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.image-preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-preview-body {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  max-height: calc(90vh - 120px);
  overflow: hidden;
}

.image-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

/* 图片预览错误状态 */
.image-preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  color: #fff;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.error-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #ff6b6b;
}

.error-hint {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
  word-break: break-all;
  max-width: 600px;
}

.error-retry-btn {
  padding: 10px 24px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-retry-btn:hover {
  background: #5568d3;
}

.image-preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 32px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.image-preview-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.image-preview-prev {
  left: 20px;
}

.image-preview-next {
  right: 20px;
}

.image-preview-footer {
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.image-preview-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.image-preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.image-preview-dot.active {
  background: #fff;
  width: 24px;
  border-radius: 4px;
}

.image-preview-dot:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 暗色模式下的图片预览 */
:global(.dark) .image-preview-modal {
  background-color: rgba(0, 0, 0, 0.95);
}

:global(.dark) .status-text,
:global(.dark) .doctor-name {
  color: #e0e6ed;
}

:global(.dark) .message-bubble {
  background: #1e2a3a;
  color: #e0e6ed;
}

:global(.dark) .message-user .message-bubble {
  background: #46c266;
  color: #ffffff;
}

:global(.dark) .message-doctor .message-bubble {
  background: #2a3544;
  color: #e0e6ed;
}

:global(.dark) .chat-input-area {
  background: #1e2a3a;
  border-top-color: #2a3544;
}

:global(.dark) .chat-input {
  background: #16202d;
  border-color: #2a3544;
  color: #e0e6ed;
}

:global(.dark) .input-tips {
  color: #9eb3c7;
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .message-content {
    max-width: 85%;
  }

  .chat-wrapper {
    max-height: calc(100vh - 150px);
  }
}

/* 通话按钮样式 */
.call-buttons-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: center;
}

.call-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.call-btn:hover:not(:disabled) {
  background: #e0e0e0;
  transform: scale(1.05);
}

.call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.album-btn {
  /* 相册按钮样式与通话按钮一致 */
}

.emoji-btn {
  /* 表情按钮样式与通话按钮一致 */
}

.emoji-picker-container {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  z-index: 1000;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* 通话界面样式 */
.call-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-content {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 语音通话时播放对方声音，不占位、不显示 */
.remote-audio {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.local-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border-radius: 10px;
  object-fit: cover;
  border: 2px solid #fff;
  background: #000;
  z-index: 10;
}

.call-controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  align-items: center;
  z-index: 10;
}

.call-control-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.call-control-btn:hover {
  opacity: 0.8;
  transform: scale(1.1);
}

.call-control-btn.end-call {
  background: #f56c6c;
}

.call-status {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 16px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  padding: 10px 20px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}
</style>
