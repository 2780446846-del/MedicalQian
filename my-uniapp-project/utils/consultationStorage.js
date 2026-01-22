/**
 * 咨询记录本地存储工具
 */

import { getUserInfo } from '@/utils/auth.js'

const STORAGE_KEY_PREFIX = 'consultation_records_'

/**
 * 获取当前用户的存储key
 * @param {String} userId - 用户ID
 */
function getStorageKey(userId) {
  if (!userId) {
    console.warn('⚠️ 用户ID为空，使用默认key（可能导致数据混乱）')
    return 'consultation_records_default'
  }
  return `${STORAGE_KEY_PREFIX}${userId}`
}

/**
 * 获取所有咨询记录（仅当前用户）
 * @param {String} userId - 用户ID，如果不提供则尝试从auth获取
 */
export function getAllConsultations(userId = null) {
  try {
    // 如果没有提供userId，尝试从auth获取
    if (!userId) {
      try {
        const userInfo = getUserInfo()
        userId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username
      } catch (e) {
        console.warn('无法从auth获取用户ID:', e)
      }
    }
    
    const storageKey = getStorageKey(userId)
    const records = uni.getStorageSync(storageKey)
    return records ? JSON.parse(records) : []
  } catch (error) {
    console.error('获取咨询记录失败:', error)
    return []
  }
}

/**
 * 保存咨询记录
 * @param {Object} consultationData - 咨询数据
 * @param {String} userId - 用户ID，如果不提供则尝试从auth或consultationData获取
 */
