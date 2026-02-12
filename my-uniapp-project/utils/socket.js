/**
 * Socket.IO 客户端封装（uni-app 版本）
 * 用于患者端移动应用
 */
import { SOCKET_URL } from './config.js'
// App-Plus 真机环境使用 uni-socket.io（支持 Socket.IO 协议）
// #ifdef APP-PLUS
import ioApp from '@hyoga/uni-socket.io'
// #endif

// 配置项：是否启用 Socket.IO 连接
// 默认在 H5 环境启用，在 APP-PLUS 环境如果底层实现异常，会自动降级为「仅 HTTP，关闭实时 Socket」
let ENABLE_SOCKET_CONNECTION = true

// #ifdef APP-PLUS
// 先假定 APP-PLUS 可以连接，如果初始化过程中发现运行环境不兼容，会在 catch 里做降级处理
ENABLE_SOCKET_CONNECTION = true
// #endif

let socketInstance = null
let isConnected = false
let currentUserId = null
let ioModule = null

/**
 * 加载 socket.io-client 模块（H5 环境）
 */
async function loadSocketIOModule() {
  if (ioModule) {
    return ioModule
  }

  // #ifdef H5
  // 尝试动态导入，如果失败则提供详细的解决方案
  let retryCount = 0
  const maxRetries = 2
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`🔄 第 ${retryCount} 次重试加载 socket.io-client...`)
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.log('🔄 正在加载 socket.io-client...')
      }
      
      // 使用动态 import 加载 socket.io-client
      // 注意：使用完整的模块路径，避免 Vite 缓存问题
      const socketIOClient = await import('socket.io-client')
      ioModule = socketIOClient.io || socketIOClient.default || socketIOClient
      
      if (ioModule) {
        console.log('✅ 成功加载 socket.io-client')
        return ioModule
      } else {
        throw new Error('socket.io-client 模块加载成功但 io 方法不存在')
      }
    } catch (error) {
      retryCount++
      
      if (retryCount > maxRetries) {
        console.error('❌ 加载 socket.io-client 失败（已重试 ' + maxRetries + ' 次）:', error)
        console.error('错误详情:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          retryCount: retryCount
        })
        
        // 提供详细的解决方案
        const solution = `
无法加载 socket.io-client，请按以下步骤解决：

【重要】这是 Vite 动态导入缓存问题，请按顺序执行：

1. 清除所有缓存（必须）：
   - 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）
   - 删除 unpackage/dist/cache 目录
   - 删除 node_modules/.vite 目录（如果存在）
   - 删除 node_modules/.cache 目录（如果存在）

2. 重新安装依赖：
   cd my-uniapp-project
   npm install

3. 完全重启开发服务器：
   - 完全关闭当前开发服务器（Ctrl+C）
   - 删除 unpackage/dist 目录（如果存在）
   - 重新运行: npm run dev:h5

4. 如果问题仍然存在，尝试：
   npm install socket.io-client@latest
   npm run dev:h5 -- --force

5. 如果还是不行，检查 vite.config.js 或 manifest.json 配置

错误详情: ${error.message}
错误类型: ${error.name}
        `
        throw new Error(solution)
      }
      
      // 继续重试
      console.warn(`⚠️ 加载失败，准备重试 (${retryCount}/${maxRetries})...`)
    }
  }
  // #endif

  // #ifndef H5
  // 非 H5 环境不走这里（App-Plus 走 uni-socket.io）
  throw new Error('当前环境不支持 socket.io-client，请在 App-Plus 使用 uni-socket.io')
  // #endif
}

/**
 * 连接 Socket.IO 服务器
 * @param {string} userId - 用户ID（患者ID）
 * @param {object} userInfo - 用户信息
 */
/**
 * 连接成功后立即执行的回调（用于在 resolve 前注册通话监听，避免漏接 offer）
 */
let onSocketConnectCallback = null
export function setOnSocketConnectCallback(cb) {
  onSocketConnectCallback = cb
}

