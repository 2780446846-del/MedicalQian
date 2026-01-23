<template>
  <div class="login-page">
    <!-- 居中的登录 / 注册区域 -->
    <div class="login-panel">
      <div class="login-card">
        <!-- 标题 -->
        <div class="title-row">
          <div class="title-main">AI 医疗后台</div>
          <div class="title-sub">Intelligent Medical Admin Panel</div>
        </div>

        <!-- 标题下方显示当前模式 -->
        <div v-if="mode === 'login'" class="mode-indicator">
          登录
        </div>
        <div v-else class="mode-indicator">
          注册
        </div>

        <!-- 登录表单 -->
        <form
          v-if="mode === 'login'"
          class="form"
          @submit.prevent="handleLogin"
        >
          <!-- 登录方式切换 -->
          <div class="login-type-switch">
            <button
              type="button"
              class="login-type-btn"
              :class="{ active: loginType === 'password' }"
              @click="loginType = 'password'"
            >
              密码登录
            </button>
            <button
              type="button"
              class="login-type-btn"
              :class="{ active: loginType === 'sms' }"
              @click="loginType = 'sms'"
            >
              验证码登录
            </button>
          </div>

          <!-- 密码登录表单 -->
          <template v-if="loginType === 'password'">
            <div class="form-item">
              <div class="input-wrapper">
                <span class="input-icon user-icon" />
                <input
                  v-model="loginUsername"
                  type="text"
                  placeholder="请输入用户名"
                  autocomplete="username"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="input-wrapper">
                <span class="input-icon password-icon" />
                <input
                  v-model="loginPassword"
                  type="password"
                  placeholder="请输入登录密码"
                  autocomplete="current-password"
                />
              </div>
            </div>
          </template>

          <!-- 手机号验证码登录表单 -->
          <template v-else>
            <div class="form-item">
              <div class="input-wrapper">
                <span class="input-icon phone-icon" />
                <input
                  v-model="phoneNumber"
                  type="tel"
                  placeholder="请输入手机号"
                  autocomplete="tel"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="verify-code-wrapper">
                <div class="input-wrapper verify-code-input">
                  <span class="input-icon code-icon" />
                  <input
                    v-model="verifyCode"
                    type="text"
                    placeholder="请输入验证码"
                    autocomplete="one-time-code"
                  />
                </div>
                <button
                  type="button"
                  class="send-code-btn"
                  :disabled="sendCodeLoading || codeCountdown > 0"
                  @click="sendVerifyCode"
                >
                  {{ sendCodeLoading ? '发送中...' : codeCountdown > 0 ? `${codeCountdown}秒后重发` : '获取验证码' }}
                </button>
              </div>
            </div>
          </template>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button type="submit" class="primary-button" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <!-- 第三方登录 -->
          <div class="third-party-login">
            <div class="divider">
              <span class="divider-line"></span>
              <span class="divider-text">其他登录方式</span>
              <span class="divider-line"></span>
            </div>
            <div class="third-party-icons">
              <button type="button" class="third-party-btn qq-btn" title="QQ登录" @click="handleQQLogin">
                <svg viewBox="0 0 24 24" class="third-party-icon" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 9c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm4 6c-2.2 0-4-1.8-4-4h8c0 2.2-1.8 4-4 4z"/>
                </svg>
                <span class="third-party-text">QQ</span>
              </button>
              <button type="button" class="third-party-btn wechat-btn" title="微信登录">
                <svg viewBox="0 0 24 24" class="third-party-icon" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 10c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm4 4c-1.7 0-3-1.3-3-3h6c0 1.7-1.3 3-3 3z"/>
                </svg>
                <span class="third-party-text">微信</span>
              </button>
              <button type="button" class="third-party-btn alipay-btn" title="支付宝登录">
                <svg viewBox="0 0 24 24" class="third-party-icon" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 8h6v1h-6V8zm0 2h6v1h-6v-1zm-1 2h8v1H8v-1zm0 2h5v1H8v-1z"/>
                </svg>
                <span class="third-party-text">支付宝</span>
              </button>
            </div>
          </div>

          <div class="tip-row">
            <span>没有账号？</span>
            <button type="button" class="link-button" @click="switchToRegister">
              先注册
            </button>
          </div>
        </form>

        <!-- 注册表单 -->
        <form
          v-else
          class="form"
          @submit.prevent="handleRegister"
        >
          <div class="form-item">
            <div class="input-wrapper">
              <span class="input-icon user-icon" />
              <input
                v-model="registerUsername"
                type="text"
                placeholder="请输入用户名（3-30位）"
                autocomplete="off"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <span class="input-icon password-icon" />
              <input
                v-model="registerPassword"
                type="password"
                placeholder="请输入密码（至少6位）"
                autocomplete="new-password"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="input-wrapper">
              <span class="input-icon password-icon" />
              <input
                v-model="registerConfirm"
                type="password"
                placeholder="请再次输入密码"
                autocomplete="new-password"
              />
            </div>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button type="submit" class="primary-button" :disabled="loading">
            {{ loading ? '注册中...' : '立即注册' }}
          </button>

          <div class="tip-row">
            <span>已有账号？</span>
            <button type="button" class="link-button" @click="switchToLogin">
              直接登录
            </button>
          </div>
        </form>
      </div>

      <div class="footer-text">
        技术支持：GoldDim Lab Copyright © 2016–
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { post } from '@/utils/request'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const loginType = ref<'password' | 'sms'>('password') // 登录方式：密码登录 / 验证码登录
const loading = ref(false)
const errorMessage = ref('')

