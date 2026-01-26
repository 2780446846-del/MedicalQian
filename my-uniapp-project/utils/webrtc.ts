import { WEBRTC_CONFIG } from '../config/webrtc'

/**
 * WebRTC 管理类 - 医生端（推流）
 */
export class WebRTCDoctor {
  private ws: WebSocket | null = null
  private localStream: MediaStream | null = null
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private roomId: string = ''
  private doctorId: string = ''
  private doctorName: string = ''
  
  // 回调函数
  public onViewerJoined?: (viewerId: string, viewerName: string, viewerCount: number) => void
  public onViewerLeft?: (viewerId: string, viewerName: string, viewerCount: number) => void
  public onRoomCreated?: (roomId: string) => void
  public onError?: (error: string) => void
  public onConnectionStateChange?: (viewerId: string, state: string) => void
  public onChatMessage?: (senderId: string, senderName: string, message: string, timestamp: number) => void

  constructor() {
    console.log('WebRTCDoctor 初始化')
  }

  /**
   * 连接信令服务器
   */
  async connect(signalServer: string = WEBRTC_CONFIG.SIGNAL_SERVER): Promise<void> {
    // 如果已经有连接，先关闭
    if (this.ws) {
      console.log('⚠️ 关闭旧的 WebSocket 连接')
      this.ws.close()
      this.ws = null
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 创建新的 WebSocket 连接:', signalServer)
        this.ws = new WebSocket(signalServer)

        this.ws.onopen = () => {
          console.log('✅ 信令服务器连接成功')
          console.log('WebSocket readyState:', this.ws?.readyState)
          // 添加小延迟确保 WebSocket 完全就绪
          setTimeout(() => {
            console.log('✅ WebSocket 已完全就绪')
            resolve()
          }, 100)
        }

        this.ws.onerror = (error) => {
          console.error('❌ 信令服务器连接失败:', error)
          reject(new Error('信令服务器连接失败'))
        }

        this.ws.onmessage = (event) => {
          this.handleSignalMessage(JSON.parse(event.data))
        }

        this.ws.onclose = (event) => {
          console.log('信令服务器连接已关闭, code:', event.code, 'reason:', event.reason)
          // 不要在 onclose 中调用 cleanup，避免循环
          // this.cleanup()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 创建直播间
   */
  async createRoom(roomId: string, doctorId: string, doctorName: string, title: string): Promise<void> {
    this.roomId = roomId
    this.doctorId = doctorId
    this.doctorName = doctorName

    console.log('🔍 检查 WebSocket 状态:')
    console.log('- this.ws 存在:', !!this.ws)
    console.log('- readyState:', this.ws?.readyState)
    console.log('- WebSocket.OPEN:', WebSocket.OPEN)
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket 未就绪，无法创建直播间')
      throw new Error('信令服务器未连接')
    }

    console.log('✅ WebSocket 状态正常，发送创建直播间消息')
    this.ws.send(JSON.stringify({
      type: 'create-room',
      roomId,
      doctorId,
      doctorName,
      title
    }))
  }

  /**
   * 设置本地视频流
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream
    console.log('本地视频流已设置')
  }

  /**
   * 处理信令消息
   */
  private handleSignalMessage(data: any): void {
    console.log('收到信令消息:', data.type)

    switch (data.type) {
      case 'room-created':
        console.log('✅ 直播间创建成功:', data.roomId)
        if (this.onRoomCreated) {
          this.onRoomCreated(data.roomId)
        }
        break

      case 'viewer-joined':
        console.log('👤 观众加入:', data.viewerName)
        this.handleViewerJoined(data.viewerId, data.viewerName)
        if (this.onViewerJoined) {
          this.onViewerJoined(data.viewerId, data.viewerName, data.viewerCount)
        }
        break

      case 'viewer-left':
        console.log('👋 观众离开:', data.viewerName)
        this.closePeerConnection(data.viewerId)
        if (this.onViewerLeft) {
          this.onViewerLeft(data.viewerId, data.viewerName, data.viewerCount)
        }
        break

      case 'answer':
        this.handleAnswer(data.viewerId, data.answer)
        break

      case 'ice-candidate':
        this.handleIceCandidate(data.viewerId, data.candidate)
        break

      case 'chat-message':
        console.log('💬 收到聊天消息:', data.senderName, data.message)
        if (this.onChatMessage) {
          this.onChatMessage(data.senderId, data.senderName, data.message, data.timestamp)
        }
        break

      case 'error':
        console.error('信令错误:', data.message)
        if (this.onError) {
          this.onError(data.message)
        }
        break
    }
  }

  /**
   * 处理观众加入
   */
  private async handleViewerJoined(viewerId: string, viewerName: string): Promise<void> {
    try {
      console.log(`🎯 开始为观众 ${viewerId} 创建连接`)
      
      // 检查本地流
      if (!this.localStream) {
        console.error('❌ 本地流不存在，无法创建连接')
        return
      }
      
      console.log('本地流信息:')
      console.log('- 视频轨道数:', this.localStream.getVideoTracks().length)
      console.log('- 音频轨道数:', this.localStream.getAudioTracks().length)
      console.log('- 流是否活跃:', this.localStream.active)
      
      // 创建 RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: WEBRTC_CONFIG.ICE_SERVERS
      })

      // 添加本地流 - 关键步骤！
      console.log('📤 添加本地流到 PeerConnection')
      this.localStream.getTracks().forEach(track => {
        console.log(`添加轨道: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`)
        pc.addTrack(track, this.localStream!)
      })

      // 监听 ICE 候选
      pc.onicecandidate = (event) => {
        if (event.candidate && this.ws) {
          console.log(`📡 发送 ICE 候选给观众 ${viewerId}`)
          this.ws.send(JSON.stringify({
            type: 'ice-candidate',
            roomId: this.roomId,
            targetId: viewerId,
            candidate: event.candidate
          }))
        }
      }

      // 监听连接状态
      pc.onconnectionstatechange = () => {
        console.log(`🔗 连接状态 [${viewerId}]:`, pc.connectionState)
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(viewerId, pc.connectionState)
        }
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.closePeerConnection(viewerId)
        }
      }

