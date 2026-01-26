<template>
  <view class="chat-page">
    <!-- 蓝色头部 -->
    <view class="header-blue">
      <view class="header-content">
        <view class="back-btn" @click="goBack">
          <uni-icons type="left" size="20" color="#fff"></uni-icons>
        </view>
        <view class="header-center">
          <text class="header-title">在线咨询中</text>
          <text class="header-subtitle">咨询时间结束前可不限次数向医生提问</text>
        </view>
        <view class="header-time">
          <text class="time-text">剩余咨询时间 24小时</text>
        </view>
      </view>
    </view>

    <!-- 聊天内容区域 -->
    <scroll-view 
      ref="scrollViewRef"
      class="chat-content" 
      scroll-y
      :scroll-top="scrollTop"
      scroll-with-animation
    >
      <!-- 患者信息和症状描述卡片（右侧，自己发送） -->
      <view class="message-wrapper patient-wrapper" v-if="symptomDescription || symptomImages.length > 0">
        <view class="message-card patient-card">
          <view class="patient-header">
            <view class="patient-avatar">👤</view>
            <text class="patient-info">{{ patientInfo.name }} {{ patientInfo.gender }} | {{ patientInfo.age }}岁</text>
          </view>
          <view class="symptom-section" v-if="symptomDescription">
            <text class="symptom-label">症状描述:</text>
            <text class="symptom-text">{{ symptomDescription }}</text>
          </view>
          <view class="symptom-images" v-if="symptomImages.length > 0">
            <view
              v-for="(img, index) in symptomImages"
              :key="index"
              class="image-item"
              @click="previewImage(index)"
            >
              <image :src="img.thumb || img.path || img" mode="aspectFill" class="symptom-img"></image>
              <view v-if="img.type === 'video'" class="video-badge">视频</view>
            </view>
          </view>
        </view>
        <view class="patient-avatar-small">👤</view>
      </view>

      <!-- 聊天消息列表 -->
      <view 
        v-for="(msg, index) in messages" 
        :key="msg.id || index"
        class="message-wrapper"
        :class="msg.isMe ? 'patient-wrapper' : 'doctor-wrapper'"
      >
        <view v-if="!msg.isMe" class="doctor-avatar">👨‍⚕️</view>
        <view class="message-card" :class="msg.isMe ? 'patient-message' : 'doctor-card'">
          <view v-if="msg.type === 'text'" class="message-text">
            {{ msg.content }}
          </view>
          <view v-else-if="msg.type === 'image'" class="message-image">
            <image 
              :src="msg.content" 
              mode="aspectFill" 
              class="chat-image"
              @click="previewChatImage(msg.content)"
            ></image>
        </view>
        </view>
        <view v-if="msg.isMe" class="patient-avatar-small">👤</view>
      </view>

      <!-- 连接状态提示 -->
      <view v-if="!socketConnected" class="connection-status">
        <text>正在连接...</text>
      </view>
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="input-area">
      <!-- 第一行：功能按钮 -->
      <view class="input-buttons-row">
        <view class="call-btn" @click="startVideoCall" title="视频通话">
          <text class="call-icon">📹</text>
        </view>
        <view class="call-btn" @click="startAudioCall" title="语音通话">
          <text class="call-icon">📞</text>
        </view>
        <view class="image-btn album-btn" @click="chooseImages" title="相册">
          <text class="image-icon">🖼️</text>
        </view>
        <view class="emoji-btn" @click="toggleEmojiPicker" title="表情">
          <text class="emoji-icon">😊</text>
        </view>
        <view class="tag-btn" @click="toggleTagPicker" title="标签">
          <text class="tag-icon">🏷️</text>
        </view>
      </view>
      <!-- 第二行：输入框和发送按钮 -->
      <view class="input-row">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="输入..."
          placeholder-class="input-placeholder"
        />
        <button class="send-btn" @click="sendChatMessage" :disabled="!socketConnected">发送</button>
      </view>
    </view>

    <!-- 表情选择器 -->
    <view v-if="showEmojiPicker" class="emoji-picker-container">
      <view class="emoji-picker-header">
        <text class="emoji-picker-title">选择表情</text>
        <view class="emoji-picker-close" @click="closeEmojiPicker">×</view>
      </view>
      <scroll-view class="emoji-picker-content" scroll-y>
        <view class="emoji-grid">
          <view 
            v-for="(emoji, index) in emojiList" 
            :key="index"
            class="emoji-item"
            @click="selectEmoji(emoji)"
          >
            <text class="emoji-text">{{ emoji }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 标签选择器 -->
    <view v-if="showTagPicker" class="tag-picker-container">
      <view class="tag-picker-header">
        <text class="tag-picker-title">快捷消息</text>
        <view class="tag-picker-close" @click="closeTagPicker">×</view>
      </view>
      <scroll-view class="tag-picker-content" scroll-y>
        <view class="tag-list">
          <view 
            v-for="(tag, index) in tagList" 
            :key="index"
            class="tag-item"
            @click="selectTag(tag)"
          >
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 视频预览弹窗 -->
    <view v-if="showVideoPreview" class="video-preview-modal" @click="closeVideoPreview">
      <view class="video-preview-content" @click.stop>
        <view class="video-preview-header">
          <text class="video-preview-title">视频预览</text>
          <view class="video-close-btn" @click="closeVideoPreview">×</view>
        </view>
        <video
          :src="currentVideoPath"
          class="video-player"
          controls
          :autoplay="false"
          :show-center-play-btn="true"
          :show-play-btn="true"
          :enable-play-gesture="true"
          @error="handleVideoError"
          :poster="currentVideoThumb"
          :enable-progress-gesture="true"
          object-fit="contain"
        >
          <source :src="currentVideoPath" type="video/mp4" />
        </video>
      </view>
    </view>

    <!-- 通话界面 -->
    <view v-if="isInCall" class="call-modal">
      <view class="call-content">
        <!-- 远程视频 -->
        <video
          ref="remoteVideoRef"
          class="remote-video"
          autoplay
          playsinline
        ></video>
        
        <!-- 本地视频（小窗口） -->
        <video
          ref="localVideoRef"
          class="local-video"
          autoplay
          playsinline
          muted
        ></video>
        
        <!-- 通话控制按钮 -->
        <view class="call-controls">
          <view class="call-control-btn" @click="toggleMute">
            <text>{{ isMuted ? '🔇' : '🎤' }}</text>
          </view>
          <view v-if="callType === 'video'" class="call-control-btn" @click="toggleVideo">
            <text>{{ isVideoEnabled ? '📹' : '📷' }}</text>
          </view>
          <view v-if="callType === 'video'" class="call-control-btn" @click="switchCamera">
            <text>🔄</text>
          </view>
          <view class="call-control-btn end-call" @click="endCall">
            <text>📴</text>
          </view>
        </view>
        
        <!-- 通话状态 -->
        <view class="call-status">
          <text>{{ callStatusText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  connectSocket,
  disconnectSocket,
  sendMessage,
  onMessage,
  offMessage,
  isSocketConnected as checkSocketConnected,
  onIncomingCall,
  offIncomingCall,
  getSocketInstance
} from '@/utils/socket.js'
import { saveConsultation } from '@/utils/consultationStorage.js'
import { getUserInfo } from '@/utils/auth.js'
import request from '@/utils/request.js'
import getCallManager from '@/utils/callManager.js'

interface PatientInfo {
  name: string
  gender: string
  age: number
}

interface PatientCardData {
  patientInfo?: {
    name?: string
    gender?: string
    age?: number
  }
  symptomDescription?: string
  images?: Array<{
    url: string
    thumb?: string
    type?: string
  }>
}

interface ChatMessage {
  id: string
  content: string
  type: 'text' | 'image' | 'video' | 'patient-card'
  isMe: boolean
  timestamp: number
  avatar?: string
  patientCardData?: PatientCardData
}

// 患者信息（从登录信息或全局数据获取）
const patientInfo = ref<PatientInfo>({
  name: '患者',
  gender: '未知',
  age: 0
})

const symptomDescription = ref('')
const symptomImages = ref<any[]>([])
const inputText = ref('')
const showVideoPreview = ref(false)
const currentVideoPath = ref('')
const currentVideoThumb = ref('')
const messages = ref<ChatMessage[]>([])
const scrollViewRef = ref<any>(null)
const doctorId = ref('doctor_001') // 医生ID，实际应该从路由参数或全局数据获取
const socketConnected = ref(false)
// 存储当前患者ID（用于消息过滤）
let currentPatientId: string | null = null
// 存储当前咨询记录ID
let currentConsultationId: string | null = null

// 自动拉取消息相关
let autoPullTimer: any = null // 定时器
let lastPullTimestamp: number = 0 // 上次拉取的时间戳
let isPullingMessages = false // 是否正在拉取消息（防止重复拉取）
const AUTO_PULL_INTERVAL = 30000 // 自动拉取间隔：30秒

// 通话相关状态
const isInCall = ref(false)
const callType = ref('video') // 'audio' | 'video'
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const callStatusText = ref('')
const localVideoRef = ref<any>(null)
const remoteVideoRef = ref<any>(null)
let callManager: any = null

function getCurrentPatientId(): string | null {
  return currentPatientId
}

/**
 * 从后端获取最新消息历史
 * @param {boolean} incremental - 是否增量拉取（只拉取新消息，默认false）
 * @param {number} sinceTimestamp - 增量拉取的起始时间戳（只拉取此时间之后的消息）
 */
async function loadLatestMessagesFromServer(incremental: boolean = false, sinceTimestamp?: number): Promise<ChatMessage[]> {
  try {
    // 如果正在拉取，避免重复请求
    if (isPullingMessages) {
      console.log('⏳ 正在拉取消息，跳过本次请求')
      return []
    }
    
    isPullingMessages = true
    
    const userInfo = getUserInfo()
    const patientId = currentPatientId || userInfo?.id || userInfo?._id || userInfo?.userId || null
    
    if (!patientId || !doctorId.value) {
      console.warn('⚠️ 无法获取最新消息：缺少患者ID或医生ID')
      isPullingMessages = false
      return []
    }
    
    // 构建请求URL
    let requestUrl = `/chat/history?userId=${patientId}&targetId=${doctorId.value}&limit=200`
    
    // 如果是增量拉取，添加时间戳参数
    if (incremental && sinceTimestamp) {
      requestUrl += `&since=${sinceTimestamp}`
      console.log('🔄 增量拉取最新消息（自', new Date(sinceTimestamp).toLocaleString(), '起）...')
    } else {
      console.log('🔄 从后端获取最新消息历史...', { patientId, doctorId: doctorId.value })
    }
    
    const response = await request({
      url: requestUrl,
      method: 'GET',
      showLoading: false, // 自动拉取时不显示loading
      showError: false // 自动拉取时静默失败
    })
    
    if (response.success && response.messages && response.messages.length > 0) {
      console.log('✅ 从后端获取到', response.messages.length, '条最新消息', incremental ? '(增量)' : '')
      
      // 更新最后拉取时间戳
      const maxTimestamp = Math.max(...response.messages.map((msg: any) => 
        msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now())
      ))
      lastPullTimestamp = Math.max(lastPullTimestamp, maxTimestamp)
      
      // 转换为本地消息格式
      const serverMessages: ChatMessage[] = response.messages.map((msg: any) => {
        // 判断消息发送者：
        // - 如果fromUserId是患者ID，则是患者发送的（isMe=true，显示在右侧）
        // - 如果fromUserId是医生ID或以'doctor_'开头，则是医生发送的（isMe=false，显示在左侧）
        const isFromDoctor = msg.fromUserId === doctorId.value || 
                            (msg.fromUserId && msg.fromUserId.startsWith('doctor_'))
        const isMe = !isFromDoctor && msg.fromUserId === patientId
        
        const chatMessage: ChatMessage = {
          id: msg.messageId || msg._id || msg.id,
          content: msg.content || '',
          type: msg.type || 'text',
          isMe: isMe, // 患者发送的消息显示在右侧（isMe=true），医生发送的消息显示在左侧（isMe=false）
          timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()),
          avatar: ''
        }
        
        // 如果是患者信息卡片消息，解析并保存卡片信息
        if (msg.type === 'patient-card') {
          try {
            let cardData: PatientCardData | undefined = undefined
            if (msg.extra?.patientCardData) {
              cardData = msg.extra.patientCardData
            } else if (msg.content) {
              try {
                cardData = JSON.parse(msg.content)
              } catch (e) {
                console.error('解析患者信息卡片失败:', e)
              }
            }
            
            if (cardData) {
              chatMessage.patientCardData = cardData
              
              // 更新患者信息（仅当消息是患者发送的时）
              if (isMe && cardData.patientInfo) {
                patientInfo.value = {
                  ...patientInfo.value,
                  ...cardData.patientInfo
                }
              }
              
              // 更新症状描述（仅当消息是患者发送的时）
              if (isMe && cardData.symptomDescription) {
                symptomDescription.value = cardData.symptomDescription
              }
              
              // 更新图片（仅当消息是患者发送的时）
              if (isMe && cardData.images && cardData.images.length > 0) {
                symptomImages.value = cardData.images.map(img => ({
                  path: img.url,
                  thumb: img.thumb || img.url,
                  type: img.type || 'image'
                }))
              }
            }
          } catch (error) {
            console.error('❌ 处理患者信息卡片失败:', error)
          }
        }
        
        return chatMessage
      })
      
      isPullingMessages = false
      return serverMessages
    } else {
      console.log('ℹ️ 后端没有消息历史', incremental ? '(增量拉取)' : '')
      isPullingMessages = false
      return []
    }
  } catch (error) {
    console.error('❌ 从后端获取最新消息失败:', error)
    isPullingMessages = false
    return []
  }
}

