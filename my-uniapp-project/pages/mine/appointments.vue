<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click.stop="goBack">
        <uni-icons type="left" size="20" :color="navIconColor"></uni-icons>
      </view>
      <text class="nav-title">我的预约</text>
      <view class="nav-right"></view>
    </view>

    <!-- 标签栏 -->
    <view class="tabs-container">
      <view 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-item" 
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-indicator"></view>
      </view>
    </view>

    <!-- 预约列表 -->
    <scroll-view class="appointment-list" scroll-y>
      <!-- 空状态 -->
      <view v-if="appointmentList.length === 0" class="empty-state">
        <text class="empty-text">暂无预约记录</text>
      </view>
      <!-- 预约卡片 -->
      <view 
        v-for="(item, index) in appointmentList" 
        :key="item.id || index"
        class="appointment-card"
      >
        <!-- 医生信息区域 -->
        <view class="doctor-info">
          <image 
            class="doctor-avatar" 
            :src="item.avatar" 
            mode="aspectFill"
          />
          <view class="doctor-details">
            <view class="doctor-name-row">
              <text class="doctor-name">{{ item.doctorName }}</text>
              <text class="doctor-title">{{ item.title }}</text>
            </view>
            <text class="hospital-name">{{ item.hospital }}</text>
            <text class="specialty">{{ item.specialty }}</text>
            <text class="expertise">擅长:{{ item.expertise }}</text>
          </view>
        </view>

        <!-- 状态标签 -->
        <view class="status-badge" :class="'status-' + item.status">
          <text class="status-text">{{ getStatusText(item.status) }}</text>
        </view>

        <!-- 底部信息 -->
        <view class="card-footer">
          <view class="patient-info">
            <text class="patient-text">就诊人:{{ item.patientName }} {{ item.date }} {{ item.time }}</text>
          </view>
          <view class="price-info">
            <text class="price-text">¥{{ item.price }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
// 导入本地存储工具
import { getAppointmentsByStatus, getAllAppointments as getLocalAllAppointments } from '@/utils/appointmentStorage.js';

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      activeTab: 'all',
      theme: getCurrentTheme(),
      tabs: [
        { key: 'all', label: '全部' },
        { key: 'pendingPayment', label: '待支付' },
        { key: 'pendingVisit', label: '待就诊' },
        { key: 'pendingRate', label: '待评价' },
        { key: 'rated', label: '已评价' },
        { key: 'history', label: '历史' }
      ],
      appointmentList: [],
    };
  },
  computed: {
    navIconColor() {
      // 暗色主题下导航栏是蓝色背景，图标应该是白色
      return this.theme.name === 'dark' ? '#ffffff' : this.theme.textColor;
    }
  },
  onLoad(query) {
    if (query && query.type) {
      this.activeTab = query.type;
    }
    // 加载预约数据
    this.loadAppointments();
  },
  onShow() {
    // 监听主题变更
    uni.$on('themeChange', this.updateTheme);
    this.updateTheme();
    // 每次显示时重新加载数据（可能在其他页面有新增预约）
    this.loadAppointments();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
  },
  methods: {
    goBack() {
      // 检查是否有上一页可以返回
      const pages = getCurrentPages();
      if (pages && pages.length > 1) {
        uni.navigateBack({
          delta: 1,
          fail: (err) => {
            // 如果返回失败，尝试跳转到我的页面
            console.warn('返回失败，跳转到我的页面:', err);
            uni.switchTab({
              url: '/pages/mine/mine',
              fail: () => {
                // 如果切换tab也失败，显示提示
                uni.showToast({
                  title: '返回失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            });
          }
        });
      } else {
        // 如果没有上一页，跳转到我的页面
        uni.switchTab({
          url: '/pages/mine/mine',
          fail: () => {
            uni.showToast({
              title: '无法返回',
              icon: 'none',
              duration: 2000
            });
          }
        });
      }
    },
    switchTab(tabKey) {
      this.activeTab = tabKey;
      // 根据选中的标签过滤列表
      this.filterAppointments();
    },
    async loadAppointments() {
      console.log('🔍 加载预约数据，标签:', this.activeTab);
      
      // 优先从后端API获取
      try {
        const { get } = require('@/utils/api.js');
        const statusParam = this.activeTab === 'all' ? '' : `?status=${this.activeTab}`;
        const res = await get(`/appointment${statusParam}`);
        
        if (res && res.success && Array.isArray(res.data)) {
          console.log('✅ 后端API返回预约数据:', res.data.length);
          this.appointmentList = res.data.map(item => {
            return {
              id: item._id || item.id,
              doctorName: item.doctorName || '医生',
              title: item.appointmentType || '专家门诊',
              hospital: item.hospital || '',
              specialty: item.department || '',
              expertise: item.doctorExpertise || '专业领域',
              avatar: item.doctorAvatar || 'https://dummyimage.com/120x120/4a90e2/ffffff&text=医生',
              patientName: item.patientName || '',
              date: item.date || '',
              time: item.time || '',
              price: item.price || 0,
              status: item.status || 'pendingPayment',
              paymentStatus: item.paymentStatus || 'unpaid',
              outTradeNo: item.outTradeNo || ''
            };
          });
          return;
        }
      } catch (e) {
        console.warn('后端API加载失败，尝试本地存储:', e);
      }
      
      // 后端失败时回退到本地存储
      try {
        const localAppointments = getAppointmentsByStatus(this.activeTab);
        if (localAppointments && localAppointments.length > 0) {
          this.appointmentList = localAppointments.map(item => ({
            ...item,
            id: item.id || item._id,
            avatar: item.avatar || item.doctorAvatar || 'https://dummyimage.com/120x120/4a90e2/ffffff&text=医生',
            expertise: item.expertise || item.doctorExpertise || '专业领域',
            price: item.price || 0,
            doctorName: item.doctorName || '医生',
            hospital: item.hospital || '',
            specialty: item.specialty || item.dept || '',
            title: item.title || ''
          }));
          return;
        }
      } catch (e) {
        console.error('本地存储读取失败:', e);
      }
      
      this.appointmentList = [];
    },
    filterAppointments() {
      // 这个方法现在由loadAppointments处理，保留以兼容旧代码
      this.loadAppointments();
    },
    getStatusText(status) {
      const statusMap = {
        pendingVisit: '待就诊',
        pendingPayment: '待支付',
        pendingRate: '待评价',
        rated: '已评价',
        history: '历史',
        cancelled: '已取消'
      };
      return statusMap[status] || '未知';
    },
    updateTheme(theme) {
      try {
        this.theme = theme || getCurrentTheme();
      } catch (e) {
        console.warn('主题更新失败:', e);
        this.theme = getCurrentTheme();
      }
    },
    // 检测是否为移动设备
    isMobileDevice() {
      // #ifdef H5
      // H5环境下，通过 window.navigator.userAgent 判断
      if (typeof window !== 'undefined' && window.navigator) {
        const ua = window.navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|crios/i.test(ua);
        
        // 额外检查：通过屏幕宽度判断（移动端通常小于768px）
        const isMobileScreen = window.innerWidth && window.innerWidth < 768;
        
        // 如果UA或屏幕宽度任一判断为移动端，则认为是移动端
        const isMobile = isMobileUA || isMobileScreen;
        
        console.log('📱 移动端检测:', {
          ua: ua.substring(0, 50),
          isMobileUA,
          screenWidth: window.innerWidth,
          isMobileScreen,
          finalResult: isMobile
        });
        
        return isMobile;
      }
      // #endif
      
      // #ifdef MP
      return true; // 小程序环境默认为移动端
      // #endif
      
      // #ifdef APP-PLUS
      return true; // App环境默认为移动端
      // #endif
      
      // 默认根据系统信息判断
      try {
        const systemInfo = uni.getSystemInfoSync();
        const isMobile = systemInfo.platform !== 'devtools' && 
                        (systemInfo.platform === 'ios' || 
                         systemInfo.platform === 'android' ||
                         (systemInfo.windowWidth && systemInfo.windowWidth < 768));
        
        console.log('📱 移动端检测（系统信息):', {
          platform: systemInfo.platform,
          windowWidth: systemInfo.windowWidth,
          finalResult: isMobile
        });
        
        return isMobile;
      } catch (e) {
        console.warn('⚠️ 移动端检测失败，默认返回false:', e);
        return false;
      }
    },
    
  }
};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  background-color: var(--card-bg);
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  
  /* 暗色主题下导航栏为蓝色背景 */
  [data-theme="dark"] & {
    background-color: #4a90e2;
    border-bottom: none;
  }
  
  .nav-back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.2s ease;
    
    /* 点击反馈效果 */
    &:active {
      opacity: 0.6;
    }
    
    /* 暗色主题下图标为白色 */
    [data-theme="dark"] & {
      color: #ffffff;
    }
  }
  
  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 36rpx;
    font-weight: 700;
    color: var(--text-color);
    transition: color 0.3s ease;
    
    /* 暗色主题下文字为白色 */
    [data-theme="dark"] & {
      color: #ffffff;
    }
  }
  
  .nav-right {
    width: 60rpx;
  }
}

/* 标签栏 */
.tabs-container {
  display: flex;
  align-items: center;
  padding: 0;
  padding-left: 30rpx;
  padding-right: 30rpx;
  background-color: var(--card-bg);
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  
  /* 暗色主题下标签栏背景 */
  [data-theme="dark"] & {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
}

  .tab-item {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 0;
    cursor: pointer;
    box-sizing: border-box;
    
    .tab-text {
      font-size: 28rpx;
      color: var(--text-color-secondary);
      transition: color 0.3s ease, font-weight 0.3s ease;
      
      /* 暗色主题下未选中标签文字颜色 */
      [data-theme="dark"] & {
        color: #999999;
      }
    }
    
    &.active {
      .tab-text {
        color: var(--text-color);
        font-weight: 700;
        
        /* 暗色主题下选中标签文字颜色 */
        [data-theme="dark"] & {
          color: #ffffff;
        }
      }
      
      .tab-indicator {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60rpx;
        height: 6rpx;
        background-color: var(--text-color);
        border-radius: 3rpx;
        transition: background-color 0.3s ease;
        
        /* 暗色主题下指示器颜色 */
        [data-theme="dark"] & {
          background-color: #ffffff;
        }
      }
    }
  }
}

/* 预约列表 */
.appointment-list {
  flex: 1;
  padding: 20rpx 30rpx;
  padding-left: 30rpx;
  padding-right: 30rpx;
  height: calc(100vh - 200rpx);
  box-sizing: border-box;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: var(--text-color-secondary);
    transition: color 0.3s ease;
  }
}