      // 创建 Offer
      console.log('📝 创建 Offer')
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      })
      await pc.setLocalDescription(offer)
      
      console.log('Offer SDP:', pc.localDescription?.sdp?.substring(0, 200) + '...')

      // 发送 Offer 给观众
      if (this.ws) {
        console.log(`📤 发送 Offer 给观众 ${viewerId}`)
        this.ws.send(JSON.stringify({
          type: 'offer',
          roomId: this.roomId,
          viewerId,
          offer: pc.localDescription
        }))
      }

      // 保存连接
      this.peerConnections.set(viewerId, pc)
      console.log(`✅ 为观众 ${viewerId} 创建了 PeerConnection`)
    } catch (error) {
      console.error('❌ 处理观众加入失败:', error)
    }
  }

  /**
   * 处理 Answer
   */
  private async handleAnswer(viewerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(viewerId)
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`✅ 设置 Answer 成功 [${viewerId}]`)
      } catch (error) {
        console.error('设置 Answer 失败:', error)
      }
    }
  }

  /**
   * 处理 ICE Candidate
   */
  private async handleIceCandidate(viewerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(viewerId)
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        console.log(`✅ 添加 ICE Candidate 成功 [${viewerId}]`)
      } catch (error) {
        console.error('添加 ICE Candidate 失败:', error)
      }
    }
  }

  /**
   * 关闭与某个观众的连接
   */
  private closePeerConnection(viewerId: string): void {
    const pc = this.peerConnections.get(viewerId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(viewerId)
      console.log(`🔌 关闭了与观众 ${viewerId} 的连接`)
    }
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket 未连接，无法发送消息')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'chat-message',
      roomId: this.roomId,
      senderId: this.doctorId,
      senderName: this.doctorName,
      message
    }))
    
    console.log('📤 发送聊天消息:', message)
  }

  /**
   * 关闭直播间
   */
  closeRoom(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'close-room',
        roomId: this.roomId
      }))
    }
    this.cleanup()
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 关闭所有 PeerConnection
    this.peerConnections.forEach((pc, viewerId) => {
      pc.close()
    })
    this.peerConnections.clear()

    // 关闭 WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // 停止本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    console.log('✅ 资源已清理')
  }

  /**
   * 获取连接统计信息
   */
  async getStats(viewerId: string): Promise<RTCStatsReport | null> {
    const pc = this.peerConnections.get(viewerId)
    if (pc) {
      return await pc.getStats()
    }
    return null
  }
}

/**
 * WebRTC 管理类 - 观众端（拉流）
 */
export class WebRTCViewer {
  private ws: WebSocket | null = null
  private pc: RTCPeerConnection | null = null
  private roomId: string = ''
  private viewerId: string = ''
  private viewerName: string = ''
  
  // 回调函数
  public onRemoteStream?: (stream: MediaStream) => void
  public onRoomJoined?: (doctorName: string, title: string, viewerCount: number) => void
  public onRoomClosed?: () => void
  public onError?: (error: string) => void
  public onConnectionStateChange?: (state: string) => void
  public onChatMessage?: (senderId: string, senderName: string, message: string, timestamp: number) => void

  constructor() {
    console.log('WebRTCViewer 初始化')
  }

  /**
   * 连接信令服务器
   */
  async connect(signalServer: string = WEBRTC_CONFIG.SIGNAL_SERVER): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(signalServer)

