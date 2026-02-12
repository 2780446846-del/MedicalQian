<template>
  <view class="mine-page min-h-screen pb-[60rpx]">
    <view class="header bg-gradient-to-b from-[#4a90e2] to-[#287adf] px-[28rpx] pt-[32rpx] pb-[32rpx]">
      <view class="user-row flex items-center justify-between" @click="goSettings">
        <view class="avatar w-[84rpx] h-[84rpx] rounded-full bg-white flex items-center justify-center overflow-hidden">
          <image :src="avatarUrl || defaultAvatar" mode="aspectFill" class="avatar-img w-full h-full" />
        </view>
        <view class="user-info flex-1 ml-[20rpx] text-white">
          <view class="phone text-[32rpx] font-bold">{{ displayName }}</view>
          <view class="role-tag inline-flex items-center justify-center mt-[6rpx] px-[14rpx] py-[6rpx] rounded-full text-[22rpx]" :class="authStatus === '已认证' ? 'bg-[#4caf50]/30' : 'bg-white/20'">{{ roleLabel }}</view>
        </view>
        <view class="actions flex gap-[18rpx]">
          <view class="action-icon flex items-center justify-center" @click="goSettings">
            <uni-icons type="gear" size="26" color="#ffffff"></uni-icons>
          </view>
        </view>
      </view>

      <view class="vip-card mt-[20rpx] bg-gradient-to-r from-[#f8d06b] to-[#dcb14a] rounded-[12rpx] px-[20rpx] py-[18rpx] flex items-center justify-between shadow-md">
        <view class="vip-left text-[#5a3b05]">
          <view class="vip-title font-bold text-[26rpx]">健康VIP会员</view>
          <view class="vip-sub mt-[6rpx] text-[20rpx]">王静静大一号家庭管理 提供 免费专家问诊</view>
        </view>
        <view class="vip-btn px-[24rpx] py-[12rpx] bg-[#0070c0] text-white rounded-[16rpx] text-[22rpx] shadow" @click="goVip">立即领取</view>
      </view>
    </view>

    <view class="section rounded-[8rpx] mx-[16rpx] my-[12rpx] px-[14rpx] pt-[18rpx] pb-[10rpx] shadow">
      <view class="section-header flex items-center justify-between mb-[10rpx] px-[4rpx]">
        <view class="section-title text-[28rpx] font-bold">我的预约</view>
        <view class="section-link text-[22rpx]" @click="goAppointments('all')">查看全部</view>
      </view>
      <view class="status-grid grid grid-cols-4 gap-[6rpx]">
        <view class="status-item flex flex-col items-center relative py-[16rpx]" @click="goAppointments('pendingVisit')">
          <view v-if="pendingVisitCount > 0" class="badge absolute top-[4rpx] left-[38rpx] min-w-[26rpx] h-[26rpx] px-[8rpx] rounded-full bg-[#e74c3c] text-white text-[18rpx] leading-[26rpx] text-center">{{ pendingVisitCount > 99 ? '99+' : pendingVisitCount }}</view>
          <uni-icons type="plusempty" size="30" :color="theme.primaryColor"></uni-icons>
          <view class="status-text text-[22rpx] mt-[6rpx]">待就诊</view>
        </view>
        <view class="status-item flex flex-col items-center relative py-[16rpx]" @click="goAppointments('pendingRate')">
          <uni-icons type="checkbox" size="30" :color="theme.primaryColor"></uni-icons>
          <view class="status-text text-[22rpx] mt-[6rpx]">待评价</view>
        </view>
        <view class="status-item flex flex-col items-center relative py-[16rpx]" @click="goAppointments('rated')">
          <uni-icons type="compose" size="30" :color="theme.primaryColor"></uni-icons>
          <view class="status-text text-[22rpx] mt-[6rpx]">已评价</view>
        </view>
        <view class="status-item flex flex-col items-center relative py-[16rpx]" @click="goAppointments('history')">
          <uni-icons type="calendar" size="30" :color="theme.primaryColor"></uni-icons>
          <view class="status-text text-[22rpx] mt-[6rpx]">历史</view>
        </view>
      </view>
    </view>

    <view class="list-card rounded-[10rpx] mx-[16rpx] mb-[10rpx] shadow">
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goPatients">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="person" size="22" :color="theme.primaryColor"></uni-icons>
          <text>我的就诊人</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goConsultations">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="chatboxes" size="22" :color="theme.primaryColor"></uni-icons>
          <text>我的咨询</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goFavorites">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="heart" size="22" :color="theme.primaryColor"></uni-icons>
          <text>我的收藏</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goDoctorCert">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="auth" size="22" :color="theme.primaryColor"></uni-icons>
          <text>医师认证</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goMessages">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="chatbubble" size="22" :color="theme.primaryColor"></uni-icons>
          <text>我的消息</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
      <view class="list-item flex items-center justify-between px-[16rpx] py-[18rpx]" @click="goHelp">
        <view class="left flex items-center gap-[14rpx] text-[26rpx]">
          <uni-icons type="help" size="22" :color="theme.primaryColor"></uni-icons>
          <text>帮助中心</text>
        </view>
        <uni-icons type="arrowright" size="18" :color="theme.textColorTertiary"></uni-icons>
      </view>
    </view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getPendingVisitCount } from '@/utils/appointmentStorage.js';
