<template>
  <view class="web-view-container">
    <view class="web-view-header">
      <view class="header-left" @click="navigateBack">
        <uni-icons type="left" size="24" color="#333"></uni-icons>
      </view>
      <view class="header-title">{{ title }}</view>
      <view class="header-right"></view>
    </view>
    <web-view :src="webUrl"></web-view>
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref } from 'vue';

const webUrl = ref('');
const title = ref('网页导航');

// 页面加载时执行
function onLoad(options: any) {
  if (options.url) {
    webUrl.value = decodeURIComponent(options.url);
  }
}

function navigateBack() {
  uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.web-view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.web-view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  height: 88rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);

  .header-left,
  .header-right {
    width: 80rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

web-view {
  flex: 1;
}
</style>
