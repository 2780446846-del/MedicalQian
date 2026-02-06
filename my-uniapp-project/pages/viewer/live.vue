<template>
  <view class="viewer-container">
    <!-- 视频播放区域 -->
    <view class="video-wrapper">
      <!-- 视频容器 - 始终挂载以保持 renderjs 生命周期 -->
      <view class="video-container" :change:prop="renderScript.updateStream" :prop="viewerStreamData">
        <view id="remoteVideoWrapper" class="video-wrapper-inner"></view>
      </view>
      
      <!-- 连接中覆盖层 -->
      <view v-if="isConnecting && !isConnected" class="connecting-container">
        <view class="connecting-content">
          <view class="loading-spinner"></view>
          <text class="connecting-text">正在连接直播...</text>
        </view>
      </view>
      
      <!-- 未连接覆盖层 -->
      <view v-if="!isConnecting && !isConnected" class="preview-container">
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
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
// @ts-ignore
import { onLoad } from '@dcloudio/uni-app'
import { API_BASE_URL } from '@/utils/config.js'

// 根据 API_BASE_URL 推导信令服务器地址
const wsBase = (API_BASE_URL || 'http://localhost:3000/api')
  .replace('/api', '')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://')
const signalServerUrl = wsBase + '/webrtc-signal'

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

// ===== UI 状态 =====
const isConnecting = ref(false)
const isConnected = ref(false)

const roomId = ref('')
const doctorName = ref('')
const liveTitle = ref('')
const viewerCount = ref(0)

const viewerId = ref('viewer_' + Date.now())
const viewerName = ref('观众' + Math.floor(Math.random() * 1000))

const isMuted = ref(false)
const isLiked = ref(false)

const messages = ref<any[]>([])
const inputMessage = ref('')
let messageId = 1

const recentMessages = computed(() => messages.value.slice(-5))

// renderjs 通信 prop
const viewerStreamData = ref<any>({ action: '', _ts: 0 })

// ===== renderjs 回调（逻辑层只更新 UI 状态）=====
const onViewerRoomJoined = (dataStr: any) => {
  const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr || {})
  console.log('✅ 加入直播间成功:', data)
  doctorName.value = data.doctorName || ''
  liveTitle.value = data.title || ''
  viewerCount.value = data.viewerCount || 0
  isConnecting.value = false
  isConnected.value = true
  uni.showToast({ title: '已进入直播间', icon: 'success' })
}

const onViewerStreamReady = () => {
  console.log('✅ 远程视频流已就绪')
  isConnected.value = true
  isConnecting.value = false
}

const onViewerRoomClosed = () => {
  console.log('直播间已关闭')
  isConnected.value = false
  uni.showModal({
    title: '提示',
    content: '直播已结束',
    showCancel: false,
    success: () => { uni.navigateBack() }
  })
}

const onViewerChatMessage = (dataStr: any) => {
  const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr || {})
  if (data.senderId === viewerId.value) return
  messages.value.push({
    id: messageId++,
    username: data.senderName,
    content: data.message,
    timestamp: data.timestamp
  })
}

const onViewerError = (dataStr: any) => {
  const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr || {})
  console.error('观众端错误:', data.message)
  isConnecting.value = false
  uni.showToast({ title: data.message || '连接错误', icon: 'none' })
}

const onViewerConnectionState = (dataStr: any) => {
  const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr || {})
  console.log('连接状态变化:', data.state)
  if (data.state === 'connected') {
    isConnected.value = true
    isConnecting.value = false
  } else if (data.state === 'failed' || data.state === 'closed') {
    isConnected.value = false
  }
}

// ===== 用户操作 =====
const leaveLive = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出直播间吗？',
    success: (res) => {
      if (res.confirm) {
        viewerStreamData.value = { action: 'leave', _ts: Date.now() }
        uni.navigateBack()
      }
    }
  })
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  viewerStreamData.value = { action: 'mute', muted: isMuted.value, _ts: Date.now() }
}

const toggleLike = () => {
  isLiked.value = !isLiked.value
  if (isLiked.value) {
    uni.showToast({ title: '点赞成功', icon: 'success' })
  }
}

