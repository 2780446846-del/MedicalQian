<template>
  <view class="page">
    <view class="header">
      <text class="page-title">我的咨询</text>
    </view>
    
    <!-- 咨询记录列表 -->
    <view v-if="consultations.length > 0" class="consultation-list">
      <view 
        v-for="consultation in consultations" 
        :key="consultation.id"
        class="consultation-item"
        @click="viewConsultation(consultation)"
      >
        <view class="consultation-header">
          <!-- 左侧：医生信息 -->
          <view class="user-info-section">
            <view class="user-avatar">
              <text class="avatar-text">{{ getAvatarText(getDoctorName(consultation)) }}</text>
            </view>
            <view class="user-info-text">
              <text class="user-name">{{ getDoctorName(consultation) }}</text>
              <text class="user-details" v-if="getDoctorDetails(consultation)">{{ getDoctorDetails(consultation) }}</text>
            </view>
          </view>
          
          <!-- 右侧：患者信息 -->
          <view class="patient-info-section">
            <view class="patient-info-text">
              <text class="patient-name">{{ consultation.patientInfo?.name || '未知患者' }}</text>
              <text class="patient-details">{{ consultation.patientInfo?.gender || '' }}{{ consultation.patientInfo?.gender && consultation.patientInfo?.age ? ' | ' : '' }}{{ consultation.patientInfo?.age || '' }}{{ consultation.patientInfo?.age ? '岁' : '' }}</text>
            </view>
            <text class="consultation-time">{{ formatTime(consultation.updatedAt || consultation.createdAt) }}</text>
          </view>
        </view>
        
        <view class="consultation-content">
          <text class="symptom-preview" v-if="consultation.symptomDescription">
            {{ consultation.symptomDescription.length > 50 
              ? consultation.symptomDescription.substring(0, 50) + '...' 
              : consultation.symptomDescription }}
          </text>
          <text class="no-symptom" v-else>暂无症状描述</text>
        </view>
        
        <view class="consultation-footer">
          <view class="message-count">
            <text class="count-text">{{ consultation.messageCount || consultation.messages?.length || 0 }} 条消息</text>
          </view>
          <view class="image-count" v-if="consultation.symptomImages && consultation.symptomImages.length > 0">
            <text class="image-icon">📷</text>
            <text class="count-text">{{ consultation.symptomImages.length }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无咨询记录</text>
      <text class="empty-tip">开始一次新的咨询吧</text>
    </view>
    
    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue'
import { getAllConsultations, formatTime, saveConsultation } from '@/utils/consultationStorage.js'
import { getUserInfo } from '@/utils/auth.js'
import request from '@/utils/request.js'

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      consultations: [],
      loading: false,
      currentUserInfo: null,
      currentUserProfile: null
    }
  },
  computed: {
    // 获取当前用户显示名称
    currentUserDisplayName() {
      if (this.currentUserInfo) {
        return this.currentUserInfo.username || this.currentUserInfo.phone || this.currentUserInfo.name || '前台账号信息'
      }
      return '前台账号信息'
    },
    // 获取当前用户性别和年龄
    currentUserDetails() {
      const gender = (this.currentUserProfile?.gender || this.currentUserInfo?.gender || '').trim()
      const age = (this.currentUserProfile?.age || this.currentUserInfo?.age || '').toString().trim()
      if (gender || age) {
        return `${gender}${gender && age ? ' | ' : ''}${age}${age ? '岁' : ''}`
      }
      return ''
    }
  },
  onShow() {
    // 页面显示时重新加载用户数据和记录
    this.loadUserData()
    this.loadConsultations()
  },
  mounted() {
    // 页面加载时加载用户数据和记录
    this.loadUserData()
    this.loadConsultations()
  },
  methods: {
    // 加载用户数据
    loadUserData() {
      try {
        this.currentUserInfo = getUserInfo()
        
        // 获取用户资料（包含性别等信息）
        const app = getApp && getApp()
        if (app && app.globalData && app.globalData.userProfile) {
          this.currentUserProfile = app.globalData.userProfile
        } else {
          // 尝试从本地存储读取
          const userProfile = uni.getStorageSync('userProfile')
          if (userProfile) {
            this.currentUserProfile = typeof userProfile === 'string' ? JSON.parse(userProfile) : userProfile
          }
        }
      } catch (e) {
        console.warn('加载用户数据失败:', e)
      }
    },
    
    // 加载咨询记录（从后端同步最新数据）
    async loadConsultations() {
      this.loading = true
      try {
        // 获取当前用户信息（从多个来源尝试）
        const app = getApp && getApp()
        let userInfo = getUserInfo() || (app && app.globalData && app.globalData.userInfo) || uni.getStorageSync('userInfo') || {}
        if (typeof userInfo === 'string') {
          try {
            userInfo = JSON.parse(userInfo)
          } catch (e) {
            userInfo = {}
          }
        }
        
        // 获取前台账号ID（当前登录用户的ID，用于存储key和查询）
        const frontDeskUserId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
        
        if (frontDeskUserId) {
          try {
            console.log('🔄 从后端同步咨询记录，前台账号ID:', frontDeskUserId)
            const response = await request({
              url: `/chat/user-consultations?userId=${frontDeskUserId}`,
              method: 'GET'
            })
            
            if (response.success && response.data && response.data.length > 0) {
              console.log('✅ 从后端获取到', response.data.length, '条咨询记录')
              
              // 将后端数据同步到本地存储
              response.data.forEach(consultation => {
                // 转换后端数据格式为本地存储格式
                const localConsultation = {
                  id: consultation._id || consultation.id,
                  patientId: consultation.patientId,
                  doctorId: consultation.doctorId,
                  doctorInfo: consultation.doctorInfo || {}, // 保存医生信息
                  patientInfo: consultation.patientInfo,
                  symptomDescription: consultation.symptomDescription,
                  symptomImages: consultation.symptomImages || [],
                  messageCount: consultation.messageCount || 0,
                  lastMessage: consultation.lastMessage,
                  lastMessageTime: consultation.lastMessageTime ? new Date(consultation.lastMessageTime).getTime() : Date.now(),
                  createdAt: consultation.createdAt ? new Date(consultation.createdAt).getTime() : Date.now(),
                  updatedAt: consultation.updatedAt ? new Date(consultation.updatedAt).getTime() : Date.now(),
                  messages: [] // 消息列表在查看详情时再加载
                }
                
                // 保存到本地存储（会自动合并，使用前台账号ID作为存储key）
                // 注意：这里传入的是前台账号ID，不是患者ID
                saveConsultation(localConsultation, frontDeskUserId)
              })
              
              console.log('✅ 后端数据已同步到本地存储')
            } else {
              console.log('ℹ️ 后端没有咨询记录')
            }
          } catch (apiError) {
            console.error('❌ 从后端同步咨询记录失败:', apiError)
            // 即使后端同步失败，也继续使用本地数据
          }
        } else {
          console.warn('⚠️ 无法获取前台账号ID，跳过后端同步')
        }
        
        // 2. 从本地存储读取当前用户的咨询记录（包括刚同步的）
        // 使用前台账号ID，确保只读取当前用户的记录
        const allConsultations = getAllConsultations(frontDeskUserId)
        
        // 按患者信息分组：通过姓名+性别+年龄来区分不同的患者（图二中的信息）
        const patientKeyMap = new Map()
        
        // 生成患者唯一标识（姓名+性别+年龄）
        const getPatientKey = (patientInfo) => {
          const name = (patientInfo.name || '未知患者').trim()
          const gender = (patientInfo.gender || '').trim()
          const age = patientInfo.age || ''
          // 使用"姓名|性别|年龄"作为唯一标识，通过图二中的信息来区分
          return `${name}|${gender}|${age}`
        }
        
        allConsultations.forEach(consultation => {
          const patientInfo = consultation.patientInfo || {}
          const patientKey = getPatientKey(patientInfo)
          
          // 使用患者信息（姓名+性别+年龄）作为key，通过图二中的信息来区分
          if (!patientKeyMap.has(patientKey)) {
            // 如果还没有这个患者的记录，直接添加
            patientKeyMap.set(patientKey, consultation)
          } else {
            // 如果已存在，比较更新时间，保留最新的
            const existing = patientKeyMap.get(patientKey)
            const existingTime = existing.updatedAt || existing.createdAt || existing.lastMessageTime || 0
            const newTime = consultation.updatedAt || consultation.createdAt || consultation.lastMessageTime || 0
            
            if (newTime > existingTime) {
              patientKeyMap.set(patientKey, consultation)
            }
          }
        })
        
        // 转换为数组并按更新时间排序（最新的在前面）
        this.consultations = Array.from(patientKeyMap.values())
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || a.lastMessageTime || 0
            const timeB = b.updatedAt || b.createdAt || b.lastMessageTime || 0
            return timeB - timeA // 最新的在前面
          })
        
        console.log('✅ 加载咨询记录:', this.consultations.length, '（去重后）')
      } catch (error) {
        console.error('❌ 加载咨询记录失败:', error)
        this.consultations = []
      } finally {
        this.loading = false
      }
    },
    
    // 格式化时间
    formatTime(timestamp) {
      return formatTime(timestamp)
    },
    
    // 获取医生名字
    getDoctorName(consultation) {
      if (!consultation) {
        return '医生'
      }
      
      // 优先使用后端返回的医生信息（包括name、username等字段）
      if (consultation.doctorInfo && typeof consultation.doctorInfo === 'object') {
        // 尝试多个可能的字段名
        const doctorName = consultation.doctorInfo.name || 
                          consultation.doctorInfo.username || 
                          consultation.doctorInfo.nickname ||
                          consultation.doctorInfo.realname
        if (doctorName) {
          return doctorName
        }
      }
      
      const doctorId = consultation?.doctorId
      
      // 如果当前用户是医生（doctorId以doctor_开头，或者当前用户ID等于doctorId），显示当前用户的名字
      const currentUserId = this.currentUserInfo?.id || this.currentUserInfo?._id || this.currentUserInfo?.userId || this.currentUserInfo?.username || this.currentUserInfo?.phone
      
      // 判断当前用户是否是医生
      if (doctorId && currentUserId) {
        const isCurrentUserDoctor = (
          doctorId.startsWith('doctor_') && currentUserId === doctorId.replace('doctor_', '') ||
          currentUserId === doctorId ||
          currentUserId?.startsWith('doctor_')
        )
        
        if (isCurrentUserDoctor) {
          // 当前用户是医生，显示当前用户的名字
          console.log('✅ 当前用户是医生，显示当前用户名称:', this.currentUserDisplayName)
          return this.currentUserDisplayName
        }
      }
      
      // 如果是前台账号，需要根据doctorId获取医生名字
      // 如果doctorId包含名字信息，尝试提取
      if (doctorId) {
        // 如果doctorId以doctor_开头，去掉前缀后作为显示名称
        if (doctorId.startsWith('doctor_')) {
          const doctorIdWithoutPrefix = doctorId.replace('doctor_', '')
          // 如果去掉前缀后是纯数字，返回"医生"；否则尝试作为名字使用（如"qmp"）
          if (/^\d+$/.test(doctorIdWithoutPrefix)) {
            return '医生'
          }
          return doctorIdWithoutPrefix || '医生'
        }
        // 如果doctorId看起来像是名字（包含中文或字母），直接使用
        if (/[\u4e00-\u9fa5]/.test(doctorId)) {
          return doctorId
        }
        // 如果doctorId是纯字母（如"qmp"），直接使用
        if (/^[a-zA-Z]+$/.test(doctorId)) {
          return doctorId
        }
        // 如果doctorId是字母数字组合（如"qmp123"），也尝试使用（但长度限制）
        if (/^[a-zA-Z0-9]+$/.test(doctorId) && doctorId.length <= 20 && doctorId.length >= 2) {
          return doctorId
        }
        return '医生'
      }
      
      // 默认返回医生
      return '医生'
    },
    
    // 获取医生详情（性别、年龄等）
    getDoctorDetails(consultation) {
      // 如果当前用户是医生，显示当前用户的详情
      const currentUserId = this.currentUserInfo?.id || this.currentUserInfo?._id || this.currentUserInfo?.userId || this.currentUserInfo?.username || this.currentUserInfo?.phone
      const doctorId = consultation?.doctorId
      
      const isCurrentUserDoctor = doctorId && (
        doctorId.startsWith('doctor_') && currentUserId === doctorId.replace('doctor_', '') ||
        currentUserId === doctorId ||
        currentUserId?.startsWith('doctor_')
      )
      
      if (isCurrentUserDoctor) {
        return this.currentUserDetails
      }
      
      // 如果是前台账号，尝试从doctorInfo中获取医生详情
      if (consultation.doctorInfo) {
        const gender = (consultation.doctorInfo.gender || '').trim()
        const age = (consultation.doctorInfo.age || '').toString().trim()
        if (gender || age) {
          return `${gender}${gender && age ? ' | ' : ''}${age}${age ? '岁' : ''}`
        }
      }
      
      return ''
    },
    
    // 获取头像文字（取名称的第一个字符）
    getAvatarText(name) {
      if (!name || name === '前台账号信息') {
        return '前'
      }
      // 如果是中文，取第一个字符；如果是英文，取首字母
      const firstChar = name.charAt(0)
      if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        return firstChar
      }
      return firstChar.toUpperCase()
    },
    
    // 判断两个患者是否相同（通过姓名+性别+年龄判断，图二中的信息）
    isSamePatient(patient1, patient2) {
      if (!patient1 || !patient2) return false
      const name1 = (patient1.name || '').trim()
      const name2 = (patient2.name || '').trim()
      const gender1 = (patient1.gender || '').trim()
      const gender2 = (patient2.gender || '').trim()
      const age1 = patient1.age || ''
      const age2 = patient2.age || ''
      
      // 通过姓名+性别+年龄来判断是否是同一患者（图二中的信息）
      return name1 === name2 && 
             name1 !== '' && 
             gender1 === gender2 && 
             age1 === age2
    },
    
    // 查看咨询详情
    viewConsultation(consultation) {
      // @ts-ignore
      const app = getApp()
      if (!app.globalData) {
        app.globalData = {}
      }
      
      // 获取当前选中的患者信息（图二中的信息：姓名、性别、年龄）
      const currentPatient = consultation.patientInfo || {}
      // 通过患者信息（姓名+性别+年龄）生成唯一标识，通过图二中的信息来区分
      const getPatientKey = (patientInfo) => {
        const name = (patientInfo.name || '未知患者').trim()
        const gender = (patientInfo.gender || '').trim()
        const age = patientInfo.age || ''
        return `${name}|${gender}|${age}`
      }
      const currentPatientKey = getPatientKey(currentPatient)
      
      // 检查是否有之前的咨询记录（从全局数据中获取）
      const previousConsultData = app.globalData.consultData || {}
      const previousPatient = previousConsultData.patient || {}
      const previousPatientKey = getPatientKey(previousPatient)
      
      // 判断是否是同一患者（通过姓名+性别+年龄判断，图二中的信息）
      const isSamePatient = currentPatientKey === previousPatientKey && currentPatientKey !== '未知患者||'
      
      if (isSamePatient && consultation.id) {
        // 患者相同，继续之前的咨询（恢复咨询进度）
        console.log('✅ 患者相同，继续之前的咨询:', consultation.id, '患者:', currentPatient.name)
        app.globalData.consultData = {
          description: consultation.symptomDescription || previousConsultData.description || '',
          patient: currentPatient,
          files: consultation.symptomImages && consultation.symptomImages.length > 0 
            ? consultation.symptomImages 
            : (previousConsultData.files || []),
          consultationId: consultation.id, // 使用当前咨询记录的ID
          doctorId: consultation.doctorId || previousConsultData.doctorId,
          patientId: consultation.patientId || currentPatient.id || previousConsultData.patientId,
          messages: consultation.messages && consultation.messages.length > 0 
            ? consultation.messages 
            : (previousConsultData.messages || [])
        }
      } else {
        // 患者不同或没有之前的咨询记录，新开咨询页面
        console.log('🆕 患者不同或首次咨询，新开咨询页面，患者:', currentPatient.name)
        app.globalData.consultData = {
          description: consultation.symptomDescription || '',
          patient: currentPatient,
          files: consultation.symptomImages || [],
          consultationId: consultation.id, // 如果有ID，说明是恢复已有记录；如果没有，会在聊天页面创建新记录
          doctorId: consultation.doctorId,
          patientId: consultation.patientId || currentPatient.id,
          messages: consultation.messages || []
        }
      }
      
      // 跳转到聊天页面
      uni.navigateTo({
        url: '/pages/online-consult/chat'
      })
    }
  }
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: 100rpx;
  transition: background-color 0.3s ease;
}

