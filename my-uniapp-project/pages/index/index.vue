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
            v-model="searchKeyword"
            placeholder="搜索医院、科室、疾病、医生"
            placeholder-class="placeholder"
            confirm-type="search"
            @confirm="handleSearch"
          />
        </view>
        <view class="chat-icon">
          <uni-icons type="chatbubbles" size="20" color="#333"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 橙色促销横幅（拆分为问诊+直播两部分） -->
    <view class="promo-banner">
      <!-- 上半部分：随时随地问医生 -->
      <view class="banner-main">
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

      <!-- 下半部分：医生直播入口 -->
      <view class="live-banner" @click="handleLiveStream">
        <view class="live-info">
          <view class="live-title">医生直播</view>
          <view class="live-subtitle">名医实时讲解，在线答疑</view>
        </view>
        <view class="live-status">
          <view class="live-dot"></view>
          <text class="live-status-text">直播中</text>
        </view>
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
            <video 
              v-if="article.mediaType === 'video' && article.video"
              :src="getVideoUrl(article.video)"
              class="article-video-thumb"
              :controls="false"
              :show-center-play-btn="true"
              :show-play-btn="false"
              :enable-play-gesture="false"
              object-fit="cover"
              :poster="getVideoPoster(article) || undefined"
            ></video>
            <image 
              v-else
              :src="article.image" 
              mode="aspectFill" 
              class="article-img"
            ></image>
          </view>
        </view>
      </view>
    </view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, onMounted, onUnmounted } from 'vue'
import ThemeToggle from '../../components/ThemeToggle.vue'
import { getAllArticles } from '../../utils/articleStorage'
import { API_BASE_URL } from '../../utils/config.example'
import { getDoctorList } from '../../api/doctor.js'

declare const uni: any;
declare const plus: any;
declare function getCurrentPages(): any[];
declare function getApp(): any;

function checkLogin(): boolean {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.reLaunch({ url: '/pages/login/login', fail: () => { uni.redirectTo({ url: '/pages/login/login' }) } })
    return false
  }
  return true
}

interface Hospital { id: number; name: string; distance: string; appointments: string; image: string }
interface Specialty { id: number; name: string; icon: string }
interface Doctor { id: any; name: string; title: string; hospital: string; department: string; specialties: string; avatar: string }
interface Article { id: number; title: string; subtitle: string; readCount: string; date: string; image: string; video?: string; mediaType?: string }

const searchKeyword = ref('')
const activeTab = ref('all')
const activeDoctorTab = ref('selected')
const currentCity = ref('北京')

const hospitals = ref<Hospital[]>([
  { id: 1, name: '北京积水潭医院', distance: '3.8km', appointments: '1950', image: '/static/hospital/hospital.png' },
  { id: 2, name: '北京儿童医院', distance: '5.2km', appointments: '3240', image: '/static/hospital/hospital2.png' },
  { id: 3, name: '北京协和医院', distance: '2.5km', appointments: '2580', image: '/static/hospital/hospital3.png' },
])

const specialties = ref<Specialty[]>([
  { id: 1, name: '内科', icon: '🫀' }, { id: 2, name: '外科', icon: '💉' },
  { id: 3, name: '儿科', icon: '👶' }, { id: 4, name: '妇产科', icon: '👩‍🍼' },
  { id: 5, name: '眼科', icon: '👁️' }, { id: 6, name: '口腔科', icon: '🦷' },
  { id: 7, name: '皮肤科', icon: '🩹' }, { id: 8, name: '骨科', icon: '🦴' },
  { id: 9, name: '神经内科', icon: '🧠' }, { id: 10, name: '心血管内科', icon: '❤️' },
])

const defaultDoctors: Doctor[] = [
  { id: 1, name: '王医生', title: '主任医师', hospital: '北京大学第一医院', department: '心血管内科', specialties: '心血管疾病、心脏病、冠心病', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: '李医生', title: '副主任医师', hospital: '北京协和医院', department: '内科', specialties: '消化内科、胃肠疾病', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, name: '张医生', title: '主治医师', hospital: '北京儿童医院', department: '儿科', specialties: '小儿呼吸、发育迟缓', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
]
const doctors = ref<Doctor[]>(defaultDoctors)

const articles = ref<Article[]>([])

// 从后端加载医生列表
const loadDoctors = async () => {
  try {
    const res = await getDoctorList({ pageSize: 10 })
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      doctors.value = res.data.map((d: any) => ({
        id: d.id || d._id,
        name: d.name || '医生',
        title: d.title || '医师',
        hospital: d.hospital || '本院',
        department: d.department || '',
        specialties: d.specialties || '',
        avatar: d.avatar || `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 50)}.jpg`,
      }))
    }
  } catch (e) {
    console.warn('加载医生列表失败，使用默认数据', e)
  }
}

