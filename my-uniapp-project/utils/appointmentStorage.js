/**
 * 预约记录本地存储工具
 */

const STORAGE_KEY = 'appointment_records'

/**
 * 获取所有预约记录
 */
export function getAllAppointments() {
  try {
    const records = uni.getStorageSync(STORAGE_KEY)
    return records ? JSON.parse(records) : []
  } catch (error) {
    console.error('获取预约记录失败:', error)
    return []
  }
}

/**
 * 保存预约记录
 * @param {Object} appointmentData - 预约数据
 */
export function saveAppointment(appointmentData) {
  try {
    const records = getAllAppointments()
    
    // 生成预约ID（如果不存在）
    if (!appointmentData.id) {
      appointmentData.id = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // 设置创建时间（如果不存在）
    if (!appointmentData.createdAt) {
      appointmentData.createdAt = Date.now()
    }
    
    // 设置默认状态为待就诊
    if (!appointmentData.status) {
      appointmentData.status = 'pendingVisit'
    }
    
    // 更新最后更新时间
    appointmentData.updatedAt = Date.now()
    
    // 检查是否已存在（根据ID查找）
    const existingIndex = records.findIndex(r => r.id === appointmentData.id)
    
    if (existingIndex >= 0) {
      // 更新现有记录
      records[existingIndex] = {
        ...records[existingIndex],
        ...appointmentData,
        updatedAt: Date.now()
      }
    } else {
      // 添加新记录（插入到开头）
      records.unshift(appointmentData)
    }
    
    // 限制最多保存100条记录
    if (records.length > 100) {
      records.splice(100)
    }
    
    // 保存到本地存储
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(records))
    
    console.log('✅ 预约记录已保存:', appointmentData.id)
    return appointmentData.id
  } catch (error) {
    console.error('保存预约记录失败:', error)
    throw error
  }
}

/**
 * 根据ID获取预约记录
 * @param {String} appointmentId - 预约ID
 */
export function getAppointmentById(appointmentId) {
  try {
    const records = getAllAppointments()
    return records.find(r => r.id === appointmentId) || null
  } catch (error) {
    console.error('获取预约记录失败:', error)
    return null
  }
}

/**
 * 更新预约状态
 * @param {String} appointmentId - 预约ID
 * @param {String} status - 新状态 (pendingVisit, pendingRate, rated, history)
 */
export function updateAppointmentStatus(appointmentId, status) {
  try {
    const records = getAllAppointments()
    const index = records.findIndex(r => r.id === appointmentId)
    
    if (index >= 0) {
      records[index].status = status
      records[index].updatedAt = Date.now()
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(records))
      console.log('✅ 预约状态已更新:', appointmentId, status)
      return true
    }
    return false
  } catch (error) {
    console.error('更新预约状态失败:', error)
    return false
  }
}

/**
 * 根据状态获取预约记录
 * @param {String} status - 状态 (pendingVisit, pendingRate, rated, history, all)
 */
export function getAppointmentsByStatus(status) {
  try {
    const records = getAllAppointments()
    if (status === 'all') {
      return records
    }
    return records.filter(r => r.status === status)
  } catch (error) {
    console.error('获取预约记录失败:', error)
    return []
  }
}

/**
 * 获取待就诊数量
 */
export function getPendingVisitCount() {
  try {
    const records = getAllAppointments()
    return records.filter(r => r.status === 'pendingVisit').length
  } catch (error) {
    console.error('获取待就诊数量失败:', error)
    return 0
  }
}

/**
 * 删除预约记录
 * @param {String} appointmentId - 预约ID
 */
export function deleteAppointment(appointmentId) {
  try {
    const records = getAllAppointments()
    const filtered = records.filter(r => r.id !== appointmentId)
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(filtered))
    console.log('✅ 预约记录已删除:', appointmentId)
    return true
  } catch (error) {
    console.error('删除预约记录失败:', error)
    return false
  }
}

/**
 * 清除所有预约记录
 */
export function clearAllAppointments() {
  try {
    uni.removeStorageSync(STORAGE_KEY)
    console.log('✅ 所有预约记录已清除')
    return true
  } catch (error) {
    console.error('清除预约记录失败:', error)
    return false
  }
}

