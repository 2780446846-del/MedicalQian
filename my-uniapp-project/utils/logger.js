/**
 * 可开关的 debug 日志（默认关闭）
 *
 * 使用方式（需要时临时打开）：
 * uni.setStorageSync('DEBUG_LOGS', true)
 * 关闭：
 * uni.removeStorageSync('DEBUG_LOGS')
 */

const DEBUG_KEY = 'DEBUG_LOGS'

export function isDebugEnabled() {
  try {
    return !!uni.getStorageSync(DEBUG_KEY)
  } catch (e) {
    return false
  }
}

export function debugLog(...args) {
  if (isDebugEnabled()) console.log(...args)
}

export function debugWarn(...args) {
  if (isDebugEnabled()) console.warn(...args)
}