const getFullFileUrl = (pathStr: string): string => {
  if (!pathStr) return ''
  const path = String(pathStr).trim()
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/static/')) return path
  let baseOrigin = API_BASE_URL.replace(/\/api$/, '')
  if (!baseOrigin || baseOrigin === '/' || baseOrigin.startsWith('/')) baseOrigin = 'http://localhost:3000'
  if (!baseOrigin || baseOrigin === '/' || baseOrigin.startsWith('/')) {
    baseOrigin = (API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '')
  }
  
  return `${baseOrigin}${path}`
}

const getVideoUrl = (url: string | undefined): string => {
  if (!url) return ''
  const urlStr = String(url).trim()
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr
  return getFullFileUrl(urlStr)
}

const getVideoPoster = (article: Article): string | null => {
  if (article.image && article.image !== '/static/logo.png' && article.image.trim() !== '') {
    if (article.image.startsWith('http://') || article.image.startsWith('https://')) return article.image
    return getFullFileUrl(article.image)
  }
  return null
}

const loadArticles = () => {
  try {
    const savedArticles = getAllArticles()
    articles.value = (savedArticles || []).slice(0, 4) as Article[]
  } catch (error) {
    articles.value = []
  }
}

const switchTab = (tab: string) => { activeTab.value = tab }
const handleSearch = () => {
  const kw = (searchKeyword.value || '').trim()
  if (!kw) return
  // 搜索医生列表中的匹配项
  const matchedDoctor = doctors.value.find((d: Doctor) => 
    d.name.includes(kw) || d.department.includes(kw) || d.specialties.includes(kw) || d.hospital.includes(kw)
  )
  if (matchedDoctor) {
    uni.navigateTo({ url: `/pages/doctor/detail?id=${matchedDoctor.id}` })
    return
  }
  // 搜索科室
  const matchedSpec = specialties.value.find((s: Specialty) => s.name.includes(kw))
  if (matchedSpec) {
    uni.navigateTo({ url: `/pages/specialty-hospital/index?specialty=${encodeURIComponent(matchedSpec.name)}&id=${matchedSpec.id}` })
    return
  }
  // 搜索医院
  const matchedHospital = hospitals.value.find((h: Hospital) => h.name.includes(kw))
  if (matchedHospital) {
    uni.navigateTo({ url: `/pages/hospital-detail/index?name=${encodeURIComponent(matchedHospital.name)}&id=${matchedHospital.id}` })
    return
  }
  // 无精确匹配，跳转到科室页面搜索
  uni.navigateTo({ url: `/pages/doctor/department?keyword=${encodeURIComponent(kw)}` })
}
const handleConsult = () => { uni.navigateTo({ url: '/pages/online-consult/index' }) }
const handleLiveStream = () => { uni.navigateTo({ url: '/pages/live/entrance' }) }
const handleAppointment = () => { uni.navigateTo({ url: '/pages/doctor/appointment-register' }) }
const handleOnlineConsult = () => { uni.navigateTo({ url: '/pages/online-consult/index' }) }

const navigateToHospitalDetail = (hospital: Hospital) => {
  uni.navigateTo({ url: `/pages/hospital-detail/index?name=${encodeURIComponent(hospital.name)}&distance=${encodeURIComponent(hospital.distance)}&id=${hospital.id}` })
}
const navigateToSpecialtyDetail = (specialty: Specialty) => {
  uni.navigateTo({ url: `/pages/specialty-hospital/index?specialty=${encodeURIComponent(specialty.name)}&id=${specialty.id}` })
}
const viewMoreSpecialties = () => { uni.navigateTo({ url: '/pages/specialty-hospital/index?view=all' }) }
const switchDoctorTab = (tab: string) => { activeDoctorTab.value = tab }

const selectDoctor = (doctorId: any) => {
  uni.navigateTo({ url: `/pages/doctor/detail?id=${doctorId}` })
}
const handleDoctorAppointment = (doctorId: any) => {
  uni.navigateTo({ url: `/pages/doctor/appointment?doctorId=${doctorId}` })
}
const handleAppointmentRegistration = (doctorId: any) => {
  uni.navigateTo({ url: `/pages/doctor/appointment-register?doctorId=${doctorId}` })
}
const handleOnlineConsultation = (doctorId: any) => {
  uni.navigateTo({ url: `/pages/online-consult/index?doctorId=${doctorId}` })
}

const viewMoreMedicalTalk = () => { uni.navigateTo({ url: '/pages/yishuo/article-list' }) }
const selectArticle = (articleId: number) => { uni.navigateTo({ url: `/pages/yishuo/article-detail?id=${articleId}` }) }