/**
 * 自动拉取最新消息（增量拉取）
 */
async function autoPullLatestMessages() {
  // 如果Socket已连接，优先使用Socket接收消息，这里作为补充
  // 只在Socket未连接或需要同步时使用
  if (!socketConnected.value) {
    // Socket未连接时，使用全量拉取
    const serverMessages = await loadLatestMessagesFromServer(false)
    if (serverMessages.length > 0) {
      mergeMessages(serverMessages)
    }
    return
  }
  
  // Socket已连接时，使用增量拉取（只拉取新消息）
  const sinceTimestamp = lastPullTimestamp || (messages.value.length > 0 
    ? Math.max(...messages.value.map(msg => msg.timestamp || 0))
    : Date.now() - 24 * 60 * 60 * 1000) // 如果没有消息，拉取最近24小时的消息
  
  const serverMessages = await loadLatestMessagesFromServer(true, sinceTimestamp)
  if (serverMessages.length > 0) {
    console.log('✅ 自动拉取到', serverMessages.length, '条新消息')
    mergeMessages(serverMessages)
  }
}

/**
 * 合并服务器消息到本地消息列表（去重）
 */
function mergeMessages(serverMessages: ChatMessage[]) {
  if (!serverMessages || serverMessages.length === 0) {
    return
  }
  
  // 使用Map进行去重（以消息ID为key）
  const messageMap = new Map<string, ChatMessage>()
  
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
  const mergedMessages = Array.from(messageMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  
  // 只有当有新消息时才更新列表
  if (mergedMessages.length !== messages.value.length || 
      mergedMessages.some((msg, index) => msg.id !== messages.value[index]?.id)) {
    messages.value = mergedMessages
    
    // 滚动到底部显示最新消息
    nextTick(() => {
      scrollToBottom()
    })
    
    // 保存咨询记录
    saveCurrentConsultation()
  }
}

/**
 * 启动自动拉取消息定时器
 */
function startAutoPullTimer() {
  // 清除现有定时器
  stopAutoPullTimer()
  
  // 设置定时器，每30秒自动拉取一次
  autoPullTimer = setInterval(() => {
    if (socketConnected.value) {
      // Socket已连接时，使用增量拉取
      autoPullLatestMessages()
    } else {
      // Socket未连接时，使用全量拉取
      loadLatestMessagesFromServer(false).then(serverMessages => {
        if (serverMessages.length > 0) {
          mergeMessages(serverMessages)
        }
      })
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
  // #ifdef H5
  // H5环境使用document.visibilityState
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ 页面重新可见，自动拉取最新消息')
        autoPullLatestMessages()
      }
    })
  }
  // #endif
  
  // #ifdef APP-PLUS
  // APP环境使用uni的生命周期
  // onShow 已在 onMounted 中处理
  // #endif
  
  // #ifdef MP
  // 小程序环境使用页面生命周期
  // onShow 已在 onMounted 中处理
  // #endif
}

/**
 * 保存咨询记录到本地存储（会先从后端获取最新消息）
 */
