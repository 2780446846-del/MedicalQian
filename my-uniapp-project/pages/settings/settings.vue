<template>
  <view class="settings-page">
    <view class="logo-box">
      <view class="logo">Logo</view>
    </view>

    <view class="card">
      <view class="item" @click="go('/pages/settings/account/account')">
        <text>账号设置</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="go('/pages/settings/notification/notification')">
        <text>消息通知</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="go('/pages/settings/address/address')">
        <text>地址管理</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="clearCache">
        <text>清除本地缓存</text>
        <view class="right">
          <text class="cache">{{ cacheSize }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="item" @click="go('/pages/settings/about/about')">
        <text>功能介绍</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="go('/pages/settings/legal')">
        <text>法律声明</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="go('/pages/settings/terms')">
        <text>用户服务协议</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
      <view class="item" @click="go('/pages/settings/privacy')">
        <text>隐私</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
    </view>

    <view class="card single">
      <view class="item" @click="checkUpdate">
        <text>检查更新</text>
        <text class="version">版本号 {{ version }}</text>
      </view>
    </view>

    <view class="logout" @click="logout">退出登录</view>
  </view>
</template>

<script>
import { logout as ssoLogout, clearAuth } from '@/utils/auth.js';

export default {
  data() {
    return {
      cacheSize: '12.3M',
      version: '1.0.1'
    };
  },
  mounted() {
    this.calcCache();
  },
  methods: {
    go(url) {
      uni.navigateTo({ url });
    },
    async calcCache() {
      try {
        const info = await uni.getStorageInfo();
        const size = info.currentSize || 0;
        this.cacheSize = this.formatSize(size);
      } catch (e) {
        this.cacheSize = '12.3M';
      }
    },
    formatSize(kb) {
      const size = kb / 1024;
      if (size > 1) return `${size.toFixed(1)}M`;
      return `${kb.toFixed(1)}KB`;
    },
    clearCache() {
      uni.clearStorage({
        success: () => {
          this.cacheSize = '0KB';
          uni.showToast({ title: '缓存已清理', icon: 'none' });
        }
      });
    },
    checkUpdate() {
      uni.showToast({ title: '已是最新版本', icon: 'none' });
    },
    async logout() {
      uni.showModal({
        title: '提示',
        content: '确定退出登录吗？',
        success: async (res) => {
          if (res.confirm) {
            // 显示加载提示
            uni.showLoading({
              title: '退出中...',
              mask: true
            });
            
            try {
              // 调用统一的登出逻辑（会通知后端并清理 SSO token）
              await ssoLogout();
              console.log('✅ 退出登录成功');
            } catch (e) {
              console.error('退出登录失败:', e);
              // 如果调用失败，至少清理本地认证信息
              try {
                clearAuth && clearAuth();
              } catch (e2) {
                console.error('清理本地认证信息失败:', e2);
              }
            }

            // 隐藏加载提示
            uni.hideLoading();

            // 返回登录页，清空页面栈，避免返回到已登录页面
            setTimeout(() => {
              uni.reLaunch({
                url: '/pages/login/login',
                success: () => {
                  console.log('✅ 已跳转到登录页');
                },
                fail: (err) => {
                  console.error('跳转登录页失败:', err);
                  // 如果跳转失败，尝试使用 navigateTo
                  uni.navigateTo({
                    url: '/pages/login/login'
                  });
                }
              });
            }, 300);
          }
        }
      });
    }
  }
};
</script>

<style lang="scss">
.settings-page {
  min-height: 100vh;
  background: #f3f5fb;
  padding: 20rpx 18rpx 40rpx;
  box-sizing: border-box;
}

.logo-box {
  display: flex;
  justify-content: center;
  margin: 10rpx 0 22rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(180deg, #4a90e2 0%, #1f75e7 100%);
  color: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.12);
}

.card {
  background: #fff;
  border-radius: 14rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.06);
  padding: 0 10rpx;
  margin-bottom: 14rpx;
}

.card.single {
  padding: 0 10rpx;
}

.item {
  height: 86rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #f0f1f5;
  font-size: 28rpx;
  color: #333;
}

.card .item:last-child {
  border-bottom: none;
}

.right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cache {
  font-size: 24rpx;
  color: #a0a0a0;
}

.version {
  font-size: 24rpx;
  color: #c0c0c0;
}

.logout {
  margin: 26rpx 0 0;
  background: linear-gradient(180deg, #4a90e2 0%, #1f75e7 100%);
  color: #fff;
  text-align: center;
  height: 86rpx;
  line-height: 86rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.08);
}
</style>
 