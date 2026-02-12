/**
 * WebRTC 通话管理模块（医生端）
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
} from './socket'

// ICE 配置
// - 仅内网 host candidate 在“Wi-Fi 客户端隔离/不同网段/防火墙拦 UDP”时容易失败
// - 添加 STUN 不影响局域网直连，但能提升成功率
// - 若仍失败（如企业网/对称 NAT），需要部署 TURN（如 coturn）
const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

class CallManager {
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private peerConnection: RTCPeerConnection | null = null
  private currentCallId: string | null = null
  private currentCallType: 'audio' | 'video' | null = null
  private isCaller: boolean = false
  private callStatusChangeHandler: (() => void) | null = null
  private localVideoElement: HTMLVideoElement | null = null
  private remoteVideoElement: HTMLVideoElement | null = null
  private remoteAudioElement: HTMLAudioElement | null = null
  private currentToUserId: string | null = null
  private pendingOffer: { offer: RTCSessionDescriptionInit; fromUserId: string } | null = null
  private pendingIceCandidates: RTCIceCandidateInit[] = []
  private onEndedByRemote: (() => void) | null = null
  private fallbackAudioElement: HTMLAudioElement | null = null

  /**
   * 安全播放媒体（避免 AbortError 噪音）
   */
  private async safePlay(mediaEl: HTMLMediaElement | null, label: string) {
    if (!mediaEl) return
    try {
      await mediaEl.play()
    } catch (err: any) {
      const name = err?.name || err?.constructor?.name
      if (name === 'AbortError') {
        console.warn(`⚠️ [医者端]${label} play 被新加载打断(AbortError)，已忽略`)
        return
      }
      throw err
    }
  }

  /**
   * 设置对方挂断时的回调
   */
  setOnEndedByRemote(callback: (() => void) | null) {
    this.onEndedByRemote = callback
  }

  /**
   * 获取当前通话ID
   */
  getCurrentCallId(): string | null {
    return this.currentCallId
  }

  /**
   * 设置当前通话ID（用于处理新来电时提前设置，避免信令被忽略）
   */
  setCurrentCallId(callId: string | null) {
    this.currentCallId = callId
  }

  /**
   * 初始化通话管理器
   */
  init() {
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
  private ensureRemoteAudioElement(): HTMLAudioElement | null {
    // 优先使用传入的 remoteAudioElement，但需要验证它是有效的 AUDIO 元素
    if (this.remoteAudioElement) {
      let audioEl = this.remoteAudioElement
      // 处理 Vue ref 的情况
      if (audioEl && typeof audioEl === 'object' && (audioEl as any).$el) {
        audioEl = (audioEl as any).$el
      }
      if (audioEl && audioEl.tagName === 'AUDIO') {
        return audioEl
      }
    }

    // 尝试从 DOM 查询现有的音频元素
    if (typeof document !== 'undefined') {
      const existingAudio = document.querySelector('audio.remote-audio') as HTMLAudioElement
      if (existingAudio && existingAudio.tagName === 'AUDIO') {
        console.log('✅ [医者端]从 DOM 找到远程音频元素')
        return existingAudio
      }
    }

    if (typeof document === 'undefined') {
      return null
    }

    // 如果外部没有传入，创建一个隐藏的 audio 元素
    if (!this.fallbackAudioElement) {
      const audio = document.createElement('audio')
      audio.className = 'remote-audio-fallback'
      audio.style.position = 'fixed'
      audio.style.bottom = '0'
      audio.style.left = '0'
      audio.style.width = '0'
      audio.style.height = '0'
      audio.style.opacity = '0'
      audio.style.pointerEvents = 'none'
      audio.setAttribute('playsinline', 'true')
      audio.autoplay = true
      audio.muted = false
      audio.volume = 1
      document.body.appendChild(audio)
      this.fallbackAudioElement = audio
      console.log('✅ [医者端]已创建兜底 audio 元素用于播放远程音频')
    }

    return this.fallbackAudioElement
  }

  /**
   * 发起通话
   */
  async startCall(
    toUserId: string,
    callType: 'audio' | 'video' = 'video',
    localVideo: HTMLVideoElement | null = null,
    remoteVideo: HTMLVideoElement | null = null,
    remoteAudio: HTMLAudioElement | null = null
  ): Promise<{ callId: string; toUserId: string; callType: string }> {
    try {
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.remoteAudioElement = remoteAudio
      this.currentCallType = callType
      this.isCaller = true
      this.currentToUserId = toUserId

      console.log('📞 [医者端-发起方]开始发起通话:', { toUserId, callType })

      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })
      console.log(this.localStream)

      console.log('✅ [医者端-发起方]本地媒体流获取成功:', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        this.localVideoElement.srcObject = this.localStream
        this.localVideoElement.muted = true
        this.localVideoElement.autoplay = true
        this.localVideoElement.playsInline = true
        this.localVideoElement.play().catch(err => {
          console.warn('⚠️ [医者端-发起方]播放本地视频失败:', err)
        })
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流到 peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      // 设置事件监听
      this.setupPeerConnectionEvents()

      // 处理 pending 的 ICE 候选
      await this.processPendingIceCandidates('发起方')

      // 发起通话信令
      const callData = await initiateCall(toUserId, callType, {
        name: '医生'
      })

      this.currentCallId = callData.callId

      // 创建并发送 offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      sendCallOffer(this.currentCallId, offer, toUserId)

      console.log('✅ [医者端-发起方]已发送 offer', { callId: this.currentCallId, toUserId })

      return callData
    } catch (error) {
      console.error('❌ [医者端-发起方]发起通话失败:', error)
      this.cleanupMedia()
      throw error
    }
  }

  /**
   * 接听来电
   */
  async answerCall(
    callId: string,
    fromUserId: string,
    callType: 'audio' | 'video',
    localVideo: HTMLVideoElement | null = null,
    remoteVideo: HTMLVideoElement | null = null,
    remoteAudio: HTMLAudioElement | null = null
  ) {
    try {
      this.currentCallId = callId
      this.currentCallType = callType
      this.isCaller = false
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.remoteAudioElement = remoteAudio
      this.currentToUserId = fromUserId

      console.log('📞 [医者端-接听方]开始接听通话:', { callId, fromUserId, callType })

      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      console.log('✅ [医者端-接听方]本地媒体流获取成功:', {
        videoTracks: this.localStream.getVideoTracks().length,
        audioTracks: this.localStream.getAudioTracks().length
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        this.localVideoElement.srcObject = this.localStream
        this.localVideoElement.muted = true
        this.localVideoElement.autoplay = true
        this.localVideoElement.playsInline = true
        this.localVideoElement.play().catch(err => {
          console.warn('⚠️ [医者端-接听方]播放本地视频失败:', err)
        })
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      // 设置事件监听
      this.setupPeerConnectionEvents()

      // 接听通话
      acceptCall(callId)

      // 如果之前收到了pending的offer，现在处理它
      if (this.pendingOffer) {
        console.log('✅ [医者端-接听方]处理pending的offer', { 
          callId: this.currentCallId, 
          fromUserId: this.pendingOffer.fromUserId 
        })
        const { offer, fromUserId } = this.pendingOffer
        this.pendingOffer = null
        try {
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))
          console.log('✅ [医者端-接听方]已设置远程描述(offer)')
          // remoteDescription 就绪后再 flush ICE（避免候选先到导致的 pending 堆积）
          await this.processPendingIceCandidates('接听方')
          const answer = await this.peerConnection!.createAnswer()
          await this.peerConnection!.setLocalDescription(answer)
          sendCallAnswer(this.currentCallId!, answer, fromUserId)
          console.log('✅ [医者端-接听方]已发送answer', { callId: this.currentCallId, toUserId: fromUserId })
        } catch (error) {
          console.error('❌ [医者端-接听方]处理pending offer失败:', error)
        }
      } else {
        console.log('ℹ️ [医者端-接听方]没有pending的offer，等待offer到达')
        // 注意：此时不处理 pending ICE 候选，因为 remoteDescription 还没设置
        // 当 offer 到达并设置 remoteDescription 后，handleOffer 会处理 pending 的 ICE 候选
      }
    } catch (error) {
      console.error('❌ [医者端-接听方]接听通话失败:', error)
      this.cleanupMedia()
      rejectCall(callId)
      throw error
    }
  }

  /**
   * 设置 RTCPeerConnection 事件监听
   */
  private setupPeerConnectionEvents() {
    if (!this.peerConnection) return

    const role = this.isCaller ? '发起方' : '接听方'

    // 监听远程流
    this.peerConnection.ontrack = (event) => {
      console.log(`✅ [医者端-${role}]收到远程流`, {
        track: event.track,
        trackKind: event.track?.kind,
        streams: event.streams?.length,
        transceiver: event.transceiver
      })

      // 优先使用 event.streams，如果没有则从 track 创建新的流
      if (event.streams && event.streams.length > 0 && event.streams[0]) {
        this.remoteStream = event.streams[0]
      } else if (event.track) {
        // 如果没有 streams，从 track 创建新的流或合并到现有流
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream()
        }
        // 检查是否已经添加了相同的轨道
        const existingTrack = this.remoteStream.getTracks().find(t => t.id === event.track.id)
        if (!existingTrack) {
          this.remoteStream.addTrack(event.track)
          console.log(`✅ [医者端-${role}]已将轨道添加到远程流:`, event.track.kind, event.track.id)
        }
      }

      if (this.remoteStream) {
        console.log(`📹 [医者端-${role}]远程流轨道详情:`, {
          videoTracks: this.remoteStream.getVideoTracks().length,
          audioTracks: this.remoteStream.getAudioTracks().length,
          allTracks: this.remoteStream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState }))
        })

        // 确保音频轨道是启用的
        this.remoteStream.getAudioTracks().forEach(track => {
          if (!track.enabled) {
            track.enabled = true
            console.log(`✅ [医者端-${role}]已启用远程音频轨道:`, track.id)
          }
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
        console.log(`📡 [医者端-${role}]发送ICE候选:`, event.candidate)
        sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
      } else if (!event.candidate) {
        console.log(`📡 [医者端-${role}]ICE候选收集完成`)
      } else {
        console.warn(`⚠️ [医者端-${role}]ICE候选未发送:`, {
          hasCandidate: !!event.candidate,
          hasCallId: !!this.currentCallId,
          hasToUserId: !!this.currentToUserId
        })
      }
    }

    // 监听连接状态
    this.peerConnection.onconnectionstatechange = () => {
      const connState = this.peerConnection?.connectionState
      console.log(`📡 [医者端-${role}]WebRTC连接状态:`, connState)

      if (connState === 'connected') {
        console.log(`✅ [医者端-${role}]WebRTC 连接已建立`)
        setTimeout(() => {
          this.checkAndSetRemoteStream()
        }, 500)
      } else if (connState === 'failed') {
        console.error(`❌ [医者端-${role}]WebRTC 连接失败`)
      }
    }

    // 监听 ICE 连接状态
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState
      console.log(`🔗 [医者端-${role}]ICE连接状态:`, iceState)

      if (iceState === 'connected' || iceState === 'completed') {
        console.log(`✅ [医者端-${role}]ICE连接已建立`)
        setTimeout(() => {
          this.checkAndSetRemoteStream()
        }, 300)
      } else if (iceState === 'failed') {
        console.error(`❌ [医者端-${role}]ICE连接失败，尝试重启ICE`)
        this.peerConnection?.restartIce()
      }
    }
  }

  /**
   * 处理通话状态变化
   */
  private handleCallStatusChange(data: any) {
    const { type, callId, offer, answer, candidate, fromUserId, toUserId } = data

    console.log('📡 [医者端]收到通话信令:', data)

    // 如果已经有当前通话ID且与收到的不一致，需要判断是否允许切换
    if (this.currentCallId && callId && callId !== this.currentCallId) {
      // 检查当前通话是否还在进行中
      const isCurrentCallActive = this.peerConnection && 
                                  this.peerConnection.connectionState !== 'closed' &&
                                  this.peerConnection.connectionState !== 'disconnected' &&
                                  this.peerConnection.connectionState !== 'failed'
      
      if (!isCurrentCallActive) {
        // 当前通话已结束，允许切换到新通话
        console.log('🔄 [医者端]当前通话已结束，切换到新通话', {
          oldCallId: this.currentCallId,
          newCallId: callId,
          type,
          connectionState: this.peerConnection?.connectionState || 'no-connection'
        })
        // 清理旧通话状态
        this.cleanupMedia()
        // 设置新通话ID
        this.currentCallId = callId
      } else {
        // 当前通话还在进行中，忽略新通话的信令（避免串线）
        console.warn('⚠️ [医者端]收到与当前通话ID不匹配的信令，已忽略（当前通话仍在进行中）', {
          currentCallId: this.currentCallId,
          incomingCallId: callId,
          type,
          connectionState: this.peerConnection?.connectionState
        })
        return
      }
    }

    // 如果当前还没有通话ID，而信令里带了 callId，则绑定一下
    if (!this.currentCallId && callId) {
      this.currentCallId = callId
      console.log('✅ [医者端]绑定新通话ID:', callId)
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
  private async handleOffer(offer: RTCSessionDescriptionInit, fromUserId: string) {
    console.log('📞 [医者端]收到offer', { offer, fromUserId, currentCallId: this.currentCallId, hasPeerConnection: !!this.peerConnection, pendingIceCount: this.pendingIceCandidates.length })

    if (!this.peerConnection) {
      console.warn('⚠️ [医者端]收到offer但peerConnection未创建，保存为pending')
      this.pendingOffer = { offer, fromUserId }
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('✅ [医者端]已设置远程描述(offer)，准备处理pending的ICE候选')
      // remoteDescription 就绪后再 flush ICE（这是关键：必须在设置 remoteDescription 之后才能添加 ICE 候选）
      await this.processPendingIceCandidates(this.isCaller ? '发起方' : '接听方')
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      if (!this.currentCallId) {
        console.error('❌ [医者端]处理offer时currentCallId为空，无法发送answer')
        return
      }
      sendCallAnswer(this.currentCallId, answer, fromUserId)
      console.log('✅ [医者端]已发送answer', { callId: this.currentCallId, toUserId: fromUserId })
    } catch (error) {
      console.error('❌ [医者端]处理 offer 失败:', error)
    }
  }

  /**
   * 处理收到的 answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('📞 [医者端]收到answer', { answer, currentCallId: this.currentCallId, hasPeerConnection: !!this.peerConnection })
    
    if (!this.peerConnection) {
      console.warn('⚠️ [医者端]收到answer但peerConnection未创建')
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ [医者端]已设置远程描述(answer)')
      // remoteDescription 就绪后再 flush ICE
      await this.processPendingIceCandidates(this.isCaller ? '发起方' : '接听方')
      setTimeout(() => {
        this.checkAndSetRemoteStream()
      }, 300)
    } catch (error) {
      console.error('❌ [医者端]处理 answer 失败:', error)
    }
  }

  /**
   * 处理收到的 ICE 候选
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log('📡 [医者端]收到ICE候选', { 
      candidate, 
      hasPeerConnection: !!this.peerConnection,
      hasRemoteDescription: !!this.peerConnection?.remoteDescription,
      pendingCount: this.pendingIceCandidates.length
    })
    
    if (!this.peerConnection) {
      console.warn('⚠️ [医者端]收到ICE候选但peerConnection未创建，保存为pending（这是正常的，等待接听时创建）')
      this.pendingIceCandidates.push(candidate)
      return
    }

    // 关键：remoteDescription 未设置前 addIceCandidate 可能抛 InvalidStateError
    // 这是正常的时序问题：患者端发起通话后立即发送 ICE 候选，但医生端接听并设置 remoteDescription 需要时间
    if (!this.peerConnection.remoteDescription) {
      console.log('ℹ️ [医者端]remoteDescription 未就绪，ICE候选先进入pending队列（将在设置remoteDescription后处理）')
      this.pendingIceCandidates.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('✅ [医者端]已添加ICE候选')
    } catch (error) {
      console.error('❌ [医者端]添加 ICE 候选失败:', error)
      // 如果添加失败，也保存为 pending，可能在后续重试
      this.pendingIceCandidates.push(candidate)
    }
  }

  /**
   * 处理 pending 的 ICE 候选
   */
  private async processPendingIceCandidates(role: string) {
    if (this.pendingIceCandidates.length > 0 && this.peerConnection) {
      if (!this.peerConnection.remoteDescription) {
        console.log(`⏳ [医者端-${role}]remoteDescription 未就绪，延后处理pending ICE（当前${this.pendingIceCandidates.length}个）`)
        return
      }
      console.log(`✅ [医者端-${role}]开始处理${this.pendingIceCandidates.length}个pending的ICE候选`)
      const candidates = [...this.pendingIceCandidates]
      this.pendingIceCandidates = []
      
      let successCount = 0
      let failCount = 0
      for (const candidate of candidates) {
        try {
          await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate))
          successCount++
        } catch (error) {
          console.error('❌ [医者端]添加pending ICE候选失败:', error)
          failCount++
          // 如果添加失败，不再重新加入 pending，避免无限循环
        }
      }
      console.log(`✅ [医者端-${role}]处理pending ICE候选完成: 成功${successCount}个，失败${failCount}个`)
    } else if (this.pendingIceCandidates.length > 0 && !this.peerConnection) {
      console.log(`⏳ [医者端-${role}]peerConnection未创建，等待创建后再处理pending ICE（当前${this.pendingIceCandidates.length}个）`)
    }
  }

  /**
   * 检查并设置远程流
   */
  private checkAndSetRemoteStream() {
    if (!this.peerConnection) {
      return
    }

    // 如果还没有远程流，尝试从peerConnection中获取
    if (!this.remoteStream) {
      const receivers = this.peerConnection.getReceivers()
      const allTracks = receivers
        .map(receiver => receiver.track)
        .filter(track => track !== null && track.readyState === 'live')

      const videoTracks = allTracks.filter(track => track!.kind === 'video')
      const audioTracks = allTracks.filter(track => track!.kind === 'audio')

      if (videoTracks.length > 0 || audioTracks.length > 0) {
        this.remoteStream = new MediaStream([...videoTracks, ...audioTracks] as MediaStreamTrack[])
        console.log('📹 [医者端]从peerConnection获取远程流:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          allTracks: allTracks.map(t => ({ kind: t!.kind, id: t!.id, enabled: t!.enabled, readyState: t!.readyState }))
        })
        
        // 确保音频轨道是启用的
        audioTracks.forEach(track => {
          if (track && !track.enabled) {
            track.enabled = true
            console.log('✅ [医者端]已启用从peerConnection获取的音频轨道:', track.id)
          }
        })
        
        setTimeout(() => {
          this.setRemoteStream()
        }, 200)
      } else {
        console.warn('⚠️ [医者端]从peerConnection未找到可用的远程轨道')
      }
    } else {
      // 确保现有远程流的音频轨道是启用的
      this.remoteStream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          track.enabled = true
          console.log('✅ [医者端]已启用现有远程流的音频轨道:', track.id)
        }
      })
      this.setRemoteStream()
    }
  }

  /**
   * 设置远程流到媒体元素
   */
  private setRemoteStream() {
    if (!this.remoteStream) {
      return
    }

    const videoTracks = this.remoteStream.getVideoTracks().length
    const audioTracks = this.remoteStream.getAudioTracks().length

    console.log('📹 [医者端]设置远程流:', { 
      videoTracks, 
      audioTracks, 
      callType: this.currentCallType,
      hasRemoteAudioElement: !!this.remoteAudioElement
    })

    // 语音通话：使用 audio 元素播放
    // 优先检查通话类型，而不是只检查轨道数量
    if (this.currentCallType === 'audio' && audioTracks > 0) {
      // 优先使用传入的 remoteAudioElement，如果没有则使用兜底方案
      let audioEl: HTMLAudioElement | null = null
      
      if (this.remoteAudioElement) {
        // 处理 Vue ref 的情况
        audioEl = this.remoteAudioElement
        if (audioEl && typeof audioEl === 'object' && (audioEl as any).$el) {
          audioEl = (audioEl as any).$el
        }
        if (audioEl && audioEl.tagName !== 'AUDIO') {
          audioEl = audioEl.querySelector('audio') || null
        }
      }
      
      // 如果还是没有找到，使用兜底方案
      if (!audioEl || audioEl.tagName !== 'AUDIO') {
        audioEl = this.ensureRemoteAudioElement()
      }
      
      if (audioEl && audioEl.tagName === 'AUDIO') {
        try { audioEl.pause?.() } catch {}
        // 清除之前的流（如果有）
        if (audioEl.srcObject) {
          const oldStream = audioEl.srcObject as MediaStream
          oldStream.getTracks().forEach(track => track.stop())
        }
        
        audioEl.srcObject = this.remoteStream
        audioEl.muted = false
        audioEl.volume = 1
        audioEl.autoplay = true
        audioEl.setAttribute('playsinline', 'true')
        
        // 确保音频轨道是启用的
        const tracks = this.remoteStream.getAudioTracks()
        tracks.forEach(track => {
          if (!track.enabled) {
            track.enabled = true
            console.log('✅ [医者端]已启用远程音频轨道:', track.id)
          }
        })
        
        this.safePlay(audioEl, '远程音频').then(() => {
          console.log('✅ [医者端]语音通话：远程音频播放成功', {
            audioTracks: audioTracks,
            elementMuted: audioEl?.muted,
            elementVolume: audioEl?.volume,
            elementPaused: audioEl?.paused
          })
        }).catch(err => {
          console.warn('⚠️ [医者端]远程音频播放失败（可能需用户手势）:', err)
          // 监听用户交互后重试
          const retry = () => {
            if (audioEl) {
              this.safePlay(audioEl, '远程音频(重试)').then(() => {
                console.log('✅ [医者端]用户交互后远程音频播放成功')
              }).catch(() => {})
            }
            document.removeEventListener('click', retry)
            document.removeEventListener('touchend', retry)
          }
          document.addEventListener('click', retry, { once: true, capture: true })
          document.addEventListener('touchend', retry, { once: true, capture: true } as any)
        })
      } else {
        console.error('❌ [医者端]无法找到有效的音频元素')
      }
      return
    }

    // 视频通话：使用 video 元素播放
    let videoElement: HTMLVideoElement | null = null

    if (this.remoteVideoElement) {
      videoElement = this.remoteVideoElement
      // 处理 Vue ref 的情况
      if (videoElement && typeof videoElement === 'object' && (videoElement as any).$el) {
        videoElement = (videoElement as any).$el
      }
      if (videoElement && videoElement.tagName !== 'VIDEO') {
        videoElement = videoElement.querySelector('video') || null
      }
    }

    if (!videoElement && typeof document !== 'undefined') {
      videoElement = document.querySelector('video.remote-video') as HTMLVideoElement
    }

    if (!videoElement || videoElement.tagName !== 'VIDEO') {
      console.warn('⚠️ [医者端]无法找到远程视频元素，延迟重试')
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
      console.log('✅ [医者端]远程视频播放成功')
    }).catch(err => {
      console.warn('⚠️ [医者端]远程视频播放失败:', err)
      const retry = () => {
        this.safePlay(videoElement, '远程视频(重试)').catch(() => {})
        document.removeEventListener('click', retry)
        document.removeEventListener('touchend', retry)
      }
      document.addEventListener('click', retry, { once: true, capture: true })
      document.addEventListener('touchend', retry, { once: true, capture: true } as any)
    })
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
  rejectCall(callId: string) {
    rejectCall(callId)
  }

  /**
   * 清理媒体资源
   */
  private cleanupMedia() {
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
    if (this.fallbackAudioElement) {
      this.fallbackAudioElement.srcObject = null
      this.fallbackAudioElement.remove()
      this.fallbackAudioElement = null
    }

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
      console.error('❌ [医者端]切换摄像头失败:', error)
    }
  }

  /**
   * 切换静音
   */
  toggleMute(): boolean {
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
  toggleVideo(): boolean {
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
let callManagerInstance: CallManager | null = null

export function getCallManager(): CallManager {
  if (!callManagerInstance) {
    callManagerInstance = new CallManager()
    callManagerInstance.init()
  }
  return callManagerInstance
}

export default getCallManager
