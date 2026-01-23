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
            <view class="third-party-item">
              <view class="third-party-icon wechat">💬</view>
              <text class="third-party-text">微信</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon alipay">💰</view>
              <text class="third-party-text">支付宝</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon qq">🐧</view>
              <text class="third-party-text">QQ</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon douyin">🎵</view>
              <text class="third-party-text">抖音</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 手机号验证码登录 -->
      <view v-if="currentTab === 'phone'" class="login-form">
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
            <view class="third-party-item">
              <view class="third-party-icon wechat">💬</view>
              <text class="third-party-text">微信</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon alipay">💰</view>
              <text class="third-party-text">支付宝</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon qq">🐧</view>
              <text class="third-party-text">QQ</text>
            </view>
            <view class="third-party-item">
              <view class="third-party-icon douyin">🎵</view>
              <text class="third-party-text">抖音</text>
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
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { request } from '@/utils/request.js'
import { setToken, setUserInfo } from '@/utils/auth.js'

// 当前登录方式
const currentTab = ref('account') // 'account' | 'phone'

// 加载状态
const loading = ref(false)
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
  code: ''
})

// 注册表单
const registerForm = ref({
  username: '',
  password: ''
})

// 显示注册弹窗
const showRegister = ref(false)

// 其他状态
const showPassword = ref(false)
const rememberMe = ref(false)
const countdown = ref(0)

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
        errorMsg = '网络请求失败，请检查后端服务是否正常运行（http://localhost:3000）'
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
      url: '/auth/login-by-code',
      method: 'POST',
      data: {
        phone: phoneForm.value.phone,
        code: phoneForm.value.code
      },
      needAuth: false
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
  
  loading.value = true
  
  try {
    console.log('📤 开始发送验证码，手机号:', phoneForm.value.phone)
    
    const res = await request({
      url: '/auth/send-code',
      method: 'POST',
      data: {
        phone: phoneForm.value.phone,
        type: 'login'
      },
      needAuth: false,
      showError: false // 手动处理错误提示
    })
    
    console.log('📥 收到响应:', res)
    
    if (res && res.success) {
      uni.showToast({
        title: res.message || '验证码已发送',
        icon: 'success',
        duration: 2000
      })
      
      // 开始倒计时
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
      
      // 开发环境显示验证码（方便测试）
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
  } catch (error) {
    console.error('❌ 发送验证码异常:', error)
    console.error('错误详情:', JSON.stringify(error))
    
    let errorMsg = '发送失败，请检查网络连接'
    
    if (error.message) {
      errorMsg = error.message
    } else if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMsg = '请求超时，请检查网络连接'
      } else if (error.errMsg.includes('fail')) {
        errorMsg = '网络请求失败，请检查后端服务是否运行（http://localhost:3000）'
      } else {
        errorMsg = error.errMsg
      }
    } else if (typeof error === 'string') {
      errorMsg = error
    } else if (error.response) {
      errorMsg = error.response.data?.message || error.response.data?.error || '服务器错误'
    }
    
    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

// 注册
const handleRegister = async () => {
  // 清空之前的错误信息
  registerErrorMessage.value = ''
  
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

// 第三方登录功能已移除，保留占位函数以避免旧代码引用报错
const handleWechatLogin = () => {
  uni.showToast({
    title: '已关闭第三方登录，请使用账号或验证码登录',
    icon: 'none',
    duration: 2000
  })
}

const handleAlipayLogin = () => {
  uni.showToast({
    title: '已关闭第三方登录，请使用账号或验证码登录',
    icon: 'none',
    duration: 2000
  })
}

const handleQQLogin = () => {
  uni.showToast({
    title: '已关闭第三方登录，请使用账号或验证码登录',
    icon: 'none',
    duration: 2000
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #4facfe 50%, #00f2fe 100%);
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 400rpx;
  height: 400rpx;
  top: -100rpx;
  left: -100rpx;
  animation-delay: 0s;
}

.circle-2 {
  width: 300rpx;
  height: 300rpx;
  bottom: -50rpx;
  right: -50rpx;
  animation-delay: 5s;
}

.circle-3 {
  width: 200rpx;
  height: 200rpx;
  top: 50%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(30rpx, 30rpx) scale(1.1);
  }
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 680rpx;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 32rpx;
  padding: 60rpx 50rpx;
  box-shadow: 0 20rpx 100rpx rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10rpx);
}

/* 头部 */
.login-header {
  text-align: center;
  margin-bottom: 50rpx;
}

.logo-wrapper {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, 0.3);
}

