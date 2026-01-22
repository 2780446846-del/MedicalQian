<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">历史问诊</text>
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

    <!-- 问诊列表 -->
    <scroll-view class="consultation-list" scroll-y>
      <view
        v-for="(consultation, index) in allConsultations"
        :key="index"
        class="consultation-item"
        @click="viewConsultationDetail(consultation, index)"
      >
        <view class="consultation-header">
          <text class="patient-info">{{ consultation.patientInfo }}</text>
          <text class="consultation-date">{{ consultation.date }}</text>
        </view>
        <text class="consultation-question">{{ consultation.question }}</text>
        <text class="consultation-reply">{{ consultation.reply }}</text>
        <view class="consultation-actions">
          <button class="detail-btn" @click.stop="viewConsultationDetail(consultation, index)">查看问诊详情</button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="allConsultations.length === 0" class="empty-state">
        <text class="empty-text">暂无问诊记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      doctorInfo: {},
      allConsultations: []
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

    // 接收传递的问诊历史数据
    if (options.consultations) {
      try {
        this.allConsultations = JSON.parse(decodeURIComponent(options.consultations));
      } catch (e) {
        console.error('解析问诊历史数据失败', e);
        // 使用默认问诊历史数据
        this.loadDefaultConsultations();
      }
    } else {
      // 如果没有传递问诊历史数据，使用默认数据
      this.loadDefaultConsultations();
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    loadDefaultConsultations() {
      // 默认问诊历史数据（与 detail.vue 中的保持一致，并扩展更多）
      this.allConsultations = [
        {
          patientInfo: '男(31岁)',
          question: '甲状腺肿瘤:红肿疼痛如何缓解?',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullReply: '您好,根据您的症状描述,甲状腺肿瘤引起的红肿疼痛需要及时就医。建议您：1. 避免按压和摩擦患处；2. 保持局部清洁干燥；3. 尽快到医院进行专业检查；4. 根据医生建议进行相应治疗。如果疼痛剧烈，可以暂时使用冷敷缓解，但不要自行用药。',
          fullQuestion: '甲状腺肿瘤:红肿疼痛如何缓解?最近发现颈部有肿块，并且伴有红肿和疼痛感，不知道是什么原因，应该如何缓解症状？'
        },
        {
          patientInfo: '男(42岁)',
          question: '内分泌紊乱失眠应该如何调理',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullReply: '您好,内分泌紊乱导致的失眠需要综合调理。建议您：1. 规律作息，每天固定时间睡觉和起床；2. 睡前避免使用电子设备；3. 适当运动，但避免睡前剧烈运动；4. 饮食清淡，避免晚餐过饱；5. 可以尝试放松技巧如深呼吸、冥想；6. 如果症状严重，建议到医院进行内分泌检查，必要时在医生指导下用药。',
          fullQuestion: '内分泌紊乱失眠应该如何调理？最近工作压力大，经常失眠，白天精神不好，怀疑是内分泌问题，想知道如何调理？'
        },
        {
          patientInfo: '男(27岁)',
          question: '甲状腺肿瘤:红肿疼痛如何缓解?',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullReply: '您好,甲状腺肿瘤需要专业诊断和治疗。建议您尽快到医院进行甲状腺B超和甲状腺功能检查，以明确诊断。在等待检查期间，注意休息，避免过度劳累，保持情绪稳定。',
          fullQuestion: '甲状腺肿瘤:红肿疼痛如何缓解?最近发现颈部有肿块，并且伴有红肿和疼痛感，不知道是什么原因，应该如何缓解症状？'
        },
        {
          patientInfo: '男(42岁)',
          question: '内分泌紊乱失眠应该如何调理',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullReply: '您好,内分泌紊乱导致的失眠需要综合调理。建议您：1. 规律作息，每天固定时间睡觉和起床；2. 睡前避免使用电子设备；3. 适当运动，但避免睡前剧烈运动；4. 饮食清淡，避免晚餐过饱；5. 可以尝试放松技巧如深呼吸、冥想；6. 如果症状严重，建议到医院进行内分泌检查，必要时在医生指导下用药。',
          fullQuestion: '内分泌紊乱失眠应该如何调理？最近工作压力大，经常失眠，白天精神不好，怀疑是内分泌问题，想知道如何调理？'
        },
        {
          patientInfo: '女(35岁)',
          question: '月经不调需要做哪些检查？',
          reply: '[医生回复]您好,月经不调需要做以下检查...',
          date: '2020-03-01',
          fullReply: '您好,月经不调需要做以下检查：1. 妇科B超检查，了解子宫和附件情况；2. 性激素六项检查，了解内分泌水平；3. 甲状腺功能检查；4. 血常规检查。根据检查结果，医生会制定相应的治疗方案。',
          fullQuestion: '月经不调需要做哪些检查？最近几个月月经周期不规律，有时提前有时延后，想知道需要做哪些检查来确诊？'
        },
        {
          patientInfo: '男(50岁)',
          question: '糖尿病饮食注意事项',
          reply: '[医生回复]您好,糖尿病饮食需要注意...',
          date: '2020-02-28',
          fullReply: '您好,糖尿病饮食需要注意：1. 控制总热量摄入；2. 选择低GI食物；3. 定时定量进餐；4. 多吃蔬菜，适量水果；5. 限制糖分和精制食品；6. 适量优质蛋白质；7. 控制盐分摄入。建议咨询营养师制定个性化饮食方案。',
          fullQuestion: '糖尿病饮食注意事项？刚确诊糖尿病，想知道日常饮食应该注意什么，有哪些食物可以吃，哪些不能吃？'
        }
      ];
    },
    viewConsultationDetail(consultation, index) {
      // 跳转到问诊详情页面
      const consultationData = encodeURIComponent(JSON.stringify(consultation));
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      uni.navigateTo({
        url: `/pages/doctor/consultation-detail?consultation=${consultationData}&doctor=${doctorData}`,
        fail: (err) => {
          console.error('跳转到问诊详情页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
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

/* 问诊列表 */
.consultation-list {
  flex: 1;
  padding: 24rpx;
  padding-top: 0;
}

.consultation-item {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.consultation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.patient-info {
  font-size: 26rpx;
  color: #666666;
}

.consultation-date {
  font-size: 24rpx;
  color: #999999;
}

.consultation-question {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 12rpx;
  display: block;
  line-height: 1.5;
}

.consultation-reply {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: block;
}

.consultation-actions {
  display: flex;
  justify-content: flex-end;
}

.detail-btn {
  padding: 12rpx 32rpx;
  background-color: #4a90e2;
  color: #ffffff;
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.detail-btn::after {
  border: none;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}
</style>

