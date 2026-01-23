<template>
  <view class="page">
    <!-- 医院信息部分 -->
    <view class="hospital-info">
      <view class="hospital-header-row">
        <view class="hospital-left">
          <text class="hospital-name">{{ hospitalInfo.name }}</text>
          <view class="hospital-tags">
            <text class="tag tag-level">{{ hospitalInfo.level }}</text>
            <text class="tag tag-normal">{{ hospitalInfo.type }}</text>
            <text class="tag tag-normal">{{ hospitalInfo.insurance }}</text>
          </view>
          <view class="hospital-address">
            <text class="location-icon">📍</text>
            <text class="address-text">{{ hospitalInfo.address }}</text>
            <text class="map-link" @click="viewOnMap">地图上查看</text>
          </view>
        </view>
        <view class="hospital-homepage" @click="goHospitalHome">
          <text class="homepage-icon">🏥</text>
          <text class="homepage-text">医院首页</text>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-box">
        <input
          class="search-input"
          type="text"
          v-model="searchKeyword"
          placeholder="搜索科室名称"
          placeholder-class="search-placeholder"
          @input="onSearchInput"
        />
        <text class="icon-search">🔍</text>
      </view>
    </view>

    <!-- 科室列表 -->
    <view class="content">
      <!-- 左侧主分类 -->
      <scroll-view class="left-column" scroll-y>
        <view
          v-for="(category, index) in categories"
          :key="index"
          class="category-item"
          :class="{ active: activeCategoryIndex === index }"
          @click="selectCategory(index)"
        >
          <text class="category-text">{{ category.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧具体科室 -->
      <scroll-view class="right-column" scroll-y>
        <view
          v-for="(dept, index) in filteredDepartments"
          :key="index"
          class="dept-item"
          @click="selectDepartment(dept)"
        >
          <text class="dept-text">{{ dept.name }}</text>
          <view v-if="dept.tags && dept.tags.length > 0" class="dept-tags">
            <text
              v-for="(tag, tagIndex) in dept.tags"
              :key="tagIndex"
              class="dept-tag"
              :class="tag.type"
            >
              {{ tag.text }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 右下角悬浮按钮 -->
    <view class="float-btn" @click="onFloatClick">
      <text class="float-icon">☀️</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      hospitalInfo: {
        name: '北京大学第一医院',
        level: '三甲甲等',
        type: '综合医院',
        insurance: '非定点医保',
        address: '北京市东城区东单北大街53号'
      },
      searchKeyword: '',
      activeCategoryIndex: 0,
      categories: [
        {
          name: '内科',
          departments: [
            { name: '神经内科', tags: [{ text: '国家重点', type: 'national' }] },
            { name: '内分泌科', tags: [{ text: '国家重点', type: 'national' }] },
            { name: '呼吸内科', tags: [] },
            { name: '内分泌科(西院)', tags: [{ text: '互联网', type: 'internet' }] },
            { name: '特需内分泌科', tags: [] },
            { name: '消化内科', tags: [] },
            { name: '血液科', tags: [] },
            { name: '肝病科', tags: [] },
            { name: '老年科', tags: [] },
            { name: '免疫科', tags: [] }
          ]
        },
        {
          name: '中医科',
          departments: [
            { name: '中医内科', tags: [] },
            { name: '中医外科', tags: [] },
            { name: '针灸科', tags: [] }
          ]
        },
        {
          name: '妇产科',
          departments: [
            { name: '妇科', tags: [] },
            { name: '产科', tags: [] },
            { name: '计划生育科', tags: [] }
          ]
        },
        {
          name: '变态反应科',
          departments: [
            { name: '过敏反应科', tags: [] }
          ]
        },
        {
          name: '营养科',
          departments: [
            { name: '临床营养科', tags: [] }
          ]
        },
        {
          name: '儿科',
          departments: [
            { name: '小儿内科', tags: [] },
            { name: '小儿外科', tags: [] },
            { name: '新生儿科', tags: [] }
          ]
        },
        {
          name: '五官科',
          departments: [
            { name: '眼科', tags: [] },
            { name: '耳鼻喉科', tags: [] },
            { name: '口腔科', tags: [] }
          ]
        },
        {
          name: '其他',
          departments: [
            { name: '急诊科', tags: [] },
            { name: '康复科', tags: [] }
          ]
        }
      ]
    };
  },
  computed: {
    filteredDepartments() {
      const depts = this.categories[this.activeCategoryIndex].departments;
      if (!this.searchKeyword) {
        return depts;
      }
      return depts.filter(dept => dept.name.includes(this.searchKeyword));
    }
  },
  onLoad(options) {
    // 接收传递的医院信息
    if (options.hospital) {
      try {
        this.hospitalInfo = JSON.parse(decodeURIComponent(options.hospital));
      } catch (e) {
        console.error('解析医院信息失败', e);
      }
    }
  },
  methods: {
    selectCategory(index) {
      this.activeCategoryIndex = index;
      this.searchKeyword = ''; // 切换分类时清空搜索
    },
    selectDepartment(dept) {
      // 跳转到该科室的医生列表页面
      uni.navigateTo({
        url: `/pages/doctor/dept-doctors?dept=${encodeURIComponent(dept.name)}&hospital=${encodeURIComponent(this.hospitalInfo.name)}`
      });
    },
    onSearchInput() {
      // 搜索功能已通过computed实现
    },
    viewOnMap() {
      // 跳转到名医页面的地图视图，并传递医院名称参数
      // 由于 doctor 页面是 tabbar 页面，需要使用 switchTab，但 switchTab 不支持参数
      // 所以使用本地存储来传递参数
      uni.setStorageSync('targetHospitalName', this.hospitalInfo.name);
      uni.setStorageSync('showMapView', true);
      uni.switchTab({
        url: '/pages/doctor/doctor'
      });
    },
    goHospitalHome() {
      // 跳转到医院详情页
      const hospitalName = this.hospitalInfo.name;
      const address = this.hospitalInfo.address || this.getHospitalAddress(hospitalName);
      const level = this.hospitalInfo.level || '三甲';
      const location = this.getHospitalLocation(hospitalName);
      
      uni.navigateTo({
        url: `/pages/hospital-detail/index?name=${encodeURIComponent(hospitalName)}&address=${encodeURIComponent(address)}&level=${encodeURIComponent(level)}&longitude=${location[0]}&latitude=${location[1]}`,
        fail: (err) => {
          console.error('跳转到医院详情页失败:', err);
          uni.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    },
    // 获取医院位置（根据医院名称返回坐标）
    getHospitalLocation(hospitalName) {
      const hospitalLocations = {
        '北京大学第一医院': [116.3732, 39.9885],
        '北京协和医院': [116.4179, 39.9042],
        '北京天坛医院': [116.4074, 39.8806],
        '北京朝阳医院': [116.4681, 39.9289],
        '北京友谊医院': [116.3607, 39.8765],
        '北京同仁医院': [116.4345, 39.9042],
        '北京儿童医院': [116.3509, 39.9042],
        '北京妇产医院': [116.4345, 39.9042],
        '北京肿瘤医院': [116.3509, 39.9042],
        '北京口腔医院': [116.3732, 39.9042],
        '北京301医院': [116.2732, 39.9042],
        '北京安贞医院': [116.4074, 39.9885],
        '北京中日友好医院': [116.4179, 39.9885],
        '北京302医院': [116.2732, 39.9042],
        '北京306医院': [116.3509, 39.9885],
        '北京309医院': [116.2732, 39.9885],
        '北京307医院': [116.2732, 39.9042],
        '北京308医院': [116.2732, 39.9042],
        '北京积水潭医院': [116.3732, 39.9042],
        '北京宣武医院': [116.3607, 39.9042]
      };
      return hospitalLocations[hospitalName] || [116.397428, 39.90923];
    },
    // 获取医院地址（根据医院名称返回地址）
    getHospitalAddress(hospitalName) {
      const hospitalAddresses = {
        '北京大学第一医院': '北京市东城区东单北大街53号',
        '北京协和医院': '北京市东城区王府井大街1号',
        '北京天坛医院': '北京市东城区天坛西里6号',
        '北京朝阳医院': '北京市朝阳区工人体育场南路8号',
        '北京友谊医院': '北京市西城区永安路95号',
        '北京同仁医院': '北京市东城区东交民巷1号',
        '北京儿童医院': '北京市西城区南礼士路56号',
        '北京妇产医院': '北京市朝阳区姚家园路251号',
        '北京肿瘤医院': '北京市海淀区阜成路52号',
        '北京口腔医院': '北京市东城区天坛西里4号',
        '北京301医院': '北京市海淀区复兴路28号',
        '北京安贞医院': '北京市朝阳区安贞路2号',
        '北京中日友好医院': '北京市朝阳区樱花园东街2号',
        '北京302医院': '北京市丰台区西四环中路100号',
        '北京306医院': '北京市朝阳区安翔北里9号',
        '北京309医院': '北京市海淀区黑山扈路17号',
        '北京307医院': '北京市丰台区东大街8号',
        '北京308医院': '北京市海淀区太平路27号',
        '北京积水潭医院': '北京市西城区新街口东街31号',
        '北京宣武医院': '北京市西城区长椿街45号'
      };
      return hospitalAddresses[hospitalName] || '北京市';
    },
    onFloatClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
}

.hospital-info {
  background-color: #ffffff;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.hospital-header-row {
  flex-direction: row;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hospital-left {
  flex: 1;
}

.hospital-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #333333;
  margin-bottom: 16rpx;
  display: block;
  line-height: 1.4;
}

.hospital-tags {
  flex-direction: row;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
  align-items: center;
}

.tag {
  font-size: 24rpx;
  padding: 4rpx 0;
  background-color: transparent;
}

.tag-level {
  color: #ff9800;
}

.tag-normal {
  color: #999999;
}

.hospital-address {
  flex-direction: row;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.location-icon {
  font-size: 22rpx;
  margin-right: 8rpx;
  color: #999999;
}

.address-text {
  font-size: 26rpx;
  color: #999999;
  margin-right: 16rpx;
}

.map-link {
  font-size: 26rpx;
  color: #2979ff;
}

.hospital-homepage {
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 24rpx;
}

.homepage-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
  color: #999999;
}

.homepage-text {
  font-size: 22rpx;
  color: #999999;
}

.search-bar {
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-box {
  height: 64rpx;
  border-radius: 32rpx;
  background-color: #f3f4f6;
  padding: 0 24rpx;
  flex-direction: row;
  align-items: center;
  display: flex;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  margin-right: 12rpx;
}

.icon-search {
  font-size: 28rpx;
  color: #999999;
}

.search-placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

.content {
  flex: 1;
  flex-direction: row;
  display: flex;
  overflow: hidden;
}

.left-column {
  width: 200rpx;
  background-color: #f8f9fa;
  border-right: 1rpx solid #f0f0f0;
}

.category-item {
  padding: 32rpx 20rpx;
  border-left: 6rpx solid transparent;
  position: relative;
}

.category-item.active {
  background-color: #ffffff;
  border-left-color: #2979ff;
}

.category-item.active .category-text {
  color: #2979ff;
  font-weight: 600;
}

.category-text {
  font-size: 28rpx;
  color: #333333;
}

.right-column {
  flex: 1;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
}

.dept-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dept-text {
  font-size: 28rpx;
  color: #333333;
  flex: 1;
}

.dept-tags {
  flex-direction: row;
  display: flex;
  gap: 8rpx;
}

.dept-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.dept-tag.national {
  color: #2979ff;
  background-color: #e6f0ff;
}

.dept-tag.internet {
  color: #ff9800;
  background-color: #fff3e0;
}

.float-btn {
  position: fixed;
  right: 40rpx;
  bottom: 160rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background-color: #ffb84d;
  align-items: center;
  justify-content: center;
  display: flex;
  box-shadow: 0 8rpx 20rpx rgba(255, 170, 51, 0.5);
}

.float-icon {
  font-size: 40rpx;
}
</style>

