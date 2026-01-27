<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="top-header">
      <uni-icons type="left" size="24" color="#333" @click="navigateBack"></uni-icons>
      <text class="nav-title">医院详情页</text>
      <uni-icons type="star" size="24" color="#333" @click="toggleFavorite"></uni-icons>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <uni-icons type="spinner" size="36" color="#4a90e2" animation="spin"></uni-icons>
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-container">
      <uni-icons type="closeempty" size="64" color="#ff4d4f"></uni-icons>
      <text class="error-text">{{ error }}</text>
      <button class="retry-btn" @click="fetchHospitalDetail">重新加载</button>
    </view>
    
    <!-- 医院详情内容 -->
    <view v-else-if="hospital" class="hospital-detail">
      <!-- 医院基本信息 -->
      <view class="hospital-basic">
        <view class="hospital-header-section">
          <view class="hospital-image">
            <image :src="hospitalImage" mode="aspectFill" class="hospital-img"></image>
          </view>
          
          <view class="hospital-info-main">
            <text class="hospital-name">{{ hospital.name }}</text>
            
            <view class="hospital-tags">
              <view class="tag level-tag">{{ hospital.level }}</view>
              <view class="tag type-tag">综合医院</view>
              <view class="tag insurance-tag">非定点医保</view>
            </view>
            
            <view class="hospital-rank">
              <view class="rank-item">
                <text class="rank-label">综合排名</text>
                <text class="rank-value">第一</text>
              </view>
              
              <view class="department-tags">
                <text class="department-tag" v-for="(dept, index) in hospital.departments.slice(0, 3)" :key="index">
                  {{ dept }}
                </text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 导航标签栏 -->
        <view class="nav-tabs">
          <view 
            v-for="tab in navTabs" 
            :key="tab.key" 
            class="tab-item" 
            :class="{ active: activeTab === tab.key }" 
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </view>
        </view>
      </view>
      
      <!-- 内容区域 -->
      <view class="content-area">
        <!-- 就医服务 -->
        <view v-if="activeTab === 'service'" class="service-section">
          <view class="service-cards">
              <view class="service-card" @click="navigateToAppointment">
                <view class="service-icon appointment"></view>
                <text class="service-title">门诊挂号</text>
                <text class="service-desc">门诊号源在线预约</text>
              </view>
              
              <view class="service-card" @click="navigateToInternetAppointment">
                <view class="service-icon internet"></view>
                <text class="service-title">互联网预约</text>
                <text class="service-desc">足不出户在线问诊</text>
              </view>
              
              <view class="service-card" @click="navigateToSmartConsult">
                <view class="service-icon guide"></view>
                <text class="service-title">智能导诊</text>
                <text class="service-desc">症状自测精准导医</text>
              </view>
            </view>
            
            <!-- 就诊指南 -->
            <view class="guide-section">
              <view class="section-header">
                <text class="section-title">就诊指南</text>
              </view>
              <view class="guide-content">
                <view class="guide-item">
                  <view class="guide-icon">📅</view>
                  <view class="guide-info">
                    <text class="guide-title">门诊时间</text>
                    <text class="guide-desc">周一至周五：8:00-17:00；周六：8:00-12:00</text>
                  </view>
                </view>
                <view class="guide-item">
                  <view class="guide-icon">💰</view>
                  <view class="guide-info">
                    <text class="guide-title">挂号费用</text>
                    <text class="guide-desc">普通号：10元；专家号：50-100元</text>
                  </view>
                </view>
                <view class="guide-item">
                  <view class="guide-icon">📱</view>
                  <view class="guide-info">
                    <text class="guide-title">预约方式</text>
                    <text class="guide-desc">支持在线预约、电话预约、现场预约</text>
                  </view>
                </view>
                <view class="guide-item">
                  <view class="guide-icon">👨‍⚕️</view>
                  <view class="guide-info">
                    <text class="guide-title">就诊流程</text>
                    <text class="guide-desc">1. 预约挂号 → 2. 到院签到 → 3. 候诊 → 4. 就诊 → 5. 缴费 → 6. 取药/检查</text>
                  </view>
                </view>
              </view>
            </view>
            
            <!-- 医院联系方式 -->
            <view class="contact-section">
              <view class="section-header">
                <text class="section-title">联系方式</text>
              </view>
              <view class="contact-content">
                <view class="contact-item">
                  <view class="contact-icon">📞</view>
                  <view class="contact-info">
                    <text class="contact-label">咨询电话</text>
                    <text class="contact-value">{{ hospital.phone || '010-58266699' }}</text>
                  </view>
                </view>
                <view class="contact-item">
                  <view class="contact-icon">📍</view>
                  <view class="contact-info">
                    <text class="contact-label">医院地址</text>
                    <text class="contact-value">{{ hospital.address }}</text>
                  </view>
                </view>
              </view>
            </view>
        </view>
        
        <!-- 重点科室 -->
        <view v-if="activeTab === 'departments'" class="departments-section">
          <view class="section-header-row">
            <text class="section-title">重点科室</text>
            <text class="view-more" @click="viewAllDepartments">查看更多 ></text>
          </view>
          
          <view class="departments-grid">
            <view 
              v-for="(dept, index) in hospital.departments" 
              :key="index" 
              class="department-item"
              @click="selectDepartment(dept)"
            >
              {{ dept }}
            </view>
          </view>
        </view>
        
        <!-- 患者评价 -->
        <view v-if="activeTab === 'comments'" class="comments-section">
          <!-- 评价统计 -->
          <view class="comments-stats">
            <view class="rating-overview">
              <view class="rating-main">
                <text class="rating-score">{{ averageRating.toFixed(1) }}</text>
                <view class="rating-stars">
                  <text v-for="i in 5" :key="i" class="star" :class="{ 'active': i <= Math.round(averageRating) }">★</text>
                </view>
              </view>
              <text class="rating-count">{{ totalComments }} 条评价</text>
            </view>
            
            <!-- 评分分布 -->
            <view class="rating-distribution">
              <view class="distribution-item" v-for="i in 5" :key="i">
                <text class="distribution-label">{{ i }}星</text>
                <view class="distribution-bar">
                  <view class="bar-fill" :style="{ width: `${Math.random() * 100}%` }"></view>
                </view>
                <text class="distribution-count">{{ Math.floor(Math.random() * 20) }}</text>
              </view>
            </view>
          </view>
          
          <!-- 评价列表 -->
          <view class="comments-list">
            <view 
              v-for="comment in comments" 
              :key="comment.id" 
              class="comment-item"
            >
              <!-- 评论头部 -->
              <view class="comment-header">
                <view class="user-info">
                  <image :src="comment.userAvatar" mode="aspectFill" class="user-avatar"></image>
                  <view class="user-details">
                    <text class="user-name">{{ comment.userName }}</text>
                    <view class="comment-meta">
                      <text class="department">{{ comment.department }} · {{ comment.doctorName }}</text>
                      <text class="comment-date">{{ comment.date }}</text>
                    </view>
                  </view>
                </view>
                <view class="comment-rating">
                  <text v-for="i in 5" :key="i" class="star" :class="{ 'active': i <= comment.rating }">★</text>
                </view>
              </view>
              
              <!-- 评论内容 -->
              <text class="comment-content">{{ comment.content }}</text>
              
              <!-- 评论底部 -->
              <view class="comment-footer">
                <view class="helpful-info">
                  <uni-icons type="like" size="18" color="#999"></uni-icons>
                  <text class="helpful-count">{{ comment.helpfulCount }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 查看更多 -->
          <view v-if="comments.length > 0" class="view-more-comments" @click="viewMoreComments">
            <text class="view-more-text">查看更多评价</text>
            <uni-icons type="right" size="16" color="#4a90e2"></uni-icons>
          </view>
        </view>
        
        <!-- 交通指南 -->
        <view v-if="activeTab === 'transport'" class="transport-section">
          <!-- 高德地图组件 -->
          <view class="map-container">
            <view id="hospitalMap" class="hospital-map"></view>
            <!-- 导航按钮 -->
            <view class="navigate-button" @click="navigateToHospital">
              <uni-icons type="navigate" size="20" color="#fff"></uni-icons>
              <text class="navigate-text">导航</text>
            </view>
          </view>
          <!-- 交通信息 -->
          <view class="transport-info">
            <view class="info-item">
              <uni-icons type="phone" size="18" color="#4a90e2"></uni-icons>
              <text class="info-label">医院电话：</text>
              <text class="info-value">{{ hospital.phone || '暂无电话' }}</text>
            </view>
            <view class="info-item">
              <uni-icons type="location" size="18" color="#4a90e2"></uni-icons>
              <text class="info-label">医院地址：</text>
              <text class="info-value">{{ hospital.address }}</text>
            </view>
            <view class="info-item">
              <uni-icons type="navigate" size="18" color="#4a90e2"></uni-icons>
              <text class="info-label">交通路线：</text>
              <text class="info-value">公交：可乘坐1、5、10路公交车到医院站下车；地铁：可乘坐2号线到医院站A出口出站</text>
            </view>
          </view>
        </view>
        
        <!-- 医院简介 -->
        <view v-if="activeTab === 'intro'" class="intro-section">
          <text class="section-placeholder">医院简介内容</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/// <reference path="../../global.d.ts" />
// @ts-ignore
import { ref, onMounted, computed, watch } from 'vue'
import { AMAP_JS_KEY } from '@/utils/amapConfig.js'
import { getUserLocationWithErrorHandling, openMapNavigationWithFallback } from '@/utils/location'

// 声明全局变量
declare const uni: any;
declare const plus: any;
declare function getCurrentPages(): any[];
declare function getApp(): any;

interface Hospital {
  id: number
  name: string
  level: string
  address: string
  distance: string
  isInternet: boolean
  departments: string[]
  image: string
  longitude: string
  latitude: string
  phone: string
  businessArea: string
  rating: string
  cost: string
  photos?: {
    url: string
    title: string
  }[]
}

interface PatientComment {
  id: number
  userName: string
  userAvatar: string
  rating: number
  content: string
  date: string
  department: string
  doctorName: string
  helpfulCount: number
}

interface NavTab {
  key: string
  label: string
}

// 页面参数
let query: any = {}
try {
  // 使用全局类型断言访问getCurrentPages
  // @ts-ignore: getCurrentPages是UniApp全局函数
  const pages = (globalThis as any).getCurrentPages()
  if (pages && pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    query = currentPage.options || {}
  }
} catch (e) {
  query = {} 
}

// 状态管理
const loading = ref<boolean>(true)
const error = ref<string>('')
const isFavorite = ref<boolean>(false)
const hospital = ref<Hospital | null>(null)
const comments = ref<PatientComment[]>([])
const totalComments = ref<number>(0)
const averageRating = ref<number>(0)

// 导航标签
const activeTab = ref<string>('service')
const navTabs: NavTab[] = [
  { key: 'service', label: '就医服务' },
  { key: 'departments', label: '重点科室' },
  { key: 'comments', label: '患者评价' },
  { key: 'transport', label: '交通指南' },
  { key: 'intro', label: '医院简介' }
]

// 计算医院图片
const hospitalImage = computed(() => {
  if (hospital.value && hospital.value.image) {
    return hospital.value.image
  }
  return '/static/hospital/hospital.png'
})

// 获取医院详情
const fetchHospitalDetail = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 从URL参数构建医院基本信息
    if (query.name) {
      const hospitalName = decodeURIComponent(query.name || '')
      const hospitalAddress = decodeURIComponent(query.address || '')
      
      // 使用高德地图API搜索医院的详细信息
      const searchParams = {
        key: AMAP_JS_KEY,
        keywords: hospitalName,
        city: '北京',
        offset: 1,
        extensions: 'all'
      }
      
      // 使用类型断言确保uni.request返回Promise并包含正确的属性
      // @ts-ignore: uni.request返回Promise
      const response = await (uni.request as any)({
        url: 'https://restapi.amap.com/v3/place/text',
        method: 'GET',
        data: searchParams
      })
      
      let longitude = '116.397428'
      let latitude = '39.90923'
      
      // @ts-ignore: response包含statusCode和data属性
      if (response && response.statusCode === 200 && response.data && response.data.status === '1' && response.data.pois && response.data.pois.length > 0) {
        // @ts-ignore: response.data.pois存在
        const poi = response.data.pois[0]
        if (poi.location) {
          const [lng, lat] = poi.location.split(',')
          longitude = lng
          latitude = lat
        }
      }
      
      hospital.value = {
        id: Date.now(),
        name: hospitalName,
        level: decodeURIComponent(query.level || '未知'),
        address: hospitalAddress,
        distance: '0m',
        isInternet: false,
        departments: [
          '内科', '口腔科', '普外科', '特需内分泌科', 
          '眼科', '特需心血管内科', '耳鼻喉科', '整形外科',
          '妇科', '特需妇科'
        ],
        image: decodeURIComponent(query.image || '/static/hospital/hospital.png'),
        longitude: longitude,
        latitude: latitude,
        phone: decodeURIComponent(query.phone || '010-58266699;010-58269911'),
        businessArea: '',
        rating: '',
        cost: ''
      }
      
      // 模拟患者评价数据
      comments.value = [
        {
          id: 1,
          userName: '张先生',
          userAvatar: '/static/avatar/default-avatar.png',
          rating: 5,
          content: '医生很专业，态度也很好，解答了我很多疑问，治疗效果也不错，值得推荐！',
          date: '2025-12-20',
          department: '内科',
          doctorName: '李医生',
          helpfulCount: 15
        },
        {
          id: 2,
          userName: '李女士',
          userAvatar: '/static/avatar/default-avatar.png',
          rating: 4,
          content: '医院环境很好，服务态度不错，就是等待时间有点长，总体还是满意的。',
          date: '2025-12-18',
          department: '眼科',
          doctorName: '王医生',
          helpfulCount: 8
        },
        {
          id: 3,
          userName: '王先生',
          userAvatar: '/static/avatar/default-avatar.png',
          rating: 5,
          content: '医生经验丰富，手术很成功，术后恢复也很快，非常感谢！',
          date: '2025-12-15',
          department: '普外科',
          doctorName: '赵医生',
          helpfulCount: 22
        },
        {
          id: 4,
          userName: '陈女士',
          userAvatar: '/static/avatar/default-avatar.png',
          rating: 3,
          content: '医生看病很仔细，就是医院人太多了，挂号有点困难。',
          date: '2025-12-10',
          department: '妇科',
          doctorName: '刘医生',
          helpfulCount: 5
        },
        {
          id: 5,
          userName: '张先生',
          userAvatar: '/static/avatar/default-avatar.png',
          rating: 5,
          content: '医院设施很新，医生和护士都很有耐心，非常满意这次就诊体验。',
          date: '2025-12-05',
          department: '口腔科',
          doctorName: '孙医生',
          helpfulCount: 13
        }
      ]
      
      totalComments.value = comments.value.length
      // 计算平均评分
      const totalRating = comments.value.reduce((sum, comment) => sum + comment.rating, 0)
      averageRating.value = totalRating / totalComments.value
    }
  } catch (err) {
    error.value = '获取医院详情失败，请重试'
    console.error('获取医院详情失败:', err)
  } finally {
    loading.value = false
  }
}

