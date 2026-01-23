<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <uni-icons type="left" size="20" color="#333"></uni-icons>
      </view>
      <text class="nav-title">切换城市</text>
    </view>

    <!-- 搜索框 -->
    <view class="search-box">
      <uni-icons type="search" size="18" color="#999"></uni-icons>
      <input 
        class="search-input" 
        type="text" 
        placeholder="搜索城市名称"
        placeholder-class="placeholder"
        v-model="searchKeyword"
        @input="handleSearch"
      />
    </view>

    <!-- 标签页 -->
    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'hot' }" 
        @click="switchTab('hot')"
      >
        热门城市
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'all' }" 
        @click="switchTab('all')"
      >
        全国
      </view>
    </view>

    <!-- 城市列表 -->
    <view class="city-content">
      <!-- 热门城市列表 -->
      <view v-if="activeTab === 'hot'" class="city-list">
        <view 
          v-for="city in filteredHotCities" 
          :key="city.id" 
          class="city-item"
          @click="selectCity(city)"
        >
          <text class="city-name">{{ city.name }}</text>
        </view>
      </view>

      <!-- 全国城市列表 -->
      <view v-if="activeTab === 'all'" class="city-list">
        <view 
          v-for="city in filteredAllCities" 
          :key="city.id" 
          class="city-item"
          @click="selectCity(city)"
        >
          <text class="city-name">{{ city.name }}</text>
          <view v-if="city.isAutoLocation" class="location-tag">
            <uni-icons type="location" size="14" color="#999"></uni-icons>
            <text class="location-text">自动定位</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 当前选中的标签
const activeTab = ref('hot')
// 搜索关键词
const searchKeyword = ref('')
// 当前选中的城市（从首页传入）
const currentCity = ref('北京')

// 热门城市数据
const hotCities = ref([
  { id: 1, name: '北京市' },
  { id: 2, name: '上海市' },
  { id: 3, name: '广东省' },
  { id: 4, name: '湖北省' },
  { id: 5, name: '湖南省' },
  { id: 6, name: '江西省' },
  { id: 7, name: '重庆市' },
  { id: 8, name: '山西省' },
  { id: 9, name: '江苏省' },
  { id: 10, name: '浙江省' },
  { id: 11, name: '四川省' },
  { id: 12, name: '山东省' }
])

// 全国城市数据
const allCities = ref([
  { id: 1, name: '北京市', isAutoLocation: true },
  { id: 2, name: '武汉市' },
  { id: 3, name: '广州市' },
  { id: 4, name: '上海市' },
  { id: 5, name: '南昌市' },
  { id: 6, name: '长沙市' },
  { id: 7, name: '西安市' },
  { id: 8, name: '青岛市' },
  { id: 9, name: '深圳市' },
  { id: 10, name: '杭州市' },
  { id: 11, name: '成都市' },
  { id: 12, name: '南京市' },
  { id: 13, name: '天津市' },
  { id: 14, name: '重庆市' },
  { id: 15, name: '苏州市' },
  { id: 16, name: '郑州市' }
])

// 过滤后的热门城市
const filteredHotCities = computed(() => {
  if (!searchKeyword.value) {
    return hotCities.value
  }
  return hotCities.value.filter(city => 
    city.name.includes(searchKeyword.value)
  )
})

// 过滤后的全国城市
const filteredAllCities = computed(() => {
  if (!searchKeyword.value) {
    return allCities.value
  }
  return allCities.value.filter(city => 
    city.name.includes(searchKeyword.value)
  )
})

// 切换标签
const switchTab = (tab) => {
  activeTab.value = tab
  searchKeyword.value = '' // 切换标签时清空搜索
}

// 搜索处理
const handleSearch = (e) => {
  searchKeyword.value = e.detail.value
}

// 选择城市
const selectCity = (city) => {
  // 保存选中的城市到本地存储
  uni.setStorageSync('currentCity', city.name)
  
  // 通过事件总线通知首页更新城市
  // @ts-ignore
  if (typeof uni !== 'undefined' && uni.$emit) {
    // @ts-ignore
    uni.$emit('cityChanged', city.name)
  }
  
  // 返回上一页
  uni.navigateBack({
    delta: 1,
    success: () => {
      // 返回成功后显示提示
      setTimeout(() => {
        uni.showToast({
          title: `已切换到${city.name}`,
          icon: 'success',
          duration: 1500
        })
      }, 300)
    }
  })
}

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  })
}

// 页面加载时获取传入的城市参数
onLoad((options) => {
  if (options && options.city) {
    currentCity.value = options.city
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

// 导航栏
.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .nav-back {
    padding: 10rpx;
    margin-right: 20rpx;
  }
  
  .nav-title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
}

// 搜索框
.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 50rpx;
  padding: 20rpx 30rpx;
  margin: 20rpx 30rpx;
  gap: 12rpx;
  
  .search-input {
    flex: 1;
    font-size: 28rpx;
    color: #333;
  }
  
  .placeholder {
    color: #999;
  }
}

// 标签页
.tabs {
  display: flex;
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: #666;
    position: relative;
    
    &.active {
      color: #4a90e2;
      font-weight: bold;
      
      &::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 4rpx;
        background-color: #4a90e2;
      }
    }
  }
}

// 城市内容
.city-content {
  flex: 1;
  background-color: #fff;
  
  .city-list {
    padding: 0 30rpx;
    
    .city-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 30rpx 0;
      border-bottom: 1rpx solid #f5f5f5;
      
      .city-name {
        font-size: 28rpx;
        color: #333;
      }
      
      .location-tag {
        display: flex;
        align-items: center;
        gap: 6rpx;
        
        .location-text {
          font-size: 24rpx;
          color: #999;
        }
      }
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
}
</style>

