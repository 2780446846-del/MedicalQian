import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// 扩展 Window 接口以支持自定义属性
declare global {
  interface Window {
    ssoMessageListener?: (event: MessageEvent) => void
  }
}

export interface Permission {
  id: string
  name: string
  code: string
  type: string
  module: string
}

export interface Role {
  id: string
  name: string
  code: string
}

// 同时支持从 rbac store 导入类型（如果存在）
try {
  const rbacModule = require('./rbac')
  if (rbacModule.Role) {
    // 类型兼容，不覆盖
  }
} catch {
  // rbac store 可能不存在，忽略
}

interface UserInfo {
  id: string
  username: string
  email?: string
  avatar?: string
  role?: Role | string  // 支持单个角色（向后兼容）
  roles?: Role[]        // 支持角色数组
  permissions?: Permission[]
}

interface LoginResponse {
  token: string
  refreshToken?: string
  user: UserInfo
  success?: boolean
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('sso_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('sso_refresh_token'))
  const userInfo = ref<UserInfo | null>(null)
  const isAuthenticated = computed(() => !!token.value)

  // 标记用户是否主动登出（防止自动同步）
  // 从 localStorage 读取，防止刷新后自动同步
  const isManualLogout = ref(localStorage.getItem('sso_manual_logout') === 'true')

  // 同步 localStorage 到 store（用于单点登录）
  const syncFromLocalStorage = () => {
    // 如果用户主动登出，不自动同步
    if (isManualLogout.value) {
      return
    }

    const storedToken = localStorage.getItem('sso_token')
    const storedRefreshToken = localStorage.getItem('sso_refresh_token')
    const storedUserInfo = localStorage.getItem('sso_user_info')

    if (storedToken && storedToken !== token.value) {
      token.value = storedToken
      console.log('从 localStorage 同步 token')
    }

    if (storedRefreshToken && storedRefreshToken !== refreshToken.value) {
      refreshToken.value = storedRefreshToken
    }

    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo)
        userInfo.value = parsed
      } catch (e) {
        console.error('Failed to parse user info from localStorage:', e)
      }
    }
  }

  // 监听跨窗口token变化（用于单点登录）
  // 使用 window.postMessage 实现跨端口通信
  if (typeof window !== 'undefined') {
    console.log('Vue3 初始化SSO通信监听器')

    // 监听来自UniApp的消息
    if (!window.ssoMessageListener) {
      window.ssoMessageListener = (event: MessageEvent) => {
        // 只接受来自 UniApp 的消息
        if (event.origin === 'http://localhost:5173' && event.data) {
          console.log('Vue3收到来自UniApp的消息:', event.data)
          const { type, key, value: msgToken, refreshToken: msgRefreshToken, userInfo: msgUserInfo } = event.data

          if (type === 'token_updated' && key === 'sso_token') {
            if (msgToken) {
              token.value = msgToken
              localStorage.setItem('sso_token', msgToken)
              if (msgRefreshToken) {
                refreshToken.value = msgRefreshToken
                localStorage.setItem('sso_refresh_token', msgRefreshToken)
              }
              if (msgUserInfo) {
                userInfo.value = msgUserInfo
                localStorage.setItem('sso_user_info', JSON.stringify(msgUserInfo))
              }
              console.log('Vue3收到 token_updated 消息，已同步 token')
            }
          } else if (type === 'token_response' && key === 'sso_token') {
            if (msgToken) {
              token.value = msgToken
              localStorage.setItem('sso_token', msgToken)
              if (msgRefreshToken) {
                refreshToken.value = msgRefreshToken
                localStorage.setItem('sso_refresh_token', msgRefreshToken)
              }
              if (msgUserInfo) {
                userInfo.value = msgUserInfo
                localStorage.setItem('sso_user_info', JSON.stringify(msgUserInfo))
              }
              console.log('Vue3收到 token_response 消息，已同步 token')
            }
          }
        }
      }
      window.addEventListener('message', window.ssoMessageListener)
      console.log('Vue3已设置message监听器，监听来自 http://localhost:5173 的消息')
    }
  }

  // 同时使用 BroadcastChannel（同源内通信，作为备用）
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('sso_token_channel')
    console.log('Vue3 BroadcastChannel 监听器已初始化')

    channel.onmessage = (event) => {
      console.log('Vue3收到BroadcastChannel消息:', event.data)
      const { type, key, value, refreshToken: msgRefreshToken, userInfo: msgUserInfo } = event.data
      if (type === 'token_updated' && key === 'sso_token') {
        // 保存 token
        token.value = value
        localStorage.setItem('sso_token', value)

        // 保存 refreshToken（如果消息中包含）
        if (msgRefreshToken) {
          refreshToken.value = msgRefreshToken
          localStorage.setItem('sso_refresh_token', msgRefreshToken)
        }

        // 保存用户信息（如果消息中包含）
        if (msgUserInfo) {
          userInfo.value = msgUserInfo
          localStorage.setItem('sso_user_info', JSON.stringify(msgUserInfo))
        } else {
          // 如果没有，尝试从 localStorage 读取
          const storedUserInfo = localStorage.getItem('sso_user_info')
          if (storedUserInfo) {
            try {
              userInfo.value = JSON.parse(storedUserInfo)
            } catch (e) {
              console.error('Failed to parse user info:', e)
            }
          }
        }

        // 同步 refreshToken（如果消息中没有）
        if (!msgRefreshToken) {
          const storedRefreshToken = localStorage.getItem('sso_refresh_token')
          if (storedRefreshToken) {
            refreshToken.value = storedRefreshToken
          }
        }

        console.log('收到 token_updated 消息，已同步 token')
      } else if (type === 'token_request') {
        // 收到 token 请求，回复当前 token（如果存在）
        if (token.value) {
          channel.postMessage({
            type: 'token_response',
            key: 'sso_token',
            value: token.value,
            refreshToken: refreshToken.value,
            userInfo: userInfo.value
          })
        }
      } else if (type === 'token_response' && key === 'sso_token') {
        // 收到 token 响应，保存 token
        token.value = value
        localStorage.setItem('sso_token', value)
        if (msgRefreshToken) {
          refreshToken.value = msgRefreshToken
          localStorage.setItem('sso_refresh_token', msgRefreshToken)
        }
        if (msgUserInfo) {
          userInfo.value = msgUserInfo
          localStorage.setItem('sso_user_info', JSON.stringify(msgUserInfo))
        }
        console.log('收到 token_response 消息，已同步 token')
      } else if (type === 'token_cleared' && key === 'sso_token') {
        token.value = null
        refreshToken.value = null
        userInfo.value = null
        localStorage.removeItem('sso_token')
        localStorage.removeItem('sso_refresh_token')
        localStorage.removeItem('sso_user_info')
        // 如果当前不在登录页，跳转到登录页
        if (window.location.pathname !== '/login') {
          // 使用动态导入router避免循环依赖
          import('../router').then(({ default: router }) => {
            router.push('/login')
          })
        }
      }
    }

    // 注意：BroadcastChannel 没有 onerror 属性
    // 错误处理应该在 try-catch 中进行，或者监听 messageerror 事件
    channel.onmessageerror = (event: MessageEvent) => {
      console.error('Vue3 BroadcastChannel 消息错误:', event)
    }

    // ⚠️ 注意：不同端口无法直接通信
    // localhost:5173 (UniApp) 和 localhost:5174 (Vue3) 被视为不同源
    // 因此 BroadcastChannel 和 window.postMessage 都无法跨端口通信
    //
    // 可行的解决方案：
    // 1. 使用 Cookie（但不同端口的 Cookie 也是隔离的）
    // 2. 使用后端 API 同步状态（推荐）
    // 3. 将两个应用部署到同一域名下的不同路径（如 /uniapp 和 /admin）
    // 4. 手动同步（在登录页面添加"从 UniApp 同步"按钮）

    console.log('Vue3 SSO 通信已初始化')
    console.log('⚠️ 不同端口无法直接通信，需要其他方案实现单点登录')

    // 生产环境推荐方案：后端 API 同步
    // 在启动时，通过后端 API 检查是否有其他客户端（如 UniApp）已登录
    // 如果检测到有效会话，自动同步 token 和用户信息

    console.log('Vue3 SSO 通信已初始化')

    // 启动时同步登录状态（从后端 API）
    // 注意：admin-auth 路由中没有 sync 接口，所以暂时跳过同步功能
    const syncLoginStatus = async () => {
      // 暂时跳过同步功能，因为 admin-auth 路由中没有 sync 接口
      return
      
      /* 如果将来需要同步功能，可以在这里添加
      try {
        console.log('Vue3 开始同步登录状态...')
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
        const response = await fetch(`${apiUrl}/admin-auth/sync`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (response.ok) {
          const data = await response.json()
          // ... 处理同步逻辑
        }
      } catch (error) {
        console.log('同步登录状态失败:', error)
      }
      */
    }

    // 立即尝试同步
    syncLoginStatus()

    // 页面可见时也尝试同步（用户切换标签页回来时）
    // 但如果用户主动登出，就不应该自动同步
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !token.value && !isManualLogout.value) {
          syncLoginStatus()
        }
      })
    }
  }

  // 获取正确的API基础URL（统一处理端口问题）
  const getApiBaseUrl = (): string => {
    let apiBaseUrl = import.meta.env.VITE_API_BASE_URL
    if (!apiBaseUrl) {
      apiBaseUrl = 'http://localhost:3000/api'
    } else {
      // 如果环境变量配置了错误的端口（3001），强制改为3000
      apiBaseUrl = apiBaseUrl.replace(':3001', ':3000')
    }
    return apiBaseUrl
  }

  // 初始化时从localStorage恢复用户信息
  const initUserInfo = () => {
    const stored = localStorage.getItem('sso_user_info')
    if (stored) {
      try {
        userInfo.value = JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse user info:', e)
      }
    }
  }

  // 登录
  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      // 获取API基础URL，确保使用正确的端口
      const apiBaseUrl = getApiBaseUrl()
      const loginUrl = `${apiBaseUrl}/admin-auth/login`
      
      console.log('🔐 尝试登录，API地址:', loginUrl)
      console.log('🔍 环境变量 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
      
      // 调用后端管理员登录API（用于 vue3-ts 后台管理，数据存储到 users-ht 集合）
      const response = await fetch(loginUrl, {
        method: 'POST',
        credentials: 'include', // 重要：包含 Cookie（用于单点登录）
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        // 尝试解析错误信息
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: '登录失败' }
        }
        throw new Error(errorData.message || '登录失败')
      }

      const responseData = await response.json()

      // 处理后端返回的数据格式（可能包含 success, data, user 等字段）
      const data: LoginResponse = {
        token: responseData.token,
        user: responseData.user || responseData.data,
        refreshToken: responseData.refreshToken,
        success: responseData.success
      }

      // 验证返回数据格式
      if (!data.token || !data.user) {
        throw new Error('服务器返回数据格式错误：缺少token或用户信息')
      }

      // 保存token和用户信息
      token.value = data.token
      if (data.refreshToken) {
        refreshToken.value = data.refreshToken
        localStorage.setItem('sso_refresh_token', data.refreshToken)
      }
      userInfo.value = data.user

      localStorage.setItem('sso_token', data.token)
      localStorage.setItem('sso_user_info', JSON.stringify(data.user))

      // 登录成功后，加载用户权限信息
      try {
        const { usePermission } = await import('@/composables/usePermission')
        const { fetchPermissions } = usePermission()
        await fetchPermissions()
      } catch (error) {
        console.warn('加载用户权限失败:', error)
      }
      
      // 同步角色到RBAC store（如果存在）
      if (data.user.role) {
        try {
          const { useRbacStore } = await import('./rbac')
          const rbacStore = useRbacStore()
          const role = typeof data.user.role === 'string' 
            ? { id: '', code: data.user.role, name: data.user.role } 
            : data.user.role
          rbacStore.setRole(role as Role)
        } catch (error) {
          // RBAC store 可能不存在，忽略错误
          console.warn('RBAC store 未找到，跳过角色同步:', error)
        }
      }

      // 登录成功后，重置手动登出标志
      isManualLogout.value = false
      localStorage.removeItem('sso_manual_logout')

      // 通知其他窗口token已更新
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('sso_token_channel')
        channel.postMessage({ type: 'token_updated', key: 'sso_token', value: data.token })
        channel.close()
      }

      console.log('✅ 登录成功')
      return data
    } catch (error) {
      console.error('❌ Login error:', error)
      
      // 处理网络错误，提供更友好的错误提示
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiBaseUrl = getApiBaseUrl()
        throw new Error(`无法连接到后端服务器（${apiBaseUrl}）。请确保后端服务已启动并运行在正确的端口。`)
      }
      
      // 处理其他错误
      if (error instanceof Error) {
      throw error
      }
      
      throw new Error('登录失败，请稍后重试')
    }
  }

  // 登出
  const logout = async () => {
    // 标记为主动登出，防止自动同步
    isManualLogout.value = true

    // 调用后端登出接口，删除会话
    try {
      const tokenValue = token.value
      if (tokenValue) {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenValue}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => {
          // 忽略错误，继续清除本地数据
        })
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    }

    // 清除本地数据
    token.value = null
    refreshToken.value = null
    userInfo.value = null
    localStorage.removeItem('sso_token')
    localStorage.removeItem('sso_refresh_token')
    localStorage.removeItem('sso_user_info')
    
    // 清除RBAC角色
    import('./rbac').then(({ useRbacStore }) => {
      const rbacStore = useRbacStore()
      rbacStore.setRole(null)
    })
    
    // 清除所有医生的上岗状态（退出登录时清除所有上岗记录）
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('doctor_duty_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('✅ 已清除所有上岗状态')

    // 通知其他窗口token已清除
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('sso_token_channel')
      channel.postMessage({ type: 'token_cleared', key: 'sso_token' })
      channel.close()
    }
  }

  // 刷新token（使用与uniapp相同的API地址）
  const refreshAccessToken = async (): Promise<string | null> => {
    if (!refreshToken.value) {
      return null
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      token.value = data.token
      localStorage.setItem('sso_token', data.token)

      return data.token
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      return null
    }
  }

  // 验证token是否有效（使用与uniapp相同的API地址）
  const validateToken = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          userInfo.value = data.user
          localStorage.setItem('sso_user_info', JSON.stringify(data.user))
        }
        return true
      }

      // Token无效，尝试刷新
      if (refreshToken.value) {
        const newToken = await refreshAccessToken()
        return !!newToken
      }

      return false
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }

  // 获取token（用于API请求）
  const getToken = (): string | null => {
    // 每次获取时同步一次，确保单点登录正常工作
    syncFromLocalStorage()
    return token.value
  }

  // 权限检查方法
  const hasPermission = (permissionCode: string) => {
    if (!userInfo.value?.permissions) return false

    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) {
      return true
    }

    // 直接匹配权限编码
    const directMatch = userInfo.value.permissions.some(p => p.code === permissionCode)
    if (directMatch) {
      return true
    }

    // 如果没有直接匹配，检查是否有该模块下的任何操作权限
    const moduleMatch = userInfo.value.permissions.some(p =>
      p.code.startsWith(permissionCode + ':')
    )

    return moduleMatch
  }

  // 角色检查方法
  const hasRole = (roleCode: string) => {
    if (!userInfo.value?.roles) return false
    return userInfo.value.roles.some(r => r.code === roleCode)
  }

  // 模块权限检查方法
  const hasModulePermission = (module: string) => {
    if (!userInfo.value?.permissions) return false
    
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) {
      return true
    }
    
    return userInfo.value.permissions.some(p => p.module === module)
  }

  // 是否为超级管理员
  const isSuperAdmin = computed(() => {
    // 检查 roles 数组
    if (userInfo.value?.roles && Array.isArray(userInfo.value.roles)) {
      if (userInfo.value.roles.some(r => {
        const code = typeof r === 'string' ? r : r.code
        return code === 'super_admin'
      })) {
        return true
      }
    }
    
    // 检查单个 role 字段（向后兼容）
    if (userInfo.value?.role) {
      const roleCode = typeof userInfo.value.role === 'string' 
        ? userInfo.value.role 
        : userInfo.value.role.code
      if (roleCode === 'super_admin') {
        return true
      }
    }
    
    // 检查用户名是否为 admin（超级管理员标识）
    if (userInfo.value?.username && userInfo.value.username.toLowerCase() === 'admin') {
      return true
    }
    
    return false
  })

  // 初始化
  initUserInfo()
  // 初始化时同步一次
  syncFromLocalStorage()

  return {
    token,
    refreshToken,
    userInfo,
    isAuthenticated,
    login,
    logout,
    refreshAccessToken,
    validateToken,
    getToken,
    syncFromLocalStorage, // 导出同步方法
    hasPermission,
    hasRole,
    hasModulePermission,
    isSuperAdmin,
  }
})