const switchCity = () => {
  uni.navigateTo({ url: `/pages/city/index?city=${encodeURIComponent(currentCity.value)}` })
}
const loadCity = () => {
  const savedCity = uni.getStorageSync('currentCity')
  if (savedCity) currentCity.value = savedCity
}

onMounted(() => {
  if (!checkLogin()) return
  loadCity()
  loadArticles()
  loadDoctors()
})

onUnmounted(() => {
  // @ts-ignore
  if (typeof uni !== 'undefined' && uni.$off) {
    // @ts-ignore
    uni.$off('cityChanged'); uni.$off('articleReadCountUpdated'); uni.$off('articlesUpdated')
  }
})

// @ts-ignore
if (typeof uni !== 'undefined' && uni.$on) {
  // @ts-ignore
  uni.$on('cityChanged', (cityName: string) => { currentCity.value = cityName; uni.setStorageSync('currentCity', cityName) })
  // @ts-ignore
  uni.$on('articleReadCountUpdated', (data: { articleId: number, readCount: string }) => {
    if (data?.articleId) { const a = articles.value.find(x => x.id === data.articleId); if (a) a.readCount = data.readCount }
  })
  // @ts-ignore
  uni.$on('articlesUpdated', () => { loadArticles() })
}

// @ts-ignore
function onShow() {
  if (!checkLogin()) return
  loadCity()
  loadArticles()
}
</script>