// 登录表单
const loginUsername = ref('')
const loginPassword = ref('')

// 手机号验证码登录
const phoneNumber = ref('')
const verifyCode = ref('')
const sendCodeLoading = ref(false)
const codeCountdown = ref(0) // 倒计时（秒）
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 注册表单
const registerUsername = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')

// 切换到注册页面
function switchToRegister() {
  mode.value = 'register'
  errorMessage.value = ''
  // 清空登录表单
  loginUsername.value = ''
  loginPassword.value = ''
  phoneNumber.value = ''
  verifyCode.value = ''
}

// 切换到登录页面
function switchToLogin() {
  mode.value = 'login'
  loginType.value = 'password'
  errorMessage.value = ''
  // 清空注册表单
  registerUsername.value = ''
  registerPassword.value = ''
  registerConfirm.value = ''
}

// 如果已登录，重定向到首页
onMounted(() => {
  authStore.syncFromLocalStorage()
  if (authStore.isAuthenticated) {
    router.push('/')
    return
  }

  // 检查是否有QQ登录的token参数（QQ登录回调）
  const qqToken = route.query.qq_token as string
  const qqUserStr = route.query.qq_user as string

  if (qqToken) {
    console.log('✅ 检测到QQ登录token，开始处理登录')

    // 保存token
    localStorage.setItem('sso_token', qqToken)

    // 如果有用户信息，保存用户信息
    if (qqUserStr) {
      try {
        const qqUser = JSON.parse(decodeURIComponent(qqUserStr))
        localStorage.setItem('sso_user_info', JSON.stringify(qqUser))
        console.log('✅ QQ用户信息已保存:', qqUser.username)
      } catch (e) {
        console.warn('⚠️ 解析QQ用户信息失败:', e)
      }
    }

    // 重置手动登出标志
    localStorage.removeItem('sso_manual_logout')

    // 同步authStore
    authStore.syncFromLocalStorage()

    // 通知其他窗口token已更新
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('sso_token_channel')
      const userInfo = qqUserStr ? JSON.parse(decodeURIComponent(qqUserStr)) : null
      channel.postMessage({
        type: 'token_updated',
        key: 'sso_token',
        value: qqToken,
        userInfo: userInfo
      })
      channel.close()
    }

    // 清除URL参数并跳转到首页
    router.replace('/')
  }
})

const handleLogin = async () => {
  errorMessage.value = ''

  // 根据登录类型选择不同的登录方式
  if (loginType.value === 'sms') {
    // 验证码登录
    await handleSmsLogin()
  } else {
    // 密码登录
    await handlePasswordLogin()
  }
}

// 密码登录
const handlePasswordLogin = async () => {
  if (!loginUsername.value || !loginPassword.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    await authStore.login(loginUsername.value, loginPassword.value)

    // 如果有 redirect 参数，则登录后跳回原目标路由，否则去首页
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error: unknown) {
    let errorMsg = '登录失败，请检查用户名和密码'

    if (error instanceof Error) {
      errorMsg = error.message
      // 如果是连接错误，提供更详细的提示
      if (error.message.includes('无法连接到后端服务器') || error.message.includes('Failed to fetch')) {
        errorMsg = '无法连接到后端服务器，请确保后端服务已启动（默认端口：3000）'
      }
    }

    errorMessage.value = errorMsg
    console.error('登录错误:', error)
  } finally {
    loading.value = false
  }
}

