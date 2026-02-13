<template>
  <view class="cert-page">
    <!-- 已有认证记录 -->
    <view v-if="certData" class="status-card">
      <view class="status-header">
        <view class="status-icon" :class="'status-' + certData.status">
          <text v-if="certData.status === 'pending'">⏳</text>
          <text v-else-if="certData.status === 'approved'">✅</text>
          <text v-else>❌</text>
        </view>
        <view class="status-info">
          <text class="status-title">{{ statusText }}</text>
          <text class="status-time">提交时间：{{ formatTime(certData.createdAt) }}</text>
        </view>
      </view>

      <view class="cert-detail">
        <view class="detail-row">
          <text class="label">姓名</text>
          <text class="value">{{ certData.realName }}</text>
        </view>
        <view class="detail-row">
          <text class="label">证书编号</text>
          <text class="value">{{ certData.certNo }}</text>
        </view>
        <view class="detail-row" v-if="certData.hospital">
          <text class="label">所在医院</text>
          <text class="value">{{ certData.hospital }}</text>
        </view>
        <view class="detail-row" v-if="certData.department">
          <text class="label">科室</text>
          <text class="value">{{ certData.department }}</text>
        </view>
        <view class="detail-row" v-if="certData.title">
          <text class="label">职称</text>
          <text class="value">{{ certData.title }}</text>
        </view>
        <view class="detail-row" v-if="certData.photos && certData.photos.length">
          <text class="label">证书照片</text>
          <view class="photo-preview-list">
            <image v-for="(p, i) in certData.photos" :key="i" :src="resolvePhoto(p)" mode="aspectFill"
              class="photo-thumb" @click="previewImage(certData.photos, i)" />
          </view>
        </view>
      </view>

      <view v-if="certData.status === 'rejected'" class="reject-info">
        <text class="reject-label">拒绝原因：</text>
        <text class="reject-text">{{ certData.reviewRemark || '无' }}</text>
      </view>

      <view v-if="certData.status === 'revoked'" class="reject-info">
        <text class="reject-label">撤销原因：</text>
        <text class="reject-text">{{ certData.reviewRemark || '无' }}</text>
      </view>

      <!-- 被拒绝或撤销后可以重新提交 -->
      <view v-if="certData.status === 'rejected' || certData.status === 'revoked'" class="btn-area">
        <button class="btn-primary" @click="resetForm">重新申请</button>
      </view>
    </view>

    <!-- 提交表单 -->
    <view v-else class="form-card">
      <view class="form-title">医师资格认证</view>
      <view class="form-tip">请填写您的医师信息并上传执业证书照片，我们将在1-3个工作日内完成审核。</view>

      <view class="form-group">
        <text class="form-label required">真实姓名</text>
        <input class="form-input" v-model="form.realName" placeholder="请输入真实姓名" />
      </view>

      <view class="form-group">
        <text class="form-label required">证书编号</text>
        <input class="form-input" v-model="form.certNo" placeholder="请输入医师资格证书编号" />
      </view>

      <view class="form-group">
        <text class="form-label">所在医院</text>
        <input class="form-input" v-model="form.hospital" placeholder="请输入所在医院名称" />
      </view>

      <view class="form-group">
        <text class="form-label">科室</text>
        <input class="form-input" v-model="form.department" placeholder="请输入所在科室" />
      </view>

      <view class="form-group">
        <text class="form-label">职称</text>
        <input class="form-input" v-model="form.title" placeholder="如：主任医师、副主任医师" />
      </view>

      <view class="form-group">
        <text class="form-label required">证书照片</text>
        <view class="form-tip-small">请拍摄或上传医师资格证书、执业证书的清晰照片</view>
        <view class="photo-area">
          <view v-for="(photo, index) in photoDisplayUrls" :key="index" class="photo-item">
            <image :src="photo" mode="aspectFill" class="photo-img" @click="previewImage(photoDisplayUrls, index)" />
            <view class="photo-del" @click="removePhoto(index)">×</view>
          </view>
          <view v-if="photos.length < 4" class="photo-add" @click="choosePhoto">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="btn-area">
        <button class="btn-primary" :loading="submitting" :disabled="submitting" @click="handleSubmit">提交认证</button>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post, upload } from '@/utils/api.js';
import { API_BASE_URL } from '@/utils/config.js';