export async function connectSocket(userId, userInfo = {}) {
  // 如果已有连接，检查用户ID是否变化
  if (socketInstance && isConnected) {
    // 如果用户ID不同，需要断开旧连接，重新连接（切换账号x`）
    if (currentUserId !== userId) {
      console.log('🔄 检测到用户ID变化，断开旧连接:', currentUserId, '->', userId)
      disconnectSocket()
      // 继续执行下面的连接逻辑
    } else {
      // 用户ID相同，直接返回现有连接
      console.log('✅ Socket.IO 已连接，用户ID相同，复用现有连接')
      return socketInstance
    }
  }

  try {
    // 检查是否启用 Socket.IO 连接
    if (!ENABLE_SOCKET_CONNECTION) {
      console.log('⚠️ Socket.IO 连接已禁用，返回模拟连接')
      // 返回模拟的 socket 实例，避免调用方出错
      socketInstance = {
        connected: false,
        id: 'mock_socket_id',
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {}
      }
      isConnected = false
      currentUserId = userId
      // 模拟连接成功，避免调用方出错
      return new Promise((resolve) => {
        resolve(socketInstance)
      })
    }
    
    // #ifdef H5
    // H5 环境使用 socket.io-client
    // 先加载模块
    const io = await loadSocketIOModule()
    
    console.log('🔄 正在连接 Socket.IO 服务器...', SOCKET_URL)

    // 临时只使用 polling，避免 WebSocket 握手失败问题
    // 连接稳定后可以改为 ['polling', 'websocket'] 以启用自动升级
    const usePollingOnly = true // 设为 false 可以启用 websocket 升级
    
    socketInstance = io(SOCKET_URL, {
      // Socket.IO 路径（必须与服务器配置一致）
      path: '/socket.io/',
      
      // 传输方式：先使用 polling，避免 WebSocket 握手失败
      transports: usePollingOnly ? ['polling'] : ['polling', 'websocket'],
      
      // 自动重连配置
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      
      // 连接超时（毫秒）
      timeout: 20000,
      
      // 允许升级传输方式（从 polling 升级到 websocket）
      upgrade: !usePollingOnly,
      
      // 强制使用新连接，避免使用缓存的失败连接
      forceNew: true,
      
      // 记住传输方式偏好
      rememberUpgrade: false
    })
    
    console.log('🔧 Socket.IO 连接配置:', {
      url: SOCKET_URL,
      path: '/socket.io/',
      transports: usePollingOnly ? ['polling'] : ['polling', 'websocket'],
      upgrade: !usePollingOnly,
      forceNew: true
    })

    return new Promise((resolve, reject) => {
      // 连接成功
      socketInstance.on('connect', () => {
        console.log('✅ Socket.IO 连接成功:', socketInstance.id)
        isConnected = true
        currentUserId = userId

        // 发送用户上线事件
        socketInstance.emit('user:online', {
          userId,
          userInfo
        })

        // 在 resolve 前执行回调（如注册通话信令监听），避免 offer 先到被丢弃
        if (typeof onSocketConnectCallback === 'function') {
          try {
            onSocketConnectCallback()
          } catch (e) {
            console.warn('⚠️ onSocketConnectCallback 执行失败:', e)
          }
        }

        resolve(socketInstance)
      })

      // 用户上线成功
      socketInstance.on('user:online:success', (data) => {
        console.log('✅ 用户上线成功:', data)
        console.log('📋 当前在线用户:', data.onlineUsers)
      })

      // 连接错误
      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket.IO 连接错误:', error)
        console.error('错误类型:', error.type)
        console.error('错误描述:', error.description)
        console.error('错误消息:', error.message)
        console.error('连接URL:', SOCKET_URL)
        console.error('当前传输方式:', socketInstance.io?.engine?.transport?.name || 'unknown')
        isConnected = false
        reject(error)
      })
      
      // 监听传输方式变化
      socketInstance.on('upgrade', () => {
        console.log('🔄 Socket.IO 传输方式已升级到 WebSocket')
        console.log('📡 当前传输方式:', socketInstance.io?.engine?.transport?.name || 'unknown')
      })
      
      // 监听连接尝试
      if (socketInstance.io) {
        socketInstance.io.on('open', () => {
          console.log('🔄 Socket.IO 开始连接尝试...')
        })
        
        socketInstance.io.on('error', (error) => {
          console.error('❌ Socket.IO IO 错误:', error)
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
        currentUserId = userId // 更新当前用户ID

        // 重新发送用户上线事件
        socketInstance.emit('user:online', {
          userId,
          userInfo
        })

        // 重新注册通话信令监听（重连后 socket 可能变，需重新绑定）
        if (typeof onSocketConnectCallback === 'function') {
          try {
            onSocketConnectCallback()
          } catch (e) {
            console.warn('⚠️ onSocketConnectCallback(reconnect) 执行失败:', e)
          }
        }
      })

      // 重连失败
      socketInstance.on('reconnect_failed', () => {
        console.error('❌ 重连失败')
        isConnected = false
      })
    })
    // #endif

    // #ifdef APP-PLUS
    // App-Plus 真机环境使用 uni-socket.io（内部基于 uni.connectSocket）
    console.log('🔄 [APP-PLUS] 正在连接 Socket.IO 服务器...', SOCKET_URL)

    // 仅使用 websocket 容易在部分网络/设备上握手失败，改为先 polling 再升级 websocket
    const useWebsocketOnly = false
    socketInstance = ioApp(SOCKET_URL, {
      path: '/socket.io/',
      transports: useWebsocketOnly ? ['websocket'] : ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true,
      rememberUpgrade: false
    })

    return new Promise((resolve, reject) => {
      socketInstance.on('connect', () => {
        console.log('✅ [APP-PLUS] Socket.IO 连接成功:', socketInstance.id)
        isConnected = true
        currentUserId = userId

        socketInstance.emit('user:online', { userId, userInfo })
        resolve(socketInstance)
      })

      socketInstance.on('connect_error', (error) => {
        console.error('❌ [APP-PLUS] Socket.IO 连接错误:', error)
        isConnected = false
        reject(error)
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('⚠️ [APP-PLUS] Socket.IO 断开连接:', reason)
        isConnected = false
      })

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`✅ [APP-PLUS] 重连成功 (尝试 ${attemptNumber} 次)`)
        isConnected = true
        currentUserId = userId
        socketInstance.emit('user:online', { userId, userInfo })
      })

      socketInstance.on('reconnect_failed', () => {
        console.error('❌ [APP-PLUS] 重连失败')
        isConnected = false
      })
    })
    // #endif

    // #ifndef H5
    // 其它端（小程序等）暂不支持
    throw new Error('当前环境暂未实现 Socket.IO，请使用 H5 或 App-Plus')
    // #endif

  } catch (error) {
    console.error('❌ 初始化 Socket.IO 失败:', error)

    // 在 APP-PLUS 环境下，如果底层实现由于环境原因（如 document/DOM 不存在）报错，
    // 则降级为「关闭 Socket 实时功能，仅保留 HTTP」，避免整个页面崩溃。
    // 这里不再把错误抛到上层，而是返回一个“空实现”的 socketInstance。
    // #ifdef APP-PLUS
    console.warn('⚠️ [APP-PLUS] Socket.IO 初始化失败，已降级为无实时连接模式（仅 HTTP 轮询）。')
    socketInstance = {
      connected: false,
      id: 'mock_app_socket_id',
      on() {},
      off() {},
      emit() {},
      disconnect() {}
    }
    isConnected = false
    currentUserId = userId || null
    return socketInstance
    // #endif

    // 其它平台仍然抛出错误，保持原有行为
    throw error
  }
}

