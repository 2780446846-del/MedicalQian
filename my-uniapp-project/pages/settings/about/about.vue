<template>
  <view class="page">
    <view class="card">
      <view class="title">功能介绍</view>
      <view class="paragraph">
        参考抖音的轻量化信息流设计，我们提供预约挂号、在线咨询、就诊人管理、消息通知等核心能力，让医疗服务像刷短视频一样便捷。
      </view>
      <view class="paragraph">
        支持快速搜索医院/医生、消息即时提醒、订单评价与收藏，多端同步数据，保持登录状态下的持续体验。
      </view>
    </view>
  </view>
</template>

<script>
export default {};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f3f5fb;
  padding: 20rpx 18rpx 40rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 14rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.06);
  padding: 20rpx 22rpx;
  color: #333;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}

.paragraph {
  font-size: 26rpx;
  line-height: 1.6;
  color: #555;
  margin-bottom: 12rpx;
}
</style>
 