<template>
  <view class="patient-page">
    <!-- 顶部步骤：到第二步 -->
    <view class="step-header">
      <view class="step-item">
        <text class="step-index">1</text>
        <text class="step-text">病情描述</text>
      </view>
      <view class="step-divider"></view>
      <view class="step-item active">
        <text class="step-index">2</text>
        <text class="step-text">你要为谁咨询</text>
      </view>
    </view>

    <!-- 咨询患者 -->
    <view class="section">
      <view class="section-label">咨询患者：</view>
      <view class="patient-cards">
        <view
          v-for="item in patients"
          :key="item.id"
          class="patient-card"
          :class="{ active: item.id === activePatientId }"
          @click="selectPatient(item.id)"
        >
          <view class="patient-name">{{ item.name }}</view>
          <view class="patient-info">{{ item.gender }}｜{{ item.age }}岁</view>
          <view v-if="item.id === activePatientId" class="checked-icon">✔</view>
        </view>

        <!-- 新增患者卡片 -->
        <view class="patient-card add-card" @click="addPatient">
          <text class="add-plus">+</text>
        </view>
      </view>
    </view>

    <!-- 是否就诊 -->
    <view class="section">
      <view class="section-label">是否就该疾病到医院就诊过：</view>
      <view class="bool-buttons">
        <view
          class="bool-btn"
          :class="{ active: hasVisited === true }"
          @click="setVisited(true)"
        >
          是
        </view>
        <view
          class="bool-btn"
          :class="{ active: hasVisited === false }"
          @click="setVisited(false)"
        >
          否
        </view>
      </view>
    </view>

    <!-- 底部提示 + 按钮 -->
    <view class="bottom-fixed">
      <view class="agreement-text">
        点击立即咨询即同意
        <text class="link" @click="openAgreement">《病例隐私协议》</text>
        ，家庭签署
      </view>
      <button class="submit-btn" type="primary" @click="submitConsult">
        立即咨询
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, onMounted } from 'vue'
import { connectSocket, sendMessage } from '../../utils/socket'
import { saveConsultation } from '../../utils/consultationStorage'
import { getUserInfo } from '../../utils/auth'
import request from '../../utils/request'
import { getPatients, getDefaultPatient } from '../../utils/patientStorage'

// 声明全局变量
declare const uni: any;
declare const plus: any;
declare function getCurrentPages(): any[];
declare function getApp(): any;

interface Patient {
  id: string | number
  name: string
  gender: string
  age: number
}

const patients = ref<Patient[]>([])

const activePatientId = ref<string | number | null>(null)
const hasVisited = ref<boolean | null>(null)
const isSubmitting = ref(false)

// 加载就诊人列表
onMounted(() => {
  loadPatients()
})

const loadPatients = () => {
  try {
    const storedPatients = getPatients()
    if (storedPatients && storedPatients.length > 0) {
      patients.value = storedPatients.map(p => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        age: p.age
      }))
      // 设置默认就诊人
      const defaultPatient = getDefaultPatient()
      if (defaultPatient) {
        activePatientId.value = defaultPatient.id
      } else if (patients.value.length > 0) {
        activePatientId.value = patients.value[0].id
      }
      } else {
      // 如果没有存储的就诊人，显示空列表
      patients.value = []
      activePatientId.value = null
    }
  } catch (e) {
    console.error('加载就诊人列表失败:', e)
    // 加载失败时显示空列表
    patients.value = []
    activePatientId.value = null
  }
}

const selectPatient = (id: string | number) => {
  activePatientId.value = id
}

const addPatient = () => {
  uni.navigateTo({
    url: '/pages/mine/patient-edit',
    success: () => {
      // 页面返回时重新加载就诊人列表
      uni.$on('patientUpdated', loadPatients)
    }
  })
}

const setVisited = (val: boolean) => {
  hasVisited.value = val
}

const openAgreement = () => {
  uni.showToast({
    title: '打开病例隐私协议',
    icon: 'none'
  })
}