// 验证码登录
const handleSmsLogin = async () => {
  if (!phoneNumber.value) {
    errorMessage.value = '请输入手机号'
    return
  }

  if (!verifyCode.value) {
    errorMessage.value = '请输入验证码'
    return
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneNumber.value)) {
    errorMessage.value = '请输入正确的手机号'
    return
  }

  loading.value = true
  try {
    interface LoginByCodeResponse {
      success: boolean
      message: string
      token: string
      user: {
        id: string
        username: string
        phone?: string
        email?: string
        status?: string
        lastLogin?: Date
      }
    }

    const response = await post<LoginByCodeResponse>('/login/verify', {
      phoneNumber: phoneNumber.value,
      code: verifyCode.value
    })

    if (response.success && response.token) {
      // 保存token和用户信息（与login方法保持一致）
      // 直接设置localStorage（authStore会自动同步）
      localStorage.setItem('sso_token', response.token)

      if (response.user) {
        localStorage.setItem('sso_user_info', JSON.stringify(response.user))
      }

      // 登录成功后，重置手动登出标志
      localStorage.removeItem('sso_manual_logout')

      // 手动触发authStore同步（因为直接操作了localStorage）
      authStore.syncFromLocalStorage()

      // 通知其他窗口token已更新（与login方法保持一致）
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('sso_token_channel')
        channel.postMessage({
          type: 'token_updated',
          key: 'sso_token',
          value: response.token,
          userInfo: response.user
        })
        channel.close()
      }

      // 如果有 redirect 参数，则登录后跳回原目标路由，否则去首页
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } else {
      errorMessage.value = response.message || '登录失败'
    }
  } catch (error: unknown) {
    let errorMsg = '验证码登录失败，请检查验证码是否正确'

    if (error instanceof Error) {
      errorMsg = error.message
      // 如果是连接错误，提供更详细的提示
      if (error.message.includes('无法连接到后端服务器') || error.message.includes('Failed to fetch')) {
        errorMsg = '无法连接到后端服务器，请确保后端服务已启动（默认端口：3000）'
      }
    }

    errorMessage.value = errorMsg
    console.error('验证码登录错误:', error)
  } finally {
    loading.value = false
  }
}