import { get } from '@/utils/api.js';

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      defaultAvatar: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
      avatarUrl: '',
      nickname: '',
      username: '',
      phone: '158****1234',
      theme: getCurrentTheme(),
      pendingVisitCount: 0,
      authStatus: '未认证'
    };
  },
  computed: {
    displayPhone() {
      return this.phone ? this.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定';
    },
    // 在“我的”页面优先显示用户名，其次显示已绑定的手机号
    displayName() {
      if (this.username) {
        return this.username;
      }
      if (this.phone) {
        return this.displayPhone;
      }
      return '未登录';
    },
    roleLabel() {
      return this.authStatus === '已认证' ? '认证医师' : '普通用户';
    }
  },
  onShow() {
    let profile = {};
    let userInfo = {};

    const app = getApp && getApp();

    try {
      // 当前登录用户信息
      userInfo = (app && app.globalData && app.globalData.userInfo) || uni.getStorageSync('userInfo') || {};

      const userId =
        (userInfo && (userInfo.id || userInfo._id || userInfo.userId || userInfo.username)) ||
        uni.getStorageSync('currentUserId') ||
        null;

      // 按用户ID读取资料
      const allProfiles = uni.getStorageSync('userProfilesById') || {};
      if (userId && allProfiles[userId]) {
        profile = allProfiles[userId];
      } else {
        // 兼容旧逻辑：读取单一 userProfile
        const cachedProfile = uni.getStorageSync('userProfile');
        if (cachedProfile && Object.keys(cachedProfile).length > 0) {
          profile = cachedProfile;
        } else if (app && app.globalData && app.globalData.userProfile) {
          profile = app.globalData.userProfile;
        }
      }
    } catch (e) {
      profile = {};
      userInfo = {};
    }

    this.avatarUrl = profile.avatarUrl || this.defaultAvatar;
    // 优先使用登录返回的 username 作为昵称与展示名称
    this.username = userInfo.username || this.username;
    this.nickname = profile.nickname || userInfo.username || this.nickname;
    this.phone = profile.phone || this.phone;
    this.authStatus = userInfo.authStatus || '未认证';
    
    // 从服务器获取最新用户信息（含认证状态）
    this.fetchUserInfo();
    
    // 更新待就诊数量
    this.updatePendingVisitCount();
    
    // 监听主题变更
    uni.$on('themeChange', this.updateTheme);
    this.updateTheme();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
  },
  methods: {
    async fetchUserInfo() {
      const token = uni.getStorageSync('token');
      if (!token) return;
      try {
        const res = await get('/auth/me');
        if (res && res.success && res.user) {
          const user = res.user;
          this.authStatus = user.authStatus || '未认证';
          // 同步到本地缓存
          const stored = uni.getStorageSync('userInfo') || {};
          stored.authStatus = user.authStatus || '未认证';
          uni.setStorageSync('userInfo', stored);
        }
      } catch (e) {
        // 静默失败，使用本地缓存值
      }
    },
    goVip() {
      uni.showToast({ title: '即将开通VIP', icon: 'none' });
    },
    goAppointments(type) {
      uni.navigateTo({ url: `/pages/mine/appointments?type=${type}` });
    },
    goPatients() {
      uni.navigateTo({ url: '/pages/mine/patients' });
    },
    goConsultations() {
      uni.navigateTo({ url: '/pages/mine/consultations' });
    },
    goFavorites() {
      uni.navigateTo({ url: '/pages/mine/favorites' });
    },
    goMessages() {
      uni.navigateTo({ url: '/pages/mine/messages' });
    },
    goDoctorCert() {
      uni.navigateTo({ url: '/pages/mine/doctor-cert' });
    },
    goHelp() {
      uni.navigateTo({ url: '/pages/mine/help' });
    },
    goSettings() {
      uni.navigateTo({ url: '/pages/settings/settings' });
    },
    openService() {
      uni.showToast({ title: '联系客服', icon: 'none' });
    },
    updateTheme(theme) {
      try {
        this.theme = theme || getCurrentTheme();
        // 使用 $nextTick 确保在下一个渲染周期更新
        this.$nextTick(() => {
          // 仅在必要时强制更新
          if (this.$forceUpdate && typeof this.$forceUpdate === 'function') {
            this.$forceUpdate();
          }
        });
      } catch (e) {
        console.warn('主题更新失败:', e);
        // 即使出错也更新主题数据
        this.theme = getCurrentTheme();
      }
    },
    updatePendingVisitCount() {
      try {
        this.pendingVisitCount = getPendingVisitCount();
      } catch (error) {
        console.error('获取待就诊数量失败:', error);
        this.pendingVisitCount = 0;
      }
    }
  }
};
</script>

