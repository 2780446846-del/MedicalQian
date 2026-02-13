import { useAuthStore } from '@/stores/auth'

// API基础URL配置 - 与uniapp项目使用相同的地址
// 通过环境变量 VITE_API_BASE_URL 配置，默认: http://localhost:3000/api
// 如需修改，请同时修改 .env 文件和 uniapp项目的 utils/auth.js、utils/api.js
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

const API_BASE_URL = getApiBaseUrl()

interface RequestOptions extends RequestInit {
  url: string
  data?: any
  showError?: boolean
}

/**
 * 统一的请求封装
 */
export async function request<T = any>(options: RequestOptions): Promise<T> {
  const authStore = useAuthStore()
  const { url, data, showError = true, ...fetchOptions } = options

  // 构建完整URL
  let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  // GET/HEAD 请求不能有 body，参数应该放在 URL 查询字符串中
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const isGetOrHead = method === 'GET' || method === 'HEAD'

  // 如果是 GET/HEAD 请求且有 data，将 data 转换为查询参数
  if (isGetOrHead && data) {
    const searchParams = new URLSearchParams()
    Object.keys(data).forEach(key => {
      const value = data[key]
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString
    }
  }

  // 设置请求头（使用可变的对象，便于添加 Authorization）
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }

  // 添加token
  const token = authStore.getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 检查是否为模拟token
  const isMockToken = token && token.startsWith('mock-')

  try {
    // GET/HEAD 请求不设置 body
    const fetchOptionsFinal: RequestInit = {
      ...fetchOptions,
      headers,
    }

    // 只有非 GET/HEAD 请求才设置 body
    if (!isGetOrHead) {
      fetchOptionsFinal.body = data ? JSON.stringify(data) : fetchOptions.body
    }

    // 如果是模拟token，直接返回模拟数据，跳过实际请求
    if (isMockToken) {
      console.log('使用模拟token，跳过实际请求')
      // 根据URL返回不同的模拟数据
      if (fullUrl.includes('/auth/validate')) {
        return { user: authStore.userInfo }
      } else if (fullUrl.includes('/permissions')) {
        return { permissions: authStore.userInfo?.permissions || [] }
      }
      return { success: true }
    }

    const response = await fetch(fullUrl, fetchOptionsFinal)

    // 处理401未授权，尝试刷新token
    if (response.status === 401) {
      const newToken = await authStore.refreshAccessToken()
      if (newToken) {
        // 重试请求
        headers['Authorization'] = `Bearer ${newToken}`
        const retryFetchOptions: RequestInit = {
          ...fetchOptions,
          headers,
        }
        // 只有非 GET/HEAD 请求才设置 body
        if (!isGetOrHead) {
          retryFetchOptions.body = data ? JSON.stringify(data) : fetchOptions.body
        }
        const retryResponse = await fetch(fullUrl, retryFetchOptions)

        if (!retryResponse.ok) {
          throw new Error(`Request failed: ${retryResponse.statusText}`)
        }

        return await retryResponse.json()
      } else {
        // 刷新失败，跳转到登录页
        authStore.logout()
        window.location.href = '/login'
        throw new Error('Token expired, please login again')
      }
    }

    if (!response.ok) {
      // 尝试解析错误响应
      let errorData: any = { message: response.statusText }
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          const text = await response.text()
          if (text) {
            try {
              errorData = JSON.parse(text)
            } catch {
              errorData = { message: text || response.statusText }
            }
          }
        }
      } catch (parseError) {
        // 如果解析失败，使用默认错误信息
        errorData = { message: response.statusText || '请求失败' }
      }
      
      // 优先使用后端返回的 message，其次是 error 字段
      const errorMessage = errorData.message || errorData.error || `Request failed: ${response.statusText}`
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error: unknown) {
    if (showError) {
      console.error('Request error:', error)

      // 处理不同类型的错误
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('网络请求失败，可能的原因：')
        console.error('1. 后端服务器未启动')
        console.error('2. API地址配置错误:', fullUrl)
        console.error('3. CORS跨域问题')
        console.error('4. 网络连接问题')
      }
    }
    throw error
  }
}

/**
 * GET请求
 */
export function get<T = any>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
  return request<T>({ ...options, url, method: 'GET' })
}

/**
 * POST请求
 */
export function post<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>): Promise<T> {
  return request<T>({ ...options, url, method: 'POST', data })
}

/**
 * PUT请求
 */
export function put<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>): Promise<T> {
  return request<T>({ ...options, url, method: 'PUT', data })
}

/**
 * DELETE请求
 */
export function del<T = any>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> {
  return request<T>({ ...options, url, method: 'DELETE' })
}

