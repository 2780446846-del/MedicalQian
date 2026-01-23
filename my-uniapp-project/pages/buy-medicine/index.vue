<template>
  <view class="buy-medicine-container">
    <!-- 顶部搜索栏 -->
    <view class="search-bar">
      <uni-search-bar 
        placeholder="请输入您要查找的内容"
        bgColor="#f5f5f5"
        borderRadius="80rpx"
        @confirm="onSearch"
      ></uni-search-bar>
    </view>

    <!-- 轮播图 -->
    <view class="banner">
      <swiper :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500" indicator-color="#ddd" indicator-active-color="#4a90e2">
        <swiper-item>
          <view class="banner-item">
            <view class="banner-content">
              <text class="banner-title">24小时线上大药房</text>
              <text class="banner-subtitle">一城十九房</text>
              <text class="banner-desc">让您买的放心与安心</text>
              <button class="banner-btn">点击查看详情</button>
            </view>
            <view class="banner-image">
              <!-- 这里可以替换为真实的图片 -->
              <image src="/static/maiyao/buluofen.png" mode="aspectFit"></image>
            </view>
          </view>
        </swiper-item>
        <swiper-item>
          <view class="banner-item">
            <view class="banner-content">
              <text class="banner-title">专业药师在线服务</text>
              <text class="banner-subtitle">7x24小时为您答疑</text>
              <text class="banner-desc">用药指导，健康咨询</text>
              <button class="banner-btn">立即咨询</button>
            </view>
            <view class="banner-image">
              <image src="/static/maiyao/buluofen.png" mode="aspectFit"></image>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 分类图标 -->
    <view class="category">
      <view class="category-item" v-for="(item, index) in categories" :key="index">
        <view class="category-icon" :style="{backgroundColor: item.bgColor}">
          <!-- 这里可以替换为真实的图标 -->
          <image :src="item.icon" mode="aspectFit"></image>
        </view>
        <text class="category-name">{{ item.name }}</text>
      </view>
    </view>

    <!-- 限时优惠 -->
    <view class="limited-offer">
      <view class="offer-header">
        <text class="offer-title">限时优惠</text>
        <view class="countdown">
          <text class="countdown-item">{{ hours }}</text>
          <text class="countdown-separator">:</text>
          <text class="countdown-item">{{ minutes }}</text>
          <text class="countdown-separator">:</text>
          <text class="countdown-item">{{ seconds }}</text>
        </view>
        <text class="offer-more">全部 >></text>
      </view>
      <view class="offer-list">
        <view class="medicine-card" v-for="(medicine, index) in limitedMedicines" :key="index">
          <view class="medicine-image">
            <image :src="medicine.image" mode="aspectFit"></image>
          </view>
          <view class="medicine-info">
            <text class="medicine-name">{{ medicine.name }}</text>
            <view class="medicine-price">
              <text class="price-current">¥{{ medicine.price }}</text>
              <text class="price-original">¥{{ medicine.originalPrice }}</text>
            </view>
            <view class="medicine-progress">
              <text class="progress-text">已售{{ medicine.sold }}</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{width: medicine.sold}"></view>
              </view>
            </view>
            <button class="buy-btn">去抢购</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 促销专区 -->
    <view class="promotion">
      <view class="promotion-header">
        <text class="promotion-title">促销专区</text>
      </view>
      <view class="promotion-list">
        <view class="promotion-card" v-for="(item, index) in promotions" :key="index">
          <image :src="item.image" mode="aspectFill"></image>
          <text class="promotion-name">{{ item.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'BuyMedicine',
  data() {
    return {
      // 倒计时
      hours: '3',
      minutes: '18',
      seconds: '36',
      // 分类数据
      categories: [
        { name: '对症找药', icon: '/static/maiyao/buluofen.png', bgColor: '#ffebee' },
        { name: '常用药物', icon: '/static/maiyao/buluofen.png', bgColor: '#e8f5e9' },
        { name: '用药回收', icon: '/static/maiyao/buluofen.png', bgColor: '#e3f2fd' },
        { name: '换季必备', icon: '/static/maiyao/buluofen.png', bgColor: '#fff3e0' },
        { name: '处方购药', icon: '/static/maiyao/buluofen.png', bgColor: '#f3e5f5' }
      ],
      // 限时优惠药品
      limitedMedicines: [
        {
          name: '阿瓦斯丁 克隆抗体',
          price: '168',
          originalPrice: '198',
          sold: '68%',
          image: '/static/maiyao/buluofen.png'
        },
        {
          name: '阿斯匹林 克隆抗体',
          price: '168',
          originalPrice: '198',
          sold: '34%',
          image: '/static/maiyao/buluofen.png'
        },
        {
          name: 'Achatinin',
          price: '168',
          originalPrice: '198',
          sold: '51%',
          image: '/static/maiyao/buluofen.png'
        }
      ],
      // 促销专区
      promotions: [
        {
          name: '慢病用药',
          image: '/static/maiyao/buluofen.png'
        },
        {
          name: '儿童用药',
          image: '/static/maiyao/buluofen.png'
        }
      ]
    }
  },
  onLoad() {
    // 启动倒计时
    this.startCountdown()
  },
  onUnload() {
    // 清除倒计时
    if (this.timer) {
      clearInterval(this.timer)
    }
  },
  methods: {
    // 搜索
    onSearch(value) {
      console.log('搜索:', value)
      // 这里可以添加搜索逻辑
    },
    // 启动倒计时
    startCountdown() {
      // 模拟倒计时，实际项目中应该从服务器获取剩余时间
      let totalSeconds = 3 * 24 * 60 * 60 + 18 * 60 + 36
      this.timer = setInterval(() => {
        totalSeconds--
        if (totalSeconds <= 0) {
          clearInterval(this.timer)
          return
        }
        this.hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0')
        this.minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
        this.seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
      }, 1000)
    }
  }
}
</script>

<style scoped>
.buy-medicine-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 搜索栏 */
.search-bar {
  padding: 20rpx;
  background-color: #ffffff;
}

/* 轮播图 */
.banner {
  margin-bottom: 20rpx;
}

.banner-item {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background-color: #e0f7fa;
  border-radius: 20rpx;
}

.banner-content {
  flex: 1;
}

.banner-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #006064;
  margin-bottom: 10rpx;
}