async function saveCurrentConsultation() {
  try {
    // 获取患者ID（优先使用登录用户ID）
    const userInfo = getUserInfo()
    let patientId = currentPatientId || userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
    
    // 如果还是没有patientId，尝试从消息中提取（第一条消息的发送者）
    if (!patientId && messages.value.length > 0) {
      const firstPatientMessage = messages.value.find(msg => msg.isMe)
      if (firstPatientMessage) {
        // 从消息ID或其他信息中提取（这里可能需要根据实际情况调整）
        console.warn('⚠️ 无法获取患者ID，尝试从消息中提取')
      }
    }
    
    // 如果还是没有，使用默认ID（确保至少能保存）
    if (!patientId) {
      patientId = `patient_${Date.now()}`
      console.warn('⚠️ 无法获取患者ID，使用临时ID:', patientId)
    }
    
    console.log('💾 保存咨询记录 - 患者ID:', patientId, '用户信息:', {
      hasUserInfo: !!userInfo,
      currentPatientId: currentPatientId,
      userInfoKeys: userInfo ? Object.keys(userInfo) : []
    })
    
    // 先从后端获取最新消息历史
    const serverMessages = await loadLatestMessagesFromServer()
    
    // 合并本地消息和服务器消息（去重，保留最新的）
    const messageMap = new Map<string, ChatMessage>()
    
    // 先添加本地消息
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
    
    // 转换为数组并按时间排序
    const allMessages = Array.from(messageMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    console.log('📋 合并后的消息数量:', allMessages.length, '（本地:', messages.value.length, '服务器:', serverMessages.length, '）')
    
    const consultationData = {
      id: currentConsultationId, // 如果存在则更新，否则创建新记录
      patientInfo: {
        name: patientInfo.value.name,
        gender: patientInfo.value.gender,
        age: patientInfo.value.age,
        id: patientId // 添加患者ID到patientInfo中
      },
      symptomDescription: symptomDescription.value,
      symptomImages: symptomImages.value.map((img: any) => ({
        path: img.path,
        thumb: img.thumb || img.path,
        type: img.type || 'image'
      })),
      doctorId: doctorId.value, // 确保包含医生ID
      patientId: patientId, // 确保包含患者ID
      messages: allMessages.map(msg => {
        // 对于图片消息，确保保存完整的图片数据
        const messageData: any = {
          id: msg.id,
          content: msg.content,
          type: msg.type,
          isMe: msg.isMe,
          timestamp: msg.timestamp
        }
        
        // 如果是图片消息，确保 content 包含图片数据（base64 或 URL）
        if (msg.type === 'image') {
          // 确保图片内容被保存（base64 或 URL）
          messageData.content = msg.content || ''
          // 添加标识，表示这是图片消息
          messageData.isImage = true
          // 记录图片大小（用于调试）
          const imageSize = msg.content ? msg.content.length : 0
          if (imageSize > 0) {
            console.log('📸 保存图片消息:', {
              messageId: msg.id,
              imageSize: `${(imageSize / 1024).toFixed(2)} KB`,
              isBase64: msg.content.startsWith('data:image')
            })
          }
        }
        
        // 如果是患者信息卡片消息，保存完整的卡片数据
        if (msg.type === 'patient-card' && (msg as ChatMessage).patientCardData) {
          messageData.patientCardData = (msg as ChatMessage).patientCardData
          const cardData = messageData.patientCardData
          
          // 如果卡片信息存在，更新咨询记录中的患者信息、症状描述和图片
          if (cardData) {
            // 更新患者信息
            if (cardData.patientInfo) {
              consultationData.patientInfo = {
                ...consultationData.patientInfo,
                ...cardData.patientInfo
              }
            }
            
            // 更新症状描述（如果卡片中的描述更长或更详细）
            if (cardData.symptomDescription) {
              if (!consultationData.symptomDescription || 
                  cardData.symptomDescription.length > consultationData.symptomDescription.length) {
                consultationData.symptomDescription = cardData.symptomDescription
              }
            }
            
            // 更新图片（合并卡片中的图片）
            if (cardData.images && cardData.images.length > 0) {
              const imageMap = new Map()
              // 先添加现有图片
              consultationData.symptomImages.forEach((img: any) => {
                const key = img.path || img.thumb || img
                imageMap.set(key, img)
              })
              // 添加卡片中的图片
              cardData.images.forEach(img => {
                const imgObj = {
                  path: img.url,
                  thumb: img.thumb || img.url,
                  type: img.type || 'image'
                }
                const key = imgObj.path || imgObj.thumb
                if (!imageMap.has(key)) {
                  imageMap.set(key, imgObj)
                }
              })
              consultationData.symptomImages = Array.from(imageMap.values())
            }
            
            console.log('💾 保存患者信息卡片到咨询记录:', {
              messageId: msg.id,
              patientInfo: consultationData.patientInfo,
              symptomDescription: consultationData.symptomDescription,
              imageCount: consultationData.symptomImages.length
            })
          }
        }
        
        return messageData
      })
      // doctorId 和 patientId 已在上面定义（第599-600行），无需重复
    }
    
    // 保存咨询记录到本地存储，传递前台账号ID作为存储key
    // 注意：这里应该使用前台账号ID（userId），而不是患者ID（patientId）
    // 患者ID应该存储在 consultationData.patientId 中
    const frontDeskUserId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
    const savedId = saveConsultation(consultationData, frontDeskUserId)
    // 更新当前咨询记录ID（如果之前没有，现在有了）
    if (!currentConsultationId || currentConsultationId !== savedId) {
      currentConsultationId = savedId
      console.log('📝 更新当前咨询记录ID:', savedId)
    }
    
    // 同步咨询记录到后台（确保后台也有记录）
    try {
      // 获取前台账号ID（当前登录用户的ID）
      const frontDeskUserId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
      
      if (frontDeskUserId && doctorId.value) {
        console.log('🔄 同步咨询记录到后台...', {
          patientId,
          doctorId: doctorId.value,
          createdBy: frontDeskUserId
        })
        
        const syncResponse = await request({
          url: '/chat/consultation',
          method: 'POST',
          data: {
            patientId: patientId,
            doctorId: doctorId.value,
            patientInfo: consultationData.patientInfo,
            symptomDescription: consultationData.symptomDescription,
            symptomImages: consultationData.symptomImages,
            createdBy: frontDeskUserId // 传递前台账号ID
          }
        })
        
        if (syncResponse.success && syncResponse.data) {
          console.log('✅ 咨询记录已同步到后台:', syncResponse.data._id || syncResponse.data.id)
          // 更新当前咨询记录ID为后台返回的ID
          if (syncResponse.data._id || syncResponse.data.id) {
            currentConsultationId = syncResponse.data._id || syncResponse.data.id
          }
        } else {
          console.warn('⚠️ 同步咨询记录到后台失败:', syncResponse.message || '未知错误')
        }
      } else {
        console.warn('⚠️ 无法同步咨询记录到后台：缺少前台账号ID或医生ID', {
          hasFrontDeskUserId: !!frontDeskUserId,
          hasDoctorId: !!doctorId.value
        })
      }
    } catch (syncError: any) {
      console.error('❌ 同步咨询记录到后台失败:', syncError)
      // 不同步失败不影响本地保存
    }
    
    console.log('✅ 咨询记录已保存（包含最新消息）:', savedId, '患者ID:', patientId, '消息数:', allMessages.length)
  } catch (error) {
    console.error('❌ 保存咨询记录失败:', error)
  }
}

onMounted(async () => {
  // 从全局数据获取病情描述和文件
  // @ts-ignore
  const app = getApp()
  if (app.globalData && app.globalData.consultData) {
    const consultData = app.globalData.consultData
    // 设置咨询记录ID（如果存在，说明是恢复之前的咨询）
    if (consultData.consultationId) {
      currentConsultationId = consultData.consultationId
      console.log('✅ 恢复咨询记录ID:', currentConsultationId, '（从"我的咨询"进入，不会创建新记录）')
    }
    
    // 设置医生ID（如果传递了，确保使用同一个医生）
    if (consultData.doctorId) {
      doctorId.value = consultData.doctorId
      console.log('✅ 恢复医生ID:', doctorId.value, '（确保使用同一个医生，不会创建新记录）')
    }
    
    // 设置患者ID（如果传递了）
    if (consultData.patientId) {
      currentPatientId = consultData.patientId
      console.log('✅ 恢复患者ID:', currentPatientId)
    }
    
    // 设置病情描述
    if (consultData.description) {
      symptomDescription.value = consultData.description
    }
    // 设置患者信息
    if (consultData.patient) {
      patientInfo.value = {
        name: consultData.patient.name,
        gender: consultData.patient.gender,
        age: consultData.patient.age
      }
      // 如果患者信息中有ID，也设置到currentPatientId
      if (consultData.patient.id) {
        currentPatientId = consultData.patient.id
      }
    }
    // 设置图片/视频（保留完整文件对象，包含 type 和 path/thumb）
    if (consultData.files && consultData.files.length > 0) {
      symptomImages.value = consultData.files.map((file: any) => ({
        path: file.path,
        thumb: file.thumb || file.path,
        type: file.type || 'image'
      }))
    }
    
    // 恢复之前的消息（如果是继续之前的咨询）
    if (consultData.messages && consultData.messages.length > 0) {
      messages.value = consultData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type || 'text',
        isMe: msg.isMe,
        timestamp: msg.timestamp
      }))
      
      // 滚动到底部显示最新消息
      nextTick(() => {
        scrollToBottom()
      })
    }
  }

  // 如果没有医生ID，尝试从后端获取在岗医生ID
  if (!doctorId.value || doctorId.value === 'doctor_001') {
    try {
      const doctorResponse = await request({
        url: '/chat/on-duty-doctors',
        method: 'GET'
      })
      
      if (doctorResponse.success && doctorResponse.data && doctorResponse.data.length > 0) {
        // 选择第一个在岗医生
        doctorId.value = doctorResponse.data[0]
        console.log('✅ 从后端获取到在岗医生ID:', doctorId.value)
      } else {
        console.warn('⚠️ 没有在岗医生，使用默认医生ID:', doctorId.value)
      }
    } catch (error) {
      console.warn('⚠️ 获取在岗医生列表失败，使用默认医生ID:', error)
    }
  }

  // 初始化 Socket.IO 服务
  await initSocketService()
  
  // 初始化通话管理器
  // #ifdef H5
  callManager = getCallManager()
  
  // 监听来电
  onIncomingCall((data) => {
    handleIncomingCall(data)
  })
  // #endif
})

// 监听消息变化，自动保存并滚动到底部
watch(messages, () => {
  // 当有消息时自动保存
  if (messages.value.length > 0) {
    // 确保消息按时间排序（最新的在底部）
    messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    saveCurrentConsultation()
    
    // 自动滚动到底部显示最新消息
    scrollToBottom()
  }
}, { deep: true })

onUnmounted(() => {
  // 停止自动拉取定时器
  stopAutoPullTimer()
  
  // 保存咨询记录
  saveCurrentConsultation()
  // 断开 Socket.IO 连接
  offMessage()
  disconnectSocket()
  // 清理通话资源
  if (callManager) {
    callManager.cleanup()
  }
  offIncomingCall()
})

/**
 * 初始化 Socket.IO 服务
 */
