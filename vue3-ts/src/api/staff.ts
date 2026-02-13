/**
 * Staff API — 员工管理接口
 */
import { request } from '../utils/request'

export interface StaffMember {
  _id: string
  name: string
  employeeId: string
  phone: string
  email: string
  gender: string
  department: string
  position: string
  jobTitle: string
  workStatus: string
  birthday: string
  hireDate: string
  address: string
  idCard: string
  emergencyContact: string
  remarks: string
}

/** 获取员工列表 */
export function getStaffList(params?: { keyword?: string; page?: number; pageSize?: number; department?: string; workStatus?: string }) {
  return request({ url: '/staff/list', method: 'GET', data: params })
}

/** 获取部门列表 */
export function getDepartments() {
  return request({ url: '/staff/departments', method: 'GET' })
}

/** 获取员工详情 */
export function getStaffById(id: string) {
  return request({ url: `/staff/${id}`, method: 'GET' })
}

/** 创建员工 */
export function createStaff(data: Partial<StaffMember>) {
  return request({ url: '/staff', method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 更新员工 */
export function updateStaff(id: string, data: Partial<StaffMember>) {
  return request({ url: `/staff/${id}`, method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 删除员工 */
export function deleteStaff(id: string) {
  return request({ url: `/staff/${id}`, method: 'DELETE' })
}

/** 批量导入 */
export function batchImportStaff(staffList: Partial<StaffMember>[]) {
  return request({ url: '/staff/batch', method: 'POST', body: JSON.stringify({ staffList }), headers: { 'Content-Type': 'application/json' } })
}