        this.ws.onopen = () => {
          console.log('✅ 信令服务器连接成功')
          resolve()
        }

        this.ws.onerror = (error) => {
          console.error('❌ 信令服务器连接失败:', error)
          reject(new Error('信令服务器连接失败'))
        }

        this.ws.onmessage = (event) => {
          this.handleSignalMessage(JSON.parse(event.data))
        }

        this.ws.onclose = () => {
          console.log('信令服务器连接已关闭')
          this.cleanup()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 加入直播间
   */
  async joinRoom(roomId: string, viewerId: string, viewerName: string): Promise<void> {
    this.roomId = roomId
    this.viewerId = viewerId
    this.viewerName = viewerName

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('信令服务器未连接')
    }

    this.ws.send(JSON.stringify({
      type: 'join-room',
      roomId,
      viewerId,
      viewerName
    }))
  }

  /**
   * 处理信令消息
   */
  private handleSignalMessage(data: any): void {
    console.log('收到信令消息:', data.type)

    switch (data.type) {
      case 'room-joined':
        console.log('✅ 加入直播间成功')
        if (this.onRoomJoined) {
          this.onRoomJoined(data.doctorName, data.title, data.viewerCount)
        }
        break

      case 'offer':
        this.handleOffer(data.offer)
        break

      case 'ice-candidate':
        this.handleIceCandidate(data.candidate)
        break

      case 'room-closed':
        console.log('📴 直播间已关闭')
        if (this.onRoomClosed) {
          this.onRoomClosed()
        }
        this.cleanup()
        break

      case 'chat-message':
        console.log('💬 收到聊天消息:', data.senderName, data.message)
        if (this.onChatMessage) {
          this.onChatMessage(data.senderId, data.senderName, data.message, data.timestamp)
        }
        break

      case 'error':
        console.error('信令错误:', data.message)
        if (this.onError) {
          this.onError(data.message)
        }
        break
    }
  }

  /**
   * 处理 Offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      // 创建 RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: WEBRTC_CONFIG.ICE_SERVERS
      })

      // 监听远程流 - 修复：正确处理 ontrack 事件
      this.pc.ontrack = (event) => {
        console.log('✅ ontrack 事件触发')
        console.log('event.streams:', event.streams)
        console.log('event.track:', event.track)
        
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0]
          console.log('✅ 收到远程视频流')
          console.log('视频轨道数:', remoteStream.getVideoTracks().length)
          console.log('音频轨道数:', remoteStream.getAudioTracks().length)
          console.log('流是否活跃:', remoteStream.active)
          
          if (this.onRemoteStream) {
            this.onRemoteStream(remoteStream)
          }
        } else {
          console.warn('⚠️ event.streams 为空，尝试手动创建流')
          // 如果 streams 为空，手动创建 MediaStream
          const remoteStream = new MediaStream([event.track])
          console.log('手动创建的流:', remoteStream)
          
          if (this.onRemoteStream) {
            this.onRemoteStream(remoteStream)
          }
        }
      }

      // 监听 ICE 候选
      this.pc.onicecandidate = (event) => {
        if (event.candidate && this.ws) {
          this.ws.send(JSON.stringify({
            type: 'ice-candidate',
            roomId: this.roomId,
            candidate: event.candidate
          }))
        }
      }

      // 监听连接状态
      this.pc.onconnectionstatechange = () => {
        console.log('连接状态:', this.pc?.connectionState)
        if (this.onConnectionStateChange && this.pc) {
          this.onConnectionStateChange(this.pc.connectionState)
        }
      }

      // 设置远程描述
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer))

      // 创建 Answer
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)

      // 发送 Answer
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'answer',
          roomId: this.roomId,
          answer: this.pc.localDescription
        }))
      }

      console.log('✅ Answer 已发送')
    } catch (error) {
      console.error('处理 Offer 失败:', error)
    }
  }

  /**
   * 处理 ICE Candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('✅ 添加 ICE Candidate 成功')
      } catch (error) {
        console.error('添加 ICE Candidate 失败:', error)
      }
    }
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket 未连接，无法发送消息')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'chat-message',
      roomId: this.roomId,
      senderId: this.viewerId,
      senderName: this.viewerName,
      message
    }))
    
    console.log('📤 发送聊天消息:', message)
  }

  /**
   * 离开直播间
   */
  leaveRoom(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'leave-room',
        roomId: this.roomId
      }))
    }
    this.cleanup()
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 关闭 PeerConnection
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }

    // 关闭 WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    console.log('✅ 资源已清理')
  }

  /**
   * 获取连接统计信息
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (this.pc) {
      return await this.pc.getStats()
    }
    return null
  }
}