// 发送验证码
const sendVerifyCode = async () => {
  if (!phoneNumber.value) {
    errorMessage.value = '请输入手机号'
    return
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneNumber.value)) {
    errorMessage.value = '请输入正确的手机号（11位数字）'
    return
  }

  // 如果正在倒计时，不允许重复发送
  if (codeCountdown.value > 0) {
    return
  }

  sendCodeLoading.value = true
  errorMessage.value = ''

  try {
    const response = await post<{
      success: boolean
      message: string
      code?: string // 开发环境可能返回验证码
      hint?: string // 提示信息
      expiresIn?: number // 过期时间（秒）
    }>('/login/send', {
      phoneNumber: phoneNumber.value
    })

    if (response.success) {
      // 检查是否是本地验证码模式（降级方案）
      const isLocalMode = response.hint && response.hint.includes('本地验证码')
      
      // 开发环境显示验证码（方便测试）
      if (response.code) {
        if (isLocalMode) {
          // 本地模式：显示验证码和提示
          alert(`验证码已生成（本地模式）\n\n验证码：${response.code}\n有效期：${response.expiresIn || 300}秒\n\n⚠️ 注意：这是本地生成的验证码，未通过短信发送。\n请在后端控制台查看验证码。`)
        } else {
          // 正常模式：显示验证码
          alert(`验证码已发送！\n\n开发环境验证码：${response.code}\n（生产环境不会显示）`)
        }
      } else {
        if (isLocalMode) {
          // 本地模式：提示查看后端控制台
          alert(`验证码已生成（本地模式）\n\n⚠️ 注意：这是本地生成的验证码，未通过短信发送。\n请在后端控制台查看验证码。`)
        } else {
          // 正常模式：提示查收短信
          alert('验证码已发送，请查收短信')
        }
      }

      // 开始倒计时（60秒）
      codeCountdown.value = 60
      if (countdownTimer) {
        clearInterval(countdownTimer)
      }
      countdownTimer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          if (countdownTimer) {
            clearInterval(countdownTimer)
            countdownTimer = null
          }
        }
      }, 1000)
      
      // 清空错误信息
      errorMessage.value = ''
    } else {
      // 处理错误响应
      let errorMsg = response.message || '发送验证码失败'
      
      // 隐藏技术性错误信息，显示友好提示
      if (errorMsg.includes('InvalidAccessKeyId') || errorMsg.includes('NotFound') || errorMsg.includes('InvalidAccessKey')) {
        errorMsg = '验证码服务配置错误，已自动切换到本地验证码模式。请查看后端控制台获取验证码。'
      }
      
      errorMessage.value = errorMsg
    }
  } catch (error: unknown) {
    let errorMsg = '发送验证码失败，请稍后重试'

    if (error instanceof Error) {
      errorMsg = error.message
      
      // 隐藏技术性错误信息（包括签名错误）
      if (errorMsg.includes('InvalidAccessKeyId') || 
          errorMsg.includes('NotFound') || 
          errorMsg.includes('InvalidAccessKey') ||
          errorMsg.includes('SignatureDoesNotMatch') ||
          errorMsg.includes('Signature') ||
          errorMsg.includes('signature')) {
        errorMsg = '验证码服务配置错误，已自动切换到本地验证码模式。请查看后端控制台获取验证码。'
      } else if (errorMsg.includes('无法连接到后端服务器') || errorMsg.includes('Failed to fetch')) {
        errorMsg = '无法连接到后端服务器，请确保后端服务已启动（默认端口：3000）'
      }
    }

    errorMessage.value = errorMsg
    console.error('发送验证码错误:', error)
  } finally {
    sendCodeLoading.value = false
  }
}

// 清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

const handleRegister = async () => {
  errorMessage.value = ''

  if (!registerUsername.value || !registerPassword.value || !registerConfirm.value) {
    errorMessage.value = '请输入完整的注册信息'
    return
  }

  if (registerUsername.value.length < 3 || registerUsername.value.length > 30) {
    errorMessage.value = '用户名长度需在 3-30 个字符之间'
    return
  }

  if (registerPassword.value.length < 6) {
    errorMessage.value = '密码长度至少 6 位'
    return
  }

  if (registerPassword.value !== registerConfirm.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await post('/admin-auth/register', {
      username: registerUsername.value,
      password: registerPassword.value,
    })

    // 注册成功后切回登录，并填充用户名
    loginUsername.value = registerUsername.value
    registerUsername.value = ''
    registerPassword.value = ''
    registerConfirm.value = ''
    errorMessage.value = ''
    mode.value = 'login'
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '注册失败，请稍后重试'
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

// QQ登录跳转（在当前页面跳转）
function handleQQLogin() {
  // 检测设备类型
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const display = isMobile ? 'mobile' : 'pc'

  // 构建回调URL（后端回调接口）
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const frontendUrl = window.location.origin
  const callbackUrl = encodeURIComponent(`${apiBaseUrl.replace('/api', '')}/api/qq-auth/callback?redirect=${encodeURIComponent(frontendUrl + '/login')}`)

  // 构建QQ登录URL
  // token: QQ登录服务的token
  // msg: 传递回调URL信息
  // display: 设备类型（pc或mobile）
  const token = '8243e33b504ec2d2233e7a6f7b7abf16'
  const msg = callbackUrl // 将回调URL作为msg参数传递
  const qqLoginUrl = `https://qq.wch666.com/api/qq.php?token=${token}&msg=${msg}&display=${display}`

  // 在当前窗口跳转到QQ登录页面
  // QQ登录成功后会跳转回我们的回调接口，回调接口处理完成后会重定向回前端
  window.location.href = qqLoginUrl
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  /* 背景图：请将图片保存为 public/login-bg.jpg，或修改为自己的路径 */
  background-image: url('/login-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.login-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 720px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(15, 35, 95, 0.16);
  padding: 40px 72px 36px;
  min-height: 340px;
}

.title-row {
  text-align: center;
  margin-bottom: 28px;
}

.title-main {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #0c3c7c;
}

.title-sub {
  margin-top: 6px;
  font-size: 13px;
  letter-spacing: 1px;
  color: #7a8bb0;
}

.mode-indicator {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #0c3c7c;
  margin-bottom: 24px;
  letter-spacing: 2px;
}

.login-type-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  padding: 4px;
  background: #f3f5fb;
  border-radius: 12px;
}

.login-type-btn {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #5e6a90;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.25s, color 0.25s;
}

.login-type-btn.active {
  background: #ffffff;
  color: #137bff;
  box-shadow: 0 2px 8px rgba(19, 123, 255, 0.15);
  font-weight: 500;
}

.verify-code-wrapper {
  display: flex;
  gap: 12px;
}

.verify-code-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid #d8e0f0;
  background: #ffffff;
  color: #137bff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
}

.send-code-btn:hover:not(:disabled) {
  border-color: #137bff;
  background: #f0f7ff;
  box-shadow: 0 2px 8px rgba(19, 123, 255, 0.15);
}

.send-code-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.send-code-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f3f5fb;
  color: #a0aec0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-item {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid #d8e0f0;
  padding: 0 16px;
  background: #f8f9ff;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}

.input-wrapper:focus-within {
  border-color: #2f76ff;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(47, 118, 255, 0.12);
}

.input-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
}