// 返回上一页
const navigateBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({
      fail: (err) => {
        console.error('返回失败:', err)
        // 如果返回失败，尝试跳转到首页
        uni.switchTab({
          url: '/pages/index/index',
          fail: () => {
            uni.reLaunch({
              url: '/pages/index/index'
            })
          }
        })
      }
    })
  } else {
    // 如果没有上一页，跳转到首页
    uni.switchTab({
      url: '/pages/index/index',
      fail: () => {
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    })
  }
}

// 切换收藏状态
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  uni.showToast({
    title: isFavorite.value ? '已收藏' : '已取消收藏',
    icon: 'success'
  })
}

// 切换标签
const switchTab = (tabKey: string) => {
  activeTab.value = tabKey
}

// 查看更多科室
const viewAllDepartments = () => {
  if (!hospital.value) return;
  
  // 跳转到预约挂号页面
  const hospitalData = {
    name: hospital.value.name,
    level: hospital.value.level,
    type: '综合医院',
    insurance: '非定点医保',
    address: hospital.value.address
  };
  
  uni.navigateTo({
    url: `/pages/doctor/appointment-register?hospital=${encodeURIComponent(JSON.stringify(hospitalData))}`,
    fail: (err) => {
      console.error('跳转到预约挂号页面失败:', err);
      uni.showToast({
        title: '跳转失败，请重试',
        icon: 'none'
      });
    }
  });
}

