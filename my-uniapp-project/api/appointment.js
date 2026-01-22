/**
 * 预约管理API
 */
import { request } from '@/utils/request.js';

// 获取当前用户ID（兼容多种存储字段）
function getCurrentUserId() {
  try {
    const userInfo = uni.getStorageSync('sso_user_info') || uni.getStorageSync('userInfo') || {};
    const currentUserId = uni.getStorageSync('currentUserId');
    return (
      currentUserId ||
      userInfo.id ||
      userInfo._id ||
      userInfo.userId ||
      userInfo.username ||
      ''
    );
  } catch (e) {
    return '';
  }
}

/**
 * 获取所有预约
 */
export function getAllAppointments(status = 'all') {
  const userId = getCurrentUserId();
  // 如果没有用户ID，仍然请求，但后端会使用默认 anonymous，可能查不到数据
  const queryUser = userId ? `&userId=${encodeURIComponent(userId)}` : '';
  return request({
    url: `/appointment?status=${status}${queryUser}`,
    method: 'GET',
    showLoading: false,
    showError: false
  });
}

/**
 * 获取单个预约
 */
export function getAppointmentById(id) {
  return request({
    url: `/appointment/${id}`,
    method: 'GET',
    showLoading: false,
    showError: false
  });
}

/**
 * 创建预约
 */
export function createAppointment(appointmentData) {
  return request({
    url: '/appointment',
    method: 'POST',
    data: appointmentData,
    showLoading: true,
    showError: true
  });
}

/**
 * 更新预约
 */
export function updateAppointment(id, appointmentData) {
  return request({
    url: `/appointment/${id}`,
    method: 'PUT',
    data: appointmentData,
    showLoading: true,
    showError: true
  });
}

/**
 * 删除预约
 */
export function deleteAppointment(id) {
  return request({
    url: `/appointment/${id}`,
    method: 'DELETE',
    showLoading: true,
    showError: true
  });
}

/**
 * 更新预约状态
 */
export function updateAppointmentStatus(id, status) {
  return request({
    url: `/appointment/${id}/status`,
    method: 'PUT',
    data: { status },
    showLoading: true,
    showError: true
  });
}