const submitConsult = async () => {
  if (!activePatientId.value) {
    uni.showToast({
      title: '请选择咨询患者',
      icon: 'none'
    })
    return
  }
  if (hasVisited.value === null) {
    uni.showToast({
      title: '请选择是否就诊过',
      icon: 'none'
    })
    return
  }
  
  if (isSubmitting.value) {
    return
  }
  
  isSubmitting.value = true
  uni.showLoading({ title: '正在提交...', mask: true })
  
  try {
    // 获取选中的患者信息
    const selectedPatient = patients.value.find(p => p.id === activePatientId.value)
    if (!selectedPatient) {
      throw new Error('未找到选中的患者信息')
    }
    
    // 获取全局咨询数据（病情描述和图片）
    // @ts-ignore
    const app = getApp()
    const consultData = app.globalData?.consultData || {}
    
    if (!consultData.description) {
      throw new Error('请先描述病情')
    }
    
    // 获取用户信息（用于存储key）
    const userInfo = getUserInfo()
    const userId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || `patient_${Date.now()}`
    
    // 生成患者ID（基于患者姓名、性别、年龄，确保同一患者使用同一个ID）
    // 注意：这里使用患者信息作为ID，不包含用户ID，这样同一患者姓名会使用同一个咨询页面
    const patientId = `patient_${selectedPatient.name}_${selectedPatient.gender}_${selectedPatient.age}`
    
    // 保存 patientId 到全局和本地，供聊天页使用（避免 chat.vue 再次回退到登录ID）
    try {
      const app = getApp && getApp()
      if (app) {
        app.globalData = app.globalData || {}
        app.globalData.consultData = {
          ...(app.globalData.consultData || {}),
          patientId
        }
      }
      uni.setStorageSync('currentPatientId', patientId)
    } catch (e) {
      console.warn('⚠️ 保存 patientId 到全局/本地失败:', e)
    }
    
    // 1. 指定固定医生（qmp）接收当前咨询
    // 说明：原逻辑是从 /chat/on-duty-doctors 获取在岗医生列表并取第一个。
    // 现在按需求，强制将所有前台问诊固定分配给 qmp 账号。
    // qmp 的医生ID（userId）为后端配置中的 '6954c80b51429de7970bc551'。
    const doctorId = '6954c80b51429de7970bc551'
    console.log('🔒 使用固定医生ID (qmp):', doctorId)
    
    // 2. 连接Socket.IO
    try {
      await connectSocket(patientId, {
        name: selectedPatient.name,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        userId: patientId
      })
      console.log('✅ Socket.IO 连接成功')
    } catch (error) {
      console.error('❌ Socket.IO 连接失败:', error)
      throw new Error('连接服务器失败，请稍后重试')
    }
    
    // 3. 构建患者信息卡片数据（作为初始消息发送）
    const patientCardData = {
      patientInfo: {
        name: selectedPatient.name,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        id: patientId
      },
      symptomDescription: consultData.description || '',
      images: (consultData.files || []).map((file: any) => ({
        url: file.path || file.thumb || file,
        thumb: file.thumb || file.path || file,
        type: file.type || 'image'
      })),
      hasVisited: hasVisited.value
    }
    
    // 4. 发送初始消息到医生（包含患者信息和症状描述）
    try {
      // 获取前台账号ID（当前登录用户的ID）
      const frontDeskUserId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
      await sendMessage(
        doctorId,
        JSON.stringify(patientCardData),
        'patient-card',
        {
          patientCardData: patientCardData
        },
        frontDeskUserId // 传递前台账号ID
      )
      console.log('✅ 初始消息已发送到医生')
    } catch (error) {
      console.error('❌ 发送初始消息失败:', error)
      // 即使发送失败，也继续保存咨询记录
    }
    
    // 5. 创建并保存咨询记录到本地存储（根据患者姓名区分）
    const consultationData = {
      patientInfo: {
        name: selectedPatient.name,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        id: patientId
      },
      symptomDescription: consultData.description || '',
      symptomImages: (consultData.files || []).map((file: any) => ({
        path: file.path || file.thumb || file,
        thumb: file.thumb || file.path || file,
        type: file.type || 'image'
      })),
      doctorId: doctorId,
      patientId: patientId,
      messages: [], // 初始消息会在聊天页面加载时从服务器获取
      hasVisited: hasVisited.value
    }
    
    // 保存咨询记录到本地存储（会根据患者姓名自动合并或创建新记录）
    // 使用userId作为存储key，但使用patientId（基于患者姓名）作为患者标识
    const consultationId = saveConsultation(consultationData, userId)
    console.log('✅ 咨询记录已保存到本地:', consultationId, '患者:', selectedPatient.name)
    
    // 同步咨询记录到后台（确保后台也有记录）
    try {
      // 获取前台账号ID（当前登录用户的ID）
      const frontDeskUserId = userInfo?.id || userInfo?._id || userInfo?.userId || userInfo?.username || userInfo?.phone || null
      
      if (frontDeskUserId && doctorId) {
        console.log('🔄 同步咨询记录到后台...', {
          patientId,
          doctorId,
          createdBy: frontDeskUserId
        })
        
        const syncResponse = await request({
          url: '/chat/consultation',
          method: 'POST',
          data: {
            patientId: patientId,
            doctorId: doctorId,
            patientInfo: consultationData.patientInfo,
            symptomDescription: consultationData.symptomDescription,
            symptomImages: consultationData.symptomImages,
            createdBy: frontDeskUserId // 传递前台账号ID
          },
          needAuth: true,
          showLoading: true,
          showError: true
        })
        
        if (syncResponse.success && syncResponse.data) {
          console.log('✅ 咨询记录已同步到后台:', syncResponse.data._id || syncResponse.data.id)
          // 更新全局数据中的咨询记录ID
          if (app.globalData && app.globalData.consultData) {
            app.globalData.consultData.consultationId = syncResponse.data._id || syncResponse.data.id
          }
        } else {
          console.warn('⚠️ 同步咨询记录到后台失败:', syncResponse.message || '未知错误')
        }
      } else {
        console.warn('⚠️ 无法同步咨询记录到后台：缺少前台账号ID或医生ID', {
          hasFrontDeskUserId: !!frontDeskUserId,
          hasDoctorId: !!doctorId
        })
      }
    } catch (syncError) {
      console.error('❌ 同步咨询记录到后台失败:', syncError)
      // 不同步失败不影响本地保存和后续流程
    }
    
    // 6. 将数据存储到全局，供聊天页面使用
    if (app.globalData) {
      app.globalData.consultData = {
        ...consultData,
        patient: selectedPatient,
        hasVisited: hasVisited.value,
        doctorId: doctorId,
        patientId: patientId,
        consultationId: consultationId
      }
    }
    
    uni.hideLoading()
    isSubmitting.value = false
    
    // 7. 跳转到咨询会话页面
    uni.navigateTo({
      url: '/pages/online-consult/chat'
    })
    
  } catch (error: any) {
    uni.hideLoading()
    isSubmitting.value = false
    console.error('❌ 提交咨询失败:', error)
    uni.showToast({
      title: error.message || '提交失败，请重试',
      icon: 'none',
      duration: 2000
    })
  }
}
</script>

