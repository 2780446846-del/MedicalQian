/**
 * WebRTC 通话管理模块
 * 用于处理语音和视频通话
 */

import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  sendCallOffer,
  sendCallAnswer,
  sendIceCandidate,
  onCallStatusChange,
  getSocketInstance
} from './socket.js'

// ICE 配置（内网优先，同一网络下使用内网直连）
// 说明：
// 1) 内网直连：iceServers 为空，浏览器仅使用 host candidate。
// 2) 如需公网 STUN/TURN，可在 iceServers 中添加。
//    例如：
//    iceServers: [
//      { urls: 'stun:stun.l.google.com:19302' },
//      { urls: 'stun:stun1.l.google.com:19302' }
//    ]
const STUN_SERVERS = {
  iceServers: []
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
    this.currentToUserId = null
  }

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
   * 检查是否支持 WebRTC 和 getUserMedia
   * 注意：移动端（APP/小程序）可以使用摄像头和麦克风，但需要：
   * 1. 使用 uni.chooseImage/uni.chooseVideo 选择媒体文件
   * 2. 使用原生插件实现实时视频通话（如 uni-app WebRTC 插件）
   * 3. 或使用第三方 SDK（如腾讯云、声网等）
   */
  checkMediaSupport() {
    // #ifdef H5
    // H5 环境检查
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // 尝试使用旧版 API
      const getUserMedia = navigator.getUserMedia || 
                          navigator.webkitGetUserMedia || 
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia
      if (!getUserMedia) {
        throw new Error('当前浏览器不支持摄像头/麦克风访问，请使用 Chrome、Firefox 或 Safari 浏览器')
      }
    }
    // #endif
    
    // #ifdef APP-PLUS
    // APP 环境：可以使用摄像头和麦克风，但需要原生插件支持 WebRTC
    // 可以使用 plus.camera 或第三方插件
    // 这里暂时提示需要原生插件
    throw new Error('APP 环境下需要原生 WebRTC 插件支持，建议使用第三方 SDK（如腾讯云、声网）或原生插件')
    // #endif
    
    // #ifdef MP
    // 小程序环境：可以使用摄像头和麦克风，但 WebRTC 支持有限
    // 微信小程序可以使用 live-pusher 和 live-player 组件
    throw new Error('小程序环境下可以使用摄像头和麦克风，但实时视频通话需要使用 live-pusher/live-player 组件或第三方 SDK')
    // #endif
    
    // #ifndef H5 || APP-PLUS || MP
    // 其他环境
    throw new Error('当前环境不支持实时视频通话，请在浏览器中打开使用')
    // #endif
  }

  /**
   * 获取用户媒体流（兼容不同环境）
   * 
   * 移动端说明：
   * - APP 环境：需要使用原生插件或第三方 SDK
   * - 小程序环境：可以使用 live-pusher 组件
   * - H5 环境：使用 WebRTC API
   */
  async getUserMedia(constraints) {
    // #ifdef H5
    // H5 环境：使用标准 API
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
    
    // #ifdef APP-PLUS
    // APP 环境：需要使用原生插件
    // 示例：可以使用 plus.camera 或第三方 WebRTC 插件
    throw new Error('APP 环境需要使用原生 WebRTC 插件，建议集成第三方 SDK（如腾讯云实时音视频、声网 Agora）')
    // #endif
    
    // #ifdef MP
    // 小程序环境：可以使用 live-pusher 组件
    // 微信小程序可以使用 <live-pusher> 和 <live-player> 组件实现视频通话
    throw new Error('小程序环境可以使用 live-pusher/live-player 组件或第三方 SDK 实现视频通话')
    // #endif
    
    // #ifndef H5 || APP-PLUS || MP
    // 其他环境
    throw new Error('当前环境不支持实时媒体流获取，请在浏览器中打开使用')
    // #endif
  }

  /**
   * 发起通话
   * @param {string} toUserId - 接收者用户ID
   * @param {string} callType - 'audio' | 'video'
   * @param {HTMLElement} localVideo - 本地视频元素
   * @param {HTMLElement} remoteVideo - 远程视频元素
   */
  async startCall(toUserId, callType = 'video', localVideo = null, remoteVideo = null) {
    try {
      // 检查媒体支持
      this.checkMediaSupport()
      
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.currentCallType = callType
      this.isCaller = true
      this.currentToUserId = toUserId

      // 获取本地媒体流
      this.localStream = await this.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      // 🔍 添加调试日志：检查是否获取到视频轨道
      console.log('📹 [发起方]本地媒体流获取结果:', {
        callType: callType,
        hasStream: !!this.localStream,
        videoTracks: this.localStream?.getVideoTracks()?.length || 0,
        audioTracks: this.localStream?.getAudioTracks()?.length || 0,
        allTracks: this.localStream?.getTracks()?.map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          label: t.label
        })) || []
      })
      
      // 如果没有视频轨道，警告
      if (callType === 'video' && this.localStream?.getVideoTracks()?.length === 0) {
        console.error('❌ [发起方]视频通话但没有获取到视频轨道！可能原因：')
        console.error('1. 摄像头权限被拒绝')
        console.error('2. 摄像头被其他应用占用')
        console.error('3. 浏览器不支持（非HTTPS环境）')
        console.error('4. 没有摄像头设备')
      }

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        // 获取真实的原生 video 元素
        let localVideo = this.localVideoElement
        if (localVideo && typeof localVideo === 'object') {
          if (localVideo.$el) {
            localVideo = localVideo.$el
          }
          if (localVideo && localVideo.tagName !== 'VIDEO') {
            localVideo = localVideo.querySelector('video') || localVideo
          }
        }
        
        if (localVideo && localVideo.tagName === 'VIDEO') {
          // 在设置srcObject之前，先配置video元素属性
          localVideo.muted = true  // 本地视频需要静音，避免回音
          localVideo.autoplay = true
          localVideo.playsInline = true  // 移动端需要
          
          localVideo.srcObject = this.localStream
          localVideo.play().catch(err => {
            console.warn('播放本地视频失败:', err)
          })
        } else {
          console.warn('⚠️ 无法找到有效的本地视频元素')
        }
      }

      // 创建 RTCPeerConnection
      console.log('▶️ [发起方]开始创建 RTCPeerConnection')
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)
      console.log('✅ [发起方]RTCPeerConnection 创建完成', this.peerConnection)

      // 添加本地流到 peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })
      console.log('✅ [发起方]已将本地音视频轨道添加到 PeerConnection', {
        localVideoTracks: this.localStream.getVideoTracks().length,
        localAudioTracks: this.localStream.getAudioTracks().length
      })

      // 创建并发送 offer
      console.log('▶️ [发起方]准备创建 offer')
      const offer = await this.peerConnection.createOffer()
      console.log('✅ [发起方]已创建 offer', offer)

      await this.peerConnection.setLocalDescription(offer)
      console.log('✅ [发起方]已设置本地描述 localDescription', this.peerConnection.localDescription)

      // 发给对方
      console.log('📨 [发起方]通过 socket 发送 offer 给对方', {
        callId: this.currentCallId,
        toUserId: toUserId
      })
      sendCallOffer(this.currentCallId, offer, toUserId)

      // 监听远程流
      this.peerConnection.ontrack = (event) => {
        console.log('✅ [发起方]收到远程流事件', event)
        console.log('📹 [发起方]远程流详细信息:', {
          streams: event.streams.length,
          track: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          id: event.track.id,
          label: event.track.label
        })
        
        // 如果还没有远程流，或者收到新的流，更新远程流
        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0]
          console.log('📹 [发起方]从event.streams获取远程流')
        } else if (event.track) {
          // 如果没有流，从track创建流
            this.remoteStream = new MediaStream([event.track])
          console.log('📹 [发起方]从track创建远程流')
          }
        
        if (this.remoteStream) {
          const videoTracks = this.remoteStream.getVideoTracks()
          const audioTracks = this.remoteStream.getAudioTracks()
          console.log('📹 [发起方]远程流轨道详情:', {
            videoTracks: videoTracks.length,
            audioTracks: audioTracks.length,
            allTracks: this.remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted,
              id: t.id
            }))
          })
          
          if (videoTracks.length === 0) {
            console.warn('⚠️ [发起方]远程流没有视频轨道！')
          }
        } else {
          console.warn('⚠️ [发起方]无法获取远程流')
        }
        
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
      }

      // 监听 ICE 候选
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId && this.currentToUserId) {
          console.log('📡 [发起方]发送ICE候选:', event.candidate)
          sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
        } else if (!event.candidate) {
          console.log('📡 [发起方]ICE候选收集完成')
        }
      }

      // 监听ICE连接状态
      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection.iceConnectionState
        console.log('🔗 [发起方]ICE连接状态:', iceState)
        console.log('🔗 [发起方]ICE收集状态:', this.peerConnection.iceGatheringState)
        console.log('🔗 [发起方]信令状态:', this.peerConnection.signalingState)
        
        if (iceState === 'connected' || iceState === 'completed') {
          console.log('✅ [发起方]ICE连接已建立，开始检查远程流')
          setTimeout(() => {
          this.checkAndSetRemoteStream()
          }, 300)
        } else if (iceState === 'failed') {
          console.error('❌ [发起方]ICE连接失败，尝试重启ICE')
          this.peerConnection.restartIce()
        } else if (iceState === 'disconnected') {
          console.warn('⚠️ [发起方]ICE连接断开')
        }
      }

      // 监听连接状态
      this.peerConnection.onconnectionstatechange = () => {
        const connState = this.peerConnection.connectionState
        console.log('📡 [发起方]WebRTC连接状态:', connState)
        
        if (connState === 'failed') {
          console.error('❌ [发起方]WebRTC 连接失败')
        } else if (connState === 'connected') {
          console.log('✅ [发起方]WebRTC 连接已建立，检查远程视频流')
          setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 500)
        } else if (connState === 'disconnected') {
          console.warn('⚠️ [发起方]WebRTC 连接断开')
        }
      }

      // 发起通话信令（仅生成 callId 等信息，offer 已在前面创建并发送）
      const callData = await initiateCall(toUserId, callType, {
        name: '用户'
      })

      this.currentCallId = callData.callId

      return callData
    } catch (error) {
      console.error('❌ 发起通话失败:', error)
      this.cleanupMedia()
      throw error
    }
  }

  /**
   * 接听来电
   * @param {string} callId - 通话ID
   * @param {string} fromUserId - 主叫方用户ID
   * @param {string} callType - 通话类型
   * @param {HTMLElement} localVideo - 本地视频元素
   * @param {HTMLElement} remoteVideo - 远程视频元素
   */
  async answerCall(callId, fromUserId, callType, localVideo = null, remoteVideo = null) {
    try {
      // 检查媒体支持
      this.checkMediaSupport()
      
      this.currentCallId = callId
      this.currentCallType = callType
      this.isCaller = false
      this.localVideoElement = localVideo
      this.remoteVideoElement = remoteVideo
      this.currentToUserId = fromUserId

      // 获取本地媒体流
      this.localStream = await this.getUserMedia({
        audio: true,
        video: callType === 'video'
      })

      // 🔍 添加调试日志：检查是否获取到视频轨道
      console.log('📹 [接听方]本地媒体流获取结果:', {
        callType: callType,
        hasStream: !!this.localStream,
        videoTracks: this.localStream?.getVideoTracks()?.length || 0,
        audioTracks: this.localStream?.getAudioTracks()?.length || 0,
        allTracks: this.localStream?.getTracks()?.map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          label: t.label
        })) || []
      })
      
      // 如果没有视频轨道，警告
      if (callType === 'video' && this.localStream?.getVideoTracks()?.length === 0) {
        console.error('❌ [接听方]视频通话但没有获取到视频轨道！可能原因：')
        console.error('1. 摄像头权限被拒绝')
        console.error('2. 摄像头被其他应用占用')
        console.error('3. 浏览器不支持（非HTTPS环境）')
        console.error('4. 没有摄像头设备')
      }

      // 显示本地视频
      if (this.localVideoElement && this.localStream) {
        // 获取真实的原生 video 元素
        let localVideo = this.localVideoElement
        if (localVideo && typeof localVideo === 'object') {
          if (localVideo.$el) {
            localVideo = localVideo.$el
          }
          if (localVideo && localVideo.tagName !== 'VIDEO') {
            localVideo = localVideo.querySelector('video') || localVideo
          }
        }
        
        if (localVideo && localVideo.tagName === 'VIDEO') {
          // 在设置srcObject之前，先配置video元素属性
          localVideo.muted = true  // 本地视频需要静音，避免回音
          localVideo.autoplay = true
          localVideo.playsInline = true  // 移动端需要
          
          localVideo.srcObject = this.localStream
          localVideo.play().catch(err => {
            console.warn('播放本地视频失败:', err)
          })
        } else {
          console.warn('⚠️ 无法找到有效的本地视频元素')
        }
      }

      // 创建 RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(STUN_SERVERS)

      // 添加本地流
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // 监听远程流
      this.peerConnection.ontrack = (event) => {
        console.log('✅ [接听方]收到远程流事件', event)
        console.log('📹 [接听方]远程流详细信息:', {
          streams: event.streams.length,
          track: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          id: event.track.id,
          label: event.track.label
        })
        
        // 如果还没有远程流，或者收到新的流，更新远程流
        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0]
          console.log('📹 [接听方]从event.streams获取远程流')
        } else if (event.track) {
          // 如果没有流，从track创建流
            this.remoteStream = new MediaStream([event.track])
          console.log('📹 [接听方]从track创建远程流')
          }
        
        if (this.remoteStream) {
          const videoTracks = this.remoteStream.getVideoTracks()
          const audioTracks = this.remoteStream.getAudioTracks()
          console.log('📹 [接听方]远程流轨道详情:', {
            videoTracks: videoTracks.length,
            audioTracks: audioTracks.length,
            allTracks: this.remoteStream.getTracks().map(t => ({
              kind: t.kind,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted,
              id: t.id
            }))
          })
          
          if (videoTracks.length === 0) {
            console.warn('⚠️ [接听方]远程流没有视频轨道！')
          }
        } else {
          console.warn('⚠️ [接听方]无法获取远程流')
        }
        
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
      }

      // 监听 ICE 候选
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId && this.currentToUserId) {
          console.log('📡 [接听方]发送ICE候选:', event.candidate)
          sendIceCandidate(this.currentCallId, event.candidate, this.currentToUserId)
        } else if (!event.candidate) {
          console.log('📡 [接听方]ICE候选收集完成')
        }
      }

      // 监听ICE连接状态
      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection.iceConnectionState
        console.log('🔗 [接听方]ICE连接状态:', iceState)
        console.log('🔗 [接听方]ICE收集状态:', this.peerConnection.iceGatheringState)
        console.log('🔗 [接听方]信令状态:', this.peerConnection.signalingState)
        
        if (iceState === 'connected' || iceState === 'completed') {
          console.log('✅ [接听方]ICE连接已建立，开始检查远程流')
          setTimeout(() => {
          this.checkAndSetRemoteStream()
          }, 300)
        } else if (iceState === 'failed') {
          console.error('❌ [接听方]ICE连接失败，尝试重启ICE')
          this.peerConnection.restartIce()
        } else if (iceState === 'disconnected') {
          console.warn('⚠️ [接听方]ICE连接断开')
        }
      }

      // 监听连接状态
      this.peerConnection.onconnectionstatechange = () => {
        const connState = this.peerConnection.connectionState
        console.log('📡 [接听方]WebRTC连接状态:', connState)
        
        if (connState === 'failed') {
          console.error('❌ [接听方]WebRTC 连接失败')
        } else if (connState === 'connected') {
          console.log('✅ [接听方]WebRTC 连接已建立，检查远程视频流')
          setTimeout(() => {
            this.checkAndSetRemoteStream()
          }, 500)
        } else if (connState === 'disconnected') {
          console.warn('⚠️ [接听方]WebRTC 连接断开')
        }
      }

      // 接听通话
      acceptCall(callId)
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
  handleCallStatusChange(data) {
    const { type, callId, offer, answer, candidate, fromUserId } = data

    if (callId !== this.currentCallId) {
      return
    }

    switch (type) {
      case 'offer':
        this.handleOffer(offer, fromUserId || data.toUserId)
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
  async handleOffer(offer, fromUserId) {
    if (!this.peerConnection) {
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      sendCallAnswer(this.currentCallId, answer, fromUserId)
    } catch (error) {
      console.error('❌ 处理 offer 失败:', error)
    }
  }

  /**
   * 检查并设置远程流（从peerConnection中获取）
   */
  checkAndSetRemoteStream() {
    if (!this.peerConnection) {
      console.warn('⚠️ checkAndSetRemoteStream: peerConnection不存在')
      return
    }

    console.log('🔍 检查远程流状态:', {
      hasRemoteStream: !!this.remoteStream,
      connectionState: this.peerConnection.connectionState,
      iceConnectionState: this.peerConnection.iceConnectionState
    })

    // 如果还没有远程流，尝试从peerConnection中获取
    if (!this.remoteStream) {
      const receivers = this.peerConnection.getReceivers()
      console.log('📡 接收器数量:', receivers.length)
      
      const allTracks = receivers
        .map(receiver => receiver.track)
        .filter(track => track !== null)
      
      const videoTracks = allTracks.filter(track => track.kind === 'video')
      const audioTracks = allTracks.filter(track => track.kind === 'audio')
      
      console.log('📹 找到轨道:', {
        总数: allTracks.length,
        视频: videoTracks.length,
        音频: audioTracks.length
      })
      
      if (videoTracks.length > 0 || audioTracks.length > 0) {
        console.log('📹 从peerConnection获取远程流，创建MediaStream')
        this.remoteStream = new MediaStream([...videoTracks, ...audioTracks])
        console.log('📹 远程流已创建:', {
          videoTracks: this.remoteStream.getVideoTracks().length,
          audioTracks: this.remoteStream.getAudioTracks().length
        })
        setTimeout(() => {
          this.setRemoteVideoStream()
        }, 200)
      } else {
        console.warn('⚠️ 未找到远程轨道，接收器详情:', receivers.map(r => ({
          track: r.track ? { kind: r.track.kind, id: r.track.id, readyState: r.track.readyState } : null
        })))
      }
    } else {
      // 如果已有远程流，直接设置
      console.log('✅ 已有远程流，直接设置到视频元素')
      this.setRemoteVideoStream()
    }
  }

  /**
   * 设置远程视频流到视频元素
   */
  setRemoteVideoStream() {
    if (!this.remoteStream) {
      console.warn('⚠️ [患者端]无法设置远程视频流：缺少流')
      return
    }

    try {
      // 获取真实的原生 video 元素
      let videoElement = null
      
      // 方法1：使用已保存的视频元素引用
      if (this.remoteVideoElement) {
        videoElement = this.remoteVideoElement
        
        // 如果是 uni-app 的组件，尝试获取原生元素
        if (videoElement && typeof videoElement === 'object') {
          if (videoElement.$el) {
            videoElement = videoElement.$el
          }
          if (videoElement && videoElement.tagName !== 'VIDEO') {
            videoElement = videoElement.querySelector('video') || videoElement
          }
        }
      }
      
      // 方法2：如果 ref 获取失败，通过 DOM 查询获取
      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        // #ifdef H5
        const videoByClass = document.querySelector('video.remote-video')
        if (videoByClass) {
          videoElement = videoByClass
          console.log('✅ [患者端]通过DOM选择器找到远程视频元素')
          // 更新引用，以便下次使用
          this.remoteVideoElement = videoElement
        }
        // #endif
      }

      if (!videoElement || videoElement.tagName !== 'VIDEO') {
        console.error('❌ [患者端]无法找到有效的远程视频元素', {
          hasRef: !!this.remoteVideoElement,
          element: videoElement,
          tagName: videoElement?.tagName
        })
        // 延迟重试（最多重试5次）
        const retryCount = this.__retryCount || 0
        if (retryCount < 5) {
          this.__retryCount = retryCount + 1
        setTimeout(() => {
          this.setRemoteVideoStream()
        }, 1000)
        } else {
          console.error('❌ [患者端]重试次数过多，停止重试')
          this.__retryCount = 0
        }
        return
      }

      // 重置重试计数
      this.__retryCount = 0

      const videoTracks = this.remoteStream.getVideoTracks().length
      const audioTracks = this.remoteStream.getAudioTracks().length

      console.log('✅ [患者端]设置远程视频流到元素:', videoElement, {
        streamTracks: this.remoteStream.getTracks().length,
        videoTracks,
        audioTracks,
        elementReady: videoElement.readyState
      })
      
      // 清除之前的流（如果有）
      if (videoElement.srcObject) {
        const oldStream = videoElement.srcObject
        if (oldStream && oldStream.getTracks) {
          oldStream.getTracks().forEach(track => track.stop())
        }
      }
      
      // 设置视频流
      videoElement.srcObject = this.remoteStream
      
      // 确保视频元素属性正确
      videoElement.autoplay = true
      videoElement.playsInline = true
      videoElement.muted = false // 远程视频不需要静音
      
      // 如果没有视频轨，仅播放音频，避免 NotSupportedError
      if (videoTracks === 0) {
        console.warn('⚠️ [患者端]远程流没有视频轨，仅播放音频')
        // 确保可以播放音频
        videoElement.muted = false
        // 等待元数据加载后再播放
        const tryPlay = () => {
          if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
            videoElement.play().catch(err => {
              console.warn('⚠️ [患者端]仅音频播放失败:', err)
            })
          } else {
            setTimeout(tryPlay, 100)
          }
        }
        videoElement.onloadedmetadata = tryPlay
        return
      }
      
      // 监听视频元素的加载事件
      videoElement.onloadedmetadata = () => {
        console.log('📹 [患者端]远程视频元数据已加载', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          duration: videoElement.duration,
          readyState: videoElement.readyState
        })
      }
      
      videoElement.oncanplay = () => {
        console.log('📹 [患者端]远程视频可以播放')
        // 尝试播放
        videoElement.play().catch(err => {
          console.warn('⚠️ [患者端]canplay事件后播放失败:', err)
        })
      }

      // 等待元数据加载后再播放（避免 NotSupportedError）
      const playWhenReady = () => {
        if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      videoElement.play().then(() => {
            console.log('✅ [患者端]远程视频播放成功', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          readyState: videoElement.readyState
        })
      }).catch(err => {
            console.warn('⚠️ [患者端]播放远程视频失败:', err)
        // 尝试取消静音后再播放
        videoElement.muted = false
        setTimeout(() => {
          videoElement.play().catch(e => {
                console.error('❌ [患者端]重试播放失败:', e)
          })
        }, 1000)
      })
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
            console.warn('⚠️ [患者端]视频元数据加载超时，尝试直接播放')
            playWhenReady()
          }
        }, 3000)
      }
    } catch (error) {
      console.error('❌ [患者端]设置远程视频流失败:', error)
    }
  }

  /**
   * 处理收到的 answer
   */
  async handleAnswer(answer) {
    if (!this.peerConnection) {
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ 已设置远程描述(answer)')
      
      // 设置answer后，检查并设置远程流
      setTimeout(() => {
        this.checkAndSetRemoteStream()
      }, 300)
    } catch (error) {
      console.error('❌ 处理 answer 失败:', error)
    }
  }

  /**
   * 处理收到的 ICE 候选
   */
  async handleIceCandidate(candidate) {
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
   * 清理媒体资源
   */
  cleanupMedia() {
    // 停止本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
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
    callManagerInstance.init()
  }
  return callManagerInstance
}

export default getCallManager

// 便于在浏览器控制台调试：挂载到 window
if (typeof window !== 'undefined') {
  if (!window.callManager) {
    window.getCallManager = getCallManager
    window.callManager = getCallManager()
    console.log('🛠 调试: 已挂载 window.callManager')
  }
}