// 将相对路径转为绝对URL
function resolvePhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (API_BASE_URL || '').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default {
  data() {
    return {
      certData: null,
      loading: true,
      submitting: false,
      photos: [],
      photoDisplayUrls: [],
      form: {
        realName: '',
        certNo: '',
        hospital: '',
        department: '',
        title: ''
      }
    };
  },
  computed: {
    statusText() {
      if (!this.certData) return '';
      const map = {
        pending: '审核中，请耐心等待',
        approved: '认证已通过',
        rejected: '认证未通过',
        revoked: '认证已被撤销'
      };
      return map[this.certData.status] || '';
    }
  },
  onLoad() {
    this.fetchStatus();
  },
  methods: {
    resolvePhoto(url) {
      return resolvePhotoUrl(url);
    },
    async fetchStatus() {
      try {
        const res = await get('/doctor-cert/my-status');
        if (res && res.success) {
          this.certData = res.data || null;
        }
      } catch (e) {
        console.error('获取认证状态失败:', e);
      } finally {
        this.loading = false;
      }
    },
    choosePhoto() {
      const remaining = 4 - this.photos.length;
      uni.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadPhotos(res.tempFilePaths);
        }
      });
    },
    async uploadPhotos(tempFiles) {
      uni.showLoading({ title: '上传中...' });
      try {
        for (const filePath of tempFiles) {
          const data = await upload('/image/upload', filePath, 'image');
          if (data && data.success && data.data && data.data.url) {
            this.photos.push(data.data.url);
            this.photoDisplayUrls.push(data.data.signedUrl || data.data.url);
          } else if (data && data.url) {
            this.photos.push(data.url);
            this.photoDisplayUrls.push(data.signedUrl || data.url);
          } else {
            uni.showToast({ title: '照片上传失败', icon: 'none' });
          }
        }
      } catch (e) {
        console.error('上传照片失败:', e);
        uni.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    removePhoto(index) {
      this.photos.splice(index, 1);
      this.photoDisplayUrls.splice(index, 1);
    },
    previewImage(urls, index) {
      const resolved = urls.map(u => resolvePhotoUrl(u));
      uni.previewImage({ urls: resolved, current: resolved[index] });
    },
    async handleSubmit() {
      if (!this.form.realName.trim()) {
        return uni.showToast({ title: '请输入真实姓名', icon: 'none' });
      }
      if (!this.form.certNo.trim()) {
        return uni.showToast({ title: '请输入证书编号', icon: 'none' });
      }
      if (this.photos.length === 0) {
        return uni.showToast({ title: '请上传至少一张证书照片', icon: 'none' });
      }

      this.submitting = true;
      try {
        const res = await post('/doctor-cert/submit', {
          realName: this.form.realName.trim(),
          certNo: this.form.certNo.trim(),
          hospital: this.form.hospital.trim(),
          department: this.form.department.trim(),
          title: this.form.title.trim(),
          photos: this.photos
        });
        if (res && res.success) {
          uni.showToast({ title: '提交成功', icon: 'success' });
          this.fetchStatus();
        } else {
          uni.showToast({ title: (res && res.message) || '提交失败', icon: 'none' });
        }
      } catch (e) {
        console.error('提交认证失败:', e);
        uni.showToast({ title: '提交失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    },
    resetForm() {
      this.certData = null;
      this.photos = [];
      this.photoDisplayUrls = [];
      this.form = { realName: '', certNo: '', hospital: '', department: '', title: '' };
    },
    formatTime(t) {
      if (!t) return '';
      const d = new Date(t);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
};
</script>

<style lang="scss" scoped>
.cert-page {
  min-height: 100vh;
  background: #f3f5fb;
  padding: 24rpx;
}

.status-card, .form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.status-header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.status-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 20rpx;
}

.status-pending { background: #fff7e6; }
.status-approved { background: #e6f7e6; }
.status-rejected { background: #ffe6e6; }
.status-revoked { background: #f0f0f0; }

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.status-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.status-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.cert-detail {
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  flex-wrap: wrap;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
}

.detail-row .label {
  width: 160rpx;
  font-size: 26rpx;
  color: #888;
  flex-shrink: 0;
}

.detail-row .value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.photo-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
  width: 100%;
}

.photo-thumb {
  width: 140rpx;
  height: 140rpx;
  border-radius: 8rpx;
  object-fit: cover;
}

.reject-info {
  background: #fff2f0;
  border: 1rpx solid #ffccc7;
  border-radius: 8rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
}

.reject-label {
  font-size: 24rpx;
  color: #cf1322;
  font-weight: 600;
}

.reject-text {
  font-size: 24rpx;
  color: #666;
}

.form-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 12rpx;
}

.form-tip {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-bottom: 36rpx;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 10rpx;
  display: block;
}

.form-label.required::before {
  content: '* ';
  color: #e74c3c;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
  background: #fafafa;
  box-sizing: border-box;
}

.form-tip-small {
  font-size: 22rpx;
  color: #aaa;
  margin-bottom: 12rpx;
}

.photo-area {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: 10rpx;
  overflow: hidden;
  position: relative;
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-del {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 28rpx;
  text-align: center;
  line-height: 40rpx;
  border-bottom-left-radius: 10rpx;
}

.photo-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ccc;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.add-icon {
  font-size: 48rpx;
  color: #ccc;
  line-height: 1;
}

.add-text {
  font-size: 20rpx;
  color: #bbb;
  margin-top: 6rpx;
}

.btn-area {
  margin-top: 36rpx;
}

.btn-primary {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary[disabled] {
  opacity: 0.6;
}
</style>
