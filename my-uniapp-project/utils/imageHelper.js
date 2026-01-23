/**
 * 图片处理工具
 * 支持网络图片和本地图片
 */

/**
 * 处理图片URL
 * @param {string} url - 图片URL（可以是网络链接或本地路径）
 * @returns {string} 处理后的图片URL
 */
export const getImageUrl = (url) => {
  if (!url) {
    return '/static/logo.png' // 默认图片
  }
  
  // 如果是网络图片（http/https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 如果是本地图片，确保路径正确
  if (url.startsWith('/static/') || url.startsWith('@/static/')) {
    return url
  }
  
  // 如果只是文件名，添加 /static/ 前缀
  if (!url.startsWith('/')) {
    return `/static/${url}`
  }
  
  return url
}

/**
 * 下载网络图片到本地（可选功能）
 * @param {string} imageUrl - 网络图片URL
 * @param {string} savePath - 保存路径（可选）
 * @returns {Promise<string>} 本地路径
 */
export const downloadImage = (imageUrl, savePath = '') => {
  return new Promise((resolve, reject) => {
    // 检查是否是网络图片
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      resolve(imageUrl) // 已经是本地路径
      return
    }
    
    // 下载图片
    uni.downloadFile({
      url: imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到本地
          const filePath = savePath || res.tempFilePath
          uni.saveFile({
            tempFilePath: res.tempFilePath,
            success: (saveRes) => {
              resolve(saveRes.savedFilePath)
            },
            fail: (err) => {
              console.error('保存图片失败:', err)
              // 如果保存失败，使用临时文件路径
              resolve(res.tempFilePath)
            }
          })
        } else {
          reject(new Error('下载失败'))
        }
      },
      fail: (err) => {
        console.error('下载图片失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 预加载图片
 * @param {string|Array<string>} urls - 图片URL或URL数组
 */
export const preloadImages = (urls) => {
  const urlArray = Array.isArray(urls) ? urls : [urls]
  
  urlArray.forEach(url => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // 预加载网络图片
      const img = new Image()
      img.src = url
    }
  })
}

/**
 * 检查图片是否存在
 * @param {string} url - 图片URL
 * @returns {Promise<boolean>}
 */
export const checkImageExists = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false)
      return
    }
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 网络图片
      uni.request({
        url: url,
        method: 'HEAD',
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } else {
      // 本地图片，直接返回true（假设存在）
      resolve(true)
    }
  })
}

