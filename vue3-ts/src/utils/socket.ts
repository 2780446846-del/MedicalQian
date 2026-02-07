/**
 * Socket.IO 客户端封装（Vue3 Web 版本）
 * 用于医生端后台管理系统
 */

import { io, Socket } from 'socket.io-client'

// Socket.IO 服务器地址
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socketInstance: Socket | null = null
let isConnected = false

/**
 * 连接 Socket.IO 服务器
 * @param userId - 用户ID（医生ID）
 * @param userInfo - 用户信息
 */
export function connectSocket(userId: string, userInfo: { name: string; avatar?: string; email?: string; role?: string; gender?: string; age?: number; userId?: string }) {
  return new Promise<Socket>((resolve, reject) => {
    // 如果已经连接且是同一个用户，直接返回
    if (socketInstance && isConnected && socketInstance.connected) {
      console.log('✅ Socket已连接，复用现有连接')
      resolve(socketInstance)
      return
    }
    
    // 如果存在实例但未连接，先断开再重新连接
    if (socketInstance && !isConnected) {
      console.log('🔄 Socket实例存在但未连接，重新连接...')
      socketInstance.disconnect()
      socketInstance = null
    }

    try {
      console.log('🔄 正在连接 Socket.IO 服务器...', SOCKET_URL)

      // 临时只使用 polling，避免 WebSocket 握手问题
      // 连接成功后再考虑启用 websocket 升级
      const usePollingOnly = true // 设为 false 可以启用 websocket 升级
      
      socketInstance = io(SOCKET_URL, {
        // Socket.IO 路径（必须与服务器配置一致）
        path: '/socket.io/',
        
        // 传输方式：如果 usePollingOnly 为 true，只使用 polling
        // 否则先使用 polling，连接成功后再升级到 websocket
        transports: usePollingOnly ? ['polling'] : ['polling', 'websocket'],
        
        // 自动重连配置
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        
        // 连接超时（毫秒）
        timeout: 20000,
        
        // 允许升级传输方式（从 polling 升级到 websocket）
        // 如果只使用 polling，这个选项会被忽略
        upgrade: !usePollingOnly,
        
        // 强制使用新的连接（不使用缓存）
        // 这可以避免使用之前失败的连接
        forceNew: true,
        
        // 记住传输方式偏好
        rememberUpgrade: false,
        
        // 调试模式（开发环境）
        ...(import.meta.env.DEV && {
          // 在开发环境启用详细日志
          debug: false // 设为 true 可以看到更多调试信息
        })
      })
      
      console.log('🔧 Socket.IO 连接配置:', {
        url: SOCKET_URL,
        path: '/socket.io/',
        transports: usePollingOnly ? ['polling'] : ['polling', 'websocket'],
        upgrade: !usePollingOnly,
        forceNew: true
      })

      // 连接成功
      socketInstance.on('connect', () => {
        console.log('✅ Socket.IO 连接成功:', socketInstance?.id)
        console.log('📡 当前传输方式:', (socketInstance as any).io?.engine?.transport?.name || 'unknown')
        isConnected = true

        // 发送用户上线事件
        socketInstance?.emit('user:online', {
          userId,
          userInfo
        })

        resolve(socketInstance!)
      })
      
      // 监听传输方式变化
      socketInstance.on('upgrade', () => {
        console.log('🔄 Socket.IO 传输方式已升级到 WebSocket')
        console.log('📡 当前传输方式:', (socketInstance as any).io?.engine?.transport?.name || 'unknown')
      })

      // 用户上线成功
      socketInstance.on('user:online:success', (data) => {
        console.log('✅ 用户上线成功:', data)
        console.log('📋 当前在线用户:', data.onlineUsers)
      })

      // 监听连接尝试
      socketInstance.io.on('open', () => {
        console.log('🔄 Socket.IO 开始连接尝试...')
      })
      
      // 监听传输方式
      socketInstance.io.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket.IO 重连尝试 ${attemptNumber}...`)
      })
      
      // 连接错误
      socketInstance.on('connect_error', (error: any) => {
        console.error('❌ Socket.IO 连接错误:', error)
        console.error('错误类型:', error.type)
        console.error('错误描述:', error.description)
        console.error('错误上下文:', error.context)
        console.error('连接URL:', SOCKET_URL)
        console.error('当前传输方式:', (socketInstance as any).io?.engine?.transport?.name || 'unknown')
        console.error('Socket.IO 状态:', {
          connected: socketInstance.connected,
          disconnected: socketInstance.disconnected,
          id: socketInstance.id
        })
        
        // 提供更详细的错误信息
        let errorMessage = error.message || '连接失败'
        if (error.message && error.message.includes('Invalid frame header')) {
          errorMessage = 'WebSocket连接失败：无效的帧头。这通常意味着：\n1. 后端Socket.IO服务未正确启动\n2. 端口被其他非Socket.IO服务占用\n3. 网络代理或防火墙干扰\n\n请检查：\n- 后端控制台是否显示 "✅ Socket.IO 服务已启动"\n- 访问 http://localhost:3000/socket.io/ 是否返回正常响应'
        } else if (error.message && error.message.includes('ECONNREFUSED')) {
          errorMessage = '无法连接到服务器。请确保后端服务正在运行。'
        } else if (error.message && error.message.includes('timeout')) {
          errorMessage = '连接超时。请检查网络连接和后端服务状态。'
        } else if (error.type === 'TransportError') {
          errorMessage = `传输错误：${error.description || error.message}\n\n可能原因：\n1. WebSocket握手失败\n2. 服务器不支持WebSocket协议\n3. 网络中间件干扰`
        }
        
        // 创建增强的错误对象
        const enhancedError = new Error(errorMessage)
        ;(enhancedError as any).originalError = error
        ;(enhancedError as any).type = error.type || 'TransportError'
        ;(enhancedError as any).description = error.description
        
        isConnected = false
        reject(enhancedError)
      })
      
      // 监听传输错误（使用类型断言避免TypeScript错误）
      const ioManager = socketInstance.io as any
      if (ioManager) {
        ioManager.on('error', (error: any) => {
          console.error('❌ Socket.IO IO 错误:', error)
        })
        
        // 监听传输方式变化
        ioManager.on('upgrade', (transport: any) => {
          console.log('🔄 Socket.IO 传输方式升级:', transport.name)
        })
        
        ioManager.on('upgradeError', (error: any) => {
          console.error('❌ Socket.IO 传输升级失败:', error)
        })
      }

      // 断开连接
      socketInstance.on('disconnect', (reason) => {
        console.log('⚠️ Socket.IO 断开连接:', reason)
        isConnected = false
      })

      // 重连中
      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 正在重连... (${attemptNumber})`)
      })

      // 重连成功
      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`✅ 重连成功 (尝试 ${attemptNumber} 次)`)
        isConnected = true

        // 重新发送用户上线事件
        socketInstance?.emit('user:online', {
          userId,
          userInfo
        })
      })

      // 重连失败
      socketInstance.on('reconnect_failed', () => {
        console.error('❌ 重连失败')
        isConnected = false
      })

    } catch (error) {
      console.error('❌ 初始化 Socket.IO 失败:', error)
      reject(error)
    }
  })
}

