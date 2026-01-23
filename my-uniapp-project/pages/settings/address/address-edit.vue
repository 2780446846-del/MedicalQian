<template>
  <view class="page">
    <view class="form-card">
      <view class="form-item">
        <text class="label">收货人</text>
        <input 
          class="input" 
          v-model="formData.name" 
          placeholder="请输入收货人姓名"
          maxlength="20"
        />
      </view>
      
      <view class="form-item">
        <text class="label">手机号</text>
        <input 
          class="input" 
          v-model="formData.phone" 
          type="number"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </view>
      
      <view class="form-item region-input-item">
        <text class="label">所在地区</text>
        <view class="region-input-wrapper">
          <input 
            class="input region-input" 
            v-model="formData.region" 
            placeholder="请输入省/市/区，如：北京市 朝阳区"
            maxlength="50"
          />
          <view class="location-btn" @click="getCurrentLocation">
            <uni-icons type="location" size="18" color="#4a90e2"></uni-icons>
          </view>
          <view class="map-btn" @click="openMapSelector">
            <uni-icons type="map" size="18" color="#4a90e2"></uni-icons>
          </view>
        </view>
      </view>
      
      <view class="form-item">
        <text class="label">详细地址</text>
        <textarea 
          class="textarea" 
          v-model="formData.detail" 
          placeholder="街道、门牌号等详细地址"
          maxlength="100"
        />
      </view>
      
      <view class="form-item checkbox-item">
        <text class="label">设为默认地址</text>
        <switch 
          :checked="formData.isDefault" 
          @change="onDefaultChange"
          color="#4a90e2"
        />
      </view>
    </view>
    
    <view class="save-btn" @click="saveAddress">保存</view>
  </view>
</template>

<script>
import { saveAddress, getAddressById, setDefaultAddress, getAllAddresses } from '@/utils/addressStorage.js';
import { AMAP_WEB_KEY, AMAP_GEOCODE_REGEO_URL, AMAP_COORD_CONVERT_URL } from '@/utils/amapConfig.js';

