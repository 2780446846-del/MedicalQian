/**
 * 医生 API 模块
 */
import { get } from '../utils/api.js'

/** 获取医生列表 */
export function getDoctorList(params = {}) {
  return get('/doctor', params)
}

/** 获取科室列表 */
export function getDepartments() {
  return get('/doctor/departments')
}

/** 获取医生详情 */
export function getDoctorDetail(id) {
  return get(`/doctor/${id}`)
}