/**
 * 断开连接
 */
export function disconnectSocket() {
  if (socketInstance) {
    // 发送用户下线事件
    socketInstance.emit('user:offline')
    
    socketInstance.disconnect()
    socketInstance = null
    isConnected = false
    console.log('✅ Socket.IO 已断开连接')
  }
}

/**
 * 发送消息
 * @param toUserId - 接收者用户ID（患者ID）
 * @param content - 消息内容
 * @param type - 消息类型
 * @param extra - 额外数据
 */
export function sendMessage(
  toUserId: string,
  content: string,
  type: string = 'text',
  extra: any = {}
): Promise<{ messageId: string; timestamp: number }> {
  return new Promise((resolve, reject) => {
    if (!socketInstance || !isConnected) {
      reject(new Error('Socket.IO 未连接'))
      return
    }

    const fromUserId = getCurrentUserId()
    if (!fromUserId) {
      reject(new Error('用户ID未设置'))
      return
    }

    console.log('📤 Socket.IO 发送消息:', {
      fromUserId,
      toUserId,
      content: content.substring(0, 50),
      type
    })

    socketInstance.emit('message:send', {
      fromUserId,
      toUserId,
      content,
      type,
      extra
    })

    // 等待发送成功确认
    const timeout = setTimeout(() => {
      reject(new Error('发送消息超时'))
    }, 10000)

    socketInstance.once('message:sent', (data) => {
      clearTimeout(timeout)
      resolve(data)
    })

    socketInstance.once('message:error', (error) => {
      clearTimeout(timeout)
      reject(new Error(error.error || '发送消息失败'))
    })
  })
}