export function saveConsultation(consultationData, userId = null) {
  try {
    // 获取患者ID（用于判断是否是同一个患者）
    const patientId = consultationData.patientId || consultationData.patientInfo?.id
    
    // 如果没有提供userId，优先从consultationData获取，其次从auth获取
    if (!userId) {
      userId = patientId
      if (!userId) {
        try {
          const userInfo = getUserInfo()
          userId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username
        } catch (e) {
          console.warn('无法从auth获取用户ID:', e)
        }
      }
    }
    
    // 确保consultationData包含正确的patientId
    if (!consultationData.patientId && patientId) {
      consultationData.patientId = patientId
    }
    
    const records = getAllConsultations(userId)
    
    // 查找是否已存在同一患者的咨询记录
    // 优先根据咨询ID查找（确保从"我的咨询"进入时能正确更新记录）
    let existingIndex = -1
    if (consultationData.id) {
      // 优先根据咨询ID查找
      existingIndex = records.findIndex(r => r.id === consultationData.id)
      console.log('🔍 根据咨询ID查找:', consultationData.id, existingIndex >= 0 ? '找到' : '未找到')
    }
    
    // 如果根据ID没找到，则根据患者信息查找（优先根据患者ID，其次根据患者姓名、性别、年龄）
    if (existingIndex < 0) {
      existingIndex = records.findIndex(r => {
        const rPatientId = r.patientId || r.patientInfo?.id
        const rInfo = r.patientInfo || {}
        const newInfo = consultationData.patientInfo || {}
        
        // 如果患者ID相同，则认为是同一患者
        if (patientId && rPatientId === patientId) {
          return true
        }
        
        // 根据患者信息（姓名+性别+年龄）匹配，通过图二中的信息来区分
        const nameMatch = newInfo.name && rInfo.name === newInfo.name
        const genderMatch = (newInfo.gender || '') === (rInfo.gender || '')
        const ageMatch = (newInfo.age || '') === (rInfo.age || '')
        
        // 通过姓名+性别+年龄来判断是否是同一患者（图二中的信息）
        if (nameMatch && genderMatch && ageMatch) {
          return true
        }
        
        return false
      })
      console.log('🔍 根据患者信息查找:', {
        patientId: patientId,
        patientName: consultationData.patientInfo?.name,
        found: existingIndex >= 0 ? '找到' : '未找到'
      })
    }
    
    if (existingIndex >= 0) {
      // 合并到现有记录
      const existing = records[existingIndex]
      
      // 合并消息（去重，保留最新的）
      const existingMessages = existing.messages || []
      const newMessages = consultationData.messages || []
      const messageMap = new Map()
      
      // 先添加现有消息
      existingMessages.forEach(msg => {
        messageMap.set(msg.id || `${msg.timestamp}_${msg.content}`, msg)
      })
      
      // 添加新消息（如果有相同的ID则更新，否则添加）
      newMessages.forEach(msg => {
        const key = msg.id || `${msg.timestamp}_${msg.content}`
        if (!messageMap.has(key) || (messageMap.get(key).timestamp < msg.timestamp)) {
          messageMap.set(key, msg)
        }
      })
      
      // 合并图片（去重）
      const existingImages = existing.symptomImages || []
      const newImages = consultationData.symptomImages || []
      const imageMap = new Map()
      
      // 先添加现有图片
      existingImages.forEach(img => {
        const key = img.path || img.thumb || img
        imageMap.set(key, img)
      })
      
      // 添加新图片（如果路径不同）
      newImages.forEach(img => {
        const key = img.path || img.thumb || img
        if (!imageMap.has(key)) {
          imageMap.set(key, img)
        }
      })
      
      // 合并症状描述（如果新描述更长或更详细，则更新）
      let symptomDescription = existing.symptomDescription || ''
      if (consultationData.symptomDescription) {
        if (!symptomDescription || consultationData.symptomDescription.length > symptomDescription.length) {
          symptomDescription = consultationData.symptomDescription
        }
      }
      
      // 更新现有记录（合并数据）
      records[existingIndex] = {
        ...existing,
        ...consultationData,
        id: existing.id, // 保留原有ID
        createdAt: existing.createdAt, // 保留创建时间
        updatedAt: Date.now(), // 更新最后修改时间
        messages: Array.from(messageMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)), // 按时间排序
        symptomImages: Array.from(imageMap.values()),
        symptomDescription: symptomDescription,
        patientId: patientId || existing.patientId, // 保留或更新患者ID
        patientInfo: {
          ...existing.patientInfo,
          ...consultationData.patientInfo
        }
      }
      
      console.log('✅ 咨询记录已合并:', existing.id, '消息数:', records[existingIndex].messages.length, '图片数:', records[existingIndex].symptomImages.length)
      return existing.id
    } else {
      // 创建新记录
      // 生成咨询ID
      if (!consultationData.id) {
        consultationData.id = `consult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      // 设置创建时间
      if (!consultationData.createdAt) {
        consultationData.createdAt = Date.now()
      }
      
      // 更新最后更新时间
      consultationData.updatedAt = Date.now()
      
      // 添加新记录（插入到开头）
      records.unshift(consultationData)
      
      console.log('✅ 咨询记录已创建:', consultationData.id)
    }
    
    // 限制最多保存50条记录
    if (records.length > 50) {
      records.splice(50)
    }
    
    // 保存到本地存储（使用用户特定的key）
    const storageKey = getStorageKey(userId)
    uni.setStorageSync(storageKey, JSON.stringify(records))
    
    return consultationData.id || records[0].id
  } catch (error) {
    console.error('保存咨询记录失败:', error)
    throw error
  }
}

/**
 * 根据ID获取咨询记录
 * @param {String} consultationId - 咨询ID
 * @param {String} userId - 用户ID，如果不提供则尝试从auth获取
 */
export function getConsultationById(consultationId, userId = null) {
  try {
    const records = getAllConsultations(userId)
    return records.find(r => r.id === consultationId) || null
  } catch (error) {
    console.error('获取咨询记录失败:', error)
    return null
  }
}

/**
 * 删除咨询记录
 * @param {String} consultationId - 咨询ID
 * @param {String} userId - 用户ID，如果不提供则尝试从auth获取
 */
export function deleteConsultation(consultationId, userId = null) {
  try {
    const records = getAllConsultations(userId)
    const filtered = records.filter(r => r.id !== consultationId)
    const storageKey = getStorageKey(userId)
    uni.setStorageSync(storageKey, JSON.stringify(filtered))
    console.log('✅ 咨询记录已删除:', consultationId)
    return true
  } catch (error) {
    console.error('删除咨询记录失败:', error)
    return false
  }
}

/**
 * 清除所有咨询记录（当前用户）
 * @param {String} userId - 用户ID，如果不提供则尝试从auth获取
 */
export function clearAllConsultations(userId = null) {
  try {
    // 如果没有提供userId，尝试从auth获取
    if (!userId) {
      try {
        const userInfo = getUserInfo()
        userId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username
      } catch (e) {
        console.warn('无法从auth获取用户ID:', e)
      }
    }
    
    const storageKey = getStorageKey(userId)
    uni.removeStorageSync(storageKey)
    console.log('✅ 咨询记录已清除（用户:', userId, '）')
    return true
  } catch (error) {
    console.error('清除咨询记录失败:', error)
    return false
  }
}

/**
 * 格式化时间
 * @param {Number} timestamp - 时间戳
 */
export function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  // 超过7天显示具体日期
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}