/* 预约卡片 */
.appointment-card {
  position: relative;
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  margin-left: 0;
  margin-right: 0;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  box-sizing: border-box;
  
  /* 医生信息区域 */
  .doctor-info {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20rpx;
    
    .doctor-avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 12rpx;
      margin-right: 24rpx;
      flex-shrink: 0;
}

    .doctor-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      
      .doctor-name-row {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;
        
        .doctor-name {
  font-size: 32rpx;
  font-weight: 700;
          color: var(--text-color);
          margin-right: 12rpx;
          transition: color 0.3s ease;
        }
        
        .doctor-title {
          font-size: 24rpx;
          color: var(--text-color-secondary);
          transition: color 0.3s ease;
        }
      }
      
      .hospital-name {
        font-size: 26rpx;
        color: var(--text-color-secondary);
        margin-bottom: 6rpx;
        transition: color 0.3s ease;
      }
      
      .specialty {
        font-size: 24rpx;
        color: var(--text-color-secondary);
        margin-bottom: 6rpx;
        transition: color 0.3s ease;
}

      .expertise {
        font-size: 24rpx;
        color: var(--text-color-tertiary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: color 0.3s ease;
      }
    }
  }
  
  /* 状态标签 */
  .status-badge {
    position: absolute;
    top: 30rpx;
    right: 30rpx;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    
    &.status-pendingPayment {
      background-color: rgba(244, 67, 54, 0.15);
      
      .status-text {
        color: #f44336;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
    
    &.status-pendingVisit {
      background-color: rgba(30, 115, 232, 0.15);
      
      .status-text {
        color: #1e73e8;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
    
    &.status-pendingRate {
      background-color: rgba(255, 152, 0, 0.15);
      
      .status-text {
        color: #ff9800;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
    
    &.status-rated {
      background-color: rgba(76, 175, 80, 0.15);
      
      .status-text {
        color: #4caf50;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
    
    &.status-history {
      background-color: rgba(158, 158, 158, 0.15);
      
      .status-text {
        color: #9e9e9e;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
  }
  
  /* 暗色主题下的状态标签 */
  [data-theme="dark"] .appointment-card {
    .status-badge {
      &.status-pendingVisit {
        background-color: rgba(30, 115, 232, 0.25);
        
        .status-text {
          color: #5ba0f2;
        }
      }
      
      &.status-pendingRate {
        background-color: rgba(255, 152, 0, 0.25);
        
        .status-text {
          color: #ffb74d;
        }
      }
      
      &.status-rated {
        background-color: rgba(76, 175, 80, 0.25);
        
        .status-text {
          color: #81c784;
        }
      }
      
      &.status-history {
        background-color: rgba(158, 158, 158, 0.25);
        
        .status-text {
          color: #bdbdbd;
        }
      }
    }
  }
  
  /* 底部信息 */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20rpx;
    border-top: 1rpx solid var(--border-color);
    transition: border-color 0.3s ease;
    
    .patient-info {
      flex: 1;
      
      .patient-text {
  font-size: 26rpx;
        color: var(--text-color);
        transition: color 0.3s ease;
      }
    }
    
    .price-info {
      padding: 10rpx 20rpx;
      background-color: rgba(158,158,158,0.12);
      border-radius: 8rpx;
      
      .price-text {
        font-size: 28rpx;
        font-weight: 600;
        color: #666;
      }
    }
    
    .pay-btn {
      padding: 12rpx 28rpx;
      background: linear-gradient(135deg, #ff9800, #f57c00);
      border-radius: 30rpx;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:active {
        opacity: 0.7;
        transform: scale(0.95);
      }
      
      .pay-btn-text {
        font-size: 28rpx;
        font-weight: 700;
        color: #ffffff;
      }
    }
  }
}

/* 支付方式选择弹窗 */
.payment-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.payment-modal-content {
  width: 100%;
  background-color: var(--card-bg);
  border-radius: 30rpx 30rpx 0 0;
  padding: 40rpx 30rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.payment-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.payment-modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-color);
}

.payment-modal-close {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:active {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.payment-amount {
  text-align: center;
  padding: 30rpx 0;
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid var(--border-color);
}

.payment-amount-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-color-secondary);
  margin-bottom: 10rpx;
}

.payment-amount-value {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #ff9800;
  font-family: 'Arial', sans-serif;
}

.payment-methods {
  margin-bottom: 30rpx;
}

.payment-method-item {
  display: flex;
  align-items: center;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  background-color: var(--bg-color);
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.payment-method-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.alipay-icon {
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
}

.wechat-icon {
  background: linear-gradient(135deg, #09bb07 0%, #07c160 100%);
}

.unionpay-icon {
  background: linear-gradient(135deg, #e60012 0%, #c8102e 100%);
}

.stripe-icon {
  background: linear-gradient(135deg, #635bff 0%, #4f46e5 100%);
}

.payment-method-info {
  flex: 1;
}

.payment-method-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8rpx;
}

.payment-method-desc {
  display: block;
  font-size: 24rpx;
  color: var(--text-color-secondary);
}

.payment-method-radio {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &.active {
    border-color: #ff9800;
    background-color: #ff9800;
  }
}

.payment-method-radio-dot {
  width: 20rpx;
  height: 20rpx;
  background-color: #ffffff;
  border-radius: 50%;
}

.payment-modal-footer {
  display: flex;
  gap: 20rpx;
}

.payment-cancel-btn,
.payment-confirm-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.payment-cancel-btn {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.payment-confirm-btn {
  background: linear-gradient(135deg, #ff9800 0%, #ff6f00 100%);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
}
</style>