// 选择科室
const selectDepartment = (department: string) => {
  if (!hospital.value) return;
  
  // 跳转到该科室的医生列表页面
  uni.navigateTo({
    url: `/pages/doctor/dept-doctors?dept=${encodeURIComponent(department)}&hospital=${encodeURIComponent(hospital.value.name)}`,
    fail: (err) => {
      console.error('跳转到科室医生列表失败:', err);
      uni.showToast({
        title: '跳转失败，请重试',
        icon: 'none'
      });
    }
  });
}

// 查看更多评价
const viewMoreComments = () => {
  if (!hospital.value) return;
  
  // 跳转到评价列表页面（复用医生评价页面，但传递医院信息）
  const hospitalData = {
    name: hospital.value.name,
    level: hospital.value.level,
    address: hospital.value.address
  };
  
  const commentsData = encodeURIComponent(JSON.stringify(comments.value));
  
  uni.navigateTo({
    url: `/pages/doctor/reviews?hospital=${encodeURIComponent(JSON.stringify(hospitalData))}&comments=${commentsData}`,
    fail: (err) => {
      console.error('跳转到评价列表页面失败:', err);
      uni.showToast({
        title: '跳转失败，请重试',
        icon: 'none'
      });
    }
  });
}

// 初始化高德地图
const initMap = () => {
  console.log('开始初始化地图...')
  
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined') {
    console.log('不在浏览器环境中，跳过地图初始化')
    return
  }
  
  // 检查高德地图API是否加载成功
  // @ts-ignore: AMap是高德地图全局对象
  if (typeof (window as any).AMap === 'undefined') {
    console.log('高德地图API未加载，等待加载...')
    // 如果 API 还未加载，等待一段时间后重试
    let retryCount = 0
    const maxRetries = 10
    const checkInterval = setInterval(() => {
      retryCount++
      if (typeof (window as any).AMap !== 'undefined') {
        clearInterval(checkInterval)
        console.log('高德地图API加载成功')
        initMapAfterLoad()
      } else if (retryCount >= maxRetries) {
        clearInterval(checkInterval)
        console.error('高德地图API加载超时')
        uni.showToast({
          title: '地图加载失败，请刷新页面重试',
          icon: 'none',
          duration: 3000
        })
      }
    }, 200)
  } else {
    console.log('高德地图API已加载成功')
    initMapAfterLoad()
  }
}