/**
 * 断开连接
 */
export function disconnectSocket() {
  if (socketInstance) {
    // #ifdef H5
    // 发送用户下线事件
    socketInstance.emit('user:offline')
    
    socketInstance.disconnect()
    // #endif
    
    socketInstance = null
    isConnected = false
    currentUserId = null
    console.log('✅ Socket.IO 已断开连接')
  }
}

/**
 * 发送消息
 * @param {string} toUserId - 接收者用户ID（医生ID）
 * @param {string} content - 消息内容
 * @param {string} type - 消息类型
 * @param {object} extra - 额外数据
 * @param {string} createdBy - 前台账号ID（创建者ID，用于保存咨询记录）
 */
export function sendMessage(toUserId, content, type = 'text', extra = {}, createdBy = null) {
  return new Promise((resolve, reject) => {
    // 如果 Socket.IO 连接未启用，返回模拟成功
    if (!ENABLE_SOCKET_CONNECTION) {
      console.log('📤 Socket.IO 连接已禁用，模拟消息发送成功:', {
        toUserId,
        type,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      })
      resolve({
        success: true,
        messageId: `msg_${Date.now()}_mock`,
        timestamp: Date.now()
      })
      return
    }
    
    if (!socketInstance || !isConnected) {
      reject(new Error('Socket.IO 未连接'))
      return
    }

    if (!currentUserId) {
      reject(new Error('用户ID未设置'))
      return
    }

    // #ifdef H5
    // 根据消息类型和大小调整超时时间
    // 图片消息（base64）通常较大，需要更长的超时时间
    const isImageMessage = type === 'image'
    const contentSize = content.length
    const timeoutDuration = isImageMessage ? 30000 : 10000 // 图片消息30秒，其他10秒
    
    console.log('📤 Socket.IO 发送消息:', {
      fromUserId: currentUserId,
      toUserId,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      type,
      contentSize: `${(contentSize / 1024).toFixed(2)} KB`,
      timeout: `${timeoutDuration / 1000}秒`
    })

    // 检查连接状态
    if (!socketInstance.connected) {
      reject(new Error('Socket.IO 连接已断开，请重新连接'))
      return
    }

    // 创建唯一标识，用于匹配响应
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    let timeoutCleared = false

    // 设置超时
    const timeout = setTimeout(() => {
      if (!timeoutCleared) {
        timeoutCleared = true
        console.error('❌ 发送消息超时:', {
          messageId,
          type,
          contentSize: `${(contentSize / 1024).toFixed(2)} KB`,
          timeout: `${timeoutDuration / 1000}秒`
        })
        reject(new Error(`发送消息超时（${timeoutDuration / 1000}秒）`))
      }
    }, timeoutDuration)

    // 监听发送成功确认
    const onSent = (data) => {
      if (!timeoutCleared) {
        timeoutCleared = true
        clearTimeout(timeout)
        console.log('✅ 消息发送确认收到:', data)
        resolve(data)
      }
    }

    // 监听发送错误
    const onError = (error) => {
      if (!timeoutCleared) {
        timeoutCleared = true
        clearTimeout(timeout)
        console.error('❌ 消息发送失败:', error)
        reject(new Error(error.error || '发送消息失败'))
      }
    }

    socketInstance.once('message:sent', onSent)
    socketInstance.once('message:error', onError)

    // 发送消息
    try {
      socketInstance.emit('message:send', {
        fromUserId: currentUserId,
        toUserId,
        content,
        type,
        extra,
        messageId, // 添加消息ID用于追踪
        createdBy // 传递前台账号ID（创建者ID）
      })
      console.log('📨 消息已发送，等待确认...')
    } catch (error) {
      if (!timeoutCleared) {
        timeoutCleared = true
        clearTimeout(timeout)
        socketInstance.off('message:sent', onSent)
        socketInstance.off('message:error', onError)
        console.error('❌ 发送消息异常:', error)
        reject(new Error('发送消息时发生异常: ' + (error.message || error)))
      }
    }
    // #endif

    // #ifndef H5
    reject(new Error('当前环境不支持发送消息'))
    // #endif
  })
}