export default {
  data() {
    return {
      formData: {
        name: '',
        phone: '',
        region: '',
        detail: '',
        isDefault: false
      },
      addressId: null
    };
  },
  onLoad(options) {
    // 如果是编辑模式，加载地址数据
    if (options.id) {
      this.addressId = options.id;
      this.loadAddress();
    }
    
    // 设置导航栏标题
    uni.setNavigationBarTitle({
      title: options.id ? '编辑地址' : '新增地址'
    });
  },
  
  // 地图选择回调
  onMapSelectConfirm(data) {
    if (data.region) {
      this.formData.region = data.region;
    }
    if (data.detail) {
      this.formData.detail = data.detail;
    }
  },
  
  onShow() {
    // 检查是否有地图选择返回的数据
    const mapSelectData = uni.getStorageSync('mapSelectData');
    if (mapSelectData) {
      if (mapSelectData.region) {
        this.formData.region = mapSelectData.region;
      }
      if (mapSelectData.detail) {
        this.formData.detail = mapSelectData.detail;
      }
      uni.removeStorageSync('mapSelectData');
    }
  },
  methods: {
    loadAddress() {
      const address = getAddressById(this.addressId);
      if (address) {
        this.formData = {
          name: address.name || '',
          phone: address.phone || '',
          region: address.region || '',
          detail: address.detail || '',
          isDefault: address.isDefault || false
        };
      }
    },
    // 获取当前位置（定位到保定理工学院）
    getCurrentLocation() {
      uni.showLoading({
        title: '定位中...',
        mask: true
      });
      
      // 直接搜索并定位到保定理工学院
      this.searchTargetLocation();
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
            // 使用找到的坐标进行逆地理编码
            this.reverseGeocode(lng, lat);
            return;
          }
        }
        
        // 搜索失败
        uni.hideLoading();
        this.showLocationError('搜索保定理工学院失败，请手动输入地址');
      } catch (error) {
        console.error('搜索保定理工学院失败:', error);
        uni.hideLoading();
        this.showLocationError('搜索失败，请手动输入地址');
      }
    },
    
    // 逆地理编码（坐标转地址）
    reverseGeocode(lng, lat) {
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
        success: (apiRes) => {
          uni.hideLoading();
          
          if (apiRes.statusCode === 200 && apiRes.data) {
            const data = apiRes.data;
            
            if (data.status === '1' && data.regeocode) {
              const regeocode = data.regeocode;
              const addr = regeocode.addressComponent;
              
              if (addr) {
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
                
                if (region) {
                  this.formData.region = region.trim();
                  
                  // 如果有详细地址，可以自动填充
                  const formattedAddress = String(regeocode.formatted_address || '');
                  if (formattedAddress && !this.formData.detail) {
                    const detailAddress = formattedAddress.replace(region, '').trim();
                    if (detailAddress) {
                      this.formData.detail = detailAddress;
                    }
                  }
                  
                  uni.showToast({
                    title: '定位成功',
                    icon: 'success',
                    duration: 1500
                  });
                } else {
                  this.showLocationError('地址解析失败，请手动输入');
                }
              } else {
                this.showLocationError('地址解析失败，请手动输入');
              }
            } else {
              const errorMsg = data.info || '地址解析失败';
              console.error('高德地图API错误:', errorMsg, data);
              this.showLocationError(errorMsg);
            }
          } else {
            this.showLocationError('网络请求失败，请检查网络');
          }
        },
        fail: (err) => {
          console.error('逆地理编码请求失败:', err);
          uni.hideLoading();
          this.showLocationError('网络请求失败，请检查网络');
        }
      });
    },
    
    // 打开地图选择器
    openMapSelector() {
      uni.navigateTo({
        url: '/pages/settings/address/map-selector',
        fail: (err) => {
          console.error('打开地图选择器失败:', err);
          uni.showToast({
            title: '打开地图失败',
            icon: 'none'
          });
        }
      });
    },
    
    // 显示定位错误提示
    showLocationError(message) {
      uni.showModal({
        title: '定位失败',
        content: message + '，您也可以手动输入地址',
        showCancel: false,
        confirmText: '知道了'
      });
    },
    onDefaultChange(e) {
      this.formData.isDefault = e.detail.value;
    },
    validateForm() {
      if (!this.formData.name || this.formData.name.trim() === '') {
        uni.showToast({
          title: '请输入收货人姓名',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.phone || this.formData.phone.trim() === '') {
        uni.showToast({
          title: '请输入手机号',
          icon: 'none'
        });
        return false;
      }
      
      // 简单的手机号验证
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(this.formData.phone)) {
        uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.region || this.formData.region.trim() === '') {
        uni.showToast({
          title: '请选择所在地区',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.detail || this.formData.detail.trim() === '') {
        uni.showToast({
          title: '请输入详细地址',
          icon: 'none'
        });
        return false;
      }
      
      return true;
    },
    saveAddress() {
      if (!this.validateForm()) {
        return;
      }
      
      const addressData = {
        id: this.addressId,
        name: this.formData.name.trim(),
        phone: this.formData.phone.trim(),
        region: this.formData.region.trim(),
        detail: this.formData.detail.trim(),
        isDefault: this.formData.isDefault
      };
      
      // 保存地址
      const success = saveAddress(addressData);
      
      if (success) {
        // 获取保存后的地址ID（新增时会有新ID）
        const savedAddress = this.addressId 
          ? getAddressById(this.addressId)
          : getAllAddresses().find(addr => 
              addr.name === addressData.name && 
              addr.phone === addressData.phone &&
              addr.region === addressData.region
            );
        
        // 如果设置为默认地址，更新默认地址
        if (addressData.isDefault && savedAddress) {
          setDefaultAddress(savedAddress.id);
        }
        
        uni.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          uni.navigateBack({
            delta: 1
          });
        }, 1500);
      } else {
        uni.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #f3f5fb;
  padding: 20rpx 18rpx 40rpx;
  box-sizing: border-box;
}

.form-card {
  background: #fff;
  border-radius: 14rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.06);
  padding: 20rpx 16rpx;
  margin-bottom: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f1f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.label {
  width: 140rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.textarea {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  min-height: 120rpx;
  padding: 10rpx 0;
}

.region-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.region-text {
  font-size: 28rpx;
  color: #333;
}

.placeholder {
  font-size: 28rpx;
  color: #999;
}

.checkbox-item {
  justify-content: space-between;
}

.region-input-item {
  align-items: flex-start;
  padding-top: 24rpx;
}

.region-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.region-input {
  flex: 1;
}

.location-btn,
.map-btn {
  padding: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f7ff;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.save-btn {
  margin-top: 20rpx;
  background: linear-gradient(180deg, #4a90e2 0%, #1f75e7 100%);
  color: #fff;
  text-align: center;
  height: 86rpx;
  line-height: 86rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.08);
}
</style>

