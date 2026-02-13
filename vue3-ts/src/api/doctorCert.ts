/**
 * DoctorCert API — 医师认证接口
 */
import { request } from '../utils/request'

/** 获取认证列表 */
export function getCertList(params?: { status?: string; page?: number; pageSize?: number; keyword?: string }) {
  return request({ url: '/doctor-cert/list', method: 'GET', data: params })
}

/** 获取认证详情 */
export function getCertDetail(id: string) {
  return request({ url: `/doctor-cert/detail/${id}`, method: 'GET' })
}

/** 审核认证 */
export function reviewCert(id: string, data: { status: string; reviewRemark?: string }) {
  return request({ url: `/doctor-cert/review/${id}`, method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
}

/** 撤销认证 */
export function revokeCert(id: string, reviewRemark?: string) {
  return request({ url: `/doctor-cert/revoke/${id}`, method: 'PUT', body: JSON.stringify({ reviewRemark }), headers: { 'Content-Type': 'application/json' } })
}

/** 获取待审核数量 */
export function getPendingCertCount() {
  return request({ url: '/doctor-cert/pending-count', method: 'GET' })
}
