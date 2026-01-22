<template>
  <view class="container">
    <!-- 顶部状态栏和头部 -->
    <view class="top-header">
      <view class="status-bar">
      </view>
      <view class="header">
        <view class="location" @click="switchCity">
          <uni-icons type="location" size="18" color="#333"></uni-icons>
          <text class="location-text">{{ currentCity }}</text>
        </view>
        <view class="search-box">
          <uni-icons type="search" size="18" color="#999"></uni-icons>
          <input 
            class="search-input" 
            type="text" 
            placeholder="搜索医院、科室、疾病、医生"
            placeholder-class="placeholder"
          />
        </view>
        <view class="chat-icon">
          <uni-icons type="chatbubbles" size="20" color="#333"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 橙色促销横幅 -->
    <view class="promo-banner">
      <view class="banner-content">
        <view class="banner-text">
          <view class="banner-title">随时随地问医生</view>
          <view class="banner-subtitle">三甲专家 5分钟快速回复</view>
          <view class="banner-desc">互联网医院 24小时在线</view>
        </view>
        <button class="consult-btn" @click="handleConsult">立即咨询</button>
      </view>
      <view class="banner-image">
        <!-- 医生图片占位 -->
        <view class="doctor-placeholder">👩‍⚕️</view>
      </view>
    </view>

    <!-- 服务卡片 -->
    <view class="service-cards">
      <view class="service-card" @click="handleAppointment">
        <view class="card-header">
          <view class="card-title">预约挂号</view>
          <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
        </view>
        <view class="card-subtitle">全国4000+医院</view>
        <view class="card-tag orange">互联网医院</view>
        <view class="card-bg-icon">➕</view>
      </view>
      <view class="service-card" @click="handleOnlineConsult">
        <view class="card-header">
          <view class="card-title">在线问诊</view>
          <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
        </view>
        <view class="card-subtitle">知名专家,5分钟回复</view>
        <view class="card-tag blue">
          <text class="lightning">⚡</text>
          <text>急速</text>
        </view>
        <view class="card-bg-icon">🩺</view>
      </view>
    </view>

    <!-- 热门医院 -->
    <view class="hospital-section">
      <view class="section-header">
        <text class="section-title">热门医院</text>
        <scroll-view class="category-tabs" scroll-x show-scrollbar="false">
          <view class="tab-item" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">全部</view>
          <view class="tab-item" :class="{ active: activeTab === 'comprehensive' }" @click="switchTab('comprehensive')">综合医院</view>
          <view class="tab-item" :class="{ active: activeTab === 'children' }" @click="switchTab('children')">儿童医院</view>
          <view class="tab-item" :class="{ active: activeTab === 'women' }" @click="switchTab('women')">妇产医院</view>
          <view class="tab-item" :class="{ active: activeTab === 'orthopedics' }" @click="switchTab('orthopedics')">骨科医院</view>
        </scroll-view>
      </view>
      <scroll-view class="hospital-scroll" scroll-x show-scrollbar="false">
        <view 
          v-for="hospital in hospitals" 
          :key="hospital.id" 
          class="hospital-card"
          @click="navigateToHospitalDetail(hospital)"
        >
          <view class="hospital-image">
            <image :src="hospital.image" mode="aspectFill" class="hospital-img"></image>
            <view class="hospital-badge">三甲</view>
            <view class="hospital-distance">{{ hospital.distance }}</view>
          </view>
          <view class="hospital-info">
            <text class="hospital-name">{{ hospital.name }}</text>
            <text class="hospital-appointments">{{ hospital.appointments }}人预约</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 专科专病 -->
    <view class="specialty-section">
      <view class="section-header-row">
        <text class="section-title">专科专病</text>
        <text class="view-more" @click="viewMoreSpecialties">查看更多></text>
      </view>
      <view class="specialty-grid">
        <view 
          v-for="specialty in specialties" 
          :key="specialty.id" 
          class="specialty-item"
          @click="navigateToSpecialtyDetail(specialty)"
        >
          <view class="specialty-icon">{{ specialty.icon }}</view>
          <text class="specialty-name">{{ specialty.name }}</text>
        </view>
      </view>
    </view>

    <!-- 严选专家 -->
    <view class="doctor-section">
      <view class="doctor-tabs">
        <scroll-view class="tabs-scroll" scroll-x show-scrollbar="false">
          <view 
            class="doctor-tab-item" 
            :class="{ active: activeDoctorTab === 'selected' }" 
            @click="switchDoctorTab('selected')"
          >
            严选专家
          </view>
          <view 
            class="doctor-tab-item" 
            :class="{ active: activeDoctorTab === 'dental' }" 
            @click="switchDoctorTab('dental')"
          >
            口腔专家
          </view>
          <view 
            class="doctor-tab-item" 
            :class="{ active: activeDoctorTab === 'orthopedic' }" 
            @click="switchDoctorTab('orthopedic')"
          >
            骨科专家
          </view>
          <view 
            class="doctor-tab-item" 
            :class="{ active: activeDoctorTab === 'gynecology' }" 
            @click="switchDoctorTab('gynecology')"
          >
            妇科专家
          </view>
          <view 
            class="doctor-tab-item" 
            :class="{ active: activeDoctorTab === 'pediatrics' }" 
            @click="switchDoctorTab('pediatrics')"
          >
            儿科
          </view>
        </scroll-view>
      </view>
      
      <view class="doctor-list">
        <view 
          v-for="doctor in doctors" 
          :key="doctor.id" 
          class="doctor-card"
          @click="selectDoctor(doctor.id)"
        >
          <view class="doctor-avatar">
            <image :src="doctor.avatar" mode="aspectFill" class="avatar-img"></image>
          </view>
          <button class="appointment-btn" @click.stop="handleDoctorAppointment(doctor.id)">预约</button>
          
          <view class="doctor-info">
            <view class="doctor-name-row">
              <text class="doctor-name">{{ doctor.name }}</text>
              <text class="doctor-title">{{ doctor.title }}</text>
            </view>
            <view class="doctor-hospital">{{ doctor.hospital }}</view>
            <view class="doctor-department">{{ doctor.department }}</view>
            <view class="doctor-specialties">
              <text class="specialties-label">擅长:</text>
              <text class="specialties-text">{{ doctor.specialties }}</text>
            </view>
            <view class="doctor-actions">
              <view class="action-item" @click.stop="handleAppointmentRegistration(doctor.id)">
                <uni-icons type="checkmarkempty" size="14" color="#4a90e2"></uni-icons>
                <text class="action-text">预约挂号(多点)</text>
              </view>
              <view class="action-item" @click.stop="handleOnlineConsultation(doctor.id)">
                <uni-icons type="checkmarkempty" size="14" color="#4a90e2"></uni-icons>
                <text class="action-text">在线咨询</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 医说 -->
    <view class="medical-talk-section">
      <view class="section-header-row">
        <text class="section-title">医说</text>
        <text class="view-more" @click="viewMoreMedicalTalk">查看更多></text>
      </view>
      
      <view class="article-list">
        <view 
          v-for="article in articles" 
          :key="article.id" 
          class="article-card"
          @click="selectArticle(article.id)"
        >
          <view class="article-content">
            <view class="article-title">{{ article.title }}</view>
            <view class="article-subtitle">{{ article.subtitle }}</view>
            <view class="article-meta">
              <text class="read-count">{{ article.readCount }}阅读</text>
              <text class="article-date">{{ article.date }}</text>
            </view>
          </view>
          <view class="article-image">
            <image :src="article.image" mode="aspectFill" class="article-img"></image>
          </view>
        </view>
      </view>
    </view>

  </view>
  
  <!-- 主题切换按钮 -->
  <ThemeToggle />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

