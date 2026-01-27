<template>
  <view class="live-container">
    <!-- 摄像头预览区域 -->
    <view class="camera-wrapper">
      <!-- 视频预览 - 使用renderjs操作原生video -->
      <view v-if="isLiving" class="video-container" :change:prop="renderScript.updateStream" :prop="streamData">
        <view id="videoWrapper" class="video-wrapper-inner"></view>
      </view>
      
      <!-- 直播中的覆盖层 -->
      <view v-if="isLiving" class="live-overlay">
        <!-- 顶部信息栏 -->
        <view class="top-bar">
          <view class="doctor-card">
            <image class="avatar" :src="doctorInfo.avatar" mode="aspectFill" />
            <view class="info">
              <text class="name">{{ doctorInfo.name }}</text>
              <text class="title">{{ doctorInfo.title }}</text>
            </view>
            <view class="live-badge">
              <view class="pulse-dot"></view>
              <text class="badge-text">直播中</text>
            </view>
          </view>
          
          <view class="top-actions">
            <view class="viewer-count">
              <text class="count-text">👥 {{ viewerCount }}</text>
            </view>
          </view>
        </view>

        <!-- 直播时长 -->
        <view class="live-time">
          <text class="time-text">⏱️ {{ liveTime }}</text>
        </view>

        <!-- 右侧工具栏 -->
        <view class="right-toolbar">
          <view v-if="hasMultipleCameras" class="tool-item" @click="switchCamera">
            <text class="tool-icon">🔄</text>
            <text class="tool-text">翻转</text>
          </view>
          
          <view class="tool-item">
            <text class="tool-icon">❤️</text>
            <text class="tool-text">{{ likeCount }}</text>
          </view>
        </view>

        <!-- 模拟聊天消息 -->
        <view class="chat-messages">
          <view
            v-for="msg in recentMessages"
            :key="msg.id"
            class="message-item"
          >
            <text class="username">{{ msg.username }}：</text>
            <text class="content">{{ msg.content }}</text>
          </view>
        </view>
      </view>

      <!-- 未开始直播 -->
      <view v-else class="preview-container">
        <view class="preview-content">
          <text class="preview-icon">📹</text>
          <text class="preview-title">准备开始直播</text>
          <text class="preview-desc">点击下方按钮开启摄像头直播</text>
          <view class="preview-info">
            <text class="info-item">✓ 实时视频直播</text>
            <text class="info-item">✓ 健康科普讲解</text>
            <text class="info-item">✓ 在线互动答疑</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部控制栏 -->
    <view class="bottom-bar">
      <view v-if="!isLiving" class="start-section">
        <input
          v-model="liveTitle"
          class="title-input"
          placeholder="输入直播主题（如：心血管健康科普）"
          maxlength="30"
        />
        <button class="start-btn" @click="startLive">
          <text class="btn-icon">🎬</text>
          <text>开始直播</text>
        </button>
      </view>
      
      <view v-else class="living-section">
        <view class="live-stats">
          <view class="stat-item">
            <text class="stat-icon">👥</text>
            <text class="stat-text">{{ viewerCount }}人观看</text>
          </view>
          <view class="stat-item">
            <text class="stat-icon">💬</text>
            <text class="stat-text">{{ messages.length }}条消息</text>
      </view>
    </view>

        <button class="end-btn" @click="endLive">
          <text class="btn-icon">⏹️</text>
          <text>结束直播</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { WebRTCDoctor } from '@/utils/webrtc'
import { WEBRTC_CONFIG } from '@/config/webrtc'

// 直播状态
const isLiving = ref(false)
const liveTitle = ref('')
const devicePosition = ref('user') // user 前置, environment 后置
const streamData = ref({ action: '', position: 'user' }) // 用于触发renderjs
const hasMultipleCameras = ref(false) // 是否有多个摄像头
let availableCameras = [] // 可用的摄像头列表

// WebRTC 实例
let webrtcDoctor = null
let currentStream = null

// 医生信息
const doctorInfo = ref({
  avatar: '/static/doctor/doctor.png',
  name: '王医生',
  title: '主任医师 · 心内科'
})

// 观看人数
const viewerCount = ref(0)

// 点赞数
const likeCount = ref(0)

// 聊天消息
const messages = ref([])
let messageId = 1

// 最近的3条消息
const recentMessages = computed(() => {
  return messages.value.slice(-3)
})

