/**
 * WebRTC 通话管理模块
 * 用于处理语音和视频通话（医生端）
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

// ICE 配置（内网优先，避免依赖公网 STUN）
// 说明：
// 1) 内网直连：iceServers 为空，浏览器仅使用 host candidate。
// 2) 如需内网 STUN/TURN，可在 iceServers 中添加内网地址。
//    例如：
//    iceServers: [
//      { urls: 'stun:10.0.0.5:3478' },
//      { urls: 'turn:10.0.0.5:3478', username: 'user', credential: 'pass' }
//    ]
const STUN_SERVERS: RTCConfiguration = {
  iceServers: []
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
  private currentToUserId: string | null = null
  private pendingOffer: { offer: RTCSessionDescriptionInit; fromUserId: string } | null = null

  /**
   * 初始化通话管理器
   */
  init() {
    // 监听通话状态变化
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
   * 发起通话
   * @param toUserId - 接收者用户ID
   * @param callType - 'audio' | 'video'
   * @param localVideo - 本地视频元素
   * @param remoteVideo - 远程视频元素
   */
  async startCall(
    toUserId: string,
    callType: 'audio' | 'video' = 'video',
    localVideo: HTMLVideoElement | null = null,
    remoteVideo: HTMLVideoElement | null = null
  ): Promise<{ callId: string; toUserId: string; callType: string }> {
    try {
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.currentCallType = callType
      this.isCaller = true
      this.currentToUserId = toUserId

      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        this.localVideoElement.srcObject = this.localStream
        this.localVideoElement.play().catch(err => {
          console.warn('播放本地视频失败:', err)
        })
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流到 peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      // 监听远程流
      this.peerConnection.ontrack = (event) => {
        console.log('✅ 收到远程流', event)
        console.log('📹 远程流信息:', {
          streams: event.streams.length,
          track: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streamId: event.streams[0]?.id
        })
        
        // 如果还没有远程流，或者收到新的流，更新它
        if (event.streams && event.streams.length > 0 && event.streams[0]) {
          this.remoteStream = event.streams[0]
          console.log('📹 远程流轨道详情:', {
            videoTracks: this.remoteStream.getVideoTracks().length,
            audioTracks: this.remoteStream.getAudioTracks().length,
            allTracks: this.remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          })
          
          // 延迟设置视频流，确保 DOM 已渲染
          setTimeout(() => {
            this.setRemoteVideoStream()
          }, 200)
          
          // 如果视频元素已经存在，再次尝试设置
          if (this.remoteVideoElement) {
            setTimeout(() => {
              this.setRemoteVideoStream()
            }, 500)
          }
        } else {
          console.warn('⚠️ 收到远程流事件但没有流数据')
        }
      }

      // 监听 ICE 候选
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId && this.currentToUserId) {
          console.log('📡 [医者端-发起方]发送ICE候选:', event.candidate)
          sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
        } else if (!event.candidate) {
          console.log('📡 [医者端-发起方]ICE候选收集完成')
        }
      }

      // 监听连接状态
      this.peerConnection.onconnectionstatechange = () => {
        const connState = this.peerConnection?.connectionState
        console.log('📡 [医者端-发起方]WebRTC连接状态:', connState)
        
        if (connState === 'failed') {
          console.error('❌ [医者端-发起方]WebRTC 连接失败')
        } else if (connState === 'connected') {
          console.log('✅ [医者端-发起方]WebRTC 连接已建立，检查远程视频流')
          // 连接建立后，检查并设置远程视频流
            setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 500)
        } else if (connState === 'disconnected') {
          console.warn('⚠️ [医者端-发起方]WebRTC 连接断开')
        }
      }
      
      // 监听 ICE 连接状态
      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection?.iceConnectionState
        console.log('🔗 [医者端-发起方]ICE连接状态:', iceState)
        console.log('🔗 [医者端-发起方]ICE收集状态:', this.peerConnection?.iceGatheringState)
        console.log('🔗 [医者端-发起方]信令状态:', this.peerConnection?.signalingState)
        
        if (iceState === 'connected' || iceState === 'completed') {
          console.log('✅ [医者端-发起方]ICE连接已建立，开始检查远程流')
            setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 300)
        } else if (iceState === 'failed') {
          console.error('❌ [医者端-发起方]ICE连接失败，尝试重启ICE')
          this.peerConnection?.restartIce()
        } else if (iceState === 'disconnected') {
          console.warn('⚠️ [医者端-发起方]ICE连接断开')
        }
      }

      // 发起通话信令
      const callData = await initiateCall(toUserId, callType, {
        name: '医生'
      })

      this.currentCallId = callData.callId

      // 创建 offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      sendCallOffer(this.currentCallId, offer, toUserId)

      return callData
    } catch (error) {
      console.error('❌ 发起通话失败:', error)
      this.cleanupMedia()
      throw error
    }
  }

  /**
   * 接听来电
   * @param callId - 通话ID
   * @param fromUserId - 主叫方用户ID
   * @param callType - 通话类型
   * @param localVideo - 本地视频元素
   * @param remoteVideo - 远程视频元素
   */
  async answerCall(
    callId: string,
    fromUserId: string,
    callType: 'audio' | 'video',
    localVideo: HTMLVideoElement | null = null,
    remoteVideo: HTMLVideoElement | null = null
  ) {
    try {
      this.currentCallId = callId
      this.currentCallType = callType
      this.isCaller = false
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.currentToUserId = fromUserId

      // 获取本地媒体流
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        this.localVideoElement.srcObject = this.localStream
        this.localVideoElement.play().catch(err => {
          console.warn('播放本地视频失败:', err)
        })
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      // 监听远程流
      this.peerConnection.ontrack = (event) => {
        console.log('✅ 收到远程流', event)
        console.log('📹 远程流信息:', {
          streams: event.streams.length,
          track: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streamId: event.streams[0]?.id
        })
        
        // 如果还没有远程流，或者收到新的流，更新它
        if (event.streams && event.streams.length > 0 && event.streams[0]) {
          this.remoteStream = event.streams[0]
          console.log('📹 远程流轨道详情:', {
            videoTracks: this.remoteStream.getVideoTracks().length,
            audioTracks: this.remoteStream.getAudioTracks().length,
            allTracks: this.remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          })
          
          // 延迟设置视频流，确保 DOM 已渲染
          setTimeout(() => {
            this.setRemoteVideoStream()
          }, 200)
          
          // 如果视频元素已经存在，再次尝试设置
          if (this.remoteVideoElement) {
            setTimeout(() => {
              this.setRemoteVideoStream()
            }, 500)
          }
        } else {
          console.warn('⚠️ 收到远程流事件但没有流数据')
        }
      }

      // 监听 ICE 候选
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId && this.currentToUserId) {
          console.log('📡 [医者端-接听方]发送ICE候选:', event.candidate)
          sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
        } else if (!event.candidate) {
          console.log('📡 [医者端-接听方]ICE候选收集完成')
        }
      }
      
      // 监听连接状态（接听方）
      this.peerConnection.onconnectionstatechange = () => {
        const connState = this.peerConnection?.connectionState
        console.log('📡 [医者端-接听方]WebRTC连接状态:', connState)
        
        if (connState === 'failed') {
          console.error('❌ [医者端-接听方]WebRTC 连接失败')
        } else if (connState === 'connected') {
          console.log('✅ [医者端-接听方]WebRTC 连接已建立，检查远程视频流')
          setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 500)
        } else if (connState === 'disconnected') {
          console.warn('⚠️ [医者端-接听方]WebRTC 连接断开')
        }
      }
      
      // 监听 ICE 连接状态（接听方也需要）
      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection?.iceConnectionState
        console.log('🔗 [医者端-接听方]ICE连接状态:', iceState)
        console.log('🔗 [医者端-接听方]ICE收集状态:', this.peerConnection?.iceGatheringState)
        console.log('🔗 [医者端-接听方]信令状态:', this.peerConnection?.signalingState)
        
        if (iceState === 'connected' || iceState === 'completed') {
          console.log('✅ [医者端-接听方]ICE连接已建立，开始检查远程流')
            setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 300)
        } else if (iceState === 'failed') {
          console.error('❌ [医者端-接听方]ICE连接失败，尝试重启ICE')
          this.peerConnection?.restartIce()
        } else if (iceState === 'disconnected') {
          console.warn('⚠️ [医者端-接听方]ICE连接断开')
        }
      }

      // 接听通话
      acceptCall(callId)
      
      // 如果之前收到了pending的offer，现在处理它
      if (this.pendingOffer) {
        console.log('✅ [医者端-接听方]处理pending的offer')
        const { offer, fromUserId } = this.pendingOffer
        this.pendingOffer = null
        try {
          await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await this.peerConnection!.createAnswer()
          await this.peerConnection!.setLocalDescription(answer)
          sendCallAnswer(this.currentCallId!, answer, fromUserId)
          console.log('✅ [医者端-接听方]已发送answer')
        } catch (error) {
          console.error('❌ [医者端-接听方]处理pending offer失败:', error)
        }
      }
    } catch (error) {
      console.error('❌ 接听通话失败:', error)
      this.cleanupMedia()
      rejectCall(callId)
      throw error
    }
  }

  /**
   * 处理通话状态变化
   */
  private handleCallStatusChange(data: any) {
    const { type, callId, offer, answer, candidate, fromUserId, toUserId } = data

    if (callId !== this.currentCallId) {
      return
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
        this.endCall()
        break
    }
  }

  /**
   * 处理收到的 offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit, fromUserId: string) {
    console.log('📞 [医者端]收到offer，当前peerConnection状态:', {
      hasPeerConnection: !!this.peerConnection,
      callId: this.currentCallId,
      fromUserId: fromUserId
    })
    
    // 如果还没有peerConnection，说明answerCall还没调用，先等待
    if (!this.peerConnection) {
      console.warn('⚠️ [医者端]收到offer但peerConnection未创建，等待answerCall完成...')
      // 保存offer，等待answerCall创建peerConnection后再处理
      this.pendingOffer = { offer, fromUserId }
      return
    }

    try {
      console.log('✅ [医者端]设置remoteDescription(offer)')
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('✅ [医者端]创建answer')
      const answer = await this.peerConnection.createAnswer()
      console.log('✅ [医者端]设置localDescription(answer)')
      await this.peerConnection.setLocalDescription(answer)
      console.log('✅ [医者端]发送answer')
      sendCallAnswer(this.currentCallId!, answer, fromUserId)
    } catch (error) {
      console.error('❌ [医者端]处理 offer 失败:', error)
    }
  }

  /**
   * 处理收到的 answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('❌ 处理 answer 失败:', error)
    }
  }

  /**
   * 处理收到的 ICE 候选
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      return
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('❌ 添加 ICE 候选失败:', error)
    }
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

    // 清理视频元素
    if (this.localVideoElement) {
      this.localVideoElement.srcObject = null
    }
    if (this.remoteVideoElement) {
      this.remoteVideoElement.srcObject = null
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
      console.error('❌ 切换摄像头失败:', error)
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

  /**
   * 检查并设置远程流（从peerConnection中获取）
   */
  private checkAndSetRemoteStream() {
    if (!this.peerConnection) {
      console.warn('⚠️ checkAndSetRemoteStream: peerConnection不存在')
      return
    }

    console.log('🔍 [医者端]检查远程流状态:', {
      hasRemoteStream: !!this.remoteStream,
      connectionState: this.peerConnection.connectionState,
      iceConnectionState: this.peerConnection.iceConnectionState
    })

    // 如果还没有远程流，尝试从peerConnection中获取
    if (!this.remoteStream) {
      const receivers = this.peerConnection.getReceivers()
      console.log('📡 [医者端]接收器数量:', receivers.length)
      
      const allTracks = receivers
        .map(receiver => receiver.track)
        .filter(track => track !== null)
      
      const videoTracks = allTracks.filter(track => track!.kind === 'video')
      const audioTracks = allTracks.filter(track => track!.kind === 'audio')
      
      console.log('📹 [医者端]找到轨道:', {
        总数: allTracks.length,
        视频: videoTracks.length,
        音频: audioTracks.length
      })
      
      if (videoTracks.length > 0 || audioTracks.length > 0) {
        console.log('📹 [医者端]从peerConnection获取远程流，创建MediaStream')
        this.remoteStream = new MediaStream([...videoTracks, ...audioTracks] as MediaStreamTrack[])
        console.log('📹 [医者端]远程流已创建:', {
          videoTracks: this.remoteStream.getVideoTracks().length,
          audioTracks: this.remoteStream.getAudioTracks().length
        })
        setTimeout(() => {
          this.setRemoteVideoStream()
        }, 200)
      } else {
        console.warn('⚠️ [医者端]未找到远程轨道，接收器详情:', receivers.map(r => ({
          track: r.track ? { kind: r.track.kind, id: r.track.id, readyState: r.track.readyState } : null
        })))
      }
    } else {
      // 如果已有远程流，直接设置
      console.log('✅ [医者端]已有远程流，直接设置到视频元素')
      this.setRemoteVideoStream()
    }
  }

  /**
   * 设置远程视频流到视频元素
   */
  private setRemoteVideoStream() {
    if (!this.remoteStream) {
      console.warn('⚠️ 无法设置远程视频流：缺少流')
      return
    }

    try {
      // 获取真实的原生 video 元素
      let videoElement: HTMLVideoElement | null = null
      
      // 方法1：使用已保存的视频元素引用
      if (this.remoteVideoElement) {
        videoElement = this.remoteVideoElement
        
        // Vue 3 的 ref 应该直接是 HTMLVideoElement，但为了兼容性检查
        if (videoElement && typeof videoElement === 'object') {
          // 检查是否是 Vue 组件实例（uni-app 或其他框架）
          const anyElement = videoElement as any
          if (anyElement.$el) {
            videoElement = anyElement.$el
          }
          // 如果不是 VIDEO 元素，尝试查找子元素
          if (videoElement && videoElement.tagName !== 'VIDEO') {
            videoElement = videoElement.querySelector('video') || videoElement
          }
        }
      }
      
      // 方法2：如果 ref 获取失败，通过 DOM 查询获取
      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        if (typeof document !== 'undefined') {
          const videoByClass = document.querySelector('video.remote-video') as HTMLVideoElement
          if (videoByClass) {
            videoElement = videoByClass
            console.log('✅ 通过DOM选择器找到远程视频元素')
            // 更新引用，以便下次使用
            this.remoteVideoElement = videoElement
          }
        }
      }

      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        console.error('❌ 无法找到有效的远程视频元素', {
          hasRef: !!this.remoteVideoElement,
          element: videoElement,
          tagName: videoElement?.tagName,
          remoteStreamTracks: this.remoteStream.getTracks().length,
          remoteVideoTracks: this.remoteStream.getVideoTracks().length
        })
        // 延迟重试（最多重试5次）
        const retryCount = (this as any).__retryCount || 0
        if (retryCount < 5) {
          (this as any).__retryCount = retryCount + 1
          setTimeout(() => {
            this.setRemoteVideoStream()
          }, 1000)
        } else {
          const errorMsg = '❌ 重试次数过多，停止重试'
          console.error(errorMsg)
          ;(this as any).__retryCount = 0
        }
        return
      }

      // 重置重试计数
      (this as any).__retryCount = 0

      const videoTracks = this.remoteStream.getVideoTracks().length
      const audioTracks = this.remoteStream.getAudioTracks().length

      console.log('✅ 设置远程视频流到元素:', videoElement, {
        streamTracks: this.remoteStream.getTracks().length,
        videoTracks,
        audioTracks,
        elementReady: videoElement.readyState
      })
      
      // 清除之前的流（如果有）
      if (videoElement.srcObject) {
        const oldStream = videoElement.srcObject as MediaStream
        oldStream.getTracks().forEach(track => track.stop())
      }
      
      // 设置视频流
      videoElement.srcObject = this.remoteStream
      
      // 确保视频元素属性正确
      videoElement.autoplay = true
      videoElement.playsInline = true
      videoElement.muted = false // 确保未静音
      
      // 监听视频元素的加载事件
      videoElement.onloadedmetadata = () => {
        console.log('📹 远程视频元数据已加载', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          duration: videoElement.duration
        })
      }
      
      videoElement.oncanplay = () => {
        console.log('📹 远程视频可以播放')
        // 尝试播放
        videoElement.play().catch(err => {
          console.warn('⚠️ canplay事件后播放失败:', err)
        })
      }

      // 如果没有视频轨，仅播放音频，避免 NotSupportedError
      if (videoTracks === 0) {
        console.warn('⚠️ [医者端]远程流没有视频轨，仅播放音频')
        // 确保可以播放音频
        videoElement.muted = false
        // 等待元数据加载后再播放
        const tryPlay = () => {
          if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
        videoElement.play().catch(err => {
              console.warn('⚠️ [医者端]仅音频播放失败:', err)
        })
          } else {
            setTimeout(tryPlay, 100)
          }
        }
        videoElement.onloadedmetadata = tryPlay
        return
      }
      
      // 等待元数据加载后再播放（避免 NotSupportedError）
      const playWhenReady = () => {
        if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      const playPromise = videoElement.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
              console.log('✅ [医者端]远程视频播放成功', {
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                readyState: videoElement.readyState,
                paused: videoElement.paused,
                muted: videoElement.muted,
                srcObject: !!videoElement.srcObject
          })
        }).catch(err => {
              console.warn('⚠️ [医者端]播放远程视频失败:', err)
          // 尝试取消静音后再播放
              videoElement.muted = false
          setTimeout(() => {
                videoElement.play().catch(e => {
                  console.error('❌ [医者端]重试播放失败:', e)
            })
          }, 1000)
        })
          }
        } else {
          // 如果还没准备好，等待一下再试
          setTimeout(playWhenReady, 100)
        }
      }
      
      // 如果已经加载了元数据，直接播放
      if (videoElement.readyState >= 2) {
        playWhenReady()
      } else {
        // 否则等待 loadedmetadata 事件
        videoElement.onloadedmetadata = () => {
          playWhenReady()
        }
        // 设置超时，避免无限等待
        setTimeout(() => {
          if (videoElement.readyState < 2) {
            console.warn('⚠️ [医者端]视频元数据加载超时，尝试直接播放')
            playWhenReady()
          }
        }, 3000)
      }
    } catch (error) {
      console.error('❌ 设置远程视频流失败:', error)
    }
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

