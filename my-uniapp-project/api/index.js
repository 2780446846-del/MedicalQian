/**
 * API 模块统一导出
 */
export { getDoctorList, getDepartments, getDoctorDetail } from './doctor.js'
export { getAllAppointments, getAppointmentById, createAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus } from './appointment.js'
export { getConsultationList, getConsultationDetail, createConsultation, updateConsultationStatus } from './consultation.js'
export { getUserInfo, updateUserInfo, loginByAccount, loginByPhone, sendSmsCode, register, bindPhone } from './user.js'