// 直播时长
const liveTime = ref('00:00')
let liveStartTime = 0
let liveTimer = null
let viewerTimer = null
let messageTimer = null
let likeTimer = null

// 格式化直播时长
const formatLiveTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 更新直播时长
const updateLiveTime = () => {
  liveTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - liveStartTime) / 1000)
    liveTime.value = formatLiveTime(elapsed)
  }, 1000)
}

// 检测可用的摄像头
const detectCameras = async () => {
  try {
    // @ts-ignore
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      // @ts-ignore
      const devices = await navigator.mediaDevices.enumerateDevices()
      availableCameras = devices.filter((device) => device.kind === 'videoinput')
      hasMultipleCameras.value = availableCameras.length > 1
      console.log('检测到摄像头数量:', availableCameras.length)
    }
  } catch (error) {
    console.error('检测摄像头失败:', error)
  }
}

// 开始直播
const startLive = async () => {
  if (!liveTitle.value.trim()) {
    uni.showToast({
      title: '请输入直播主题',
      icon: 'none'
    })
    return
  }
  
  try {
    // 检测摄像头
    await detectCameras()
    
    // 显示加载提示
    uni.showLoading({
      title: '正在获取摄像头...',
      mask: true
    })
    
    // 1. 先触发renderjs获取摄像头（等待摄像头流准备好）
    isLiving.value = true
    streamData.value = { 
      action: 'start', 
      position: devicePosition.value
    }
    
    // 注意：WebRTC 初始化将在 setWebRTCStream 中完成（摄像头流准备好后）
    console.log('⏳ 等待摄像头流准备...')
    
    // 安全机制：10秒后如果还没有收到流，隐藏加载提示
    setTimeout(() => {
      if (!currentStream) {
        console.warn('⚠️ 10秒内未收到摄像头流，可能出现问题')
        uni.hideLoading()
        uni.showModal({
          title: '摄像头启动超时',
          content: '请检查摄像头权限或刷新页面重试',
          showCancel: false,
          success: () => {
            isLiving.value = false
          }
        })
      }
    }, 10000)
    
  } catch (error) {
    console.error('开始直播失败:', error)
    uni.hideLoading()
    uni.showModal({
      title: '无法启动直播',
      content: error instanceof Error ? error.message : '请确保已授予摄像头权限',
      showCancel: false
    })
  }
}

// 结束直播
const endLive = () => {
  uni.showModal({
    title: '结束直播',
    content: `本次直播时长 ${liveTime.value}，共 ${viewerCount.value} 人观看`,
    confirmText: '结束',
    cancelText: '继续',
    success: (res) => {
      if (res.confirm) {
        // 停止摄像头
        streamData.value = { action: 'stop', position: devicePosition.value }
        
        // 关闭 WebRTC 连接
        if (webrtcDoctor) {
          webrtcDoctor.closeRoom()
          webrtcDoctor = null
        }
        
        isLiving.value = false
        
        // 清除定时器
        if (liveTimer) clearInterval(liveTimer)
        if (viewerTimer) clearInterval(viewerTimer)
        if (messageTimer) clearInterval(messageTimer)
        if (likeTimer) clearInterval(likeTimer)
        
        // 重置数据
        liveTime.value = '00:00'
        const finalViewers = viewerCount.value
        const finalLikes = likeCount.value
        const finalMessages = messages.value.length
        
        viewerCount.value = 0
        likeCount.value = 0
        messages.value = []
        
        uni.showToast({
          title: '直播已结束',
          icon: 'success'
        })
        
        // 显示直播统计
        setTimeout(() => {
          uni.showModal({
            title: '直播数据统计',
            content: `观看人数：${finalViewers}\n点赞数：${finalLikes}\n消息数：${finalMessages}`,
            showCancel: false
          })
        }, 500)
      }
    }
  })
}

// 切换摄像头
const switchCamera = async () => {
  if (!isLiving.value || !hasMultipleCameras.value) return
  
  // 切换摄像头方向
  devicePosition.value = devicePosition.value === 'user' ? 'environment' : 'user'
  streamData.value = { action: 'switch', position: devicePosition.value }
  
  uni.showToast({
    title: '摄像头已切换',
    icon: 'none'
  })
}

