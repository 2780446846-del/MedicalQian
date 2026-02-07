/**
 * 腾讯云 TRTC 配置（APP 端实时音视频）
 *
 * 使用前请：
 * 1. 在腾讯云控制台开通「实时音视频」并创建应用，获取 SDKAppID 和 SecretKey
 *    https://console.cloud.tencent.com/trtc
 * 2. 在 HBuilderX 中安装原生插件：【官方】腾讯云实时音视频 SDK
 *    https://ext.dcloud.net.cn/plugin?id=7774
 * 3. 使用「自定义调试基座」打包运行（真机调试）
 *
 * UserSig 建议由后端生成（安全）。若后端已提供接口，设置 GET_USER_SIG_URL。
 */
import { API_BASE_URL } from './config.js'

/** TRTC 应用 ID，0 表示未配置 */
export const TRTC_SDK_APP_ID = 0

/**
 * 从后端获取 UserSig（推荐）
 * 后端需实现：GET /api/trtc/userSig?userId=xxx 返回 { userSig, sdkAppId }
 * 若为空则使用本地调试方式（需在 GenerateTestUserSig 中配置 SECRETKEY，仅调试用）
 */
export const GET_USER_SIG_URL = API_BASE_URL.replace(/\/api$/, '') + '/api/trtc/userSig'

/**
 * 请求 UserSig
 * @param {string} userId - 用户 ID（建议与业务一致，如患者 ID）
 * @returns {Promise<{ userSig: string, sdkAppId: number }>}
 */
export async function fetchUserSig(userId) {
  if (!userId) throw new Error('userId 不能为空')
  const url = `${GET_USER_SIG_URL}?userId=${encodeURIComponent(userId)}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error('获取 UserSig 失败: ' + (text || res.status))
  }
  const data = await res.json()
  if (!data.userSig) throw new Error('后端未返回 userSig')
  return {
    userSig: data.userSig,
    sdkAppId: data.sdkAppId != null ? data.sdkAppId : TRTC_SDK_APP_ID
  }
}

export default {
  TRTC_SDK_APP_ID,
  GET_USER_SIG_URL,
  fetchUserSig
}
