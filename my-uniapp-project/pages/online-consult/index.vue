<template>
  <view class="consult-page">
    <!-- 顶部步骤 -->
    <view class="step-header">
      <view class="step-item active">
        <text class="step-index">1</text>
        <text class="step-text">请描述您的病情</text>
      </view>
      <view class="step-divider"></view>
      <view class="step-item">
        <text class="step-index">2</text>
        <text class="step-text">咨询人选择</text>
      </view>
    </view>

    <!-- 病情描述 -->
    <view class="card card-desc">
      <view class="card-title">为了更好地获得医生帮助，请尽可能详细描述病情</view>
      <view class="textarea-wrapper">
        <textarea
          v-model="description"
          class="desc-textarea"
          placeholder="请填写症状、持续时间、用药情况等信息"
          :maxlength="-1"
          auto-height
        />
        <view class="voice-btn" @click="handleVoiceInput">
          <uni-icons type="mic" size="26" color="#007AFF"></uni-icons>
        </view>
      </view>
      <view class="desc-tips">
        <text>文字越详细，医生越容易判断病情。</text>
        <text v-if="recording" class="recording-status">正在录音...</text>
      </view>
    </view>

    <!-- 上传检查报告或处方 -->
    <view class="card card-upload">
      <view class="upload-header">
        <text class="card-title">上传检查报告、处方照片或视频</text>
        <text class="upload-count">{{ files.length }}/9 已上传</text>
      </view>
      <view class="upload-subtitle">文件仅自己和医生可见，支持图片/视频</view>

      <view class="upload-grid">
        <view
          v-for="(item, index) in files"
          :key="index"
          class="upload-item"
          @click="previewFile(index)"
        >
          <image 
            :src="item.thumb || item.path" 
            mode="aspectFill" 
            class="upload-image"
            @error="(e) => handleImageError(e, index)"
            @load="() => console.log(`✅ 图片 ${Number(index) + 1} 加载成功`)"
          />
          <view v-if="item.type === 'video'" class="video-badge">视频</view>
          <view v-if="item.type === 'video'" class="play-icon">▶</view>
          <view class="delete-icon" @click.stop="removeFile(index)">
            ×
          </view>
        </view>

        <view
          v-if="files.length < 9"
          class="upload-item add-item"
          @click="chooseFile"
        >
          <text class="add-plus">+</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-fixed">
      <button class="next-btn" type="primary" @click="goNext">
        下一步
      </button>
    </view>

    <!-- 视频预览弹窗 -->
    <view v-if="showVideoPreview" class="video-preview-modal" @click="closeVideoPreview">
      <view class="video-preview-content" @click.stop>
        <view class="video-preview-header">
          <text class="video-preview-title">视频预览</text>
          <view class="video-close-btn" @click="closeVideoPreview">×</view>
        </view>
        <video
          :src="currentVideoPath"
          class="video-player"
          controls
          :autoplay="false"
          :show-center-play-btn="true"
          :show-play-btn="true"
          :enable-play-gesture="true"
          @error="handleVideoError"
          :poster="currentVideoThumb"
          :enable-progress-gesture="true"
          object-fit="contain"
        >
          <source :src="currentVideoPath" type="video/mp4" />
        </video>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type FileType = 'image' | 'video'

interface LocalFile {
  path: string
  type: FileType
  thumb?: string
  file?: File  // H5环境下保存原始File对象
}

const description = ref('')
const files = ref<LocalFile[]>([])
const recording = ref(false)
const showVideoPreview = ref(false)
const currentVideoPath = ref('')
const currentVideoThumb = ref('')

