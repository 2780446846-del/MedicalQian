/**
 * 下载网络图片到本地工具
 */

/**
 * 下载网络图片并保存到指定目录
 * @param {string} imageUrl - 网络图片URL
 * @param {string} fileName - 保存的文件名（可选）
 * @param {string} saveDir - 保存的目录（相对于项目根目录）
 * @returns {Promise<string>} 保存后的文件路径
 */
export const downloadImageToLocal = (imageUrl, fileName = '', saveDir = 'static/doctor') => {
  return new Promise((resolve, reject) => {
    // 检查是否是网络图片
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      reject(new Error('不是有效的网络图片URL'))
      return
    }
    
    // 生成文件名
    if (!fileName) {
      // 从URL中提取文件名，或使用时间戳
      const urlParts = imageUrl.split('/')
      const lastPart = urlParts[urlParts.length - 1]
      const urlParams = lastPart.split('?')[0] // 去掉查询参数
      fileName = urlParams || `doctor_${Date.now()}.jpg`
      
      // 确保有扩展名
      if (!fileName.includes('.')) {
        fileName += '.jpg'
      }
    }
    
    console.log('开始下载图片:', imageUrl)
    console.log('保存路径:', `${saveDir}/${fileName}`)
    
    // 下载图片
    uni.downloadFile({
      url: imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log('图片下载成功，临时路径:', res.tempFilePath)
          
          // 注意：uni-app 的 saveFile 只能保存到应用目录，不能直接保存到项目目录
          // 如果需要保存到项目目录，需要使用 Node.js 脚本或手动操作
          
          // 保存到应用缓存目录
          uni.saveFile({
            tempFilePath: res.tempFilePath,
            success: (saveRes) => {
              console.log('图片已保存到应用目录:', saveRes.savedFilePath)
              uni.showToast({
                title: '图片已下载',
                icon: 'success'
              })
              resolve(saveRes.savedFilePath)
            },
            fail: (err) => {
              console.error('保存图片失败:', err)
              reject(err)
            }
          })
        } else {
          reject(new Error(`下载失败，状态码: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('下载图片失败:', err)
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

/**
 * 在浏览器中打开下载链接（用于手动下载）
 * @param {string} imageUrl - 网络图片URL
 */
export const openImageInBrowser = (imageUrl) => {
  // #ifdef H5
  window.open(imageUrl, '_blank')
  // #endif
  
  // #ifndef H5
  uni.showModal({
    title: '提示',
    content: `请复制以下链接到浏览器中打开并保存图片：\n${imageUrl}`,
    showCancel: false
  })
  // #endif
}