async function initSocketService() {
  try {
    uni.showLoading({ title: '连接中...' })
    
    console.log('🔄 开始初始化 Socket.IO 服务...')
    
    // 计算患者ID：优先使用 currentPatientId 或全局 consultData 中的 patientId，其次才用登录信息
    const userInfo = getUserInfo()
    const app = getApp && getApp()
    const globalConsult = app?.globalData?.consultData || {}
    
    // 先尝试从本地缓存取（patient.vue 已写入），再用全局/当前缓存
    let storedPatientId: string | null = null
    try {
      storedPatientId = uni.getStorageSync('currentPatientId') || null
    } catch (e) {
      console.warn('⚠️ 读取本地 patientId 失败:', e)
    }

    let patientId = storedPatientId || currentPatientId || globalConsult.patientId || null
    if (userInfo && !patientId) {
      patientId = userInfo.id || userInfo._id || userInfo.userId || userInfo.username || userInfo.phone || null
      console.log('✅ 从登录信息获取患者ID:', patientId, '用户信息字段:', Object.keys(userInfo))
    }
    
    // 如果还是没有，使用默认ID
    if (!patientId) {
      patientId = `patient_${Date.now()}`
      console.warn('⚠️ 未找到患者ID，使用临时ID:', patientId)
    }
    
    currentPatientId = patientId // 保存当前患者ID
    console.log('👤 患者ID:', patientId)
    console.log('👤 患者信息:', patientInfo.value)
    
    // 连接 Socket.IO，传递真实的用户信息
    await connectSocket(patientId, {
      name: patientInfo.value.name,
      avatar: userInfo?.avatar || '👤',
      gender: patientInfo.value.gender,
      age: patientInfo.value.age,
      userId: patientId
    })
    
    socketConnected.value = true
    console.log('✅ Socket.IO 连接成功')
    
    // 监听接收消息
    onMessage(handleReceiveMessage)
    
    // 监听Socket重连事件，重连成功后自动拉取最新消息
    // #ifdef H5
    const socketInstance = getSocketInstance()
    if (socketInstance) {
      socketInstance.on('reconnect', () => {
        console.log('🔄 Socket.IO 重连成功，自动拉取最新消息')
        setTimeout(() => {
          autoPullLatestMessages()
        }, 1000) // 延迟1秒，确保连接稳定
      })
    }
    // #endif
    
    // 连接成功后，先从后端加载最新消息历史
    // 如果是从"我的咨询"进入（已有消息），则从后端补充最新消息
    // 如果是新咨询，则从后端加载所有消息
    try {
      const serverMessages = await loadLatestMessagesFromServer()
      if (serverMessages.length > 0) {
        console.log('✅ 从后端加载', serverMessages.length, '条最新消息')
        
        // 合并到本地消息（去重）
        const messageMap = new Map<string, ChatMessage>()
        
        // 先添加本地消息（如果是从"我的咨询"进入，这些消息已经存在）
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
        messages.value = Array.from(messageMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        
        // 滚动到底部
        nextTick(() => {
          scrollToBottom()
        })
      } else if (messages.value.length === 0) {
        // 如果后端没有消息，且本地也没有消息，说明是新咨询
        console.log('ℹ️ 后端和本地都没有消息，这是新咨询')
      } else {
        // 后端没有消息，但本地有消息（从"我的咨询"进入）
        console.log('ℹ️ 后端没有新消息，使用本地消息（从"我的咨询"进入）')
      }
    } catch (error) {
      console.error('❌ 加载最新消息失败:', error)
      // 即使加载失败，也继续使用本地消息
      if (messages.value.length > 0) {
        console.log('✅ 使用本地消息（从"我的咨询"进入）')
      }
    }
    
    // 连接成功后，自动发送咨询信息给医生
    await sendConsultInfoToDoctor()
    
    // 初始化保存咨询记录（会再次从后端获取最新消息）
    saveCurrentConsultation()
    
    // 确保滚动到底部显示最新消息
    scrollToBottom()
    
    // 启动自动拉取消息定时器
    startAutoPullTimer()
    
    // 设置页面可见性监听
    setupVisibilityListener()
    
    uni.hideLoading()
    uni.showToast({
      title: '连接成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error: any) {
    uni.hideLoading()
    console.error('❌ Socket.IO 初始化失败:', error)
    const errorMsg = error.message || '连接失败，请稍后重试'
    
    // 显示详细错误信息
    uni.showModal({
      title: '连接失败',
      content: errorMsg + '\n\n请检查：\n1. 后端服务是否启动\n2. 网络连接是否正常',
      showCancel: false,
      confirmText: '知道了'
    })
    
    // 更新连接状态
    socketConnected.value = false
  }
}

/**
 * 将图片转换为base64
 */
async function convertImageToBase64(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 如果已经是base64，直接返回
    if (imagePath.startsWith('data:')) {
      resolve(imagePath)
      return
    }
    
    // #ifdef H5
    // H5环境：如果是blob URL，转换为base64
    if (imagePath.startsWith('blob:')) {
      fetch(imagePath)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('图片转换失败'))
          reader.readAsDataURL(blob)
        })
        .catch(() => reject(new Error('图片加载失败')))
    } else {
      // 普通URL，尝试加载
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        } else {
          reject(new Error('无法创建canvas'))
        }
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = imagePath
    }
    // #endif
    
    // #ifndef H5
    // 非H5环境，使用uni.getFileSystemManager读取文件并转换为base64
    uni.getFileSystemManager().readFile({
      filePath: imagePath,
      encoding: 'base64',
      success: (res) => {
        // 根据文件类型添加前缀
        const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
        resolve(`data:${mimeType};base64,${res.data}`)
      },
      fail: () => reject(new Error('读取文件失败'))
    })
    // #endif
  })
}

/**
 * 发送咨询信息给医生（病情描述和图片）
 */
