<template>
  <view class="viewer-container">
    <!-- 视频播放区域 -->
    <view class="video-wrapper">
      <!-- 远程视频 -->
      <view v-if="isConnected" class="video-container" :change:prop="renderScript.updateRemoteStream" :prop="remoteStreamData">
        <view id="remoteVideoWrapper" class="video-wrapper-inner"></view>
      </view>
      
      <!-- 连接中 -->
      <view v-else-if="isConnecting" class="connecting-container">
        <view class="connecting-content">
          <view class="loading-spinner"></view>
          <text class="connecting-text">正在连接直播...</text>
        </view>
      </view>
      
      <!-- 未连接 -->
      <view v-else class="preview-container">
        <view class="preview-content">
          <text class="preview-icon">📺</text>
          <text class="preview-title">{{ doctorName || '医生' }}的直播间</text>
          <text class="preview-desc">{{ liveTitle || '健康科普直播' }}</text>
        </view>
      </view>
      
      <!-- 覆盖层 -->
      <view v-if="isConnected" class="live-overlay">
        <!-- 顶部信息栏 -->
        <view class="top-bar">
          <view class="doctor-card">
            <image class="avatar" src="/static/doctor/doctor.png" mode="aspectFill" />
            <view class="info">
              <text class="name">{{ doctorName }}</text>
              <text class="title">{{ liveTitle }}</text>
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
            <view class="close-btn" @click="leaveLive">
              <text class="icon">✕</text>
            </view>
          </view>
        </view>

        <!-- 右侧工具栏 -->
        <view class="right-toolbar">
          <view class="tool-item" @click="toggleLike">
            <text class="tool-icon">{{ isLiked ? '❤️' : '🤍' }}</text>
            <text class="tool-text">点赞</text>
          </view>
          
          <view class="tool-item" @click="toggleMute">
            <text class="tool-icon">{{ isMuted ? '🔇' : '🔊' }}</text>
            <text class="tool-text">{{ isMuted ? '静音' : '声音' }}</text>
          </view>
        </view>

        <!-- 聊天消息 -->
        <scroll-view class="chat-messages" scroll-y :scroll-into-view="'msg-' + messages.length">
          <view
            v-for="(msg, index) in recentMessages"
            :key="msg.id"
            :id="'msg-' + index"
            class="message-item"
          >
            <text class="username">{{ msg.username }}：</text>
            <text class="content">{{ msg.content }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部输入栏 -->
    <view v-if="isConnected" class="bottom-bar">
      <view class="input-wrapper">
        <input
          v-model="inputMessage"
          class="message-input"
          placeholder="说点什么..."
          @confirm="sendMessage"
        />
      </view>
      <button class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim()">
        发送
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { WebRTCViewer } from '@/utils/webrtc'
import { WEBRTC_CONFIG } from '@/config/webrtc'

// 连接状态
const isConnecting = ref(false)
const isConnected = ref(false)
const remoteStreamData = ref({ stream: null, timestamp: 0 })

// 直播信息
const roomId = ref('')
const doctorName = ref('')
const liveTitle = ref('')
const viewerCount = ref(0)

// 观众信息
const viewerId = ref('viewer_' + Date.now())
const viewerName = ref('观众' + Math.floor(Math.random() * 1000))

// WebRTC 实例
let webrtcViewer = null

// 音频控制
const isMuted = ref(false)

// 点赞
const isLiked = ref(false)

// 聊天消息
const messages = ref([])
const inputMessage = ref('')
let messageId = 1

// 最近的消息
const recentMessages = computed(() => {
  return messages.value.slice(-5)
})

// 加入直播间
const joinLive = async () => {
  try {
    isConnecting.value = true
    
    // 1. 初始化 WebRTC
    webrtcViewer = new WebRTCViewer()
    
    // 设置回调
    webrtcViewer.onRoomJoined = (doctor, title, count) => {
      console.log('加入直播间成功')
      doctorName.value = doctor
      liveTitle.value = title
      viewerCount.value = count
      isConnecting.value = false
      isConnected.value = true
      
      uni.showToast({
        title: '已进入直播间',
        icon: 'success'
      })
    }
    
    webrtcViewer.onRemoteStream = (stream) => {
      console.log('✅ 收到远程视频流:', stream)
      console.log('视频轨道数:', stream.getVideoTracks().length)
      console.log('音频轨道数:', stream.getAudioTracks().length)
      
      // 触发 renderjs 显示远程视频
      // 注意：需要传递一个新的对象引用才能触发 renderjs 的 change 事件
      remoteStreamData.value = {
        stream: stream,
        timestamp: Date.now(),
        muted: isMuted.value
      }
      
      console.log('已触发 renderjs 更新')
    }
    
    webrtcViewer.onRoomClosed = () => {
      console.log('直播间已关闭')
      uni.showModal({
        title: '提示',
        content: '直播已结束',
        showCancel: false,
        success: () => {
          uni.navigateBack()
        }
      })
    }
    
    webrtcViewer.onError = (error) => {
      console.error('WebRTC 错误:', error)
      uni.showToast({
        title: error,
        icon: 'none'
      })
    }
    
    webrtcViewer.onChatMessage = (senderId, senderName, message, timestamp) => {
      console.log('💬 收到聊天消息:', senderName, message)
      messages.value.push({
        id: messageId++,
        username: senderName,
        content: message,
        timestamp
      })
    }
    
    webrtcViewer.onConnectionStateChange = (state) => {
      console.log('连接状态:', state)
      if (state === 'connected') {
        isConnected.value = true
        isConnecting.value = false
      } else if (state === 'failed' || state === 'closed') {
        isConnected.value = false
      }
    }
    
    // 2. 连接信令服务器
    await webrtcViewer.connect(WEBRTC_CONFIG.SIGNAL_SERVER)
    
    // 3. 加入直播间
    await webrtcViewer.joinRoom(roomId.value, viewerId.value, viewerName.value)
    
  } catch (error) {
    console.error('加入直播间失败:', error)
    isConnecting.value = false
    uni.showModal({
      title: '无法加入直播间',
      content: error instanceof Error ? error.message : '请稍后重试',
      showCancel: false,
      success: () => {
        uni.navigateBack()
      }
    })
  }
}

// 离开直播间
const leaveLive = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出直播间吗？',
    success: (res) => {
      if (res.confirm) {
        if (webrtcViewer) {
          webrtcViewer.leaveRoom()
          webrtcViewer = null
        }
        uni.navigateBack()
      }
    }
  })
}

