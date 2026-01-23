<template>
  <view class="page">
    <view class="card">
      <view class="title">隐私政策</view>
      <view class="paragraph">
        我们参考抖音的权限与信息最小化原则，仅收集提供预约、咨询、消息通知所需的数据，例如账号信息、设备标识、操作日志等，并用于安全风控与服务体验优化。
      </view>
      <view class="paragraph">
        位置、相册、相机、麦克风等敏感权限仅在用户授权且与功能相关时才会调用，可在系统或本页随时关闭。
      </view>
      <view class="paragraph">
        您可通过账号设置查看、导出或注销账号，注销后数据将按法规要求进行删除或匿名化处理。
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
    };
  },
  methods: {
  }
};
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
  margin-bottom: 20rpx;
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