// 地图API加载成功后初始化地图
const initMapAfterLoad = () => {
  // 使用setTimeout确保DOM已经完全渲染
  setTimeout(() => {
    console.log('查找地图容器元素...')
    const containerElement = document.getElementById('hospitalMap')
    console.log('地图容器元素:', containerElement)
    
    if (containerElement) {
      // 确保地图容器有明确的尺寸
      const rect = containerElement.getBoundingClientRect()
      console.log('地图容器尺寸:', rect.width, 'x', rect.height)
      
      if (hospital.value) {
        console.log('医院信息:', hospital.value)
        
        // 定义地图中心点和缩放级别
        const center = [
          parseFloat(hospital.value.longitude) || 116.397428,
          parseFloat(hospital.value.latitude) || 39.90923
        ]
        const zoom = 16
        
        console.log('地图中心点:', center)
        console.log('地图缩放级别:', zoom)
        
        try {
          // 创建一个标准的div元素作为地图容器
          const mapDiv = document.createElement('div')
          mapDiv.style.width = '100%'
          mapDiv.style.height = '100%'
          mapDiv.style.position = 'absolute'
          mapDiv.style.top = '0'
          mapDiv.style.left = '0'
          
          // 将新创建的div元素添加到原容器中
          containerElement.innerHTML = ''
          containerElement.appendChild(mapDiv)
          
          console.log('创建了标准div作为地图容器:', mapDiv)
          
          // 创建地图实例
          // @ts-ignore: AMap.Map是高德地图地图类
          const map = new (window as any).AMap.Map(mapDiv, {
            center: center,
            zoom: zoom,
            resizeEnable: true,
            viewMode: '2D',
            lang: 'zh_cn'
          })
          
          console.log('地图实例创建成功:', map)
          
          // 监听地图加载完成事件
          map.on('complete', () => {
            console.log('地图加载完成')
          })
          
          // 监听地图加载失败事件
          map.on('error', (err: any) => {
            console.error('地图加载失败:', err)
            // 如果是 key 相关错误，给出提示
            if (err && (err.message && err.message.includes('key') || err.message && err.message.includes('USERKEY'))) {
              uni.showToast({
                title: '地图 key 配置错误，请检查控制台配置',
                icon: 'none',
                duration: 3000
              })
            }
          })
          
          // 添加标记
          // @ts-ignore: AMap.Marker是高德地图标记类
          const marker = new (window as any).AMap.Marker({
            position: center,
            title: hospital.value.name,
            map: map
          })
          
          console.log('地图标记创建成功:', marker)
          
          // 添加信息窗口
          // @ts-ignore: AMap.InfoWindow和AMap.Pixel是高德地图类
          const infoWindow = new (window as any).AMap.InfoWindow({
            content: `<h3>${hospital.value.name}</h3><p>${hospital.value.address}</p>`,
            offset: new (window as any).AMap.Pixel(0, -30)
          })
          
          console.log('信息窗口创建成功:', infoWindow)
          
          // 点击标记显示信息窗口
          marker.on('click', () => {
            infoWindow.open(map, marker.getPosition())
          })
          
          // 自动适配地图显示范围
          map.setFitView([marker])
          
        } catch (error) {
          console.log('地图初始化异常:', error)
        }
      } else {
        console.log('医院信息为空')
      }
    } else {
      console.log('未找到地图容器元素')
    }
  }, 500) // 增加延迟时间，确保DOM已经完全渲染
}

