/**
 * 就诊人数据存储管理
 * 使用本地存储管理就诊人信息
 */

/**
 * 获取当前用户ID
 */
function getCurrentUserId() {
  try {
    const app = getApp && getApp();
    const userInfo = (app && app.globalData && app.globalData.userInfo) || uni.getStorageSync('userInfo') || {};
    return userInfo.id || userInfo._id || userInfo.userId || userInfo.username || userInfo.phone || 'default';
  } catch (e) {
    return 'default';
  }
}

/**
 * 获取所有就诊人列表
 * @returns {Array} 就诊人列表
 */
export function getPatients() {
  try {
    const userId = getCurrentUserId();
    const key = `patients_${userId}`;
    const patients = uni.getStorageSync(key) || [];
    return patients;
  } catch (e) {
    console.error('获取就诊人列表失败:', e);
    return [];
  }
}

/**
 * 保存就诊人
 * @param {Object} patient 就诊人信息
 * @returns {string} 就诊人ID
 */
export function savePatient(patient) {
  try {
    const userId = getCurrentUserId();
    const key = `patients_${userId}`;
    let patients = uni.getStorageSync(key) || [];
    
    if (patient.id) {
      // 编辑模式：更新现有就诊人
      const index = patients.findIndex(p => p.id === patient.id);
      if (index !== -1) {
        patients[index] = { ...patient, updatedAt: new Date().toISOString() };
      } else {
        patients.push({ ...patient, id: patient.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    } else {
      // 新增模式：创建新就诊人
      const newPatient = {
        ...patient,
        id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      patients.push(newPatient);
    }
    
    uni.setStorageSync(key, patients);
    return patient.id || patients[patients.length - 1].id;
  } catch (e) {
    console.error('保存就诊人失败:', e);
    throw e;
  }
}

/**
 * 删除就诊人
 * @param {string} patientId 就诊人ID
 * @returns {boolean} 是否删除成功
 */
export function deletePatient(patientId) {
  try {
    const userId = getCurrentUserId();
    const key = `patients_${userId}`;
    let patients = uni.getStorageSync(key) || [];
    patients = patients.filter(p => p.id !== patientId);
    uni.setStorageSync(key, patients);
    return true;
  } catch (e) {
    console.error('删除就诊人失败:', e);
    return false;
  }
}

/**
 * 获取单个就诊人信息
 * @param {string} patientId 就诊人ID
 * @returns {Object|null} 就诊人信息
 */
export function getPatientById(patientId) {
  try {
    const patients = getPatients();
    return patients.find(p => p.id === patientId) || null;
  } catch (e) {
    console.error('获取就诊人信息失败:', e);
    return null;
  }
}

/**
 * 设置默认就诊人
 * @param {string} patientId 就诊人ID
 * @returns {boolean} 是否设置成功
 */
export function setDefaultPatient(patientId) {
  try {
    const userId = getCurrentUserId();
    const key = `defaultPatient_${userId}`;
    uni.setStorageSync(key, patientId);
    return true;
  } catch (e) {
    console.error('设置默认就诊人失败:', e);
    return false;
  }
}

/**
 * 获取默认就诊人
 * @returns {Object|null} 默认就诊人信息
 */
export function getDefaultPatient() {
  try {
    const userId = getCurrentUserId();
    const key = `defaultPatient_${userId}`;
    const defaultPatientId = uni.getStorageSync(key);
    if (defaultPatientId) {
      return getPatientById(defaultPatientId);
    }
    // 如果没有设置默认就诊人，返回第一个就诊人
    const patients = getPatients();
    return patients.length > 0 ? patients[0] : null;
  } catch (e) {
    console.error('获取默认就诊人失败:', e);
    return null;
  }
}