// 选择图片或视频（最多 9 个，混合计数），兼容不支持 chooseMedia 的端
const chooseFile = () => {
  const remain = 9 - files.value.length
  if (remain <= 0) return

  // #ifdef H5
  // H5 环境下使用原生文件选择器，支持图片和视频
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,video/*'
  input.multiple = true
  input.style.display = 'none'
  
  input.onchange = (e: any) => {
    const selectedFiles = Array.from(e.target.files || []) as File[]
    console.log('📸 选择的文件数量:', selectedFiles.length, '剩余可上传:', remain)
    
    if (selectedFiles.length === 0) {
      console.log('⚠️ 未选择任何文件')
      // 移除input元素
      setTimeout(() => {
        if (input.parentNode) {
          document.body.removeChild(input)
        }
      }, 100)
      return
    }
    
    let processedCount = 0
    const maxToProcess = Math.min(selectedFiles.length, remain)
    
    // 处理每个文件
    selectedFiles.forEach((file: File, index: number) => {
      if (processedCount >= remain) {
        console.log(`⏭️ 跳过文件 ${index + 1}，已达到上限`)
        return
      }
      
      try {
        const fileType = file.type.startsWith('video/') ? 'video' : 'image'
        const fileURL = URL.createObjectURL(file)
        console.log(`📄 处理文件 ${index + 1}/${selectedFiles.length}:`, file.name, `类型: ${fileType}`)
        
        if (fileType === 'video') {
          // 创建视频元素获取缩略图
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.src = fileURL
          video.muted = true
          
          video.onloadedmetadata = () => {
            video.currentTime = 0.1
          }
          
          video.onseeked = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = video.videoWidth || 320
              canvas.height = video.videoHeight || 240
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const thumbURL = canvas.toDataURL('image/jpeg')
                files.value.push({
                  path: fileURL,
                  thumb: thumbURL,
                  type: 'video',
                  file: file  // 保存原始File对象，用于后续预览
                })
                processedCount++
                console.log(`✅ 视频 ${index + 1} 添加成功`)
              }
            } catch (err) {
              console.error(`❌ 视频 ${index + 1} 处理失败:`, err)
              // 如果处理失败，仍然添加视频，使用默认缩略图
              files.value.push({
                path: fileURL,
                thumb: fileURL,
                type: 'video',
                file: file
              })
              processedCount++
            }
          }
          
          video.onerror = (err) => {
            console.error(`❌ 视频 ${index + 1} 加载失败:`, err)
            // 如果无法生成缩略图，使用默认占位图
            files.value.push({
              path: fileURL,
              thumb: fileURL,
              type: 'video',
              file: file  // 保存原始File对象
            })
            processedCount++
            console.log(`✅ 视频 ${index + 1} 添加成功（使用默认缩略图）`)
          }
        } else {
          // 图片处理（同步）
          files.value.push({
            path: fileURL,
            type: 'image',
            file: file  // 保存原始File对象
          })
          processedCount++
          console.log(`✅ 图片 ${index + 1} 添加成功，当前文件数: ${files.value.length}`)
        }
      } catch (error: any) {
        console.error(`❌ 处理文件 ${index + 1} 时出错:`, error)
        uni.showToast({
          title: `文件 ${index + 1} 处理失败`,
          icon: 'none',
          duration: 2000
        })
      }
    })
    
    // 显示成功提示
    if (processedCount > 0) {
      uni.showToast({
        title: `已选择 ${processedCount} 个文件`,
        icon: 'success',
        duration: 1500
      })
    }
    
    // 延迟移除，确保事件处理完成
    setTimeout(() => {
      if (input.parentNode) {
        document.body.removeChild(input)
      }
    }, 100)
  }
  
  input.onerror = (err) => {
    console.error('❌ 文件选择器错误:', err)
    uni.showToast({
      title: '文件选择失败',
      icon: 'none'
    })
    setTimeout(() => {
      if (input.parentNode) {
        document.body.removeChild(input)
      }
    }, 100)
  }
  
  document.body.appendChild(input)
  input.click()
  // #endif

  // #ifndef H5
  // 优先使用 chooseMedia（支持视频+图片），兼容老端用 chooseImage / chooseVideo
  const chooseMedia = (uni as any).chooseMedia
  if (chooseMedia) {
    console.log('📸 使用 chooseMedia API，剩余可上传:', remain)
    chooseMedia({
      count: remain,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60, // 视频最长 60s
      success: (res: any) => {
        console.log('✅ chooseMedia 成功，返回文件数:', res.tempFiles?.length || 0)
        const items = res.tempFiles || []
        let addedCount = 0
        
        items.forEach((item: any, index: number) => {
          if (files.value.length >= 9) {
            console.log(`⏭️ 跳过文件 ${index + 1}，已达到上限`)
            return
          }
          
          try {
            if (item.fileType === 'video') {
              files.value.push({
                path: item.tempFilePath,
                thumb: item.thumbTempFilePath || item.tempFilePath,
                type: 'video'
              })
              addedCount++
              console.log(`✅ 视频 ${index + 1} 添加成功`)
            } else {
              files.value.push({
                path: item.tempFilePath,
                type: 'image'
              })
              addedCount++
              console.log(`✅ 图片 ${index + 1} 添加成功，当前文件数: ${files.value.length}`)
            }
          } catch (error: any) {
            console.error(`❌ 处理文件 ${index + 1} 时出错:`, error)
          }
        })
        
        if (addedCount > 0) {
          uni.showToast({
            title: `已选择 ${addedCount} 个文件`,
            icon: 'success',
            duration: 1500
          })
        }
      },
      fail: (err: any) => {
        console.error('❌ chooseMedia 失败:', err)
        // 用户取消选择时不显示错误
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          uni.showToast({
            title: '选择文件失败',
            icon: 'none'
          })
        }
      }
    })
    return
  }

  // Fallback：仅支持图片（旧版端）
  console.log('📸 使用 chooseImage API，剩余可上传:', remain)
  uni.chooseImage({
    count: remain,
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      console.log('✅ chooseImage 成功，返回图片数:', res.tempFilePaths?.length || 0)
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : []
      let addedCount = 0
      
      paths.forEach((p: string, index: number) => {
        if (files.value.length < 9) {
          files.value.push({ path: p, type: 'image' })
          addedCount++
          console.log(`✅ 图片 ${index + 1} 添加成功，当前文件数: ${files.value.length}`)
        } else {
          console.log(`⏭️ 跳过图片 ${index + 1}，已达到上限`)
        }
      })
      
      if (addedCount > 0) {
        uni.showToast({
          title: `已选择 ${addedCount} 张图片`,
          icon: 'success',
          duration: 1500
        })
      }
    },
    fail: (err: any) => {
      console.error('❌ chooseImage 失败:', err)
      // 用户取消选择时不显示错误
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    }
  })
  // #endif
}

const removeFile = (index: number) => {
  console.log(`🗑️ 删除文件 ${index + 1}`)
  files.value.splice(index, 1)
  console.log(`✅ 删除成功，当前文件数: ${files.value.length}`)
}

/**
 * 处理图片加载错误
 */
const handleImageError = (e: any, index: number) => {
  console.error(`❌ 图片 ${index + 1} 加载失败:`, e)
  console.error('图片路径:', files.value[index]?.path)
  uni.showToast({
    title: `图片 ${index + 1} 加载失败`,
    icon: 'none',
    duration: 2000
  })
}

const previewFile = (index: number) => {
  const file = files.value[index]
  if (file.type === 'video') {
    // 预览视频
    // #ifdef H5
    // H5环境下，如果有原始File对象，重新创建blob URL
    if ((file as any).file) {
      const fileObj = (file as any).file as File
      // 重新创建blob URL（因为之前的可能已失效）
      const newBlobURL = URL.createObjectURL(fileObj)
      currentVideoPath.value = newBlobURL
      currentVideoThumb.value = file.thumb || ''
      showVideoPreview.value = true
    } else if (typeof file.path === 'string' && file.path) {
      // 如果没有File对象，尝试使用现有路径
      currentVideoPath.value = file.path
      currentVideoThumb.value = file.thumb || ''
      showVideoPreview.value = true
    } else {
      uni.showToast({
        title: '视频路径无效',
        icon: 'none'
      })
    }
    // #endif
    
    // #ifndef H5
    // 非H5环境，直接使用路径
    if (typeof file.path === 'string' && file.path) {
      currentVideoPath.value = file.path
      currentVideoThumb.value = file.thumb || ''
      showVideoPreview.value = true
    } else {
      uni.showToast({
        title: '视频路径无效',
        icon: 'none'
      })
    }
    // #endif
  } else {
    // 预览图片
    const imageUrls = files.value
      .filter((f: LocalFile) => f.type === 'image')
      .map((f: LocalFile) => f.path)
    const currentIndex = files.value
      .slice(0, index)
      .filter((f: LocalFile) => f.type === 'image').length
    uni.previewImage({
      current: currentIndex,
      urls: imageUrls
    })
  }
}

const handleVideoError = (e: any) => {
  console.error('视频播放错误:', e)
  uni.showToast({
    title: '视频无法播放，请检查格式',
    icon: 'none',
    duration: 2000
  })
}

// 语音输入占位实现：录音 + 填充示例文字
const handleVoiceInput = () => {
  // #ifdef H5
  uni.showToast({
    title: 'H5 暂不支持语音转文字示例',
    icon: 'none'
  })
  // #endif

  // #ifdef APP-PLUS || MP-WEIXIN
  try {
    const recorderManager = uni.getRecorderManager()
    if (!recording.value) {
      recording.value = true
      recorderManager.start({
        format: 'mp3'
      })
      recorderManager.onStop(() => {
        recording.value = false
        // 这里实际项目应把音频上传到服务器做语音识别
        description.value += (description.value ? '\n' : '') + '【语音已录入，示例文字：这里是根据语音生成的病情描述，请在真实项目中接入语音识别服务】'
      })
      uni.showToast({
        title: '开始录音，再次点击停止',
        icon: 'none'
      })
    } else {
      const rm = uni.getRecorderManager()
      rm.stop()
    }
  } catch (e) {
    uni.showToast({
      title: '当前端能力有限，无法使用录音',
      icon: 'none'
    })
  }
  // #endif
}

const closeVideoPreview = () => {
  showVideoPreview.value = false
  currentVideoPath.value = ''
  currentVideoThumb.value = ''
}

const goNext = () => {
  if (!description.value) {
    uni.showToast({
      title: '请先描述病情',
      icon: 'none'
    })
    return
  }
  // 将病情描述和文件数据存储到全局，供后续页面使用
  // @ts-ignore
  const app = getApp()
  // H5环境下，File对象无法序列化，需要特殊处理
  // #ifdef H5
  const filesForStorage = files.value.map((file: LocalFile) => {
    const fileData: any = {
      path: file.path,
      type: file.type,
      thumb: file.thumb
    }
    // File对象无法序列化，只能保存路径
    // 在聊天页面预览时，如果blob URL失效，会显示错误提示
    return fileData
  })
  app.globalData.consultData = {
    description: description.value,
    files: filesForStorage,
    // 保存原始File对象引用（仅在当前页面有效）
    _h5Files: files.value.map((f: LocalFile) => (f as any).file).filter(Boolean)
  }
  // #endif
  
  // #ifndef H5
  app.globalData.consultData = {
    description: description.value,
    files: files.value
  }
  // #endif
  uni.navigateTo({
    url: '/pages/online-consult/patient'
  })
}
</script>

<style lang="scss">
.consult-page {
  min-height: 100vh;
  background-color: #f6f7fb;
  padding: 20rpx 30rpx 140rpx;
  box-sizing: border-box;
}

.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #c0c4cc;

    &.active {
      .step-index {
        background-color: #007aff;
        color: #fff;
      }
      .step-text {
        color: #333;
        font-weight: bold;
      }
    }

    .step-index {
      width: 40rpx;
      height: 40rpx;
      line-height: 40rpx;
      text-align: center;
      border-radius: 50%;
      background-color: #e5e5ea;
      margin-bottom: 8rpx;
      font-size: 24rpx;
    }

    .step-text {
      font-size: 26rpx;
    }
  }

  .step-divider {
    flex: 1;
    height: 2rpx;
    margin: 0 20rpx;
    background-color: #e5e5ea;
  }
}

