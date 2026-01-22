<template>
  <view class="page">
    <view class="card">
      <view class="title">法律声明</view>
      <view class="paragraph">
        本应用遵循抖音平台惯例，尊重并保护用户的合法权益。用户不得利用本应用从事侵权、违法、违禁内容的传播。若发现违规内容，我们将配合平台进行处理。
      </view>
      <view class="paragraph">
        所有展示的素材、文字、接口数据均仅供个人使用，不得未经授权用于商业用途。如需商业合作，请先取得书面许可。
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