/**
 * 监听接收消息
 * @param {function} callback - 消息回调函数
 */
export function onMessage(callback) {
  if (!socketInstance) {
    console.warn('⚠️ Socket.IO 未连接，无法监听消息')
    return
  }

  // #ifdef H5
  socketInstance.on('message:receive', (message) => {
    console.log('📨 收到消息:', message)
    if (typeof callback === 'function') {
      callback(message)
    }
  })
  // #endif
}

/**
 * 移除消息监听
 */
export function offMessage() {
  if (socketInstance) {
    // #ifdef H5
    socketInstance.off('message:receive')
    // #endif
  }
}

/**
 * 监听消息已读回执
 * @param {function} callback - 回调函数
 */
export function onMessageRead(callback) {
  if (!socketInstance) {
    return
  }

  // #ifdef H5
  socketInstance.on('message:read:ack', (data) => {
    console.log('✅ 消息已读:', data)
    if (typeof callback === 'function') {
      callback(data)
    }
  })
  // #endif
}

/**
 * 标记消息为已读
 * @param {array} messageIds - 消息ID数组
 * @param {string} fromUserId - 发送者用户ID
 */
export function markAsRead(messageIds, fromUserId) {
  if (!socketInstance || !isConnected) {
    return
  }

  if (!currentUserId) {
    return
  }

  // #ifdef H5
  socketInstance.emit('message:read', {
    messageIds,
    fromUserId,
    toUserId: currentUserId
  })
  // #endif
}