.card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 30rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.03);
}

.card + .card {
  margin-top: 24rpx;
}

.card-title {
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
}

.card-desc {
  .textarea-wrapper {
    margin-top: 20rpx;
    position: relative;
    border-radius: 20rpx;
    background-color: #f8f9ff;
    padding: 20rpx 90rpx 20rpx 20rpx;
    min-height: 200rpx;
    box-sizing: border-box;
  }

  .desc-textarea {
    width: 100%;
    min-height: 160rpx;
    font-size: 26rpx;
    color: #333;
  }

  .voice-btn {
    position: absolute;
    right: 24rpx;
    bottom: 24rpx;
    width: 60rpx;
    height: 60rpx;
    border-radius: 30rpx;
    background-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  }

  .desc-tips {
    margin-top: 12rpx;
    font-size: 22rpx;
    color: #999;

    .recording-status {
      margin-left: 12rpx;
      color: #ff8c42;
    }
  }
}

.card-upload {
  .upload-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6rpx;

    .upload-count {
      font-size: 24rpx;
      color: #999;
    }
  }

  .upload-subtitle {
    font-size: 22rpx;
    color: #b0b3c0;
    margin-bottom: 20rpx;
  }

  .upload-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
  }

  .upload-item {
    width: 160rpx;
    height: 160rpx;
    border-radius: 20rpx;
    background-color: #f6f7fb;
    position: relative;
    overflow: hidden;

    &.add-item {
      border: 2rpx dashed #d0d3e2;
      display: flex;
      align-items: center;
      justify-content: center;

      .add-plus {
        font-size: 60rpx;
        color: #c0c4cc;
      }
    }

    .upload-image {
      width: 100%;
      height: 100%;
    }

    .video-badge {
      position: absolute;
      left: 10rpx;
      top: 10rpx;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 22rpx;
      padding: 4rpx 10rpx;
      border-radius: 12rpx;
    }

    .play-icon {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      width: 60rpx;
      height: 60rpx;
      border-radius: 30rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
    }

    .delete-icon {
      position: absolute;
      right: 8rpx;
      top: 8rpx;
      width: 32rpx;
      height: 32rpx;
      border-radius: 16rpx;
      background-color: rgba(0, 0, 0, 0.45);
      color: #fff;
      font-size: 24rpx;
      text-align: center;
      line-height: 32rpx;
    }
  }
}

.bottom-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 40rpx 40rpx;
  background-color: #f6f7fb;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.next-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background-color: #007aff;
  font-size: 30rpx;
}

.video-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .video-preview-content {
    width: 90%;
    max-width: 750rpx;
    background-color: #000;
    border-radius: 12rpx;
    overflow: hidden;
    position: relative;
    
    .video-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 30rpx;
      background-color: rgba(0, 0, 0, 0.7);
      
      .video-preview-title {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
      
      .video-close-btn {
        width: 60rpx;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48rpx;
        color: #fff;
        cursor: pointer;
        
        &:active {
          opacity: 0.7;
        }
      }
    }
    
    .video-player {
      width: 100%;
      height: 500rpx;
      background-color: #000;
    }
  }
}
</style>