// 接收来自 renderjs 的视频流（用于 WebRTC）
const setWebRTCStream = (stream) => {
  console.log('📹 收到来自 renderjs 的视频流:', stream)
  console.log('视频轨道数:', stream.getVideoTracks().length)
  console.log('音频轨道数:', stream.getAudioTracks().length)
  console.log('流ID:', stream.id)
  console.log('流是否活跃:', stream.active)
  
  currentStream = stream
  
  // 使用 Promise 处理异步逻辑，但函数本身不是 async
  initWebRTCWithStream(stream).catch(error => {
    console.error('❌ 初始化 WebRTC 失败:', error)
    uni.hideLoading()
    uni.showModal({
      title: '无法启动直播',
      content: error instanceof Error ? error.message : '初始化失败',
      showCancel: false
    })
    // 失败时停止摄像头
    isLiving.value = false
    streamData.value = { action: 'stop', position: devicePosition.value }
  })
  
  return true // 返回值，让 renderjs 知道函数被调用了
}

// 使用流初始化 WebRTC（独立的异步函数）
const initWebRTCWithStream = async (stream) => {
  console.log('🚀 开始初始化 WebRTC...')
  
  // 1. 初始化 WebRTC
  webrtcDoctor = new WebRTCDoctor()
  
  // 2. 立即设置本地流（在创建直播间之前！）
  webrtcDoctor.setLocalStream(stream)
  console.log('✅ 本地流已设置到 WebRTC')
  
  // 3. 设置回调
  webrtcDoctor.onRoomCreated = (roomId) => {
    console.log('✅ 直播间创建成功:', roomId)
    uni.hideLoading()
    uni.showToast({
      title: '直播已开始',
      icon: 'success'
    })
  }
  
  webrtcDoctor.onViewerJoined = (viewerId, viewerName, count) => {
    console.log('👤 观众加入:', viewerName)
    viewerCount.value = count
    messages.value.push({
      id: messageId++,
      type: 'system',
      content: `${viewerName} 加入了直播间`
    })
  }
  
  webrtcDoctor.onViewerLeft = (viewerId, viewerName, count) => {
    console.log('👋 观众离开:', viewerName)
    viewerCount.value = count
    messages.value.push({
      id: messageId++,
      type: 'system',
      content: `${viewerName} 离开了直播间`
    })
  }
  
  webrtcDoctor.onError = (error) => {
    console.error('❌ WebRTC 错误:', error)
    uni.showToast({
      title: error,
      icon: 'none'
    })
  }
  
  webrtcDoctor.onChatMessage = (senderId, senderName, message, timestamp) => {
    console.log('💬 收到聊天消息:', senderName, message)
    messages.value.push({
      id: messageId++,
      username: senderName,
      content: message,
      timestamp
    })
  }
  
  // 4. 连接信令服务器
  console.log('🔌 连接信令服务器...')
  await webrtcDoctor.connect(WEBRTC_CONFIG.SIGNAL_SERVER)
  
  // 5. 创建直播间（现在本地流已经准备好了）
  const roomId = 'room_' + Date.now()
  const doctorId = 'doctor_' + Date.now()
  console.log('🏠 创建直播间:', roomId)
  await webrtcDoctor.createRoom(roomId, doctorId, doctorInfo.value.name, liveTitle.value)
  
  // 6. 开始计时和模拟数据
  liveStartTime = Date.now()
  updateLiveTime()
  startReceiveMessages()
  startReceiveLikes()
  
  console.log('🎉 直播启动完成！本地流已准备好，观众可以正常观看了')
}

// 将方法挂载到全局，让 renderjs 可以访问
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__setWebRTCStream = setWebRTCStream
  console.log('✅ setWebRTCStream 已挂载到 window')
}

// 模拟观看人数变化（WebRTC模式下不需要，真实人数来自信令服务器）
// const startViewerCountAnimation = () => {
//   viewerCount.value = Math.floor(Math.random() * 50) + 10
//   viewerTimer = setInterval(() => {
//     const change = Math.floor(Math.random() * 8) - 2
//     viewerCount.value = Math.max(5, viewerCount.value + change)
//   }, 3000)
// }