// 跳转到预约挂号页面
const navigateToAppointment = () => {
  if (hospital.value) {
    uni.navigateTo({
      url: `/pages/appointment/index?name=${encodeURIComponent(hospital.value.name)}&level=${encodeURIComponent(hospital.value.level)}&address=${encodeURIComponent(hospital.value.address)}`
    })
  }
}

// 跳转到互联网预约页面
const navigateToInternetAppointment = () => {
  uni.navigateTo({
    url: `/pages/doctor/appointment-register`
  })
}

// 跳转到智能导诊页面
const navigateToSmartConsult = () => {
  uni.navigateTo({
    url: `/pages/online-consult/index`
  })
}

// 导航到医院
const navigateToHospital = () => {
  if (!hospital.value) {
    uni.showToast({
      title: '医院信息加载中，请稍候',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  const hospitalLatitude = parseFloat(hospital.value.latitude) || 39.90923
  const hospitalLongitude = parseFloat(hospital.value.longitude) || 116.397428
  const hospitalName = hospital.value.name || '医院'
  
  // 使用我们封装好的导航函数，支持地图选择
  const destination = {
    latitude: hospitalLatitude,
    longitude: hospitalLongitude,
    address: hospital.value.address || ''
  }
  
  // 调用导航函数，会自动显示地图选择菜单
  openMapNavigationWithFallback(destination, {
    destinationName: hospitalName
  })
}

// 监听activeTab变化，当切换到交通指南时初始化地图
watch(activeTab, (newTab) => {
  if (newTab === 'transport') {
    // 延迟一下，确保DOM已经渲染完成
    setTimeout(() => {
      initMap()
    }, 100)
  }
})

// 页面加载时获取医院详情
onMounted(() => {
  fetchHospitalDetail()
})
</script>

<style lang="scss">
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 顶部导航栏
.top-header {
  background: #fff;
  padding-top: var(--status-bar-height, 44px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

// 加载状态
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 20rpx;
  
  .loading-text {
    font-size: 28rpx;
    color: #999;
  }
}

// 错误状态
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 20rpx;
  
  .error-text {
    font-size: 28rpx;
    color: #ff4d4f;
  }
  
  .retry-btn {
    margin-top: 20rpx;
    background-color: #4a90e2;
    color: #fff;
    border: none;
    border-radius: 50rpx;
    padding: 16rpx 40rpx;
    font-size: 28rpx;
  }
}

// 医院详情
.hospital-detail {
  background: #fff;
}

// 医院基本信息
.hospital-basic {
  background: #fff;
  margin-bottom: 20rpx;
  
  // 医院头部区域
  .hospital-header-section {
    display: flex;
    padding: 20rpx;
    gap: 20rpx;
    align-items: flex-start;
    
    .hospital-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      overflow: hidden;
      flex-shrink: 0;
      
      .hospital-img {
        width: 100%;
        height: 100%;
      }
    }
    
    .hospital-info-main {
      flex: 1;
      min-width: 0;
      
      .hospital-name {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        display: block;
        margin-bottom: 12rpx;
      }
      
      .hospital-tags {
        display: flex;
        gap: 10rpx;
        margin-bottom: 12rpx;
        flex-wrap: wrap;
        
        .tag {
          padding: 6rpx 16rpx;
          border-radius: 16rpx;
          font-size: 22rpx;
          color: #fff;
          
          &.level-tag {
            background: #ff7d00;
          }
          
          &.type-tag {
            background: #4a90e2;
          }
          
          &.insurance-tag {
            background: #999;
          }
        }
      }
      
      .hospital-rank {
        display: flex;
        flex-direction: column;
        gap: 8rpx;
        
        .rank-item {
          display: flex;
          align-items: center;
          gap: 8rpx;
          
          .rank-label {
            font-size: 22rpx;
            color: #999;
          }
          
          .rank-value {
            font-size: 22rpx;
            color: #ff4d4f;
            font-weight: bold;
          }
        }
        
        .department-tags {
          display: flex;
          gap: 10rpx;
          flex-wrap: wrap;
          
          .department-tag {
            font-size: 22rpx;
            color: #666;
            background: #f5f5f5;
            padding: 4rpx 12rpx;
            border-radius: 12rpx;
          }
        }
      }
    }
  }
  
  // 导航标签栏
  .nav-tabs {
    display: flex;
    background: #fff;
    border-bottom: 1rpx solid #eee;
    padding: 0 20rpx;
    
    .tab-item {
      flex-shrink: 0;
      padding: 24rpx 15rpx;
      font-size: 28rpx;
      color: #333;
      position: relative;
      margin-right: 40rpx;
      
      &.active {
        color: #4a90e2;
        font-weight: bold;
        
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4rpx;
          background: #4a90e2;
          border-radius: 2rpx;
        }
      }
    }
  }
}

// 内容区域
.content-area {
  background: #fff;
  padding: 20rpx;
}

// 就医服务区域
.service-section {
  .service-cards {
    display: flex;
    gap: 20rpx;
    justify-content: space-between;
    
    .service-card {
      flex: 1;
      background: linear-gradient(135deg, #e8f4fc 0%, #f0f9ff 100%);
      padding: 30rpx 20rpx;
      border-radius: 16rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      
      .service-icon {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        margin-bottom: 8rpx;
        
        &.appointment {
          background: #4a90e2;
        }
        
        &.internet {
          background: #52c41a;
        }
        
        &.guide {
          background: #faad14;
        }
      }
      
      .service-title {
        font-size: 28rpx;
        font-weight: bold;
        color: #333;
      }
      
      .service-desc {
        font-size: 22rpx;
        color: #666;
        text-align: center;
      }
    }
  }
  
  // 就诊指南
  .guide-section {
    margin-top: 40rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .section-header {
      margin-bottom: 20rpx;
      
      .section-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
    }
    
    .guide-content {
      display: flex;
      flex-direction: column;
      gap: 24rpx;
      
      .guide-item {
        display: flex;
        gap: 20rpx;
        align-items: flex-start;
        
        .guide-icon {
          font-size: 40rpx;
          margin-top: 4rpx;
        }
        
        .guide-info {
          flex: 1;
          
          .guide-title {
            font-size: 28rpx;
            font-weight: bold;
            color: #333;
            display: block;
            margin-bottom: 8rpx;
          }
          
          .guide-desc {
            font-size: 24rpx;
            color: #666;
            line-height: 1.5;
          }
        }
      }
    }
  }
  
  // 联系方式
  .contact-section {
    margin-top: 24rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .section-header {
      margin-bottom: 20rpx;
      
      .section-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
    }
    
    .contact-content {
      display: flex;
      flex-direction: column;
      gap: 24rpx;
      
      .contact-item {
        display: flex;
        gap: 20rpx;
        align-items: center;
        
        .contact-icon {
          font-size: 40rpx;
        }
        
        .contact-info {
          flex: 1;
          
          .contact-label {
            font-size: 24rpx;
            color: #999;
            display: block;
            margin-bottom: 4rpx;
          }
          
          .contact-value {
            font-size: 28rpx;
            color: #333;
            font-weight: bold;
          }
        }
      }
    }
  }
}

// 重点科室区域
.departments-section {
  margin-top: 30rpx;
  
  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .view-more {
      font-size: 24rpx;
      color: #4a90e2;
    }
  }
  
  .departments-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
    
    .department-item {
      background: #f5f5f5;
      color: #666;
      font-size: 26rpx;
      padding: 20rpx;
      border-radius: 12rpx;
      text-align: center;
      
      &:active {
        background: #e8e8e8;
      }
    }
  }
}