async function sendConsultInfoToDoctor() {
  try {
    // 如果已经有咨询记录ID，说明这是继续之前的咨询，不需要重新发送咨询信息
    if (currentConsultationId) {
      console.log('ℹ️ 这是已有咨询记录，跳过发送咨询信息')
      return
    }
    
    // 检查是否有有效的咨询内容（症状描述或图片）
    const hasContent = symptomDescription.value && symptomDescription.value.trim().length > 0
    const hasImages = symptomImages.value && symptomImages.value.length > 0
    
    // 如果既没有症状描述也没有图片，就不发送
    if (!hasContent && !hasImages) {
      console.log('ℹ️ 没有咨询内容，跳过发送咨询信息')
      return
    }
    
    // 先发送文本格式的咨询信息（确保基本信息能送达）
    let consultContent = ''
    
    // 构建患者信息（只包含有效信息）
    const patientName = patientInfo.value.name && patientInfo.value.name.trim() ? patientInfo.value.name.trim() : ''
    const patientGender = patientInfo.value.gender && patientInfo.value.gender.trim() ? patientInfo.value.gender.trim() : ''
    const patientAge = patientInfo.value.age && patientInfo.value.age > 0 ? patientInfo.value.age : 0
    
    // 只有当患者信息有效时才添加
    if (patientName || patientGender || patientAge > 0) {
      const patientInfoStr = [patientName, patientGender, patientAge > 0 ? `${patientAge}岁` : ''].filter(Boolean).join(' ')
      if (patientInfoStr) {
        consultContent += `患者信息：${patientInfoStr}\n\n`
      }
    }
    
    // 添加症状描述（如果有）
    if (symptomDescription.value && symptomDescription.value.trim()) {
      consultContent += `症状描述：${symptomDescription.value.trim()}\n\n`
    }
    
    // 添加图片/视频信息（如果有）
    if (symptomImages.value.length > 0) {
      const imageCount = symptomImages.value.filter((img: any) => img.type === 'image').length
      const videoCount = symptomImages.value.filter((img: any) => img.type === 'video').length
      if (imageCount > 0) {
        consultContent += `已上传 ${imageCount} 张图片\n`
      }
      if (videoCount > 0) {
        consultContent += `已上传 ${videoCount} 个视频\n`
      }
    }
    
    // 最终检查：确保内容不为空且有意义（至少包含症状描述或图片信息）
    const finalContent = consultContent.trim()
    const hasValidContent = (symptomDescription.value && symptomDescription.value.trim()) || symptomImages.value.length > 0
    
    // 只有当有有效内容时才发送文本消息
    if (finalContent && hasValidContent) {
      try {
        // 获取前台账号ID（当前登录用户的ID）
        const userInfo = getUserInfo()
        const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
        await sendMessage(doctorId.value, finalContent, 'text', {}, createdBy)
        console.log('✅ 文本咨询信息已发送')
      } catch (error: any) {
        console.error('❌ 发送文本咨询信息失败:', error)
        // 文本消息失败不影响后续处理
      }
    } else {
      console.log('ℹ️ 咨询内容为空或无效，跳过发送文本消息')
    }
    
    // 如果有图片，逐个发送（避免一次性发送大文件导致超时）
    if (symptomImages.value.length > 0) {
      console.log(`📸 开始逐个发送 ${symptomImages.value.length} 个媒体文件`)
      
      for (let i = 0; i < symptomImages.value.length; i++) {
        const img = symptomImages.value[i]
        try {
          const imagePath = img.path || img.thumb || img
          console.log(`📤 正在发送第 ${i + 1}/${symptomImages.value.length} 个文件...`)
          
          const base64 = await convertImageToBase64(imagePath)
          
          // 获取前台账号ID（当前登录用户的ID）
          const userInfo = getUserInfo()
          const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
          // 发送单个图片消息（使用30秒超时）
          await sendMessage(doctorId.value, base64, 'image', {
            index: i,
            total: symptomImages.value.length,
            originalType: img.type || 'image'
          }, createdBy)
          
          console.log(`✅ 第 ${i + 1} 个文件发送成功`)
          
          // 每个文件之间稍作延迟，避免服务器压力过大
          if (i < symptomImages.value.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (error: any) {
          console.error(`❌ 发送第 ${i + 1} 个文件失败:`, error)
          // 单个文件失败继续发送其他文件
        }
      }
      
      console.log('✅ 所有媒体文件发送完成')
    }
    
    // 可选：如果图片较少（<=3张），也发送完整的患者信息卡片
    if (symptomImages.value.length > 0 && symptomImages.value.length <= 3) {
      try {
        const imagesWithBase64 = await Promise.all(
          symptomImages.value.map(async (img: any) => {
            try {
              const imagePath = img.path || img.thumb || img
              const base64 = await convertImageToBase64(imagePath)
              return {
                url: base64,
                type: img.type || 'image',
                thumb: base64
              }
            } catch (error: any) {
              console.error('转换图片失败:', error)
              return {
                url: img.path || img.thumb || img,
                type: img.type || 'image',
                thumb: img.thumb || img.path || img
              }
            }
          })
        )
        
        const patientCardData: PatientCardData = {
          patientInfo: {
            name: patientInfo.value.name,
            gender: patientInfo.value.gender,
            age: patientInfo.value.age
          },
          symptomDescription: symptomDescription.value || '',
          images: imagesWithBase64
        }
        
        // 获取前台账号ID（当前登录用户的ID）
        const userInfo = getUserInfo()
        const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
        
        // 发送患者信息卡片
        const sendResult = await sendMessage(doctorId.value, JSON.stringify(patientCardData), 'patient-card', {
          patientCardData: patientCardData
        }, createdBy)
        
        console.log('✅ 患者信息卡片已发送给医生')
        
        // 将卡片消息添加到消息列表（确保本地也保存了卡片信息）
        const cardMessage: ChatMessage = {
          id: sendResult.messageId || `card_${Date.now()}`,
          content: JSON.stringify(patientCardData),
          type: 'patient-card',
          isMe: true, // 患者发送的卡片
          timestamp: sendResult.timestamp || Date.now(),
          patientCardData: patientCardData
        }
        
        // 检查是否已存在（避免重复添加）
        const existingIndex = messages.value.findIndex(msg => msg.id === cardMessage.id)
        if (existingIndex < 0) {
          messages.value.push(cardMessage)
          // 确保消息按时间排序
          messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          console.log('✅ 患者信息卡片已添加到消息列表')
        }
        
        // 立即保存咨询记录（确保卡片信息被保存）
        await saveCurrentConsultation()
      } catch (error: any) {
        console.error('❌ 发送患者信息卡片失败（可选功能）:', error)
        // 卡片发送失败不影响，因为文本和图片已经发送
      }
    }
    
  } catch (error: any) {
    console.error('❌ 发送咨询信息失败:', error)
    // 不抛出错误，避免影响后续流程
  }
}

/**
 * 处理接收到的消息（患者端接收医生消息）
 */
function handleReceiveMessage(message: any) {
  // 患者端接收所有来自医生的消息（fromUserId 是医生ID）
  const patientId = getCurrentPatientId()
  console.log('📨 患者端收到消息:', {
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    expectedFromUserId: doctorId.value,
    expectedToUserId: patientId,
    content: message.content,
    fullMessage: message
  })
  
  // 先不严格检查 toUserId，确保能收到消息
  if (message.fromUserId === doctorId.value || message.toUserId === patientId) {
    console.log('✅ 消息匹配成功，添加到聊天列表')
    
    // 检查消息是否已存在（避免重复添加）
    const messageId = message.id || message.messageId || Date.now().toString()
    const existingIndex = messages.value.findIndex(msg => msg.id === messageId)
    if (existingIndex >= 0) {
      console.log('⚠️ 消息已存在，跳过添加:', messageId)
      return
    }
    
    const chatMessage: ChatMessage = {
      id: messageId,
      content: message.content || '',
      type: message.type || 'text',
      isMe: false, // 患者接收的消息，不是自己发送的
      timestamp: message.timestamp || (message.createdAt ? new Date(message.createdAt).getTime() : Date.now()),
      avatar: ''
    }
    
    // 如果是图片消息，确保content包含图片URL或base64
    if (message.type === 'image') {
      chatMessage.content = message.content || message.extra?.imageUrl || ''
    }
    
    // 如果是患者信息卡片消息，解析并保存卡片信息
    if (message.type === 'patient-card') {
      try {
        let cardData: PatientCardData | undefined = undefined
        if (message.extra?.patientCardData) {
          cardData = message.extra.patientCardData
        } else if (message.content) {
          try {
            cardData = JSON.parse(message.content)
          } catch (e) {
            console.error('解析患者信息卡片失败:', e)
          }
        }
        
        if (cardData) {
          chatMessage.patientCardData = cardData
          
          // 更新患者信息
          if (cardData.patientInfo) {
            patientInfo.value = {
              ...patientInfo.value,
              ...cardData.patientInfo
            }
          }
          
          // 更新症状描述
          if (cardData.symptomDescription) {
            symptomDescription.value = cardData.symptomDescription
          }
          
          // 更新图片
          if (cardData.images && cardData.images.length > 0) {
            symptomImages.value = cardData.images.map(img => ({
              path: img.url,
              thumb: img.thumb || img.url,
              type: img.type || 'image'
            }))
          }
          
          console.log('✅ 患者信息卡片已解析并更新:', {
            patientInfo: patientInfo.value,
            symptomDescription: symptomDescription.value,
            imageCount: symptomImages.value.length
          })
        }
      } catch (error) {
        console.error('❌ 处理患者信息卡片失败:', error)
      }
    }
    
    messages.value.push(chatMessage)
    // 确保消息按时间排序（最新的在底部）
    messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    // 立即保存咨询记录（确保医生回复的消息也被保存）
    nextTick(() => {
      saveCurrentConsultation()
    })
    
    // 滚动到底部
    scrollToBottom()
  } else {
    console.warn('⚠️ 消息不匹配，已忽略:', {
      fromUserIdMatch: message.fromUserId === doctorId.value,
      toUserIdMatch: message.toUserId === patientId,
      message
    })
  }
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  nextTick(() => {
    // 使用一个很大的值确保滚动到底部
    scrollTop.value = 999999
    
    // 延迟一下再设置，确保 DOM 已更新
    setTimeout(() => {
      scrollTop.value = 999999
    }, 100)
    
    // #ifdef H5
    // H5 环境下直接操作 DOM
    if (scrollViewRef.value) {
      const scrollView = scrollViewRef.value.$el || scrollViewRef.value
      if (scrollView) {
        scrollView.scrollTop = scrollView.scrollHeight
      }
    }
    // #endif
  })
}

const goBack = () => {
  uni.navigateBack()
}

/**
 * ==================== 通话相关方法 ====================
 */

// 发起视频通话
const startVideoCall = async () => {
  // #ifdef H5
  if (!callManager) {
    uni.showToast({
      title: '通话功能未初始化',
      icon: 'none'
    })
    return
  }
  
  try {
    callType.value = 'video'
    isInCall.value = true
    callStatusText.value = '正在连接...'
    
    await nextTick()
    
    // 获取视频元素（uni-app的video组件需要特殊处理）
    let localVideo: any = null
    let remoteVideo: any = null
    
    // #ifdef H5
    // H5环境下，尝试获取原生video元素
    // 方法1：通过 ref 获取
    if (localVideoRef.value) {
      localVideo = localVideoRef.value.$el || localVideoRef.value
      if (localVideo && localVideo.tagName !== 'VIDEO') {
        localVideo = localVideo.querySelector('video') || localVideo
      }
    }
    if (remoteVideoRef.value) {
      remoteVideo = remoteVideoRef.value.$el || remoteVideoRef.value
      if (remoteVideo && remoteVideo.tagName !== 'VIDEO') {
        remoteVideo = remoteVideo.querySelector('video') || remoteVideo
      }
    }
    
    // 方法2：如果 ref 获取失败，通过 DOM 查询获取
    if (!localVideo || localVideo.tagName !== 'VIDEO') {
      const localVideoEl = document.querySelector('video.local-video') as HTMLVideoElement
      if (localVideoEl) {
        localVideo = localVideoEl
        console.log('✅ 通过DOM查询找到本地视频元素')
      }
    }
    if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
      const remoteVideoEl = document.querySelector('video.remote-video') as HTMLVideoElement
      if (remoteVideoEl) {
        remoteVideo = remoteVideoEl
        console.log('✅ 通过DOM查询找到远程视频元素')
      }
    }
    
    console.log('📹 视频元素获取结果:', {
      localVideo: localVideo?.tagName,
      remoteVideo: remoteVideo?.tagName
    })
    // #endif
    
    await callManager.startCall(doctorId.value, 'video', localVideo, remoteVideo)
    callStatusText.value = '通话中...'
  } catch (error: any) {
    console.error('发起视频通话失败:', error)
    const errorMsg = error.message || '发起通话失败'
    uni.showModal({
      title: '通话失败',
      content: errorMsg.includes('H5') 
        ? '视频通话功能仅在浏览器环境下可用，请在浏览器中打开使用'
        : errorMsg,
      showCancel: false,
      confirmText: '知道了'
    })
    isInCall.value = false
  }
  // #endif
  
  // #ifndef H5
  // 移动端提示
  // #ifdef APP-PLUS
  uni.showModal({
    title: '功能提示',
    content: 'APP 环境下实时视频通话需要集成原生插件或第三方 SDK（如腾讯云 TRTC、声网 Agora）。\n\n当前可以使用图片/视频选择功能进行咨询。',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  
  // #ifdef MP
  uni.showModal({
    title: '功能提示',
    content: '小程序环境下可以使用 live-pusher/live-player 组件实现视频通话，或使用第三方 SDK。\n\n当前可以使用图片/视频选择功能进行咨询。',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  
  // #ifndef APP-PLUS || MP
  uni.showModal({
    title: '功能提示',
    content: '视频通话功能仅在浏览器环境下可用，请在浏览器中打开使用',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  // #endif
}

// 发起语音通话
const startAudioCall = async () => {
  // #ifdef H5
  if (!callManager) {
    uni.showToast({
      title: '通话功能未初始化',
      icon: 'none'
    })
    return
  }
  
  try {
    callType.value = 'audio'
    isInCall.value = true
    callStatusText.value = '正在连接...'
    
    await nextTick()
    
    // 获取视频元素
    let localVideo: any = null
    let remoteVideo: any = null
    
    // #ifdef H5
    // 方法1：通过 ref 获取
    if (localVideoRef.value) {
      localVideo = localVideoRef.value.$el || localVideoRef.value
      if (localVideo && localVideo.tagName !== 'VIDEO') {
        localVideo = localVideo.querySelector('video') || localVideo
      }
    }
    if (remoteVideoRef.value) {
      remoteVideo = remoteVideoRef.value.$el || remoteVideoRef.value
      if (remoteVideo && remoteVideo.tagName !== 'VIDEO') {
        remoteVideo = remoteVideo.querySelector('video') || remoteVideo
      }
    }
    
    // 方法2：如果 ref 获取失败，通过 DOM 查询获取
    if (!localVideo || localVideo.tagName !== 'VIDEO') {
      const localVideoEl = document.querySelector('video.local-video') as HTMLVideoElement
      if (localVideoEl) {
        localVideo = localVideoEl
      }
    }
    if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
      const remoteVideoEl = document.querySelector('video.remote-video') as HTMLVideoElement
      if (remoteVideoEl) {
        remoteVideo = remoteVideoEl
      }
    }
    // #endif
    
    await callManager.startCall(doctorId.value, 'audio', localVideo, remoteVideo)
    callStatusText.value = '通话中...'
  } catch (error: any) {
    console.error('发起语音通话失败:', error)
    const errorMsg = error.message || '发起通话失败'
    uni.showModal({
      title: '通话失败',
      content: errorMsg.includes('H5') 
        ? '语音通话功能仅在浏览器环境下可用，请在浏览器中打开使用'
        : errorMsg,
      showCancel: false,
      confirmText: '知道了'
    })
    isInCall.value = false
  }
  // #endif
  
  // #ifndef H5
  // 移动端提示
  // #ifdef APP-PLUS
  uni.showModal({
    title: '功能提示',
    content: 'APP 环境下实时语音通话需要集成原生插件或第三方 SDK（如腾讯云 TRTC、声网 Agora）。\n\n当前可以使用图片/视频选择功能进行咨询。',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  
  // #ifdef MP
  uni.showModal({
    title: '功能提示',
    content: '小程序环境下可以使用 live-pusher/live-player 组件实现语音通话，或使用第三方 SDK。\n\n当前可以使用图片/视频选择功能进行咨询。',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  
  // #ifndef APP-PLUS || MP
  uni.showModal({
    title: '功能提示',
    content: '语音通话功能仅在浏览器环境下可用，请在浏览器中打开使用',
    showCancel: false,
    confirmText: '知道了'
  })
  // #endif
  // #endif
}

// 处理来电
const handleIncomingCall = async (data: any) => {
  const { callId, fromUserId, callType: incomingCallType } = data
  
  uni.showModal({
    title: incomingCallType === 'video' ? '视频通话' : '语音通话',
    content: `来自 ${fromUserId} 的${incomingCallType === 'video' ? '视频' : '语音'}通话`,
    confirmText: '接听',
    cancelText: '拒绝',
    success: async (res) => {
      // #ifdef H5
      if (res.confirm) {
        try {
          callType.value = incomingCallType
          isInCall.value = true
          callStatusText.value = '通话中...'
          
          await nextTick()
          
          // 获取视频元素
          let localVideo: any = null
          let remoteVideo: any = null
          
          // #ifdef H5
          // 方法1：通过 ref 获取
          if (localVideoRef.value) {
            localVideo = localVideoRef.value.$el || localVideoRef.value
            if (localVideo && localVideo.tagName !== 'VIDEO') {
              localVideo = localVideo.querySelector('video') || localVideo
            }
          }
          if (remoteVideoRef.value) {
            remoteVideo = remoteVideoRef.value.$el || remoteVideoRef.value
            if (remoteVideo && remoteVideo.tagName !== 'VIDEO') {
              remoteVideo = remoteVideo.querySelector('video') || remoteVideo
            }
          }
          
          // 方法2：如果 ref 获取失败，通过 DOM 查询获取
          if (!localVideo || localVideo.tagName !== 'VIDEO') {
            const localVideoEl = document.querySelector('video.local-video') as HTMLVideoElement
            if (localVideoEl) {
              localVideo = localVideoEl
              console.log('✅ 通过DOM查询找到本地视频元素（接听）')
            }
          }
          if (!remoteVideo || remoteVideo.tagName !== 'VIDEO') {
            const remoteVideoEl = document.querySelector('video.remote-video') as HTMLVideoElement
            if (remoteVideoEl) {
              remoteVideo = remoteVideoEl
              console.log('✅ 通过DOM查询找到远程视频元素（接听）')
            }
          }
          // #endif
          
          await callManager.answerCall(callId, fromUserId, incomingCallType, localVideo, remoteVideo)
        } catch (error: any) {
          console.error('接听通话失败:', error)
          uni.showToast({
            title: '接听失败',
            icon: 'none'
          })
          isInCall.value = false
        }
      } else {
        if (callManager) {
          callManager.rejectCall(callId)
        }
      }
      // #endif
    }
  })
}

// 挂断通话
const endCall = () => {
  if (callManager) {
    callManager.endCall()
  }
  isInCall.value = false
  callStatusText.value = ''
}

// 切换静音
const toggleMute = () => {
  if (callManager) {
    isMuted.value = !callManager.toggleMute()
  }
}

// 切换视频
const toggleVideo = () => {
  if (callManager) {
    isVideoEnabled.value = callManager.toggleVideo()
  }
}

// 切换摄像头
const switchCamera = () => {
  if (callManager) {
    callManager.switchCamera()
  }
}

/**
 * ==================== 通话相关方法结束 ====================
 */

/**
 * 预览聊天中的图片
 */
const previewChatImage = (imageUrl: string) => {
  if (!imageUrl) return
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl
  })
}

const previewImage = (index: number) => {
  const currentImg = symptomImages.value[index]
  if (currentImg.type === 'video') {
    // 预览视频
    let videoPath = currentImg.path || currentImg.thumb || currentImg
    
    // #ifdef H5
    // H5环境下，blob URL可能在页面跳转后失效
    if (typeof videoPath === 'string' && videoPath.startsWith('blob:')) {
      // 尝试使用blob URL，如果失效会在error事件中处理
      currentVideoPath.value = videoPath
      currentVideoThumb.value = currentImg.thumb || ''
      showVideoPreview.value = true
    } else if (typeof videoPath === 'string' && videoPath) {
      currentVideoPath.value = videoPath
      currentVideoThumb.value = currentImg.thumb || ''
      showVideoPreview.value = true
    } else {
      uni.showToast({
        title: '视频路径无效',
        icon: 'none'
      })
      return
    }
    // #endif
    
    // #ifndef H5
    // 非H5环境，直接使用路径
    if (typeof videoPath === 'string' && videoPath) {
      currentVideoPath.value = videoPath
      currentVideoThumb.value = currentImg.thumb || ''
      showVideoPreview.value = true
    } else {
      uni.showToast({
        title: '视频路径无效',
        icon: 'none'
      })
      return
    }
    // #endif
    return
  }
  // 预览图片
  const imageUrls = symptomImages.value
    .filter((img: any) => img.type !== 'video')
    .map((img: any) => img.path || img.thumb || img)
  const currentIndex = symptomImages.value
    .slice(0, index)
    .filter((img: any) => img.type !== 'video').length
  uni.previewImage({
    current: currentIndex,
    urls: imageUrls
  })
}

const handleVideoError = (e: any) => {
  console.error('视频播放错误:', e)
  // #ifdef H5
  // H5环境下，blob URL可能已失效
  if (currentVideoPath.value.startsWith('blob:')) {
    uni.showModal({
      title: '视频预览失败',
      content: '视频文件在当前页面无法预览，请返回上传页面重新查看',
      showCancel: false,
      confirmText: '知道了'
    })
    closeVideoPreview()
  } else {
    uni.showToast({
      title: '视频无法播放，请检查格式',
      icon: 'none',
      duration: 2000
    })
  }
  // #endif
  
  // #ifndef H5
  uni.showToast({
    title: '视频无法播放，请检查格式',
    icon: 'none',
    duration: 2000
  })
  // #endif
}

const closeVideoPreview = () => {
  showVideoPreview.value = false
  currentVideoPath.value = ''
  currentVideoThumb.value = ''
}

/**
 * 切换表情选择器显示/隐藏
 */
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
  // 如果打开表情选择器，关闭标签选择器
  if (showEmojiPicker.value) {
    showTagPicker.value = false
  }
}

/**
 * 关闭表情选择器
 */
function closeEmojiPicker() {
  showEmojiPicker.value = false
}

/**
 * 选择表情
 */
function selectEmoji(emoji: string) {
  inputText.value += emoji
  // 关闭表情选择器
  closeEmojiPicker()
}

/**
 * 切换标签选择器显示/隐藏
 */
function toggleTagPicker() {
  showTagPicker.value = !showTagPicker.value
  // 如果打开标签选择器，关闭表情选择器
  if (showTagPicker.value) {
    showEmojiPicker.value = false
  }
}

/**
 * 关闭标签选择器
 */
function closeTagPicker() {
  showTagPicker.value = false
}

/**
 * 选择标签并发送
 */
async function selectTag(tag: string) {
  // 关闭标签选择器
  closeTagPicker()
  
  // 如果未连接，提示用户
  if (!socketConnected.value) {
    uni.showToast({
      title: '未连接，请稍候',
      icon: 'none'
    })
    return
  }

  try {
    // 先显示在界面上（乐观更新）
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      content: tag,
      type: 'text',
      isMe: true, // 患者发送的消息
      timestamp: Date.now()
    }
    messages.value.push(chatMessage)
    // 确保消息按时间排序（最新的在底部）
    messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    // 滚动到底部
    scrollToBottom()
    
    // 通过 Socket.IO 发送标签消息给医生
    const patientId = getCurrentPatientId()
    if (!patientId) {
      throw new Error('患者ID未设置')
    }
    if (!doctorId.value) {
      throw new Error('医生ID未设置')
    }
    
    // 获取前台账号ID（当前登录用户的ID）
    const userInfo = getUserInfo()
    const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
    console.log('📤 患者端发送标签消息:', {
      fromUserId: patientId,
      toUserId: doctorId.value,
      createdBy: createdBy,
      content: tag
    })
    
    await sendMessage(doctorId.value, tag, 'text', {}, createdBy)
    
    // 发送成功后立即保存咨询记录（确保所有聊天记录都被保存）
    await saveCurrentConsultation()
    
    console.log('✅ 标签消息发送成功（患者 -> 医生），已保存到咨询记录')
  } catch (error: any) {
    console.error('发送标签消息失败:', error)
    uni.showToast({
      title: error.message || '发送失败',
      icon: 'none'
    })
    // 移除刚才添加的消息
    const lastIndex = messages.value.length - 1
    if (lastIndex >= 0 && messages.value[lastIndex].isMe && messages.value[lastIndex].content === tag) {
      messages.value.splice(lastIndex, 1)
    }
  }
}

/**
 * 选择图片（支持多图）
 */
function chooseImages() {
  if (!socketConnected.value) {
    uni.showToast({
      title: '未连接，请稍候',
      icon: 'none'
    })
    return
  }

  uni.chooseImage({
    count: 9, // 最多选择9张图片
    sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
    sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
    success: async (res) => {
      console.log('📸 选择的图片:', res.tempFilePaths)
      
      // 逐张发送图片
      for (const imagePath of res.tempFilePaths) {
        await sendImageMessage(imagePath)
      }
    },
    fail: (err) => {
      // 用户取消选择时不显示错误
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        console.error('选择图片失败:', err)
        uni.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    }
  })
}

/**
 * 发送图片消息
 */
async function sendImageMessage(imagePath: string) {
  if (!socketConnected.value) {
    return
  }

  try {
    // 将图片转换为base64
    const base64Image = await convertImageToBase64(imagePath)
    
    // 先显示在界面上（乐观更新）
    const chatMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: base64Image,
      type: 'image',
      isMe: true, // 患者发送的消息
      timestamp: Date.now()
    }
    messages.value.push(chatMessage)
    // 确保消息按时间排序（最新的在底部）
    messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    // 滚动到底部
    scrollToBottom()
    
    // 通过 Socket.IO 发送图片消息给医生
    const patientId = getCurrentPatientId()
    // 获取前台账号ID（当前登录用户的ID）
    const userInfo = getUserInfo()
    const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
    console.log('📤 患者端发送图片消息:', {
      fromUserId: patientId,
      toUserId: doctorId.value,
      createdBy: createdBy,
      imageSize: base64Image.length
    })
    await sendMessage(doctorId.value, base64Image, 'image', {}, createdBy)
    
    // 发送成功后立即保存咨询记录（确保所有聊天记录都被保存）
    await saveCurrentConsultation()
    
    console.log('✅ 图片消息发送成功（患者 -> 医生），已保存到咨询记录')
  } catch (error: any) {
    console.error('发送图片消息失败:', error)
    uni.showToast({
      title: error.message || '发送图片失败',
      icon: 'none'
    })
    // 移除刚才添加的消息
    const lastIndex = messages.value.length - 1
    if (lastIndex >= 0 && messages.value[lastIndex].isMe && messages.value[lastIndex].type === 'image') {
      messages.value.splice(lastIndex, 1)
    }
  }
}

/**
 * 发送消息（患者端发送给医生）
 */
async function sendChatMessage() {
  if (!inputText.value.trim()) {
    uni.showToast({
      title: '请输入消息',
      icon: 'none'
    })
    return
  }

  if (!socketConnected.value) {
  uni.showToast({
      title: '未连接，请稍候',
      icon: 'none'
    })
    return
  }

  try {
    const content = inputText.value.trim()
    
    // 先显示在界面上（乐观更新）
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content,
      type: 'text',
      isMe: true, // 患者发送的消息
      timestamp: Date.now()
    }
    messages.value.push(chatMessage)
    // 确保消息按时间排序（最新的在底部）
    messages.value.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    
    // 清空输入框
  inputText.value = ''
    
    // 滚动到底部
    scrollToBottom()
    
    // 通过 Socket.IO 发送消息给医生（标准点对点通信）
    const patientId = getCurrentPatientId()
    if (!patientId) {
      throw new Error('患者ID未设置')
    }
    if (!doctorId.value) {
      throw new Error('医生ID未设置')
    }
    
    // 获取前台账号ID（当前登录用户的ID）
    const userInfo = getUserInfo()
    const createdBy = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
    console.log('📤 患者端发送消息:', {
      fromUserId: patientId,
      toUserId: doctorId.value,
      createdBy: createdBy,
      content: content
    })
    
    await sendMessage(doctorId.value, content, 'text', {}, createdBy)
    
    // 发送成功后立即保存咨询记录（确保所有聊天记录都被保存）
    await saveCurrentConsultation()
    
    uni.showToast({
      title: '已发送',
      icon: 'success',
      duration: 1000
    })
    console.log('✅ 消息发送成功（患者 -> 医生），已保存到咨询记录')
  } catch (error: any) {
    console.error('发送消息失败:', error)
    uni.showToast({
      title: error.message || '发送失败',
      icon: 'none'
    })
    // 移除刚才添加的消息
    const lastIndex = messages.value.length - 1
    if (lastIndex >= 0 && messages.value[lastIndex].isMe) {
      messages.value.splice(lastIndex, 1)
    }
  }
}

const scrollTop = ref(0)

// 表情选择器相关
const showEmojiPicker = ref(false)
const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
  '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
  '👃', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱',
  '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳',
  '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳',
  '👳‍♂️', '🧕', '👮‍♀️', '👮', '👮‍♂️', '👷‍♀️', '👷', '👷‍♂️', '💂‍♀️', '💂',
  '💂‍♂️', '🕵️‍♀️', '🕵️', '🕵️‍♂️', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍🌾', '🧑‍🌾', '👨‍🌾',
  '👩‍🍳', '🧑‍🍳', '👨‍🍳', '👩‍🎓', '🧑‍🎓', '👨‍🎓', '👩‍🎤', '🧑‍🎤', '👨‍🎤', '👩‍🏫',
  '🧑‍🏫', '👨‍🏫', '👩‍🏭', '🧑‍🏭', '👨‍🏭', '👩‍💻', '🧑‍💻', '👨‍💻', '👩‍💼', '🧑‍💼',
  '👨‍💼', '👩‍🔧', '🧑‍🔧', '👨‍🔧', '👩‍🔬', '🧑‍🔬', '👨‍🔬', '👩‍🎨', '🧑‍🎨', '👨‍🎨',
  '👩‍🚒', '🧑‍🚒', '👨‍🚒', '👩‍✈️', '🧑‍✈️', '👨‍✈️', '👩‍🚀', '🧑‍🚀', '👨‍🚀', '👩‍⚖️',
  '🧑‍⚖️', '👨‍⚖️', '👰', '🤵', '👸', '🤴', '🦸‍♀️', '🦸', '🦸‍♂️', '🦹‍♀️',
  '🦹', '🦹‍♂️', '🤶', '🎅', '🧙‍♀️', '🧙', '🧙‍♂️', '🧝‍♀️', '🧝', '🧝‍♂️',
  '🧛‍♀️', '🧛', '🧛‍♂️', '🧜‍♀️', '🧜', '🧜‍♂️', '🧚‍♀️', '🧚', '🧚‍♂️', '👼',
  '🤰', '🤱', '👩‍🍼', '🧑‍🍼', '👨‍🍼', '🙇‍♀️', '🙇', '🙇‍♂️', '💁‍♀️', '💁',
  '💁‍♂️', '🙅‍♀️', '🙅', '🙅‍♂️', '🙆‍♀️', '🙆', '🙆‍♂️', '🙋‍♀️', '🙋', '🙋‍♂️',
  '🧏‍♀️', '🧏', '🧏‍♂️', '🤦‍♀️', '🤦', '🤦‍♂️', '🤷‍♀️', '🤷', '🤷‍♂️', '🙎‍♀️',
  '🙎', '🙎‍♂️', '🙍‍♀️', '🙍', '🙍‍♂️', '💇‍♀️', '💇', '💇‍♂️', '💆‍♀️', '💆',
  '💆‍♂️', '🧖‍♀️', '🧖', '🧖‍♂️', '💃', '🕺', '🕴', '👯‍♀️', '👯', '👯‍♂️',
  '🧘‍♀️', '🧘', '🧘‍♂️', '🛀', '🛌', '👭', '👫', '👬', '💏', '💑',
  '👪', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👩‍👩‍👦', '👩‍👩‍👧', '👩‍👩‍👧‍👦', '👩‍👩‍👦‍👦', '👩‍👩‍👧‍👧',
  '👨‍👨‍👦', '👨‍👨‍👧', '👨‍👨‍👧‍👦', '👨‍👨‍👦‍👦', '👨‍👨‍👧‍👧', '👩‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👦‍👦', '👩‍👧‍👧',
  '👨‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👦‍👦', '👨‍👧‍👧', '🧶', '🧵', '🧥', '🥼', '🦺',
  '👚', '👕', '👖', '🩲', '🩳', '👔', '👗', '👙', '👘', '🥻',
  '🩱', '🥽', '🥼', '🧦', '🧤', '🧣', '🧢', '👒', '🎩', '🎓',
  '⛑', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉', '🔊', '📢',
  '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎙', '🎚', '🎛',
  '🎤', '🎧', '📻', '🎷', '🪗', '🎸', '🎹', '🎺', '🎻', '🪕',
  '🥳', '🎪', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
  '🎸', '🎺', '🎻', '🥁', '🎷', '🎺', '🎸', '🎹', '🎤', '🎧'
]

// 标签选择器相关
const showTagPicker = ref(false)
const tagList = [
  '好的，谢谢医生',
  '我明白了',
  '还有问题',
  '症状已经好转',
  '需要进一步检查',
  '我会按时服药',
  '谢谢您的建议',
  '我会注意的',
  '明白了，谢谢',
  '症状没有改善',
  '我会按时复查',
  '还有其他症状',
  '需要调整用药吗',
  '谢谢您的耐心',
  '我会配合治疗',
  '症状有所缓解',
  '需要做检查吗',
  '我会注意饮食',
  '谢谢医生',
  '我理解了'
]
</script>

<style lang="scss">
.chat-page {
  height: 100vh;
  background-color: #f6f7fb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-blue {
  background: linear-gradient(135deg, #4A90E2, #5BA3F5);
  padding: 20rpx 30rpx 30rpx;
  flex-shrink: 0;
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 20rpx;
    
    .back-btn {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      
      &:active {
        opacity: 0.7;
      }
    }
    
    .header-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .header-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #fff;
      }
      
      .header-subtitle {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.9);
      }
    }
    
    .header-time {
      .time-text {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.95);
        white-space: nowrap;
      }
    }
  }
}

