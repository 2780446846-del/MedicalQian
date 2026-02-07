<template>
  <view class="live-entrance-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
      <view class="circle circle-3"></view>
    </view>

    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">医生直播</text>
      <text class="subtitle">实时健康科普，在线互动答疑</text>
    </view>

    <!-- 选项卡片 -->
    <view class="options-container">
      <!-- 观看直播 -->
      <view class="option-card" @click="goToLiveList">
        <view class="card-icon">📺</view>
        <view class="card-content">
          <text class="card-title">观看直播</text>
          <text class="card-desc">观看医生直播，学习健康知识</text>
          <view class="card-badge" v-if="liveCount > 0">
            <view class="badge-dot"></view>
            <text class="badge-text">{{ liveCount }}个直播间</text>
          </view>
        </view>
        <view class="card-arrow">
          <text class="arrow-icon">→</text>
        </view>
      </view>

      <!-- 我要直播 -->
      <view class="option-card" @click="goToStartLive">
        <view class="card-icon">🎬</view>
        <view class="card-content">
          <text class="card-title">我要直播</text>
          <text class="card-desc">开启直播，分享健康知识</text>
          <view class="card-tag">
            <text class="tag-text">医生专用</text>
          </view>
        </view>
        <view class="card-arrow">
          <text class="arrow-icon">→</text>
        </view>
      </view>
    </view>

    <!-- 功能介绍 -->
    <view class="features">
      <view class="feature-item">
        <text class="feature-icon">✓</text>
        <text class="feature-text">实时视频直播</text>
      </view>
      <view class="feature-item">
        <text class="feature-icon">✓</text>
        <text class="feature-text">在线互动答疑</text>
      </view>
      <view class="feature-item">
        <text class="feature-icon">✓</text>
        <text class="feature-text">健康科普讲解</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

// 声明全局变量
declare const uni: any;
declare const plus: any;
declare function getCurrentPages(): any[];
declare function getApp(): any;

// 直播间数量
const liveCount = ref(0)

// 获取直播间数量
const fetchLiveCount = async () => {
  try {
    const res: any = await request({
      url: '/webrtc/rooms',
      method: 'GET',
      needAuth: false,
      showLoading: false,
      showError: false
    })

    if (res?.success && Array.isArray(res.data)) {
      liveCount.value = res.data.length
      console.log('当前直播间数量:', liveCount.value)
    } else {
      liveCount.value = 0
    }
  } catch (error) {
    console.error('获取直播间数量失败:', error)
    liveCount.value = 0
  }
}

// 观看直播 - 跳转到直播列表
const goToLiveList = () => {
  uni.navigateTo({
    url: '/pages/live/list'
  })
}

// 我要直播 - 跳转到医生直播页面
const goToStartLive = () => {
  uni.navigateTo({
    url: '/pages/doctor/live'
  })
}

onMounted(() => {
  fetchLiveCount()
})
</script>

<style lang="scss" scoped>
.live-entrance-container {
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx;
  position: relative;
  overflow: hidden;
}

// 背景装饰
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  
  .circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    
    &.circle-1 {
      width: 400rpx;
      height: 400rpx;
      top: -100rpx;
      right: -100rpx;
    }
    
    &.circle-2 {
      width: 300rpx;
      height: 300rpx;
      bottom: 100rpx;
      left: -80rpx;
    }
    
    &.circle-3 {
      width: 200rpx;
      height: 200rpx;
      top: 50%;
      right: 50rpx;
    }
  }
}

// 顶部标题
.header {
  text-align: center;
  margin-bottom: 80rpx;
  position: relative;
  z-index: 1;
  
  .title {
    display: block;
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 20rpx;
  }
  
  .subtitle {
    display: block;
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
  }
}

// 选项容器
.options-container {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  margin-bottom: 60rpx;
  position: relative;
  z-index: 1;
}

// 选项卡片
.option-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 40rpx;
  display: flex;
  align-items: center;
  gap: 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  }
  
  .card-icon {
    font-size: 80rpx;
    flex-shrink: 0;
  }
  
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    
    .card-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
    
    .card-desc {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
    }
    
    .card-badge {
      display: inline-flex;
      align-items: center;
      gap: 8rpx;
      padding: 6rpx 16rpx;
      background: linear-gradient(135deg, #ff4d4f, #ff7875);
      border-radius: 20rpx;
      align-self: flex-start;
      
      .badge-dot {
        width: 12rpx;
        height: 12rpx;
        background: #fff;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      .badge-text {
        font-size: 22rpx;
        color: #fff;
        font-weight: bold;
      }
    }
    
    .card-tag {
      display: inline-flex;
      padding: 6rpx 16rpx;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 20rpx;
      align-self: flex-start;
      
      .tag-text {
        font-size: 22rpx;
        color: #fff;
        font-weight: bold;
      }
    }
  }
  
  .card-arrow {
    flex-shrink: 0;
    
    .arrow-icon {
      font-size: 48rpx;
      color: #999;
      font-weight: bold;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

// 功能介绍
.features {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 40rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24rpx;
  backdrop-filter: blur(10rpx);
  position: relative;
  z-index: 1;
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    
    .feature-icon {
      width: 40rpx;
      height: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      font-size: 24rpx;
      color: #fff;
      font-weight: bold;
    }
    
    .feature-text {
      font-size: 28rpx;
      color: #fff;
    }
  }
}
</style>