.logo-icon {
  font-size: 60rpx;
}

.app-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10rpx;
  letter-spacing: 2rpx;
}

.app-subtitle {
  font-size: 26rpx;
  color: #8e8e93;
  letter-spacing: 1rpx;
}

/* 登录方式切换 */
.login-tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40rpx;
  background: #f5f5f7;
  border-radius: 16rpx;
  padding: 8rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #8e8e93;
  border-radius: 12rpx;
  transition: all 0.3s;
  font-weight: 500;
}

.tab-item.active {
  background: #fff;
  color: #667eea;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.2);
}

/* 表单 */
.login-form {
  margin-bottom: 40rpx;
}

.form-group {
  margin-bottom: 30rpx;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  background: #fff;
  border-color: #667eea;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

.input-icon {
  font-size: 32rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  height: 96rpx;
  font-size: 30rpx;
  color: #1a1a1a;
  background: transparent;
  border: none;
}

.form-input::placeholder {
  color: #c7c7cc;
}

.input-suffix {
  margin-left: 20rpx;
  font-size: 32rpx;
  cursor: pointer;
}

.code-input-wrapper {
  padding-right: 8rpx;
}

.code-input {
  flex: 1;
}

.code-button {
  height: 72rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.code-button:disabled {
  opacity: 0.5;
  background: #c7c7cc;
}

/* 表单选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  font-size: 26rpx;
}

.checkbox-label {
  display: flex;
  align-items: center;
  color: #8e8e93;
}

.checkbox-label text {
  margin-left: 10rpx;
}

.forgot-password {
  color: #667eea;
  font-weight: 500;
}

/* 主按钮 */
.primary-button {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.primary-button:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.2);
}

.primary-button:disabled {
  opacity: 0.5;
  background: #c7c7cc;
  box-shadow: none;
}

/* 注册链接 */
.register-link {
  text-align: center;
  font-size: 26rpx;
  color: #8e8e93;
}

.link-text {
  color: #667eea;
  font-weight: 500;
  margin-left: 8rpx;
}

/* 第三方登录 */
.third-party-login {
  margin-top: 50rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e5e5ea;
}

.divider-text {
  margin: 0 20rpx;
  font-size: 24rpx;
  color: #8e8e93;
}

.third-party-buttons {
  display: flex;
  justify-content: space-around;
}

.third-party-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s;
}

.third-party-item:active {
  transform: scale(0.95);
}

.third-party-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.third-party-icon.wechat {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
}

.third-party-icon.alipay {
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
}

.third-party-icon.qq {
  background: linear-gradient(135deg, #12b7f5 0%, #0ea5e9 100%);
}

.third-party-icon.douyin {
  background: linear-gradient(135deg, #111 0%, #222 100%);
  color: #fff;
}

.third-party-text {
  font-size: 24rpx;
  color: #8e8e93;
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background: #fee;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #f56565;
  margin-top: 20rpx;
}

.error-icon {
  margin-right: 10rpx;
  font-size: 32rpx;
}

/* 注册错误提示 */
.register-error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background: #fee;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #f56565;
  margin-bottom: 20rpx;
}

/* 注册弹窗 */
.register-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40rpx;
}

.register-content {
  width: 100%;
  max-width: 680rpx;
  max-height: 90vh;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
  overflow-y: auto;
}

.register-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
}

.register-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.close-button {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #8e8e93;
  border-radius: 50%;
  background: #f5f5f7;
  cursor: pointer;
}

.register-form {
  margin-top: 20rpx;
}
</style>