// 模拟接收消息
const startReceiveMessages = () => {
  const usernames = ['患者A', '患者B', '患者C', '健康达人', '医学爱好者', '张先生', '李女士', '王阿姨']
  const contents = [
    '医生讲得真好！',
    '学到了很多知识',
    '感谢医生的分享',
    '请问可以咨询一下吗？',
    '这个直播太有用了',
    '医生辛苦了',
    '点赞支持！',
    '收藏了',
    '讲得很专业',
    '通俗易懂'
  ]
  
  messageTimer = setInterval(() => {
    if (Math.random() > 0.3) {
      const newMessage = {
        id: messageId++,
        username: usernames[Math.floor(Math.random() * usernames.length)],
        content: contents[Math.floor(Math.random() * contents.length)]
      }
      messages.value.push(newMessage)
      
      // 限制消息数量
      if (messages.value.length > 100) {
        messages.value.shift()
      }
    }
  }, 4000)
}

// 模拟点赞增长
const startReceiveLikes = () => {
  likeTimer = setInterval(() => {
    if (Math.random() > 0.5) {
      likeCount.value += Math.floor(Math.random() * 5) + 1
    }
  }, 2000)
}

onMounted(() => {
  console.log('直播页面已加载')
  
  // 监听来自 renderjs 的视频流事件
uni.$on('webrtc-stream-ready', (stream) => {
    console.log('📹 通过事件接收到视频流')
    setWebRTCStream(stream)
  })
})

onUnmounted(() => {
  // 移除事件监听
  uni.$off('webrtc-stream-ready')
  
  // 停止摄像头
  streamData.value = { action: 'stop', position: devicePosition.value }
  
  // 关闭 WebRTC 连接
  if (webrtcDoctor) {
    webrtcDoctor.closeRoom()
    webrtcDoctor = null
  }
  
  // 清除所有定时器
  if (liveTimer) clearInterval(liveTimer)
  if (viewerTimer) clearInterval(viewerTimer)
  if (messageTimer) clearInterval(messageTimer)
  if (likeTimer) clearInterval(likeTimer)
})
</script>

<script module="renderScript" lang="renderjs">
let mediaStream = null
let videoElement = null
let webrtcDoctorInstance = null

export default {
  mounted() {
    console.log('renderjs mounted')
  },
  methods: {
    async updateStream(newValue, oldValue, ownerInstance, instance) {
      const action = newValue.action
      const position = newValue.position
      const roomId = newValue.roomId
      
      console.log('updateStream:', action, position)
      
      if (action === 'start') {
        await this.startCamera(position, roomId, ownerInstance)
      } else if (action === 'switch') {
        await this.switchCamera(position, ownerInstance)
      } else if (action === 'stop') {
        this.stopCamera()
      }
    },
    
    async startCamera(position, roomId, ownerInstance) {
      try {
        console.log('🎬 renderjs: 开始启动摄像头...')
        console.log('position:', position)
        console.log('ownerInstance:', ownerInstance)
        console.log('ownerInstance 类型:', typeof ownerInstance)
        
        // 获取摄像头权限
        console.log('📸 请求摄像头权限...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: position,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        })
        
        mediaStream = stream
        
        console.log('✅ 摄像头流已获取')
        console.log('- 视频轨道数:', stream.getVideoTracks().length)
        console.log('- 音频轨道数:', stream.getAudioTracks().length)
        console.log('- 流ID:', stream.id)
        console.log('- 流是否活跃:', stream.active)
        
        // 方法1: 尝试通过全局方法调用
        console.log('🔄 准备调用 Vue 方法...')
        if (typeof window.__setWebRTCStream === 'function') {
          try {
            console.log('🔄 尝试全局方法 window.__setWebRTCStream...')
            const result = window.__setWebRTCStream(stream)
            console.log('✅ 全局方法调用完成，返回值:', result)
          } catch (err) {
            console.error('❌ 全局方法调用失败:', err)
            console.error('错误堆栈:', err.stack)
          }
        } else if (ownerInstance && typeof ownerInstance.callMethod === 'function') {
          try {
            console.log('🔄 尝试 callMethod...')
            const result = ownerInstance.callMethod('setWebRTCStream', stream)
            console.log('✅ callMethod 调用完成，返回值:', result)
          } catch (err) {
            console.error('❌ callMethod 失败:', err)
            console.error('错误堆栈:', err.stack)
          }
        }
        
        // 方法2: 同时使用事件作为备用
        console.log('🔄 同时发送事件...')
        uni.$emit('webrtc-stream-ready', stream)
        console.log('✅ 事件已发送')
        
        // 创建video元素显示本地预览
        const wrapper = document.getElementById('videoWrapper')
        if (wrapper) {
          console.log('📺 创建本地预览视频元素')
          wrapper.innerHTML = ''
          videoElement = document.createElement('video')
          videoElement.setAttribute('autoplay', 'true')
          videoElement.setAttribute('playsinline', 'true')
          videoElement.setAttribute('muted', 'true')
          videoElement.style.width = '100%'
          videoElement.style.height = '100%'
          videoElement.style.objectFit = 'cover'
          videoElement.style.transform = 'scaleX(-1)'
          videoElement.style.background = '#000'
          
          // 先添加到 DOM
          wrapper.appendChild(videoElement)
          
          // 再设置流
          videoElement.srcObject = stream
          
          // 等待一小段时间确保流已加载
          setTimeout(async () => {
            try {
              await videoElement.play()
              console.log('✅ 本地预览已显示')
            } catch (err) {
              console.error('❌ 播放失败:', err)
            }
          }, 100)
        } else {
          console.error('❌ 找不到 videoWrapper 元素')
        }
      } catch (error) {
        console.error('❌ 启动摄像头失败:', error)
        console.error('错误详情:', error.message, error.name)
        uni.showToast({
          title: '无法访问摄像头: ' + error.message,
          icon: 'none'
        })
      }
    },
    
    async switchCamera(position, ownerInstance) {
      this.stopCamera()
      await this.startCamera(position, null, ownerInstance)
    },
    
    stopCamera() {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop()
        })
        mediaStream = null
      }
      
      if (videoElement) {
        videoElement.srcObject = null
        videoElement = null
      }
      
      const wrapper = document.getElementById('videoWrapper')
      if (wrapper) {
        wrapper.innerHTML = ''
      }
      
      console.log('摄像头已停止')
    }
  }
}
</script>