/**
 * 监听接收消息
 * @param callback - 消息回调函数
 */
export function onMessage(callback: (message: any) => void) {
  if (!socketInstance) {
    console.warn('⚠️ Socket.IO 未连接，无法监听消息')
    return
  }

  // 先移除旧的监听器，避免重复注册
  socketInstance.off('message:receive')
  
  socketInstance.on('message:receive', (message) => {
    console.log('📨 Socket.IO收到消息事件:', {
      messageId: message.id || message.messageId,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      content: message.content?.substring(0, 50),
      type: message.type,
      fullMessage: message
    })
    callback(message)
  })
}

/**
 * 移除消息监听
 */
export function offMessage() {
  if (socketInstance) {
    socketInstance.off('message:receive')
  }
}

/**
 * 监听消息已读回执
 * @param callback - 回调函数
 */
export function onMessageRead(callback: (data: any) => void) {
  if (!socketInstance) {
    return
  }

  socketInstance.on('message:read:ack', (data) => {
    console.log('✅ 消息已读:', data)
    callback(data)
  })
}

/**
 * 标记消息为已读
 * @param messageIds - 消息ID数组
 * @param fromUserId - 发送者用户ID
 */
export function markAsRead(messageIds: string[], fromUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  const toUserId = getCurrentUserId()
  if (!toUserId) {
    return
  }

  socketInstance.emit('message:read', {
    messageIds,
    fromUserId,
    toUserId
  })
}

/**
 * 发送正在输入状态
 * @param toUserId - 接收者用户ID
 */
export function startTyping(toUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  const fromUserId = getCurrentUserId()
  if (!fromUserId) {
    return
  }

  socketInstance.emit('typing:start', {
    fromUserId,
    toUserId
  })
}

/**
 * 停止正在输入状态
 * @param toUserId - 接收者用户ID
 */
export function stopTyping(toUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  const fromUserId = getCurrentUserId()
  if (!fromUserId) {
    return
  }

  socketInstance.emit('typing:stop', {
    fromUserId,
    toUserId
  })
}

/**
 * 监听正在输入状态
 * @param callback - 回调函数
 */
export function onTypingStatus(callback: (data: { fromUserId: string; isTyping: boolean }) => void) {
  if (!socketInstance) {
    return
  }

  socketInstance.on('typing:status', (data) => {
    callback(data)
  })
}

/**
 * 获取当前用户ID（从 socket 实例中获取，需要存储）
 */
let currentUserId: string | null = null

export function setCurrentUserId(userId: string) {
  currentUserId = userId
}

function getCurrentUserId(): string | null {
  return currentUserId
}

/**
 * 检查连接状态
 */
export function isSocketConnected(): boolean {
  return isConnected && socketInstance?.connected === true
}

/**
 * 获取 Socket 实例
 */
export function getSocketInstance(): Socket | null {
  return socketInstance
}

/**
 * ==================== 语音/视频通话相关函数 ====================
 */

/**
 * 发起通话
 * @param toUserId - 接收者用户ID
 * @param callType - 通话类型：'audio' | 'video'
 * @param callerInfo - 主叫方信息
 */
export function initiateCall(toUserId: string, callType: 'audio' | 'video' = 'video', callerInfo: any = {}): Promise<{ callId: string; toUserId: string; callType: string }> {
  return new Promise((resolve, reject) => {
    if (!socketInstance || !isConnected) {
      reject(new Error('Socket.IO 未连接'))
      return
    }

    const fromUserId = getCurrentUserId()
    if (!fromUserId) {
      reject(new Error('用户ID未设置'))
      return
    }

    socketInstance.emit('call:initiate', {
      toUserId,
      callType,
      callerInfo
    })

    // 监听发起成功
    const onInitiated = (data: any) => {
      socketInstance?.off('call:initiated', onInitiated)
      socketInstance?.off('call:error', onError)
      resolve(data)
    }

    const onError = (error: any) => {
      socketInstance?.off('call:initiated', onInitiated)
      socketInstance?.off('call:error', onError)
      reject(new Error(error.error || '发起通话失败'))
    }

    socketInstance.once('call:initiated', onInitiated)
    socketInstance.once('call:error', onError)
  })
}

