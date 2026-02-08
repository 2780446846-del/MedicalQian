<template>
  <view class="live-container">
    <!-- 摄像头预览区域 -->
    <view class="camera-wrapper">
      <!-- 视频预览 - 使用renderjs操作原生video -->
      <view class="video-container" :change:prop="renderScript.updateStream" :prop="streamData">
        <!--视频显示在这里 -->
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
              <!-- 观众数量 -->
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
          <view v-for="msg in recentMessages" :key="msg.id" class="message-item">
            <text class="username">{{ msg.username }}：</text>
            <text class="content">{{ msg.content }}</text>
          </view>
        </view>
      </view>

      <!-- 未开始直播 -->
      <view v-if="!isLiving" class="preview-container">
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
        <input v-model="liveTitle" class="title-input" placeholder="输入直播主题（如：心血管健康科普）" maxlength="30" />
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
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
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

// 直播状态
const isLiving = ref(false)
const liveTitle = ref('')
const devicePosition = ref('user') // user 前置, environment 后置
const streamData = ref({ action: '', position: 'user', _ts: 0 }) // 用于触发renderjs
const hasMultipleCameras = ref(true) // 移动端默认有前后摄像头

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
let likeTimer = null

// 格式化直播时长
//将传入的总秒数比如3661秒 格式化为HH:MM:SS 或 MM:SS格式的字符串
//用整除和取模运算拆分出小时、分钟、秒
const formatLiveTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const ensureMediaPermissions = async () => {
  // #ifndef APP-PLUS
  return true
  // #endif

  // #ifdef APP-PLUS
  if (typeof plus === 'undefined' || !plus.android || typeof plus.android.requestPermissions !== 'function') {
    return true
  }

  return new Promise((resolve, reject) => {
    const permissions = ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO']
    plus.android.requestPermissions(
      permissions,
      (result) => {
        const deniedAlways = result?.deniedAlways || []
        const deniedPresent = result?.deniedPresent || []
        if (deniedAlways.length > 0 || deniedPresent.length > 0) {
          reject(new Error('请在系统设置中授予摄像头和麦克风权限'))
        } else {
          resolve(true)
        }
      },
      (error) => {
        reject(new Error(error?.message || '申请摄像头权限失败'))
      }
    )
  })
  // #endif
}

// 更新直播时长
//通过定时器每秒更新一次直播时长，并调用formatLiveTime格式化后更新到页面变量
const updateLiveTime = () => {
  liveTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - liveStartTime) / 1000)
    liveTime.value = formatLiveTime(elapsed)
  }, 1000)
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
    await ensureMediaPermissions()

    uni.showLoading({
      title: '正在启动直播...',
      mask: true
    })

    liveStartTime = 0 // 重置，用于超时检测
    isLiving.value = true

    // 将所有配置传递给 renderjs，由 renderjs 完成：
    // 1) getUserMedia 获取摄像头
    // 2) 连接信令服务器
    // 3) 创建直播间
    // 4) 管理 PeerConnection
    const roomId = 'room_' + Date.now()
    const doctorId = 'doctor_' + Date.now()

    streamData.value = {
      action: 'start',
      position: devicePosition.value,
      roomId,
      doctorId,
      doctorName: doctorInfo.value.name,
      title: liveTitle.value,
      signalServer: signalServerUrl,
      iceServers,
      _ts: Date.now()
    }

    console.log('⏳ 已发送启动指令给 renderjs，等待回调...')
    console.log('📡 信令服务器:', signalServerUrl)

    // 安全超时：15秒后如果 loading 还在，强制关闭
    setTimeout(() => {
      if (isLiving.value && liveStartTime === 0) {
        console.warn('⚠️ 15秒超时：直播启动流程未完成')
        uni.hideLoading()
        uni.showModal({
          title: '启动超时',
          content: '直播启动超时，请检查：\n1. 摄像头权限是否已授予\n2. 后端服务是否已启动\n3. 网络是否可达\n\n信令地址: ' + signalServerUrl,
          showCancel: true,
          cancelText: '取消',
          confirmText: '重试',
          success: (res) => {
            isLiving.value = false
            streamData.value = { action: 'stop', _ts: Date.now() }
            if (res.confirm) {
              startLive()
            }
          }
        })
      }
    }, 15000)

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
        // 通知 renderjs 停止（会关闭 WebSocket、PeerConnection、摄像头）
        streamData.value = { action: 'stop', _ts: Date.now() }

        isLiving.value = false

        // 清除定时器
        if (liveTimer) clearInterval(liveTimer)
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
const switchCamera = () => {
  if (!isLiving.value || !hasMultipleCameras.value) return
  devicePosition.value = devicePosition.value === 'user' ? 'environment' : 'user'
  streamData.value = { action: 'switch', position: devicePosition.value, _ts: Date.now() }
  uni.showToast({ title: '摄像头已切换', icon: 'none' })
}

