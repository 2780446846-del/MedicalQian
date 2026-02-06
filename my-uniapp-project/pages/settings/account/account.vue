<template>
  <view class="page">
    <view class="card">
      <view class="item avatar-item" @click="changeAvatar">
        <text>头像</text>
        <view class="right">
          <image :src="avatarUrl" class="avatar" mode="aspectFill"></image>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="editNickname">
        <text>昵称</text>
        <view class="right">
          <text class="desc">{{ nickname }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="editGender">
        <text>性别</text>
        <view class="right">
          <text class="desc">{{ gender }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="goRealname">
        <text>实名认证</text>
        <view class="right">
          <text class="desc" :class="{ 'auth-success': authStatus === '已认证', 'auth-pending': authStatus === '未认证' }">
            {{ authStatusText }}
          </text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="editPhone">
        <text>手机号</text>
        <view class="right">
          <text class="desc">{{ phoneDesc }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="handleBindEmail">
        <text>邮箱</text>
        <view class="right">
          <text class="desc">{{ emailDesc }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="handleBindQQ">
        <text>QQ 账号</text>
        <view class="right">
          <text class="desc">{{ qqDesc }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item" @click="handleBindWeixin">
        <text>微信</text>
        <view class="right">
          <text class="desc">{{ weixinDesc }}</text>
          <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
        </view>
      </view>

      <view class="item">
        <text>修改密码</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>

      <view class="item warn">
        <text>注销账号</text>
        <uni-icons type="arrowright" size="18" color="#c0c4cc"></uni-icons>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '@/utils/request.js';

export default {
  data() {
    return {
      avatarUrl: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
      nickname: '用户昵称',
      gender: '保密',
      authStatus: '未认证',
      // 默认手机号/邮箱为空：非绑定状态不显示演示数据
      phone: '',
      email: '',
      qqBound: false,
      weixinBound: false,
      bindingLoading: false
    };
  },
  computed: {
    phoneDesc() {
      return this.phone ? this.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定';
    },
    emailDesc() {
      return this.email || '未绑定';
    },
    qqDesc() {
      return this.qqBound ? '已绑定' : '未绑定';
    },
    weixinDesc() {
      return this.weixinBound ? '已绑定' : '未绑定';
    },
    authStatusText() {
      // 根据认证状态返回对应的文字
      if (this.authStatus === '已认证') {
        return '已认证';
      } else {
        return '未认证';
      }
    }
  },
  onShow() {
    // 先从本地缓存快速显示，然后从后端拉取最新数据
    const app = getApp();
    app.globalData = app.globalData || {};
    const userInfo = app.globalData.userInfo || uni.getStorageSync('userInfo') || {};
    this.applyUserData(userInfo);

    // 从后端拉取最新用户数据（包含所有绑定字段）
    this.fetchLatestUserInfo();
  },
  methods: {
    async saveProfile() {
      const app = getApp();
      app.globalData = app.globalData || {};

      
      // 保留已有的认证信息（如果存在）
      const existingProfile = app.globalData.userProfile || {};

      // 合并更新当前用户的资料（本地状态）
      const mergedProfile = {
        ...existingProfile, // 保留已有数据（如 realname, idCard）
        avatarUrl: this.avatarUrl,
        nickname: this.nickname,
        gender: this.gender,
        phone: this.phone,
        email: this.email,
        qqOpenId: this.qqBound ? '已绑定' : '',
        authStatus: this.authStatus || existingProfile.authStatus || '未认证'
      };

      app.globalData.userProfile = mergedProfile;

      // 1. 先调用后端接口持久化到数据库
      try {
        // 准备要发送的数据（确保所有字段都发送，即使是空值）
        const updateData = {
          avatarUrl: this.avatarUrl ? String(this.avatarUrl) : '',
          nickname: this.nickname ? String(this.nickname).trim() : '',
          gender: this.gender ? String(this.gender) : '保密'
        };

        console.log('📤 准备保存到服务器:', {
          avatarUrl: updateData.avatarUrl ? '已设置' : '(空)',
          nickname: updateData.nickname || '(空)',
          gender: updateData.gender || '(空)'
        });

        const res = await request({
          url: '/auth/me',
          method: 'PUT',
          data: updateData,
          needAuth: true
        });

        if (!res || !res.success) {
          throw new Error(res?.message || '保存到服务器失败');
        }

        // 同步服务器返回的最新用户数据
        const updated = res.data || {};
        app.globalData.userInfo = {
          ...(app.globalData.userInfo || {}),
          ...updated
        };

        uni.setStorageSync('userInfo', app.globalData.userInfo);

        // 同时更新本地 userProfile，确保页面显示立即更新
        const userId = app.globalData.userInfo.id || app.globalData.userInfo._id || app.globalData.userInfo.userId || app.globalData.userInfo.username;
        if (userId) {
          const allProfiles = uni.getStorageSync('userProfilesById') || {};
          allProfiles[userId] = {
            ...(allProfiles[userId] || {}),
            ...updated
          };
          uni.setStorageSync('userProfilesById', allProfiles);
          app.globalData.userProfile = allProfiles[userId];
          uni.setStorageSync('userProfile', allProfiles[userId]);
        }

        console.log('✅ 服务器返回的更新后数据:', Object.keys(updated));

        uni.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 2000
        });
      } catch (error) {
        console.error('❌ 保存到服务器失败:', error);
        uni.showToast({
          title: error.message || '保存到服务器失败',
          icon: 'none'
        });
      }

      // 2. 本地按用户ID缓存一份，方便离线显示
      try {
        const userInfo = app.globalData.userInfo || uni.getStorageSync('userInfo') || {};
        const userId = userInfo.id || userInfo._id || userInfo.userId || userInfo.username || 'anonymous';

        const allProfiles = uni.getStorageSync('userProfilesById') || {};
        allProfiles[userId] = mergedProfile;

        uni.setStorageSync('userProfilesById', allProfiles);
        uni.setStorageSync('currentUserId', userId);

        // 兼容旧逻辑：同时保存当前用户的 userProfile
        uni.setStorageSync('userProfile', mergedProfile);

        console.log('✅ 用户资料已按用户ID保存(本地 + 数据库):', userId);
      } catch (e) {
        console.error('❌ 保存本地缓存失败:', e);
      }
    },
    async changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'], // 使用压缩模式
        sourceType: ['album', 'camera'],
        success: async (res) => {
          if (res.tempFilePaths && res.tempFilePaths.length > 0) {
            const picked = res.tempFilePaths[0];
            try {
              // 压缩图片并转换为 base64
              const base64 = await this.compressAndConvertToBase64(picked);
              
              // 检查大小，如果还是太大，进一步压缩
              if (base64.length > 500000) { // 如果超过约 500KB
                console.warn('⚠️ 图片仍然较大，进行二次压缩');
                this.avatarUrl = await this.compressAndConvertToBase64(picked, 0.3); // 更高质量压缩
              } else {
                this.avatarUrl = base64;
              }
              
              console.log('✅ 头像已处理，大小:', (base64.length / 1024).toFixed(2) + 'KB');
              this.saveProfile();
              uni.showToast({ title: '头像已更新', icon: 'none' });
            } catch (error) {
              console.error('❌ 处理头像失败:', error);
              uni.showToast({ title: '头像处理失败，请重试', icon: 'none' });
            }
          }
        }
      });
    },
    editNickname() {
      uni.showModal({
        title: '修改昵称',
        editable: true,
        placeholderText: this.nickname,
        success: (res) => {
          if (res.confirm && res.content) {
            this.nickname = res.content;
            this.saveProfile();
            uni.showToast({ title: '昵称已更新', icon: 'none' });
          }
        }
      });
    },
    editGender() {
      uni.showActionSheet({
        itemList: ['男', '女', '保密'],
        success: (res) => {
          const map = ['男', '女', '保密'];
          this.gender = map[res.tapIndex];
          this.saveProfile();
        }
      });
    },
    async editPhone() {
      await this.handleBindPhone();
    },
    async handleBindPhone() {
      if (this.bindingLoading) return;
      this.bindingLoading = true;
      try {
        const phone = await this.promptInput('绑定手机号', this.phone || '请输入11位手机号');
        if (!phone) return;
        const trimmed = phone.trim();
        if (!/^1[3-9]\d{9}$/.test(trimmed)) {
          uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
          return;
        }

        const sendRes = await request({
          url: '/auth/send-code',
          method: 'POST',
          data: { phone: trimmed, type: 'bind_phone' },
          needAuth: true,
          showLoading: true,
          showError: false
        });
        const autoCode = sendRes?.code || '';
        uni.showToast({ title: '验证码已发送', icon: 'none' });

        const code = await this.promptInput('短信验证码', autoCode || '请输入6位验证码');
        if (!code) return;
        const trimmedCode = code.trim();
        if (trimmedCode.length !== 6) {
          uni.showToast({ title: '请输入6位验证码', icon: 'none' });
          return;
        }

        const bindRes = await request({
          url: '/auth/bind/phone',
          method: 'POST',
          data: { phone: trimmed, code: trimmedCode },
          needAuth: true,
          showLoading: true,
          showError: false
        });

        if (!bindRes?.success) {
          throw new Error(bindRes?.message || '绑定失败');
        }

        const updatedPhone = bindRes?.data?.phone || trimmed;
        this.phone = updatedPhone;
        await this.syncUserInfo({ phone: updatedPhone });
        uni.showToast({ title: '手机号绑定成功', icon: 'success' });
      } catch (error) {
        if (error?.errMsg?.includes('cancel')) return;
        console.error('绑定手机号失败', error);
        uni.showToast({ title: error?.message || error?.msg || '绑定失败', icon: 'none' });
      } finally {
        this.bindingLoading = false;
      }
    },
    async handleBindEmail() {
      if (this.bindingLoading) return;
      try {
        const email = await this.promptInput('绑定邮箱', this.email || '请输入邮箱地址');
        if (!email) return;
        const trimmed = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          uni.showToast({ title: '请输入有效邮箱', icon: 'none' });
          return;
        }

        await request({
          url: '/auth/send-email-code',
          method: 'POST',
          data: { email: trimmed, type: 'bind_email' },
          needAuth: false,
          showLoading: true,
          showError: false
        });
        uni.showToast({ title: '验证码已发送', icon: 'none' });

        const code = await this.promptInput('邮箱验证码', '请输入6位验证码');
        if (!code) return;
        if (code.trim().length !== 6) {
          uni.showToast({ title: '请输入6位验证码', icon: 'none' });
          return;
        }

        this.bindingLoading = true;
        await request({
          url: '/auth/bind/email',
          method: 'POST',
          data: { email: trimmed, code: code.trim() },
          needAuth: true
        });

        this.email = trimmed;
        await this.syncUserInfo({ email: trimmed });
        uni.showToast({ title: '邮箱绑定成功', icon: 'success' });
      } catch (error) {
        if (error?.errMsg?.includes('cancel')) return;
        uni.showToast({ title: error?.message || '绑定失败', icon: 'none' });
      } finally {
        this.bindingLoading = false;
      }
    },
    async handleBindQQ() {
      if (this.bindingLoading) return;
      // #ifndef APP-PLUS
      uni.showToast({ title: 'QQ 绑定仅支持 App', icon: 'none' });
      return;
      // #endif
      // #ifdef APP-PLUS
      try {
        this.bindingLoading = true;
        const authRes = await new Promise((resolve, reject) => {
          uni.login({ provider: 'qq', success: resolve, fail: reject });
        });
        const authResult = authRes?.authResult || {};
        const accessToken = authResult.access_token || authResult.accessToken;
        const openId = authResult.openid || authResult.openId;
        if (!accessToken || !openId) {
          throw new Error('未获取到 QQ 授权凭证');
        }

        let profile = {};
        try {
          const userInfoRes = await new Promise((resolve, reject) => {
            uni.getUserInfo({ provider: 'qq', success: resolve, fail: reject });
          });
          profile = userInfoRes?.userInfo || {};
        } catch (err) {
          console.warn('获取 QQ 用户信息失败', err);
        }

        await request({
          url: '/auth/bind/qq',
          method: 'POST',
          data: {
            code: JSON.stringify({
              accessToken,
              openId,
              profile: {
                nickname: profile.nickname || profile.nickName,
                avatar: profile.figureurl_qq_2 || profile.avatarUrl || profile.avatarUrlHd
              }
            })
          },
          needAuth: true,
          showLoading: true
        });

        this.qqBound = true;
        await this.syncUserInfo({ qqOpenId: openId, avatarUrl: profile.avatarUrl || profile.avatar });
        uni.showToast({ title: 'QQ 绑定成功', icon: 'success' });
      } catch (error) {
        if (error?.errMsg?.includes('cancel')) return;
        uni.showToast({ title: error?.message || 'QQ 绑定失败', icon: 'none' });
      } finally {
        this.bindingLoading = false;
      }
      // #endif
    },
    promptInput(title, placeholder) {
      return new Promise((resolve, reject) => {
        uni.showModal({
          title,
          editable: true,
          placeholderText: placeholder,
          success: (res) => {
            if (res.confirm) {
              resolve(res.content || '');
            } else {
              reject(new Error('cancel'));
            }
          },
          fail: reject
        });
      });
    },
    applyUserData(data) {
      if (!data) return;
      this.avatarUrl = data.avatarUrl || this.avatarUrl;
      this.nickname = data.nickname || this.nickname;
      this.gender = data.gender || this.gender;
      this.phone = data.phone || '';
      this.email = data.email || '';
      this.qqBound = Boolean(data.qqOpenId);
      this.weixinBound = Boolean(data.weixinOpenId);
      this.authStatus = data.authStatus || '未认证';
      if (!this.avatarUrl || this.avatarUrl === '/static/logo.png') {
        this.avatarUrl = 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar';
      }
    },
    async fetchLatestUserInfo() {
      try {
        const res = await request({
          url: '/auth/me',
          method: 'GET',
          needAuth: true,
          showLoading: false,
          showError: false
        });
        if (res?.success && res?.user) {
          const userData = res.user;
          this.applyUserData(userData);
          // 同步到全局和本地存储
          const app = getApp();
          app.globalData = app.globalData || {};
          app.globalData.userInfo = { ...(app.globalData.userInfo || {}), ...userData };
          uni.setStorageSync('userInfo', app.globalData.userInfo);
          console.log('✅ 已从服务器拉取最新用户数据，绑定状态:', {
            phone: !!userData.phone,
            email: !!userData.email,
            qq: !!userData.qqOpenId,
            weixin: !!userData.weixinOpenId
          });
        }
      } catch (e) {
        console.warn('拉取最新用户信息失败:', e);
      }
    },
    async handleBindWeixin() {
      if (this.bindingLoading) return;
      // #ifndef APP-PLUS
      uni.showToast({ title: '微信绑定仅支持 App', icon: 'none' });
      return;
      // #endif
      // #ifdef APP-PLUS
      try {
        this.bindingLoading = true;
        const isInstalled = plus.runtime.isApplicationExist
          ? plus.runtime.isApplicationExist({ pname: 'com.tencent.mm', action: 'weixin://' })
          : true;
        if (!isInstalled) {
          throw new Error('请先安装微信客户端');
        }
        const authRes = await new Promise((resolve, reject) => {
          uni.login({ provider: 'weixin', success: resolve, fail: reject });
        });
        const authResult = authRes?.authResult || {};
        const accessToken = authResult.access_token || authResult.accessToken;
        const openId = authResult.openid || authResult.openId || authResult.unionid;
        if (!openId) {
          throw new Error('未获取到微信授权凭证');
        }

        let profile = {};
        try {
          const userInfoRes = await new Promise((resolve, reject) => {
            uni.getUserInfo({ provider: 'weixin', success: resolve, fail: reject });
          });
          profile = userInfoRes?.userInfo || {};
        } catch (err) {
          console.warn('获取微信用户信息失败', err);
        }

        const bindRes = await request({
          url: '/auth/bind/weixin',
          method: 'POST',
          data: {
            code: JSON.stringify({
              accessToken,
              openId,
              profile: {
                nickname: profile.nickName || profile.nickname,
                avatar: profile.avatarUrl || profile.headimgurl
              }
            })
          },
          needAuth: true,
          showLoading: true
        });

        if (!bindRes?.success) {
          throw new Error(bindRes?.message || '微信绑定失败');
        }

        this.weixinBound = true;
        await this.syncUserInfo({ weixinOpenId: openId });
        uni.showToast({ title: '微信绑定成功', icon: 'success' });
      } catch (error) {
        if (error?.errMsg?.includes('cancel')) return;
        uni.showToast({ title: error?.message || '微信绑定失败', icon: 'none' });
      } finally {
        this.bindingLoading = false;
      }
      // #endif
    },
    async syncUserInfo(partial = {}) {
      const app = getApp();
      app.globalData = app.globalData || {};
      const merged = {
        ...(app.globalData.userInfo || {}),
        ...partial
      };
      app.globalData.userInfo = merged;
      uni.setStorageSync('userInfo', merged);
    },
    goRealname() {
      uni.navigateTo({ url: '/pages/settings/realname/realname' });
    },
    // 压缩图片并转换为 base64
    async compressAndConvertToBase64(imagePath, quality = 0.7) {
      return new Promise((resolve, reject) => {
        if (!imagePath) {
          return resolve('');
        }
        
        // 已经是 dataURL，直接返回
        if (imagePath.startsWith('data:')) {
          return resolve(imagePath);
        }

        // H5 环境：使用 Canvas 压缩
        if (typeof window !== 'undefined') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 限制最大尺寸（800x800）
            const maxSize = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为 base64，使用指定的质量
            const base64 = canvas.toDataURL('image/jpeg', quality);
            resolve(base64);
          };
          img.onerror = () => {
            // 如果 Canvas 压缩失败，使用原方法
            this.convertToBase64(imagePath).then(resolve).catch(reject);
          };
          img.src = imagePath;
        } else {
          // 小程序/APP 环境：使用 uni.compressImage
          uni.compressImage({
            src: imagePath,
            quality: quality * 100, // 转换为 0-100 的百分比
            success: (compressRes) => {
              const compressedPath = compressRes.tempFilePath;
              const fs = uni.getFileSystemManager();
              fs.readFile({
                filePath: compressedPath,
                encoding: 'base64',
                success: (fileRes) => {
                  // 根据文件类型添加前缀
                  const ext = compressedPath.split('.').pop().toLowerCase();
                  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                  resolve(`data:${mimeType};base64,${fileRes.data}`);
                },
                fail: () => resolve(compressedPath)
              });
            },
            fail: (err) => {
              console.warn('图片压缩失败，使用原图:', err);
              // 压缩失败，直接转换原图
              this.convertToBase64(imagePath).then(resolve).catch(reject);
            }
          });
        }
      });
    },
    
    convertToBase64(path) {
      return new Promise((resolve) => {
        if (!path) return resolve('');
        // 已经是 dataURL
        if (path.startsWith('data:')) return resolve(path);
        // H5：把 blob/http 转为 base64 持久化
        if (typeof window !== 'undefined') {
          fetch(path)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result || path);
              reader.onerror = () => resolve(path);
              reader.readAsDataURL(blob);
            })
            .catch(() => resolve(path));
        } else {
          // 小程序/APP 直接返回临时路径
          resolve(path);
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
  padding: 0 10rpx;
}

.item {
  height: 86rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #f0f1f5;
  font-size: 28rpx;
  color: #333;
}

.card .item:last-child {
  border-bottom: none;
}

.avatar-item {
  .avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 36rpx;
    background: #f2f2f2;
  }
}

.right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.desc {
  font-size: 24rpx;
  color: #8f95a3;
}

.desc.auth-success {
  color: #52c41a;
  font-weight: 500;
}

.desc.auth-pending {
  color: #ff9800;
}

.warn {
  color: #e74c3c;
}
</style>
 