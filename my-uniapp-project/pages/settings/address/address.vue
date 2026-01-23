<template>
  <view class="page">
    <view class="card">
      <view 
        class="item" 
        v-for="addr in addresses" 
        :key="addr.id"
        @click="editAddress(addr.id)"
      >
        <view class="item-content">
          <view class="info">
            <text class="name">{{ addr.name }}</text>
            <text class="phone">{{ formatPhone(addr.phone) }}</text>
            <text v-if="addr.isDefault" class="default-tag">默认</text>
          </view>
          <view class="detail">{{ formatAddress(addr) }}</view>
        </view>
        <view class="item-actions">
          <view class="action-btn edit-btn" @click.stop="editAddress(addr.id)">编辑</view>
          <view class="action-btn delete-btn" @click.stop="deleteAddress(addr.id)">删除</view>
        </view>
      </view>
      <view class="empty" v-if="!addresses.length">暂无地址，点击下方按钮新增地址</view>
    </view>
    <view class="add-btn" @click="addAddress">+ 新增地址</view>
  </view>
</template>

<script>
import { getAllAddresses, deleteAddress as removeAddress } from '@/api/address.js';

export default {
  data() {
    return {
      addresses: [],
      loading: false,
      errorMessage: ''
    };
  },
  onShow() {
    this.loadAddresses();
  },
  methods: {
    async loadAddresses() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const res = await getAllAddresses();
        if (res.success && res.data) {
          // 转换数据格式，将_id转换为id
          this.addresses = res.data.map(addr => ({
            ...addr,
            id: addr._id || addr.id
          }));
        } else {
          this.addresses = [];
          console.warn('获取地址列表失败:', res.message);
        }
      } catch (error) {
        console.error('获取地址列表失败:', error);
        this.addresses = [];
        // 如果API失败，尝试从本地存储获取（降级方案）
        try {
          const { getAllAddresses: getLocalAddresses } = await import('@/utils/addressStorage.js');
          const localAddresses = getLocalAddresses();
          if (localAddresses && localAddresses.length > 0) {
            this.addresses = localAddresses;
            return; // 如果有本地数据，不显示错误
          }
        } catch (e) {
          console.error('从本地存储获取地址也失败:', e);
        }
        // 如果是超时或网络错误，显示友好提示
        if (error.errMsg) {
          if (error.errMsg.includes('timeout') || error.errMsg.includes('超时')) {
            this.errorMessage = '连接服务器超时,点击屏幕重试';
          } else if (error.errMsg.includes('fail') || error.errMsg.includes('失败')) {
            this.errorMessage = '连接服务器失败,点击屏幕重试';
          } else {
            this.errorMessage = '加载失败,点击屏幕重试';
          }
        } else {
          this.errorMessage = '加载失败,点击屏幕重试';
        }
      } finally {
        this.loading = false;
      }
    },
    formatPhone(phone) {
      if (!phone) return '';
      if (phone.length === 11) {
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      return phone;
    },
    formatAddress(addr) {
      if (addr.region && addr.detail) {
        return `${addr.region} ${addr.detail}`;
      }
      return addr.detail || addr.region || '';
    },
    addAddress() {
      uni.navigateTo({
        url: '/pages/settings/address/address-edit'
      });
    },
    editAddress(id) {
      uni.navigateTo({
        url: `/pages/settings/address/address-edit?id=${id}`
      });
    },
    async deleteAddress(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这个地址吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await removeAddress(id);
              if (result.success) {
                uni.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                this.loadAddresses();
              } else {
                uni.showToast({
                  title: result.message || '删除失败',
                  icon: 'none'
                });
              }
            } catch (error) {
              console.error('删除地址失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
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

.card {
  background: #fff;
  border-radius: 14rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.06);
  padding: 10rpx 16rpx;
}

.item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f1f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card .item:last-child {
  border-bottom: none;
}

.item-content {
  flex: 1;
}

.info {
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 28rpx;
  color: #333;
}

.name {
  font-weight: 500;
}

.phone {
  font-size: 26rpx;
  color: #666;
}

.default-tag {
  font-size: 20rpx;
  color: #4a90e2;
  background: #e8f4ff;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  margin-left: 8rpx;
}

.detail {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #555;
  line-height: 1.5;
}

.item-actions {
  display: flex;
  gap: 16rpx;
  margin-left: 20rpx;
}

.action-btn {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.edit-btn {
  color: #4a90e2;
  background: #e8f4ff;
}

.delete-btn {
  color: #ff4d4f;
  background: #ffe8e8;
}

.empty {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
}

.error-message {
  text-align: center;
  padding: 60rpx 30rpx;
  color: #999;
  font-size: 28rpx;
  cursor: pointer;
  user-select: none;
}

.error-message:active {
  opacity: 0.7;
}

.add-btn {
  margin-top: 18rpx;
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
 