// ===== renderjs 回调方法（通过 ownerInstance.callMethod 调用） =====

// renderjs 通知：摄像头流已就绪
const onRenderStreamReady = () => {
  console.log('✅ renderjs: 摄像头流已就绪')
}

// renderjs 通知：直播间已创建
const onRenderRoomCreated = (data) => {
  const info = typeof data === 'string' ? JSON.parse(data) : data
  console.log('✅ 直播间创建成功:', info.roomId)
  uni.hideLoading()
  uni.showToast({ title: '直播已开始', icon: 'success' })
  liveStartTime = Date.now()
  updateLiveTime()
  startReceiveLikes()
}

// renderjs 通知：观众加入
const onRenderViewerJoined = (data) => {
  const info = typeof data === 'string' ? JSON.parse(data) : data
  console.log('👤 观众加入:', info.viewerName)
  viewerCount.value = info.viewerCount || 0
  messages.value.push({
    id: messageId++,
    type: 'system',
    content: `${info.viewerName} 加入了直播间`
  })
}

// renderjs 通知：观众离开
const onRenderViewerLeft = (data) => {
  const info = typeof data === 'string' ? JSON.parse(data) : data
  console.log('👋 观众离开:', info.viewerName)
  viewerCount.value = info.viewerCount || 0
  messages.value.push({
    id: messageId++,
    type: 'system',
    content: `${info.viewerName} 离开了直播间`
  })
}

// renderjs 通知：收到聊天消息
const onRenderChatMessage = (data) => {
  const info = typeof data === 'string' ? JSON.parse(data) : data
  messages.value.push({
    id: messageId++,
    username: info.senderName,
    content: info.message,
    timestamp: info.timestamp
  })
}

// renderjs 通知：发生错误
const onRenderError = (data) => {
  const msg = typeof data === 'string' ? data : (data?.message || '直播出错')
  console.error('❌ renderjs 错误:', msg)
  uni.hideLoading()
  uni.showModal({
    title: '直播错误',
    content: msg,
    showCancel: false,
    success: () => {
      if (isLiving.value) {
        isLiving.value = false
        streamData.value = { action: 'stop', _ts: Date.now() }
      }
    }
  })
}

// renderjs 通知：摄像头访问失败
const onRenderCameraError = (data) => {
  const msg = typeof data === 'string' ? data : (data?.message || '摄像头访问失败')
  console.error('❌ 摄像头错误:', msg)
  uni.hideLoading()
  isLiving.value = false
  uni.showModal({
    title: '无法启动摄像头',
    content: msg,
    showCancel: false
  })
}

// 暴露回调方法给 renderjs 的 ownerInstance.callMethod
defineExpose({
  onRenderStreamReady,
  onRenderRoomCreated,
  onRenderViewerJoined,
  onRenderViewerLeft,
  onRenderChatMessage,
  onRenderError,
  onRenderCameraError
})

// 手动挂载到组件实例上，确保 renderjs callMethod 能找到
const inst = getCurrentInstance()
if (inst) {
  const bindTarget = inst.proxy || inst
  // @ts-ignore
  bindTarget.onRenderStreamReady = onRenderStreamReady
  // @ts-ignore
  bindTarget.onRenderRoomCreated = onRenderRoomCreated
  // @ts-ignore
  bindTarget.onRenderViewerJoined = onRenderViewerJoined
  // @ts-ignore
  bindTarget.onRenderViewerLeft = onRenderViewerLeft
  // @ts-ignore
  bindTarget.onRenderChatMessage = onRenderChatMessage
  // @ts-ignore
  bindTarget.onRenderError = onRenderError
  // @ts-ignore
  bindTarget.onRenderCameraError = onRenderCameraError
  console.log('✅ 回调方法已挂载到组件实例')
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
  console.log('直播页面已加载, 信令地址:', signalServerUrl)

  // 备用通信：监听 renderjs 通过 uni.$emit 发来的事件
  uni.$on('render-onRenderStreamReady', onRenderStreamReady)
  uni.$on('render-onRenderRoomCreated', onRenderRoomCreated)
  uni.$on('render-onRenderViewerJoined', onRenderViewerJoined)
  uni.$on('render-onRenderViewerLeft', onRenderViewerLeft)
  uni.$on('render-onRenderChatMessage', onRenderChatMessage)
  uni.$on('render-onRenderError', onRenderError)
  uni.$on('render-onRenderCameraError', onRenderCameraError)
})

