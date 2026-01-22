<template>
  <view class="container">
    <view class="title">埋点使用示例</view>
    
    <view class="section">
      <button @click="handleClick">点击事件埋点</button>
    </view>
    
    <view class="section">
      <button @click="handleSearch">搜索事件埋点</button>
    </view>
    
    <view class="section">
      <button @click="handleError">错误事件埋点</button>
    </view>
    
    <view class="section">
      <button @click="handlePerformance">性能事件埋点</button>
    </view>
  </view>
</template>

<script>
import { trackClick, trackEvent, trackError, trackPerformance } from '@/utils/tracker.js'

export default {
  onLoad() {
    // 页面加载时自动记录页面浏览（已在 tracker.js 中处理）
    // 如果需要额外参数，可以这样调用：
    // trackPageView('example_page', { pageId: '123' })
  },
  methods: {
    handleClick() {
      // 点击事件埋点
      trackClick('button_click', {
        buttonName: '示例按钮',
        location: 'example_page'
      })
      uni.showToast({
        title: '已记录点击事件',
        icon: 'success'
      })
    },
    handleSearch() {
      // 搜索事件埋点
      trackEvent('search', 'search', {
        keyword: '示例关键词',
        category: 'example'
      })
      uni.showToast({
        title: '已记录搜索事件',
        icon: 'success'
      })
    },
    handleError() {
      // 错误事件埋点（会立即发送）
      trackError('示例错误', {
        errorCode: 'EXAMPLE_ERROR',
        errorType: 'test'
      })
      uni.showToast({
        title: '已记录错误事件',
        icon: 'success'
      })
    },
    handlePerformance() {
      // 性能事件埋点
      const startTime = Date.now()
      // 模拟一些操作
      setTimeout(() => {
        const duration = Date.now() - startTime
        trackPerformance('page_load_time', duration, {
          pageName: 'example_page'
        })
        uni.showToast({
          title: `性能: ${duration}ms`,
          icon: 'success'
        })
      }, 1000)
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 20px;
}

button {
  width: 100%;
  padding: 15px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
}
</style>

