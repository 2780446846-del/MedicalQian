/**
 * Patients API — 患者管理接口
 */
import { request } from '../utils/request'

export interface Patient {
  _id: string
  name: string
  gender: string
  age: number
  phone: string
  idCard: string
  address: string
  createdAt: string
}

/** 获取患者列表 */
export function getPatients(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return request({ url: '/collections/patients', method: 'GET', data: params })
}

/** 获取单个患者 */
export function getPatientById(id: string) {
  return request({ url: `/collections/patients/${id}`, method: 'GET' })
}

/** 创建患者 */
export function createPatient(data: Partial<Patient>) {
  return request({ url: '/collections/patients', method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 更新患者 */
export function updatePatient(id: string, data: Partial<Patient>) {
  return request({ url: `/collections/patients/${id}`, method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 删除患者 */
export function deletePatient(id: string) {
  return request({ url: `/collections/patients/${id}`, method: 'DELETE' })
}
