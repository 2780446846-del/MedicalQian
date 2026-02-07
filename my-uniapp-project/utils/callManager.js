/**
 * WebRTC 通话管理模块（患者端）
 * 支持语音和视频通话
 */

import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  sendCallOffer,
  sendCallAnswer,
  sendIceCandidate,
  onCallStatusChange
} from './socket.js'

// ICE 配置
// - 仅内网 host candidate 在“Wi-Fi 客户端隔离/不同网段/防火墙拦 UDP”时容易失败
// - 添加 STUN 不影响局域网直连，但能提升成功率
// - 若仍失败（如企业网/对称 NAT），需要部署 TURN（如 coturn）
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

class CallManager {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.currentCallId = null
    this.currentCallType = null
    this.isCaller = false
    this.callStatusChangeHandler = null
    this.localVideoElement = null
    this.remoteVideoElement = null
    this.remoteAudioElement = null
    this.currentToUserId = null
    this.pendingOffer = null
    this.pendingIceCandidates = []
    this.onEndedByRemote = null
    this.fallbackAudioElement = null
  }

  /**
   * 安全播放媒体（避免 AbortError 噪音）
   */
  async safePlay(mediaEl, label = '') {
    if (!mediaEl || typeof mediaEl.play !== 'function') return
    try {
      // 某些情况下 srcObject 切换会导致上一次 play 被中断，属于可忽略错误
      await mediaEl.play()
    } catch (err) {
      const name = err && (err.name || err.constructor?.name)
      if (name === 'AbortError') {
        console.warn(`⚠️ [患者端]${label} play 被新加载打断(AbortError)，已忽略`)
        return
      }
      throw err
    }
  }

  /**
   * 设置对方挂断时的回调
   */
  setOnEndedByRemote(callback) {
    this.onEndedByRemote = callback
  }

  /**
   * 初始化通话管理器（可重复调用，如 socket 重连后）
   */
  init() {
    if (this.callStatusChangeHandler) {
      this.callStatusChangeHandler()
      this.callStatusChangeHandler = null
    }
    this.callStatusChangeHandler = onCallStatusChange((data) => {
      this.handleCallStatusChange(data)
    })
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.callStatusChangeHandler) {
      this.callStatusChangeHandler()
      this.callStatusChangeHandler = null
    }
    this.endCall()
  }

  /**
   * 创建或获取远程音频元素（兜底方案）
   */
  ensureRemoteAudioElement() {
    // #ifdef H5
    if (this.remoteAudioElement) {
      return this.remoteAudioElement
    }

    if (typeof document === 'undefined') {
      return null
    }

    // 如果外部没有传入，创建一个隐藏的 audio 元素
    if (!this.fallbackAudioElement) {
      const audio = document.createElement('audio')
      audio.style.position = 'fixed'
      audio.style.bottom = '0'
      audio.style.left = '0'
      audio.style.width = '0'
      audio.style.height = '0'
      audio.style.opacity = '0'
      audio.setAttribute('playsinline', 'true')
      audio.autoplay = true
      document.body.appendChild(audio)
      this.fallbackAudioElement = audio
      console.log('✅ [患者端]已创建兜底 audio 元素用于播放远程音频')
    }

    return this.fallbackAudioElement
    // #endif

    // #ifndef H5
    return null
    // #endif
  }

  /**
   * 获取用户媒体流（H5环境）
   */
  async getUserMedia(constraints) {
    // #ifdef H5
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia(constraints)
    }

    // 降级到旧版 API
    return new Promise((resolve, reject) => {
      const getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia

      if (!getUserMedia) {
        reject(new Error('当前浏览器不支持摄像头/麦克风访问'))
        return
      }

      getUserMedia.call(navigator, constraints, resolve, reject)
    })
    // #endif

    // #ifndef H5
    throw new Error('当前环境不支持实时媒体流获取，请在浏览器中打开使用')
    // #endif
  }

  /**
   * 发起通话
   */
  async startCall(toUserId, callType = 'video', localVideo = null, remoteVideo = null, remoteAudio = null) {
    try {
      // #ifdef H5
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.remoteAudioElement = remoteAudio
      this.currentCallType = callType
      this.isCaller = true
      this.currentToUserId = toUserId

      console.log('📞 [患者端-发起方]开始发起通话:', { toUserId, callType })

      // 获取本地媒体流
      this.localStream = await this.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      console.log('✅ [患者端-发起方]本地媒体流获取成功:', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        let localVideoEl = this.localVideoElement
        if (localVideoEl && typeof localVideoEl === 'object') {
          if (localVideoEl.$el) {
            localVideoEl = localVideoEl.$el
          }
          if (localVideoEl && localVideoEl.tagName !== 'VIDEO') {
            localVideoEl = localVideoEl.querySelector('video') || localVideoEl
          }
        }

        if (localVideoEl && localVideoEl.tagName === 'VIDEO') {
          localVideoEl.srcObject = this.localStream
          localVideoEl.muted = true
          localVideoEl.autoplay = true
          localVideoEl.playsInline = true
          localVideoEl.play().catch(err => {
            console.warn('⚠️ [患者端-发起方]播放本地视频失败:', err)
          })
        }
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流到 peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // 设置事件监听
      this.setupPeerConnectionEvents()

      // 处理 pending 的 ICE 候选
      await this.processPendingIceCandidates('发起方')

      // 发起通话信令
      const callData = await initiateCall(toUserId, callType, {
        name: '用户'
      })

      this.currentCallId = callData.callId

      // 创建并发送 offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      sendCallOffer(this.currentCallId, offer, toUserId)

      console.log('✅ [患者端-发起方]已发送 offer')

      return callData
      // #endif

      // #ifndef H5
      throw new Error('当前环境不支持通话功能，请在浏览器中打开使用')
      // #endif
    } catch (error) {
      console.error('❌ [患者端-发起方]发起通话失败:', error)
      this.cleanupMedia()
      throw error
    }
  }

  /**
   * 接听来电
   */
  async answerCall(callId, fromUserId, callType, localVideo = null, remoteVideo = null, remoteAudio = null) {
    try {
      // #ifdef H5
      this.currentCallId = callId
      this.currentCallType = callType
      this.isCaller = false
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.remoteAudioElement = remoteAudio
      this.currentToUserId = fromUserId

      console.log('📞 [患者端-接听方]开始接听通话:', { callId, fromUserId, callType })

      // 获取本地媒体流
      this.localStream = await this.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      console.log('✅ [患者端-接听方]本地媒体流获取成功:', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        let localVideoEl = this.localVideoElement
        if (localVideoEl && typeof localVideoEl === 'object') {
          if (localVideoEl.$el) {
            localVideoEl = localVideoEl.$el
          }
          if (localVideoEl && localVideoEl.tagName !== 'VIDEO') {
            localVideoEl = localVideoEl.querySelector('video') || localVideoEl
          }
        }

        if (localVideoEl && localVideoEl.tagName === 'VIDEO') {
          localVideoEl.srcObject = this.localStream
          localVideoEl.muted = true
          localVideoEl.autoplay = true
          localVideoEl.playsInline = true
          localVideoEl.play().catch(err => {
            console.warn('⚠️ [患者端-接听方]播放本地视频失败:', err)
          })
        }
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // 设置事件监听
      this.setupPeerConnectionEvents()

      // 处理 pending 的 ICE 候选
      await this.processPendingIceCandidates('接听方')

      // 接听通话
      acceptCall(callId)

      // 如果之前收到了pending的offer，现在处理它
      if (this.pendingOffer) {
        console.log('✅ [患者端-接听方]处理pending的offer', { 
          callId: this.currentCallId, 
          fromUserId: this.pendingOffer.fromUserId 
        })
        const { offer, fromUserId } = this.pendingOffer
        this.pendingOffer = null
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          console.log('✅ [患者端-接听方]已设置远程描述(offer)')
          // remoteDescription 就绪后再 flush ICE（避免候选先到导致的 pending 堆积）
          await this.processPendingIceCandidates('接听方')
          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          sendCallAnswer(this.currentCallId, answer, fromUserId)
          console.log('✅ [患者端-接听方]已发送answer', { callId: this.currentCallId, toUserId: fromUserId })
        } catch (error) {
          console.error('❌ [患者端-接听方]处理pending offer失败:', error)
        }
      } else {
        console.log('ℹ️ [患者端-接听方]没有pending的offer，等待offer到达')
        console.log('ℹ️ [患者端-接听方]offer 到达后将自动处理，请确保医生端已发送 offer 且信令通道正常')
      }
      // #endif

      // #ifndef H5
      throw new Error('当前环境不支持通话功能，请在浏览器中打开使用')
      // #endif
    } catch (error) {
      console.error('❌ [患者端-接听方]接听通话失败:', error)
      this.cleanupMedia()
      rejectCall(callId)
      throw error
    }
  }

  /**
   * 设置 RTCPeerConnection 事件监听
   */
  setupPeerConnectionEvents() {
    if (!this.peerConnection) return

    const role = this.isCaller ? '发起方' : '接听方'

    // 监听远程流
    this.peerConnection.ontrack = (event) => {
      console.log(`✅ [患者端-${role}]收到远程流`, event)

      if (event.streams && event.streams.length > 0 && event.streams[0]) {
        this.remoteStream = event.streams[0]
        console.log(`📹 [患者端-${role}]远程流轨道详情:`, {
          videoTracks: this.remoteStream ? this.remoteStream.getVideoTracks().length : 0,
          audioTracks: this.remoteStream ? this.remoteStream.getAudioTracks().length : 0
        })

        // 立即设置远程流
        setTimeout(() => {
          this.setRemoteStream()
        }, 100)
      }
    }

    // 监听 ICE 候选
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId && this.currentToUserId) {
        console.log(`📡 [患者端-${role}]发送ICE候选:`, event.candidate)
        sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
      } else if (!event.candidate) {
        console.log(`📡 [患者端-${role}]ICE候选收集完成`)
      } else {
        console.warn(`⚠️ [患者端-${role}]ICE候选未发送:`, {
          hasCandidate: !!event.candidate,
          hasCallId: !!this.currentCallId,
          hasToUserId: !!this.currentToUserId
        })
      }
    }

    // 监听连接状态
    this.peerConnection.onconnectionstatechange = () => {
      const connState = this.peerConnection.connectionState
      console.log(`📡 [患者端-${role}]WebRTC连接状态:`, connState)

      if (connState === 'connected') {
        console.log(`✅ [患者端-${role}]WebRTC 连接已建立`)
        setTimeout(() => {
          this.checkAndSetRemoteStream()
        }, 500)
      } else if (connState === 'failed') {
        console.error(`❌ [患者端-${role}]WebRTC 连接失败`)
      }
    }

    // 监听 ICE 连接状态
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection.iceConnectionState
      console.log(`🔗 [患者端-${role}]ICE连接状态:`, iceState)

      if (iceState === 'connected' || iceState === 'completed') {
        console.log(`✅ [患者端-${role}]ICE连接已建立`)
        setTimeout(() => {
          this.checkAndSetRemoteStream()
        }, 300)
      } else if (iceState === 'failed') {
        console.error(`❌ [患者端-${role}]ICE连接失败，尝试重启ICE`)
        this.peerConnection.restartIce()
      }
    }
  }

  /**
   * 处理通话状态变化
   */
  handleCallStatusChange(data) {
    const { type, callId, offer, answer, candidate, fromUserId, toUserId } = data

    console.log('📡 [患者端]收到通话信令:', data)

    // 如果已经有当前通话ID且与收到的不一致，忽略（避免串线）
    if (this.currentCallId && callId && callId !== this.currentCallId) {
      console.warn('⚠️ [患者端]收到与当前通话ID不匹配的信令，已忽略', {
        currentCallId: this.currentCallId,
        incomingCallId: callId,
        type
      })
      return
    }

    // 如果当前还没有通话ID，而信令里带了 callId，则绑定一下
    if (!this.currentCallId && callId) {
      this.currentCallId = callId
    }

    switch (type) {
      case 'offer':
        this.handleOffer(offer, fromUserId || toUserId)
        break
      case 'answer':
        this.handleAnswer(answer)
        break
      case 'ice-candidate':
        this.handleIceCandidate(candidate)
        break
      case 'rejected':
      case 'ended':
        if (type === 'ended' && this.onEndedByRemote) {
          this.onEndedByRemote()
        }
        this.endCall()
        break
    }
  }

  /**
   * 处理收到的 offer
   */
  async handleOffer(offer, fromUserId) {
    console.log('📞 [患者端]收到offer', { offer: !!offer, fromUserId, currentCallId: this.currentCallId, hasPeerConnection: !!this.peerConnection })

    if (!this.peerConnection) {
      console.warn('⚠️ [患者端]收到offer但peerConnection未创建，保存为pending')
      this.pendingOffer = { offer, fromUserId }
      return
    }

    if (!offer || !offer.type || !offer.sdp) {
      console.error('❌ [患者端]收到的 offer 格式无效', { type: offer?.type, hasSdp: !!offer?.sdp })
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('✅ [患者端]已设置远程描述(offer)')
      // remoteDescription 就绪后再 flush ICE
      await this.processPendingIceCandidates(this.isCaller ? '发起方' : '接听方')
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      if (!this.currentCallId) {
        console.error('❌ [患者端]处理offer时currentCallId为空，无法发送answer')
        return
      }
      if (!fromUserId) {
        console.error('❌ [患者端]处理offer时fromUserId为空，无法发送answer')
        return
      }
      sendCallAnswer(this.currentCallId, answer, fromUserId)
      console.log('✅ [患者端]已发送answer', { callId: this.currentCallId, toUserId: fromUserId })
      console.log('✅ [患者端]offer 已处理（接听后到达，信令正常）')
    } catch (error) {
      console.error('❌ [患者端]处理 offer 失败:', error)
    }
  }

  /**
   * 处理收到的 answer
   */
  async handleAnswer(answer) {
    console.log('📞 [患者端]收到answer', { answer, currentCallId: this.currentCallId, hasPeerConnection: !!this.peerConnection })
    
    if (!this.peerConnection) {
      console.warn('⚠️ [患者端]收到answer但peerConnection未创建')
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ [患者端]已设置远程描述(answer)')
      // remoteDescription 就绪后再 flush ICE
      await this.processPendingIceCandidates(this.isCaller ? '发起方' : '接听方')
      setTimeout(() => {
        this.checkAndSetRemoteStream()
      }, 300)
    } catch (error) {
      console.error('❌ [患者端]处理 answer 失败:', error)
    }
  }

  /**
   * 处理收到的 ICE 候选
   */
  async handleIceCandidate(candidate) {
    console.log('📡 [患者端]收到ICE候选', { 
      candidate, 
      hasPeerConnection: !!this.peerConnection,
      hasRemoteDescription: !!this.peerConnection?.remoteDescription,
      pendingCount: this.pendingIceCandidates.length
    })
    
    if (!this.peerConnection) {
      console.log('ℹ️ [患者端]收到ICE候选但peerConnection未创建，保存为pending（这是正常的，等待接听时创建）')
      this.pendingIceCandidates.push(candidate)
      return
    }

    // 关键：remoteDescription 未设置前 addIceCandidate 会抛 InvalidStateError
    // 这是正常的时序问题：医生端发起通话后立即发送 ICE 候选，但患者端接听并设置 remoteDescription 需要时间
    if (!this.peerConnection.remoteDescription) {
      console.log('ℹ️ [患者端]remoteDescription 未就绪，ICE候选先进入pending队列（将在设置remoteDescription后处理）')
      this.pendingIceCandidates.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('✅ [患者端]已添加ICE候选')
    } catch (error) {
      console.error('❌ [患者端]添加 ICE 候选失败:', error)
      // 如果添加失败，也保存为 pending，可能在后续重试
      this.pendingIceCandidates.push(candidate)
    }
  }

  /**
   * 处理 pending 的 ICE 候选
   */
  async processPendingIceCandidates(role) {
    // #ifdef H5
    if (this.pendingIceCandidates.length > 0 && this.peerConnection) {
      if (!this.peerConnection.remoteDescription) {
        console.log(`⏳ [患者端-${role}]remoteDescription 未就绪，延后处理pending ICE（当前${this.pendingIceCandidates.length}个）`)
        return
      }
      console.log(`✅ [患者端-${role}]开始处理${this.pendingIceCandidates.length}个pending的ICE候选`)
      const candidates = [...this.pendingIceCandidates]
      this.pendingIceCandidates = []
      
      let successCount = 0
      let failCount = 0
      for (const candidate of candidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          successCount++
        } catch (error) {
          console.error('❌ [患者端]添加pending ICE候选失败:', error)
          failCount++
          // 如果添加失败，不再重新加入 pending，避免无限循环
        }
      }
      console.log(`✅ [患者端-${role}]处理pending ICE候选完成: 成功${successCount}个，失败${failCount}个`)
    } else if (this.pendingIceCandidates.length > 0 && !this.peerConnection) {
      console.log(`⏳ [患者端-${role}]peerConnection未创建，等待创建后再处理pending ICE（当前${this.pendingIceCandidates.length}个）`)
    }
    // #endif
  }

  /**
   * 检查并设置远程流
   */
  checkAndSetRemoteStream() {
    // #ifdef H5
    if (!this.peerConnection) {
      return
    }

    // 如果还没有远程流，尝试从peerConnection中获取
    if (!this.remoteStream) {
      const receivers = this.peerConnection.getReceivers()
      const allTracks = receivers
        .map(receiver => receiver.track)
        .filter(track => track !== null)

      const videoTracks = allTracks.filter(track => track.kind === 'video')
      const audioTracks = allTracks.filter(track => track.kind === 'audio')

      if (videoTracks.length > 0 || audioTracks.length > 0) {
        this.remoteStream = new MediaStream([...videoTracks, ...audioTracks])
        console.log('📹 [患者端]从peerConnection获取远程流:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length
        })
        setTimeout(() => {
          this.setRemoteStream()
        }, 200)
      }
    } else {
      this.setRemoteStream()
    }
    // #endif
  }

  /**
   * 设置远程流到媒体元素
   */
  setRemoteStream() {
    // #ifdef H5
    if (!this.remoteStream) {
      return
    }

    const videoTracks = this.remoteStream.getVideoTracks().length
    const audioTracks = this.remoteStream.getAudioTracks().length

    console.log('📹 [患者端]设置远程流:', { videoTracks, audioTracks })

    // 语音通话：使用 audio 元素播放
    if (videoTracks === 0 && audioTracks > 0) {
      const audioEl = this.ensureRemoteAudioElement()
      if (audioEl) {
        try { audioEl.pause?.() } catch (e) {}
        audioEl.srcObject = this.remoteStream
        audioEl.muted = false
        audioEl.volume = 1
        audioEl.autoplay = true
        this.safePlay(audioEl, '远程音频').then(() => {
          console.log('✅ [患者端]语音通话：远程音频播放成功')
        }).catch(err => {
          console.warn('⚠️ [患者端]远程音频播放失败（可能需用户手势）:', err)
          // 监听用户交互后重试
          const retry = () => {
            this.safePlay(audioEl, '远程音频(重试)').catch(() => {})
            document.removeEventListener('click', retry)
            document.removeEventListener('touchend', retry)
          }
          document.addEventListener('click', retry, { once: true, capture: true })
          document.addEventListener('touchend', retry, { once: true, capture: true })
        })
      }
      return
    }

    // 视频通话：使用 video 元素播放
    let videoElement = null

    if (this.remoteVideoElement) {
      videoElement = this.remoteVideoElement
      // 处理 Vue ref 的情况
      if (videoElement && typeof videoElement === 'object' && videoElement.$el) {
        videoElement = videoElement.$el
      }
      if (videoElement && videoElement.tagName !== 'VIDEO') {
        videoElement = videoElement.querySelector('video') || null
      }
    }

    if (!videoElement && typeof document !== 'undefined') {
      videoElement = document.querySelector('video.remote-video')
    }

    if (!videoElement || videoElement.tagName !== 'VIDEO') {
      console.warn('⚠️ [患者端]无法找到远程视频元素，延迟重试')
      setTimeout(() => {
        this.setRemoteStream()
      }, 1000)
      return
    }

    videoElement.srcObject = this.remoteStream
    videoElement.autoplay = true
    videoElement.playsInline = true
    videoElement.muted = false
    videoElement.volume = 1

    this.safePlay(videoElement, '远程视频').then(() => {
      console.log('✅ [患者端]远程视频播放成功')
    }).catch(err => {
      console.warn('⚠️ [患者端]远程视频播放失败:', err)
      const retry = () => {
        this.safePlay(videoElement, '远程视频(重试)').catch(() => {})
        document.removeEventListener('click', retry)
        document.removeEventListener('touchend', retry)
      }
      document.addEventListener('click', retry, { once: true, capture: true })
      document.addEventListener('touchend', retry, { once: true, capture: true })
    })
    // #endif
  }

  /**
   * 挂断通话
   */
  endCall() {
    if (this.currentCallId) {
      endCall(this.currentCallId)
    }
    this.cleanupMedia()
  }

  /**
   * 拒绝来电
   */
  rejectCall(callId) {
    rejectCall(callId)
  }

  /**
   * 清理媒体资源
   */
  cleanupMedia() {
    // 停止本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // 停止远程流
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop())
      this.remoteStream = null
    }

    // 清理视频/音频元素
    if (this.localVideoElement) {
      this.localVideoElement.srcObject = null
    }
    if (this.remoteVideoElement) {
      this.remoteVideoElement.srcObject = null
    }
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null
    }

    // 清理兜底 audio 元素
    // #ifdef H5
    if (this.fallbackAudioElement) {
      this.fallbackAudioElement.srcObject = null
      if (this.fallbackAudioElement.parentNode) {
        this.fallbackAudioElement.remove()
      }
      this.fallbackAudioElement = null
    }
    // #endif

    // 关闭 peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.currentCallId = null
    this.currentCallType = null
    this.isCaller = false
    this.currentToUserId = null
    this.pendingOffer = null
    this.pendingIceCandidates = []
  }

  /**
   * 切换摄像头（仅视频通话）
   */
  async switchCamera() {
    if (this.currentCallType !== 'video' || !this.localStream) {
      return
    }

    try {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (!videoTrack) {
        return
      }

      const constraints = videoTrack.getConstraints()
      const facingMode = constraints.facingMode === 'user' ? 'environment' : 'user'
      await videoTrack.applyConstraints({ facingMode })
    } catch (error) {
      console.error('❌ [患者端]切换摄像头失败:', error)
    }
  }

  /**
   * 切换静音
   */
  toggleMute() {
    if (!this.localStream) {
      return false
    }

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return audioTrack.enabled
    }
    return false
  }

  /**
   * 切换摄像头开关（仅视频通话）
   */
  toggleVideo() {
    if (this.currentCallType !== 'video' || !this.localStream) {
      return false
    }

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      return videoTrack.enabled
    }
    return false
  }
}

// 导出单例
let callManagerInstance = null

export function getCallManager() {
  if (!callManagerInstance) {
    callManagerInstance = new CallManager()
    // init() 由 chat 在 socket 连接成功后调用，避免 offer 在监听器注册前到达
  }
  return callManagerInstance
}

export default getCallManager

// 便于在浏览器控制台调试：挂载到 window
// #ifdef H5
if (typeof window !== 'undefined') {
  if (!window.callManager) {
    window.getCallManager = getCallManager
    window.callManager = getCallManager()
    console.log('🛠 调试: 已挂载 window.callManager')
  }
}
// #endif
