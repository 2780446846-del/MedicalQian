<template>
  <view class="page">
    <view class="card">
      <text class="title">帮助中心</text>
      <view class="placeholder">常见问题、客服方式将在这里展示</view>
    </view>
    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      theme: getCurrentTheme()
    };
  },
  onShow() {
    // 监听主题变更
    uni.$on('themeChange', this.updateTheme);
    this.updateTheme();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
  },
  methods: {
    updateTheme(theme) {
      try {
        this.theme = theme || getCurrentTheme();
      } catch (e) {
        console.warn('主题更新失败:', e);
        this.theme = getCurrentTheme();
      }
    }
  }
};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding: 30rpx;
  transition: background-color 0.3s ease;
}

.card {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 26rpx;
  box-shadow: 0 8rpx 20rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.placeholder {
  color: var(--text-color-tertiary);
  font-size: 26rpx;
  transition: color 0.3s ease;
}
</style>