// 检查登录状态
function checkLogin(): boolean {
  const token = uni.getStorageSync('token')
  if (!token) {
    // 未登录，跳转到登录页
    // 使用 reLaunch 确保清除当前页面栈，避免用户通过返回键回到首页
    uni.reLaunch({
      url: '/pages/login/login',
      fail: (err) => {
        console.error('跳转到登录页失败:', err)
        // 如果 reLaunch 失败，尝试使用 redirectTo
        uni.redirectTo({
          url: '/pages/login/login'
        })
      }
    })
    return false
  }
  return true
}

interface Hospital {
  id: number
  name: string
  distance: string
  appointments: string
  image: string
}

interface Specialty {
  id: number
  name: string
  icon: string
}

interface Doctor {
  id: number
  name: string
  title: string
  hospital: string
  department: string
  specialties: string
  avatar: string
}

interface Article {
  id: number
  title: string
  subtitle: string
  readCount: string
  date: string
  image: string
}

const activeTab = ref('all') // 热门医院分类：all, comprehensive, children, women, orthopedics
const activeDoctorTab = ref('selected')
// 当前城市
const currentCity = ref('北京')

// 医院数据
const hospitals = ref<Hospital[]>([
  { 
    id: 1, 
    name: '北京积水潭医院', 
    distance: '3.8km',
    appointments: '1950',
    image: '/static/hospital/hospital.png'
  },
  { 
    id: 2, 
    name: '北京儿童医院', 
    distance: '5.2km',
    appointments: '3240',
    image: '/static/hospital/hospital2.png'
  },
  { 
    id: 3, 
    name: '北京协和医院', 
    distance: '2.5km',
    appointments: '2580',
    image: '/static/hospital/hospital3.png'
  },
])

