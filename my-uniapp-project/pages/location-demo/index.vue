<template>
  <view class="container">
    <view class="header">
      <text class="title">位置与导航演示</text>
    </view>
    
    <view class="content">
      <!-- 获取位置按钮 -->
      <view class="section">
        <text class="section-title">1. 获取当前位置</text>
        <button class="primary-btn" @click="getCurrentLocation" :loading="gettingLocation">
          {{ gettingLocation ? '获取中...' : '获取当前位置' }}
        </button>
        
        <view v-if="currentLocation" class="location-info">
          <text class="info-label">当前位置坐标：</text>
          <text class="info-value">{{ currentLocation.latitude.toFixed(6) }}, {{ currentLocation.longitude.toFixed(6) }}</text>
        </view>
        
        <view v-if="locationError" class="error-info">
          <text class="error-text">{{ locationError }}</text>
        </view>
      </view>
      
      <!-- 目的地输入 -->
      <view class="section">
        <text class="section-title">2. 设置目的地</text>
        <view class="input-group">
          <view class="input-item">
            <text class="input-label">目的地名称：</text>
            <input 
              v-model="destinationName" 
              type="text" 
              placeholder="输入目的地名称" 
              class="input"
            />
          </view>
          <view class="input-item">
            <text class="input-label">纬度：</text>
            <input 
              v-model="destinationLat" 
              type="number" 
              placeholder="输入纬度" 
              class="input"
            />
          </view>
          <view class="input-item">
            <text class="input-label">经度：</text>
            <input 
              v-model="destinationLng" 
              type="number" 
              placeholder="输入经度" 
              class="input"
            />
          </view>
        </view>
        
        <button class="secondary-btn" @click="setDefaultDestination">
          使用默认目的地（北京天安门）
        </button>
      </view>
      
      <!-- 导航按钮 -->
      <view class="section">
        <text class="section-title">3. 开始导航</text>
        <view class="nav-buttons">
          <button 
            class="circular-nav-btn" 
            @click="showMapSelection" 
            :disabled="!canNavigate"
          >
            <uni-icons type="navigate" size="40" color="#fff"></uni-icons>
            <text class="nav-text">导航</text>
          </button>
        </view>
      </view>
      
      <!-- 日志信息 -->
      <view class="section" v-if="logs.length > 0">
        <text class="section-title">操作日志</text>
        <view class="logs">
          <view v-for="(log, index) in logs" :key="index" class="log-item">
            <text class="log-time">{{ log.time }}</text>
            <text class="log-content">{{ log.content }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, computed } from 'vue'
import { getUserLocation, openMapNavigation, LocationInfo } from '../../utils/location'

// 状态管理
const gettingLocation = ref(false)
const currentLocation = ref<LocationInfo | null>(null)
const locationError = ref('')
const logs = ref<{time: string, content: string}[]>([])

// 目的地信息
const destinationName = ref('')
const destinationLat = ref('')
const destinationLng = ref('')

// 计算属性：是否可以导航
const canNavigate = computed(() => {
  return destinationName.value && destinationLat.value && destinationLng.value
})

// 添加日志
const addLog = (content: string) => {
  const now = new Date()
  const timeStr = now.toLocaleTimeString()
  logs.value.unshift({ time: timeStr, content })
  // 限制日志数量
  if (logs.value.length > 10) {
    logs.value.pop()
  }
}

// 获取当前位置
const getCurrentLocation = async () => {
  gettingLocation.value = true
  locationError.value = ''
  
  try {
    addLog('开始获取当前位置...')
    const location = await getUserLocation()
    currentLocation.value = location
    addLog('获取位置成功')
  } catch (err) {
    locationError.value = err instanceof Error ? err.message : '获取位置失败'
    addLog(`获取位置失败：${locationError.value}`)
  } finally {
    gettingLocation.value = false
  }
}

// 设置默认目的地（北京天安门）
const setDefaultDestination = () => {
  destinationName.value = '北京天安门'
  destinationLat.value = '39.908718'
  destinationLng.value = '116.397491'
  addLog('已设置默认目的地：北京天安门')
}

// 显示地图选择菜单
const showMapSelection = () => {
  if (!canNavigate.value) return
  
  addLog('显示地图选择菜单')
  
  // 使用uni-app内置的showActionSheet API
  uni.showActionSheet({
    itemList: ['高德地图', '百度地图', '腾讯地图', '网页版路线'],
    itemColor: '#333333',
    success: (res) => {
      addLog(`用户选择了地图选项：${res.tapIndex}`)
      
      let mapType = ''
      switch (res.tapIndex) {
        case 0:
          mapType = 'gaode'
          break
        case 1:
          mapType = 'baidu'
          break
        case 2:
          mapType = 'qqmap'
          break
        case 3:
          mapType = 'web'
          break
      }
      
      navigateWithMap(mapType)
    },
    fail: (err) => {
      addLog(`地图选择失败：${err.errMsg}`)
    }
  })
}

// 使用指定地图导航
const navigateWithMap = (mapType: string) => {
  if (!canNavigate.value) return
  
  const destination: LocationInfo = {
    latitude: parseFloat(destinationLat.value),
    longitude: parseFloat(destinationLng.value),
    address: destinationName.value
  }
  
  addLog(`开始使用${mapType === 'gaode' ? '高德地图' : mapType === 'baidu' ? '百度地图' : mapType === 'qqmap' ? '腾讯地图' : '网页版'}导航到：${destinationName.value}`)
  
  if (mapType === 'web') {
    // 网页版使用auto，会显示选择菜单，用户可以选择网页版
    openMapNavigation(destination, {
      mapType: 'auto',
      mode: 'drive',
      destinationName: destinationName.value
    })
  } else {
    // 使用指定地图
    openMapNavigation(destination, {
      mapType: mapType as any,
      mode: 'drive',
      destinationName: destinationName.value
    })
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 20rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  padding: 20rpx 0;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.primary-btn {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: #fff;
  border: none;
  border-radius: 50rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(74, 144, 226, 0.4);
  transition: all 0.3s;
  
  &:active {
    transform: scale(0.95);
    box-shadow: 0 2rpx 8rpx rgba(74, 144, 226, 0.3);
  }
  
  &:disabled {
    background: #ccc;
    box-shadow: none;
    transform: none;
  }
}

.secondary-btn {
  background: #f5f5f5;
  color: #4a90e2;
  border: 2rpx solid #4a90e2;
  border-radius: 50rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  transition: all 0.3s;
  
  &:active {
    background: #e8f4fc;
  }
  
  &:disabled {
    background: #f5f5f5;
    color: #ccc;
    border-color: #ccc;
  }
}

.location-info {
  background: #e8f4fc;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.error-info {
  background: #fff1f0;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-top: 20rpx;
}

.info-label {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  word-break: break-all;
}

.error-text {
  font-size: 26rpx;
  color: #ff4d4f;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.input-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.input-label {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
}

.input {
  background: #f5f5f5;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
    background: #fff;
  }
}

.nav-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

// 圆形导航按钮样式
.circular-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 180rpx;
  height: 180rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(74, 144, 226, 0.4);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 16rpx rgba(74, 144, 226, 0.3);
  }
  
  &:disabled {
    background: #ccc;
    box-shadow: none;
    transform: none;
    opacity: 0.6;
  }
  
  .nav-text {
    margin-top: 8rpx;
  }
}

.logs {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
  
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.log-time {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
  width: 120rpx;
}

.log-content {
  font-size: 24rpx;
  color: #333;
  flex: 1;
  word-break: break-all;
}
</style>
