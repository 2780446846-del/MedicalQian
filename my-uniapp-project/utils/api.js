/**
 * API请求封装
 * 自动处理token和token刷新
 */
import { getToken, refreshAccessToken, clearAuth } from './auth.js'

// API基础URL - 从config.js导入，自动根据运行环境切换
import { API_BASE_URL } from './config.js'

/**
 * 统一的请求方法
 * @param {Object} options 请求配置
 * @returns {Promise} 请求结果
 */
export function request(options) {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      showLoading = false,
      showError = true,
    } = options

    // 显示加载提示
    if (showLoading) {
      uni.showLoading({
        title: '加载中...',
        mask: true,
      })
    }

    // 获取token
    const token = getToken()
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    // 设置默认请求头
    if (!header['Content-Type']) {
      header['Content-Type'] = 'application/json'
    }

    // 发起请求
    uni.request({
      url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
      method,
      data,
      header,
      success: async (res) => {
        // 隐藏加载提示
        if (showLoading) {
          uni.hideLoading()
        }

        // 处理401未授权
        if (res.statusCode === 401) {
          // 检查是否是会话失效（用户在其他地方登出）
          if (res.data?.sessionExpired) {
            console.log('⚠️ 会话已失效，清除本地token（可能在其他地方已登出）')
            clearAuth()
            uni.showToast({
              title: '登录已失效，请重新登录',
              icon: 'none',
              duration: 2000,
            })
            setTimeout(() => {
              uni.reLaunch({
                url: '/pages/login/login',
              })
            }, 2000)
            reject(new Error('Session expired'))
            return
          }
          
          // 尝试刷新token
          const newToken = await refreshAccessToken()
          if (newToken) {
            // 重试请求
            header.Authorization = `Bearer ${newToken}`
            uni.request({
              url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
              method,
              data,
              header,
              success: (retryRes) => {
                if (retryRes.statusCode === 200) {
                  resolve(retryRes.data)
                } else {
                  handleError(retryRes, showError)
                  reject(new Error(retryRes.data?.message || '请求失败'))
                }
              },
              fail: (err) => {
                if (showLoading) {
                  uni.hideLoading()
                }
                handleError(err, showError)
                reject(err)
              },
            })
            return
          } else {
            // 刷新失败，清除认证信息并跳转到登录页
            clearAuth()
            uni.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none',
              duration: 2000,
            })
            setTimeout(() => {
              // 跳转到登录页（需要根据你的项目结构调整路径）
              uni.reLaunch({
                url: '/pages/login/login', // 请修改为你的登录页路径
              })
            }, 2000)
            reject(new Error('Token expired'))
            return
          }
        }

        // 处理其他状态码
        if (res.statusCode === 200) {
          // 即使状态码是200，也要检查响应数据中的success字段
          if (res.data && typeof res.data === 'object' && res.data.success === false) {
            // 业务逻辑失败
            handleError(res, showError)
            reject(new Error(res.data?.message || '请求失败'))
          } else {
            resolve(res.data)
          }
        } else {
          handleError(res, showError)
          // 尝试从响应数据中提取错误信息
          let errorMessage = res.data?.message || res.data?.error || `请求失败: ${res.statusCode}`
          
          // 对于404错误，提供更详细的错误信息
          if (res.statusCode === 404) {
            const requestUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
            errorMessage = `接口不存在 (404): ${requestUrl}`
            console.error('❌ 404错误 - 请求URL:', requestUrl)
            console.error('❌ 请检查：1. 后端服务是否正常运行 2. 接口路径是否正确 3. 路由配置是否正确')
          }
          
          reject(new Error(errorMessage))
        }
      },
      fail: (err) => {
        // 隐藏加载提示
        if (showLoading) {
          uni.hideLoading()
        }
        handleError(err, showError)
        reject(err)
      },
    })
  })
}

/**
 * 错误处理
 */
function handleError(error, showError) {
  if (showError) {
    let message = '请求失败，请稍后重试'
    
    if (error.statusCode) {
      switch (error.statusCode) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          break
        case 403:
          message = '没有权限访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器错误'
          break
        default:
          message = error.data?.message || `请求失败: ${error.statusCode}`
      }
    } else if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        message = '请求超时，请检查网络'
      } else if (error.errMsg.includes('fail')) {
        message = '网络连接失败，请检查网络'
      }
    }

    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000,
    })
  }
}

/**
 * GET请求
 */
export function get(url, params = {}, options = {}) {
  // 将params拼接到url
  if (Object.keys(params).length > 0) {
    const queryString = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    url += (url.includes('?') ? '&' : '?') + queryString
  }
  return request({
    url,
    method: 'GET',
    ...options,
  })
}

/**
 * POST请求
 */
export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options,
  })
}

/**
 * PUT请求
 */
export function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options,
  })
}

/**
 * DELETE请求
 */
export function del(url, options = {}) {
  return request({
    url,
    method: 'DELETE',
    ...options,
  })
}

/**
 * 文件上传
 * H5 环境下使用 fetch + FormData 以利用代理配置，避免 CORS 问题
 * 其他平台使用 uni.uploadFile
 */