/**
 * 接听通话
 * @param callId - 通话ID
 */
export function acceptCall(callId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  socketInstance.emit('call:accept', { callId })
}

/**
 * 拒绝通话
 * @param callId - 通话ID
 */
export function rejectCall(callId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  socketInstance.emit('call:reject', { callId })
}

/**
 * 挂断通话
 * @param callId - 通话ID
 */
export function endCall(callId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  socketInstance.emit('call:end', { callId })
}

/**
 * 发送 WebRTC offer
 * @param callId - 通话ID
 * @param offer - SDP offer
 * @param toUserId - 接收者用户ID
 */
export function sendCallOffer(callId: string, offer: RTCSessionDescriptionInit, toUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  socketInstance.emit('call:offer', {
    callId,
    offer: {
      type: offer.type,
      sdp: offer.sdp
    },
    toUserId
  })
}

/**
 * 发送 WebRTC answer
 * @param callId - 通话ID
 * @param answer - SDP answer
 * @param toUserId - 接收者用户ID
 */
export function sendCallAnswer(callId: string, answer: RTCSessionDescriptionInit, toUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  socketInstance.emit('call:answer', {
    callId,
    answer: {
      type: answer.type,
      sdp: answer.sdp
    },
    toUserId
  })
}

/**
 * 发送 ICE 候选
 * @param callId - 通话ID
 * @param candidate - ICE 候选
 * @param toUserId - 接收者用户ID
 */
export function sendIceCandidate(callId: string, candidate: RTCIceCandidateInit | null, toUserId: string) {
  if (!socketInstance || !isConnected) {
    return
  }

  if (candidate) {
    socketInstance.emit('call:ice-candidate', {
      callId,
      candidate: candidate,
      toUserId
    })
  }
}

/**
 * 监听来电
 * @param callback - 回调函数
 */
export function onIncomingCall(callback: (data: any) => void) {
  if (!socketInstance) {
    return
  }
  // 先移除已有监听，避免重复注册导致同一来电弹两次窗
  socketInstance.off('call:incoming')
  socketInstance.on('call:incoming', (data) => {
    callback(data)
  })
}

/**
 * 移除来电监听
 */
export function offIncomingCall() {
  if (socketInstance) {
    socketInstance.off('call:incoming')
  }
}

/**
 * 监听通话状态变化
 * @param callback - 回调函数
 */
export function onCallStatusChange(callback: (data: any) => void): (() => void) | null {
  if (!socketInstance) {
    return null
  }

  const handlers = {
    'call:accepted': (data: any) => callback({ type: 'accepted', ...data }),
    'call:rejected': (data: any) => callback({ type: 'rejected', ...data }),
    'call:ended': (data: any) => callback({ type: 'ended', ...data }),
    'call:offer': (data: any) => callback({ type: 'offer', ...data }),
    'call:answer': (data: any) => callback({ type: 'answer', ...data }),
    'call:ice-candidate': (data: any) => callback({ type: 'ice-candidate', ...data })
  }

  Object.keys(handlers).forEach(event => {
    socketInstance?.on(event, (handlers as any)[event])
  })

  // 返回清理函数
  return () => {
    Object.keys(handlers).forEach(event => {
      socketInstance?.off(event, (handlers as any)[event])
    })
  }
}

export default {
  connectSocket,
  disconnectSocket,
  sendMessage,
  onMessage,
  offMessage,
  onMessageRead,
  markAsRead,
  startTyping,
  stopTyping,
  onTypingStatus,
  setCurrentUserId,
  isSocketConnected,
  getSocketInstance,
  // 通话相关
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  sendCallOffer,
  sendCallAnswer,
  sendIceCandidate,
  onIncomingCall,
  offIncomingCall,
  onCallStatusChange
}

