<template>
  <view class="page">
    <scroll-view class="content" scroll-y>
      <!-- 医生信息卡片 -->
      <view class="doctor-card">
        <image class="doctor-avatar" :src="doctorInfo.avatar" mode="aspectFill" />
        <view class="doctor-info">
          <view class="doctor-name-row">
            <text class="doctor-name">{{ doctorInfo.name }}</text>
            <text class="doctor-level">{{ doctorInfo.level }}</text>
          </view>
          <text class="doctor-hospital">{{ doctorInfo.hospital }}{{ doctorInfo.title || '' }}</text>
        </view>
      </view>

      <!-- 预约详情 -->
      <view class="appointment-details">
        <view class="detail-row">
          <text class="detail-label">就诊医院科室</text>
          <text class="detail-value">{{ appointmentInfo.hospital }} - {{ appointmentInfo.dept }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">门诊时间</text>
          <text class="detail-value">{{ appointmentInfo.date }} {{ appointmentInfo.time }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">门诊类型</text>
          <text class="detail-value">{{ appointmentInfo.type }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">医事服务费</text>
          <text class="detail-value price">¥{{ appointmentInfo.fee }}</text>
        </view>
      </view>

      <!-- 预约须知 -->
      <view class="appointment-notes">
        <view class="notes-header">
          <view class="info-icon">ℹ</view>
          <text class="notes-title">门诊预约挂号须知</text>
          <text class="notes-subtitle">(预约即代表同意以下规则)</text>
        </view>
        <view class="notes-list">
          <text class="note-item">1. 医事服务费由医院设定本平台不收取任何额外费用</text>
          <text class="note-item">2. 停诊将短信通知,请保持手机畅通</text>
          <text class="note-item">3. 实名制预约,就诊人信息不符将无法取号</text>
        </view>
      </view>

      <!-- 选择就诊人 -->
      <view class="patient-section">
        <text class="section-title">选择就诊人:</text>
        <view class="patient-list">
          <view
            v-for="(patient, index) in patientList"
            :key="index"
            class="patient-card"
            :class="{ selected: selectedPatientIndex === index }"
            @click="selectPatient(index)"
          >
            <text class="patient-name">{{ patient.name }}</text>
            <text class="patient-info">{{ patient.gender }} | {{ patient.age }}岁</text>
            <view v-if="selectedPatientIndex === index" class="check-icon">✓</view>
          </view>
          <view class="patient-card add-patient" @click="addPatient">
            <text class="add-icon">+</text>
          </view>
        </view>
      </view>

      <!-- 医保卡信息 -->
      <view class="insurance-section">
        <text class="section-title">是否有医保卡:</text>
        <view class="insurance-buttons">
          <view
            class="insurance-btn"
            :class="{ active: hasInsurance }"
            @click="setInsurance(true)"
          >
            <text>是</text>
          </view>
          <view
            class="insurance-btn"
            :class="{ active: !hasInsurance }"
            @click="setInsurance(false)"
          >
            <text>否</text>
          </view>
        </view>
        <view v-if="hasInsurance" class="insurance-input-wrapper">
          <input
            class="insurance-input"
            type="text"
            v-model="insuranceCardNumber"
            placeholder="医保卡号"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>

      <!-- 手机号和验证码 -->
      <view class="contact-section">
        <view class="contact-row">
          <text class="contact-label">就诊人手机:</text>
          <input
            class="phone-input"
            type="number"
            v-model="phoneNumber"
            placeholder="请输入手机号"
            placeholder-class="input-placeholder"
            maxlength="11"
          />
        </view>
      </view>
    </scroll-view>

    <!-- 立即预约按钮 -->
    <view class="bottom-bar">
      <view class="bottom-price">
        <text class="price-label">医事服务费</text>
        <text class="price-amount">¥{{ appointmentInfo.fee }}</text>
      </view>
      <button class="book-btn" @click="submitAppointment">立即预约并支付</button>
    </view>

    <!-- 右下角悬浮按钮 -->
    <view class="float-btn" @click="onFloatClick">
      <text class="float-icon">☀️</text>
    </view>
  </view>
</template>

<script>
import { saveAppointment } from '@/utils/appointmentStorage.js';
import { getPatients, getDefaultPatient } from '@/utils/patientStorage.js';
import { request } from '@/utils/request.js';

export default {
  data() {
    return {
      doctorInfo: {},
      appointmentInfo: {
        hospital: '北京协和医院',
        dept: '神经内科',
        date: '2020年05月05日',
        time: '周四下午',
        type: '专家门诊',
        fee: 318
      },
      selectedPatientIndex: 0,
      patientList: [],
      hasInsurance: true,
      insuranceCardNumber: '',
      phoneNumber: '',
      verifyCode: '',
      codeCountdown: 0
    };
  },
  computed: {
    selectedPatient() {
      return this.patientList[this.selectedPatientIndex] || {};
    }
  },
  onLoad(options) {
    // 接收传递的医生信息和预约信息
    if (options.doctor) {
      try {
        this.doctorInfo = JSON.parse(decodeURIComponent(options.doctor));
      } catch (e) {
        console.error('解析医生信息失败', e);
        this.initDefaultDoctor();
      }
    } else {
      this.initDefaultDoctor();
    }

    // 接收预约时间段信息
    if (options.date && options.time) {
      this.appointmentInfo.date = decodeURIComponent(options.date);
      this.appointmentInfo.time = decodeURIComponent(options.time);
    }
    if (options.hospital) {
      this.appointmentInfo.hospital = decodeURIComponent(options.hospital);
    }
    if (options.dept) {
      this.appointmentInfo.dept = decodeURIComponent(options.dept);
    }
    if (options.type) {
      this.appointmentInfo.type = decodeURIComponent(options.type);
    }
    if (options.fee) {
      this.appointmentInfo.fee = parseInt(decodeURIComponent(options.fee)) || 318;
    }
    
    // 加载就诊人列表
    this.loadPatients();
  },
  onShow() {
    // 页面显示时重新加载就诊人列表（用于从添加页面返回时刷新）
    this.loadPatients();
    // 监听就诊人更新事件
    uni.$on('patientUpdated', this.loadPatients);
  },
  onHide() {
    // 取消监听
    uni.$off('patientUpdated', this.loadPatients);
  },
  methods: {
    initDefaultDoctor() {
      this.doctorInfo = {
        name: '王医生',
        level: '主任医师',
        hospital: '北京协和医院',
        title: '博士生导师',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg'
      };
    },
    loadPatients() {
      try {
        const patients = getPatients();
        if (patients && patients.length > 0) {
          // 从存储中加载就诊人
          this.patientList = patients.map(p => ({
            id: p.id,
            name: p.name,
            gender: p.gender,
            age: p.age,
            phone: p.phone || ''
          }));
          
          // 设置默认选中的就诊人
          const defaultPatient = getDefaultPatient();
          if (defaultPatient) {
            const defaultIndex = this.patientList.findIndex(p => p.id === defaultPatient.id);
            if (defaultIndex >= 0) {
              this.selectedPatientIndex = defaultIndex;
            } else {
              this.selectedPatientIndex = 0;
            }
          } else {
            this.selectedPatientIndex = 0;
          }
        } else {
          // 如果没有存储的就诊人，显示空列表
          this.patientList = [];
          this.selectedPatientIndex = -1;
        }
      } catch (e) {
        console.error('加载就诊人列表失败:', e);
        // 加载失败时显示空列表
        this.patientList = [];
        this.selectedPatientIndex = -1;
      }
    },
    selectPatient(index) {
      this.selectedPatientIndex = index;
      // 选择就诊人时，如果就诊人有手机号，自动填充（但用户可以修改）
      const selectedPatient = this.patientList[index];
      if (selectedPatient && selectedPatient.phone) {
        this.phoneNumber = selectedPatient.phone;
      }
    },
    addPatient() {
      uni.navigateTo({
        url: '/pages/mine/patient-edit',
        success: () => {
          // 页面跳转成功
        },
        fail: (err) => {
          console.error('跳转到添加就诊人页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    },
    setInsurance(hasInsurance) {
      this.hasInsurance = hasInsurance;
      if (!hasInsurance) {
        this.insuranceCardNumber = '';
      }
    },
    async sendVerifyCode() {
      // 防止重复点击
      if (this.codeCountdown > 0) {
        return;
      }
      
      // 验证手机号格式
      if (!this.phoneNumber) {
        uni.showToast({
          title: '请输入手机号',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(this.phoneNumber)) {
        uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      try {
        console.log('📤 开始发送验证码，手机号:', this.phoneNumber);
        
        const res = await request({
          url: '/auth/send-code',
          method: 'POST',
          data: {
            phone: this.phoneNumber,
            type: 'appointment' // 预约类型
          },
          needAuth: false,
          showError: false // 手动处理错误提示
        });
        
        console.log('📥 收到响应:', res);
        
        if (res && res.success) {
          uni.showToast({
            title: res.message || '验证码已发送',
            icon: 'success',
            duration: 2000
          });
          
          // 开始倒计时
          this.codeCountdown = 60;
          const timer = setInterval(() => {
            this.codeCountdown--;
            if (this.codeCountdown <= 0) {
              clearInterval(timer);
            }
          }, 1000);
          
          // 开发环境显示验证码（方便测试）
          if (res.code) {
            console.log('✅ 验证码（仅开发环境）:', res.code);
            setTimeout(() => {
              uni.showModal({
                title: '验证码（开发环境）',
                content: `验证码：${res.code}`,
                showCancel: false
              });
            }, 500);
          }
        } else {
          const errorMsg = res?.message || res?.error || '发送失败，请重试';
          console.error('❌ 发送失败:', errorMsg);
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        }
      } catch (error) {
        console.error('❌ 发送验证码异常:', error);
        console.error('错误详情:', JSON.stringify(error));
        
        let errorMsg = '发送失败，请检查网络连接';
        
        if (error.message) {
          errorMsg = error.message;
        } else if (error.errMsg) {
          if (error.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请检查网络连接';
          } else if (error.errMsg.includes('fail')) {
            errorMsg = '网络请求失败，请检查后端服务是否运行（http://localhost:3000）';
          } else {
            errorMsg = error.errMsg;
          }
        } else if (typeof error === 'string') {
          errorMsg = error;
        } else if (error.response) {
          errorMsg = error.response.data?.message || error.response.data?.error || '服务器错误';
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    },
    async submitAppointment() {
      // 验证必填项
      if (!this.selectedPatient.name) {
        uni.showToast({ title: '请选择就诊人', icon: 'none' });
        return;
      }
      if (!this.phoneNumber) {
        uni.showToast({ title: '请输入手机号', icon: 'none' });
        return;
      }
      const phoneReg = /^1[3-9]\d{9}$/;
      if (!phoneReg.test(this.phoneNumber)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
        return;
      }
      if (this.hasInsurance && !this.insuranceCardNumber) {
        uni.showToast({ title: '请输入医保卡号', icon: 'none' });
        return;
      }

      try {
        uni.showLoading({ title: '正在创建预约...' });

        // 1. 调用后端API创建预约（状态为 pendingPayment）
        const appointmentData = {
          doctorName: this.doctorInfo.name || '王医生',
          doctorId: this.doctorInfo.id || this.doctorInfo._id || `doc_${Date.now()}`,
          doctorAvatar: this.doctorInfo.avatar || '',
          doctorExpertise: this.doctorInfo.goodAt || this.doctorInfo.expertise || '专业领域',
          hospital: this.appointmentInfo.hospital || '北京协和医院',
          department: this.appointmentInfo.dept || '神经内科',
          appointmentType: this.appointmentInfo.type || '专家门诊',
          patientName: this.selectedPatient.name,
          patientGender: this.selectedPatient.gender,
          patientAge: this.selectedPatient.age,
          patientPhone: this.phoneNumber,
          hasInsurance: this.hasInsurance,
          insuranceCardNumber: this.insuranceCardNumber || '',
          date: this.appointmentInfo.date,
          time: this.appointmentInfo.time,
          price: this.appointmentInfo.fee || 318,
          status: 'pendingPayment'
        };

        const createRes = await request({
          url: '/appointment',
          method: 'POST',
          data: appointmentData,
          showLoading: false,
          showError: false
        });

        if (!createRes || !createRes.success) {
          throw new Error(createRes?.message || '创建预约失败');
        }

        const appointment = createRes.data;
        const appointmentId = appointment._id || appointment.id;
        console.log('✅ 预约已创建，ID:', appointmentId);

        // 同时保存到本地存储（离线可查看）
        saveAppointment({
          ...appointmentData,
          id: appointmentId,
          status: 'pendingVisit'
        });

        uni.hideLoading();
        uni.showToast({ title: '预约成功', icon: 'success' });
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/mine/appointments?type=pendingVisit' });
        }, 1500);

      } catch (error) {
        uni.hideLoading();
        console.error('❌ 预约失败:', error);
        uni.showToast({
          title: error.message || '预约失败，请重试',
          icon: 'none',
          duration: 3000
        });
      }
    },
    onFloatClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6fa;
}

.content {
  flex: 1;
  padding: 24rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.doctor-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  flex-direction: row;
  display: flex;
  margin-bottom: 24rpx;
}

.doctor-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 24rpx;
}

.doctor-info {
  flex: 1;
}

.doctor-name-row {
  flex-direction: row;
  display: flex;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.doctor-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-right: 16rpx;
}

.doctor-level {
  font-size: 24rpx;
  color: #666666;
}

.doctor-hospital {
  font-size: 24rpx;
  color: #999999;
}

.appointment-details {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.detail-row {
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 28rpx;
  color: #666666;
}

.detail-value {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.detail-value.price {
  color: #ff5722;
  font-weight: 600;
}

.appointment-notes {
  background-color: #f8f9fa;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.notes-header {
  flex-direction: row;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.info-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 20rpx;
  background-color: #ff9800;
  color: #ffffff;
  font-size: 24rpx;
  align-items: center;
  justify-content: center;
  display: flex;
  margin-right: 12rpx;
}

.notes-title {
  font-size: 28rpx;
  color: #333333;
  font-weight: 600;
  margin-right: 8rpx;
}

.notes-subtitle {
  font-size: 22rpx;
  color: #999999;
}

.notes-list {
  padding-left: 52rpx;
}

.note-item {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.8;
  display: block;
  margin-bottom: 12rpx;
}

.patient-section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  color: #333333;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
}

.patient-list {
  flex-direction: row;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 0;
  padding: 0;
}

.patient-card {
  width: 200rpx;
  height: 140rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
  padding: 20rpx;
  position: relative;
  flex-direction: column;
  display: flex;
}

.patient-card.selected {
  border-color: #2979ff;
  background-color: #f0f7ff;
}

.patient-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8rpx;
}

.patient-info {
  font-size: 24rpx;
  color: #999999;
}

.check-icon {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background-color: #2979ff;
  color: #ffffff;
  font-size: 20rpx;
  align-items: center;
  justify-content: center;
  display: flex;
}

.add-patient {
  align-items: center;
  justify-content: center;
  border-style: dashed;
}

.add-icon {
  font-size: 60rpx;
  color: #c0c4cc;
}

.insurance-section {
  margin-bottom: 24rpx;
}

.insurance-buttons {
  flex-direction: row;
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.insurance-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 8rpx;
  border: 2rpx solid #e0e0e0;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  display: flex;
}

.insurance-btn.active {
  border-color: #2979ff;
  background-color: #e6f0ff;
}

.insurance-btn.active text {
  color: #2979ff;
  font-weight: 600;
}

.insurance-btn text {
  font-size: 28rpx;
  color: #666666;
}

.insurance-input-wrapper {
  margin-top: 16rpx;
}

.insurance-input {
  width: 100%;
  height: 72rpx;
  background-color: #ffffff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.contact-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.contact-row {
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.contact-label {
  font-size: 28rpx;
  color: #666666;
  min-width: 160rpx;
}

.phone-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
  text-align: right;
  padding: 0 10rpx;
  height: 60rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.contact-value {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.verify-row {
  flex-direction: row;
  display: flex;
  gap: 16rpx;
}

.verify-input {
  flex: 1;
  height: 72rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.send-code-btn {
  width: 200rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 24rpx;
  padding: 0;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.send-code-btn::after {
  border: none;
}

.send-code-btn[disabled] {
  opacity: 0.5;
  background: #c7c7cc;
}

.input-placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.bottom-price {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 160rpx;
}

.price-label {
  font-size: 24rpx;
  color: #999;
}

.price-amount {
  font-size: 36rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.book-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #2979ff;
  color: #ffffff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.book-btn::after {
  border: none;
}

.float-btn {
  position: fixed;
  right: 40rpx;
  bottom: 140rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background-color: #ffb84d;
  align-items: center;
  justify-content: center;
  display: flex;
  box-shadow: 0 8rpx 20rpx rgba(255, 170, 51, 0.5);
}

.float-icon {
  font-size: 40rpx;
}
</style>