export function upload(url, filePath, name = 'file', formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    // #ifdef H5
    // H5 环境下使用 fetch + FormData，可以利用代理配置
    const uploadH5 = async () => {
      try {
        // 将 filePath 转换为 File 对象
        let file
        
        // 如果已经是 File 或 Blob 对象
        if (filePath instanceof File || filePath instanceof Blob) {
          file = filePath
        } 
        // 如果是 blob URL 或 http URL
        else if (filePath.startsWith('blob:') || filePath.startsWith('http')) {
          const response = await fetch(filePath)
          file = await response.blob()
        }
        // 如果是本地文件路径（uni.chooseImage 返回的临时路径）
        else {
          // 在 H5 环境下，uni.chooseImage 返回的路径可能是 blob URL
          // 尝试直接作为 URL 使用
          try {
            const response = await fetch(filePath)
            file = await response.blob()
          } catch (fetchErr) {
            // 如果 fetch 失败，可能是文件路径格式问题
            // 回退到使用 uni.uploadFile
            console.warn('H5 fetch 失败，回退到 uni.uploadFile:', fetchErr)
            return uploadUni()
          }
        }

        // 创建 FormData
        const formDataObj = new FormData()
        formDataObj.append(name, file, file.name || 'file')
        
        // 添加额外的 formData
        Object.keys(formData).forEach(key => {
          formDataObj.append(key, formData[key])
        })

        // 设置请求头
        const headers = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
        // 注意：不要手动设置 Content-Type，让浏览器自动设置（包含 boundary）

        // 发送请求
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: formDataObj,
          ...options,
        })

        // 处理响应
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          // 如果响应不是JSON，可能是HTML错误页面或其他格式
          console.error('响应解析失败，原始响应:', responseText.substring(0, 500))
          const errorMsg = response.status === 500 
            ? `服务器内部错误 (500): ${responseText.substring(0, 200)}`
            : `响应解析失败: ${responseText.substring(0, 100)}`
          throw new Error(errorMsg)
        }

        if (response.ok) {
          resolve(data)
        } else {
          let errorMessage = data.message || data.error || `上传失败: ${response.status}`
          if (response.status === 404) {
            errorMessage = '接口不存在 (404)，请检查 API 地址和代理配置'
          } else if (response.status === 500) {
            errorMessage = data.message || data.error || '服务器内部错误 (500)，请检查后端日志'
          }
          reject(new Error(errorMessage))
        }
      } catch (error) {
        // 处理 CORS 错误
        if (error.message && error.message.includes('CORS')) {
          reject(new Error('跨域请求被阻止，请检查服务器 CORS 配置或使用代理'))
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          reject(new Error('网络请求失败，可能是 CORS 问题或网络连接问题。请确保代理配置正确。'))
        } else {
          reject(error)
        }
      }
    }

    // 回退到 uni.uploadFile 的函数
    const uploadUni = () => {
      const header = {}
      if (token) {
        header.Authorization = `Bearer ${token}`
      }

      uni.uploadFile({
        url: fullUrl,
        filePath,
        name,
        formData,
        header,
        onProgressUpdate: options.onProgressUpdate || (() => {}),
        success: (res) => {
          // 处理非 200 状态码
          if (res.statusCode !== 200) {
            let errorMessage = `上传失败: ${res.statusCode}`
            try {
              const errorData = JSON.parse(res.data)
              errorMessage = errorData.message || errorMessage
            } catch (e) {
              if (res.statusCode === 404) {
                errorMessage = '接口不存在 (404)，请检查 API 地址和代理配置'
              } else if (res.statusCode === 500) {
                errorMessage = '服务器错误 (500)'
              }
            }
            reject(new Error(errorMessage))
            return
          }

          // 解析响应数据
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            resolve(data)
          } catch (e) {
            console.error('响应数据解析失败:', res.data)
            reject(new Error('响应数据解析失败，请检查服务器返回格式'))
          }
        },
        fail: (err) => {
          if (err.errMsg && (err.errMsg.includes('fail') || err.errMsg.includes('CORS'))) {
            const errorMsg = `上传失败: ${err.errMsg}\n\n` +
              `可能的原因：\n` +
              `1. CORS 跨域问题：后端服务器未配置允许跨域的响应头\n` +
              `2. 网络连接问题：请检查网络连接和服务器地址\n` +
              `3. 解决方案：\n` +
              `   - 在 manifest.json 的 h5.devServer 中配置代理\n` +
              `   - 或让后端添加 CORS 响应头：Access-Control-Allow-Origin`
            console.error(errorMsg)
            reject(new Error(errorMsg))
          } else {
            reject(err)
          }
        },
        ...options,
      })
    }

    // 在 H5 环境下优先使用 fetch，其他环境使用 uni.uploadFile
    uploadH5()
    // #endif

    // #ifndef H5
    // 非 H5 环境使用 uni.uploadFile
    const header = {}
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    uni.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header,
      onProgressUpdate: options.onProgressUpdate || (() => {}),
      success: (res) => {
        // 处理非 200 状态码
        if (res.statusCode !== 200) {
          let errorMessage = `上传失败: ${res.statusCode}`
          try {
            const errorData = JSON.parse(res.data)
            errorMessage = errorData.message || errorMessage
          } catch (e) {
            if (res.statusCode === 404) {
              errorMessage = '接口不存在 (404)'
            } else if (res.statusCode === 500) {
              errorMessage = '服务器错误 (500)'
            }
          }
          reject(new Error(errorMessage))
          return
        }

        // 解析响应数据
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(data)
        } catch (e) {
          console.error('响应数据解析失败:', res.data)
          reject(new Error('响应数据解析失败，请检查服务器返回格式'))
        }
      },
      fail: (err) => {
        reject(err)
      },
      ...options,
    })
    // #endif
  })
}