/**
 * 发送正在输入状态
 * @param {string} toUserId - 接收者用户ID
 */
export function startTyping(toUserId) {
  if (!socketInstance || !isConnected) {
    return
  }

  if (!currentUserId) {
    return
  }

  // #ifdef H5
  socketInstance.emit('typing:start', {
    fromUserId: currentUserId,
    toUserId
  })
  // #endif
}

/**
 * 停止正在输入状态
 * @param {string} toUserId - 接收者用户ID
 */
export function stopTyping(toUserId) {
  if (!socketInstance || !isConnected) {
    return
  }

  if (!currentUserId) {
    return
  }

  // #ifdef H5
  socketInstance.emit('typing:stop', {
    fromUserId: currentUserId,
    toUserId
  })
  // #endif
}

/**
 * 监听正在输入状态
 * @param {function} callback - 回调函数
 */
export function onTypingStatus(callback) {
  if (!socketInstance) {
    return
  }

  // #ifdef H5
  socketInstance.on('typing:status', (data) => {
    if (typeof callback === 'function') {
      callback(data)
    }
  })
  // #endif
}

/**
 * 检查连接状态
 */
export function isSocketConnected() {
  // #ifdef H5
  return isConnected && socketInstance && socketInstance.connected === true
  // #endif

  // #ifndef H5
  return false
  // #endif
}

/**
 * 获取 Socket 实例
 */
export function getSocketInstance() {
  return socketInstance
}

/**
 * ==================== 语音/视频通话相关函数 ====================
 */

/**
 * 发起通话
 * @param {string} toUserId - 接收者用户ID
 * @param {string} callType - 通话类型：'audio' | 'video'
 * @param {object} callerInfo - 主叫方信息
 */
export function initiateCall(toUserId, callType = 'video', callerInfo = {}) {
  return new Promise((resolve, reject) => {
    if (!socketInstance || !isConnected) {
      reject(new Error('Socket.IO 未连接'));
      return;
    }

    if (!currentUserId) {
      reject(new Error('用户ID未设置'));
      return;
    }

    // #ifdef H5
    socketInstance.emit('call:initiate', {
      toUserId,
      callType,
      callerInfo
    });

    // 监听发起成功
    const onInitiated = (data) => {
      socketInstance.off('call:initiated', onInitiated);
      socketInstance.off('call:error', onError);
      resolve(data);
    };

    const onError = (error) => {
      socketInstance.off('call:initiated', onInitiated);
      socketInstance.off('call:error', onError);
      reject(new Error(error.error || '发起通话失败'));
    };

    socketInstance.once('call:initiated', onInitiated);
    socketInstance.once('call:error', onError);
    // #endif

    // #ifndef H5
    reject(new Error('当前环境不支持通话功能'));
    // #endif
  });
}

