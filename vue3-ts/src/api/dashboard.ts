/**
 * Dashboard API — 仪表盘数据接口
 */
import { request } from '../utils/request'

/** 获取总览统计 */
export function getDashboardOverview() {
  return request({ url: '/dashboard/overview', method: 'GET' })
}

/** 获取预约趋势（最近N天） */
export function getAppointmentTrend(days = 7) {
  return request({ url: `/dashboard/appointment-trend?days=${days}`, method: 'GET' })
}

/** 获取最近预约 */
export function getRecentAppointments(limit = 10) {
  return request({ url: `/dashboard/recent-appointments?limit=${limit}`, method: 'GET' })
}

/** 获取最近用户 */
export function getRecentUsers(limit = 10) {
  return request({ url: `/dashboard/recent-users?limit=${limit}`, method: 'GET' })
}