.header {
  padding: 30rpx 30rpx 20rpx;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.consultation-list {
  padding: 0 30rpx;
}

.consultation-item {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  
  &:active {
    opacity: 0.8;
  }
}

.consultation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
  gap: 20rpx;
}

/* 左侧：前台账号信息 */
.user-info-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 0 0 auto;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.user-details {
  font-size: 24rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
}

/* 右侧：患者信息 */
.patient-info-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.patient-info-text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  width: 100%;
}

.patient-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-color);
  transition: color 0.3s ease;
  text-align: right;
}

.patient-details {
  font-size: 26rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
  text-align: right;
}

.consultation-time {
  font-size: 24rpx;
  color: var(--text-color-tertiary);
  transition: color 0.3s ease;
  text-align: right;
}

.consultation-content {
  margin-bottom: 20rpx;
}

.symptom-preview {
  font-size: 28rpx;
  color: var(--text-color-secondary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.no-symptom {
  font-size: 28rpx;
  color: var(--text-color-tertiary);
  font-style: italic;
  transition: color 0.3s ease;
}

.consultation-footer {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.message-count,
.image-count {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.count-text {
  font-size: 24rpx;
  color: var(--text-color-tertiary);
  transition: color 0.3s ease;
}

.image-icon {
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 30rpx;
  text-align: center;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: var(--text-color-secondary);
  margin-bottom: 16rpx;
  transition: color 0.3s ease;
}

.empty-tip {
  font-size: 26rpx;
  color: var(--text-color-tertiary);
  transition: color 0.3s ease;
}
</style>