// 交通指南区域
.transport-section {
  .map-container {
    width: 100%;
    height: 400rpx;
    margin-bottom: 20rpx;
    border-radius: 12rpx;
    overflow: hidden;
    background-color: #f0f0f0;
    border: 1rpx solid #ddd;
    position: relative;
  }
  
  .hospital-map {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 1;
  }
  
  // 导航按钮
  .navigate-button {
    position: absolute;
    bottom: 20rpx;
    right: 20rpx;
    background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
    color: #fff;
    padding: 16rpx 32rpx;
    border-radius: 50rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
    box-shadow: 0 4rpx 12rpx rgba(74, 144, 226, 0.4);
    z-index: 10;
    cursor: pointer;
    transition: all 0.3s;
    
    &:active {
      transform: scale(0.95);
      box-shadow: 0 2rpx 8rpx rgba(74, 144, 226, 0.3);
    }
    
    .navigate-text {
      font-size: 28rpx;
      font-weight: 600;
      color: #fff;
    }
  }
  
  .transport-info {
    padding: 20rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 10rpx;
      margin-bottom: 16rpx;
      font-size: 24rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    .info-label {
      color: #666;
      flex-shrink: 0;
    }
    
    .info-value {
      color: #333;
      flex: 1;
      line-height: 1.5;
    }
  }
}

