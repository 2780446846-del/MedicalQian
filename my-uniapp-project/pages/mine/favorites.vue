<template>
  <view class="fav-page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack"><uni-icons type="left" size="20" color="#333"></uni-icons></view>
      <text class="nav-title">我的收藏</text>
      <view class="nav-right"></view>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 'doctor' }" @click="activeTab = 'doctor'">医生</view>
      <view class="tab" :class="{ active: activeTab === 'article' }" @click="activeTab = 'article'">文章</view>
      <view class="tab" :class="{ active: activeTab === 'hospital' }" @click="activeTab = 'hospital'">医院</view>
    </view>

    <scroll-view class="fav-list" scroll-y>
      <view v-if="currentList.length === 0" class="empty">
        <text class="empty-icon">💫</text>
        <text class="empty-text">暂无收藏内容</text>
        <text class="empty-sub">收藏的{{ tabLabel }}将显示在这里</text>
      </view>

      <view v-for="(item, idx) in currentList" :key="idx" class="fav-card" @click="goDetail(item)">
        <image v-if="item.avatar || item.image" :src="item.avatar || item.image" mode="aspectFill" class="fav-img" />
        <view v-else class="fav-img-placeholder">{{ activeTab === 'doctor' ? '👨‍⚕️' : activeTab === 'hospital' ? '🏥' : '📄' }}</view>
        <view class="fav-info">
          <text class="fav-name">{{ item.name || item.title }}</text>
          <text class="fav-desc">{{ item.desc || item.subtitle || item.department || '' }}</text>
          <text class="fav-meta">{{ item.hospital || item.date || '' }}</text>
        </view>
        <view class="fav-action" @click.stop="removeFav(item, idx)">
          <uni-icons type="heart-filled" size="22" color="#e74c3c"></uni-icons>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activeTab: 'doctor',
      doctors: [],
      articles: [],
      hospitals: []
    };
  },
  computed: {
    currentList() {
      if (this.activeTab === 'doctor') return this.doctors;
      if (this.activeTab === 'article') return this.articles;
      return this.hospitals;
    },
    tabLabel() {
      const m = { doctor: '医生', article: '文章', hospital: '医院' };
      return m[this.activeTab] || '';
    }
  },
  onShow() { this.loadFavorites(); },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) uni.navigateBack();
      else uni.switchTab({ url: '/pages/mine/mine' });
    },
    loadFavorites() {
      this.doctors = uni.getStorageSync('fav_doctors') || [];
      this.articles = uni.getStorageSync('fav_articles') || [];
      this.hospitals = uni.getStorageSync('fav_hospitals') || [];
    },
    removeFav(item, idx) {
      uni.showModal({
        title: '取消收藏',
        content: `确定取消收藏"${item.name || item.title}"吗？`,
        success: (res) => {
          if (res.confirm) {
            const key = `fav_${this.activeTab}s`;
            const list = uni.getStorageSync(key) || [];
            list.splice(idx, 1);
            uni.setStorageSync(key, list);
            this.loadFavorites();
            uni.showToast({ title: '已取消收藏', icon: 'none' });
          }
        }
      });
    },
    goDetail(item) {
      if (this.activeTab === 'doctor' && item.id) {
        uni.navigateTo({ url: `/pages/doctor/detail?id=${item.id}` });
      } else if (this.activeTab === 'article' && item.id) {
        uni.navigateTo({ url: `/pages/yishuo/article-detail?id=${item.id}` });
      } else if (this.activeTab === 'hospital' && item.id) {
        uni.navigateTo({ url: `/pages/hospital-detail/index?id=${item.id}&name=${encodeURIComponent(item.name || '')}` });
      }
    }
  }
};
</script>

<style lang="scss">
.fav-page { min-height: 100vh; background: #f7f8fa; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 30rpx; padding-top: calc(20rpx + env(safe-area-inset-top)); background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.nav-back { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: #333; }
.nav-right { width: 60rpx; }

.tabs { display: flex; background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; position: relative; }
.tab.active { color: #4a90e2; font-weight: 700; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #4a90e2; border-radius: 2rpx; }

.fav-list { height: calc(100vh - 200rpx - env(safe-area-inset-top)); padding: 16rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 30rpx; color: #999; margin-bottom: 8rpx; }
.empty-sub { font-size: 24rpx; color: #ccc; }

.fav-card { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.fav-img { width: 100rpx; height: 100rpx; border-radius: 12rpx; flex-shrink: 0; }
.fav-img-placeholder { width: 100rpx; height: 100rpx; border-radius: 12rpx; background: #f0f4ff; display: flex; align-items: center; justify-content: center; font-size: 48rpx; flex-shrink: 0; }
.fav-info { flex: 1; margin-left: 20rpx; overflow: hidden; }
.fav-name { display: block; font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-desc { display: block; font-size: 24rpx; color: #666; margin-bottom: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-meta { display: block; font-size: 22rpx; color: #999; }
.fav-action { padding: 16rpx; flex-shrink: 0; }
</style>

