<template>
  <div class="profile-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">个人资料</h2>
    </div>

    <!-- 图片和名字占一行 -->
    <div class="profile-main-section">
      <div class="profile-left">
        <div class="profile-avatar-wrapper">
          <img :src="doctorInfo.avatar" :alt="doctorInfo.name" class="profile-avatar" />
        </div>
        <div class="avatar-buttons">
          <button class="btn-call">呼叫</button>
          <button class="btn-chat">聊天</button>
        </div>
      </div>
      <div class="profile-right">
        <div class="profile-info-main">
          <div class="status-buttons">
            <button class="status-btn active">在职</button>
            <button class="status-btn">全职</button>
          </div>
          <h3 class="doctor-name">{{ doctorInfo.name }}</h3>
          <p class="doctor-title">{{ doctorInfo.title }}</p>
          <div class="contact-info">
            <div class="contact-item">
              <span class="contact-icon">📍</span>
              <span class="contact-text">地址 {{ doctorInfo.address }}</span>
            </div>
            <div class="contact-item">
              <span class="contact-icon">📞</span>
              <span class="contact-text">手机号码 {{ doctorInfo.phone }}</span>
            </div>
            <div class="contact-item">
              <span class="contact-icon">✉️</span>
              <span class="contact-text">电子邮件 {{ doctorInfo.email }}</span>
            </div>
          </div>
        </div>
        <div class="about-card">
          <div class="card-header">
            <h4 class="card-title">关于</h4>
            <button class="btn-edit">编辑资料</button>
          </div>
          <div class="card-content">
            <div class="about-text">文本描述: ************</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 三列布局 -->
    <div class="profile-layout three-columns">
      <!-- 第一列 -->
      <div class="column">
        <!-- 雇佣信息卡片 -->
        <div class="info-card">
          <h4 class="card-title">雇佣信息</h4>
          <div class="card-content">
            <div class="large-number">{{ stats.experience.years }}</div>
            <div class="card-description">年从业经验，从{{ stats.experience.startYear }}年开始</div>
          </div>
        </div>

        <!-- 薪资卡片 -->
        <div class="info-card">
          <h4 class="card-title">薪资</h4>
          <div class="card-content">
            <div class="large-number">{{ stats.salary }}</div>
            <div class="card-description">元/月</div>
          </div>
        </div>

        <!-- 教育背景卡片 -->
        <div class="info-card">
          <h4 class="card-title">教育背景</h4>
          <div class="card-content">
            <div class="edu-info">
              <span class="edu-icon">🏛️</span>
              <div class="edu-details">
                <div class="edu-university">{{ education.university }}</div>
                <div class="edu-location">{{ education.location }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 满意度卡片 -->
        <div class="info-card">
          <h4 class="card-title">满意度</h4>
          <div class="satisfaction-content">
            <div class="satisfaction-gauge">
              <div class="gauge-circle">
                <div class="gauge-text">良好</div>
              </div>
            </div>
            <div class="satisfaction-stats">
              <div class="satisfaction-number">{{ stats.satisfaction.toFixed(3) }}</div>
              <div class="satisfaction-desc">用户对表现感到满意</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二列 -->
      <div class="column">
        <!-- 今日任务卡片 -->
        <div class="info-card">
          <h4 class="card-title">今日任务</h4>
          <div class="card-content">
            <div class="current-time">11:00</div>
            <div class="tasks-list">
              <div v-for="task in tasks" :key="task.id" class="task-item">
                <div class="task-header">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-date">{{ task.date }}</div>
                </div>
                <div class="task-description">{{ task.description }}</div>
                <div class="task-time-range">
                  <span>{{ task.time }}</span>
                  <div class="task-progress-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第三列 -->
      <div class="column">
        <!-- 工作时长卡片 -->
        <div class="info-card">
          <h4 class="card-title">工作时长</h4>
          <div class="card-content">
            <div class="work-hours-display">{{ workHours }}</div>
            <div class="clock-buttons">
              <button v-if="!workStartTime" class="btn-clock-in" @click="clockIn">打卡上班</button>
              <button v-else class="btn-clock-out" @click="clockOut">打卡下班</button>
            </div>
          </div>
        </div>

        <!-- 考勤报告卡片 -->
        <div class="info-card">
          <div class="card-header">
            <h4 class="card-title">考勤报告</h4>
            <select class="filter-select">
              <option>本月</option>
              <option>上月</option>
              <option>本季度</option>
            </select>
          </div>
          <div class="card-content">
            <div class="attendance-desc">高效跟踪考勤和守时情况</div>
            <div class="attendance-grid">
              <div class="time-column">
                <div class="time-slot">08:00:00</div>
                <div class="time-slot">13:00:00</div>
                <div class="time-slot">18:00:00</div>
                <div class="time-slot">20:00:00</div>
              </div>
              <div class="days-column">
                <div v-for="(day, index) in attendanceDays" :key="index" class="day-column">
                  <div class="day-name">{{ day }}</div>
                  <div class="attendance-cells">
                    <div v-for="i in 4" :key="i" class="attendance-cell present"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 摄像头打卡模态框 -->
    <div v-if="showCameraModal" class="camera-modal-overlay" @click.self="stopCamera">
      <div class="camera-modal">
        <div class="camera-modal-header">
          <h3>{{ isClockOutModal ? '人脸识别下班打卡' : '人脸识别上班打卡' }}</h3>
          <button class="close-btn" @click="stopCamera">×</button>
        </div>
        <div class="camera-modal-body">
          <div class="video-wrapper">
            <video
              ref="videoElement"
              autoplay
              playsinline
              class="camera-video"
            ></video>
            <div v-if="!videoStream" class="camera-loading">
              <div class="loading-spinner"></div>
              <p>正在启动摄像头...</p>
            </div>
            <!-- 验证状态提示 -->
            <div v-if="faceVerificationStatus === 'verifying'" class="verification-overlay verifying">
              <div class="loading-spinner"></div>
              <p>{{ verificationMessage }}</p>
            </div>
            <div v-if="faceVerificationStatus === 'success'" class="verification-overlay success">
              <div class="success-icon">✓</div>
              <p>{{ verificationMessage }}</p>
            </div>
            <div v-if="faceVerificationStatus === 'failed'" class="verification-overlay failed">
              <div class="failed-icon">✗</div>
              <p>{{ verificationMessage }}</p>
            </div>
          </div>
          <div class="camera-tips">
            <p v-if="!isClockOutModal">📷 请正对摄像头，确保光线充足</p>
            <p v-if="!isClockOutModal">👤 请保持面部清晰可见</p>
            <p v-if="isClockOutModal">🔐 请确保与上班打卡时是同一人</p>
            <p v-if="isClockOutModal">⚠️ 人脸验证通过后才能完成下班打卡</p>
          </div>
        </div>
        <div class="camera-modal-footer">
          <button class="btn-cancel" @click="stopCamera">取消</button>
          <button 
            v-if="!isClockOutModal"
            class="btn-capture" 
            @click="captureAndClockIn"
            :disabled="!videoStream || isCapturing || faceVerificationStatus === 'verifying'"
          >
            {{ isCapturing ? '打卡中...' : '确认打卡' }}
          </button>
          <button 
            v-else
            class="btn-capture" 
            @click="captureAndClockOut"
            :disabled="!videoStream || isCapturing || faceVerificationStatus === 'verifying' || faceVerificationStatus === 'success'"
          >
            {{ isCapturing ? '验证中...' : faceVerificationStatus === 'success' ? '验证成功' : '确认打卡' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// 医生个人信息
const doctorInfo = ref({
  name: '陈**',
  title: '全科医生',
  avatar: 'https://ts1.tc.mm.bing.net/th/id/OIP-C.A82NfW0r1TjsMAeSpGYqtQAAAA?w=160&h=211&c=8&rs=1&qlt=90&o=6&dpr=1.7&pid=3.1&rm=2',
  address: '**省**市**区****路568号',
  phone: '138********',
  email: 'shenduye**@gmail.com'
})

// 工作时长相关
const workStartTime = ref<number | null>(null)
const currentTime = ref(Date.now())

// 判断是否同一天
const isSameDay = (t1: number, t2: number): boolean => {
  const d1 = new Date(t1)
  const d2 = new Date(t2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

// 清理过期的打卡记录（跨天或超过12小时）
const getValidWorkStartTime = (): number | null => {
  const saved = localStorage.getItem('workStartTime')
  if (!saved) return null

  const ts = parseInt(saved, 10)
  // 必须同时有上班人脸特征和记录ID，才视为已打卡（使用 InsightFace）
  const hasFeatures = !!localStorage.getItem('clockInFeatures')
  const hasRecordId = !!localStorage.getItem('clockInRecordId')

  if (Number.isNaN(ts) || !hasFeatures || !hasRecordId) {
    // 清除所有打卡相关数据
    localStorage.removeItem('workStartTime')
    localStorage.removeItem('clockInPhoto')
    localStorage.removeItem('clockInFeatures')
    localStorage.removeItem('clockInRecordId')
    localStorage.removeItem('clockInInsightFace')
    localStorage.removeItem('clockInFaceApi')
    return null
  }

  const now = Date.now()
  const twelveHours = 12 * 60 * 60 * 1000
  if (!isSameDay(ts, now) || now - ts > twelveHours) {
    // 清除所有打卡相关数据
    localStorage.removeItem('workStartTime')
    localStorage.removeItem('clockInPhoto')
    localStorage.removeItem('clockInFeatures')
    localStorage.removeItem('clockInRecordId')
    localStorage.removeItem('clockInInsightFace')
    localStorage.removeItem('clockInFaceApi')
    return null
  }

  return ts
}

// 初始化开始时间（若跨天或超时则重置为未打卡）
// 默认初始化为 null，确保显示"打卡上班"
workStartTime.value = getValidWorkStartTime()

// 格式化工作时长
const formatWorkDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return `${String(hours).padStart(2, '0')}时${String(minutes).padStart(2, '0')}分${String(seconds).padStart(2, '0')}秒`
}

// 计算当前工作时长
const workHours = computed(() => {
  if (!workStartTime.value) {
    return '00时00分00秒'
  }
  const duration = currentTime.value - workStartTime.value
  return formatWorkDuration(duration)
})

// 获取API基础URL
const getApiBaseUrl = (): string => {
  let apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (!apiBaseUrl) {
    apiBaseUrl = 'http://localhost:3000/api'
  } else {
    apiBaseUrl = apiBaseUrl.replace(':3001', ':3000')
  }
  return apiBaseUrl
}

// 上班打卡记录发送到后端（使用 InsightFace）
const sendClockInRecord = async (photo: string) => {
  try {
    const apiBaseUrl = getApiBaseUrl()
    console.log('📡 发送打卡记录到:', `${apiBaseUrl}/attendance/clock-in`)
    
    const payload = {
      userId: authStore.userInfo?.id || null,
      username: authStore.userInfo?.username || '未知用户',
      photo, // 只发送图片，后端使用 InsightFace 提取特征
    }

    const response = await fetch(`${apiBaseUrl}/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.getToken()}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const errorMsg = errData?.message || response.statusText || '保存打卡记录失败'
      console.error('❌ API 响应错误:', response.status, errorMsg)
      throw new Error(errorMsg)
    }

    const result = await response.json()
    if (result.success && result.data) {
      // 保存后端返回的特征数据到本地（用于下班验证）
      if (result.data.features && Array.isArray(result.data.features)) {
        localStorage.setItem('clockInFeatures', JSON.stringify(result.data.features))
        localStorage.setItem('clockInRecordId', result.data._id || result.data.id)
        localStorage.setItem('clockInInsightFace', 'true') // 标记使用 InsightFace
        console.log('✅ 打卡记录保存成功，特征维度:', result.data.features.length)
        return result.data
      } else {
        throw new Error('后端返回的数据格式错误：缺少特征向量')
      }
    } else {
      throw new Error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('❌ 发送打卡记录失败:', error)
    
    // 如果是网络错误，提供更友好的提示
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiBaseUrl = getApiBaseUrl()
      throw new Error(`无法连接到后端服务器（${apiBaseUrl}）。请确保：\n1. 后端服务已启动（npm run dev）\n2. Python 和 InsightFace 已安装\n3. 网络连接正常`)
    }
    
    throw error
  }
}

// 摄像头相关
const showCameraModal = ref(false)
const isClockOutModal = ref(false) // 区分上班和下班打卡
const videoStream = ref<MediaStream | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const isCapturing = ref(false)
const faceVerificationStatus = ref<'waiting' | 'verifying' | 'success' | 'failed'>('waiting')
const verificationMessage = ref('')

// 获取摄像头权限并显示视频流
const startCamera = async (isClockOut = false) => {
  try {
    verificationMessage.value = '正在启动摄像头...'
    
    // 请求摄像头权限
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // 前置摄像头
      },
      audio: false
    })
    
    videoStream.value = stream
    isClockOutModal.value = isClockOut
    showCameraModal.value = true
    faceVerificationStatus.value = 'waiting'
    verificationMessage.value = ''
    
    // 等待DOM更新后设置视频源
    await nextTick()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.play().catch(err => {
        console.error('视频播放失败:', err)
      })
    }
    
  } catch (error) {
    console.error('获取摄像头失败:', error)
    verificationMessage.value = ''
    
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        alert('请允许访问摄像头权限\n\n解决方法：\n1. 点击地址栏左侧的锁图标\n2. 允许摄像头权限\n3. 刷新页面重试')
      } else if (error.name === 'NotFoundError') {
        alert('未找到摄像头设备\n\n请检查：\n1. 摄像头是否已连接\n2. 是否被其他程序占用')
      } else if (error.name === 'NotReadableError') {
        alert('摄像头无法访问\n\n可能原因：\n1. 摄像头被其他程序占用\n2. 驱动程序问题\n3. 请关闭其他使用摄像头的程序后重试')
      } else {
        alert('无法访问摄像头: ' + error.message)
      }
    } else {
      alert('无法访问摄像头，请检查设备设置')
    }
  }
}

// 停止摄像头
const stopCamera = () => {
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop())
    videoStream.value = null
  }
  showCameraModal.value = false
  isClockOutModal.value = false
  faceVerificationStatus.value = 'waiting'
  verificationMessage.value = ''
}

// 提取一帧图像特征（用于人脸识别）- 增强版，更能区分不同人脸
const extractImageFeatures = (imageData: string): Promise<number[]> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 128 // 提高分辨率到128x128，提取更多细节
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve([])
        return
      }
      
      ctx.drawImage(img, 0, 0, size, size)
      const imageData = ctx.getImageData(0, 0, size, size)
      const pixels = imageData.data
      
      const features: number[] = []
      
      // 1. 更细的网格划分（8x8网格，提取更多区域特征）
      const gridSize = 8
      const cellSize = size / gridSize
      
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          let rSum = 0, gSum = 0, bSum = 0, graySum = 0, count = 0
          
          for (let y = Math.floor(gy * cellSize); y < Math.floor((gy + 1) * cellSize); y++) {
            for (let x = Math.floor(gx * cellSize); x < Math.floor((gx + 1) * cellSize); x++) {
              const idx = (y * size + x) * 4
              // 添加边界检查，避免 undefined 值
              const r = pixels[idx] || 0
              const g = pixels[idx + 1] || 0
              const b = pixels[idx + 2] || 0
              const gray = 0.299 * r + 0.587 * g + 0.114 * b // 灰度值
              
              rSum += r
              gSum += g
              bSum += b
              graySum += gray
              count++
            }
          }
          
          // RGB平均值
          features.push(rSum / count / 255)
          features.push(gSum / count / 255)
          features.push(bSum / count / 255)
          // 灰度平均值
          features.push(graySum / count / 255)
        }
      }
      
      // 2. 添加灰度直方图特征（16个bin，更能区分不同人脸）
      const histogramBins = 16
      const histogram = new Array(histogramBins).fill(0)
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] || 0
        const g = pixels[i + 1] || 0
        const b = pixels[i + 2] || 0
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        const bin = Math.floor(gray * histogramBins)
        histogram[Math.min(bin, histogramBins - 1)]++
      }
      // 归一化直方图
      const totalPixels = size * size
      for (let i = 0; i < histogramBins; i++) {
        features.push(histogram[i] / totalPixels)
      }
      
      // 3. 添加简单的边缘特征（Sobel算子简化版）
      const edgeFeatures: number[] = []
      for (let y = 1; y < size - 1; y += 4) { // 每4个像素采样一次，减少计算量
        for (let x = 1; x < size - 1; x += 4) {
          // 计算各方向的像素索引
          const idxTop = ((y - 1) * size + x) * 4
          const idxBottom = ((y + 1) * size + x) * 4
          const idxLeft = (y * size + (x - 1)) * 4
          const idxRight = (y * size + (x + 1)) * 4
          
          // 计算灰度值用于边缘检测
          const grayTop = 0.299 * (pixels[idxTop] || 0) + 0.587 * (pixels[idxTop + 1] || 0) + 0.114 * (pixels[idxTop + 2] || 0)
          const grayBottom = 0.299 * (pixels[idxBottom] || 0) + 0.587 * (pixels[idxBottom + 1] || 0) + 0.114 * (pixels[idxBottom + 2] || 0)
          const grayLeft = 0.299 * (pixels[idxLeft] || 0) + 0.587 * (pixels[idxLeft + 1] || 0) + 0.114 * (pixels[idxLeft + 2] || 0)
          const grayRight = 0.299 * (pixels[idxRight] || 0) + 0.587 * (pixels[idxRight + 1] || 0) + 0.114 * (pixels[idxRight + 2] || 0)
          
          const edgeX = Math.abs(grayRight - grayLeft) / 255
          const edgeY = Math.abs(grayBottom - grayTop) / 255
          const edgeMag = Math.sqrt(edgeX * edgeX + edgeY * edgeY)
          
          edgeFeatures.push(edgeMag)
        }
      }
      features.push(...edgeFeatures)
      
      resolve(features)
    }
    img.src = imageData
  })
}

// 对多帧特征求平均，降低单帧噪声
const averageFeatures = (featuresList: number[][]): number[] => {
  if (!featuresList.length || !featuresList[0]) return []
  const length = featuresList[0].length
  const sum = new Array(length).fill(0) as number[]

  for (const f of featuresList) {
    if (!f || f.length !== length) continue
    for (let i = 0; i < length; i++) {
        sum[i] = (sum[i] || 0) + (f[i] || 0)
      }
  }

  const count = featuresList.length
  return sum.map(v => v / count)
}

// 计算两张图片的相似度（余弦相似度）
const calculateSimilarity = (features1: number[], features2: number[]): number => {
  if (!features1 || !features2 || features1.length !== features2.length || features1.length === 0) {
    return 0
  }
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < features1.length; i++) {
    const f1 = features1[i] || 0
    const f2 = features2[i] || 0
    dotProduct += f1 * f2
    norm1 += f1 * f1
    norm2 += f2 * f2
  }
  
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  return Math.max(0, Math.min(1, similarity || 0)) // 确保在0-1之间
}

// 拍照打卡（上班）- 使用 InsightFace（后端处理）
const captureAndClockIn = async () => {
  if (!videoElement.value) return
  
  try {
    isCapturing.value = true
    verificationMessage.value = '正在识别人脸（InsightFace）...'
    
    // 创建canvas来捕获图像
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.value.videoWidth
    canvas.height = videoElement.value.videoHeight
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      alert('无法创建画布')
      return
    }
    
    // 捕获一帧图像
    ctx.drawImage(videoElement.value, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.9)

    // 发送到后端，使用 InsightFace 提取特征
    try {
      const result = await sendClockInRecord(imageData)
      
      // 保存打卡时间
      const now = Date.now()
      localStorage.setItem('workStartTime', now.toString())
      localStorage.setItem('clockInPhoto', imageData)
      workStartTime.value = now

      // 停止摄像头
      stopCamera()
      
      alert(result.message || '打卡成功！已使用 InsightFace 记录面部特征')
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : '未知错误'
      if (errorMsg.includes('未检测到人脸')) {
        alert('未检测到人脸，请正对摄像头重试')
      } else {
        alert('打卡失败：' + errorMsg)
      }
      throw apiError
    }
  } catch (error) {
    console.error('打卡失败:', error)
  } finally {
    isCapturing.value = false
    verificationMessage.value = ''
  }
}

// 下班打卡记录发送到后端（使用 InsightFace 验证）
const sendClockOutRecord = async (photo: string) => {
  try {
    const apiBaseUrl = getApiBaseUrl()
    const clockInRecordId = localStorage.getItem('clockInRecordId')
    
    const payload = {
      userId: authStore.userInfo?.id || null,
      username: authStore.userInfo?.username || '未知用户',
      photo, // 发送当前照片，后端使用 InsightFace 验证
      clockInRecordId, // 关联的上班打卡记录ID
    }

    const response = await fetch(`${apiBaseUrl}/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.getToken()}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    
    if (!response.ok) {
      // 403 表示验证失败（不是同一人）
      if (response.status === 403) {
        throw new Error(result.message || '人脸验证失败')
      }
      throw new Error(result.message || response.statusText || '保存打卡记录失败')
    }

    if (result.success && result.data) {
      return result.data
    } else {
      throw new Error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('发送下班打卡记录失败:', error)
    throw error
  }
}

// 拍照打卡（下班）- 使用 InsightFace（后端验证）
const captureAndClockOut = async () => {
  if (!videoElement.value) return
  
  try {
    isCapturing.value = true
    faceVerificationStatus.value = 'verifying'
    verificationMessage.value = '正在验证身份（InsightFace）...'
    
    // 检查是否有上班打卡记录
    const clockInRecordId = localStorage.getItem('clockInRecordId')
    const savedFeaturesStr = localStorage.getItem('clockInFeatures')
    const useInsightFace = localStorage.getItem('clockInInsightFace') === 'true'
    
    if (!savedFeaturesStr || !clockInRecordId) {
      faceVerificationStatus.value = 'failed'
      verificationMessage.value = '未找到上班打卡记录，请先打卡上班'
      return
    }
    
    // 如果使用 InsightFace，调用后端 API
    if (useInsightFace) {
      // 创建canvas来捕获图像
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.value.videoWidth
      canvas.height = videoElement.value.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        faceVerificationStatus.value = 'failed'
        verificationMessage.value = '无法捕获图像'
        return
      }
      
      // 捕获一帧图像
      ctx.drawImage(videoElement.value, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      
      // 发送到后端，使用 InsightFace 验证
      try {
        const result = await sendClockOutRecord(imageData)
        
        // 验证成功
        faceVerificationStatus.value = 'success'
        verificationMessage.value = result.message || `验证成功！人脸相似度：${result.similarity_percent}%`
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 完成下班打卡
        localStorage.removeItem('workStartTime')
        localStorage.removeItem('clockInPhoto')
        localStorage.removeItem('clockInFeatures')
        localStorage.removeItem('clockInRecordId')
        localStorage.removeItem('clockInInsightFace')
        workStartTime.value = null
        
        stopCamera()
        alert('下班打卡成功！')
      } catch (apiError) {
        const errorMsg = apiError instanceof Error ? apiError.message : '未知错误'
        if (errorMsg.includes('验证失败') || errorMsg.includes('相似度')) {
          faceVerificationStatus.value = 'failed'
          verificationMessage.value = errorMsg
        } else if (errorMsg.includes('未检测到人脸')) {
          faceVerificationStatus.value = 'failed'
          verificationMessage.value = '未检测到人脸，请正对摄像头重试'
        } else {
          faceVerificationStatus.value = 'failed'
          verificationMessage.value = '验证失败：' + errorMsg
        }
      }
      
      isCapturing.value = false
      return
    }
    
    // 解析保存的特征向量
    const savedFeatures = JSON.parse(savedFeaturesStr) as number[]
    
    // 兼容旧方法（如果之前没用 face-api.js）
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.value.videoWidth
    canvas.height = videoElement.value.videoHeight
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      faceVerificationStatus.value = 'failed'
      verificationMessage.value = '无法捕获图像'
      return
    }

    // 多帧采样，提高验证准确性
    const frames = 7
    const delay = 150
    const featuresList: number[][] = []

    for (let i = 0; i < frames; i++) {
      ctx.drawImage(videoElement.value, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      const f = await extractImageFeatures(imageData)
      if (f.length) {
        featuresList.push(f)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const currentFeatures = averageFeatures(featuresList)
    
    // 计算相似度
    const similarity = calculateSimilarity(savedFeatures, currentFeatures)
    const similarityPercent = Math.round(similarity * 100)
    
    // 计算特征向量的欧氏距离（作为额外验证）
    let euclideanDistance = 0
    if (savedFeatures && currentFeatures && savedFeatures.length === currentFeatures.length) {
      for (let i = 0; i < savedFeatures.length; i++) {
        const f1 = savedFeatures[i] || 0
        const f2 = currentFeatures[i] || 0
        const diff = f1 - f2
        euclideanDistance += diff * diff
      }
      euclideanDistance = Math.sqrt(euclideanDistance)
    }
    
    // 归一化距离（0-1之间，距离越小越相似）
    const normalizedDistance = savedFeatures && savedFeatures.length > 0 
      ? Math.min(1, euclideanDistance / Math.sqrt(savedFeatures.length)) 
      : 1
    const distanceSimilarity = 1 - normalizedDistance
    const distancePercent = Math.round(distanceSimilarity * 100)
    
    console.log('人脸相似度（余弦）:', similarityPercent + '%')
    console.log('人脸相似度（距离）:', distancePercent + '%')
    console.log('特征向量维度:', savedFeatures.length)
    
    // 双重验证：严格阈值，拒绝不同的人
    // 根据测试数据，不同的人能达到：余弦92.34%，距离87.18%，平均89.76%
    // 所以设置更严格的阈值：余弦相似度 ≥ 94%，距离相似度 ≥ 89%，且平均相似度 ≥ 91%
    // 同一个人通常能达到更高的相似度（95%+/90%+/92%+），所以仍能通过
    const cosineThreshold = 0.94
    const distanceThreshold = 0.89
    const avgThreshold = 0.91
    
    const avgSimilarity = (similarity + distanceSimilarity) / 2
    const avgPercent = Math.round(avgSimilarity * 100)
    
    const cosinePass = similarity >= cosineThreshold
    const distancePass = distanceSimilarity >= distanceThreshold
    const avgPass = avgSimilarity >= avgThreshold
    
    // 详细日志
    console.log('验证条件检查:')
    console.log('  余弦相似度:', similarity.toFixed(4), '>=', cosineThreshold, '?', cosinePass)
    console.log('  距离相似度:', distanceSimilarity.toFixed(4), '>=', distanceThreshold, '?', distancePass)
    console.log('  平均相似度:', avgSimilarity.toFixed(4), '>=', avgThreshold, '?', avgPass)
    
    // 必须同时满足：余弦≥94% 且 距离≥89% 且 平均值≥91%
    if (cosinePass && distancePass && avgPass) {
      // 验证成功
      faceVerificationStatus.value = 'success'
      verificationMessage.value = `验证成功！余弦相似度：${similarityPercent}%，距离相似度：${distancePercent}%，平均相似度：${avgPercent}%`
      
      // 延迟一下显示成功信息
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 完成下班打卡
      localStorage.removeItem('workStartTime')
      localStorage.removeItem('clockInPhoto')
      localStorage.removeItem('clockInFeatures')
      workStartTime.value = null
      
      // 停止摄像头
      stopCamera()
      
      alert('下班打卡成功！')
    } else {
      // 验证失败
      faceVerificationStatus.value = 'failed'
      let failReason = ''
      if (!cosinePass && !distancePass && !avgPass) {
        failReason = `余弦相似度${similarityPercent}%、距离相似度${distancePercent}%和平均相似度${avgPercent}%均未达到要求`
      } else if (!cosinePass) {
        failReason = `余弦相似度${similarityPercent}%未达到85%要求`
      } else if (!distancePass) {
        failReason = `距离相似度${distancePercent}%未达到80%要求`
      } else if (!avgPass) {
        failReason = `平均相似度${avgPercent}%未达到85%要求`
      }
      verificationMessage.value = `验证失败！${failReason}，需要与上班时同一人才能打卡下班`
    }
  } catch (error) {
    console.error('验证失败:', error)
    faceVerificationStatus.value = 'failed'
    verificationMessage.value = '验证过程出错，请重试'
  } finally {
    isCapturing.value = false
  }
}

// 打卡上班
const clockIn = async () => {
  // 先获取摄像头
  await startCamera()
}

// 打卡下班
const clockOut = async () => {
  // 检查是否有上班打卡记录
  const savedFeatures = localStorage.getItem('clockInFeatures')
  if (!savedFeatures) {
    alert('未找到上班打卡记录，请先打卡上班')
    return
  }
  
  // 启动摄像头进行人脸识别验证
  await startCamera(true)
}

// 定时器更新当前时间
let timer: number | null = null

onMounted(() => {
  // 每秒更新一次
  timer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  // 清理摄像头资源
  stopCamera()
})

// 统计数据
const stats = ref({
  experience: {
    years: 15,
    startYear: 2010
  },
  salary: '10k',
  satisfaction: 6.000
})

// 教育背景数据
const education = ref({
  university: 'Harvard University',
  location: '马萨诸塞厅,剑桥市,美国'
})

// 今日任务
const tasks = ref([
  {
    id: 1,
    title: '员工排班研讨会',
    description: '关于最新医疗技术的研讨会议',
    date: '2025年2月16日',
    time: '02:00 - 03:00'
  },
  {
    id: 2,
    title: '库存管理培训',
    description: '医疗设备库存管理系统培训',
    date: '2025年2月16日',
    time: '14:00 - 16:00'
  },
  {
    id: 3,
    title: '义诊活动',
    description: '社区免费义诊活动',
    date: '2025年2月16日',
    time: '08:00 - 12:00'
  }
])

// 考勤报告日期
const attendanceDays = ref(['周一', '周二', '周三', '周四', '周五'])
</script>

<style scoped>
.profile-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1d2129;
  margin: 0;
}

/* 图片和名字占一行 */
.profile-main-section {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.profile-avatar-wrapper {
  width: 200px;
  height: 260px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-buttons {
  display: flex;
  gap: 12px;
  width: 200px;
}

.avatar-buttons .btn-call,
.avatar-buttons .btn-chat {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-buttons .btn-call {
  background: #4CAF50;
  color: #fff;
}

.avatar-buttons .btn-call:hover {
  background: #45a049;
}

.avatar-buttons .btn-chat {
  background: #fff;
  color: #333;
  border: 1px solid #e0e0e0;
}

.avatar-buttons .btn-chat:hover {
  background: #f5f5f5;
}

.profile-right {
  flex: 1;
  display: flex;
  gap: 24px;
}

.profile-info-main {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-card {
  width: 300px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 三列布局 */
.profile-layout.three-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}


.profile-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-buttons {
  display: flex;
  gap: 8px;
}

.status-btn {
  padding: 4px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn.active {
  background: #4CAF50;
  border-color: #4CAF50;
  color: #fff;
}

.doctor-name {
  font-size: 24px;
  font-weight: 700;
  color: #1d2129;
  margin: 0;
}

.doctor-title {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.contact-icon {
  font-size: 16px;
}

/* 信息卡片通用样式 */
.info-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.large-number {
  font-size: 32px;
  font-weight: 700;
  color: #1d2129;
}

.card-description {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

/* 教育背景 */
.edu-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edu-icon {
  font-size: 32px;
}

.edu-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edu-university {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
}

.edu-location {
  font-size: 14px;
  color: #666;
}

/* 满意度 */
.satisfaction-content {
  display: flex;
  align-items: center;
  gap: 24px;
}

.satisfaction-gauge {
  position: relative;
  width: 120px;
  height: 120px;
}

.gauge-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(from -90deg, #4CAF50 0deg 324deg, #e0e0e0 324deg 360deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.gauge-circle::before {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
}

.gauge-text {
  position: relative;
  z-index: 1;
  font-size: 16px;
  font-weight: 600;
  color: #4CAF50;
}

.satisfaction-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.satisfaction-number {
  font-size: 24px;
  font-weight: 700;
  color: #1d2129;
}

.satisfaction-desc {
  font-size: 12px;
  color: #666;
}

/* 关于 */
.about-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  min-height: 100px;
}

.btn-edit {
  padding: 6px 16px;
  border: 1px solid #4CAF50;
  border-radius: 6px;
  background: #fff;
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #4CAF50;
  color: #fff;
}

/* 今日任务 */
.current-time {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.task-date {
  font-size: 12px;
  color: #666;
}

.task-description {
  font-size: 12px;
  color: #666;
}

.task-time-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.task-progress-bar {
  flex: 1;
  height: 4px;
  background: #4CAF50;
  border-radius: 2px;
}

/* 工作时长 */
.work-hours-display {
  font-size: 32px;
  font-weight: 700;
  color: #4CAF50;
  margin-bottom: 16px;
}

.clock-buttons {
  width: 100%;
}

.btn-clock-in,
.btn-clock-out {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clock-in {
  background: #4CAF50;
  color: #fff;
}

.btn-clock-in:hover {
  background: #45a049;
}

.btn-clock-out {
  background: #f44336;
  color: #fff;
}

.btn-clock-out:hover {
  background: #da190b;
}

/* 考勤报告 */
.filter-select {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}

.attendance-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 16px;
}

.attendance-grid {
  display: flex;
  gap: 12px;
}

.time-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 80px;
}

.time-slot {
  height: 40px;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.days-column {
  display: flex;
  gap: 12px;
  flex: 1;
}

.day-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.day-name {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #1d2129;
}

.attendance-cells {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attendance-cell {
  width: 100%;
  height: 40px;
  border-radius: 4px;
}

.attendance-cell.present {
  background: #4CAF50;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .profile-layout.three-columns {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-right {
    flex-direction: column;
  }

  .about-card {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .profile-container {
    padding: 16px;
  }

  .profile-main-section {
    flex-direction: column;
  }

  .profile-avatar-wrapper {
    width: 100%;
    height: 200px;
  }

  .avatar-buttons {
    width: 100%;
  }

  .profile-layout.three-columns {
    grid-template-columns: 1fr;
  }

  .satisfaction-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* 摄像头打卡模态框样式 */
.camera-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.camera-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.camera-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.camera-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.camera-modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* 镜像显示，更自然 */
}

.camera-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.camera-tips {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.camera-tips p {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.camera-modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-capture {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-capture {
  background: #4CAF50;
  color: #fff;
}

.btn-capture:hover:not(:disabled) {
  background: #45a049;
}

.btn-capture:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 验证状态覆盖层 */
.verification-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 12px;
  z-index: 10;
}

.verification-overlay.verifying {
  background: rgba(33, 150, 243, 0.8);
}

.verification-overlay.success {
  background: rgba(76, 175, 80, 0.9);
}

.verification-overlay.failed {
  background: rgba(244, 67, 54, 0.9);
}

.verification-overlay p {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
}

.failed-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  color: #f44336;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .camera-modal {
    width: 95%;
    margin: 20px;
  }

  .camera-modal-header,
  .camera-modal-body,
  .camera-modal-footer {
    padding: 16px;
  }
}
</style>
