import { request } from '@/utils/request.js'
import { ONECLICK_CONFIG } from './oneclick.config.js'

const isPlainObject = (val) => Object.prototype.toString.call(val) === '[object Object]'

const deepMerge = (target = {}, source = {}) => {
  const output = { ...target }
  Object.keys(source || {}).forEach((key) => {
    const sourceVal = source[key]
    if (isPlainObject(sourceVal)) {
      output[key] = deepMerge(isPlainObject(output[key]) ? output[key] : {}, sourceVal)
    } else {
      output[key] = sourceVal
    }
  })
  return output
}

const closeAuthViewSafely = () => {
  try {
    if (typeof uni !== 'undefined' && typeof uni.closeAuthView === 'function') {
      uni.closeAuthView()
    }
  } catch (error) {
    console.warn('[oneclick] closeAuthView failed', error)
  }
}

const requestLoginByPhone = async (phone) => {
  console.log('[oneclick] requesting backend /login/onekey with phone:', phone)
  const loginResp = await request({
    url: '/login/onekey',
    method: 'POST',
    data: { phone },
    needAuth: false,
    showLoading: false,
    showError: false,
  })

  const token =
    loginResp?.token ||
    loginResp?.data?.token ||
    loginResp?.result?.token ||
    loginResp?.raw?.token

  const inferredData =
    (isPlainObject(loginResp?.data) && loginResp.data) ||
    (isPlainObject(loginResp?.result) && loginResp.result) ||
    loginResp?.user ||
    loginResp?.profile ||
    loginResp

  const normalized = {
    success: loginResp?.success ?? loginResp?.code === 0 ?? loginResp?.status === 'ok',
    token,
    data: inferredData,
    message: loginResp?.message || loginResp?.msg || loginResp?.errorMsg || loginResp?.error,
    raw: loginResp,
  }

  console.log('[oneclick] backend /login/onekey response:', normalized)
  return normalized
}

// #ifdef APP-PLUS
const preLoginUniverify = () =>
  new Promise((resolve, reject) => {
    uni.preLogin({
      provider: 'univerify',
      success: resolve,
      fail: (err) => {
        console.warn('[oneclick] preLogin failed', err)
        reject(err)
      },
    })
  })

const pickValidPhone = (...candidates) => {
  return candidates.find((item) => {
    if (!item) return false
    if (typeof item === 'string' && item.trim()) return true
    if (typeof item === 'number') return true
    return false
  })
}

const extractDirectPhone = (authResult = {}) =>
  pickValidPhone(
    authResult?.phoneNumber,
    authResult?.phone,
    authResult?.mobile,
    authResult?.tel,
    authResult?.data?.phoneNumber,
    authResult?.data?.phone
  )

const getServerVerifyConfig = () => ONECLICK_CONFIG?.serverVerify || {}

const shouldUseServerVerify = () => !!getServerVerifyConfig().enable

const verifyThroughUniCloud = async (authResult) => {
  const config = getServerVerifyConfig()
  if (!config.functionName) {
    throw new Error('未配置 serverVerify.functionName，无法调用 uniCloud 云函数')
  }
  if (typeof uniCloud === 'undefined' || typeof uniCloud.callFunction !== 'function') {
    throw new Error('当前工程未启用 uniCloud，无法完成服务器校验')
  }

  const cloudRes = await uniCloud.callFunction({
    name: config.functionName,
    data: {
      access_token: authResult?.access_token,
      openid: authResult?.openid,
      ...(config.extraData || {}),
    },
  })

  const result = cloudRes?.result || {}
  if (result.code !== 0 && result.errCode !== 0) {
    throw new Error(result.message || '云函数返回失败')
  }

  return pickValidPhone(
    result?.data?.phoneNumber,
    result?.data?.data?.phoneNumber,
    result?.data?.data?.data?.phoneNumber,
    result?.phoneNumber
  )
}

const verifyThroughHttp = async (authResult) => {
  const config = getServerVerifyConfig()
  const httpConfig = config.http || {}
  if (!httpConfig.url) {
    throw new Error('未配置 serverVerify.http.url，无法发起验证请求')
  }

  const [error, response] = await uni
    .request({
      url: httpConfig.url,
      method: httpConfig.method || 'POST',
      header: Object.assign({ 'content-type': 'application/json' }, httpConfig.headers || {}),
      data: Object.assign(
        {
          access_token: authResult?.access_token,
          openid: authResult?.openid,
        },
        httpConfig.extraData || {}
      ),
    })
    .then((res) => [null, res])
    .catch((err) => [err, null])

  if (error) {
    throw error
  }

  const { data } = response || {}
  return pickValidPhone(
    data?.phoneNumber,
    data?.data?.phoneNumber,
    data?.data?.data?.phoneNumber,
    data?.result?.phoneNumber
  )
}

const obtainPhoneNumber = async (authResult = {}) => {
  if (!shouldUseServerVerify()) {
    const phone = extractDirectPhone(authResult)
    if (!phone) {
      throw new Error(
        '未从 DCloud univerify 返回手机号，请在控制台开启“直接返回手机号”或在 ONECLICK_CONFIG.serverVerify 中开启服务器校验'
      )
    }
    return String(phone)
  }

  if (!authResult?.access_token || !authResult?.openid) {
    throw new Error('运营商未返回 access_token/openid，无法通过云函数校验')
  }

  const cfg = getServerVerifyConfig()
  const phone = cfg.type === 'http' ? await verifyThroughHttp(authResult) : await verifyThroughUniCloud(authResult)
  if (!phone) {
    throw new Error('服务器校验成功但未返回手机号，请检查云函数/接口的返回数据结构')
  }
  return String(phone)
}

const startAppPlusLogin = async ({ onStatus, univerifyStyle } = {}) => {
  try {
    await preLoginUniverify()
  } catch (error) {
    // 预登录失败时仍尝试拉起授权页
  }

  const defaultStyle = ONECLICK_CONFIG?.univerify || {}
  const mergedStyle = deepMerge(defaultStyle, univerifyStyle || {})

  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'univerify',
      univerifyStyle: mergedStyle,
      success: async (res) => {
        const authResult = res?.authResult || {}
        if (typeof onStatus === 'function') {
          try {
            onStatus({ stage: 'univerify:success', payload: authResult })
          } catch (cbErr) {
            console.warn('[oneclick] onStatus error', cbErr)
          }
        }

        try {
          const phone = await obtainPhoneNumber(authResult)
          console.log('[oneclick] obtained phone from univerify/server:', phone)

          const loginResult = await requestLoginByPhone(phone)
          if (!loginResult?.success) {
            throw new Error(loginResult?.message || '后台登录失败')
          }
          closeAuthViewSafely()
          resolve(loginResult)
        } catch (error) {
          closeAuthViewSafely()
          reject(error instanceof Error ? error : new Error(error?.msg || '一键登录失败'))
        }
      },
      fail: (error) => {
        closeAuthViewSafely()
        reject(error instanceof Error ? error : new Error(error?.errMsg || '一键登录失败'))
      },
    })
  })
}
// #endif

export const startOneClickLogin = async (options = {}) => {
  // #ifdef APP-PLUS
  return startAppPlusLogin(options)
  // #endif

  throw new Error('当前环境暂不支持一键登录，请在 APP 内使用')
}
