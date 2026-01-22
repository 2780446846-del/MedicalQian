<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">问诊详情</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 医生信息 -->
    <view class="doctor-info-section" v-if="doctorInfo.name">
      <view class="doctor-info-card">
        <image class="doctor-avatar" :src="doctorInfo.avatar" mode="aspectFill" />
        <view class="doctor-info">
          <text class="doctor-name">{{ doctorInfo.name }}</text>
          <text class="doctor-level">{{ doctorInfo.level }}</text>
          <text class="doctor-hospital">{{ doctorInfo.hospital }}</text>
        </view>
      </view>
    </view>

    <!-- 问诊详情内容 -->
    <scroll-view class="detail-content" scroll-y>
      <!-- 患者信息 -->
      <view class="detail-section">
        <view class="section-title">患者信息</view>
        <view class="section-content">
          <text class="patient-info">{{ consultation.patientInfo }}</text>
          <text class="consultation-date">{{ consultation.date }}</text>
        </view>
      </view>

      <!-- 患者问题 -->
      <view class="detail-section">
        <view class="section-title">患者问题</view>
        <view class="section-content">
          <text class="question-text">{{ consultation.fullQuestion || consultation.question }}</text>
        </view>
      </view>

      <!-- 医生回复 -->
      <view class="detail-section">
        <view class="section-title">医生回复</view>
        <view class="section-content">
          <text class="reply-text">{{ consultation.fullReply || consultation.reply }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      doctorInfo: {},
      consultation: {}
    };
  },
  onLoad(options) {
    // 接收传递的医生信息
    if (options.doctor) {
      try {
        this.doctorInfo = JSON.parse(decodeURIComponent(options.doctor));
      } catch (e) {
        console.error('解析医生信息失败', e);
      }
    }

    // 接收传递的问诊详情数据
    if (options.consultation) {
      try {
        this.consultation = JSON.parse(decodeURIComponent(options.consultation));
      } catch (e) {
        console.error('解析问诊详情数据失败', e);
        uni.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    } else {
      uni.showToast({
        title: '缺少问诊数据',
        icon: 'none'
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
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

/* 导航栏 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333333;
  font-weight: 300;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
}

/* 医生信息 */
.doctor-info-section {
  margin-top: 100rpx;
  padding: 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.doctor-info-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.doctor-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.doctor-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.doctor-level {
  font-size: 24rpx;
  color: #666666;
}

.doctor-hospital {
  font-size: 24rpx;
  color: #999999;
}

/* 详情内容 */
.detail-content {
  flex: 1;
  padding: 24rpx;
  padding-top: 0;
}

.detail-section {
  margin-bottom: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.patient-info {
  font-size: 28rpx;
  color: #666666;
}

.consultation-date {
  font-size: 24rpx;
  color: #999999;
}

.question-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.8;
  display: block;
}

.reply-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

