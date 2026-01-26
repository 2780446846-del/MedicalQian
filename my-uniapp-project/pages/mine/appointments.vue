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
        v-for="(tab, index) in tabs" 
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
          <view class="price-info" @click.stop="showPaymentOptions(item)">
            <text class="price-text">¥{{ item.price }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 支付方式选择弹窗 -->
    <view v-if="showPaymentModal" class="payment-modal" @click="closePaymentModal">
      <view class="payment-modal-content" @click.stop>
        <view class="payment-modal-header">
          <text class="payment-modal-title">选择支付方式</text>
          <view class="payment-modal-close" @click="closePaymentModal">✕</view>
        </view>
        <view class="payment-amount">
          <text class="payment-amount-label">支付金额</text>
          <text class="payment-amount-value">¥{{ selectedItem?.price || 0 }}</text>
        </view>
        <view class="payment-methods">
          <view class="payment-method-item" @click="selectPaymentMethod('alipay')">
            <view class="payment-method-icon alipay-icon">💙</view>
            <view class="payment-method-info">
              <text class="payment-method-name">支付宝支付</text>
              <text class="payment-method-desc">推荐使用，安全快捷</text>
            </view>
            <view class="payment-method-radio" :class="{ active: paymentMethod === 'alipay' }">
              <view v-if="paymentMethod === 'alipay'" class="payment-method-radio-dot"></view>
            </view>
          </view>
        </view>
        <view class="payment-modal-footer">
          <button class="payment-cancel-btn" @click="closePaymentModal">取消</button>
          <button class="payment-confirm-btn" @click="confirmPayment">确认支付</button>
        </view>
      </view>
    </view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { post } from '@/utils/api.js';
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
        { key: 'pendingVisit', label: '待就诊' },
        { key: 'pendingRate', label: '待评价' },
        { key: 'rated', label: '已评价' },
        { key: 'history', label: '历史' }
      ],
      appointmentList: [],
      showPaymentModal: false,
      selectedItem: null,
      paymentMethod: 'alipay' // 默认选择支付宝
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
    // 支付完成后回跳时，显示提示并跳转到首页
    if (query && (query.status === 'success' || query.from === 'alipay')) {
      uni.showToast({
        title: '支付成功',
        icon: 'success',
        duration: 2000,
      });
      
      // 2秒后自动跳转到首页
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/index/index',
          success: () => {
            console.log('✅ 支付成功，已跳转到首页');
          },
          fail: (err) => {
            console.error('❌ 跳转首页失败:', err);
          }
        });
      }, 2000);
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
      console.log('🔍 开始加载预约数据，当前标签:', this.activeTab);
      
      // 先尝试从本地存储读取（用于调试和快速显示）
      try {
        const localAppointments = getAppointmentsByStatus(this.activeTab);
        console.log('📦 本地存储数据:', {
          activeTab: this.activeTab,
          localCount: localAppointments ? localAppointments.length : 0,
          localData: localAppointments
        });
        
        // 如果本地有数据，直接使用
        if (localAppointments && Array.isArray(localAppointments) && localAppointments.length > 0) {
          console.log('✅ 使用本地存储数据，数量:', localAppointments.length);
          this.appointmentList = localAppointments.map(item => {
            let formattedDate = item.date;
            if (formattedDate && formattedDate.includes('年')) {
              const dateMatch = formattedDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
              if (dateMatch) {
                const year = dateMatch[1];
                const month = dateMatch[2].padStart(2, '0');
                const day = dateMatch[3].padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
              }
            }
            return {
              ...item,
              id: item.id || item._id,
              date: formattedDate,
              avatar: item.avatar || item.doctorAvatar || 'https://dummyimage.com/120x120/4a90e2/ffffff&text=医生',
              expertise: item.expertise || item.doctorExpertise || '专业领域',
              price: item.price || 0,
              doctorName: item.doctorName || item.name || '医生',
              hospital: item.hospital || '',
              specialty: item.specialty || item.dept || '',
              title: item.title || ''
            };
          });
          console.log('📋 最终显示的预约列表（本地）:', this.appointmentList);
          return;
        }
      } catch (e) {
        console.error('读取本地存储失败:', e);
      }
      
      // 如果本地没有数据，显示空状态
      console.log('❌ 本地存储没有数据');
      this.appointmentList = [];
    },
    filterAppointments() {
      // 这个方法现在由loadAppointments处理，保留以兼容旧代码
      this.loadAppointments();
    },
    getStatusText(status) {
      const statusMap = {
        pendingVisit: '待就诊',
        pendingRate: '待评价',
        rated: '已评价',
        history: '历史'
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
    
    // 显示支付方式选择弹窗
    showPaymentOptions(item) {
      console.log('💳 显示支付方式选择，预约信息:', item);
      this.selectedItem = item;
      this.showPaymentModal = true;
    },
    
    // 关闭支付方式选择弹窗
    closePaymentModal() {
      this.showPaymentModal = false;
      this.selectedItem = null;
      this.paymentMethod = 'alipay'; // 重置为默认支付方式
    },
    
    // 选择支付方式
    selectPaymentMethod(method) {
      console.log('✅ 选择支付方式:', method);
      this.paymentMethod = method;
    },
    
    // 确认支付
    async confirmPayment() {
      if (!this.selectedItem) {
        uni.showToast({
          title: '请选择要支付的订单',
          icon: 'none'
        });
        return;
      }
      
      // 保存选中的项目和支付方式
      const item = this.selectedItem;
      const method = this.paymentMethod;
      
      // 关闭弹窗
      this.closePaymentModal();
      
      // 根据选择的支付方式调用对应的支付方法
      if (method === 'alipay') {
        await this.goAlipay(item);
      } else if (method === 'wechat') {
        await this.goWechatPay(item);
      } else if (method === 'unionpay') {
        await this.goUnionpay(item);
      } else if (method === 'stripe') {
        await this.goStripe(item);
      }
    },
    
    // 支付宝支付
    async goAlipay(item) {
      console.log('🎯 开始支付宝支付流程');
      console.log('📦 传入的 item:', item);
      
      let loadingShown = false;
      try {
        const amount = item.price;
        console.log('💰 价格金额:', amount);
        
        if (!amount) {
          console.log('❌ 金额无效');
          uni.showToast({
            title: '金额无效，无法发起支付',
            icon: 'none'
          });
          return;
        }

        // 检测是否为移动设备
        const isMobile = this.isMobileDevice();
        console.log('📱 设备类型检测:', isMobile ? '移动端' : 'PC端');

        // 移动端提示：将使用PC端支付页面，适配移动浏览器
        if (isMobile) {
          uni.showToast({
            title: '正在打开支付页面...',
            icon: 'loading',
            duration: 2000
          });
        }

        // 显示加载提示
        loadingShown = true;
        uni.showLoading({
          title: '正在创建支付订单...',
          mask: true
        });

        // 调用后端支付接口
        // 使用 wap 接口（手机端支付），适配移动端和PC端
        let res;
        try {
          res = await post('/pay/alipay/wap', {
            appointmentId: item.id || '',
            subject: `预约${item.doctorName}医生`,
            totalAmount: amount.toString(),
            body: `预约${item.doctorName}医生 - ${item.date} ${item.time}`
          }, {
            showLoading: false // 禁用 api.js 内部的 loading，使用手动控制
          });
        } catch (apiError) {
          // API调用失败，确保隐藏loading
          if (loadingShown) {
            uni.hideLoading();
            loadingShown = false;
          }
          
          // 提取错误信息
          const errorMsg = apiError?.message || apiError?.data?.message || '创建支付订单失败';
          console.error('❌ 创建支付订单API调用失败:', apiError);
          
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 确保隐藏loading
        if (loadingShown) {
          uni.hideLoading();
          loadingShown = false;
        }

        // 检查响应是否成功
        if (!res) {
          uni.showToast({
            title: '创建支付订单失败：服务器无响应',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        // 检查是否成功创建订单
        if (!res.success) {
          uni.showToast({
            title: res?.message || '创建支付订单失败',
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 检查是否有支付URL
        if (!res.payUrl) {
          uni.showToast({
            title: res?.message || '支付URL无效，请重试',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        console.log('✅ 支付订单创建成功');
        console.log('🔍 完整响应:', res);
        console.log('🔍 payUrl:', res.payUrl);

        // 验证 payUrl 是否存在
        if (!res.payUrl || typeof res.payUrl !== 'string') {
          uni.showToast({
            title: '支付URL无效，请重试',
            icon: 'none',
            duration: 3000
          });
          console.error('❌ payUrl 无效:', res.payUrl);
          return;
        }

        // 跳转到支付宝支付页面
        // #ifdef H5
        try {
          console.log('🔗 准备跳转到支付页面...');
          console.log('🔗 payUrl:', res.payUrl);
          
          // 在 uni-app H5 环境下，使用 window.location.href 跳转
          if (typeof window !== 'undefined') {
            console.log('🔗 使用 window.location.href 跳转');
            
            // 直接跳转
            setTimeout(() => {
              window.location.href = res.payUrl;
            }, 200);
          } else {
            throw new Error('当前环境不支持 window 对象');
          }
        } catch (jumpError) {
          console.error('❌ 跳转失败:', jumpError);
          uni.showToast({
            title: '跳转失败：' + jumpError.message,
            icon: 'none',
            duration: 3000
          });
        }
        // #endif
        
        // #ifdef APP-PLUS
        // App环境下，使用 plus.runtime.openURL 打开支付URL
        try {
          console.log('📱 App环境：准备打开支付URL...');
          console.log('🔗 payUrl前200字符:', res.payUrl.substring(0, 200));
          
          // 检测是否为沙箱版本
          const isSandbox = res.payUrl.includes('sandbox') || res.payUrl.includes('alipaydev.com');
          console.log('🔍 支付环境检测:', isSandbox ? '✅ 沙箱环境' : '⚠️ 正式环境');
          
          if (!isSandbox) {
            console.warn('⚠️ 警告：当前支付URL不是沙箱版本！');
            uni.showToast({
              title: '警告：当前不是沙箱环境',
              icon: 'none',
              duration: 2000
            });
          }
          
          // 检查支付URL格式
          if (!res.payUrl.includes('gateway.do') && !res.payUrl.includes('mobileclientgw')) {
            uni.showToast({
              title: '支付URL格式错误',
              icon: 'none',
              duration: 3000
            });
            console.error('❌ 支付URL格式错误:', res.payUrl);
            return;
          }
          
          // 使用 plus.runtime.openURL 打开支付URL
          // 这会尝试打开支付宝APP，如果未安装则打开浏览器
          if (typeof plus !== 'undefined' && plus.runtime) {
            plus.runtime.openURL(res.payUrl, (error) => {
              if (error) {
                console.error('❌ 打开支付URL失败:', error);
                uni.showToast({
                  title: '打开支付失败，请检查是否安装支付宝',
                  icon: 'none',
                  duration: 3000
                });
                // 备用方案：显示支付URL让用户手动打开
                this.showPayUrlModal(res.payUrl);
              } else {
                console.log('✅ 支付URL已打开');
              }
            });
          } else {
            console.error('❌ plus.runtime 不可用');
            uni.showToast({
              title: '当前环境不支持打开支付',
              icon: 'none',
              duration: 3000
            });
            this.showPayUrlModal(res.payUrl);
          }
        } catch (appError) {
          console.error('❌ App环境支付失败:', appError);
          uni.showToast({
            title: '打开支付失败，请重试',
            icon: 'none',
            duration: 3000
          });
          this.showPayUrlModal(res.payUrl);
        }
        // #endif
        
        // #ifdef MP
        // 小程序环境：提示用户在浏览器中打开
        uni.showModal({
          title: '支付提示',
          content: '小程序暂不支持直接支付，请在浏览器中打开链接完成支付',
          showCancel: false,
          confirmText: '知道了'
        });
        // #endif
      } catch (error) {
        // 确保隐藏loading（防止重复调用）
        if (loadingShown) {
          try {
            uni.hideLoading();
          } catch (e) {
            // 忽略hideLoading错误
          }
          loadingShown = false;
        }
        
        console.error('❌ 发起支付失败:', error);
        
        // 提取更详细的错误信息
        let errorMsg = '发起支付失败';
        if (error?.message) {
          errorMsg = error.message;
        } else if (error?.data?.message) {
          errorMsg = error.data.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        // 如果是网络错误，提供更友好的提示
        if (errorMsg.includes('网络') || errorMsg.includes('timeout') || errorMsg.includes('连接')) {
          errorMsg = '网络连接失败，请检查网络后重试';
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    },
    
    // 微信支付
    async goWechatPay(item) {
      console.log('🎯 开始微信支付流程');
      console.log('📦 传入的 item:', item);
      
      let loadingShown = false;
      try {
        const amount = item.price;
        console.log('💰 价格金额:', amount);
        
        if (!amount) {
          console.log('❌ 金额无效');
          uni.showToast({
            title: '金额无效，无法发起支付',
            icon: 'none'
          });
          return;
        }

        // 显示加载提示
        loadingShown = true;
        uni.showLoading({
          title: '正在创建微信支付订单...',
          mask: true
        });

        // 调用后端微信支付接口
        let res;
        try {
          res = await post('/wechatpay/h5', {
            appointmentId: item.id || '',
            subject: `预约${item.doctorName}医生`,
            totalAmount: amount.toString(),
            body: `预约${item.doctorName}医生 - ${item.date} ${item.time}`
          }, {
            showLoading: false
          });
        } catch (apiError) {
          if (loadingShown) {
            uni.hideLoading();
            loadingShown = false;
          }
          
          const errorMsg = apiError?.message || apiError?.data?.message || '创建微信支付订单失败';
          console.error('❌ 创建微信支付订单API调用失败:', apiError);
          
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 隐藏loading
        if (loadingShown) {
          uni.hideLoading();
          loadingShown = false;
        }

        // 检查响应
        if (!res || !res.success) {
          uni.showToast({
            title: res?.message || '创建微信支付订单失败',
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 检查支付URL
        if (!res.payUrl) {
          uni.showToast({
            title: '支付URL无效，请重试',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        console.log('✅ 微信支付订单创建成功');
        console.log('🔍 payUrl:', res.payUrl);

        // 跳转到微信支付页面
        // #ifdef H5
        try {
          console.log('🔗 准备跳转到微信支付页面...');
          
          if (typeof window !== 'undefined') {
            console.log('🔗 使用 window.location.href 跳转');
            setTimeout(() => {
              window.location.href = res.payUrl;
            }, 200);
          } else {
            throw new Error('当前环境不支持 window 对象');
          }
        } catch (jumpError) {
          console.error('❌ 跳转失败:', jumpError);
          uni.showToast({
            title: '跳转失败：' + jumpError.message,
            icon: 'none',
            duration: 3000
          });
        }
        // #endif
        
        // #ifdef APP-PLUS
        try {
          console.log('📱 App环境：准备打开微信支付...');
          
          if (typeof plus !== 'undefined' && plus.runtime) {
            plus.runtime.openURL(res.payUrl, (error) => {
              if (error) {
                console.error('❌ 打开微信支付失败:', error);
                uni.showToast({
                  title: '打开微信支付失败，请检查是否安装微信',
                  icon: 'none',
                  duration: 3000
                });
              } else {
                console.log('✅ 微信支付已打开');
              }
            });
          } else {
            console.error('❌ plus.runtime 不可用');
            uni.showToast({
              title: '当前环境不支持打开支付',
              icon: 'none',
              duration: 3000
            });
          }
        } catch (appError) {
          console.error('❌ App环境微信支付失败:', appError);
          uni.showToast({
            title: '打开微信支付失败，请重试',
            icon: 'none',
            duration: 3000
          });
        }
        // #endif
        
        // #ifdef MP
        uni.showModal({
          title: '支付提示',
          content: '小程序暂不支持直接支付，请在浏览器中打开链接完成支付',
          showCancel: false,
          confirmText: '知道了'
        });
        // #endif
      } catch (error) {
        if (loadingShown) {
          try {
            uni.hideLoading();
          } catch (e) {
            // 忽略错误
          }
          loadingShown = false;
        }
        
        console.error('❌ 发起微信支付失败:', error);
        
        let errorMsg = '发起微信支付失败';
        if (error?.message) {
          errorMsg = error.message;
        } else if (error?.data?.message) {
          errorMsg = error.data.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        if (errorMsg.includes('网络') || errorMsg.includes('timeout') || errorMsg.includes('连接')) {
          errorMsg = '网络连接失败，请检查网络后重试';
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    },
    
    // 银联支付
    async goUnionpay(item) {
      console.log('🎯 开始银联支付流程');
      console.log('📦 传入的 item:', item);
      
      let loadingShown = false;
      try {
        const amount = item.price;
        console.log('💰 价格金额:', amount);
        
        if (!amount) {
          console.log('❌ 金额无效');
          uni.showToast({
            title: '金额无效，无法发起支付',
            icon: 'none'
          });
          return;
        }

        // 显示加载提示
        loadingShown = true;
        uni.showLoading({
          title: '正在创建银联支付订单...',
          mask: true
        });

        // 调用后端银联支付接口
        // 注意：银联支付返回的是HTML表单，需要特殊处理
        try {
          const response = await fetch('http://localhost:3000/api/unionpay/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              appointmentId: item.id || '',
              subject: `预约${item.doctorName}医生`,
              totalAmount: amount.toString(),
              body: `预约${item.doctorName}医生 - ${item.date} ${item.time}`
            })
          });

          // 隐藏loading
          if (loadingShown) {
            uni.hideLoading();
            loadingShown = false;
          }

          if (!response.ok) {
            throw new Error('创建银联支付订单失败');
          }

          // 获取HTML内容
          const htmlContent = await response.text();
          
          console.log('✅ 银联支付订单创建成功');

          // 在当前窗口中打开HTML表单（会自动提交到银联网关）
          // #ifdef H5
          try {
            console.log('🔗 准备跳转到银联支付页面...');
            
            if (typeof window !== 'undefined') {
              // 在当前窗口写入HTML内容，表单会自动提交到银联网关
              document.open();
              document.write(htmlContent);
              document.close();
            } else {
              throw new Error('当前环境不支持 window 对象');
            }
          } catch (jumpError) {
            console.error('❌ 跳转失败:', jumpError);
            uni.showToast({
              title: '跳转失败：' + jumpError.message,
              icon: 'none',
              duration: 3000
            });
          }
          // #endif
          
          // #ifdef APP-PLUS
          uni.showModal({
            title: '支付提示',
            content: 'APP环境暂不支持银联支付，请在浏览器中打开',
            showCancel: false,
            confirmText: '知道了'
          });
          // #endif
          
          // #ifdef MP
          uni.showModal({
            title: '支付提示',
            content: '小程序暂不支持银联支付，请在浏览器中打开',
            showCancel: false,
            confirmText: '知道了'
          });
          // #endif
        } catch (apiError) {
          if (loadingShown) {
            uni.hideLoading();
            loadingShown = false;
          }
          
          const errorMsg = apiError?.message || '创建银联支付订单失败';
          console.error('❌ 创建银联支付订单失败:', apiError);
          
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
          return;
        }
      } catch (error) {
        if (loadingShown) {
          try {
            uni.hideLoading();
          } catch (e) {
            // 忽略错误
          }
          loadingShown = false;
        }
        
        console.error('❌ 发起银联支付失败:', error);
        
        let errorMsg = '发起银联支付失败';
        if (error?.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        if (errorMsg.includes('网络') || errorMsg.includes('timeout') || errorMsg.includes('连接')) {
          errorMsg = '网络连接失败，请检查网络后重试';
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    },
    
    // Stripe 支付
    async goStripe(item) {
      console.log('🎯 开始 Stripe 支付流程');
      console.log('📦 传入的 item:', item);
      
      let loadingShown = false;
      try {
        const amount = item.price;
        console.log('💰 价格金额:', amount);
        
        if (!amount) {
          console.log('❌ 金额无效');
          uni.showToast({
            title: '金额无效，无法发起支付',
            icon: 'none'
          });
          return;
        }

        // 显示加载提示
        loadingShown = true;
        uni.showLoading({
          title: '正在创建 Stripe 支付...',
          mask: true
        });

        // 调用后端 Stripe 支付接口
        let res;
        try {
          res = await post('/stripe/create-checkout-session', {
            appointmentId: item.id || '',
            subject: `预约${item.doctorName}医生`,
            totalAmount: amount.toString(),
            body: `预约${item.doctorName}医生 - ${item.date} ${item.time}`
          }, {
            showLoading: false
          });
        } catch (apiError) {
          if (loadingShown) {
            uni.hideLoading();
            loadingShown = false;
          }
          
          const errorMsg = apiError?.message || apiError?.data?.message || '创建 Stripe 支付失败';
          console.error('❌ 创建 Stripe 支付API调用失败:', apiError);
          
          uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 隐藏loading
        if (loadingShown) {
          uni.hideLoading();
          loadingShown = false;
        }

        // 检查响应
        if (!res || !res.success) {
          uni.showToast({
            title: res?.message || '创建 Stripe 支付失败',
            icon: 'none',
            duration: 3000
          });
          return;
        }

        // 检查支付URL
        if (!res.payUrl) {
          uni.showToast({
            title: '支付URL无效，请重试',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        console.log('✅ Stripe 支付创建成功');
        console.log('🔍 payUrl:', res.payUrl);

        // 跳转到 Stripe 支付页面
        // #ifdef H5
        try {
          console.log('🔗 准备跳转到 Stripe 支付页面...');
          
          if (typeof window !== 'undefined') {
            console.log('🔗 使用 window.location.href 跳转');
            setTimeout(() => {
              window.location.href = res.payUrl;
            }, 200);
          } else {
            throw new Error('当前环境不支持 window 对象');
          }
        } catch (jumpError) {
          console.error('❌ 跳转失败:', jumpError);
          uni.showToast({
            title: '跳转失败：' + jumpError.message,
            icon: 'none',
            duration: 3000
          });
        }
        // #endif
        
        // #ifdef APP-PLUS
        try {
          console.log('📱 App环境：准备打开 Stripe 支付...');
          
          if (typeof plus !== 'undefined' && plus.runtime) {
            plus.runtime.openURL(res.payUrl, (error) => {
              if (error) {
                console.error('❌ 打开 Stripe 支付失败:', error);
                uni.showToast({
                  title: '打开 Stripe 支付失败',
                  icon: 'none',
                  duration: 3000
                });
              } else {
                console.log('✅ Stripe 支付已打开');
              }
            });
          } else {
            console.error('❌ plus.runtime 不可用');
            uni.showToast({
              title: '当前环境不支持打开支付',
              icon: 'none',
              duration: 3000
            });
          }
        } catch (appError) {
          console.error('❌ App环境 Stripe 支付失败:', appError);
          uni.showToast({
            title: '打开 Stripe 支付失败，请重试',
            icon: 'none',
            duration: 3000
          });
        }
        // #endif
        
        // #ifdef MP
        uni.showModal({
          title: '支付提示',
          content: '小程序暂不支持直接支付，请在浏览器中打开链接完成支付',
          showCancel: false,
          confirmText: '知道了'
        });
        // #endif
      } catch (error) {
        if (loadingShown) {
          try {
            uni.hideLoading();
          } catch (e) {
            // 忽略错误
          }
          loadingShown = false;
        }
        
        console.error('❌ 发起 Stripe 支付失败:', error);
        
        let errorMsg = '发起 Stripe 支付失败';
        if (error?.message) {
          errorMsg = error.message;
        } else if (error?.data?.message) {
          errorMsg = error.data.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        
        if (errorMsg.includes('网络') || errorMsg.includes('timeout') || errorMsg.includes('连接')) {
          errorMsg = '网络连接失败，请检查网络后重试';
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    }
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
      background-color: #ff9800;
      border-radius: 8rpx;
      cursor: pointer;
      transition: all 0.3s ease;
      
      /* 点击反馈效果 */
      &:active {
        opacity: 0.7;
        transform: scale(0.95);
      }
      
      .price-text {
        font-size: 32rpx;
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
