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
          <view class="price-info" @click.stop="goPay(item)">
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
      appointmentList: []
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
    // 支付完成后回跳时，显示提示
    if (query && (query.status === 'success' || query.from === 'alipay')) {
      uni.showToast({
        title: '支付成功',
        icon: 'success',
        duration: 2000,
      })
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
      } catch (e) {
        console.error('读取本地存储失败:', e);
      }
      
      // 从后端API加载预约数据
      try {
        const { getAllAppointments } = await import('@/api/appointment.js');
        const res = await getAllAppointments(this.activeTab);
        
        console.log('🌐 后端API响应:', {
          success: res?.success,
          dataType: Array.isArray(res?.data) ? 'array' : typeof res?.data,
          dataLength: Array.isArray(res?.data) ? res.data.length : 'N/A',
          message: res?.message,
          fullResponse: res
        });
        
        if (res && res.success && Array.isArray(res.data)) {
          const backendList = res.data || [];

          // 如果后端有数据，优先展示后端数据
          if (backendList.length > 0) {
            console.log('✅ 使用后端数据，数量:', backendList.length);
            this.appointmentList = backendList.map(item => {
            // 格式化日期显示
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
              id: item._id || item.id,
              date: formattedDate,
              avatar: item.doctorAvatar || item.avatar || 'https://dummyimage.com/120x120/4a90e2/ffffff&text=医生',
              expertise: item.doctorExpertise || item.expertise || '专业领域',
              price: item.price || 0,
              doctorName: item.doctorName || item.name || '医生'
            };
          });
            console.log('📋 最终显示的预约列表:', this.appointmentList);
            return;
        } else {
            console.log('⚠️ 后端返回空数组，尝试读取本地存储');
          }
        } else {
          console.warn('⚠️ 后端返回非预期数据格式:', res);
        }

        // 后端无数据或失败时，尝试读取本地存储（兼容旧版本仅保存在本地的预约）
        console.log('📦 开始读取本地存储，标签:', this.activeTab);
        const localAppointments = getAppointmentsByStatus(this.activeTab);
        console.log('📦 本地存储读取结果:', {
          isArray: Array.isArray(localAppointments),
          length: localAppointments ? localAppointments.length : 0,
          data: localAppointments
        });
        
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
        } else {
          console.log('❌ 本地存储也没有数据');
        }

        // 后端和本地都没有数据
        console.log('❌ 没有找到任何预约数据');
        this.appointmentList = [];
      } catch (error) {
        console.error('获取预约列表失败:', error);
        // 如果API失败，尝试从本地存储获取（降级方案）
        try {
          const allAppointments = getAppointmentsByStatus(this.activeTab);
          this.appointmentList = allAppointments.map(item => {
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
              date: formattedDate,
              avatar: item.avatar || 'https://dummyimage.com/120x120/4a90e2/ffffff&text=医生',
              expertise: item.expertise || '专业领域',
              price: item.price || 0
            };
          });
        } catch (e) {
          console.error('从本地存储获取预约也失败:', e);
          this.appointmentList = [];
        }
      }
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
    
    
    // 显示支付链接弹窗
    showPayUrlModal(payUrl) {
      uni.showModal({
        title: '支付链接',
        content: '请复制以下链接到浏览器中打开完成支付：\n\n' + (payUrl.length > 100 ? payUrl.substring(0, 100) + '...' : payUrl),
        showCancel: false,
        confirmText: '复制链接',
        success: (modalRes) => {
          if (modalRes.confirm) {
            // 复制到剪贴板
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(payUrl).then(() => {
                uni.showToast({
                  title: '链接已复制到剪贴板',
                  icon: 'success'
                });
              }).catch(() => {
                uni.showToast({
                  title: '复制失败，请手动复制',
                  icon: 'none'
                });
              });
            } else {
              uni.showToast({
                title: '请手动复制链接',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    
    async goPay(item) {
      let loadingShown = false;
      try {
        const amount = item.price;
        if (!amount) {
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

        // 传递设备类型信息给后端
        // forceBrowser: true 强制使用PC端支付方式（page.pay），适配移动端浏览器显示
        // 这样可以确保移动端也能正常使用沙箱支付，支付页面会自动适配移动端屏幕
        let res;
        try {
          res = await post('/pay/alipay/createOrder', {
            amount,
            subject: `${item.doctorName}就诊费用`,
            appointmentId: item.id || '',
            isMobile: isMobile, // 设备类型信息（用于日志记录）
            forceBrowser: true // ✅ 强制使用PC端支付方式（page.pay），适配移动端浏览器
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

        console.log('✅ 支付订单创建成功，支付方式:', res.payMethod || '未知');
        if (res.isMock || res.fallback) {
          console.log('🎭 当前使用模拟支付（支付宝沙箱不可用）');
          if (res.fallback) {
            uni.showToast({
              title: '已切换到模拟支付',
              icon: 'none',
              duration: 2000
            });
          }
        }
        console.log('🔍 调试信息 - payUrl长度:', res.payUrl?.length || 0);
        console.log('🔍 调试信息 - payUrl前100字符:', res.payUrl?.substring(0, 100) || '无');
        console.log('🔍 调试信息 - payUrl是否包含gateway.do:', res.payUrl?.includes('gateway.do') || false);
        console.log('🔍 完整 payUrl:', res.payUrl);

        // 验证 payUrl 是否完整
        if (!res.payUrl || typeof res.payUrl !== 'string') {
          uni.showToast({
            title: '支付URL无效，请重试',
            icon: 'none',
            duration: 3000
          });
          console.error('❌ payUrl 无效:', res.payUrl);
          return;
        }

        // 如果是模拟支付，直接跳转（不需要检查 gateway.do）
        if (res.isMock || res.payMethod === 'mock') {
          console.log('🎭 使用模拟支付');
          // 直接跳转到模拟支付页面
          if (typeof window !== 'undefined') {
            setTimeout(() => {
              window.location.href = res.payUrl;
            }, 100);
          }
          return;
        }
        
        // 检查 payUrl 是否包含完整的支付参数（仅对真实支付宝支付）
        if (!res.payUrl.includes('gateway.do') || !res.payUrl.includes('?')) {
          uni.showToast({
            title: '支付URL不完整，请联系客服',
            icon: 'none',
            duration: 3000
          });
          console.error('❌ payUrl 不完整:', res.payUrl);
          return;
        }

        // 跳转到支付宝支付页面
        // #ifdef H5
        try {
          // 检测 payUrl 是 URL 还是 HTML form
          const isHtmlForm = res.payUrl.trim().startsWith('<form') || res.payUrl.includes('<form');
          
          if (isHtmlForm) {
            // 如果是 HTML form，需要注入到页面并自动提交
            console.log('📝 检测到HTML form，将注入页面并自动提交...');
            
            // 在 uni-app H5 环境下，需要确保 DOM 已加载
            if (typeof document !== 'undefined') {
              const div = document.createElement('div');
              div.innerHTML = res.payUrl;
              div.style.display = 'none';
              document.body.appendChild(div);
              
              // 查找表单并提交
              const form = div.querySelector('form');
              if (form) {
                // 使用 setTimeout 确保 DOM 已渲染
                setTimeout(() => {
                  form.submit();
                }, 200);
              } else {
                throw new Error('无法找到表单元素');
              }
            } else {
              throw new Error('当前环境不支持 DOM 操作');
            }
          } else {
            // 如果是 URL，直接跳转
            console.log('🔗 检测到URL，准备跳转到支付页面...');
            console.log('🔗 payUrl前200字符:', res.payUrl.substring(0, 200));
            
            // 在 uni-app H5 环境下，使用 window.location.href 跳转
            if (typeof window !== 'undefined') {
              try {
                console.log('🔗 尝试使用 window.location.replace 跳转...');
                console.log('💻 使用PC端沙箱支付（page.pay）适配移动端浏览器');
                
                // 移动端使用PC支付方式的提示
                if (isMobile) {
                  console.log('💡 移动端支付流程说明：');
                  console.log('   1. ✅ 当前使用PC端支付页面（page.pay），适配移动浏览器显示');
                  console.log('   2. ✅ 支付页面会自动适配移动端屏幕，支持响应式布局');
                  console.log('   3. ✅ 可以使用扫码支付或登录账户支付两种方式');
                  console.log('   4. ✅ 支付完成后会自动返回"我的预约"页面');
                  
                  // 给用户一个友好的提示
                  uni.showToast({
                    title: '正在跳转到支付页面...',
                    icon: 'loading',
                    duration: 1500
                  });
                }
                
                // 移动端优化：使用 replace 避免返回时回到支付页面
                // 直接跳转，如果遇到502错误，用户会看到错误页面
                // 如果支付宝沙箱不可用，后端会自动降级到模拟支付
                setTimeout(() => {
                  window.location.replace(res.payUrl);
                }, isMobile ? 500 : 200); // 移动端稍微延迟，确保提示显示
              } catch (hrefError) {
                console.warn('⚠️ window.location.replace 失败，尝试备用方案:', hrefError);
                // 备用方案1：使用 window.location.href
                try {
                  window.location.href = res.payUrl;
                } catch (replaceError) {
                  console.warn('⚠️ window.location.href 也失败，尝试 window.open:', replaceError);
                  // 备用方案2：使用 window.open
                  try {
                    const payWindow = window.open(res.payUrl, '_blank');
                    if (!payWindow) {
                      throw new Error('无法打开新窗口，可能被浏览器阻止');
                    }
                  } catch (openError) {
                    console.error('❌ 所有跳转方式都失败:', openError);
                    uni.showModal({
                      title: '支付提示',
                      content: '无法自动打开支付页面，请复制支付链接手动打开',
                      showCancel: false,
                      confirmText: '知道了',
                      success: () => {
                        this.showPayUrlModal(res.payUrl);
                      }
                    });
                  }
                }
              }
            } else {
              throw new Error('当前环境不支持 window 对象');
            }
          }
        } catch (jumpError) {
          console.error('❌ 跳转失败:', jumpError);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none',
            duration: 3000
          });
          this.showPayUrlModal(res.payUrl);
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
      .price-text {
        font-size: 32rpx;
        font-weight: 700;
        color: #ff9800;
      }
    }
  }
}
</style>
