<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">患者评价</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 医生信息 -->
    <view class="doctor-info-section" v-if="!isHospital && doctorInfo.name">
      <view class="doctor-info-card">
        <image class="doctor-avatar" :src="doctorInfo.avatar" mode="aspectFill" />
        <view class="doctor-info">
          <text class="doctor-name">{{ doctorInfo.name }}</text>
          <text class="doctor-level">{{ doctorInfo.level }}</text>
          <text class="doctor-hospital">{{ doctorInfo.hospital }}</text>
        </view>
      </view>
    </view>
    
    <!-- 医院信息 -->
    <view class="doctor-info-section" v-if="isHospital && hospitalInfo.name">
      <view class="doctor-info-card">
        <view class="hospital-icon-box">
          <text class="hospital-icon">🏥</text>
        </view>
        <view class="doctor-info">
          <text class="doctor-name">{{ hospitalInfo.name }}</text>
          <text class="doctor-level">{{ hospitalInfo.level || '' }}</text>
          <text class="doctor-hospital">{{ hospitalInfo.address || '' }}</text>
        </view>
      </view>
    </view>

    <!-- 评价统计 -->
    <view class="stats-section">
      <view class="rating-overview">
        <text class="rating-score">{{ averageRating.toFixed(1) }}</text>
        <view class="rating-stars">
          <text
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: i <= Math.round(averageRating) }"
          >★</text>
        </view>
        <text class="rating-count">{{ totalReviews }} 条评价</text>
      </view>
    </view>

    <!-- 评价列表 -->
    <scroll-view class="reviews-list" scroll-y>
      <view
        v-for="(review, index) in allReviews"
        :key="index"
        class="review-item"
      >
        <view class="review-header">
          <view class="reviewer-info">
            <text class="reviewer-name">{{ review.reviewer }}</text>
            <view class="review-meta">
              <text class="review-type">{{ review.type }}</text>
              <text class="review-dept">{{ review.department }}</text>
              <text class="review-date">{{ review.date }}</text>
            </view>
          </view>
          <view class="review-stars">
            <text
              v-for="i in 5"
              :key="i"
              class="star"
              :class="{ active: i <= review.rating }"
            >★</text>
          </view>
        </view>
        <text class="review-text">{{ review.comment }}</text>
      </view>

      <!-- 空状态 -->
      <view v-if="allReviews.length === 0" class="empty-state">
        <text class="empty-text">暂无评价</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      doctorInfo: {},
      hospitalInfo: {},
      allReviews: [],
      isHospital: false // 标识是医院评价还是医生评价
    };
  },
  computed: {
    totalReviews() {
      return this.allReviews.length;
    },
    averageRating() {
      if (this.allReviews.length === 0) return 0;
      const sum = this.allReviews.reduce((acc, review) => acc + review.rating, 0);
      return sum / this.allReviews.length;
    }
  },
  onLoad(options) {
    // 判断是医院评价还是医生评价
    if (options.hospital) {
      // 医院评价
      this.isHospital = true;
      try {
        this.hospitalInfo = JSON.parse(decodeURIComponent(options.hospital));
      } catch (e) {
        console.error('解析医院信息失败', e);
      }
      
      // 接收传递的评价数据
      if (options.comments) {
        try {
          // 将评论数据转换为评价格式
          const comments = JSON.parse(decodeURIComponent(options.comments));
          this.allReviews = comments.map(comment => ({
            rating: comment.rating,
            comment: comment.content,
            reviewer: comment.userName,
            type: '门诊挂号',
            department: comment.department,
            date: comment.date
          }));
        } catch (e) {
          console.error('解析评价数据失败', e);
          this.loadDefaultReviews();
        }
      } else {
        this.loadDefaultReviews();
      }
    } else if (options.doctor) {
      // 医生评价
      this.isHospital = false;
      try {
        this.doctorInfo = JSON.parse(decodeURIComponent(options.doctor));
      } catch (e) {
        console.error('解析医生信息失败', e);
      }

      // 接收传递的评价数据
      if (options.reviews) {
        try {
          this.allReviews = JSON.parse(decodeURIComponent(options.reviews));
        } catch (e) {
          console.error('解析评价数据失败', e);
          this.loadDefaultReviews();
        }
      } else {
        this.loadDefaultReviews();
      }
    } else {
      // 默认使用医生评价模式
      this.loadDefaultReviews();
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    loadDefaultReviews() {
      // 默认评价数据（与 detail.vue 中的保持一致）
      this.allReviews = [
        {
          rating: 5,
          comment: '医生很有耐心,不错不错,感谢',
          reviewer: '王先生',
          type: '门诊挂号',
          department: '神经内科',
          date: '2020-03-03'
        },
        {
          rating: 4,
          comment: '医生很有耐心,不错不错,感谢',
          reviewer: '王先生',
          type: '门诊挂号',
          department: '内分泌科',
          date: '2020-03-02'
        },
        {
          rating: 3,
          comment: '问诊速度有点快,希望能和医生沟通的更久',
          reviewer: '王先生',
          type: '互联网预约',
          department: '肿瘤科',
          date: '2020-03-02'
        },
        {
          rating: 5,
          comment: '在线看病很方便,药品药单直接邮寄到家很快',
          reviewer: '李女士',
          type: '互联网预约',
          department: '内分泌科',
          date: '2020-03-01'
        },
        {
          rating: 5,
          comment: '医生专业水平很高，诊断准确，用药合理',
          reviewer: '张先生',
          type: '门诊挂号',
          department: '神经内科',
          date: '2020-02-28'
        },
        {
          rating: 4,
          comment: '服务态度很好，就是等待时间有点长',
          reviewer: '刘女士',
          type: '门诊挂号',
          department: '内分泌科',
          date: '2020-02-25'
        },
        {
          rating: 5,
          comment: '非常满意，医生很细心，解释得很清楚',
          reviewer: '陈先生',
          type: '互联网预约',
          department: '肿瘤科',
          date: '2020-02-20'
        },
        {
          rating: 4,
          comment: '整体不错，就是挂号有点难',
          reviewer: '赵女士',
          type: '门诊挂号',
          department: '神经内科',
          date: '2020-02-18'
        }
      ];
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

.hospital-icon-box {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hospital-icon {
  font-size: 60rpx;
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

/* 评价统计 */
.stats-section {
  padding: 30rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.rating-overview {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.rating-score {
  font-size: 48rpx;
  font-weight: 600;
  color: #ff5722;
}

.rating-stars {
  display: flex;
  gap: 4rpx;
}

.rating-stars .star {
  font-size: 32rpx;
  color: #e0e0e0;
}

.rating-stars .star.active {
  color: #ffb300;
}

.rating-count {
  font-size: 24rpx;
  color: #999999;
  margin-left: auto;
}

/* 评价列表 */
.reviews-list {
  flex: 1;
  padding: 24rpx;
  padding-top: 0;
}

.review-item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.review-item:last-child {
  border-bottom: none;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.reviewer-info {
  flex: 1;
}

.reviewer-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8rpx;
  display: block;
}

.review-meta {
  display: flex;
  gap: 16rpx;
  font-size: 22rpx;
  color: #999999;
}

.review-type,
.review-dept,
.review-date {
  font-size: 22rpx;
  color: #999999;
}

.review-stars {
  display: flex;
  gap: 4rpx;
}

.review-stars .star {
  font-size: 24rpx;
  color: #e0e0e0;
}

.review-stars .star.active {
  color: #ffb300;
}

.review-text {
  font-size: 26rpx;
  color: #333333;
  line-height: 1.6;
  display: block;
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