.chat-content {
  flex: 1;
  padding: 30rpx;
  box-sizing: border-box;
  height: 0;
  min-height: 0;
}

.connection-status {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}

.patient-message {
  background-color: #007aff !important;
  color: #fff !important;
  
  .message-text {
    color: #fff !important;
  }
}

.doctor-card {
  background-color: #f0f0f0;
  color: #333;
  
  .message-text {
    color: #333;
  }
}

.message-text {
  font-size: 28rpx;
  line-height: 1.5;
  color: #333;
}

.message-image {
  .chat-image {
    max-width: 400rpx;
    max-height: 400rpx;
    border-radius: 12rpx;
  }
}

.message-wrapper {
  display: flex;
  margin-bottom: 24rpx;
  align-items: flex-start;
  gap: 16rpx;
  width: 100%;
  
  &.doctor-wrapper {
    justify-content: flex-start;
    flex-direction: row;
    align-self: flex-start;
  }
  
  &.patient-wrapper {
    justify-content: flex-end !important;
    flex-direction: row-reverse !important;
    margin-left: auto !important;
    margin-right: 0 !important;
    width: fit-content !important;
    max-width: 85% !important;
    align-self: flex-end !important;
  }
}

.message-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  
  .doctor-wrapper & {
  max-width: 70%;
  }
  
  .patient-wrapper & {
    max-width: 70%;
    margin-right: 0;
  }
}

