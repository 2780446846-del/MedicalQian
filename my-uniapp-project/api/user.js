/**
 * 用户 API 模块
 */
import { get, post, put } from '../utils/api.js'

/** 获取当前用户信息 */
export function getUserInfo() {
  return get('/auth/me')
}

/** 更新用户信息 */
export function updateUserInfo(data) {
  return put('/auth/me', data)
}

/** 账号密码登录 */
export function loginByAccount(username, password) {
  return post('/auth/login', { username, password })
}

/** 手机验证码登录 */
export function loginByPhone(phone, code) {
  return post('/auth/login-by-code', { phone, code })
}

/** 发送短信验证码 */
export function sendSmsCode(phone) {
  return post('/auth/send-code', { phone })
}

/** 注册 */
export function register(data) {
  return post('/auth/register', data)
}

/** 绑定手机号 */
export function bindPhone(phone, code) {
  return post('/auth/bind/phone', { phone, code })
}