.user-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ffffff, #2f76ff);
}

.password-icon::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  border: 2px solid #2f76ff;
}

.phone-icon::before {
  content: '📱';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.code-icon::before {
  content: '🔑';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.input-wrapper input {
  flex: 1;
  height: 44px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #222;
}

.input-wrapper input::placeholder {
  color: #a0aec0;
}

.primary-button {
  margin-top: 4px;
  height: 42px;
  width: 100%;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #137bff, #2ea8ff);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(19, 123, 255, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(19, 123, 255, 0.45);
}

.primary-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 8px 20px rgba(19, 123, 255, 0.3);
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: default;
  box-shadow: none;
}

.error-message {
  font-size: 13px;
  color: #e53e3e;
  background: #fff5f5;
  border-radius: 999px;
  padding: 8px 14px;
  text-align: center;
}

/* 第三方登录 */
.third-party-login {
  margin-top: 24px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.divider-text {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.third-party-icons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.third-party-btn {
  width: auto;
  min-width: 48px;
  height: 48px;
  border-radius: 24px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  padding: 8px 12px;
  gap: 4px;
}

.third-party-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.third-party-btn:active {
  transform: translateY(0);
}

.third-party-icon {
  width: 20px;
  height: 20px;
  transition: all 0.25s;
}

.third-party-text {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  transition: all 0.25s;
}

.qq-btn {
  border-color: #12b7f5;
}

.qq-btn .third-party-icon {
  color: #12b7f5;
}

.qq-btn .third-party-text {
  color: #12b7f5;
}

.qq-btn:hover {
  background: #12b7f5;
  border-color: #12b7f5;
}

.qq-btn:hover .third-party-icon,
.qq-btn:hover .third-party-text {
  color: #ffffff;
}

.wechat-btn {
  border-color: #07c160;
}

.wechat-btn .third-party-icon {
  color: #07c160;
}

.wechat-btn .third-party-text {
  color: #07c160;
}

.wechat-btn:hover {
  background: #07c160;
  border-color: #07c160;
}

.wechat-btn:hover .third-party-icon,
.wechat-btn:hover .third-party-text {
  color: #ffffff;
}

.alipay-btn {
  border-color: #1677ff;
}

.alipay-btn .third-party-icon {
  color: #1677ff;
}

.alipay-btn .third-party-text {
  color: #1677ff;
}

.alipay-btn:hover {
  background: #1677ff;
  border-color: #1677ff;
}

.alipay-btn:hover .third-party-icon,
.alipay-btn:hover .third-party-text {
  color: #ffffff;
}

.tip-row {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  color: #7a869f;
  gap: 4px;
}

.link-button {
  border: none;
  background: transparent;
  color: #137bff;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.footer-text {
  margin-top: 24px;
  font-size: 12px;
  color: #8a94b2;
}

@media (max-width: 960px) {
  .login-page {
    flex-direction: column;
  }

  .login-illustration {
    display: none;
  }

  .login-panel {
    flex: 1;
    padding-top: 80px;
  }
}
</style>

