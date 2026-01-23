<template>
  <view class="callback-container">
    <view class="status-text">
      已关闭第三方登录功能，请回到登录页使用账号或验证码登录。
    </view>
  </view>
</template>

<script setup>
// 第三方登录功能已移除，此页面仅做提示占位
</script>

<style scoped>
.callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #4facfe 50%, #00f2fe 100%);
  padding: 40rpx;
}

.status-text {
  font-size: 32rpx;
  color: #ffffff;
  text-align: center;
  line-height: 1.6;
}
</style>