// 占位符样式
.section-placeholder {
  display: block;
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 80rpx 0;
}

// 患者评价部分
.comments-section {
  margin-top: 30rpx;
}

// 评价统计
.comments-stats {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.rating-overview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.rating-main {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.rating-score {
  font-size: 64rpx;
  font-weight: bold;
  color: #ff7d00;
}

.rating-stars {
  display: flex;
  gap: 8rpx;
}

.star {
  font-size: 28rpx;
  color: #ddd;
  
  &.active {
    color: #ff7d00;
  }
}

.rating-count {
  font-size: 24rpx;
  color: #999;
}

// 评分分布
.rating-distribution {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.distribution-label {
  font-size: 24rpx;
  color: #666;
  width: 50rpx;
  text-align: left;
}

.distribution-bar {
  flex: 1;
  height: 10rpx;
  background: #ddd;
  border-radius: 5rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #ff7d00;
  border-radius: 5rpx;
}

.distribution-count {
  font-size: 24rpx;
  color: #999;
  width: 60rpx;
  text-align: right;
}

// 评价列表
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.comment-item {
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #eee;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.comment-meta {
  display: flex;
  gap: 20rpx;
  font-size: 22rpx;
  color: #999;
}

.department {
  color: #666;
}

.comment-date {
  color: #999;
}

.comment-rating {
  display: flex;
  gap: 6rpx;
}

.comment-rating .star {
  font-size: 22rpx;
}

.comment-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16rpx;
  display: block;
}

.comment-footer {
  display: flex;
  justify-content: flex-end;
}

.helpful-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #999;
}

.helpful-count {
  color: #999;
}

// 查看更多
.view-more-comments {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 40rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 50rpx;
  font-size: 26rpx;
  color: #4a90e2;
  cursor: pointer;
  
  &:active {
    background: #e8e8e8;
  }
}

.view-more-text {
  color: #4a90e2;
}
</style>