onUnmounted(() => {
  // 移除事件监听
  uni.$off('render-onRenderStreamReady')
  uni.$off('render-onRenderRoomCreated')
  uni.$off('render-onRenderViewerJoined')
  uni.$off('render-onRenderViewerLeft')
  uni.$off('render-onRenderChatMessage')
  uni.$off('render-onRenderError')
  uni.$off('render-onRenderCameraError')

  // 通知 renderjs 停止所有资源
  streamData.value = { action: 'stop', _ts: Date.now() }

  // 清除定时器
  if (liveTimer) clearInterval(liveTimer)
  if (likeTimer) clearInterval(likeTimer)
})
</script>

<script module="renderScript" lang="renderjs">
// ===== renderjs：所有 WebRTC 逻辑在视图层执行 =====
// MediaStream 不离开此层，避免 APP-PLUS 序列化失败
let mediaStream = null
let videoElement = null
let ws = null
let peerConnections = {}
let localStream = null
let currentRoomId = ''
let currentDoctorId = ''
let currentDoctorName = ''
let iceServersConfig = []
let ownerInst = null

export default {
  mounted() {
    console.log('renderjs mounted')
  },
  methods: {
    // ===== 入口：逻辑层通过 prop 变化触发 =====
    async updateStream(newValue, oldValue, ownerInstance, instance) {
      if (!newValue || !newValue.action) return
      ownerInst = ownerInstance
      const action = newValue.action
      console.log('renderjs updateStream:', action)

      if (action === 'start') {
        await this.startLive(newValue)
      } else if (action === 'switch') {
        await this.switchCamera(newValue.position)
      } else if (action === 'stop') {
        this.stopLive()
      }
    },

    // ===== 启动直播：摄像头 + 信令 + 创建房间 =====
    async startLive(config) {
      try {
        console.log('🎬 renderjs: 启动直播流程...')

        // 保存配置
        currentRoomId = config.roomId
        currentDoctorId = config.doctorId
        currentDoctorName = config.doctorName
        iceServersConfig = config.iceServers || []

        // 1) 获取摄像头
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          this.callOwner('onRenderCameraError', '当前平台不支持摄像头采集')
          return
        }

        console.log('📸 请求摄像头权限...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: config.position || 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        })

        mediaStream = stream
        localStream = stream
        console.log('✅ 摄像头流已获取, 视频轨道:', stream.getVideoTracks().length, '音频轨道:', stream.getAudioTracks().length)

        // 通知逻辑层
        this.callOwner('onRenderStreamReady')

        // 2) 显示本地预览
        this.showLocalPreview(stream)

        // 3) 连接信令服务器
        await this.connectSignalServer(config.signalServer)

        // 4) 创建直播间
        this.sendSignal({
          type: 'create-room',
          roomId: config.roomId,
          doctorId: config.doctorId,
          doctorName: config.doctorName,
          title: config.title
        })
        console.log('� 已发送创建直播间请求:', config.roomId)

      } catch (error) {
        console.error('❌ 启动直播失败:', error)
        var errMsg = (error && error.message) ? error.message + '，请确认摄像头未被占用并已授予权限' : '摄像头访问失败'
        this.callOwner('onRenderCameraError', errMsg)
      }
    },

    // ===== 本地视频预览 =====
    showLocalPreview(stream) {
      const wrapper = document.getElementById('videoWrapper')
      if (!wrapper) {
        console.error('❌ 找不到 videoWrapper')
        return
      }

      wrapper.innerHTML = ''
      videoElement = document.createElement('video')
      videoElement.setAttribute('autoplay', 'true')
      videoElement.setAttribute('playsinline', 'true')
      videoElement.setAttribute('muted', 'true')
      videoElement.muted = true
      videoElement.style.width = '100%'
      videoElement.style.height = '100%'
      videoElement.style.objectFit = 'cover'
      videoElement.style.transform = 'scaleX(-1)'
      videoElement.style.background = '#000'

      wrapper.appendChild(videoElement)
      videoElement.srcObject = stream

      setTimeout(function () {
        if (videoElement) {
          videoElement.play().then(function () {
            console.log('✅ 本地预览已显示')
          }).catch(function (err) {
            console.error('❌ 播放失败:', err)
          })
        }
      }, 100)
    },

    // ===== WebSocket 信令连接 =====
    connectSignalServer(signalServer) {
      var self = this
      return new Promise(function (resolve, reject) {
        try {
          if (ws) {
            ws.close()
            ws = null
          }
          console.log('� 连接信令服务器:', signalServer)
          ws = new WebSocket(signalServer)

          ws.onopen = function () {
            console.log('✅ 信令服务器连接成功')
            setTimeout(function () { resolve() }, 100)
          }

          ws.onerror = function (error) {
            console.error('❌ 信令服务器连接失败:', error)
            reject(new Error('信令服务器连接失败，请检查网络'))
          }

          ws.onmessage = function (event) {
            try {
              self.handleSignalMessage(JSON.parse(event.data))
            } catch (e) {
              console.error('解析信令消息失败:', e)
            }
          }

          ws.onclose = function (event) {
            console.log('信令服务器连接已关闭, code:', event.code)
          }
        } catch (error) {
          reject(error)
        }
      })
    },

    // ===== 发送信令消息 =====
    sendSignal(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      } else {
        console.error('WebSocket 未就绪，无法发送:', data.type)
      }
    },

    // ===== 处理信令消息 =====
    handleSignalMessage(data) {
      console.log('收到信令消息:', data.type)

      switch (data.type) {
        case 'room-created':
          console.log('✅ 直播间创建成功:', data.roomId)
          this.callOwner('onRenderRoomCreated', JSON.stringify({ roomId: data.roomId }))
          break

        case 'viewer-joined':
          console.log('👤 观众加入:', data.viewerName)
          this.handleViewerJoined(data.viewerId, data.viewerName)
          this.callOwner('onRenderViewerJoined', JSON.stringify({
            viewerId: data.viewerId,
            viewerName: data.viewerName,
            viewerCount: data.viewerCount
          }))
          break

        case 'viewer-left':
          console.log('� 观众离开:', data.viewerName)
          this.closePeerConnection(data.viewerId)
          this.callOwner('onRenderViewerLeft', JSON.stringify({
            viewerId: data.viewerId,
            viewerName: data.viewerName,
            viewerCount: data.viewerCount
          }))
          break

        case 'answer':
          this.handleAnswer(data.viewerId, data.answer)
          break

        case 'ice-candidate':
          this.handleIceCandidate(data.viewerId, data.candidate)
          break

        case 'chat-message':
          this.callOwner('onRenderChatMessage', JSON.stringify({
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            timestamp: data.timestamp
          }))
          break

        case 'error':
          console.error('信令错误:', data.message)
          this.callOwner('onRenderError', data.message)
          break
      }
    },

    // ===== PeerConnection：为观众创建连接并推流 =====
    async handleViewerJoined(viewerId, viewerName) {
      try {
        if (!localStream) {
          console.error('本地流不存在，无法为观众创建连接')
          return
        }

        var pc = new RTCPeerConnection({ iceServers: iceServersConfig })

        // 添加本地音视频轨道
        localStream.getTracks().forEach(function (track) {
          console.log('添加轨道:', track.kind, 'enabled:', track.enabled)
          pc.addTrack(track, localStream)
        })

        // ICE 候选
        var self = this
        pc.onicecandidate = function (event) {
          if (event.candidate) {
            self.sendSignal({
              type: 'ice-candidate',
              roomId: currentRoomId,
              targetId: viewerId,
              candidate: event.candidate
            })
          }
        }

        // 连接状态监听
        pc.onconnectionstatechange = function () {
          console.log('连接状态 [' + viewerId + ']:', pc.connectionState)
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            self.closePeerConnection(viewerId)
          }
        }

        // 创建 Offer
        var offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        })
        await pc.setLocalDescription(offer)

        // 发送 Offer
        this.sendSignal({
          type: 'offer',
          roomId: currentRoomId,
          viewerId: viewerId,
          offer: pc.localDescription
        })

        peerConnections[viewerId] = pc
        console.log('✅ 为观众 ' + viewerId + ' 创建了 PeerConnection')
      } catch (error) {
        console.error('处理观众加入失败:', error)
      }
    },

    // ===== 处理 Answer =====
    async handleAnswer(viewerId, answer) {
      var pc = peerConnections[viewerId]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
          console.log('设置 Answer 成功 [' + viewerId + ']')
        } catch (error) {
          console.error('设置 Answer 失败:', error)
        }
      }
    },

    // ===== 处理 ICE Candidate =====
    async handleIceCandidate(viewerId, candidate) {
      var pc = peerConnections[viewerId]
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('添加 ICE Candidate 失败:', error)
        }
      }
    },

    // ===== 关闭单个 PeerConnection =====
    closePeerConnection(viewerId) {
      var pc = peerConnections[viewerId]
      if (pc) {
        pc.close()
        delete peerConnections[viewerId]
        console.log('🔌 关闭了与观众 ' + viewerId + ' 的连接')
      }
    },

    // ===== 切换摄像头 =====
    async switchCamera(position) {
      if (mediaStream) {
        mediaStream.getTracks().forEach(function (track) { track.stop() })
      }

      try {
        var stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: position, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        })

        mediaStream = stream
        localStream = stream

        // 更新预览
        if (videoElement) {
          videoElement.srcObject = stream
        }

        // 替换所有 PeerConnection 中的轨道
        var viewerIds = Object.keys(peerConnections)
        for (var i = 0; i < viewerIds.length; i++) {
          var pc = peerConnections[viewerIds[i]]
          var senders = pc.getSenders()
          var tracks = stream.getTracks()
          for (var j = 0; j < tracks.length; j++) {
            for (var k = 0; k < senders.length; k++) {
              if (senders[k].track && senders[k].track.kind === tracks[j].kind) {
                senders[k].replaceTrack(tracks[j])
              }
            }
          }
        }

        console.log('✅ 摄像头已切换到:', position)
      } catch (error) {
        console.error('切换摄像头失败:', error)
      }
    },

    // ===== 停止直播：清理所有资源 =====
    stopLive() {
      // 关闭直播间
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'close-room', roomId: currentRoomId }))
        } catch (e) { /* ignore */ }
      }

      // 关闭所有 PeerConnection
      var viewerIds = Object.keys(peerConnections)
      for (var i = 0; i < viewerIds.length; i++) {
        try { peerConnections[viewerIds[i]].close() } catch (e) { /* ignore */ }
      }
      peerConnections = {}

      // 关闭 WebSocket
      if (ws) {
        try { ws.close() } catch (e) { /* ignore */ }
        ws = null
      }

      // 停止摄像头
      if (mediaStream) {
        mediaStream.getTracks().forEach(function (track) { track.stop() })
        mediaStream = null
        localStream = null
      }

      // 清理视频元素
      if (videoElement) {
        videoElement.srcObject = null
        videoElement = null
      }
      var wrapper = document.getElementById('videoWrapper')
      if (wrapper) {
        wrapper.innerHTML = ''
      }

      currentRoomId = ''
      currentDoctorId = ''
      currentDoctorName = ''
      console.log('🔴 直播已停止，所有资源已清理')
    },

    // ===== 安全地调用逻辑层方法 =====
    callOwner(methodName, data) {
      console.log('📤 callOwner:', methodName)
      var called = false

      // 方法1: ownerInstance.callMethod
      if (ownerInst && typeof ownerInst.callMethod === 'function') {
        try {
          ownerInst.callMethod(methodName, data)
          called = true
          console.log('✅ callMethod 成功:', methodName)
        } catch (e) {
          console.error('❌ callMethod(' + methodName + ') 失败:', e)
        }
      }

      // 方法2: uni.$emit 事件作为备用（确保逻辑层能收到）
      if (typeof uni !== 'undefined' && typeof uni.$emit === 'function') {
        try {
          uni.$emit('render-' + methodName, data)
          if (!called) {
            console.log('✅ uni.$emit 备用成功:', 'render-' + methodName)
          }
        } catch (e) {
          console.error('❌ uni.$emit 失败:', e)
        }
      }

      if (!called) {
        console.warn('⚠️ ownerInstance 不可用，仅通过 uni.$emit 通知:', methodName)
      }
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

  >* {
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

  0%,
  100% {
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