.patient-card {
  .patient-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 20rpx;
    
    .patient-avatar {
      width: 60rpx;
      height: 60rpx;
      border-radius: 30rpx;
      background-color: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32rpx;
    }
    
    .patient-info {
      font-size: 28rpx;
      color: #333;
    }
  }
  
  .symptom-section {
    margin-bottom: 20rpx;
    
    .symptom-label {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-bottom: 12rpx;
      font-weight: bold;
    }
    
    .symptom-text {
      display: block;
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
    }
  }
  
  .symptom-images {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    
    .image-item {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      overflow: hidden;
      background-color: #f0f0f0;
      position: relative;
      
      .symptom-img {
        width: 100%;
        height: 100%;
      }
      
      .video-badge {
        position: absolute;
        left: 8rpx;
        top: 8rpx;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 20rpx;
        padding: 4rpx 8rpx;
        border-radius: 8rpx;
      }
    }
  }
}

.patient-wrapper {
  display: flex !important;
  flex-direction: row-reverse !important;
  align-items: flex-start !important;
  gap: 16rpx !important;
  margin-bottom: 24rpx !important;
  justify-content: flex-end !important;
  margin-left: auto !important;
  margin-right: 0 !important;
  width: fit-content !important;
  max-width: 85% !important;
  align-self: flex-end !important;
  
  .patient-avatar-small {
    width: 60rpx;
    height: 60rpx;
    border-radius: 30rpx;
    background-color: #e8f4eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    flex-shrink: 0;
    order: 1;
  }
  
  .message-card {
    order: 2;
    margin-right: 0 !important;
  }
}

