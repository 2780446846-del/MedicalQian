/**
 * Appointments API — 预约管理接口
 */
import { request } from '../utils/request'

/** 获取预约列表 */
export function getAppointments(params?: { status?: string }) {
  return request({ url: '/appointment', method: 'GET', data: params })
}

/** 获取单个预约 */
export function getAppointmentById(id: string) {
  return request({ url: `/appointment/${id}`, method: 'GET' })
}

/** 创建预约 */
export function createAppointment(data: Record<string, unknown>) {
  return request({ url: '/appointment', method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 更新预约 */
export function updateAppointment(id: string, data: Record<string, unknown>) {
  return request({ url: `/appointment/${id}`, method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 删除预约 */
export function deleteAppointment(id: string) {
  return request({ url: `/appointment/${id}`, method: 'DELETE' })
}

/** 更新预约状态 */
export function updateAppointmentStatus(id: string, status: string) {
  return request({ url: `/appointment/${id}/status`, method: 'PUT', body: JSON.stringify({ status }), headers: { 'Content-Type': 'application/json' } })
}
