import { request } from '@/utils/request.js'
import { ONECLICK_CONFIG } from './oneclick.config.js'

let sdkLoadingPromise

const ensureSdk = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('H5 环境不可用'))
  }
  if (window.PhoneNumberServer) {
    return Promise.resolve()
  }
  if (sdkLoadingPromise) {
    return sdkLoadingPromise
  }
  sdkLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/static/numberAuth-web-sdk.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('一键登录脚本加载失败'))
    document.body.appendChild(script)
  })
  return sdkLoadingPromise
}

const normalizePageUrl = (raw) => {
  if (!raw) return ''
  return raw.endsWith('/') ? raw : `${raw}/`
}

export const startOneClickLogin = async ({ authPageOption, onStatus, schemeCode, pageUrl, origin, businessType } = {}) => {
  await ensureSdk()

  const runtimeOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  const resolvedScheme = schemeCode || ONECLICK_CONFIG.schemeCode
  const resolvedOrigin = origin || ONECLICK_CONFIG.origin || runtimeOrigin
  const resolvedPageUrl = normalizePageUrl(pageUrl || ONECLICK_CONFIG.pageUrl || runtimeOrigin)
  const resolvedBizType = businessType ?? ONECLICK_CONFIG.businessType ?? 1

  const authResp = await request({
    url: '/number-auth/getAuth',
    method: 'POST',
    data: {
      schemeCode: resolvedScheme,
      pageUrl: resolvedPageUrl,
      origin: resolvedOrigin,
      bizType: resolvedBizType,
    },
    needAuth: false,
    showLoading: false,
    showError: false,
  })

  const authData = authResp?.data || authResp
  const accessToken = authData?.accessToken || authData?.tokenInfo?.accessToken
  const jwtToken = authData?.jwtToken || authData?.tokenInfo?.jwtToken
  if (!accessToken || !jwtToken) {
    throw new Error(authResp?.msg || '获取鉴权 Token 失败')
  }

  const server = new window.PhoneNumberServer()

  return new Promise((resolve, reject) => {
    const closeLoginPage = () => {
      try {
        server.closeLoginPage && server.closeLoginPage()
      } catch (e) {
        console.warn('closeLoginPage failed', e)
      }
    }

    const fail = (err) => {
      closeLoginPage()
      reject(err instanceof Error ? err : new Error(err?.message || err?.msg || '一键登录失败'))
    }

    server.checkLoginAvailable({
      accessToken,
      jwtToken,
      success: () => {
        server.getLoginToken({
          authPageOption,
          success: async (sdkRes) => {
            if (String(sdkRes?.code) !== '600000' || !sdkRes?.spToken) {
              return fail(new Error(sdkRes?.msg || '一键登录失败'))
            }

            try {
              const phoneResp = await request({
                url: '/number-auth/getPhone',
                method: 'POST',
                data: { spToken: sdkRes.spToken },
                needAuth: false,
                showLoading: false,
                showError: false,
              })

              const phoneData = phoneResp?.data || phoneResp
              const phone = phoneData?.phone
              if (!phone) {
                throw new Error(phoneResp?.msg || '未获取到手机号')
              }

              const loginResp = await request({
                url: '/login/onekey',
                method: 'POST',
                data: { phone },
                needAuth: false,
                showLoading: false,
                showError: false,
              })

              closeLoginPage()
              resolve({
                success: loginResp?.success ?? loginResp?.code === 0,
                token: loginResp?.token,
                data: loginResp?.data,
                raw: loginResp,
              })
            } catch (error) {
              fail(error)
            }
          },
          error: (err) => fail(new Error(err?.msg || '一键登录失败')),
          watch: typeof onStatus === 'function' ? onStatus : undefined,
        })
      },
      error: (err) => fail(new Error(err?.msg || '鉴权失败')),
    })
  })
}