// 切换静音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  // 这里需要控制远程音频的静音
  remoteStreamData.value = {
    ...remoteStreamData.value,
    muted: isMuted.value,
    timestamp: Date.now()
  }
}

// 点赞
const toggleLike = () => {
  isLiked.value = !isLiked.value
  if (isLiked.value) {
    uni.showToast({
      title: '点赞成功',
      icon: 'success'
    })
  }
}

// 发送消息
const sendMessage = () => {
  if (!inputMessage.value.trim()) return
  
  if (!webrtcViewer) {
    console.error('WebRTC 未初始化')
    return
  }
  
  // 通过 WebSocket 发送消息
  webrtcViewer.sendChatMessage(inputMessage.value.trim())
  
  // 清空输入框
  inputMessage.value = ''
}

onMounted(() => {
  // 从路由参数获取 roomId
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  let options = {}
  
  // 尝试多种方式获取路由参数，使用括号表示法避免TypeScript错误
  if (currentPage['options']) {
    options = currentPage['options']
  } else if (currentPage['$mp'] && currentPage['$mp']['query']) {
    options = currentPage['$mp']['query']
  } else if (currentPage['$route'] && currentPage['$route']['query']) {
    options = currentPage['$route']['query']
  }
  
  // 检查roomId是否存在
  if (options && options['roomId']) {
    roomId.value = options['roomId']
    joinLive()
  } else {
    uni.showModal({
      title: '错误',
      content: '缺少直播间ID',
      showCancel: false,
      success: () => {
        uni.navigateBack()
      }
    })
  }
})

onUnmounted(() => {
  if (webrtcViewer) {
    webrtcViewer.leaveRoom()
    webrtcViewer = null
  }
})
</script>

<script module="renderScript" lang="renderjs">
let remoteVideoElement = null

export default {
  mounted() {
    console.log('renderjs mounted (viewer)')
  },
  methods: {
    updateRemoteStream(newValue, oldValue, ownerInstance, instance) {
      console.log('updateRemoteStream called:', newValue)
      const stream = newValue.stream
      const muted = newValue.muted
      
      if (stream) {
        console.log('收到远程流，准备显示')
        this.displayRemoteStream(stream, muted)
      } else {
        console.log('stream 为空')
      }
    },
    
    displayRemoteStream(stream, muted = false) {
      console.log('displayRemoteStream 开始')
      const wrapper = document.getElementById('remoteVideoWrapper')
      if (!wrapper) {
        console.error('找不到 remoteVideoWrapper 元素')
        return
      }
      
      console.log('找到 wrapper，创建 video 元素')
      wrapper.innerHTML = ''
      remoteVideoElement = document.createElement('video')
      remoteVideoElement.setAttribute('autoplay', 'true')
      remoteVideoElement.setAttribute('playsinline', 'true')
      remoteVideoElement.muted = muted || false
      remoteVideoElement.style.width = '100%'
      remoteVideoElement.style.height = '100%'
      remoteVideoElement.style.objectFit = 'cover'
      remoteVideoElement.style.background = '#000'
      
      // 直接设置 srcObject
      remoteVideoElement.srcObject = stream
      wrapper.appendChild(remoteVideoElement)
      
      // 尝试播放
      remoteVideoElement.play().then(() => {
        console.log('✅ 远程视频播放成功')
      }).catch(err => {
        console.error('❌ 播放远程视频失败:', err)
        // 尝试静音播放
        remoteVideoElement.muted = true
        remoteVideoElement.play().catch(err2 => {
          console.error('❌ 静音播放也失败:', err2)
        })
      })
      
      console.log('✅ 远程视频元素已添加到 DOM')
    }
  }
}
</script>

<style lang="scss" scoped>
.viewer-container {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-wrapper {
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

.connecting-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
}

.connecting-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.2);
  border-top-color: #ff4d4f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.connecting-text {
  font-size: 28rpx;
  color: #fff;
}

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

.close-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
}

.icon {
  font-size: 32rpx;
  color: #fff;
}

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

.chat-messages {
  position: absolute;
  left: 20rpx;
  bottom: 150rpx;
  width: 500rpx;
  max-height: 300rpx;
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

.bottom-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(0, 0, 0, 0.9);
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}

.input-wrapper {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 40rpx;
  padding: 0 30rpx;
}

.message-input {
  width: 100%;
  height: 70rpx;
  font-size: 28rpx;
  color: #fff;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.send-btn {
  padding: 16rpx 40rpx;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 40rpx;
  border: none;
  
  &[disabled] {
    opacity: 0.5;
  }
  
  &::after {
    border: none;
  }
}
</style>

