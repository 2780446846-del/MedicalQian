<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">文章详情</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 文章内容 -->
    <scroll-view class="article-content" scroll-y>
      <!-- 文章标题 -->
      <view class="article-header">
        <text class="article-title">{{ article.title }}</text>
        <text class="article-subtitle">{{ article.subtitle }}</text>
        <view class="article-meta">
          <text class="article-reads">{{ article.readCount }}阅读</text>
          <text class="article-date">{{ article.date }}</text>
        </view>
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

      <!-- 文章图片 -->
      <view class="article-image-section" v-if="article.image">
        <image :src="article.image" mode="widthFix" class="article-image"></image>
      </view>

      <!-- 文章正文 -->
      <view class="article-body">
        <text class="article-text">{{ article.content || '文章内容加载中...' }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      doctorInfo: {},
      article: {}
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

    // 接收传递的文章数据
    if (options.article) {
      try {
        this.article = JSON.parse(decodeURIComponent(options.article));
      } catch (e) {
        console.error('解析文章数据失败', e);
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
        title: '缺少文章数据',
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

/* 文章内容 */
.article-content {
  flex: 1;
  padding: 24rpx;
  padding-top: 100rpx;
}

.article-header {
  margin-bottom: 30rpx;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.article-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333333;
  line-height: 1.6;
  margin-bottom: 16rpx;
  display: block;
}

.article-subtitle {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: block;
}

.article-meta {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999999;
}

.article-reads,
.article-date {
  color: #999999;
}

/* 医生信息 */
.doctor-info-section {
  margin-bottom: 30rpx;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.doctor-info-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.doctor-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.doctor-name {
  font-size: 28rpx;
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

/* 文章图片 */
.article-image-section {
  margin-bottom: 30rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.article-image {
  width: 100%;
  display: block;
}

/* 文章正文 */
.article-body {
  padding: 30rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.article-text {
  font-size: 30rpx;
  color: #333333;
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