// 专科数据
const specialties = ref<Specialty[]>([
  { id: 1, name: '内科', icon: '🫀' },
  { id: 2, name: '外科', icon: '💉' },
  { id: 3, name: '儿科', icon: '👶' },
  { id: 4, name: '妇产科', icon: '👩‍🍼' },
  { id: 5, name: '眼科', icon: '👁️' },
  { id: 6, name: '口腔科', icon: '🦷' },
  { id: 7, name: '皮肤科', icon: '🩹' },
  { id: 8, name: '骨科', icon: '🦴' },
  { id: 9, name: '神经内科', icon: '🧠' },
  { id: 10, name: '心血管内科', icon: '❤️' },
])

// 医生数据
const doctors = ref<Doctor[]>([
  {
    id: 1,
    name: '王医生',
    title: '主任医师',
    hospital: '北京大学第一医院',
    department: '心血管内科',
    specialties: '心血管疾病、心脏病、冠心病、心胸血...',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
  },
  {
    id: 2,
    name: '王医生',
    title: '主任医师',
    hospital: '北京大学第一医院',
    department: '心血管内科',
    specialties: '心血管疾病、心脏病、冠心病、心胸血...',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg'
  },
  {
    id: 3,
    name: '王医生',
    title: '主任医师',
    hospital: '北京大学第一医院',
    department: '心血管内科',
    specialties: '心血管疾病、心脏病、冠心病、心胸血...',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg'
  },
  {
    id: 4,
    name: '王医生',
    title: '主任医师',
    hospital: '北京大学第一医院',
    department: '心血管内科',
    specialties: '心血管疾病、心脏病、冠心病、心胸血...',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg'
  },
  {
    id: 5,
    name: '王医生',
    title: '主任医师',
    hospital: '北京大学第一医院',
    department: '心血管内科',
    specialties: '心血管疾病、心脏病、冠心病、心胸血...',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg'
  }
])

// 医说文章数据
const articles = ref<Article[]>([
  {
    id: 1,
    title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
    subtitle: '元宵吃汤圆,有什么禁忌吗?',
    readCount: '8908',
    date: '2020-03-03',
    image: '/static/文章.png'
  },
  {
    id: 2,
    title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
    subtitle: '元宵吃汤圆,有什么禁忌吗?',
    readCount: '8908',
    date: '2020-03-03',
    image: '/static/文章.png'
  },
  {
    id: 3,
    title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
    subtitle: '元宵吃汤圆,有什么禁忌吗?',
    readCount: '8908',
    date: '2020-03-03',
    image: '/static/文章.png'
  },
  {
    id: 4,
    title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
    subtitle: '元宵吃汤圆,有什么禁忌吗?',
    readCount: '8908',
    date: '2020-03-03',
    image: '/static/文章.png'
  }
])