<style lang="scss">
.container { background: #f7f8fa; min-height: 100vh; padding-bottom: 40rpx; }

.top-header {
  background: #fff; padding-top: var(--status-bar-height, 44px);
  .status-bar { height: 20rpx; }
  .header { display: flex; align-items: center; padding: 16rpx 24rpx; gap: 16rpx;
    .location { display: flex; align-items: center; gap: 6rpx; white-space: nowrap;
      .location-text { font-size: 28rpx; color: #333; }
    }
    .search-box { flex: 1; display: flex; align-items: center; background: #f5f5f5; border-radius: 40rpx; padding: 14rpx 20rpx; gap: 10rpx;
      .search-input { flex: 1; font-size: 26rpx; color: #333; }
      .placeholder { color: #999; }
    }
    .chat-icon { padding: 8rpx; }
  }
}

.promo-banner {
  background: linear-gradient(135deg, #4a90e2, #667eea); margin: 16rpx 24rpx; border-radius: 16rpx; padding: 32rpx; overflow: hidden; display: flex; flex-direction: column; gap: 16rpx;
  .banner-main { display: flex; justify-content: space-between; align-items: center; }
  .banner-content { flex: 1;
    .banner-title { font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 8rpx; }
    .banner-subtitle { font-size: 24rpx; color: rgba(255,255,255,0.9); margin-bottom: 4rpx; }
    .banner-desc { font-size: 22rpx; color: rgba(255,255,255,0.8); margin-bottom: 20rpx; }
    .consult-btn { background: rgba(255,255,255,0.25); color: #fff; border: 1rpx solid rgba(255,255,255,0.6); border-radius: 40rpx; padding: 10rpx 32rpx; font-size: 26rpx; width: auto; line-height: 1.5; }
  }
  .banner-image { width: 140rpx; height: 140rpx; .doctor-placeholder { font-size: 80rpx; opacity: 0.3; } }
  .live-banner { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; border-radius: 12rpx; background: rgba(255,255,255,0.15); }
  .live-info { display: flex; flex-direction: column; gap: 4rpx; }
  .live-title { font-size: 28rpx; font-weight: bold; color: #fff; }
  .live-subtitle { font-size: 22rpx; color: rgba(255,255,255,0.85); }
  .live-status { display: flex; align-items: center; gap: 6rpx; }
  .live-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #ff4d4f; animation: pulse 1.4s infinite; }
  .live-status-text { font-size: 22rpx; color: #fff; }
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

.service-cards {
  display: flex; gap: 16rpx; padding: 0 24rpx; margin-bottom: 24rpx;
  .service-card { flex: 1; background: #fff; border-radius: 12rpx; padding: 24rpx; position: relative; overflow: hidden;
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx;
      .card-title { font-size: 30rpx; font-weight: bold; color: #333; }
    }
    .card-subtitle { font-size: 22rpx; color: #888; margin-bottom: 12rpx; }
    .card-tag { display: inline-block; padding: 4rpx 14rpx; border-radius: 16rpx; font-size: 20rpx; color: #fff;
      &.orange { background: #ff8c42; } &.blue { background: #4a90e2; .lightning { font-size: 20rpx; } }
    }
    .card-bg-icon { position: absolute; right: 16rpx; bottom: 16rpx; font-size: 64rpx; opacity: 0.08; }
  }
}

.hospital-section {
  margin-bottom: 24rpx;
  .section-header { padding: 0 24rpx 16rpx;
    .section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; display: block; }
    .category-tabs { white-space: nowrap;
      .tab-item { display: inline-block; padding: 10rpx 20rpx; margin-right: 12rpx; background: #f0f0f0; border-radius: 24rpx; font-size: 24rpx; color: #666;
        &.active { background: #4a90e2; color: #fff; font-weight: bold; }
      }
    }
  }
  .hospital-scroll { white-space: nowrap; padding: 0 24rpx;
    .hospital-card { display: inline-block; width: 260rpx; margin-right: 16rpx; background: #fff; border-radius: 12rpx; overflow: hidden;
      .hospital-image { position: relative; width: 100%; height: 180rpx; background: #eee;
        .hospital-img { width: 100%; height: 100%; }
        .hospital-badge { position: absolute; top: 8rpx; left: 8rpx; background: rgba(255,140,66,0.9); color: #fff; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
        .hospital-distance { position: absolute; top: 8rpx; right: 8rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
      }
      .hospital-info { padding: 14rpx;
        .hospital-name { display: block; font-size: 26rpx; font-weight: bold; color: #333; margin-bottom: 4rpx; }
        .hospital-appointments { display: block; font-size: 22rpx; color: #999; }
      }
    }
  }
}

.specialty-section {
  padding: 0 24rpx 24rpx;
  .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx;
    .section-title { font-size: 32rpx; font-weight: bold; color: #333; }
    .view-more { font-size: 24rpx; color: #999; }
  }
  .specialty-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20rpx;
    .specialty-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx;
      .specialty-icon { font-size: 40rpx; width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; background: #f0f4ff; border-radius: 14rpx; }
      .specialty-name { font-size: 22rpx; color: #555; text-align: center; }
    }
  }
}

.doctor-section {
  background: #f7f8fa; padding: 24rpx 0;
  .doctor-tabs { padding: 0 24rpx 16rpx;
    .tabs-scroll { white-space: nowrap;
      .doctor-tab-item { display: inline-block; padding: 10rpx 20rpx; margin-right: 12rpx; background: #fff; border-radius: 24rpx; font-size: 24rpx; color: #666;
        &.active { background: #4a90e2; color: #fff; font-weight: bold; }
      }
    }
  }
  .doctor-list { padding: 0 24rpx;
    .doctor-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; position: relative; display: flex;
      .doctor-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; overflow: hidden; margin-right: 20rpx; flex-shrink: 0; background: #eee;
        .avatar-img { width: 100%; height: 100%; }
      }
      .appointment-btn { position: absolute; top: 24rpx; right: 24rpx; background: #4a90e2; color: #fff; border: none; border-radius: 24rpx; padding: 6rpx 20rpx; font-size: 22rpx; line-height: 1.5; width: auto; height: auto; &::after { border: none; } }
      .doctor-info { flex: 1; min-width: 0;
        .doctor-name-row { display: flex; align-items: baseline; margin-bottom: 6rpx;
          .doctor-name { font-size: 30rpx; font-weight: bold; color: #333; margin-right: 10rpx; }
          .doctor-title { font-size: 22rpx; color: #888; }
        }
        .doctor-hospital { font-size: 24rpx; color: #555; margin-bottom: 2rpx; }
        .doctor-department { font-size: 22rpx; color: #888; margin-bottom: 8rpx; }
        .doctor-specialties { font-size: 22rpx; color: #888; margin-bottom: 12rpx; line-height: 1.4;
          .specialties-label { color: #888; } .specialties-text { color: #555; }
        }
        .doctor-actions { display: flex; gap: 20rpx;
          .action-item { display: flex; align-items: center; gap: 4rpx;
            .action-text { font-size: 22rpx; color: #4a90e2; }
          }
        }
      }
    }
  }
}

.medical-talk-section {
  padding: 24rpx;
  .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx;
    .section-title { font-size: 32rpx; font-weight: bold; color: #333; }
    .view-more { font-size: 24rpx; color: #999; }
  }
  .article-list {
    .article-card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 12rpx; display: flex;
      .article-content { flex: 1; min-width: 0; margin-right: 16rpx;
        .article-title { font-size: 28rpx; font-weight: bold; color: #333; line-height: 1.4; margin-bottom: 8rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
        .article-subtitle { font-size: 22rpx; color: #999; margin-bottom: 10rpx; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; line-clamp: 1; overflow: hidden; }
        .article-meta { display: flex; justify-content: space-between;
          .read-count, .article-date { font-size: 20rpx; color: #bbb; }
        }
      }
      .article-image { width: 140rpx; height: 140rpx; border-radius: 10rpx; overflow: hidden; flex-shrink: 0; background: #eee;
        .article-img, .article-video-thumb { width: 100%; height: 100%; }
      }
    }
  }
}
</style>

