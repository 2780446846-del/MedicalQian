<template>
  <view class="login-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-circle circle-1"></view>
      <view class="bg-circle circle-2"></view>
      <view class="bg-circle circle-3"></view>
    </view>

    <!-- 登录卡片 -->
    <view class="login-card">
      <!-- Logo和标题 -->
      <view class="login-header">
        <view class="logo-wrapper">
          <view class="logo-icon">🏥</view>
        </view>
        <view class="app-title">医疗AI助手</view>
        <view class="app-subtitle">智能医疗 · 健康守护</view>
      </view>

      <!-- 登录方式切换标签 -->
      <view class="login-tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'account' }"
          @click="switchTab('account')"
        >
          账号登录
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'phone' }"
          @click="switchTab('phone')"
        >
          手机登录
        </view>
      </view>

      <!-- 账号密码登录 -->
      <view v-if="currentTab === 'account'" class="login-form">
        <view class="form-group">
          <view class="input-wrapper">
            <view class="input-icon">👤</view>
            <input
              v-model="accountForm.username"
              type="text"
              placeholder="请输入用户名/手机号"
              class="form-input"
              :disabled="loading"
            />
          </view>
        </view>
        <view class="form-group">
          <view class="input-wrapper">
            <view class="input-icon">🔒</view>
            <input
              v-model="accountForm.password"
              type="password"
              placeholder="请输入密码"
              class="form-input"
              :disabled="loading"
            />
            <view class="input-suffix" @click="togglePasswordVisibility">
              <text v-if="showPassword">👁️</text>
              <text v-else>👁️‍🗨️</text>
            </view>
          </view>
        </view>
        <view class="form-options">
          <view class="remember-me">
            <checkbox-group @change="onRememberChange">
              <label class="checkbox-label">
                <checkbox value="remember" :checked="rememberMe" />
                <text>记住密码</text>
              </label>
            </checkbox-group>
          </view>
          <view class="forgot-password" @click="handleForgotPassword">
            忘记密码？
          </view>
        </view>
        <button 
          class="primary-button" 
          :disabled="loading || !accountForm.username || !accountForm.password"
          @click="handleAccountLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <view class="register-link">
          还没有账号？
          <text class="link-text" @click="showRegister = true">立即注册</text>
        </view>

        <!-- 第三方登录（静态占位，无逻辑） -->
        <view class="third-party-login">
          <view class="divider">
            <view class="divider-line"></view>
            <text class="divider-text">其他登录方式</text>
            <view class="divider-line"></view>
          </view>
          <view class="third-party-buttons">
            <view class="third-party-item" @click="handleWechatLogin">
              <view class="third-party-icon wechat">微</view>
              <text class="third-party-text">微信</text>
            </view>
            <view class="third-party-item" @click="showEmailLogin = true">
              <view class="third-party-icon email">✉</view>
              <text class="third-party-text">邮箱</text>
            </view>
            <view 
              class="third-party-item"
              :class="{ disabled: qqLoginLoading }"
              @click="handleQQLogin"
            >
              <view class="third-party-icon qq">Q</view>
              <text class="third-party-text">{{ qqLoginLoading ? '登录中' : 'QQ' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 手机号验证码登录 -->
      <view v-if="currentTab === 'phone'" class="login-form">
        <!-- #ifdef H5 -->
        <view id="captcha" class="captcha-container"></view>
        <!-- #endif -->
        <!-- #ifdef APP-PLUS -->
        <captcha
          ref="captchaRef"
          :config="captchaConfig"
          @captchaSuccess="handleCaptchaSuccess"
          @captchaError="handleCaptchaError"
          @captchaFail="handleCaptchaFail"
          @captchaClose="handleCaptchaClose"
        />
        <!-- #endif -->
        <view class="form-group">
          <view class="input-wrapper">
            <view class="input-icon">📱</view>
            <input
              v-model="phoneForm.phone"
              type="number"
              placeholder="请输入手机号"
              class="form-input"
              maxlength="11"
              :disabled="loading"
            />
          </view>
        </view>
        <view class="form-group">
          <view class="input-wrapper code-input-wrapper">
            <view class="input-icon">🔐</view>
            <input
              v-model="phoneForm.code"
              type="number"
              placeholder="请输入验证码"
              class="form-input code-input"
              maxlength="6"
              :disabled="loading"
            />
            <button 
              class="code-button" 
              :disabled="loading || !phoneForm.phone || countdown > 0"
              @click="handleSendCode"
            >
              {{ countdown > 0 ? `${countdown}秒后重试` : '获取验证码' }}
            </button>
          </view>
        </view>
        <button 
          class="primary-button" 
          :disabled="loading || !phoneForm.phone || !phoneForm.code"
          @click="handlePhoneLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <button
          class="oneclick-button"
          :disabled="oneClickLoading"
          @click="handleOneClickLogin"
        >
          {{ oneClickLoading ? '一键登录中...' : '一键登录' }}
        </button>
        <view class="register-link">
          还没有账号？
          <text class="link-text" @click="showRegister = true">立即注册</text>
        </view>

        <!-- 第三方登录（静态占位，无逻辑） -->
        <view class="third-party-login">
          <view class="divider">
            <view class="divider-line"></view>
            <text class="divider-text">其他登录方式</text>
            <view class="divider-line"></view>
          </view>
          <view class="third-party-buttons">
            <view class="third-party-item" @click="handleWechatLogin">
              <view class="third-party-icon wechat">微</view>
              <text class="third-party-text">微信</text>
            </view>
            <view class="third-party-item" @click="showEmailLogin = true">
              <view class="third-party-icon email">✉</view>
              <text class="third-party-text">邮箱</text>
            </view>
            <view 
              class="third-party-item"
              :class="{ disabled: qqLoginLoading }"
              @click="handleQQLogin"
            >
              <view class="third-party-icon qq">Q</view>
              <text class="third-party-text">{{ qqLoginLoading ? '登录中' : 'QQ' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 错误提示 -->
      <view v-if="errorMessage" class="error-message">
        <text class="error-icon">⚠️</text>
        <text>{{ errorMessage }}</text>
      </view>
    </view>

    <!-- 注册弹窗 -->
    <view v-if="showRegister" class="register-modal" @click.self="showRegister = false">
      <view class="register-content" @click.stop>
        <view class="register-header">
          <text class="register-title">用户注册</text>
          <view class="close-button" @click="showRegister = false">✕</view>
        </view>
        <view class="register-form">
          <view class="form-group">
            <view class="input-wrapper">
              <view class="input-icon">👤</view>
              <input
                v-model="registerForm.username"
                type="text"
                placeholder="请输入用户名（3-30个字符）"
                class="form-input"
                :disabled="loading"
              />
            </view>
          </view>
          <view class="form-group">
            <view class="input-wrapper">
              <view class="input-icon">🔒</view>
              <input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（至少6位）"
                class="form-input"
                :disabled="loading"
              />
            </view>
          </view>
          <!-- 注册错误提示 -->
          <view v-if="registerErrorMessage" class="register-error-message">
            <text class="error-icon">⚠️</text>
            <text>{{ registerErrorMessage }}</text>
          </view>
          <button 
            class="primary-button" 
            :disabled="loading || !canRegister"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '立即注册' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 邮箱登录弹窗 -->
    <view v-if="showEmailLogin" class="register-modal" @click.self="closeEmailLogin">
      <view class="register-content" @click.stop>
        <view class="register-header">
          <text class="register-title">邮箱登录</text>
          <view class="close-button" @click="closeEmailLogin">✕</view>
        </view>
        <view class="register-form">
          <view class="email-login-tabs">
            <view
              class="email-login-tab"
              :class="{ active: emailLoginMode === 'password' }"
              @click="switchEmailLoginMode('password')"
            >
              密码登录
            </view>
            <view
              class="email-login-tab"
              :class="{ active: emailLoginMode === 'code' }"
              @click="switchEmailLoginMode('code')"
            >
              验证码登录
            </view>
          </view>
          <view class="form-group">
            <view class="input-wrapper">
              <view class="input-icon">📧</view>
              <input
                v-model="emailForm.email"
                type="text"
                placeholder="请输入邮箱地址"
                class="form-input"
                :disabled="emailLoading"
              />
            </view>
          </view>
          <view class="form-group" v-if="emailLoginMode === 'password'">
            <view class="input-wrapper">
              <view class="input-icon">🔒</view>
              <input
                v-model="emailForm.password"
                type="password"
                placeholder="请输入密码"
                class="form-input"
                :disabled="emailLoading"
              />
            </view>
          </view>
          <view class="form-group" v-else>
            <view class="input-wrapper code-input-wrapper">
              <view class="input-icon">🔐</view>
              <input
                v-model="emailCode"
                type="number"
                placeholder="请输入6位邮箱验证码"
                class="form-input code-input"
                maxlength="6"
                :disabled="emailLoading"
              />
              <button
                class="code-button"
                :disabled="emailLoading || emailCountdown > 0"
                @click="handleSendEmailCode"
              >
                {{ emailCountdown > 0 ? `${emailCountdown}秒后重试` : '获取验证码' }}
              </button>
            </view>
            <view class="code-tip">
              验证码将发送到上述邮箱，5分钟内有效。
            </view>
          </view>
          <view v-if="emailErrorMessage" class="register-error-message">
            <text class="error-icon">⚠️</text>
            <text>{{ emailErrorMessage }}</text>
          </view>
          <button
            class="primary-button"
            :disabled="emailLoading || !canSubmitEmailLogin"
            @click="handleEmailLogin"
          >
            {{ emailLoading ? '登录中...' : '登录' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import request from '../../utils/request.js'
import { setToken, setUserInfo } from '../../utils/auth.js'
import { startOneClickLogin } from '../../services/oneclick/oneClickLogin.js'
import captcha from '../../components/captcha4/index.vue'
import { API_BASE_URL } from '../../utils/config.js'

// 当前登录方式
const currentTab = ref('account') // 'account' | 'phone'

// 加载状态
const loading = ref(false)
const oneClickLoading = ref(false)
const qqLoginLoading = ref(false)
const errorMessage = ref('')
const registerErrorMessage = ref('')

// 账号密码登录表单
const accountForm = ref({
  username: '',
  password: ''
})

// 手机号登录表单
const phoneForm = ref({
  phone: '',
  code: '',
  outId: ''
})

// 注册表单
const registerForm = ref({
  username: '',
  password: ''
})

const emailForm = ref({
  email: '',
  password: ''
})

const showEmailLogin = ref(false)
const emailErrorMessage = ref('')
const emailLoading = ref(false)
const emailLoginMode = ref('password') // password | code
const emailCode = ref('')
const emailCountdown = ref(0)
let emailTimer = null

// 显示注册弹窗
const showRegister = ref(false)

// 其他状态
const showPassword = ref(false)
const rememberMe = ref(false)
const countdown = ref(0)
const CAPTCHA_ID = '409ff4b182c43e02ca3c5fb3ea85a4f2'
const captchaRef = ref(null)
let pendingCaptchaShow = false
const captchaConfig = ref({
  captchaId: CAPTCHA_ID,
  product: 'bind',
  protocol: 'https://'
})
const captchaInstance = ref(null)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const canSubmitEmailLogin = computed(() => {
  if (!emailForm.value.email) return false
  if (emailLoginMode.value === 'password') {
    return !!emailForm.value.password
  }
  return emailCode.value.trim().length === 6
})

const switchEmailLoginMode = (mode) => {
  if (emailLoginMode.value === mode) return
  emailLoginMode.value = mode
  emailErrorMessage.value = ''

  if (mode === 'password') {
    emailCode.value = ''
    clearEmailCountdown()
  } else {
    emailForm.value.password = ''
  }
}

// 切换登录方式
const switchTab = (tab) => {
  currentTab.value = tab
  errorMessage.value = ''
}

// 切换密码显示
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 记住密码
const onRememberChange = (e) => {
  rememberMe.value = e.detail.value.includes('remember')
}

// 是否可以注册
const canRegister = computed(() => {
  return registerForm.value.username &&
         registerForm.value.password &&
         registerForm.value.username.length >= 3 &&
         registerForm.value.username.length <= 30 &&
         registerForm.value.password.length >= 6
})

// 账号密码登录
const handleAccountLogin = async () => {
  // 清空错误信息
  errorMessage.value = ''
  
  // 验证输入
  if (!accountForm.value.username || !accountForm.value.password) {
    errorMessage.value = '请输入用户名和密码'
    uni.showToast({
      title: '请输入用户名和密码',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  loading.value = true
  
  try {
    // 去除用户名和密码的前后空格
    const trimmedUsername = accountForm.value.username ? accountForm.value.username.trim() : '';
    const trimmedPassword = accountForm.value.password ? accountForm.value.password.trim() : '';
    
    console.log('📤 发送登录请求:', {
      username: trimmedUsername ? `${trimmedUsername.substring(0, 3)}***` : '(空)',
      passwordLength: trimmedPassword.length,
      hasUsername: !!trimmedUsername,
      hasPassword: !!trimmedPassword
    });
    
    const res = await request({
      url: '/auth/login',
      method: 'POST',
      data: {
        username: trimmedUsername,
        password: trimmedPassword
      },
      needAuth: false,
      showLoading: true,
      showError: false // 手动处理错误提示
    })
    
    if (res.success && res.token) {
      // 保存token（使用统一的auth工具函数）
      setToken(res.token)
      
      // 保存用户信息（如果有，使用统一的auth工具函数）
      if (res.data) {
        // 使用统一的setUserInfo函数保存，确保使用正确的key
        setUserInfo(res.data)
        // 同时保留旧key以兼容旧代码
        uni.setStorageSync('userInfo', res.data)

        // 以用户ID（或用户名）作为 key，实现"每个用户一份资料"
        const userId = res.data.id || res.data._id || res.data.userId || res.data.username
        try {
          // 读取现有的所有用户资料映射
          const allProfiles = uni.getStorageSync('userProfilesById') || {}

          // 优先使用后端返回的数据库数据，其次使用本地缓存，最后用默认值
          let profile = allProfiles[userId] || {
            avatarUrl: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
            nickname: res.data.username || '用户昵称',
            gender: '保密',
            phone: '',
            authStatus: '未认证',
            realname: '',
            idCard: ''
          }

          // 用后端返回的数据库数据更新本地资料（数据库数据优先）
          if (res.data.avatarUrl !== undefined && res.data.avatarUrl !== null) {
            profile.avatarUrl = res.data.avatarUrl || profile.avatarUrl || 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar'
          }
          if (res.data.nickname !== undefined && res.data.nickname !== null) {
            profile.nickname = res.data.nickname || profile.nickname || res.data.username || '用户昵称'
          }
          if (res.data.gender !== undefined && res.data.gender !== null) {
            profile.gender = res.data.gender || profile.gender || '保密'
          }
          if (res.data.phone !== undefined && res.data.phone !== null) {
            profile.phone = res.data.phone || profile.phone || ''
          }
          if (res.data.authStatus !== undefined && res.data.authStatus !== null) {
            profile.authStatus = res.data.authStatus || profile.authStatus || '未认证'
          }
          if (res.data.realname !== undefined && res.data.realname !== null) {
            profile.realname = res.data.realname || profile.realname || ''
          }
          if (res.data.idCard !== undefined && res.data.idCard !== null) {
            profile.idCard = res.data.idCard || profile.idCard || ''
          }

          // 确保昵称至少是当前用户名
          if (!profile.nickname) {
            profile.nickname = res.data.username || '用户昵称'
          }

          // 写回映射与当前用户标记
          allProfiles[userId] = profile
          uni.setStorageSync('userProfilesById', allProfiles)
          uni.setStorageSync('currentUserId', userId)

          // 同步到全局数据，便于各页面使用
          const app = getApp && getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = res.data
            app.globalData.userProfile = profile
          }

          // 兼容旧逻辑：同时保留一份当前用户的 userProfile
          uni.setStorageSync('userProfile', profile)

          console.log('✅ 登录成功，已同步用户资料:', {
            userId,
            avatarUrl: profile.avatarUrl ? '已设置' : '未设置',
            nickname: profile.nickname,
            gender: profile.gender,
            phone: profile.phone || '未设置'
          })
        } catch (e) {
          console.warn('同步登录用户信息到全局失败:', e)
        }
      }
      
      uni.showToast({
        title: '登录成功！',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        // 跳转到首页（tabBar页面需要使用switchTab）
        uni.switchTab({
          url: '/pages/index/index',
          success: () => {
            console.log('跳转到首页成功')
          },
          fail: (err) => {
            console.error('跳转失败:', err)
            // 如果switchTab失败，尝试使用reLaunch
            uni.reLaunch({
              url: '/pages/index/index'
            })
          }
        })
      }, 500)
    } else {
      errorMessage.value = res.message || '登录失败，请重试'
      uni.showToast({
        title: res.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('登录失败:', error)
    // 处理不同类型的错误
    let errorMsg = '登录失败，请检查网络连接'
    
    if (error.message) {
      errorMsg = error.message
    } else if (error.msg) {
      errorMsg = error.msg
    } else if (error.errMsg) {
      // uni.request 的 fail 错误
      if (error.errMsg.includes('timeout')) {
        errorMsg = '请求超时，请检查网络连接'
      } else if (error.errMsg.includes('fail')) {
        const baseOrigin = (API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '')
        errorMsg = `网络请求失败，请检查后端服务是否正常运行（${baseOrigin}）`
      } else {
        errorMsg = error.errMsg
      }
    } else if (typeof error === 'string') {
      errorMsg = error
    }
    
    errorMessage.value = errorMsg
    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// #ifdef APP-PLUS
const runAppPlusOneClickLogin = async () => {
  oneClickLoading.value = true
  try {
    const result = await startOneClickLogin({
      onStatus: (info) => {
        console.log('[oneclick][app]', info)
      }
    })

    if (result?.success && result?.token) {
      await handleLoginSuccess(result)
    } else {
      const message = result?.message || '一键登录失败，请稍后重试'
      uni.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    const message = error?.message || '一键登录失败，请稍后重试'
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  } finally {
    oneClickLoading.value = false
  }
}
// #endif

const handleOneClickLogin = async () => {
  // #ifdef APP-PLUS
  await runAppPlusOneClickLogin()
  return
  // #endif
  uni.showToast({
    title: '当前环境暂不支持一键登录',
    icon: 'none',
    duration: 2000
  })
}



const handleLoginSuccess = async (res) => {
  // 保存token（使用统一的auth工具函数）
  setToken(res.token)

  // 保存用户信息（如果有，使用统一的auth工具函数）
  if (res.data) {
    // 使用统一的setUserInfo函数保存，确保使用正确的key
    setUserInfo(res.data)
    // 同时保留旧key以兼容旧代码
    uni.setStorageSync('userInfo', res.data)

    // 以用户ID（或用户名）作为 key，实现"每个用户一份资料"
    const userId = res.data.id || res.data._id || res.data.userId || res.data.username || res.data.phone
    try {
      // 读取现有的所有用户资料映射
      const allProfiles = uni.getStorageSync('userProfilesById') || {}

      // 优先使用后端返回的数据库数据，其次使用本地缓存，最后用默认值
      let profile = allProfiles[userId] || {
        avatarUrl: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
        nickname: res.data.username || res.data.phone || '用户昵称',
        gender: '保密',
        phone: res.data.phone || '',
        authStatus: '未认证',
        realname: '',
        idCard: ''
      }

      // 用后端返回的数据库数据更新本地资料（数据库数据优先）
      if (res.data.avatarUrl !== undefined && res.data.avatarUrl !== null) {
        profile.avatarUrl = res.data.avatarUrl || profile.avatarUrl || 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar'
      }
      if (res.data.nickname !== undefined && res.data.nickname !== null) {
        profile.nickname = res.data.nickname || profile.nickname || res.data.username || res.data.phone || '用户昵称'
      }
      if (res.data.gender !== undefined && res.data.gender !== null) {
        profile.gender = res.data.gender || profile.gender || '保密'
      }
      if (res.data.phone !== undefined && res.data.phone !== null) {
        profile.phone = res.data.phone || profile.phone || ''
      }
      if (res.data.authStatus !== undefined && res.data.authStatus !== null) {
        profile.authStatus = res.data.authStatus || profile.authStatus || '未认证'
      }
      if (res.data.realname !== undefined && res.data.realname !== null) {
        profile.realname = res.data.realname || profile.realname || ''
      }
      if (res.data.idCard !== undefined && res.data.idCard !== null) {
        profile.idCard = res.data.idCard || profile.idCard || ''
      }

      // 确保昵称至少是当前用户名或手机号
      if (!profile.nickname) {
        profile.nickname = res.data.username || res.data.phone || '用户昵称'
      }

      // 写回映射与当前用户标记
      allProfiles[userId] = profile
      uni.setStorageSync('userProfilesById', allProfiles)
      uni.setStorageSync('currentUserId', userId)

      // 同步到全局数据，便于各页面使用
      const app = getApp && getApp()
      if (app && app.globalData) {
        app.globalData.userInfo = res.data
        app.globalData.userProfile = profile
      }

      // 兼容旧逻辑：同时保留一份当前用户的 userProfile
      uni.setStorageSync('userProfile', profile)

      console.log('✅ 手机号登录成功，已同步用户资料:', {
        userId,
        avatarUrl: profile.avatarUrl ? '已设置' : '未设置',
        nickname: profile.nickname,
        gender: profile.gender,
        phone: profile.phone || '未设置'
      })
    } catch (e) {
      console.warn('同步手机号登录用户信息到全局失败:', e)
    }
  }
  
  uni.showToast({
    title: '登录成功！',
    icon: 'success',
    duration: 1500
  })
  
  // 延迟跳转，让用户看到成功提示
  setTimeout(() => {
    // 跳转到首页（tabBar页面需要使用switchTab）
    uni.switchTab({
      url: '/pages/index/index',
      success: () => {
        console.log('跳转到首页成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        // 如果switchTab失败，尝试使用reLaunch
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  }, 500)
}

// 手机号登录
const handlePhoneLogin = async () => {
  // 清空错误信息
  errorMessage.value = ''
  
  // 验证输入
  if (!phoneForm.value.phone || !phoneForm.value.code) {
    errorMessage.value = '请输入手机号和验证码'
    uni.showToast({
      title: '请输入手机号和验证码',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneForm.value.phone)) {
    errorMessage.value = '请输入正确的手机号'
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  // 验证验证码格式
  if (phoneForm.value.code.length !== 6) {
    errorMessage.value = '验证码为6位数字'
    uni.showToast({
      title: '验证码为6位数字',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  loading.value = true
  
  try {
    const res = await request({
      url: '/login/verify',
      method: 'POST',
      data: {
        phone: phoneForm.value.phone,
        code: phoneForm.value.code,
        outId: phoneForm.value.outId
      },
      needAuth: false
    })
    
    if (res.success && res.token) {
      await handleLoginSuccess(res)
    } else {
      errorMessage.value = res.message || '登录失败，请重试'
      uni.showToast({
        title: res.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('登录失败:', error)
    const errorMsg = error.message || error.msg || '登录失败，请检查网络连接'
    errorMessage.value = errorMsg
    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 发送验证码
const handleSendCode = async () => {
  // 验证手机号格式
  if (!phoneForm.value.phone) {
    uni.showToast({
      title: '请输入手机号',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneForm.value.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
      duration: 2000
    })
    return
  }
  // 防止重复点击
  if (countdown.value > 0) {
    return
  }

  // 触发图形验证码
  // #ifdef APP-PLUS
  if (captchaRef.value) {
    captchaRef.value.showCaptcha()
  }
  // #endif

  // #ifdef H5
  pendingCaptchaShow = true
  await ensureH5Captcha()
  if (captchaInstance.value && captchaInstance.value.showCaptcha) {
    captchaInstance.value.showCaptcha()
    pendingCaptchaShow = false
  }
  // #endif
}

const ensureH5Captcha = () => {
  return new Promise((resolve, reject) => {
    if (captchaInstance.value) {
      if (captchaInstance.value.appendTo) {
        captchaInstance.value.appendTo('#captcha')
      }
      return resolve(captchaInstance.value)
    }
    if (typeof window === 'undefined') {
      return reject(new Error('H5 环境不可用'))
    }
    const initCaptcha = () => {
      if (!window.initAlicom4) {
        return reject(new Error('验证码脚本加载失败'))
      }
      window.initAlicom4({
        captchaId: CAPTCHA_ID,
        product: 'bind',
        protocol: 'https://'
      }, (captchaObj) => {
        captchaInstance.value = captchaObj
        captchaObj.appendTo('#captcha')
        if (captchaObj.onNextReady) {
          captchaObj.onNextReady(() => {
            if (pendingCaptchaShow && captchaObj.showCaptcha) {
              captchaObj.showCaptcha()
              pendingCaptchaShow = false
            }
          })
        } else if (captchaObj.onReady) {
          captchaObj.onReady(() => {
            if (pendingCaptchaShow && captchaObj.showCaptcha) {
              captchaObj.showCaptcha()
              pendingCaptchaShow = false
            }
          })
        }
        captchaObj.onSuccess(() => {
          const result = captchaObj.getValidate()
          handleCaptchaSuccess(result)
        })
        resolve(captchaObj)
      })
    }
    if (window.initAlicom4) {
      initCaptcha()
      return
    }
    const script = document.createElement('script')
    script.src = '/static/ct4.js'
    script.onload = initCaptcha
    script.onerror = () => reject(new Error('验证码脚本加载失败'))
    document.body.appendChild(script)
  })
}

const handleCaptchaSuccess = async (result) => {
  if (!result) {
    uni.showToast({
      title: '请完成图形验证',
      icon: 'none',
      duration: 2000
    })
    return
  }

  loading.value = true
  try {
    const captchaToken = await verifyCaptcha(result)
    await sendSmsAfterCaptcha(captchaToken)
    if (captchaInstance.value) {
      if (captchaInstance.value.reset) {
        captchaInstance.value.reset()
      }
      if (captchaInstance.value.hide) {
        captchaInstance.value.hide()
      }
    }
  } catch (error) {
    console.error('❌ 发送验证码异常:', error)
    console.error('错误详情:', JSON.stringify(error))
    
    let message = '发送失败，请检查网络连接'
    
    if (error.message) {
      message = error.message
    } else if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        message = '请求超时，请检查网络连接'
      } else if (error.errMsg.includes('fail')) {
        const baseOrigin = (API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '')
        message = `网络请求失败，请检查后端服务是否运行（${baseOrigin}）`
      } else {
        message = error.errMsg
      }
    } else if (typeof error === 'string') {
      message = error
    } else if (error.response) {
      message = error.response.data?.message || error.response.data?.error || '服务器错误'
    } else if (error.msg) {
      message = error.msg
    }
    
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

const handleCaptchaError = () => {
  uni.showToast({
    title: '图形验证码加载失败',
    icon: 'none',
    duration: 2000
  })
}

const handleCaptchaFail = () => {
  uni.showToast({
    title: '图形验证码校验失败，请重试',
    icon: 'none',
    duration: 2000
  })
}

const handleCaptchaClose = () => {}

const verifyCaptcha = async (result) => {
  const res = await request({
    url: '/login/captcha/verify',
    method: 'POST',
    data: {
      phone: phoneForm.value.phone,
      captchaId: result.captcha_id || CAPTCHA_ID,
      lotNumber: result.lot_number,
      captchaOutput: result.captcha_output,
      passToken: result.pass_token,
      genTime: result.gen_time
    },
    needAuth: false,
    showError: false
  })

  if (!res || !res.captchaToken) {
    throw new Error(res?.message || '图形验证码校验失败')
  }
  return res.captchaToken
}

const sendSmsAfterCaptcha = async (captchaToken) => {
  console.log('📤 开始发送验证码，手机号:', phoneForm.value.phone)
  const res = await request({
    url: '/login/send',
    method: 'POST',
    data: {
      phone: phoneForm.value.phone,
      type: 'login',
      captchaToken: captchaToken
    },
    needAuth: false,
    showError: false
  })

  console.log('📥 收到响应:', res)

  if (res && res.success) {
    if (res.outId) {
      phoneForm.value.outId = res.outId
    }
    uni.showToast({
      title: res.message || '验证码已发送',
      icon: 'success',
      duration: 2000
    })

    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    if (res.code) {
      console.log('✅ 验证码（仅开发环境）:', res.code)
      setTimeout(() => {
        uni.showModal({
          title: '验证码（开发环境）',
          content: `验证码：${res.code}`,
          showCancel: false
        })
      }, 500)
    }
  } else {
    const errorMsg = res?.message || res?.error || '发送失败，请重试'
    console.error('❌ 发送失败:', errorMsg)
    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
    })
  }
}

const handleRegister = async () => {
  // 验证输入
  if (!registerForm.value.username || !registerForm.value.password) {
    registerErrorMessage.value = '请输入用户名和密码'
    uni.showToast({
      title: '请输入用户名和密码',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (registerForm.value.username.length < 3 || registerForm.value.username.length > 30) {
    registerErrorMessage.value = '用户名长度必须在3-30个字符之间'
    uni.showToast({
      title: '用户名长度必须在3-30个字符之间',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if (registerForm.value.password.length < 6) {
    registerErrorMessage.value = '密码长度至少6位'
    uni.showToast({
      title: '密码长度至少6位',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  loading.value = true
  
  try {
    const res = await request({
      url: '/auth/register',
      method: 'POST',
      data: {
        username: registerForm.value.username,
        password: registerForm.value.password
      },
      needAuth: false
    })
    
    if (res.success) {
      uni.showToast({
        title: '注册成功！',
        icon: 'success',
        duration: 2000
      })
      
      // 注册成功后关闭弹窗，填充用户名
      setTimeout(() => {
        showRegister.value = false
        accountForm.value.username = registerForm.value.username
        
        // 清空注册表单和错误信息
        registerForm.value = {
          username: '',
          password: ''
        }
        registerErrorMessage.value = ''
        
        // 切换到账号登录
        switchTab('account')
      }, 500)
    } else {
      registerErrorMessage.value = res.message || '注册失败，请重试'
      uni.showToast({
        title: res.message || '注册失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('注册失败:', error)
    const errorMsg = error.message || error.msg || '注册失败，请检查网络连接'
    registerErrorMessage.value = errorMsg
    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 忘记密码
const handleForgotPassword = () => {
  // TODO: 实现忘记密码逻辑
  console.log('忘记密码')
}

const wechatLoginLoading = ref(false)

const handleWechatLogin = async () => {
  if (wechatLoginLoading.value) return

  // #ifdef APP-PLUS
  wechatLoginLoading.value = true
  uni.showLoading({ title: '微信登录中...' })
  try {
    // 检查微信是否已安装
    const isInstalled = plus.runtime.isApplicationExist
      ? plus.runtime.isApplicationExist({ pname: 'com.tencent.mm', action: 'weixin://' })
      : true
    if (!isInstalled) {
      throw new Error('请先安装微信客户端')
    }

    console.log('🟢 开始调用uni.login，provider=weixin')
    const authRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })

    const authResult = authRes?.authResult || {}
    const accessToken = authResult.access_token || authResult.accessToken
    const openId = authResult.openid || authResult.openId || authResult.unionid

    console.log('🟢 uni.login完成:', {
      hasAccessToken: !!accessToken,
      hasOpenId: !!openId
    })

    if (!openId) {
      throw new Error('未获取到微信授权凭证，请重试')
    }

    let profile = {}
    try {
      const userInfoRes = await new Promise((resolve, reject) => {
        uni.getUserInfo({
          provider: 'weixin',
          success: resolve,
          fail: reject
        })
      })
      profile = userInfoRes?.userInfo || {}
      console.log('🟢 获取到微信用户信息', profile)
    } catch (infoErr) {
      console.warn('⚠️ 获取微信用户信息失败，将使用后端返回的资料', infoErr)
    }

    const backendRes = await request({
      url: '/auth/login/callback',
      method: 'POST',
      needAuth: false,
      showLoading: false,
      data: {
        type: 'weixin',
        code: JSON.stringify({
          accessToken,
          openId,
          profile: {
            nickname: profile.nickName || profile.nickname,
            avatar: profile.avatarUrl || profile.headimgurl
          }
        })
      }
    })

    if (backendRes?.success && backendRes?.token) {
      await handleLoginSuccess(backendRes)
    } else {
      throw new Error(backendRes?.message || '微信登录失败，请稍后重试')
    }
  } catch (error) {
    console.error('❌ 微信登录失败:', error)
    uni.showToast({
      title: error?.message || '微信登录失败',
      icon: 'none',
      duration: 2500
    })
  } finally {
    wechatLoginLoading.value = false
    uni.hideLoading()
  }
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({
    title: '微信登录仅支持App端使用',
    icon: 'none',
    duration: 2000
  })
  // #endif
}

const handleEmailLogin = async () => {
  if (emailLoading.value) return

  const trimmedEmail = emailForm.value.email?.trim().toLowerCase()
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    uni.showToast({
      title: '请输入有效的邮箱地址',
      icon: 'none',
      duration: 2000
    })
    return
  }

  let requestConfig
  if (emailLoginMode.value === 'password') {
    if (!emailForm.value.password) {
      uni.showToast({
        title: '请输入邮箱密码',
        icon: 'none',
        duration: 2000
      })
      return
    }
    requestConfig = {
      url: '/auth/login',
      method: 'POST',
      data: {
        email: trimmedEmail,
        password: emailForm.value.password
      }
    }
  } else {
    const trimmedCode = emailCode.value.trim()
    if (trimmedCode.length !== 6) {
      uni.showToast({
        title: '请输入6位验证码',
        icon: 'none',
        duration: 2000
      })
      return
    }
    requestConfig = {
      url: '/auth/login-by-email-code',
      method: 'POST',
      data: {
        email: trimmedEmail,
        code: trimmedCode
      }
    }
  }

  emailLoading.value = true
  emailErrorMessage.value = ''
  try {
    const res = await request({
      ...requestConfig,
      needAuth: false,
      showLoading: true,
      showError: false
    })

    if (res?.success && res?.token) {
      await handleLoginSuccess(res)
      closeEmailLogin()
      uni.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 2000
      })
    } else {
      const message = res?.message || '邮箱登录失败，请稍后重试'
      emailErrorMessage.value = message
      uni.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    const message = error?.message || error?.msg || '邮箱登录失败，请稍后重试'
    emailErrorMessage.value = message
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  } finally {
    emailLoading.value = false
  }
}

const closeEmailLogin = () => {
  if (emailLoading.value) return
  clearEmailCountdown()
  emailErrorMessage.value = ''
  emailForm.value = {
    email: '',
    password: ''
  }
  emailCode.value = ''
  emailLoginMode.value = 'password'
  showEmailLogin.value = false
}

const handleSendEmailCode = async () => {
  if (emailCountdown.value > 0) return
  const trimmedEmail = emailForm.value.email ? emailForm.value.email.trim() : ''
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    uni.showToast({
      title: '请先输入有效的邮箱地址',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    await request({
      url: '/auth/send-email-code',
      method: 'POST',
      data: {
        email: trimmedEmail.toLowerCase()
      },
      needAuth: false,
      showLoading: true,
      showError: false
    })
    emailCode.value = ''
    startEmailCountdown()
    uni.showToast({
      title: '验证码已发送，请查收邮箱',
      icon: 'none',
      duration: 2000
    })
  } catch (error) {
    console.error('📮 发送邮箱验证码失败:', error)
    const message =
      error?.message ||
      error?.data?.message ||
      error?.msg ||
      error?.error ||
      '验证码发送失败'
    uni.showToast({ title: message, icon: 'none', duration: 2000 })
  }
}

const startEmailCountdown = () => {
  clearEmailCountdown()
  emailCountdown.value = 60
  emailTimer = setInterval(() => {
    emailCountdown.value -= 1
    if (emailCountdown.value <= 0) {
      clearEmailCountdown()
    }
  }, 1000)
}

const clearEmailCountdown = () => {
  if (emailTimer) {
    clearInterval(emailTimer)
    emailTimer = null
  }
  emailCountdown.value = 0
}

onUnmounted(() => {
  clearEmailCountdown()
})

const handleQQLogin = async () => {
  if (qqLoginLoading.value) return

  // #ifdef APP-PLUS
  qqLoginLoading.value = true
  uni.showLoading({ title: 'QQ登录中...' })
  try {
    console.log('🐧 开始调用uni.login，provider=qq')
    const authRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'qq',
        success: resolve,
        fail: reject
      })
    })

    const authResult = authRes?.authResult || {}
    const accessToken = authResult.access_token || authResult.accessToken
    const openId = authResult.openid || authResult.openId

    console.log(' uni.login完成:', {
      hasAccessToken: !!accessToken,
      hasOpenId: !!openId
    })

    if (!accessToken || !openId) {
      throw new Error('未获取到QQ授权凭证，请重试')
    }

    let profile = {}
    try {
      const userInfoRes = await new Promise((resolve, reject) => {
        uni.getUserInfo({
          provider: 'qq',
          success: resolve,
          fail: reject
        })
      })
      profile = userInfoRes?.userInfo || {}
      console.log(' 获取到QQ用户信息', profile)
    } catch (infoErr) {
      console.warn(' 获取QQ用户信息失败，将使用后端返回的资料', infoErr)
    }

    // 使用已有的第三方登录回调接口，传递 type 和临时凭证
    const backendRes = await request({
      url: '/auth/login/callback',
      method: 'POST',
      needAuth: false,
      showLoading: false,
      data: {
        type: 'qq',
        code: JSON.stringify({ accessToken, openId, profile: {
          nickname: profile.nickname || profile.nickName,
          avatar: profile.figureurl_qq_2 || profile.avatarUrl || profile.avatarUrlHd
        } })
      }
    })

    if (backendRes?.success && backendRes?.token) {
      await handleLoginSuccess(backendRes)
    } else {
      const errorMsg = backendRes?.message || 'QQ登录失败，请稍后重试'
      throw new Error(errorMsg)
    }
  } catch (error) {
    console.error('❌ QQ登录失败:', error)
    uni.showToast({
      title: error?.message || 'QQ登录失败',
      icon: 'none',
      duration: 2500
    })
  } finally {
    qqLoginLoading.value = false
    uni.hideLoading()
  }
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({
    title: 'QQ登录仅支持App端使用',
    icon: 'none',
    duration: 2000
  })
  // #endif
}
</script>

<style scoped>
.login-container { min-height: 100vh; position: relative; display: flex; justify-content: center; align-items: center; padding: 40rpx; background: linear-gradient(135deg, #4a90e2, #667eea); overflow: hidden; }
.captcha-container { position: absolute; width: 320px; height: 50px; opacity: 0; pointer-events: none; overflow: hidden; left: -9999px; top: -9999px; }

.bg-decoration { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; z-index: 0; }
.bg-circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); }
.circle-1 { width: 360rpx; height: 360rpx; top: -80rpx; left: -80rpx; }
.circle-2 { width: 260rpx; height: 260rpx; bottom: -40rpx; right: -40rpx; }
.circle-3 { width: 180rpx; height: 180rpx; top: 50%; right: 10%; }

.login-card { position: relative; z-index: 1; width: 100%; max-width: 680rpx; background: #fff; border-radius: 24rpx; padding: 48rpx 40rpx; }

.login-header { text-align: center; margin-bottom: 40rpx; }
.logo-wrapper { display: inline-flex; justify-content: center; align-items: center; width: 110rpx; height: 110rpx; background: #4a90e2; border-radius: 24rpx; margin-bottom: 24rpx; }
.logo-icon { font-size: 52rpx; }
.app-title { font-size: 40rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 8rpx; }
.app-subtitle { font-size: 24rpx; color: #999; }

.login-tabs { display: flex; margin-bottom: 32rpx; background: #f5f5f7; border-radius: 12rpx; padding: 6rpx; }
.tab-item { flex: 1; text-align: center; padding: 18rpx 0; font-size: 28rpx; color: #999; border-radius: 10rpx; font-weight: 500; }
.tab-item.active { background: #fff; color: #4a90e2; font-weight: 600; }

.login-form { margin-bottom: 32rpx; }
.form-group { margin-bottom: 24rpx; }
.input-wrapper { display: flex; align-items: center; background: #f8f9fa; border-radius: 12rpx; padding: 0 20rpx; border: 2rpx solid transparent; }
.input-wrapper:focus-within { background: #fff; border-color: #4a90e2; }
.input-icon { font-size: 28rpx; margin-right: 16rpx; flex-shrink: 0; }
.form-input { flex: 1; height: 88rpx; font-size: 28rpx; color: #1a1a1a; background: transparent; border: none; }
.form-input::placeholder { color: #c7c7cc; }
.input-suffix { margin-left: 16rpx; font-size: 28rpx; }

.code-input-wrapper { padding-right: 8rpx; }
.code-input { flex: 1; }
.code-button { height: 64rpx; padding: 0 20rpx; background: #4a90e2; color: #fff; border: none; border-radius: 32rpx; font-size: 22rpx; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.code-button:disabled { opacity: 0.5; background: #ccc; }

.form-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; font-size: 24rpx; }
.checkbox-label { display: flex; align-items: center; color: #999; }
.checkbox-label text { margin-left: 8rpx; }
.forgot-password { color: #4a90e2; font-weight: 500; }

.primary-button { width: 100%; height: 88rpx; background: #4a90e2; color: #fff; border: none; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; margin-bottom: 24rpx; }
.primary-button:active { opacity: 0.85; }
.primary-button:disabled { opacity: 0.5; background: #ccc; }

.oneclick-button { width: 100%; height: 80rpx; margin-top: 16rpx; background: #fff; border: 2rpx solid #4a90e2; border-radius: 40rpx; font-size: 28rpx; color: #4a90e2; font-weight: 600; }
.oneclick-button:disabled { opacity: 0.5; color: #999; border-color: #ddd; }

.register-link { text-align: center; font-size: 24rpx; color: #999; }
.link-text { color: #4a90e2; font-weight: 500; margin-left: 8rpx; }

.third-party-login { margin-top: 40rpx; }
.divider { display: flex; align-items: center; margin-bottom: 32rpx; }
.divider-line { flex: 1; height: 1rpx; background: #e8e8e8; }
.divider-text { margin: 0 20rpx; font-size: 22rpx; color: #bbb; white-space: nowrap; }
.third-party-buttons { display: flex; justify-content: center; gap: 50rpx; }
.third-party-item { display: flex; flex-direction: column; align-items: center; }
.third-party-item:active { opacity: 0.7; }
.third-party-item.disabled { opacity: 0.5; pointer-events: none; }
.third-party-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-bottom: 10rpx; color: #fff; font-weight: 700; }
.third-party-icon.wechat { background: #07c160; }
.third-party-icon.email { background: #f97316; font-size: 34rpx; }
.third-party-icon.qq { background: #12b7f5; font-size: 34rpx; font-weight: 800; }
.third-party-text { font-size: 20rpx; color: #999; }

.email-login-tabs { display: flex; background: #f5f5f7; border-radius: 12rpx; padding: 6rpx; margin-bottom: 20rpx; }
.email-login-tab { flex: 1; text-align: center; padding: 14rpx 0; font-size: 24rpx; color: #999; border-radius: 10rpx; }
.email-login-tab.active { background: #fff; color: #4a90e2; font-weight: 600; }
.code-tip { font-size: 22rpx; color: #999; margin-top: 10rpx; }

.error-message { display: flex; align-items: center; justify-content: center; padding: 16rpx; background: #fff0f0; border-radius: 10rpx; font-size: 24rpx; color: #e74c3c; margin-top: 16rpx; }
.error-icon { margin-right: 8rpx; font-size: 28rpx; }
.register-error-message { display: flex; align-items: center; justify-content: center; padding: 16rpx; background: #fff0f0; border-radius: 10rpx; font-size: 24rpx; color: #e74c3c; margin-bottom: 16rpx; }

.register-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 40rpx; }
.register-content { width: 100%; max-width: 680rpx; max-height: 90vh; background: #fff; border-radius: 20rpx; padding: 36rpx; overflow-y: auto; }
.register-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32rpx; }
.register-title { font-size: 36rpx; font-weight: 700; color: #1a1a1a; }
.close-button { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: #999; border-radius: 50%; background: #f5f5f7; }
.register-form { margin-top: 16rpx; }
</style>
