// 基于 face-api.js 的人脸识别工具
import * as faceapi from 'face-api.js'

// 模型是否已加载
let modelsLoaded = false

// 加载 face-api.js 模型（带超时机制）
export const loadFaceModels = async (timeout: number = 10000): Promise<boolean> => {
  if (modelsLoaded) {
    return true
  }

  // 创建超时 Promise
  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      console.warn('⏱️ 模型加载超时，将使用基础识别方法')
      resolve(false)
    }, timeout)
  })

  // 模型加载 Promise
  const loadPromise = (async () => {
    try {
      // 尝试多个 CDN，按优先级顺序
      const CDN_URLS = [
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/', // jsdelivr CDN（推荐）
        'https://unpkg.com/@vladmandic/face-api/model/', // unpkg CDN（备用）
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/', // 旧版本 CDN
      ]
      
      let lastError: Error | null = null
      
      for (const MODEL_URL of CDN_URLS) {
        try {
          console.log(`尝试从 CDN 加载模型: ${MODEL_URL}`)
          // 每个模型单独设置超时（5秒）
          const modelPromises = [
            Promise.race([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('超时')), 5000))
            ]),
            Promise.race([
              faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('超时')), 5000))
            ]),
            Promise.race([
              faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('超时')), 5000))
            ])
          ]
          
          await Promise.all(modelPromises)
          
          modelsLoaded = true
          console.log('✅ Face-api.js 模型加载成功')
          return true
        } catch (cdnError) {
          console.warn(`CDN ${MODEL_URL} 加载失败:`, cdnError)
          lastError = cdnError as Error
          continue // 尝试下一个 CDN
        }
      }
      
      // 如果所有 CDN 都失败，尝试从本地加载
      throw lastError || new Error('所有 CDN 都加载失败')
    } catch (error) {
      console.error('❌ Face-api.js 模型 CDN 加载失败:', error)
      // 如果 CDN 加载失败，尝试从本地加载
      try {
        const LOCAL_MODEL_URL = '/models/'
        console.log('尝试从本地加载模型:', LOCAL_MODEL_URL)
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_URL)
        ])
        modelsLoaded = true
        console.log('✅ Face-api.js 模型从本地加载成功')
        return true
      } catch (localError) {
        console.error('❌ 本地模型加载也失败:', localError)
        console.warn('💡 提示：模型加载失败，将使用基础人脸识别方法')
        return false
      }
    }
  })()

  // 使用 Promise.race，哪个先完成就用哪个
  return Promise.race([loadPromise, timeoutPromise])
}

// 从图片中提取人脸特征（使用 face-api.js）
export const extractFaceDescriptor = async (
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> => {
  if (!modelsLoaded) {
    const loaded = await loadFaceModels()
    if (!loaded) {
      return null
    }
  }

  try {
    // 检测人脸并提取特征描述符
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (detection) {
      // 返回 128 维的人脸特征向量
      return detection.descriptor
    }

    return null
  } catch (error) {
    console.error('提取人脸特征失败:', error)
    return null
  }
}

// 从 base64 图片提取人脸特征
export const extractFaceDescriptorFromBase64 = async (
  base64Image: string
): Promise<Float32Array | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = async () => {
      const descriptor = await extractFaceDescriptor(img)
      resolve(descriptor)
    }
    img.onerror = () => {
      console.error('图片加载失败')
      resolve(null)
    }
    img.src = base64Image
  })
}

// 计算两个人脸描述符的相似度（欧氏距离）
export const calculateFaceSimilarity = (
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number => {
  if (descriptor1.length !== descriptor2.length) {
    return 0
  }

  // 计算欧氏距离
  let distance = 0
  for (let i = 0; i < descriptor1.length; i++) {
    const val1 = descriptor1[i]
    const val2 = descriptor2[i]
    if (val1 !== undefined && val2 !== undefined) {
      const diff = val1 - val2
      distance += diff * diff
    }
  }
  distance = Math.sqrt(distance)

  // 转换为相似度（0-1之间，距离越小相似度越高）
  // face-api.js 的 descriptor 通常距离在 0-2 之间，相似人脸距离 < 0.6
  // 相似度 = 1 - (distance / 2)，但限制在合理范围
  const maxDistance = 2.0
  const similarity = Math.max(0, Math.min(1, 1 - (distance / maxDistance)))
  
  return similarity
}

// 判断是否为同一人（阈值：0.6，face-api.js 推荐值）
export const isSamePerson = (
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold: number = 0.6
): boolean => {
  const similarity = calculateFaceSimilarity(descriptor1, descriptor2)
  // face-api.js 使用距离阈值，通常 < 0.6 认为是同一人
  // 我们转换为相似度阈值：相似度 > 0.7 认为是同一人
  return similarity > (1 - threshold)
}

