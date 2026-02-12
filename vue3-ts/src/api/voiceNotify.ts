/**
 * VoiceNotify API — 语音通知接口
 */
import { request } from '../utils/request'

export interface VoiceNotifyParams {
  patientId: string
  patientName: string
  phone: string
  appointmentId?: string
  doctorName?: string
  department?: string
  appointmentTime?: string
  clinicLocation?: string
  requiredDocuments?: string
  hospitalName?: string
}

export interface VoiceNotifyLog {
  _id: string
  patientId: string
  patientName: string
  phone: string
  doctorName: string
  department: string
  appointmentTime: string
  voiceContent: string
  status: 'pending' | 'success' | 'failed'
  errorMessage: string
  operatorName: string
  createdAt: string
}

/** 发送单个患者语音通知 */
export function sendVoiceNotify(data: VoiceNotifyParams) {
  return request({
    url: '/voice-notify/send',
    method: 'POST',
    data
  })
}

/** 批量发送语音通知 */
export function batchSendVoiceNotify(patients: VoiceNotifyParams[]) {
  return request({
    url: '/voice-notify/batch',
    method: 'POST',
    data: { patients }
  })
}

/** 获取通知日志 */
export function getVoiceNotifyLogs(params?: { phone?: string; patientId?: string; status?: string; page?: number; pageSize?: number }) {
  return request({
    url: '/voice-notify/logs',
    method: 'GET',
    data: params
  })
}

/** 获取患者最近预约 */
export function getPatientAppointment(patientId: string) {
  return request({
    url: `/voice-notify/patient-appointment/${patientId}`,
    method: 'GET'
  })
}
