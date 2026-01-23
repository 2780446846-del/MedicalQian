<template>
  <view class="page">
    <view class="card">
      <view class="item">
        <text>系统通知</text>
        <switch :checked="true" color="#4a90e2" />
      </view>
      <view class="item">
        <text>预约提醒</text>
        <switch :checked="true" color="#4a90e2" />
      </view>
      <view class="item">
        <text>咨询回复</text>
        <switch :checked="true" color="#4a90e2" />
      </view>
      <view class="item">
        <text>营销与优惠</text>
        <switch :checked="false" color="#4a90e2" />
      </view>
    </view>
    <view class="tip">提醒设置参考抖音消息订阅，可随时在系统通知中关闭。</view>
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
  padding: 0 10rpx;
}

.item {
  height: 86rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #f0f1f5;
  font-size: 28rpx;
  color: #333;
}

.card .item:last-child {
  border-bottom: none;
}

.tip {
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #8f95a3;
  line-height: 1.5;
}
</style>
 