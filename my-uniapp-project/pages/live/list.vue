<template>
  <view class="live-list-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <text class="nav-title">直播间列表</text>
        <view class="refresh-btn" @click="refreshList">
          <text class="refresh-icon" :class="{ rotating: isRefreshing }">🔄</text>
        </view>
      </view>
    </view>

    <!-- 直播列表 -->
    <scroll-view class="live-list" scroll-y refresher-enabled :refresher-triggered="isRefreshing" @refresherrefresh="onRefresh">
      <!-- 加载中 -->
      <view v-if="isLoading" class="loading-container">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="liveRooms.length === 0" class="empty-container">
        <text class="empty-icon">📺</text>
        <text class="empty-title">暂无直播</text>
        <text class="empty-desc">当前没有医生在线直播</text>
        <button class="refresh-empty-btn" @click="refreshList">刷新列表</button>
      </view>

      <!-- 直播间列表 -->
      <view v-else class="room-list">
        <view
          v-for="room in liveRooms"
          :key="room.roomId"
          class="room-card"
          @click="joinRoom(room)"
        >
          <!-- 封面图 -->
          <view class="room-cover">
            <image class="cover-image" src="/static/doctor/doctor.png" mode="aspectFill" />
            <view class="live-badge">
              <view class="pulse-dot"></view>
              <text class="badge-text">直播中</text>
            </view>
            <view class="viewer-count">
              <text class="count-icon">👥</text>
              <text class="count-text">{{ room.viewerCount }}</text>
            </view>
          </view>

          <!-- 直播信息 -->
          <view class="room-info">
            <view class="room-header">
              <image class="doctor-avatar" src="/static/doctor/doctor.png" mode="aspectFill" />
              <view class="doctor-info">
                <text class="doctor-name">{{ room.doctorName }}</text>
                <text class="live-time">{{ formatLiveTime(room.startTime) }}</text>
              </view>
            </view>
            <text class="room-title">{{ room.title }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部提示 -->
    <view class="bottom-tip">
      <text class="tip-text">共 {{ liveRooms.length }} 个直播间</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { API_BASE_URL } from '@/utils/config.js'

// 直播间列表
const liveRooms = ref<any[]>([])
const isLoading = ref(false)
const isRefreshing = ref(false)

// 定时刷新
let refreshTimer: any = null

// 获取直播间列表
const fetchLiveRooms = async () => {
  try {
    isLoading.value = true
    
    // 调用后端 API 获取直播间列表
    const response = await uni.request({
      url: `${API_BASE_URL}/webrtc/rooms`,
      method: 'GET'
    })
    
    if (response.statusCode === 200 && response.data) {
      const data = response.data as any
      if (data.success) {
        liveRooms.value = data.data || []
        console.log('✅ 获取直播间列表成功:', liveRooms.value.length)
      } else {
        console.error('❌ 获取直播间列表失败:', data.message)
      }
    }
  } catch (error) {
    console.error('❌ 请求失败:', error)
    uni.showToast({
      title: '获取列表失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

// 刷新列表
const refreshList = () => {
  isRefreshing.value = true
  fetchLiveRooms()
}

// 下拉刷新
const onRefresh = () => {
  refreshList()
}

// 加入直播间
const joinRoom = (room: any) => {
  console.log('加入直播间:', room.roomId)
  uni.navigateTo({
    url: `/pages/viewer/live?roomId=${room.roomId}`
  })
}

// 格式化直播时长
const formatLiveTime = (startTime: number) => {
  const now = Date.now()
  const elapsed = Math.floor((now - startTime) / 1000)
  
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  
  if (hours > 0) {
    return `直播中 ${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `直播中 ${minutes}分钟`
  } else {
    return '刚刚开始'
  }
}

// 启动定时刷新
const startAutoRefresh = () => {
  // 每10秒自动刷新一次
  refreshTimer = setInterval(() => {
    fetchLiveRooms()
  }, 10000)
}

// 停止定时刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  console.log('直播列表页面已加载')
  fetchLiveRooms()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style lang="scss" scoped>
.live-list-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  background: rgba(255, 255, 255, 0.95);
  padding: 20rpx 30rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.refresh-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
}

.refresh-icon {
  font-size: 32rpx;
  transition: transform 0.3s;
  
  &.rotating {
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.live-list {
  flex: 1;
  padding: 20rpx;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #fff;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40rpx;
}

.refresh-empty-btn {
  padding: 20rpx 60rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  
  &::after {
    border: none;
  }
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.room-card {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
  
  &:active {
    transform: scale(0.98);
  }
}

.room-cover {
  position: relative;
  width: 100%;
  height: 400rpx;
  background: #f5f5f5;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  border-radius: 20rpx;
}

.pulse-dot {
  width: 12rpx;
  height: 12rpx;
  background: #fff;
  border-radius: 50%;
  margin-right: 8rpx;
  animation: pulse 1.5s ease-in-out infinite;
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

.badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.viewer-count {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20rpx;
}

.count-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
}

.count-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

.room-info {
  padding: 24rpx;
}

.room-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.doctor-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.doctor-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
}

.live-time {
  font-size: 22rpx;
  color: #999;
}

.room-title {
  font-size: 30rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.bottom-tip {
  padding: 20rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
}

.tip-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>
