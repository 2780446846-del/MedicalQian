<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="top-header">
      <uni-icons type="left" size="24" color="#333" @click="navigateBack"></uni-icons>
      <text class="nav-title">预约挂号</text>
      <uni-icons type="more" size="24" color="#333"></uni-icons>
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
      <button class="retry-btn" @click="initializeData">重新加载</button>
    </view>
    
    <!-- 预约挂号内容 -->
    <view v-else class="appointment-content">
      <!-- 医院信息 -->
      <view class="hospital-info">
        <view class="hospital-name">{{ hospitalInfo.name }}</view>
        <view class="hospital-tags">
          <view class="tag level-tag">{{ hospitalInfo.level }}</view>
          <view class="tag type-tag">综合医院</view>
          <view class="tag insurance-tag">定点医保</view>
        </view>
        <view class="hospital-address">
          <uni-icons type="location" size="16" color="#999"></uni-icons>
          <text class="address-text">{{ hospitalInfo.address }}</text>
          <text class="map-link">地图查看</text>
        </view>
        <view class="hospital-homepage">
          <uni-icons type="link" size="16" color="#4a90e2"></uni-icons>
          <text class="homepage-text">医院首页</text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="search-box">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input 
          class="search-input" 
          type="text" 
          placeholder="搜索科室名称"
          v-model="searchText"
          @input="handleSearchInput"
        />
      </view>

      <!-- 科室列表 -->
      <view class="department-section">
        <view 
          v-for="(deptGroup, groupIndex) in departmentGroups" 
          :key="groupIndex"
          class="department-group"
        >
          <view class="group-title">{{ deptGroup.groupName }}</view>
          <view class="department-list">
            <view 
              v-for="(dept, index) in deptGroup.departments" 
              :key="index"
              class="department-item"
              @click="selectDepartment(dept)"
            >
              <view class="dept-name">{{ dept.name }}</view>
              <view class="dept-tags">
                <view 
                  v-for="(tag, tagIndex) in dept.tags" 
                  :key="tagIndex"
                  class="dept-tag"
                  :class="tag.type"
                >
                  {{ tag.name }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 声明getCurrentPages函数的类型
declare const getCurrentPages: () => any[]

interface HospitalInfo {
  name: string
  level: string
  address: string
}

interface DepartmentTag {
  name: string
  type: string
}

interface Department {
  name: string
  tags: DepartmentTag[]
}

interface DepartmentGroup {
  groupName: string
  departments: Department[]
}

// 页面参数
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1]
const query = currentPage.options as any

// 状态管理
const loading = ref<boolean>(true)
const error = ref<string>('')
const searchText = ref<string>('')
const hospitalInfo = ref<HospitalInfo>({
  name: '',
  level: '',
  address: ''
})

// 科室数据
const departmentGroups = ref<DepartmentGroup[]>([])

// 模拟科室数据
const mockDepartments: DepartmentGroup[] = [
  {
    groupName: '内科',
    departments: [
      { name: '神经内科', tags: [{ name: '国家重点', type: 'key' }] },
      { name: '内分泌科', tags: [{ name: '国家重点', type: 'key' }] },
      { name: '呼吸内科', tags: [] },
      { name: '内分泌科(西院)', tags: [{ name: '互联网', type: 'internet' }] },
      { name: '特需内分泌科', tags: [] },
      { name: '消化内科', tags: [] },
      { name: '血液科', tags: [] },
      { name: '肝病科', tags: [] },
      { name: '免疫科', tags: [] }
    ]
  },
  {
    groupName: '其他科室',
    departments: [
      { name: '中医科', tags: [] },
      { name: '妇产科', tags: [] },
      { name: '变态反应科', tags: [] },
      { name: '营养科', tags: [] },
      { name: '儿科', tags: [] },
      { name: '五官科', tags: [] },
      { name: '老年科', tags: [] }
    ]
  }
]

// 初始化数据
const initializeData = () => {
  loading.value = true
  error.value = ''
  
  try {
    // 从URL参数获取医院信息
    if (query.name) {
      hospitalInfo.value = {
        name: decodeURIComponent(query.name || ''),
        level: decodeURIComponent(query.level || '未知'),
        address: decodeURIComponent(query.address || '')
      }
    }
    
    // 设置科室数据
    departmentGroups.value = mockDepartments
  } catch (err) {
    error.value = '初始化失败，请重试'
    console.error('初始化失败:', err)
  } finally {
    loading.value = false
  }
}

// 返回上一页
const navigateBack = () => {
  uni.navigateBack()
}

// 搜索科室
const handleSearchInput = () => {
  // 搜索逻辑开发中
  console.log('搜索科室:', searchText.value)
}

// 选择科室
const selectDepartment = (department: Department) => {
  uni.showToast({
    title: `选择了${department.name}`,
    icon: 'none'
  })
}

// 页面加载时初始化数据
onMounted(() => {
  initializeData()
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
  position: sticky;
  top: 0;
  z-index: 100;
  
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

// 预约挂号内容
.appointment-content {
  background: #f5f5f5;
}

// 医院信息
.hospital-info {
  background: #fff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .hospital-name {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
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
        background: #52c41a;
      }
    }
  }
  
  .hospital-address {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 10rpx;
    font-size: 24rpx;
    color: #666;
    
    .address-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .map-link {
      color: #4a90e2;
      font-size: 22rpx;
    }
  }
  
  .hospital-homepage {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 24rpx;
    color: #4a90e2;
  }
}

// 搜索框
.search-box {
  background: #fff;
  margin: 0 30rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  border-radius: 50rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .search-input {
    flex: 1;
    font-size: 26rpx;
    color: #333;
  }
  
  .search-input::placeholder {
    color: #999;
  }
}

// 科室区域
.department-section {
  background: #fff;
  padding: 20rpx 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

// 科室分组
.department-group {
  margin-bottom: 30rpx;
  
  .group-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
  }
  
  .department-list {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }
  
  .department-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    
    &:active {
      background: #e8e8e8;
    }
  }
  
  .dept-name {
    font-size: 26rpx;
    color: #333;
  }
  
  .dept-tags {
    display: flex;
    gap: 8rpx;
    
    .dept-tag {
      font-size: 20rpx;
      padding: 4rpx 12rpx;
      border-radius: 12rpx;
      
      &.key {
        background: #fff0f0;
        color: #ff4d4f;
        border: 1rpx solid #ffccc7;
      }
      
      &.internet {
        background: #f6ffed;
        color: #52c41a;
        border: 1rpx solid #b7eb8f;
      }
    }
  }
}
</style>