const sendMessage = () => {
  if (!inputMessage.value.trim()) return
  const content = inputMessage.value.trim()

  messages.value.push({
    id: messageId++,
    username: viewerName.value,
    content,
    timestamp: Date.now(),
    isSelf: true
  })

  viewerStreamData.value = { action: 'sendChat', message: content, _ts: Date.now() }
  inputMessage.value = ''
}

// ===== 暴露回调给 renderjs =====
defineExpose({
  onViewerRoomJoined,
  onViewerStreamReady,
  onViewerRoomClosed,
  onViewerChatMessage,
  onViewerError,
  onViewerConnectionState
})

// 手动挂载到组件实例（确保 renderjs callMethod 能找到）
const inst = getCurrentInstance()
if (inst) {
  const target: any = inst.proxy || inst
  target.onViewerRoomJoined = onViewerRoomJoined
  target.onViewerStreamReady = onViewerStreamReady
  target.onViewerRoomClosed = onViewerRoomClosed
  target.onViewerChatMessage = onViewerChatMessage
  target.onViewerError = onViewerError
  target.onViewerConnectionState = onViewerConnectionState
  console.log('✅ 观众端回调方法已挂载到组件实例')
}

// 使用 onLoad 获取页面参数
onLoad((options: any) => {
  console.log('viewer/live onLoad, options:', JSON.stringify(options))
  if (options && options.roomId) {
    roomId.value = options.roomId
    isConnecting.value = true
    console.log('✅ 获取到 roomId:', options.roomId, '信令地址:', signalServerUrl)

    // 通知 renderjs 加入直播间
    viewerStreamData.value = {
      action: 'join',
      roomId: options.roomId,
      viewerId: viewerId.value,
      viewerName: viewerName.value,
      signalServer: signalServerUrl,
      iceServers,
      _ts: Date.now()
    }
  } else {
    console.error('❌ 缺少 roomId 参数')
    uni.showModal({
      title: '错误',
      content: '缺少直播间ID',
      showCancel: false,
      success: () => { uni.navigateBack() }
    })
  }
})

onMounted(() => {
  // 备用事件监听
  uni.$on('render-onViewerRoomJoined', onViewerRoomJoined)
  uni.$on('render-onViewerStreamReady', onViewerStreamReady)
  uni.$on('render-onViewerRoomClosed', onViewerRoomClosed)
  uni.$on('render-onViewerChatMessage', onViewerChatMessage)
  uni.$on('render-onViewerError', onViewerError)
  uni.$on('render-onViewerConnectionState', onViewerConnectionState)
})

onUnmounted(() => {
  uni.$off('render-onViewerRoomJoined')
  uni.$off('render-onViewerStreamReady')
  uni.$off('render-onViewerRoomClosed')
  uni.$off('render-onViewerChatMessage')
  uni.$off('render-onViewerError')
  uni.$off('render-onViewerConnectionState')
  viewerStreamData.value = { action: 'leave', _ts: Date.now() }
})
</script>

<script module="renderScript" lang="renderjs">
// ===== renderjs：观众端所有 WebRTC 逻辑在视图层执行 =====
var ownerInst = null
var ws = null
var pc = null
var remoteVideoElement = null
var currentRoomId = ''
var currentViewerId = ''
var currentViewerName = ''
var storedIceServers = [{ urls: 'stun:stun.l.google.com:19302' }]