// 切换分类
const switchTab = (tab: string) => {
  activeTab.value = tab
  // 根据分类筛选医院数据（可以根据实际需求实现）
  console.log('切换到分类:', tab)
}

// 立即咨询
const handleConsult = () => {
  uni.navigateTo({
    url: '/pages/online-consult/index'
  })
}

// 预约挂号
const handleAppointment = () => {
  uni.navigateTo({
    url: '/pages/doctor/appointment-register'
  })
}

// 在线问诊
const handleOnlineConsult = () => {
  uni.navigateTo({
    url: '/pages/online-consult/index'
  })
}

// 跳转到医院详情页
const navigateToHospitalDetail = (hospital: Hospital) => {
  try {
    uni.navigateTo({
      url: `/pages/hospital-detail/index?name=${encodeURIComponent(hospital.name)}&distance=${encodeURIComponent(hospital.distance)}&id=${hospital.id}`,
      fail: (err) => {
        console.error('页面跳转失败:', err)
        uni.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  } catch (error) {
    console.error('跳转异常:', error)
    uni.showToast({
      title: '页面跳转异常',
      icon: 'none'
    })
  }
}

// 跳转到专科详情页
const navigateToSpecialtyDetail = (specialty: Specialty) => {
  try {
    uni.navigateTo({
      url: `/pages/specialty-hospital/index?specialty=${encodeURIComponent(specialty.name)}&id=${specialty.id}`,
      fail: (err) => {
        console.error('页面跳转失败:', err)
        uni.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  } catch (error) {
    console.error('跳转异常:', error)
    uni.showToast({
      title: '页面跳转异常',
      icon: 'none'
    })
  }
}

// 查看更多专科
const viewMoreSpecialties = () => {
  try {
    uni.navigateTo({
      url: '/pages/specialty-hospital/index?view=all',
      fail: (err) => {
        console.error('页面跳转失败:', err)
        uni.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  } catch (error) {
    console.error('跳转异常:', error)
    uni.showToast({
      title: '页面跳转异常',
      icon: 'none'
    })
  }
}

// 切换医生分类
const switchDoctorTab = (tab: string) => {
  activeDoctorTab.value = tab
}

// 选择医生
const selectDoctor = (doctorId: number) => {
  console.log('选择医生ID:', doctorId)
}

// 医生预约
const handleDoctorAppointment = (doctorId: number) => {
  uni.showToast({
    title: '预约医生',
    icon: 'none'
  })
  console.log('预约医生ID:', doctorId)
}

// 预约挂号
const handleAppointmentRegistration = (doctorId: number) => {
  uni.showToast({
    title: '预约挂号',
    icon: 'none'
  })
  console.log('预约挂号医生ID:', doctorId)
}

// 在线咨询
const handleOnlineConsultation = (doctorId: number) => {
  uni.showToast({
    title: '在线咨询',
    icon: 'none'
  })
  console.log('在线咨询医生ID:', doctorId)
}

// 查看更多医说
const viewMoreMedicalTalk = () => {
  uni.navigateTo({
    url: '/pages/yishuo/article-list',
    fail: (err) => {
      console.error('跳转失败:', err)
      uni.showToast({
        title: '跳转失败',
        icon: 'none'
      })
    }
  })
}

// 选择文章
const selectArticle = (articleId: number) => {
  uni.navigateTo({
    url: `/pages/yishuo/article-detail?id=${articleId}`,
    fail: (err) => {
      console.error('跳转失败:', err)
      uni.showToast({
        title: '跳转失败',
        icon: 'none'
      })
    }
  })
}

// 切换城市
const switchCity = () => {
  try {
    uni.navigateTo({
      url: `/pages/city/index?city=${encodeURIComponent(currentCity.value)}`,
      fail: (err) => {
        console.error('页面跳转失败:', err)
        uni.showToast({
          title: '页面跳转失败，请重新运行项目',
          icon: 'none',
          duration: 2000
        })
      }
    })
  } catch (error) {
    console.error('跳转异常:', error)
    uni.showToast({
      title: '页面跳转异常',
      icon: 'none'
    })
  }
}

// 更新城市（供城市选择页面调用）
const updateCity = (cityName: string) => {
  currentCity.value = cityName
  // 保存到本地存储
  uni.setStorageSync('currentCity', cityName)
}

// 读取城市信息
const loadCity = () => {
  const savedCity = uni.getStorageSync('currentCity')
  if (savedCity) {
    currentCity.value = savedCity
  }
}

// 页面加载时读取保存的城市
onMounted(() => {
  // 检查登录状态
  if (!checkLogin()) {
    return
  }
  loadCity()
})

// 页面卸载时清理事件监听
onUnmounted(() => {
  // @ts-ignore
  if (typeof uni !== 'undefined' && uni.$off) {
    // @ts-ignore
    uni.$off('cityChanged')
    // @ts-ignore
    uni.$off('articleReadCountUpdated')
  }
})

// 使用事件总线监听城市变化（实时更新）
// @ts-ignore
if (typeof uni !== 'undefined' && uni.$on) {
  // @ts-ignore
  uni.$on('cityChanged', (cityName: string) => {
    currentCity.value = cityName
    uni.setStorageSync('currentCity', cityName)
  })
  
  // 监听阅读数更新事件
  // @ts-ignore
  uni.$on('articleReadCountUpdated', (data: { articleId: number, readCount: string }) => {
    if (data && data.articleId) {
      const article = articles.value.find(a => a.id === data.articleId)
      if (article && data.readCount) {
        article.readCount = data.readCount
      }
    }
  })
}

// 页面显示时自动刷新城市（从城市选择页返回时会触发）
// uni-app 会自动识别 onShow 生命周期钩子
// @ts-ignore
function onShow() {
  // 每次显示页面时检查登录状态
  if (!checkLogin()) {
    return
  }
  loadCity()
}
</script>

<style lang="scss">
.container {
  background-color: var(--bg-color, #ffffff);
  min-height: 100vh;
  padding-bottom: 40rpx;
  transition: background-color 0.3s ease;
}

// 顶部状态栏和头部
.top-header {
  background: var(--card-bg, #fff);
  padding-top: var(--status-bar-height, 44px);
  transition: background-color 0.3s ease;
  
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10rpx 30rpx;
    padding-left: 30rpx;
    padding-right: 30rpx;
    box-sizing: border-box;
    font-size: 24rpx;
    height: 60rpx;
    
    .time {
      font-weight: bold;
      color: var(--text-color, #333);
      transition: color 0.3s ease;
    }
    
    .status-icons {
      display: flex;
      gap: 10rpx;
      color: var(--text-color, #333);
      transition: color 0.3s ease;
    }
  }
  
  .header {
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    padding-left: 30rpx;
    padding-right: 30rpx;
    box-sizing: border-box;
    gap: 20rpx;
    
    .location {
      display: flex;
      align-items: center;
      gap: 8rpx;
      white-space: nowrap;
      
      .location-text {
        font-size: 28rpx;
        color: var(--text-color, #333);
        transition: color 0.3s ease;
      }
    }
    
    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-color, #f5f5f5);
      border-radius: 50rpx;
      padding: 16rpx 24rpx;
      gap: 12rpx;
      transition: background-color 0.3s ease;
      
      .search-input {
        flex: 1;
        font-size: 26rpx;
        color: var(--text-color, #333);
        transition: color 0.3s ease;
      }
      
      .placeholder {
        color: var(--text-color-tertiary, #999);
      }
    }
    
    .chat-icon {
      padding: 8rpx;
    }
  }
}

// 橙色促销横幅
.promo-banner {
  background: linear-gradient(135deg, #FF8C42, #FFA366);
  margin: 20rpx 30rpx;
  border-radius: 24rpx;
  padding: 40rpx;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .banner-content {
    flex: 1;
    z-index: 2;
    
    .banner-title {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
      margin-bottom: 16rpx;
    }
    
    .banner-subtitle {
      font-size: 28rpx;
      color: #fff;
      margin-bottom: 8rpx;
      opacity: 0.95;
    }
    
    .banner-desc {
      font-size: 24rpx;
      color: #fff;
      margin-bottom: 30rpx;
      opacity: 0.9;
    }
    
    .consult-btn {
      background: rgba(255, 255, 255, 0.3);
      color: #fff;
      border: 2rpx solid #fff;
      border-radius: 50rpx;
      padding: 12rpx 40rpx;
      font-size: 28rpx;
      font-weight: bold;
      width: auto;
      line-height: 1.5;
    }
  }
  
  .banner-image {
    width: 200rpx;
    height: 200rpx;
    position: relative;
    z-index: 1;
    
    .doctor-placeholder {
      font-size: 120rpx;
      opacity: 0.3;
    }
  }
}

// 服务卡片
.service-cards {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx;
  padding-left: 30rpx;
  padding-right: 30rpx;
  box-sizing: border-box;
  padding-left: 30rpx;
  padding-right: 30rpx;
  margin-bottom: 40rpx;
  box-sizing: border-box;
  
  .service-card {
    flex: 1;
    background: var(--card-bg, #fff);
    border-radius: 20rpx;
    padding: 30rpx;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx var(--shadow-color, rgba(0, 0, 0, 0.08));
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12rpx;
      
      .card-title {
        font-size: 32rpx;
        font-weight: bold;
        color: var(--text-color, #333);
        transition: color 0.3s ease;
      }
    }
    
    .card-subtitle {
      font-size: 24rpx;
      color: var(--text-color-secondary, #666);
      margin-bottom: 16rpx;
      transition: color 0.3s ease;
    }
    
    .card-tag {
      display: inline-flex;
      align-items: center;
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
      font-size: 20rpx;
      color: #fff;
      
      &.orange {
        background: #FF8C42;
      }
      
      &.blue {
        background: #4A90E2;
        gap: 4rpx;
        
        .lightning {
          font-size: 20rpx;
        }
      }
    }
    
    .card-bg-icon {
      position: absolute;
      right: 20rpx;
      bottom: 20rpx;
      font-size: 80rpx;
      opacity: 0.1;
    }
  }
}

// 热门医院
.hospital-section {
  margin-bottom: 40rpx;
  
  .section-header {
    padding: 0 30rpx 20rpx;
    padding-left: 30rpx;
    padding-right: 30rpx;
    box-sizing: border-box;
    
    .section-title {
      font-size: 36rpx;
      font-weight: bold;
      color: var(--text-color, #333);
      margin-bottom: 20rpx;
      display: block;
      transition: color 0.3s ease;
    }
    
    .category-tabs {
      white-space: nowrap;
      /* 隐藏滚动条 */
      ::-webkit-scrollbar {
        display: none;
      }
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE 10+ */
      
      .tab-item {
        display: inline-block;
        padding: 12rpx 24rpx;
        margin-right: 16rpx;
        background: var(--bg-color, #f5f5f5);
        border-radius: 30rpx;
        font-size: 26rpx;
        color: var(--text-color-secondary, #666);
        transition: background-color 0.3s ease, color 0.3s ease;
        
        &.active {
          background: var(--primary-color, #4A90E2);
          color: #fff;
          font-weight: bold;
        }
      }
    }
  }
  
  .hospital-scroll {
    white-space: nowrap;
    padding: 0 30rpx;
  padding-left: 30rpx;
  padding-right: 30rpx;
  box-sizing: border-box;
    /* 隐藏滚动条 */
    ::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
    
    .hospital-card {
      display: inline-block;
      width: 280rpx;
      margin-right: 20rpx;
      background: var(--card-bg, #fff);
      border-radius: 16rpx;
      overflow: hidden;
      box-shadow: 0 2rpx 8rpx var(--shadow-color, rgba(0, 0, 0, 0.08));
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      
      .hospital-image {
        position: relative;
        width: 100%;
        height: 200rpx;
        background: #f0f0f0;
        
        .hospital-img {
          width: 100%;
          height: 100%;
        }
        
        .hospital-badge {
          position: absolute;
          top: 12rpx;
          left: 12rpx;
          background: rgba(255, 140, 66, 0.9);
          color: #fff;
          font-size: 20rpx;
          padding: 4rpx 12rpx;
          border-radius: 8rpx;
        }
        
        .hospital-distance {
          position: absolute;
          top: 12rpx;
          right: 12rpx;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          font-size: 20rpx;
          padding: 4rpx 12rpx;
          border-radius: 8rpx;
        }
      }
      
      .hospital-info {
        padding: 20rpx;
        
        .hospital-name {
          display: block;
          font-size: 28rpx;
          font-weight: bold;
          color: var(--text-color, #333);
          margin-bottom: 8rpx;
          transition: color 0.3s ease;
        }
        
        .hospital-appointments {
          display: block;
          font-size: 24rpx;
          color: var(--text-color-tertiary, #999);
          transition: color 0.3s ease;
        }
      }
    }
  }
}

// 专科专病
.specialty-section {
  padding: 0 30rpx 40rpx;
  
  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .section-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
    
    .view-more {
      font-size: 26rpx;
      color: #999;
    }
  }
  
  .specialty-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 24rpx;
    
    .specialty-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      
      .specialty-icon {
        font-size: 48rpx;
        width: 80rpx;
        height: 80rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-color, #f8f9fa);
        border-radius: 16rpx;
        transition: background-color 0.3s ease;
      }
      
      .specialty-name {
        font-size: 24rpx;
        color: var(--text-color, #333);
        text-align: center;
        transition: color 0.3s ease;
      }
    }
  }
}

// 严选专家
.doctor-section {
  background-color: var(--bg-color, #f5f5f5);
  padding: 30rpx 0 40rpx;
  transition: background-color 0.3s ease;
  
  .doctor-tabs {
    padding: 0 30rpx 20rpx;
    padding-left: 30rpx;
    padding-right: 30rpx;
    box-sizing: border-box;
    
    .tabs-scroll {
      white-space: nowrap;
      /* 隐藏滚动条 */
      ::-webkit-scrollbar {
        display: none;
      }
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE 10+ */
      
      .doctor-tab-item {
        display: inline-block;
        padding: 12rpx 24rpx;
        margin-right: 16rpx;
        background: var(--card-bg, #fff);
        border-radius: 30rpx;
        font-size: 26rpx;
        color: var(--text-color-secondary, #666);
        white-space: nowrap;
        transition: background-color 0.3s ease, color 0.3s ease;
        
        &.active {
          background: var(--primary-color, #4a90e2);
          color: #fff;
          font-weight: bold;
        }
      }
    }
  }
  
  .doctor-list {
    padding: 0 30rpx;
  padding-left: 30rpx;
  padding-right: 30rpx;
  box-sizing: border-box;
    
    .doctor-card {
      background: var(--card-bg, #fff);
      border-radius: 16rpx;
      padding: 30rpx;
      margin-bottom: 20rpx;
      position: relative;
      display: flex;
      transition: background-color 0.3s ease;
      
      .doctor-avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 24rpx;
        flex-shrink: 0;
        background: #f0f0f0;
        
        .avatar-img {
          width: 100%;
          height: 100%;
        }
      }
      
      .appointment-btn {
        position: absolute;
        top: 30rpx;
        right: 30rpx;
        background: #4a90e2;
        color: #fff;
        border: none;
        border-radius: 30rpx;
        padding: 8rpx 24rpx;
        font-size: 24rpx;
        line-height: 1.5;
        width: auto;
        height: auto;
        
        &::after {
          border: none;
        }
      }
      
      .doctor-info {
        flex: 1;
        min-width: 0;
        
        .doctor-name-row {
          display: flex;
          align-items: baseline;
          margin-bottom: 8rpx;
          
          .doctor-name {
            font-size: 32rpx;
            font-weight: bold;
            color: var(--text-color, #333);
            margin-right: 12rpx;
            transition: color 0.3s ease;
          }
          
          .doctor-title {
            font-size: 24rpx;
            color: var(--text-color-secondary, #666);
            transition: color 0.3s ease;
          }
        }
        
        .doctor-hospital {
          font-size: 26rpx;
          color: var(--text-color, #333);
          margin-bottom: 4rpx;
          transition: color 0.3s ease;
        }
        
        .doctor-department {
          font-size: 24rpx;
          color: var(--text-color-secondary, #666);
          margin-bottom: 12rpx;
          transition: color 0.3s ease;
        }
        
        .doctor-specialties {
          font-size: 24rpx;
          color: var(--text-color-secondary, #666);
          margin-bottom: 16rpx;
          line-height: 1.5;
          transition: color 0.3s ease;
          
          .specialties-label {
            color: var(--text-color-secondary, #666);
            transition: color 0.3s ease;
          }
          
          .specialties-text {
            color: var(--text-color, #333);
            transition: color 0.3s ease;
          }
        }
        
        .doctor-actions {
          display: flex;
          gap: 24rpx;
          
          .action-item {
            display: flex;
            align-items: center;
            gap: 6rpx;
            
            .action-text {
              font-size: 24rpx;
              color: var(--primary-color, #4a90e2);
              transition: color 0.3s ease;
            }
          }
        }
      }
    }
  }
}

// 医说
.medical-talk-section {
  padding: 40rpx 30rpx;
  background-color: var(--card-bg, #fff);
  transition: background-color 0.3s ease;
  
  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .section-title {
      font-size: 36rpx;
      font-weight: bold;
      color: var(--text-color, #333);
      transition: color 0.3s ease;
    }
    
    .view-more {
      font-size: 26rpx;
      color: var(--text-color-tertiary, #999);
      transition: color 0.3s ease;
    }
  }
  
  .article-list {
    .article-card {
      background: var(--card-bg, #fff);
      border-radius: 16rpx;
      padding: 30rpx;
      margin-bottom: 20rpx;
      display: flex;
      box-shadow: 0 2rpx 8rpx var(--shadow-color, rgba(0, 0, 0, 0.05));
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      
      .article-content {
        flex: 1;
        min-width: 0;
        margin-right: 20rpx;
        
        .article-title {
          font-size: 30rpx;
          font-weight: bold;
          color: var(--text-color, #333);
          line-height: 1.5;
          margin-bottom: 12rpx;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          transition: color 0.3s ease;
          line-clamp: 2;
          overflow: hidden;
        }
        
        .article-subtitle {
          font-size: 24rpx;
          color: var(--text-color-tertiary, #999);
          line-height: 1.5;
          margin-bottom: 16rpx;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          line-clamp: 1;
          overflow: hidden;
          transition: color 0.3s ease;
        }
        
        .article-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .read-count {
            font-size: 22rpx;
            color: var(--text-color-tertiary, #999);
            transition: color 0.3s ease;
          }
          
          .article-date {
            font-size: 22rpx;
            color: var(--text-color-tertiary, #999);
            transition: color 0.3s ease;
          }
        }
      }
      
      .article-image {
        width: 160rpx;
        height: 160rpx;
        border-radius: 12rpx;
        overflow: hidden;
        flex-shrink: 0;
        background: #f0f0f0;
        
        .article-img {
          width: 100%;
          height: 100%;
        }
      }
    }
  }
}

</style>

