<template>
  <view class="container">
    <!-- 顶部搜索栏 -->
    <view class="top-header">
      <view class="search-bar">
        <uni-icons type="left" size="24" color="#333" @click="navigateBack"></uni-icons>
        <view class="search-box">
          <uni-icons type="search" size="18" color="#999"></uni-icons>
          <input 
            class="search-input" 
            type="text" 
            placeholder="搜医院名称"
            placeholder-class="placeholder"
            v-model="searchText"
            @input="handleSearchInput"
          />
        </view>
        <view class="location" @click="switchCity">
          <text class="location-text">{{ currentCity }}</text>
          <uni-icons type="arrowdown" size="14" color="#333"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 筛选选项 -->
    <view class="filter-options">
      <scroll-view class="filter-scroll" scroll-x show-scrollbar="false">
        <view 
          class="filter-item" 
          :class="{ active: activeFilter === '综合排序' }" 
          @click="selectFilter('综合排序')"
        >
          综合排序
        </view>
        <view 
          class="filter-item" 
          :class="{ active: activeFilter === '科室' }" 
          @click="selectFilter('科室')"
        >
          科室
          <uni-icons type="arrowdown" size="14" color="#333"></uni-icons>
        </view>
        <view 
          class="filter-item" 
          :class="{ active: activeFilter === '疾病' }" 
          @click="selectFilter('疾病')"
        >
          疾病
          <uni-icons type="arrowdown" size="14" color="#333"></uni-icons>
        </view>
        <view 
          class="filter-item" 
          :class="{ active: activeFilter === '筛选' }" 
          @click="toggleFilterPopup"
        >
          筛选
          <uni-icons type="arrowdown" size="14" color="#333"></uni-icons>
        </view>
      </scroll-view>
    </view>
    
    <!-- 筛选弹窗 -->
    <uni-popup ref="filterPopup" type="bottom" :mask-click="true" @close="onFilterPopupClose">
      <view class="filter-popup">
        <view class="popup-header">
          <text class="popup-title">筛选</text>
          <uni-icons type="close" size="24" color="#333" @click="closeFilterPopup"></uni-icons>
        </view>
        
        <scroll-view class="popup-content" scroll-y>
          <!-- 服务类型 -->
          <view class="filter-section">
            <text class="section-title">服务类型</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.serviceType === '门诊预约' }" 
                @click="selectFilterOption('serviceType', '门诊预约')"
              >
                门诊预约
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.serviceType === '互联网医院' }" 
                @click="selectFilterOption('serviceType', '互联网医院')"
              >
                互联网医院
              </view>
            </view>
          </view>
          
          <!-- 医院等级 -->
          <view class="filter-section">
            <text class="section-title">医院等级</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '三甲医院' }" 
                @click="selectFilterOption('hospitalLevel', '三甲医院')"
              >
                三甲医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '三级医院' }" 
                @click="selectFilterOption('hospitalLevel', '三级医院')"
              >
                三级医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '二级医院' }" 
                @click="selectFilterOption('hospitalLevel', '二级医院')"
              >
                二级医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '一级医院' }" 
                @click="selectFilterOption('hospitalLevel', '一级医院')"
              >
                一级医院
              </view>
            </view>
          </view>
          
          <!-- 距离 -->
          <view class="filter-section">
            <text class="section-title">距离</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '5km内' }" 
                @click="selectFilterOption('distance', '5km内')"
              >
                5km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '10km内' }" 
                @click="selectFilterOption('distance', '10km内')"
              >
                10km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '20km内' }" 
                @click="selectFilterOption('distance', '20km内')"
              >
                20km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '50km内' }" 
                @click="selectFilterOption('distance', '50km内')"
              >
                50km内
              </view>
            </view>
          </view>
          
          <!-- 医院类型 -->
          <view class="filter-section">
            <text class="section-title">医院类型</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '综合医院' }" 
                @click="selectFilterOption('hospitalType', '综合医院')"
              >
                综合医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '儿童医院' }" 
                @click="selectFilterOption('hospitalType', '儿童医院')"
              >
                儿童医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '骨科医院' }" 
                @click="selectFilterOption('hospitalType', '骨科医院')"
              >
                骨科医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '妇产医院' }" 
                @click="selectFilterOption('hospitalType', '妇产医院')"
              >
                妇产医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '口腔医院' }" 
                @click="selectFilterOption('hospitalType', '口腔医院')"
              >
                口腔医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '精神病院' }" 
                @click="selectFilterOption('hospitalType', '精神病院')"
              >
                精神病院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '肿瘤医院' }" 
                @click="selectFilterOption('hospitalType', '肿瘤医院')"
              >
                肿瘤医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '其他' }" 
                @click="selectFilterOption('hospitalType', '其他')"
              >
                其他
              </view>
            </view>
          </view>
        </scroll-view>
        
        <view class="popup-footer">
          <button class="footer-btn reset-btn" @click="resetFilters">重置</button>
          <button class="footer-btn confirm-btn" @click="applyFilters">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 医院列表 -->
    <view class="hospital-list">
      <!-- 加载状态 -->
      <view v-if="loading" class="loading-container">
        <uni-icons type="spinner" size="36" color="#4a90e2" animation="spin"></uni-icons>
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 无数据状态 -->
      <view v-else-if="hospitals.length === 0" class="empty-container">
        <uni-icons type="empty" size="64" color="#ccc"></uni-icons>
        <text class="empty-text">暂无医院数据</text>
      </view>
      
      <!-- 医院列表 -->
      <view 
        v-for="hospital in hospitals" 
        :key="hospital.id" 
        class="hospital-item"
        @click="navigateToHospitalDetail(hospital)"
      >
        <view class="hospital-card">
          <view class="hospital-image">
            <image :src="hospital.image" mode="aspectFill" class="hospital-img"></image>
            <view class="hospital-badge">{{ hospital.level }}</view>
          </view>
          <view class="hospital-info">
            <view class="hospital-header">
              <text class="hospital-name">{{ hospital.name }}</text>
              <view class="hospital-tag" v-if="hospital.isInternet">互联网医院</view>
            </view>
            <text class="hospital-address">{{ hospital.address }}</text>
            <text class="hospital-distance">{{ hospital.distance }}</text>
            <view class="hospital-departments">
              <text 
                v-for="(dept, index) in hospital.departments" 
                :key="index" 
                class="department-tag"
              >
                {{ dept }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { searchHospitals } from '../../services/amap'

// 使用类型别名代替接口，避免可能的 TypeScript 编译问题
type Hospital = {
  id: number
  name: string
  level: string
  address: string
  distance: string
  isInternet: boolean
  departments: string[]
  image: string
  longitude?: string
  latitude?: string
  phone?: string
}

// 当前城市
const currentCity = ref('北京')
// 搜索文本
const searchText = ref('')
// 筛选选项
const activeFilter = ref('综合排序')
// 医院数据
const hospitals = ref<Hospital[]>([])
// 加载状态
const loading = ref(false)
// 分页
const currentPage = ref(1)
const total = ref(0)

// 筛选弹窗引用
const filterPopup = ref<any>(null)

// 筛选条件
interface Filters {
  serviceType: string | null
  hospitalLevel: string | null
  distance: string | null
  hospitalType: string | null
}

const filters = ref<Filters>({
  serviceType: null,
  hospitalLevel: null,
  distance: null,
  hospitalType: null
})

// 获取医院数据
const fetchHospitals = async () => {
  loading.value = true
  try {
    // 将筛选条件传递给API调用
    const data = await searchHospitals(currentCity.value, searchText.value, currentPage.value, filters.value)
    hospitals.value = data
    total.value = data.length
  } catch (error) {
    console.error('获取医院数据失败:', error)
    uni.showToast({
      title: '获取医院数据失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 切换筛选弹窗
const toggleFilterPopup = () => {
  if (filterPopup.value) {
    filterPopup.value.open()
  }
}

// 关闭筛选弹窗
const closeFilterPopup = () => {
  if (filterPopup.value) {
    filterPopup.value.close()
  }
}

// 筛选弹窗关闭回调
const onFilterPopupClose = () => {
  // 弹窗关闭时的处理
}

// 选择筛选选项
const selectFilterOption = (key: keyof Filters, value: string) => {
  // 切换选中状态，如果已选中则取消
  filters.value[key] = filters.value[key] === value ? null : value
}

// 重置筛选条件
const resetFilters = () => {
  filters.value = {
    serviceType: null,
    hospitalLevel: null,
    distance: null,
    hospitalType: null
  }
}

// 应用筛选条件
const applyFilters = () => {
  closeFilterPopup()
  fetchHospitals() // 直接调用API获取筛选后的数据
}

// 监听城市变化，重新获取医院数据
watch(currentCity, () => {
  fetchHospitals()
})

// 返回上一页
const navigateBack = () => {
  // 使用 uni-app 的导航方法返回上一页
  uni.navigateBack({
    fail: () => {
      // 如果返回失败，跳转到首页
      uni.switchTab({
        url: '/pages/index/index'
      })
    }
  })
}

// 选择筛选选项
const selectFilter = (filter: string) => {
  activeFilter.value = filter
}

// 搜索医院
const handleSearch = () => {
  currentPage.value = 1
  fetchHospitals()
}

// 搜索输入处理
const handleSearchInput = (e: any) => {
  searchText.value = e.detail.value
}

// 搜索定时器
let searchTimer: any = null

// 监听搜索文本变化
watch(searchText, () => {
  // 防抖处理
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
})

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

// 读取城市信息
const loadCity = () => {
  const savedCity = uni.getStorageSync('currentCity')
  if (savedCity) {
    currentCity.value = savedCity
  }
}

// 使用事件总线监听城市变化（实时更新）
// @ts-ignore
if (typeof uni !== 'undefined' && uni.$on) {
  // @ts-ignore
  uni.$on('cityChanged', (cityName: string) => {
    currentCity.value = cityName
    uni.setStorageSync('currentCity', cityName)
  })
}

// 页面显示时自动刷新城市和获取医院数据（从城市选择页返回时会触发）
// uni-app 会自动识别 onShow 生命周期钩子
// @ts-ignore
function onShow() {
  loadCity()
  fetchHospitals()
}

// 页面加载时读取保存的城市和获取医院数据
onMounted(() => {
  loadCity()
  fetchHospitals()
})

// 跳转到医院详情页
const navigateToHospitalDetail = (hospital: Hospital) => {
  try {
    // 简化跳转逻辑，只传递必要的医院信息，避免URL过长
    // 避免直接访问phone属性，使用类型断言和字符串拼接
    const hospitalData = hospital as any
    const phone = hospitalData.phone || ''
    
    // 使用模板字符串构建URL，避免TypeScript编译错误
    const url = `/pages/hospital-detail/index?name=${encodeURIComponent(hospital.name)}&address=${encodeURIComponent(hospital.address)}&level=${encodeURIComponent(hospital.level)}&image=${encodeURIComponent(hospital.image)}&longitude=${encodeURIComponent(hospital.longitude || '')}&latitude=${encodeURIComponent(hospital.latitude || '')}&phone=${encodeURIComponent(phone)}`
    
    uni.navigateTo({
      url: url,
      success: (res: any) => {
        console.log('跳转到医院详情页成功:', res)
      },
      fail: (err: any) => {
        console.error('跳转到医院详情页失败:', err)
        uni.showToast({
          title: '跳转到医院详情页失败',
          icon: 'none'
        })
      }
    })
  } catch (error) {
    console.error('跳转到医院详情页异常:', error)
    uni.showToast({
      title: '跳转到医院详情页失败',
      icon: 'none'
    })
  }
}
</script>

<style>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* 顶部搜索栏 */
.top-header {
  background: #fff;
  padding-top: var(--status-bar-height, 44px);
}

.top-header .search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  gap: 20rpx;
}

.top-header .search-bar .search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 50rpx;
  padding: 16rpx 24rpx;
  gap: 12rpx;
}

.top-header .search-bar .search-box .search-input {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.top-header .search-bar .search-box .placeholder {
  color: #999;
}

.top-header .search-bar .location {
  display: flex;
  align-items: center;
  gap: 6rpx;
  white-space: nowrap;
}

.top-header .search-bar .location .location-text {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

/* 筛选选项 */
.filter-options {
  background: #fff;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.filter-options .filter-scroll {
  white-space: nowrap;
  padding: 0 30rpx;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

/* 隐藏滚动条 */
.filter-options .filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-options .filter-scroll .filter-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  margin-right: 40rpx;
  font-size: 28rpx;
  color: #666;
}

.filter-options .filter-scroll .filter-item.active {
  color: #4a90e2;
  font-weight: bold;
}

/* 医院列表 */
.hospital-list {
  padding: 20rpx 30rpx;
}

/* 加载状态 */
.hospital-list .loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 20rpx;
}

.hospital-list .loading-container .loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 无数据状态 */
.hospital-list .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 20rpx;
}

.hospital-list .empty-container .empty-text {
  font-size: 28rpx;
  color: #999;
}

.hospital-list .hospital-item {
  margin-bottom: 20rpx;
}

.hospital-list .hospital-item .hospital-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.hospital-list .hospital-item .hospital-card .hospital-image {
  position: relative;
  width: 200rpx;
  height: 140rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.hospital-list .hospital-item .hospital-card .hospital-image .hospital-img {
  width: 100%;
  height: 100%;
}

.hospital-list .hospital-item .hospital-card .hospital-image .hospital-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(255, 140, 66, 0.9);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.hospital-list .hospital-item .hospital-card .hospital-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-header .hospital-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-header .hospital-tag {
  background: #e8f4fc;
  color: #4a90e2;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-address {
  font-size: 24rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-distance {
  font-size: 22rpx;
  color: #999;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-departments {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.hospital-list .hospital-item .hospital-card .hospital-info .hospital-departments .department-tag {
  background: #f5f5f5;
  color: #666;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}

/* 筛选弹窗样式 */
.filter-popup {
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  width: 100%;
  max-height: 80vh;
}

.filter-popup .popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.filter-popup .popup-header .popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.filter-popup .popup-content {
  max-height: calc(80vh - 160rpx);
  padding: 20rpx;
}

.filter-popup .filter-section {
  margin-bottom: 30rpx;
}

.filter-popup .filter-section .section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.filter-popup .filter-section .filter-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.filter-popup .filter-section .filter-options-grid .filter-option {
  background: #f5f5f5;
  color: #666;
  font-size: 26rpx;
  padding: 16rpx 12rpx;
  border-radius: 12rpx;
  text-align: center;
  transition: all 0.2s ease;
}

.filter-popup .filter-section .filter-options-grid .filter-option.active {
  background: #e8f4fc;
  color: #4a90e2;
  font-weight: bold;
}

.filter-popup .filter-section .filter-options-grid .filter-option:active {
  transform: scale(0.95);
}

.filter-popup .popup-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  border-top: 1rpx solid #eee;
  background: #fff;
}

.filter-popup .popup-footer .footer-btn {
  flex: 1;
  height: 80rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.filter-popup .popup-footer .footer-btn.reset-btn {
  background: #f5f5f5;
  color: #666;
}

.filter-popup .popup-footer .footer-btn.confirm-btn {
  background: #4a90e2;
  color: #fff;
}
</style>