/**
 * 单点登录认证工具
 * 与vue3后台管理系统共享token
 */

// API基础URL - 从config.js导入，自动根据运行环境切换
import { API_BASE_URL } from './config.js'

// Token存储key（与vue3项目保持一致）
// 说明：
// - 新版单点登录使用 `sso_token`
// - 旧版uni-app页面大量使用 `token`
// 为了兼容两种存储方式，这里统一做双向兼容处理
const TOKEN_KEY = 'sso_token'
const LEGACY_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'sso_refresh_token'
const USER_INFO_KEY = 'sso_user_info'

/**
 * 获取token
 */
export function getToken() {
  // H5环境下，优先从localStorage读取（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    // 先尝试读取 sso_token
    let token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      // 同步到uni.storage（保持兼容）
      uni.setStorageSync(TOKEN_KEY, token)
      uni.setStorageSync(LEGACY_TOKEN_KEY, token) // 同时同步到旧KEY
      return token
    }
    // 如果sso_token没有，尝试读取旧的token
    token = localStorage.getItem(LEGACY_TOKEN_KEY)
    if (token) {
      // 同步到新KEY和uni.storage
      localStorage.setItem(TOKEN_KEY, token)
      uni.setStorageSync(TOKEN_KEY, token)
      uni.setStorageSync(LEGACY_TOKEN_KEY, token)
      return token
    }
  }
  // #endif
  
  // 1）优先读取新版KEY：sso_token
  let token = uni.getStorageSync(TOKEN_KEY)
  if (token) {
    // 同步到旧KEY（保持兼容）
    uni.setStorageSync(LEGACY_TOKEN_KEY, token)
    // #ifdef H5
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(LEGACY_TOKEN_KEY, token)
    }
    // #endif
    return token
  }

  // 2）兼容旧版KEY：token（很多页面直接用了这个KEY）
  const legacyToken = uni.getStorageSync(LEGACY_TOKEN_KEY)
  if (legacyToken) {
    // 发现旧KEY有值时，同步一份到新KEY，避免后续读不到
    uni.setStorageSync(TOKEN_KEY, legacyToken)
    // #ifdef H5
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, legacyToken)
      localStorage.setItem(LEGACY_TOKEN_KEY, legacyToken)
    }
    // #endif
    console.log('✅ 从旧KEY读取token并同步到新KEY')
    return legacyToken
  }

  return null
}

/**
 * 保存token
 */
export function setToken(token) {
  if (!token) {
    console.warn('setToken: token为空')
    return
  }
  
  // H5环境下，优先保存到localStorage（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
  // 通知其他窗口token已更新（跨端口通信）
  if (typeof window !== 'undefined') {
    // 获取 refreshToken 和 userInfo 一起发送
    const refreshToken = getRefreshToken()
    const userInfo = getUserInfo()
    const message = { 
      type: 'token_updated', 
      key: TOKEN_KEY, 
      value: token,
      refreshToken: refreshToken,
      userInfo: userInfo,
      source: 'uniapp'
    }
    
    // 使用 window.postMessage 向所有可能的窗口发送（包括父窗口和子窗口）
    // 尝试向 Vue3 端口发送消息
    try {
      // 向父窗口发送（如果 Vue3 是通过 window.open 打开的 UniApp）
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage(message, 'http://localhost:5174')
        console.log('UniApp通过window.opener发送token到Vue3')
      }
      
      // 向所有子窗口发送（如果 UniApp 打开了 Vue3）
      if (window.frames && window.frames.length > 0) {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage(message, 'http://localhost:5174')
            console.log('UniApp通过window.frames发送token到Vue3')
          } catch (e) {
            // 忽略跨域错误
          }
        }
      }
    } catch (e) {
      console.log('UniApp无法直接访问Vue3窗口:', e.message)
    }
    
    // 同时使用 BroadcastChannel（同源内通信，作为备用）
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('sso_token_channel')
      channel.postMessage(message)
      console.log('UniApp发送 token_updated 消息 (BroadcastChannel):', {
        type: message.type,
        key: message.key,
        tokenLength: message.value?.length,
        hasRefreshToken: !!message.refreshToken,
        hasUserInfo: !!message.userInfo
      })
      setTimeout(() => channel.close(), 100)
    }
    
    console.log('UniApp已发送token更新消息，token长度:', token.length)
  }
  // #endif
  // 同时保存到uni.storage（保持兼容）
  // 1）保存到新的单点登录KEY
  uni.setStorageSync(TOKEN_KEY, token)
  // 2）为兼容旧代码，再保存一份到旧KEY：token
  uni.setStorageSync(LEGACY_TOKEN_KEY, token)
  console.log('Token已保存，长度:', token.length, '（sso_token 与 token 双KEY同步）')
}

