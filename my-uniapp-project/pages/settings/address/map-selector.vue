<template>
  <view class="map-selector-page">
    <view class="map-container" id="map-container"></view>
    <view class="search-bar">
      <input 
        class="search-input" 
        v-model="searchKeyword" 
        placeholder="搜索地点"
        @confirm="searchLocation"
      />
      <view class="search-btn" @click="searchLocation">搜索</view>
    </view>
    <view class="bottom-bar">
      <view class="address-info">
        <text class="address-text">{{ selectedAddress || '请在地图上选择位置' }}</text>
      </view>
      <view class="action-btns">
        <view class="btn cancel-btn" @click="cancel">取消</view>
        <view class="btn confirm-btn" @click="confirm">确认</view>
      </view>
    </view>
  </view>
</template>

<script>
import { AMAP_JS_KEY, AMAP_WEB_KEY, AMAP_GEOCODE_REGEO_URL, AMAP_COORD_CONVERT_URL } from '@/utils/amapConfig.js';

export default {
  data() {
    return {
      map: null,
      marker: null,
      selectedLng: null,
      selectedLat: null,
      selectedAddress: '',
      searchKeyword: ''
    };
  },
  onLoad() {
    // #ifdef H5
    this.initMap();
    // #endif
    
    // #ifndef H5
    // 非H5环境可以使用uni.chooseLocation
    uni.chooseLocation({
      success: (res) => {
        uni.setStorageSync('mapSelectData', {
          region: res.address || '',
          detail: res.name || '',
          longitude: res.longitude,
          latitude: res.latitude
        });
        uni.navigateBack();
      },
      fail: () => {
        uni.navigateBack();
      }
    });
    // #endif
  },
  methods: {
    initMap() {
      // #ifdef H5
      if (typeof window === 'undefined') return;
      
      // 加载高德地图JS API
      if (typeof window.AMap === 'undefined') {
        // 创建全局回调函数名
        const callbackName = 'amapInitCallback' + Date.now();
        
        // 创建回调函数
        window[callbackName] = () => {
          this.createMap();
          delete window[callbackName];
        };
        
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${AMAP_JS_KEY}&callback=${callbackName}`;
        
        script.onerror = () => {
          uni.showToast({
            title: '地图加载失败',
            icon: 'none'
          });
          delete window[callbackName];
        };
        
        document.head.appendChild(script);
      } else {
        this.createMap();
      }
      // #endif
    },
    
    createMap() {
      // #ifdef H5
      this.$nextTick(() => {
        const container = document.getElementById('map-container');
        if (!container) {
          console.error('地图容器不存在');
          return;
        }
        
        try {
          // 创建地图实例
          this.map = new window.AMap.Map('map-container', {
            zoom: 15,
            center: [115.464, 38.87], // 保定市默认中心
            resizeEnable: true,
            viewMode: '2D'
          });
          
          // 地图加载完成后自动定位到当前位置
          this.map.on('complete', () => {
            this.getCurrentPosition();
          });
          
          // 监听地图点击事件
          this.map.on('click', (e) => {
            this.onMapClick(e);
          });
          
          // 移除地图移动结束事件，避免频繁调用
          
        } catch (error) {
          console.error('创建地图失败:', error);
          uni.showToast({
            title: '地图初始化失败',
            icon: 'none'
          });
        }
      });
      // #endif
    },
    
    // 使用高德地图定位服务（定位到保定理工学院）
    getCurrentPosition() {
      // #ifdef H5
      if (!window.AMap) {
        // 不支持定位，使用默认位置（保定市）
        this.map.setCenter([115.464, 38.87]);
        this.map.setZoom(15);
        return;
      }
      
      uni.showLoading({
        title: '定位中...',
        mask: true
      });
      
      // 直接搜索并定位到保定理工学院
      this.searchTargetLocation();
      // #endif
    },
    
    onMapClick(e) {
      const lng = e.lnglat.lng;
      const lat = e.lnglat.lat;
      
      // 移动标记
      if (this.marker) {
        this.marker.setPosition([lng, lat]);
      } else {
        // 创建标记
        this.marker = new window.AMap.Marker({
          position: [lng, lat],
          map: this.map
        });
      }
      
      // 逆地理编码（高德地图坐标系统，无需转换）
      this.reverseGeocode(lng, lat);
    },
    
    // 搜索保定理工学院并定位
    async searchTargetLocation() {
      try {
        // 使用高德地图搜索API搜索"保定理工学院"
        const searchRes = await uni.request({
          url: 'https://restapi.amap.com/v3/place/text',
          method: 'GET',
          data: {
            key: AMAP_WEB_KEY,
            keywords: '保定理工学院',
            city: '保定市',
            offset: 1,
            output: 'JSON'
          }
        });
        
        if (searchRes.statusCode === 200 && searchRes.data && searchRes.data.status === '1') {
          const pois = searchRes.data.pois;
          if (pois && pois.length > 0) {
            // 找到保定理工学院相关的POI，使用第一个结果的坐标
            const poi = pois[0];
            const location = poi.location; // 格式: "lng,lat"
            const [lng, lat] = location.split(',').map(Number);
            
            console.log('搜索到保定理工学院坐标:', lng, lat);
            
            // 设置地图中心
            this.map.setCenter([lng, lat]);
            this.map.setZoom(16);
            
            // 添加标记
            if (this.marker) {
              this.marker.setPosition([lng, lat]);
            } else {
              this.marker = new window.AMap.Marker({
                position: [lng, lat],
                map: this.map
              });
            }
            
            // 使用找到的坐标进行逆地理编码
            uni.hideLoading();
            this.reverseGeocode(lng, lat);
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('搜索保定理工学院失败:', error);
        uni.hideLoading();
        return false;
      }
    },
    
    reverseGeocode(lng, lat) {
      this.selectedLng = lng;
      this.selectedLat = lat;
      
      uni.request({
        url: AMAP_GEOCODE_REGEO_URL,
        method: 'GET',
        data: {
          key: AMAP_WEB_KEY,
          location: `${lng},${lat}`,
          radius: 500, // 减小搜索半径，提高精度
          extensions: 'all',
          output: 'JSON'
        },
        success: async (res) => {
          if (res.statusCode === 200 && res.data && res.data.status === '1') {
            const regeocode = res.data.regeocode;
            const addr = regeocode.addressComponent;
            const district = addr ? addr.district : '';
            
            // 检查是否定位到了保定理工学院所在区域（莲池区），如果不是，则搜索保定理工学院
            if (district && !district.includes('莲池区')) {
              console.log('定位到的区域不是莲池区，尝试搜索保定理工学院');
              const searched = await this.searchTargetLocation();
              if (searched) {
                return; // 搜索成功，会再次调用reverseGeocode
              }
            }
            
            this.selectedAddress = regeocode.formatted_address || '';
          }
        },
        fail: (err) => {
          console.error('逆地理编码失败:', err);
          uni.hideLoading();
        }
      });
    },
    
    searchLocation() {
      if (!this.searchKeyword.trim()) {
        uni.showToast({
          title: '请输入搜索关键词',
          icon: 'none'
        });
        return;
      }
      
      // #ifdef H5
      if (!window.AMap) {
        uni.showToast({
          title: '地图未加载',
          icon: 'none'
        });
        return;
      }
      
      // 使用高德地图搜索服务
      const placeSearch = new window.AMap.PlaceSearch({
        city: '保定市', // 限制搜索范围到保定市
        pageSize: 1
      });
      
      placeSearch.search(this.searchKeyword, (status, result) => {
        if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
          const poi = result.poiList.pois[0];
          const location = poi.location;
          
          this.map.setCenter([location.lng, location.lat]);
          this.map.setZoom(16);
          
          // 添加标记
          if (this.marker) {
            this.marker.setPosition([location.lng, location.lat]);
          } else {
            this.marker = new window.AMap.Marker({
              position: [location.lng, location.lat],
              map: this.map
            });
          }
          
          this.selectedAddress = poi.name + ' ' + poi.address;
          this.selectedLng = location.lng;
          this.selectedLat = location.lat;
        } else {
          uni.showToast({
            title: '未找到相关地点',
            icon: 'none'
          });
        }
      });
      // #endif
    },
    
    confirm() {
      if (!this.selectedLng || !this.selectedLat) {
        uni.showToast({
          title: '请选择位置',
          icon: 'none'
        });
        return;
      }
      
      // 解析地址信息
      uni.request({
        url: AMAP_GEOCODE_REGEO_URL,
        method: 'GET',
        data: {
          key: AMAP_WEB_KEY,
          location: `${this.selectedLng},${this.selectedLat}`,
          radius: 500, // 减小搜索半径，提高精度
          extensions: 'all',
          output: 'JSON'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.status === '1') {
            const regeocode = res.data.regeocode;
            const addr = regeocode.addressComponent;
            
            // 拼接省市区
            const province = addr.province || '';
            const city = addr.city || '';
            const district = addr.district || '';
            let region = '';
            if (province) {
              region = province;
              if (city && city !== province) {
                region += ' ' + city;
              }
              if (district) {
                region += ' ' + district;
              }
            }
            
            // 保存地址信息到本地存储
            uni.setStorageSync('mapSelectData', {
              region: region.trim(),
              detail: regeocode.formatted_address || '',
              longitude: this.selectedLng,
              latitude: this.selectedLat
            });
            
            uni.navigateBack();
          }
        }
      });
    },
    
    cancel() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.map-selector-page {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #f5f5f5;
}

.map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.search-bar {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  right: 20rpx;
  display: flex;
  gap: 12rpx;
  z-index: 100;
  background: #fff;
  border-radius: 8rpx;
  padding: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.search-input {
  flex: 1;
  height: 64rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.search-btn {
  width: 100rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  background: #4a90e2;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx;
  z-index: 100;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.address-info {
  margin-bottom: 20rpx;
}

.address-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.action-btns {
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 8rpx;
  font-size: 30rpx;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background: #4a90e2;
  color: #fff;
}
</style>
