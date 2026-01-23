<template>
  <view class="theme-toggle" :class="{ 'theme-toggle-dark': isDark }" @click="handleToggle">
    <view class="theme-icon" :class="{ 'theme-icon-dark': isDark }">
      <text class="icon-sun" v-if="!isDark">☀️</text>
      <text class="icon-moon" v-else>🌙</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { toggleTheme, getCurrentTheme } from '@/utils/theme.js';

const isDark = ref(false);

// 处理主题切换
const handleToggle = () => {
  const newTheme = toggleTheme();
  isDark.value = newTheme.name === 'dark';
  
  // 添加切换动画反馈
  if (uni.vibrateShort) {
    try {
      uni.vibrateShort();
    } catch (e) {
      // 忽略震动失败
    }
  }
};

// 更新主题状态
const updateTheme = () => {
  const theme = getCurrentTheme();
  isDark.value = theme.name === 'dark';
};

// 组件挂载时初始化主题
onMounted(() => {
  updateTheme();
  // 监听主题变更事件
  uni.$on('themeChange', updateTheme);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  uni.$off('themeChange', updateTheme);
});
</script>

<style lang="scss" scoped>
.theme-toggle {
  position: fixed;
  right: 30rpx;
  bottom: 200rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  box-shadow: 0 8rpx 24rpx rgba(255, 165, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.theme-toggle-dark {
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.5);
  }
}

.theme-icon {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  transition: transform 0.3s ease;
  
  .icon-sun,
  .icon-moon {
    display: block;
    line-height: 1;
  }
  
  &.theme-icon-dark {
    transform: rotate(180deg);
  }
}

/* 适配不同屏幕 */
@media screen and (max-width: 375px) {
  .theme-toggle {
    width: 80rpx;
    height: 80rpx;
    right: 20rpx;
    bottom: 180rpx;
  }
  
  .theme-icon {
    width: 50rpx;
    height: 50rpx;
    font-size: 32rpx;
  }
}
</style>