/**
 * 接听通话
 * @param {string} callId - 通话ID
 */
export function acceptCall(callId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  socketInstance.emit('call:accept', { callId });
  // #endif
}

/**
 * 拒绝通话
 * @param {string} callId - 通话ID
 */
export function rejectCall(callId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  socketInstance.emit('call:reject', { callId });
  // #endif
}

/**
 * 挂断通话
 * @param {string} callId - 通话ID
 */
export function endCall(callId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  socketInstance.emit('call:end', { callId });
  // #endif
}

/**
 * 发送 WebRTC offer
 * @param {string} callId - 通话ID
 * @param {RTCSessionDescription} offer - SDP offer
 * @param {string} toUserId - 接收者用户ID
 */
export function sendCallOffer(callId, offer, toUserId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  socketInstance.emit('call:offer', {
    callId,
    offer: {
      type: offer.type,
      sdp: offer.sdp
    },
    toUserId
  });
  // #endif
}

/**
 * 发送 WebRTC answer
 * @param {string} callId - 通话ID
 * @param {RTCSessionDescription} answer - SDP answer
 * @param {string} toUserId - 接收者用户ID
 */
export function sendCallAnswer(callId, answer, toUserId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  socketInstance.emit('call:answer', {
    callId,
    answer: {
      type: answer.type,
      sdp: answer.sdp
    },
    toUserId
  });
  // #endif
}

/**
 * 发送 ICE 候选
 * @param {string} callId - 通话ID
 * @param {RTCIceCandidate} candidate - ICE 候选
 * @param {string} toUserId - 接收者用户ID
 */
export function sendIceCandidate(callId, candidate, toUserId) {
  if (!socketInstance || !isConnected) {
    return;
  }

  // #ifdef H5
  if (candidate) {
    // RTCIceCandidate 在某些浏览器中可能有 toJSON，但为了兼容性，手动序列化
    socketInstance.emit('call:ice-candidate', {
      callId,
      candidate: {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      },
      toUserId
    });
  }
  // #endif
}

/**
 * 监听来电
 * @param {function} callback - 回调函数
 */
export function onIncomingCall(callback) {
  if (!socketInstance) {
    return;
  }

  // #ifdef H5
  socketInstance.on('call:incoming', (data) => {
    if (typeof callback === 'function') {
      callback(data);
    }
  });
  // #endif
}

/**
 * 移除来电监听
 */
export function offIncomingCall() {
  if (socketInstance) {
    // #ifdef H5
    socketInstance.off('call:incoming');
    // #endif
  }
}

/**
 * 监听通话状态变化
 * @param {function} callback - 回调函数
 */
export function onCallStatusChange(callback) {
  if (!socketInstance) {
    return null;
  }

  // #ifdef H5
  const handlers = {
    'call:accepted': (data) => callback({ type: 'accepted', ...data }),
    'call:rejected': (data) => callback({ type: 'rejected', ...data }),
    'call:ended': (data) => callback({ type: 'ended', ...data }),
    'call:offer': (data) => {
      console.log('📥 [患者端-Socket] 收到 call:offer', { callId: data?.callId, hasOffer: !!data?.offer, fromUserId: data?.fromUserId });
      callback({ type: 'offer', ...data });
    },
    'call:answer': (data) => callback({ type: 'answer', ...data }),
    'call:ice-candidate': (data) => callback({ type: 'ice-candidate', ...data })
  };

  Object.keys(handlers).forEach(event => {
    socketInstance.on(event, handlers[event]);
  });
  console.log('✅ [患者端-Socket] 已注册通话信令监听 (含 call:offer)');

  // 返回清理函数
  return () => {
    Object.keys(handlers).forEach(event => {
      socketInstance.off(event, handlers[event]);
    });
  };
  // #endif

  // #ifndef H5
  return null;
  // #endif
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

