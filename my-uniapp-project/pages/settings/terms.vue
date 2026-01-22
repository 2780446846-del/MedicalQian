<template>
  <view class="page">
    <view class="card">
      <view class="title">用户服务协议</view>
      <view class="paragraph">
        1. 账号与安全：请使用本人手机号/第三方账号登录，账号仅限本人使用，妥善保管密码与验证码，发现异常及时修改或注销。
      </view>
      <view class="paragraph">
        2. 内容规范：发布咨询、评价或留言应遵守平台规则，不得含有违法、侵权、虚假或不当信息。参考抖音社区公约保持友善交流。
      </view>
      <view class="paragraph">
        3. 服务与费用：部分增值功能可能收取费用，具体以页面展示或订单说明为准。提交前请仔细确认。
      </view>
      <view class="paragraph">
        4. 数据与隐私：我们依据隐私政策收集和使用必要数据，用于提供医疗咨询、预约等核心功能，未经授权不会向无关方披露。
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