/**
 * 获取刷新token
 */
export function getRefreshToken() {
  // H5环境下，优先从localStorage读取（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (token) {
      uni.setStorageSync(REFRESH_TOKEN_KEY, token)
      return token
    }
  }
  // #endif
  return uni.getStorageSync(REFRESH_TOKEN_KEY) || null
}

/**
 * 保存刷新token
 */
export function setRefreshToken(refreshToken) {
  uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  // H5环境下，同时保存到localStorage（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
  // #endif
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  // H5环境下，优先从localStorage读取（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    const userInfo = localStorage.getItem(USER_INFO_KEY)
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo)
        // 同步到uni.storage（保持兼容）
        uni.setStorageSync(USER_INFO_KEY, userInfo)
        return parsed
      } catch (e) {
        console.error('Failed to parse user info from localStorage:', e)
      }
    }
  }
  // #endif
  
  // 1）优先读取新版KEY：sso_user_info
  let userInfo = uni.getStorageSync(USER_INFO_KEY)
  if (userInfo) {
    try {
      const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
      // 同步到旧KEY（保持兼容）
      uni.setStorageSync('userInfo', parsed)
      // #ifdef H5
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('userInfo', JSON.stringify(parsed))
      }
      // #endif
      return parsed
    } catch (e) {
      console.error('Failed to parse user info:', e)
    }
  }
  
  // 2）兼容旧版KEY：userInfo（很多页面直接用了这个KEY）
  const legacyUserInfo = uni.getStorageSync('userInfo')
  if (legacyUserInfo) {
    try {
      const parsed = typeof legacyUserInfo === 'string' ? JSON.parse(legacyUserInfo) : legacyUserInfo
      // 发现旧KEY有值时，同步一份到新KEY，避免后续读不到
      uni.setStorageSync(USER_INFO_KEY, JSON.stringify(parsed))
      // #ifdef H5
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(parsed))
        localStorage.setItem('userInfo', JSON.stringify(parsed))
      }
      // #endif
      console.log('✅ 从旧KEY读取用户信息并同步到新KEY')
      return parsed
    } catch (e) {
      console.error('Failed to parse legacy user info:', e)
    }
  }
  
  return null
}

/**
 * 保存用户信息
 */
export function setUserInfo(userInfo) {
  uni.setStorageSync(USER_INFO_KEY, JSON.stringify(userInfo))
  // H5环境下，同时保存到localStorage（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
  }
  // #endif
}

/**
 * 清除所有认证信息
 */