.banner-subtitle {
  display: block;
  font-size: 28rpx;
  color: #00838f;
  margin-bottom: 10rpx;
}

.banner-desc {
  display: block;
  font-size: 24rpx;
  color: #00838f;
  margin-bottom: 20rpx;
}

.banner-btn {
  background-color: #ff9800;
  color: #ffffff;
  border: none;
  border-radius: 80rpx;
  padding: 10rpx 40rpx;
  font-size: 24rpx;
}

.banner-image {
  width: 200rpx;
  height: 200rpx;
}

.banner-image image {
  width: 100%;
  height: 100%;
}

/* 分类 */
.category {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  background-color: #ffffff;
  margin-bottom: 20rpx;
}

.category-item {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10rpx;
}

.category-icon image {
  width: 60rpx;
  height: 60rpx;
}

.category-name {
  font-size: 24rpx;
  color: #333333;
}

/* 限时优惠 */
.limited-offer {
  background-color: #ffffff;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.offer-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.offer-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-right: 20rpx;
}

.countdown {
  display: flex;
  align-items: center;
}

.countdown-item {
  background-color: #ff5722;
  color: #ffffff;
  padding: 5rpx 10rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: bold;
}

.countdown-separator {
  color: #ff5722;
  font-size: 24rpx;
  font-weight: bold;
  margin: 0 5rpx;
}

.offer-more {
  font-size: 24rpx;
  color: #999999;
  margin-left: auto;
}

.offer-list {
  display: flex;
  overflow-x: auto;
  padding-bottom: 10rpx;
}

.medicine-card {
  width: 280rpx;
  background-color: #f5f5f5;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.medicine-image {
  width: 240rpx;
  height: 240rpx;
  background-color: #ffffff;
  border-radius: 10rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10rpx;
}

.medicine-image image {
  width: 200rpx;
  height: 200rpx;
}

.medicine-name {
  display: block;
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.medicine-price {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.price-current {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff5722;
  margin-right: 10rpx;
}

.price-original {
  font-size: 24rpx;
  color: #999999;
  text-decoration: line-through;
}

.medicine-progress {
  margin-bottom: 10rpx;
}

.progress-text {
  display: block;
  font-size: 20rpx;
  color: #999999;
  margin-bottom: 5rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background-color: #e0e0e0;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #ff5722;
  border-radius: 4rpx;
}

.buy-btn {
  width: 100%;
  background-color: #ff5722;
  color: #ffffff;
  border: none;
  border-radius: 80rpx;
  padding: 15rpx;
  font-size: 24rpx;
}

/* 促销专区 */
.promotion {
  background-color: #ffffff;
  padding: 20rpx;
}

.promotion-header {
  margin-bottom: 20rpx;
}

.promotion-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.promotion-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.promotion-card {
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
}

.promotion-card image {
  width: 100%;
  height: 200rpx;
}

.promotion-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  padding: 20rpx;
  font-size: 28rpx;
  font-weight: bold;
}
</style>