.doctor-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;
  
  .doctor-avatar {
    width: 60rpx;
    height: 60rpx;
    border-radius: 30rpx;
    background-color: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    flex-shrink: 0;
  }
}

.doctor-card {
  .doctor-text {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    
    .doctor-greeting {
      font-size: 28rpx;
      color: #333;
      line-height: 1.5;
    }
    
    .doctor-advice {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
    }
    
    .doctor-plan {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
    }
  }
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #e5e5ea;
  box-sizing: border-box;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
  
  /* 第一行：功能按钮 */
  .input-buttons-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
  }
  
  /* 第二行：输入框和发送按钮 */
  .input-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
  }
  
  .call-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    border-radius: 30rpx;
    cursor: pointer;
    flex-shrink: 0;
    
    .call-icon {
      font-size: 32rpx;
    }
    
    &:active {
      opacity: 0.7;
      background-color: #e0e0e0;
    }
  }
  
  .image-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    border-radius: 30rpx;
    cursor: pointer;
    flex-shrink: 0;
    
    .image-icon {
      font-size: 36rpx;
    }
    
    &:active {
      opacity: 0.7;
      background-color: #e0e0e0;
    }
  }
  
  .emoji-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    border-radius: 30rpx;
    cursor: pointer;
    flex-shrink: 0;
    
    .emoji-icon {
      font-size: 32rpx;
    }
    
    &:active {
      opacity: 0.7;
      background-color: #e0e0e0;
    }
  }
  
  .tag-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    border-radius: 30rpx;
    cursor: pointer;
    flex-shrink: 0;
    
    .tag-icon {
      font-size: 32rpx;
    }
    
    &:active {
      opacity: 0.7;
      background-color: #e0e0e0;
    }
  }
  
  .chat-input {
    flex: 1;
    height: 72rpx;
    background-color: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: #333;
    
    .input-placeholder {
      color: #999;
    }
  }
  
  .send-btn {
    width: 120rpx;
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 36rpx;
    background-color: #007aff;
    color: #fff;
    font-size: 28rpx;
    padding: 0;
    
    &:disabled {
      background-color: #cccccc;
      opacity: 0.6;
    }
  }
}

.video-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .video-preview-content {
    width: 90%;
    max-width: 750rpx;
    background-color: #000;
    border-radius: 12rpx;
    overflow: hidden;
    position: relative;
    
    .video-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 30rpx;
      background-color: rgba(0, 0, 0, 0.7);
      
      .video-preview-title {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
      
      .video-close-btn {
        width: 60rpx;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48rpx;
        color: #fff;
        cursor: pointer;
        
        &:active {
          opacity: 0.7;
        }
      }
    }
    
    .video-player {
      width: 100%;
      height: 500rpx;
      background-color: #000;
    }
  }
}

/* 表情选择器样式 */
.emoji-picker-container {
  position: fixed;
  bottom: 120rpx;
  left: 0;
  right: 0;
  background-color: #fff;
  border-top: 1rpx solid #e5e5ea;
  z-index: 1000;
  max-height: 500rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.emoji-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e5e5ea;
}

.emoji-picker-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.emoji-picker-close {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #666;
  cursor: pointer;
}

.emoji-picker-close:active {
  opacity: 0.7;
}

.emoji-picker-content {
  flex: 1;
  height: 400rpx;
  overflow-y: auto;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  gap: 10rpx;
}

.emoji-item {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  cursor: pointer;
  transition: background-color 0.2s;
}

.emoji-text {
  font-size: 40rpx;
  line-height: 1;
}

.emoji-item:active {
  background-color: #e0e0e0;
}

/* 标签选择器样式 */
.tag-picker-container {
  position: fixed;
  bottom: 120rpx;
  left: 0;
  right: 0;
  background-color: #fff;
  border-top: 1rpx solid #e5e5ea;
  z-index: 1000;
  max-height: 500rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.tag-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e5e5ea;
}

.tag-picker-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.tag-picker-close {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #666;
  cursor: pointer;
}

.tag-picker-close:active {
  opacity: 0.7;
}

.tag-picker-content {
  flex: 1;
  height: 400rpx;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  gap: 12rpx;
}

.tag-item {
  padding: 20rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1rpx solid #e0e0e0;
}

.tag-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.tag-item:active {
  background-color: #e0e0e0;
  border-color: #4A90E2;
}
</style>

  }
  
  .send-btn {
    width: 120rpx;
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 36rpx;
    background-color: #007aff;
    color: #fff;
    font-size: 28rpx;
    padding: 0;
    
    &:disabled {
      background-color: #cccccc;
      opacity: 0.6;
    }
  }
}

.video-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .video-preview-content {
    width: 90%;
    max-width: 750rpx;
    background-color: #000;
    border-radius: 12rpx;
    overflow: hidden;
    position: relative;
    
    .video-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 30rpx;
      background-color: rgba(0, 0, 0, 0.7);
      
      .video-preview-title {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
      
      .video-close-btn {
        width: 60rpx;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48rpx;
        color: #fff;
        cursor: pointer;
        
        &:active {
          opacity: 0.7;
        }
      }
    }
    
    .video-player {
      width: 100%;
      height: 500rpx;
      background-color: #000;
    }
  }
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
  background: #000;
}

.local-video {
  position: absolute;
  top: 40rpx;
  right: 40rpx;
  width: 240rpx;
  height: 320rpx;
  border-radius: 20rpx;
  object-fit: cover;
  border: 4rpx solid #fff;
  background: #000;
  z-index: 10;
}

.call-controls {
  position: absolute;
  bottom: 80rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 40rpx;
  align-items: center;
  z-index: 10;
}

.call-control-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  cursor: pointer;
  backdrop-filter: blur(10rpx);
  
  &:active {
    opacity: 0.7;
    transform: scale(0.95);
  }
  
  &.end-call {
    background: #f56c6c;
  }
}

.call-status {
  position: absolute;
  top: 80rpx;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 32rpx;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  backdrop-filter: blur(10rpx);
}


    background-color: #f5f5f5;
    border-radius: 36rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: #333;
    
    .input-placeholder {
      color: #999;
    }
  }
  
  .send-btn {
    width: 120rpx;
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 36rpx;
    background-color: #007aff;
    color: #fff;
    font-size: 28rpx;
    padding: 0;
    
    &:disabled {
      background-color: #cccccc;
      opacity: 0.6;
    }
  }
}

.video-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .video-preview-content {
    width: 90%;
    max-width: 750rpx;
    background-color: #000;
    border-radius: 12rpx;
    overflow: hidden;
    position: relative;
    
    .video-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 30rpx;
      background-color: rgba(0, 0, 0, 0.7);
      
      .video-preview-title {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
      
      .video-close-btn {
        width: 60rpx;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48rpx;
        color: #fff;
        cursor: pointer;
        
        &:active {
          opacity: 0.7;
        }
      }
    }
    
    .video-player {
      width: 100%;
      height: 500rpx;
      background-color: #000;
    }
  }
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
  background: #000;
}

.local-video {
  position: absolute;
  top: 40rpx;
  right: 40rpx;
  width: 240rpx;
  height: 320rpx;
  border-radius: 20rpx;
  object-fit: cover;
  border: 4rpx solid #fff;
  background: #000;
  z-index: 10;
}

.call-controls {
  position: absolute;
  bottom: 80rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 40rpx;
  align-items: center;
  z-index: 10;
}

.call-control-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  cursor: pointer;
  backdrop-filter: blur(10rpx);
  
  &:active {
    opacity: 0.7;
    transform: scale(0.95);
  }
  
  &.end-call {
    background: #f56c6c;
  }
}

.call-status {
  position: absolute;
  top: 80rpx;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 32rpx;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  backdrop-filter: blur(10rpx);
}