export function clearAuth() {
  // 清除新版 SSO token 相关
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  uni.removeStorageSync(USER_INFO_KEY)
  
  // 清除旧版 token 和 userInfo（兼容旧代码）
  uni.removeStorageSync(LEGACY_TOKEN_KEY)
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('userProfile')
  uni.removeStorageSync('userProfilesById')
  uni.removeStorageSync('currentUserId')
  
  // H5环境下，同时清除localStorage（与Vue3共享）
  // #ifdef H5
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem('userInfo')
    localStorage.removeItem('sso_manual_logout') // 清除手动登出标记
  }
  
  // 通知其他窗口token已清除
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('sso_token_channel')
      channel.postMessage({ 
        type: 'token_cleared', 
        key: TOKEN_KEY,
        source: 'uniapp'
      })
      setTimeout(() => channel.close(), 100)
    } catch (e) {
      console.error('BroadcastChannel 发送失败:', e)
    }
  }
  
  // 使用 window.postMessage 通知其他窗口（H5环境）
  if (typeof window !== 'undefined' && window.postMessage) {
    try {
      // 向父窗口发送（如果存在）
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage({ 
          type: 'token_cleared', 
          key: TOKEN_KEY,
          source: 'uniapp'
        }, '*')
      }
      
      // 向所有子窗口发送
      if (window.frames && window.frames.length > 0) {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage({ 
              type: 'token_cleared', 
              key: TOKEN_KEY,
              source: 'uniapp'
            }, '*')
          } catch (e) {
            // 忽略跨域错误
          }
        }
      }
    } catch (e) {
      console.error('postMessage 发送失败:', e)
    }
  }
  // #endif
  
  console.log('✅ 已清除所有认证信息和用户数据')
}

/**
 * 检查是否已登录
 */
export function isAuthenticated() {
  return !!getToken()
}

/**
 * 登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise} 登录结果
 */
export function login(username, password) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/auth/login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        username,
        password,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const { token, refreshToken, user } = res.data
          
          console.log('登录成功，收到token:', token ? `长度${token.length}` : '无token')
          if (token) {
            console.log('登录时收到的token前20个字符:', token.substring(0, 20))
            console.log('登录时收到的token后20个字符:', token.substring(token.length - 20))
          }
          
          // 保存token和用户信息
          if (token) {
            setToken(token)
            // 验证token是否已保存
            const savedToken = getToken()
            console.log('Token保存后验证，已保存:', !!savedToken, savedToken ? `长度${savedToken.length}` : '')
            if (savedToken) {
              console.log('保存后的token前20个字符:', savedToken.substring(0, 20))
              console.log('保存后的token后20个字符:', savedToken.substring(savedToken.length - 20))
              // 对比token是否一致
              if (token !== savedToken) {
                console.error('⚠️ 警告: 保存的token与收到的token不一致！')
                console.error('原始token:', token)
                console.error('保存的token:', savedToken)
              } else {
                console.log('✅ Token保存一致')
              }
            }
          } else {
            console.error('登录响应中未包含token')
          }
          if (refreshToken) {
            setRefreshToken(refreshToken)
          }
          if (user) {
            setUserInfo(user)
            // H5环境下，同时保存到localStorage（与Vue3共享）
            // #ifdef H5
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(USER_INFO_KEY, JSON.stringify(user))
            }
            // #endif
          }
          
          resolve(res.data)
        } else {
          reject(new Error(res.data?.message || '登录失败'))
        }
      },
      fail: (err) => {
        console.error('Login request failed:', err)
        reject(new Error('网络请求失败，请检查网络连接'))
      },
    })
  })
}

/**
 * 登出
 */
export function logout() {
  return new Promise((resolve) => {
    // 先调用后端登出接口，删除会话（用于单点登录）
    const token = getToken()
    if (token) {
      // 清理token，移除可能的特殊字符
      const cleanToken = token.trim().replace(/[^a-zA-Z0-9\-_.]/g, '')
      
      uni.request({
        url: `${API_BASE_URL}/auth/logout`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${cleanToken}`,
          'authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('✅ UniApp 登出成功，后端会话已删除')
          } else {
            console.log('⚠️ UniApp 登出请求失败，但继续清除本地token')
          }
          // 无论后端请求是否成功，都清除本地认证信息
          clearAuth()
          resolve(true)
        },
        fail: (err) => {
          console.error('UniApp 登出请求失败:', err)
          // 即使请求失败，也清除本地认证信息
          clearAuth()
          resolve(true)
        }
      })
    } else {
      // 没有token，直接清除本地认证信息
      clearAuth()
      resolve(true)
    }
  })
}

/**
 * 刷新token
 * @returns {Promise<string|null>} 新的token
 */
export function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/auth/refresh`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        refreshToken,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.token) {
          setToken(res.data.token)
          resolve(res.data.token)
        } else {
          // 刷新失败，清除认证信息
          clearAuth()
          resolve(null)
        }
      },
      fail: (err) => {
        console.error('Token refresh failed:', err)
        clearAuth()
        resolve(null)
      },
    })
  })
}