<style lang="scss" scoped>
.live-container {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.camera-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

.video-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
}

.video-wrapper-inner {
  width: 100%;
  height: 100%;
  background: #000;
}

.live-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
  
  > * {
    pointer-events: auto;
  }
}

// 顶部信息栏
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  z-index: 100;
}

.doctor-card {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50rpx;
}

.avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  border: 3rpx solid #fff;
  margin-right: 16rpx;
}

.info {
  display: flex;
  flex-direction: column;
  margin-right: 16rpx;
}

.name {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4rpx;
}

.title {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.live-badge {
  display: flex;
  align-items: center;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  border-radius: 20rpx;
}

.pulse-dot {
  width: 12rpx;
  height: 12rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 8rpx;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.top-actions {
  display: flex;
  gap: 16rpx;
}

.viewer-count {
  padding: 12rpx 20rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 30rpx;
}

.count-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

// 直播时长
.live-time {
  position: absolute;
  top: 120rpx;
  left: 30rpx;
  padding: 12rpx 24rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 30rpx;
  z-index: 100;
}

.time-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

// 右侧工具栏
.right-toolbar {
  position: absolute;
  right: 20rpx;
  bottom: 200rpx;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  z-index: 100;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.tool-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.tool-text {
  font-size: 22rpx;
  color: #fff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

// 聊天消息
.chat-messages {
  position: absolute;
  left: 20rpx;
  bottom: 150rpx;
  width: 500rpx;
  z-index: 90;
}

.message-item {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
  padding: 12rpx 20rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20rpx;
  max-width: 100%;
  word-break: break-all;
}

.username {
  font-size: 24rpx;
  color: #ffd666;
  font-weight: bold;
}

.content {
  font-size: 24rpx;
  color: #fff;
}

// 未开始直播
.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
  padding: 60rpx;
}

.preview-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.preview-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
}

.preview-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 20rpx;
}

.info-item {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

// 底部控制栏
.bottom-bar {
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(0, 0, 0, 0.9);
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}

.start-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.title-input {
  width: 100%;
  height: 80rpx;
  padding: 0 30rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #fff;
}

.title-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 40rpx;
  border: none;
  
  &::after {
    border: none;
  }
}

.btn-icon {
  font-size: 36rpx;
}

.living-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.live-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stat-icon {
  font-size: 28rpx;
}

.stat-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.end-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 40rpx;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 40rpx;
  border: none;
  
  &::after {
    border: none;
  }
}
</style>