<style lang="scss">
.patient-page {
  min-height: 100vh;
  background-color: #f6f7fb;
  padding: 20rpx 30rpx 140rpx;
  box-sizing: border-box;
}

.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #c0c4cc;

    &.active {
      .step-index {
        background-color: #007aff;
        color: #fff;
      }
      .step-text {
        color: #333;
        font-weight: bold;
      }
    }

    .step-index {
      width: 40rpx;
      height: 40rpx;
      line-height: 40rpx;
      text-align: center;
      border-radius: 50%;
      background-color: #e5e5ea;
      margin-bottom: 8rpx;
      font-size: 24rpx;
    }

    .step-text {
      font-size: 26rpx;
    }
  }

  .step-divider {
    flex: 1;
    height: 2rpx;
    margin: 0 20rpx;
    background-color: #e5e5ea;
  }
}

.section {
  margin-bottom: 40rpx;
}

.section-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.patient-cards {
  display: flex;
  gap: 20rpx;
}

.patient-card {
  flex: 1;
  min-width: 180rpx;
  padding: 24rpx 20rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
  position: relative;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &.active {
    border: 2rpx solid #007aff;
  }

  .patient-name {
    font-size: 30rpx;
    color: #333;
    margin-bottom: 8rpx;
  }

  .patient-info {
    font-size: 24rpx;
    color: #999;
  }

  .checked-icon {
    position: absolute;
    right: 16rpx;
    bottom: 16rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 18rpx;
    background-color: #007aff;
    color: #fff;
    text-align: center;
    line-height: 36rpx;
    font-size: 24rpx;
  }

  &.add-card {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx dashed #d0d3e2;
    box-shadow: none;

    .add-plus {
      font-size: 48rpx;
      color: #c0c4cc;
    }
  }
}

.bool-buttons {
  display: flex;
  gap: 40rpx;
}

.bool-btn {
  flex: 0 0 150rpx;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 16rpx;
  background-color: #ffffff;
  font-size: 28rpx;
  color: #333;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &.active {
    background-color: #007aff;
    color: #fff;
  }
}

.bottom-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 40rpx 40rpx;
  background-color: #f6f7fb;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.agreement-text {
  font-size: 20rpx;
  color: #c0c4cc;
  text-align: center;
  margin-bottom: 16rpx;

  .link {
    color: #007aff;
  }
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background-color: #007aff;
  font-size: 30rpx;
}
</style>