/**
 * 验证token是否有效
 * @returns {Promise<boolean>} token是否有效
 */
export function validateToken() {
  const token = getToken()
  if (!token) {
    console.log('validateToken: 未找到token')
    return Promise.resolve(false)
  }

  console.log('validateToken: 开始验证token，token长度:', token.length, '前20个字符:', token.substring(0, 20))
  console.log('validateToken: token后20个字符:', token.substring(token.length - 20))

  return new Promise((resolve) => {
    // 清理token，移除可能的空格、换行符和特殊字符
    // 但保留JWT token的有效字符（字母、数字、-、_、.）
    let cleanToken = token.trim()
    // 移除所有非JWT有效字符（只保留字母、数字、-、_、.）
    cleanToken = cleanToken.replace(/[^a-zA-Z0-9\-_.]/g, '')
    console.log('发送验证请求，清理后的token长度:', cleanToken.length)
    console.log('清理后的token前20个字符:', cleanToken.substring(0, 20))
    console.log('清理后的token后20个字符:', cleanToken.substring(cleanToken.length - 20))
    console.log('原始token长度:', token.length, '清理后长度:', cleanToken.length)
    
    uni.request({
      url: `${API_BASE_URL}/auth/validate`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${cleanToken}`,
        'authorization': `Bearer ${cleanToken}`, // H5环境下兼容性处理
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 更新用户信息
          if (res.data?.user) {
            setUserInfo(res.data.user)
          }
          resolve(true)
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          // Token无效或过期
          console.log('Token验证失败，状态码:', res.statusCode)
          console.log('错误信息:', res.data?.message || '未知错误')
          console.log('响应数据:', res.data)
          
          // 检查是否是会话失效（用户在其他地方登出）
          if (res.data?.sessionExpired) {
            console.log('⚠️ 会话已失效，清除本地token（可能在其他地方已登出）')
            console.log('⚠️ 这通常发生在：1) Vue3登出后删除了会话 2) 后端会话被清除')
            // 清除本地认证信息
            clearAuth()
            resolve(false)
            return
          }
          
          // 检查是否有refreshToken
          const refreshToken = getRefreshToken()
          if (!refreshToken) {
            console.log('没有refreshToken，无法刷新，需要重新登录')
            clearAuth()  // 清除认证信息
            resolve(false)
            return
          }
          
          console.log('尝试刷新token...')
          refreshAccessToken()
            .then((newToken) => {
              if (newToken) {
                console.log('✅ Token刷新成功')
                // 刷新成功，重新验证新token
                validateToken().then(resolve).catch(() => resolve(false))
              } else {
                console.log('❌ Token刷新失败，需要重新登录')
                clearAuth()  // 清除认证信息
                resolve(false)
              }
            })
            .catch((err) => {
              console.error('刷新token失败:', err)
              clearAuth()  // 清除认证信息
              resolve(false)
            })
        } else {
          console.error('Token验证失败，状态码:', res.statusCode, '响应:', res.data)
          resolve(false)
        }
      },
      fail: (err) => {
        console.error('validateToken请求失败:', err)
        console.error('请求URL:', `${API_BASE_URL}/auth/validate`)
        console.error('请求头:', {
          'Authorization': `Bearer ${token?.substring(0, 20)}...`,
          'authorization': `Bearer ${token?.substring(0, 20)}...`
        })
        resolve(false)
      },
    })
  })
}