<style lang="scss">
.mine-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: 60rpx;
  transition: background-color 0.3s ease;
}

.header {
  background: linear-gradient(180deg, #4a90e2 0%, #287adf 100%);
  padding: 32rpx 28rpx 32rpx;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  box-shadow: none;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #fff;
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.user-info {
  flex: 1;
  margin-left: 20rpx;
  color: #fff;
}

.phone {
  font-size: 32rpx;
  font-weight: 700;
}

.role-tag {
  margin-top: 6rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  font-size: 22rpx;
}

.actions {
  display: flex;
  gap: 18rpx;
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vip-card {
  margin-top: 20rpx;
  background: linear-gradient(90deg, #f8d06b 0%, #dcb14a 100%);
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.08);
}

.vip-left {
  color: #5a3b05;
}

.vip-title {
  font-weight: 700;
  font-size: 26rpx;
}

.vip-sub {
  margin-top: 6rpx;
  font-size: 20rpx;
}

.vip-btn {
  padding: 12rpx 24rpx;
  background: #0070c0;
  color: #fff;
  border-radius: 16rpx;
  font-size: 22rpx;
  box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.1);
}

.section {
  background-color: var(--card-bg);
  margin: 12rpx 16rpx 12rpx;
  border-radius: 8rpx;
  padding: 18rpx 14rpx 10rpx;
  box-shadow: 0 6rpx 14rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
  padding: 0 4rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.section-link {
  font-size: 22rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6rpx;
}

.status-item {
  background: transparent;
  border-radius: 0;
  padding: 16rpx 0 12rpx;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-item uni-icons {
  margin-bottom: 8rpx;
}

.badge {
  position: absolute;
  top: 4rpx;
  left: 38rpx;
  min-width: 26rpx;
  height: 26rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #e74c3c;
  color: #fff;
  font-size: 18rpx;
  text-align: center;
  line-height: 26rpx;
}

.status-text {
  font-size: 22rpx;
  color: var(--text-color-secondary);
  margin-top: 6rpx;
  transition: color 0.3s ease;
}

.list-card {
  background-color: var(--card-bg);
  margin: 0 16rpx 10rpx;
  border-radius: 10rpx;
  box-shadow: 0 6rpx 14rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.list-item {
  padding: 18rpx 16rpx;
  border-bottom: 1rpx solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.3s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  color: var(--text-color);
  font-size: 26rpx;
  transition: color 0.3s ease;
}

.floating-btn {
  position: fixed;
  right: 30rpx;
  bottom: 160rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fff7e6;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sun {
  font-size: 44rpx;
}
</style>
