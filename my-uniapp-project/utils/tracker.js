/**
 * 用户行为埋点工具
 * 用于收集用户行为数据并发送到后端
 */
import { post } from './api.js'
import { getToken } from './auth.js'

// 埋点数据队列（用于批量发送）
let eventQueue = []
let isSending = false
const MAX_QUEUE_SIZE = 10 // 队列最大长度
const SEND_INTERVAL = 5000 // 5秒发送一次

// 是否启用埋点：
// - 本地开发/H5/手机端 环境下为了避免连接本地服务器报错，可以关闭
// - 真正上线并正确配置后端 CORS 后再改为 true
let ENABLE_TRACKING = false
// #ifdef PROD
ENABLE_TRACKING = true
// #endif

/**
 * 获取设备信息
 */
function getDeviceInfo() {
  const systemInfo = uni.getSystemInfoSync()
  return {
    platform: systemInfo.platform,
    system: systemInfo.system,
    version: systemInfo.version,
    screenWidth: systemInfo.screenWidth,
    screenHeight: systemInfo.screenHeight,
    windowWidth: systemInfo.windowWidth,
    windowHeight: systemInfo.windowHeight,
    pixelRatio: systemInfo.pixelRatio,
    language: systemInfo.language,
  }
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  try {
    const token = getToken()
    // 如果有 token，可以从 token 中解析用户ID（需要根据你的 token 结构调整）
    return {
      userId: token ? 'logged_in' : 'anonymous',
      timestamp: new Date().toISOString(),
    }
  } catch (e) {
    return {
      userId: 'anonymous',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 发送埋点数据
 */
async function sendEvents(events) {
  // 如果当前不启用埋点，直接返回
  if (!ENABLE_TRACKING) return

  if (isSending || events.length === 0) return
  
  isSending = true
  try {
    // 实际发送埋点数据到后端
    await post('/tracking/events', {
      events: events,
      deviceInfo: getDeviceInfo(),
    }, {
      showLoading: false,
      showError: false, // 埋点失败不显示错误提示
    })
    // 清空已发送的队列
    eventQueue = []
    
    // 开发环境下可以保留日志用于调试（可选）
    // console.log('埋点数据已发送:', events.length, '条')
  } catch (error) {
    console.warn('埋点数据发送失败:', error)
    // 失败时保留数据，下次重试
  } finally {
    isSending = false
  }
}

/**
 * 定时发送埋点数据
 */
function startAutoSend() {
  setInterval(() => {
    if (eventQueue.length > 0 && !isSending) {
      sendEvents([...eventQueue])
    }
  }, SEND_INTERVAL)
}

// 启动自动发送
startAutoSend()

/**
 * 页面浏览埋点
 * @param {string} pageName 页面名称
 * @param {Object} params 额外参数
 */
export function trackPageView(pageName, params = {}) {
  const event = {
    type: 'page_view',
    pageName,
    ...getUserInfo(),
    ...params,
  }
  
  eventQueue.push(event)
  
  // 如果队列满了，立即发送
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    sendEvents([...eventQueue])
  }
}

/**
 * 点击事件埋点
 * @param {string} eventName 事件名称
 * @param {Object} params 额外参数
 */
export function trackClick(eventName, params = {}) {
  const event = {
    type: 'click',
    eventName,
    ...getUserInfo(),
    ...params,
  }
  
  eventQueue.push(event)
  
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    sendEvents([...eventQueue])
  }
}

/**
 * 自定义事件埋点
 * @param {string} eventName 事件名称
 * @param {string} eventType 事件类型（如：search, submit, error等）
 * @param {Object} params 额外参数
 */
export function trackEvent(eventName, eventType = 'custom', params = {}) {
  const event = {
    type: eventType,
    eventName,
    ...getUserInfo(),
    ...params,
  }
  
  eventQueue.push(event)
  
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    sendEvents([...eventQueue])
  }
}

/**
 * 错误埋点
 * @param {string} errorMessage 错误信息
 * @param {Object} errorInfo 错误详情
 */
export function trackError(errorMessage, errorInfo = {}) {
  const event = {
    type: 'error',
    eventName: 'error',
    errorMessage,
    ...getUserInfo(),
    ...errorInfo,
  }
  
  // 错误立即发送
  sendEvents([event])
}

/**
 * 性能埋点
 * @param {string} metricName 性能指标名称
 * @param {number} value 性能值
 * @param {Object} params 额外参数
 */
export function trackPerformance(metricName, value, params = {}) {
  const event = {
    type: 'performance',
    eventName: metricName,
    value,
    ...getUserInfo(),
    ...params,
  }
  
  eventQueue.push(event)
  
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    sendEvents([...eventQueue])
  }
}

/**
 * 立即发送所有待发送的埋点数据
 */
export function flush() {
  if (eventQueue.length > 0 && !isSending) {
    sendEvents([...eventQueue])
  }
}

// 页面隐藏时发送数据
uni.onAppHide(() => {
  flush()
})

// 页面卸载时发送数据（H5环境）
// #ifdef H5
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush)
}
// #endif