export default {
  mounted() {
    console.log('[Viewer renderjs] mounted')
  },
  methods: {
    // ===== prop 变化入口 =====
    updateStream(newValue, oldValue, ownerInstance) {
      if (ownerInstance) ownerInst = ownerInstance
      if (!newValue || !newValue.action) return

      console.log('[Viewer renderjs] action:', newValue.action)

      switch (newValue.action) {
        case 'join':
          this.joinLive(newValue)
          break
        case 'leave':
          this.leaveLive()
          break
        case 'mute':
          this.setMuted(newValue.muted)
          break
        case 'sendChat':
          this.sendChatMessage(newValue.message)
          break
      }
    },

    // ===== 加入直播间 =====
    async joinLive(config) {
      try {
        currentRoomId = config.roomId
        currentViewerId = config.viewerId
        currentViewerName = config.viewerName
        storedIceServers = config.iceServers || storedIceServers

        console.log('[Viewer] 加入直播间:', currentRoomId)

        // 连接信令服务器（renderjs 在 WebView 中，原生 WebSocket 可用）
        await this.connectSignalServer(config.signalServer)

        // 发送加入房间请求
        this.wsSend({
          type: 'join-room',
          roomId: config.roomId,
          viewerId: config.viewerId,
          viewerName: config.viewerName
        })

        console.log('[Viewer] 已发送 join-room 请求')
      } catch (e) {
        console.error('[Viewer] 加入失败:', e)
        this.callOwner('onViewerError', JSON.stringify({
          message: e.message || '加入直播间失败'
        }))
      }
    },

    // ===== 连接信令服务器 =====
    connectSignalServer(url) {
      return new Promise(function(resolve, reject) {
        try {
          console.log('[Viewer] 连接信令:', url)
          ws = new WebSocket(url)

          ws.onopen = function() {
            console.log('✅ [Viewer] 信令连接成功')
            resolve()
          }

          ws.onerror = function(e) {
            console.error('❌ [Viewer] 信令连接失败:', e)
            reject(new Error('信令服务器连接失败'))
          }

          var self = this || {}
          ws.onmessage = function(event) {
            var data = JSON.parse(event.data)
            // 需要通过闭包调用 handleSignalMessage
            if (self.handleSignalMessage) {
              self.handleSignalMessage(data)
            }
          }

          ws.onclose = function() {
            console.log('[Viewer] 信令连接已关闭')
          }
        } catch (e) {
          reject(e)
        }
      }.bind(this))
    },

    // ===== 处理信令消息 =====
    handleSignalMessage(data) {
      console.log('[Viewer] 收到信令:', data.type)

      switch (data.type) {
        case 'room-joined':
          this.callOwner('onViewerRoomJoined', JSON.stringify({
            doctorName: data.doctorName,
            title: data.title,
            viewerCount: data.viewerCount
          }))
          break

        case 'offer':
          this.handleOffer(data.offer)
          break

        case 'ice-candidate':
          this.handleIceCandidate(data.candidate)
          break

        case 'room-closed':
          this.callOwner('onViewerRoomClosed', '')
          this.cleanup()
          break

        case 'chat-message':
          this.callOwner('onViewerChatMessage', JSON.stringify({
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            timestamp: data.timestamp
          }))
          break

        case 'error':
          this.callOwner('onViewerError', JSON.stringify({
            message: data.message
          }))
          break
      }
    },

    // ===== 处理 Offer =====
    async handleOffer(offer) {
      try {
        console.log('[Viewer] 收到 Offer，创建 PeerConnection')

        // 关闭旧的 PC
        if (pc) {
          try { pc.close() } catch (e) {}
          pc = null
        }

        pc = new RTCPeerConnection({
          iceServers: storedIceServers
        })

        // 监听远程流 — 留在 renderjs 视图层，直接显示
        var self = this
        pc.ontrack = function(event) {
          console.log('[Viewer] ontrack 触发')
          var stream = null
          if (event.streams && event.streams[0]) {
            stream = event.streams[0]
          } else {
            stream = new MediaStream([event.track])
          }

          console.log('[Viewer] 远程流轨道 - 视频:', stream.getVideoTracks().length,
            '音频:', stream.getAudioTracks().length)
          self.displayRemoteStream(stream)
          self.callOwner('onViewerStreamReady', '')
        }

        // ICE 候选
        pc.onicecandidate = function(event) {
          if (event.candidate) {
            self.wsSend({
              type: 'ice-candidate',
              roomId: currentRoomId,
              candidate: event.candidate
            })
          }
        }

        // 连接状态
        pc.onconnectionstatechange = function() {
          var state = pc ? pc.connectionState : 'unknown'
          console.log('[Viewer] 连接状态:', state)
          self.callOwner('onViewerConnectionState', JSON.stringify({ state: state }))
        }

        // 设置远程描述
        await pc.setRemoteDescription(new RTCSessionDescription(offer))

        // 创建并发送 Answer
        var answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        this.wsSend({
          type: 'answer',
          roomId: currentRoomId,
          answer: pc.localDescription
        })

        console.log('[Viewer] Answer 已发送')
      } catch (e) {
        console.error('[Viewer] 处理 Offer 失败:', e)
        this.callOwner('onViewerError', JSON.stringify({
          message: '连接失败: ' + (e.message || e)
        }))
      }
    },

    // ===== 处理 ICE Candidate =====
    async handleIceCandidate(candidate) {
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error('[Viewer] 添加 ICE 失败:', e)
        }
      }
    },

    // ===== 显示远程视频 =====
    displayRemoteStream(stream) {
      var wrapper = document.getElementById('remoteVideoWrapper')
      if (!wrapper) {
        console.error('[Viewer] 找不到 remoteVideoWrapper')
        return
      }

      // 清理旧元素
      if (remoteVideoElement) {
        try {
          remoteVideoElement.pause()
          remoteVideoElement.srcObject = null
        } catch (e) {}
      }
      wrapper.innerHTML = ''

      // 创建视频元素
      remoteVideoElement = document.createElement('video')
      remoteVideoElement.setAttribute('autoplay', 'true')
      remoteVideoElement.setAttribute('playsinline', 'true')
      // 先静音以保证 autoplay 成功，播放后再取消静音
      remoteVideoElement.muted = true
      remoteVideoElement.volume = 1.0
      remoteVideoElement.style.cssText = 'width:100%;height:100%;object-fit:cover;background:#000;'

      wrapper.appendChild(remoteVideoElement)
      remoteVideoElement.srcObject = stream

      // 延迟播放
      setTimeout(function() {
        if (remoteVideoElement) {
          remoteVideoElement.play().then(function() {
            console.log('✅ [Viewer] 远程视频播放成功（静音状态）')
            // 播放成功后立即取消静音，恢复声音
            if (remoteVideoElement) {
              remoteVideoElement.muted = false
              console.log('🔊 [Viewer] 已取消静音，音频已启用')
            }
          }).catch(function(err) {
            console.error('[Viewer] 播放失败:', err)
          })
        }
      }, 200)
    },

    // ===== 设置静音 =====
    setMuted(muted) {
      if (remoteVideoElement) {
        remoteVideoElement.muted = !!muted
        console.log('[Viewer] 静音状态:', !!muted)
      }
    },

    // ===== 发送聊天消息 =====
    sendChatMessage(message) {
      this.wsSend({
        type: 'chat-message',
        roomId: currentRoomId,
        senderId: currentViewerId,
        senderName: currentViewerName,
        message: message
      })
    },

    // ===== 离开直播间 =====
    leaveLive() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.wsSend({
          type: 'leave-room',
          roomId: currentRoomId
        })
      }
      this.cleanup()
    },

    // ===== 清理资源 =====
    cleanup() {
      if (pc) {
        try { pc.close() } catch (e) {}
        pc = null
      }
      if (ws) {
        try { ws.close() } catch (e) {}
        ws = null
      }
      if (remoteVideoElement) {
        try {
          remoteVideoElement.pause()
          remoteVideoElement.srcObject = null
        } catch (e) {}
        remoteVideoElement = null
      }
      currentRoomId = ''
      currentViewerId = ''
      currentViewerName = ''
      console.log('[Viewer] 资源已清理')
    },

    // ===== WebSocket 发送 =====
    wsSend(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    },

    // ===== 安全地调用逻辑层方法 =====
    callOwner(methodName, data) {
      console.log('📤 [Viewer] callOwner:', methodName)
      var called = false

      if (ownerInst && typeof ownerInst.callMethod === 'function') {
        try {
          ownerInst.callMethod(methodName, data)
          called = true
          console.log('✅ callMethod 成功:', methodName)
        } catch (e) {
          console.error('❌ callMethod 失败:', e)
        }
      }

      // 备用：uni.$emit
      if (typeof uni !== 'undefined' && typeof uni.$emit === 'function') {
        try {
          uni.$emit('render-' + methodName, data)
          if (!called) {
            console.log('✅ uni.$emit 备用成功:', 'render-' + methodName)
          }
        } catch (e) {}
      }

      if (!called) {
        console.warn('⚠️ ownerInstance 不可用:', methodName)
      }
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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  z-index: 5;
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
  position: absolute;
  top: 0;
  left: 0;
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

