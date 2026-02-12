/**
 * 问诊 API 模块
 */
import { get, post, put } from '../utils/api.js'

/** 获取问诊列表 */
export function getConsultationList(params = {}) {
  return get('/consultation', params)
}

/** 获取问诊详情 */
export function getConsultationDetail(id) {
  return get(`/consultation/${id}`)
}

/** 创建问诊 */
export function createConsultation(data) {
  return post('/consultation', data)
}

/** 更新问诊状态 */
export function updateConsultationStatus(id, status) {
  return put(`/consultation/${id}/status`, { status })
}
