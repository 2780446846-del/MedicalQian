<template>
  <view class="page">
    <!-- 认证成功页面 -->
    <view v-if="authed" class="success-page">
      <!-- 用户信息区域 -->
      <view class="user-section">
        <image class="avatar" :src="avatarUrl" mode="aspectFill"></image>
        <text class="username">{{ username }}</text>
      </view>

      <!-- 认证成功卡片 -->
      <view class="success-card">
        <view class="success-title">实名认证成功</view>
        <view class="info-item">
          <text class="info-label">真实姓名</text>
          <text class="info-value">{{ realnameMasked }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">证件类型</text>
          <text class="info-value">居民身份证</text>
        </view>
        <view class="info-item">
          <text class="info-label">证件号码</text>
          <text class="info-value">{{ idCardMasked }}</text>
        </view>
      </view>

      <!-- 操作提示 -->
      <view class="tips-section">
        <view class="tip-item">
          <text class="tip-text">若实名人非账号实际使用人请</text>
          <text class="tip-link" @click="changeRealname">变更实名</text>
        </view>
        <view class="tip-item">
          <text class="tip-text">若在公安机关变更了姓名/证件号请</text>
          <text class="tip-link" @click="updateRealname">更新实名</text>
        </view>
      </view>
    </view>

    <!-- 认证表单页面 -->
    <view v-else class="card">
      <view class="title">实名认证</view>
      <!-- 错误提示区域 -->
      <view v-if="errorMessage" class="error-message" @click="retryLoad">
        <text>{{ errorMessage }}</text>
      </view>
      <!-- 表单内容（没有错误时显示） -->
      <view v-if="!errorMessage">
        <view class="paragraph">
          请上传身份证照片并填写信息进行实名认证，系统将自动识别并验证身份证真伪。
        </view>
        <view class="form">
        <view class="form-item">
          <text class="label">姓名</text>
          <input 
            v-model="realname" 
            class="input" 
            placeholder="自动识别或手动输入" 
            :disabled="ocrRecognizing" 
            @input="onRealnameInput"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </view>
        <view class="form-item">
          <text class="label">身份证号</text>
          <input 
            v-model="idCard" 
            class="input" 
            placeholder="自动识别或手动输入" 
            maxlength="18" 
            :disabled="ocrRecognizing" 
            @input="onIdCardInput"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </view>
        
        <!-- OCR识别结果显示（已禁用，只自动填充到输入框，不显示详细识别结果） -->
        <!-- 
        <view v-if="ocrResult && (ocrResult.name || ocrResult.idNumber || ocrResult.address || ocrResult.gender || ocrResult.birthDate || ocrResult.nationality)" class="ocr-result">
          <view class="ocr-result-title">
            <text v-if="ocrResult.name && ocrResult.idNumber">✅ 识别成功</text>
            <text v-else>⚠️ 部分识别</text>
          </view>
          <view v-if="ocrResult.name" class="ocr-result-item">
            <text class="ocr-label">姓名：</text>
            <text class="ocr-value">{{ ocrResult.name }}</text>
          </view>
          <view v-if="ocrResult.idNumber" class="ocr-result-item">
            <text class="ocr-label">身份证号：</text>
            <text class="ocr-value">{{ ocrResult.idNumber }}</text>
          </view>
          <view v-if="ocrResult.gender" class="ocr-result-item">
            <text class="ocr-label">性别：</text>
            <text class="ocr-value">{{ ocrResult.gender }}</text>
          </view>
          <view v-if="ocrResult.birthDate" class="ocr-result-item">
            <text class="ocr-label">出生日期：</text>
            <text class="ocr-value">{{ ocrResult.birthDate }}</text>
          </view>
          <view v-if="ocrResult.nationality" class="ocr-result-item">
            <text class="ocr-label">民族：</text>
            <text class="ocr-value">{{ ocrResult.nationality }}</text>
          </view>
          <view v-if="ocrResult.address" class="ocr-result-item">
            <text class="ocr-label">地址：</text>
            <text class="ocr-value">{{ ocrResult.address }}</text>
          </view>
          <view v-if="ocrResult.issueDate" class="ocr-result-item">
            <text class="ocr-label">签发日期：</text>
            <text class="ocr-value">{{ ocrResult.issueDate }}</text>
          </view>
          <view v-if="ocrResult.expiryDate" class="ocr-result-item">
            <text class="ocr-label">有效期至：</text>
            <text class="ocr-value">{{ ocrResult.expiryDate }}</text>
          </view>
          <view v-if="ocrResult.issueAuthority" class="ocr-result-item">
            <text class="ocr-label">签发机关：</text>
            <text class="ocr-value">{{ ocrResult.issueAuthority }}</text>
          </view>
          <view v-if="!ocrResult.name || !ocrResult.idNumber" class="ocr-result-tip">
            <text class="tip-text">⚠️ 部分信息未识别，请手动补充</text>
          </view>
        </view>
        -->
        
        <!-- 身份证正面 -->
        <view class="upload-section">
          <text class="upload-label">身份证正面</text>
          <view class="upload-box" @click="chooseIdCardImage('front')">
            <image v-if="idCardFront" :src="idCardFront" mode="aspectFill" class="upload-image"></image>
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传</text>
            </view>
            <view v-if="idCardFront" class="upload-remove" @click.stop="removeIdCardImage('front')">×</view>
          </view>
          <text class="upload-tip">请上传清晰的身份证正面照片</text>
        </view>
        
        <!-- 身份证反面 -->
        <view class="upload-section">
          <text class="upload-label">身份证反面</text>
          <view class="upload-box" @click="chooseIdCardImage('back')">
            <image v-if="idCardBack" :src="idCardBack" mode="aspectFill" class="upload-image"></image>
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传</text>
            </view>
            <view v-if="idCardBack" class="upload-remove" @click.stop="removeIdCardImage('back')">×</view>
          </view>
          <text class="upload-tip">请上传清晰的身份证反面照片</text>
        </view>
        </view>
        <view class="btn" @click="startAuth" :class="{ 'btn-disabled': loading }">
          {{ loading ? '认证中...' : '提交认证' }}
        </view>
      </view>
    </view>
    
    <!-- 摄像头预览模态框 (H5环境) -->
    <!-- #ifdef H5 -->
    <view v-if="showCameraModal" class="camera-modal" @click.self="closeCamera">
      <view class="camera-container">
        <view class="camera-header">
          <text class="camera-title">人脸比对认证</text>
          <text class="camera-close" @click="closeCamera">×</text>
        </view>
        <view class="camera-content">
          <!-- 使用Canvas显示摄像头画面，避免video播放问题 -->
          <!-- #ifdef H5 -->
          <!-- Canvas容器，动态创建原生canvas元素 -->
          <view 
            id="camera-canvas-container"
            class="camera-canvas-container"
            :class="{ 'camera-capturing': isCapturing }"
          ></view>
          <video 
            id="camera-video"
            autoplay 
            playsinline
            webkit-playsinline
            muted
            style="display: none;"
          ></video>
          <!-- #endif -->
          <view v-if="!cameraStream" class="camera-loading">
            <text>正在初始化摄像头...</text>
          </view>
          <view v-if="isCapturing" class="camera-flash"></view>
          <view class="camera-tips">
            <text class="camera-tips-main">请正对摄像头，确保光线充足</text>
            <text class="camera-tips-sub">系统将进行活体检测，请确保是本人操作</text>
          </view>
        </view>
        <view class="camera-actions">
          <view class="camera-btn camera-btn-cancel" @click="closeCamera">取消</view>
          <view class="camera-btn camera-btn-capture" @click="capturePhoto">拍照</view>
        </view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
import { verifyIdCard, ocrRecognizeIdCard, faceVerifyIdCard } from '@/api/idcard.js';
import { upload } from '@/utils/api.js';
import { getToken } from '@/utils/auth.js';
import { API_BASE_URL } from '@/utils/config.js';

export default {
  data() {
    return {
      realname: '',
      idCard: '',
      authed: false,
      loading: false,
      ocrRecognizing: false, // OCR识别中
      ocrResult: null, // OCR识别结果
      frontImageId: null, // 正面图片ID
      backImageId: null, // 反面图片ID
      username: '',
      avatarUrl: '/static/logo.png', // 默认头像，可以从用户信息中获取
      idCardFront: '', // 身份证正面图片路径
      idCardBack: '', // 身份证反面图片路径
      idCardFrontPath: '', // 身份证正面本地文件路径（用于上传）
      idCardBackPath: '', // 身份证反面本地文件路径（用于上传）
      faceImageFile: null, // H5环境下保存的File对象
      isUserInputting: false, // 用户正在输入或操作中（防止onShow时清空输入框）
      // 摄像头相关
      showCameraModal: false, // 是否显示摄像头模态框
      cameraStream: null, // 摄像头流
      cameraVideo: null, // 视频元素引用（隐藏）
      cameraCanvas: null, // Canvas元素引用
      cameraCanvasCtx: null, // Canvas上下文
      cameraAnimationFrame: null, // 动画帧ID
      cameraResolve: null, // Promise resolve回调
      cameraReject: null, // Promise reject回调
      isCapturing: false, // 是否正在拍照
      cameraResizeObserver: null, // ResizeObserver实例
      errorMessage: '' // 错误信息
    };
  },
  // #ifdef H5
  beforeDestroy() {
    // 组件销毁前关闭摄像头
    this.closeCamera();
  },
  // #endif
  onLoad() {
    // 页面加载时立即同步检查认证状态，避免页面闪烁
    this.checkAuthStatusSync();
  },
  onShow() {
    // 如果用户正在输入或操作中，不检查认证状态，避免清空输入框
    if (this.isUserInputting || this.loading || this.ocrRecognizing) {
      console.log('ℹ️ 用户正在操作中，跳过认证状态检查，避免清空输入框');
      return;
    }
    
    // 如果已有输入内容或图片，不检查认证状态，避免清空
    if ((this.realname && this.realname.trim()) || 
        (this.idCard && this.idCard.trim()) || 
        this.idCardFront || 
        this.idCardBack) {
      console.log('ℹ️ 检测到用户输入内容，跳过认证状态检查，避免清空输入框');
      return;
    }
    
    // 页面显示时再次检查（处理从其他页面返回的情况）
    this.checkAuthStatusSync();
    
    // 然后异步从后端获取最新的认证状态（后台更新，不阻塞页面显示）
    // 只有在有token时才尝试从后端获取，避免无token时显示错误
    const token = uni.getStorageSync('token') || uni.getStorageSync('sso_token');
    if (token) {
      this.fetchUserInfoFromBackend();
    } else {
      // 没有token时，直接使用本地数据，不显示错误
      this.loadLocalProfile();
    }
  },
  computed: {
    idCardMasked() {
      if (!this.idCard) return '';
      // 格式：1****************5（只显示首尾）
      return this.idCard.charAt(0) + '*'.repeat(this.idCard.length - 2) + this.idCard.charAt(this.idCard.length - 1);
    },
    realnameMasked() {
      if (!this.realname) return '';
      // 格式：**埔（只显示最后一个字）
      if (this.realname.length === 1) return '*';
      if (this.realname.length === 2) return '*' + this.realname.slice(-1);
      return '*'.repeat(this.realname.length - 1) + this.realname.slice(-1);
    }
  },
  methods: {
    // 输入框获得焦点时，标记用户正在输入
    onInputFocus() {
      this.isUserInputting = true;
      console.log('📝 用户开始输入，设置isUserInputting=true');
    },
    // 输入框失去焦点时，延迟清除标记（给onShow时间检查）
    onInputBlur() {
      // 延迟清除标记，确保onShow能检测到
      setTimeout(() => {
        if (!this.loading && !this.ocrRecognizing) {
          this.isUserInputting = false;
          console.log('📝 用户输入结束，清除isUserInputting标记');
        }
      }, 500);
    },
    // 姓名输入事件
    onRealnameInput(e) {
      this.isUserInputting = true;
      this.realname = e.detail.value || e.target.value || '';
    },
    // 身份证号输入事件
    onIdCardInput(e) {
      this.isUserInputting = true;
      this.idCard = e.detail.value || e.target.value || '';
    },
    // 同步检查认证状态（立即执行，不等待网络请求）
    checkAuthStatusSync() {
      const app = getApp();
      
      try {
        // 优先从 userInfo 读取（来自后端，最准确）
        const userInfo = app.globalData?.userInfo || uni.getStorageSync('userInfo') || {};
        const authStatusFromUserInfo = userInfo.authStatus;
        
        // 其次从本地存储读取
        let stored = {};
        try {
          stored = uni.getStorageSync('userProfile') || {};
        } catch (e) {
          console.warn('读取本地存储失败:', e);
        }
        
        if (!stored || Object.keys(stored).length === 0) {
          stored = (app.globalData && app.globalData.userProfile) || {};
        }
        
        // 立即判断认证状态（优先使用 userInfo 中的状态）
        const isAuthed = authStatusFromUserInfo === '已认证' || 
                        (stored.realname && stored.authStatus === '已认证');
        
        if (isAuthed) {
          // 已认证：立即设置状态，显示成功页面
          this.realname = userInfo.realname || stored.realname || '';
          this.idCard = userInfo.idCard || stored.idCard || '';
          this.authed = true;
          this.username = userInfo.username || userInfo.nickname || stored.nickname || '用户';
          this.avatarUrl = userInfo.avatarUrl || stored.avatarUrl || '/static/logo.png';
        } else {
          // 未认证：显示认证表单（但不清空已有输入）
          // 只有在没有用户输入时才清空
          if (!this.isUserInputting && !this.realname && !this.idCard && !this.idCardFront && !this.idCardBack) {
            this.realname = '';
            this.idCard = '';
          }
          this.authed = false;
          this.username = userInfo.username || userInfo.nickname || stored.nickname || '用户';
          this.avatarUrl = userInfo.avatarUrl || stored.avatarUrl || '/static/logo.png';
        }
      } catch (e) {
        console.error('❌ 同步检查认证状态失败:', e);
        // 失败时默认显示认证表单
        this.authed = false;
      }
    },
    // 从后端获取用户信息（包括认证状态）
    async fetchUserInfoFromBackend() {
      const app = getApp();
      this.errorMessage = ''; // 清空错误信息
      try {
        // 检查是否有token，如果没有token说明未登录，直接使用本地数据，不显示错误
        const token = uni.getStorageSync('token') || uni.getStorageSync('sso_token');
        if (!token) {
          console.log('ℹ️ 未登录，使用本地数据');
          this.loadLocalProfile();
          return;
        }
        
        const { request } = await import('@/utils/request.js');
        const res = await request({
          url: '/auth/me',
          method: 'GET',
          showLoading: false,
          showError: false
        });

        if (res.success && res.user) {
          const userInfoFromBackend = res.user;
          app.globalData.userInfo = userInfoFromBackend;
          uni.setStorageSync('userInfo', userInfoFromBackend);

          // 根据后端返回的authStatus判断是否已认证
          if (userInfoFromBackend.authStatus === '已认证' && userInfoFromBackend.realname) {
            this.realname = userInfoFromBackend.realname;
            this.idCard = userInfoFromBackend.idCard || '';
            this.authed = true;
            
            // 同步到本地存储和全局数据
            const profile = {
              realname: userInfoFromBackend.realname,
              idCard: userInfoFromBackend.idCard,
              authStatus: '已认证'
            };
            app.globalData.userProfile = profile;
            uni.setStorageSync('userProfile', profile);
          } else {
            // 未认证：但不清空已有输入（用户可能正在输入）
            // 只有在没有用户输入时才清空
            if (!this.isUserInputting && !this.realname && !this.idCard && !this.idCardFront && !this.idCardBack) {
              this.realname = '';
              this.idCard = '';
            }
            this.authed = false;
            
            // 同步到本地存储
            const profile = {
              realname: this.realname || '',
              idCard: this.idCard || '',
              authStatus: '未认证'
            };
            app.globalData.userProfile = profile;
            uni.setStorageSync('userProfile', profile);
          }

          // 更新用户基本信息
          this.username = userInfoFromBackend.username || userInfoFromBackend.nickname || '用户';
          this.avatarUrl = userInfoFromBackend.avatarUrl || '/static/logo.png';
        } else {
          // 后端获取失败，使用本地数据，不显示错误
          console.warn('⚠️ 后端返回数据格式异常，使用本地数据');
          this.loadLocalProfile();
        }
      } catch (error) {
        console.error('❌ 从后端获取用户信息异常:', error);
        
        // 如果是401错误（未授权），说明token无效，清除token并使用本地数据，不显示错误
        if (error.message && (error.message.includes('401') || error.message.includes('未提供认证令牌') || error.message.includes('未授权'))) {
          console.log('ℹ️ Token无效或未授权，清除token并使用本地数据');
          uni.removeStorageSync('token');
          uni.removeStorageSync('sso_token');
          this.loadLocalProfile();
          return;
        }
        
        // 检查是否是业务错误（success: false），这种情况也不显示错误，使用本地数据
        if (error.success === false || (error.message && !error.errMsg)) {
          console.log('ℹ️ 业务错误，使用本地数据');
          this.loadLocalProfile();
          return;
        }
        
        // 只有在真正的网络错误（超时、连接失败等）时才显示错误信息
        if (error.errMsg) {
          if (error.errMsg.includes('timeout') || error.errMsg.includes('超时')) {
            this.errorMessage = '连接服务器超时,点击屏幕重试';
          } else if (error.errMsg.includes('fail') && !error.errMsg.includes('401')) {
            // 排除401错误，因为401已经在上面处理了
            this.errorMessage = '连接服务器失败,点击屏幕重试';
          } else {
            // 其他错误，不显示错误信息，使用本地数据
            console.log('ℹ️ 其他错误，使用本地数据');
            this.loadLocalProfile();
            return;
          }
        } else {
          // 没有errMsg的错误，可能是业务错误，使用本地数据
          console.log('ℹ️ 未知错误类型，使用本地数据');
          this.loadLocalProfile();
          return;
        }
        
        // 只有在显示错误信息时才调用loadLocalProfile作为后备
        this.loadLocalProfile();
      }
    },
    // 重试加载
    retryLoad() {
      this.errorMessage = '';
      this.fetchUserInfoFromBackend();
    },
    // 加载本地用户资料（作为后备方案，用于快速显示）
    loadLocalProfile() {
      const app = getApp();
      let stored = {};
      try {
        stored = uni.getStorageSync('userProfile') || {};
      } catch (e) {
        console.warn('读取本地存储失败:', e);
      }

      if (!stored || Object.keys(stored).length === 0) {
        stored = (app.globalData && app.globalData.userProfile) || {};
      }

      // 同时检查 userInfo 中的认证状态（优先级更高）
      const userInfo = app.globalData.userInfo || uni.getStorageSync('userInfo') || {};
      const authStatusFromUserInfo = userInfo.authStatus;
      
      // 根据本地存储和 userInfo 的 authStatus 判断（优先使用 userInfo）
      const isAuthed = authStatusFromUserInfo === '已认证' || 
                      (stored.realname && stored.authStatus === '已认证');
      
      if (isAuthed) {
        // 优先使用 userInfo 中的数据，其次使用 stored 中的数据
        this.realname = userInfo.realname || stored.realname || '';
        this.idCard = userInfo.idCard || stored.idCard || '';
        this.authed = true;
      } else {
        this.realname = '';
        this.idCard = '';
        this.authed = false;
      }
      
      // 更新用户名和头像显示
      this.username = userInfo.username || userInfo.nickname || stored.nickname || '用户';
      this.avatarUrl = userInfo.avatarUrl || stored.avatarUrl || this.avatarUrl || '/static/logo.png';

      console.log('📋 实名认证页面已加载本地资料:', {
        authed: this.authed,
        realname: this.realname ? '已设置' : '未设置'
      });
    },
    // 选择身份证图片
    async chooseIdCardImage(type) {
      // 标记用户正在操作
      this.isUserInputting = true;
      
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          if (type === 'front') {
            this.idCardFront = tempFilePath;
            this.idCardFrontPath = tempFilePath;
            // 清除之前的OCR识别结果（但不清空已填入的信息）
            this.ocrResult = null;
            this.frontImageId = null;
            // 不清空已填入的姓名和身份证号，保留用户输入
            
            // 上传正面图片后立即进行OCR识别
            console.log('📸 已选择身份证正面图片，开始OCR识别...');
            await this.performOCRForImage('front', tempFilePath);
          } else {
            this.idCardBack = tempFilePath;
            this.idCardBackPath = tempFilePath;
            // 反面图片只上传，不进行OCR识别，只验证真实性
            console.log('📸 已选择身份证反面图片，开始上传（仅验证真实性，不识别）...');
            await this.uploadBackImageOnly(tempFilePath);
          }
          // 操作完成后，延迟清除标记
          setTimeout(() => {
            if (!this.loading && !this.ocrRecognizing) {
              this.isUserInputting = false;
            }
          }, 1000);
        },
        fail: (err) => {
          // 用户取消选择时不显示错误
          if (err.errMsg && err.errMsg.includes('cancel')) {
            console.log('用户取消选择图片');
            return;
          }
          console.error('选择图片失败:', err);
          // 只在非取消的情况下显示错误
          if (!err.errMsg || !err.errMsg.includes('cancel')) {
            uni.showToast({ title: '选择图片失败', icon: 'none' });
          }
        }
      });
    },
    
    // 为单个图片执行OCR识别（上传后立即识别）
    async performOCRForImage(type, imagePath) {
      if (!imagePath) {
        console.warn('⚠️ 图片路径为空，无法进行OCR识别');
        return;
      }
      
      // 检查网络状态（移动端）
      try {
        const networkType = await new Promise((resolve) => {
          uni.getNetworkType({
            success: (res) => {
              console.log('📶 当前网络类型:', res.networkType);
              resolve(res.networkType);
            },
            fail: () => {
              console.warn('⚠️ 无法获取网络状态');
              resolve('unknown');
            }
          });
        });
        
        if (networkType === 'none') {
          uni.hideLoading();
          uni.showModal({
            title: '网络未连接',
            content: '请检查网络连接后重试',
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
          return;
        }
        
        if (networkType === '2g') {
          console.warn('⚠️ 当前为2G网络，上传可能较慢，请耐心等待');
        }
      } catch (e) {
        console.warn('⚠️ 无法检测网络状态:', e);
      }
      
      this.ocrRecognizing = true;
      
      try {
        // 标记用户正在操作
        this.isUserInputting = true;
        
        console.log(`🔍 开始OCR识别身份证${type === 'front' ? '正面' : '反面'}...`);
        console.log(`📸 图片路径: ${imagePath}`);
        
        // 优化加载提示，减少用户等待焦虑
        uni.showLoading({ 
          title: type === 'front' ? '正在识别，请稍候...' : '正在识别，请稍候...', 
          mask: true 
        });
        
        // 只识别正面，不识别反面
        const frontPath = type === 'front' ? imagePath : this.idCardFrontPath;
        // 不传递反面路径，只识别正面
        console.log(`📤 调用OCR识别接口，正面路径: ${frontPath || '空'}`);
        
        // 使用Promise.race添加超时处理（如果API本身没有超时）
        const ocrPromise = ocrRecognizeIdCard(frontPath || '', '');
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('识别超时，请重试'));
          }, 25000); // 25秒超时（比API的30秒稍短）
        });
        
        const res = await Promise.race([ocrPromise, timeoutPromise]);
        
        // 首先检查是否是因为非身份证导致的失败
        if (res.isNotIdCard || (!res.success && res.isNotIdCard !== undefined)) {
          console.warn('⚠️ 上传的图片不是身份证:', res.reason || res.message);
          uni.hideLoading();
          uni.showModal({
            title: '图片验证失败',
            content: res.message || '上传的图片不是有效的身份证照片，请重新上传清晰的身份证正面或反面照片',
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
              // 清除已上传的图片
              if (type === 'front') {
                this.idCardFront = '';
                this.idCardFrontPath = '';
                this.frontImageId = null;
                this.ocrResult = null;
                // 不清空已输入的姓名和身份证号，保留用户输入
              } else {
                this.idCardBack = '';
                this.idCardBackPath = '';
                this.backImageId = null;
              }
              return;
        }
        
        if (res.success && res.data) {
          // 输出详细的识别结果用于调试
          console.log('📋 OCR识别返回数据:', JSON.stringify(res.data, null, 2));
          console.log('📋 完整响应:', JSON.stringify(res, null, 2));
          
          // 再次检查识别结果是否为空（双重验证）
          const hasName = res.data.name && res.data.name.trim() !== '';
          const hasIdNumber = res.data.idNumber && res.data.idNumber.trim() !== '';
          
          console.log('📋 检查结果 - 姓名:', hasName ? res.data.name : '空');
          console.log('📋 检查结果 - 身份证号:', hasIdNumber ? res.data.idNumber : '空');
          
          // 如果姓名和身份证号都为空，但允许手动输入（partial模式）
          if (!hasName && !hasIdNumber) {
            if (res.requiresManualInput || res.partial) {
              // 允许手动输入模式，不清除图片
              console.log('ℹ️ OCR识别未提取到信息，允许手动输入');
              uni.hideLoading();
              uni.showToast({
                title: '识别未成功，请手动输入信息',
                icon: 'none',
                duration: 2000
              });
              // 保留图片，允许用户手动输入
              return;
            } else {
              console.warn('⚠️ OCR识别结果为空，不是身份证');
              uni.hideLoading();
              uni.showModal({
                title: '图片验证失败',
                content: '未识别到身份证信息，请确保上传的是清晰的身份证正面照片',
                showCancel: false,
                confirmText: '我知道了',
                confirmColor: '#4a90e2'
              });
              // 清除已上传的图片
              if (type === 'front') {
                this.idCardFront = '';
                this.idCardFrontPath = '';
                this.frontImageId = null;
                this.ocrResult = null;
                // 不清空已输入的姓名和身份证号，保留用户输入
              } else {
                this.idCardBack = '';
                this.idCardBackPath = '';
                this.backImageId = null;
              }
              return;
            }
          }
          
          // 保存OCR识别结果
          this.ocrResult = res.data;
          this.frontImageId = res.frontImageId || this.frontImageId;
          this.backImageId = res.backImageId || this.backImageId;
          
          // 立即自动填充姓名和身份证号（无论是否完整）
          if (hasName) {
            this.realname = res.data.name;
            console.log('✅ 已自动填充姓名:', res.data.name);
          }
          if (hasIdNumber) {
            this.idCard = res.data.idNumber;
            console.log('✅ 已自动填充身份证号:', res.data.idNumber);
          }
          
          uni.hideLoading();
          
          // 检查是否为部分识别
          if (res.partial || !hasName || !hasIdNumber) {
            // 部分识别，提示用户手动输入缺失信息
            console.log('ℹ️ OCR部分识别，已填充可用信息:', res.data);
            uni.showToast({ 
              title: '识别部分成功，请补充缺失信息', 
              icon: 'none',
              duration: 2000
            });
          } else {
            // 完全识别成功，提示用户
            console.log('✅ OCR识别成功:', res.data);
            uni.showToast({ 
              title: '识别成功，信息已自动填充', 
              icon: 'success', 
              duration: 2000 
            });
          }
        } else {
          // OCR识别失败，静默处理，不显示错误提示
          console.log('ℹ️ OCR识别未返回数据，请手动输入');
          uni.hideLoading();
          uni.showToast({ 
            title: '识别失败，请手动输入信息', 
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        // OCR识别失败，提供详细的错误信息
        console.error('❌ OCR识别失败:', error);
        uni.hideLoading();
        
        let errorMsg = '识别失败，请手动输入信息';
        if (error.message) {
          if (error.message.includes('timeout') || error.message.includes('超时')) {
            errorMsg = '识别超时，请检查网络连接后重试';
          } else if (error.message.includes('网络')) {
            errorMsg = '网络连接失败，请检查网络后重试';
          } else {
            errorMsg = `识别失败: ${error.message}`;
          }
        }
        
        uni.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 3000
        });
      } finally {
        this.ocrRecognizing = false;
        // OCR识别完成后，延迟清除操作标记
        setTimeout(() => {
          if (!this.loading) {
            this.isUserInputting = false;
          }
        }, 500);
      }
    },
    
    // 执行OCR识别
    async performOCR() {
      if (!this.idCardFrontPath) {
        return;
      }
      
      this.ocrRecognizing = true;
      this.ocrResult = null;
      
      try {
        console.log('🔍 开始OCR识别...');
        uni.showLoading({ title: '识别中...', mask: true });
        
        const res = await ocrRecognizeIdCard(this.idCardFrontPath, this.idCardBackPath);
        
        if (res.success && res.data) {
          // 保存OCR识别结果
          this.ocrResult = res.data;
          this.frontImageId = res.frontImageId;
          this.backImageId = res.backImageId;
          
          // 立即自动填充姓名和身份证号（无论是否完整）
          if (res.data.name) {
            this.realname = res.data.name;
            console.log('✅ 已填充姓名:', res.data.name);
          }
          if (res.data.idNumber) {
            this.idCard = res.data.idNumber;
            console.log('✅ 已填充身份证号:', res.data.idNumber);
          }
          
          uni.hideLoading();
          
          // 检查是否为部分识别
          if (res.partial) {
            // 部分识别，提示用户手动输入缺失信息
            console.log('ℹ️ OCR部分识别，已填充可用信息:', res.data);
            uni.showToast({ 
              title: '识别部分成功，请补充缺失信息', 
              icon: 'none',
              duration: 2000
            });
          } else {
            // 完全识别成功，提示用户
            console.log('✅ OCR识别成功:', res.data);
            uni.showToast({ title: '识别成功', icon: 'success', duration: 1500 });
            // 不自动认证，等待用户点击提交按钮
          }
        } else {
          // OCR识别失败，静默处理，不显示错误提示
          console.log('ℹ️ OCR识别未返回数据，请手动输入');
          uni.hideLoading();
          // 不显示错误提示，让用户手动输入
        }
      } catch (error) {
        // OCR识别失败，静默处理，不显示错误提示
        console.log('ℹ️ OCR识别失败，请手动输入:', error.message);
        uni.hideLoading();
        // 不显示错误提示，让用户手动输入
      } finally {
        this.ocrRecognizing = false;
        // OCR识别完成后，延迟清除操作标记
        setTimeout(() => {
          if (!this.loading) {
            this.isUserInputting = false;
          }
        }, 500);
      }
    },
    // 只上传反面图片（不进行OCR识别，只验证真实性）
    async uploadBackImageOnly(imagePath) {
      if (!imagePath) {
        console.warn('⚠️ 反面图片路径为空，无法上传');
        return;
      }
      
      // 检查网络状态（移动端）
      try {
        const networkType = await new Promise((resolve) => {
          uni.getNetworkType({
            success: (res) => {
              console.log('📶 当前网络类型:', res.networkType);
              resolve(res.networkType);
            },
            fail: () => {
              console.warn('⚠️ 无法获取网络状态');
              resolve('unknown');
            }
          });
        });
        
        if (networkType === 'none') {
          uni.showModal({
            title: '网络未连接',
            content: '请检查网络连接后重试',
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
          return;
        }
        
        if (networkType === '2g') {
          console.warn('⚠️ 当前为2G网络，上传可能较慢，请耐心等待');
        }
      } catch (e) {
        console.warn('⚠️ 无法检测网络状态:', e);
      }
      
      try {
        // 标记用户正在操作
        this.isUserInputting = true;
        
        console.log('📤 开始上传身份证反面图片（仅验证真实性）...');
        console.log(`📸 反面图片路径: ${imagePath}`);
        uni.showLoading({ 
          title: '正在上传...', 
          mask: true 
        });
        
        const token = getToken();
        const header = {};
        if (token) {
          header.Authorization = `Bearer ${token}`;
        }
        
        await new Promise((resolve, reject) => {
          uni.uploadFile({
            url: `${API_BASE_URL}/idcard/upload-back`,
            filePath: imagePath,
            name: 'backImage',
            header,
            timeout: 30000, // 30秒超时（移动端网络可能较慢）
            success: (res) => {
              try {
                const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                if (data.success && data.imageId) {
                  this.backImageId = data.imageId;
                  console.log('✅ 反面图片上传成功，imageId:', data.imageId);
                  uni.hideLoading();
                  uni.showToast({ 
                    title: '上传成功', 
                    icon: 'success', 
                    duration: 1500 
                  });
                  resolve();
                } else {
                  throw new Error(data.message || '上传失败');
                }
              } catch (e) {
                console.error('解析反面图片上传响应失败:', e);
                uni.hideLoading();
                uni.showToast({ 
                  title: '上传失败，请重试', 
                  icon: 'none',
                  duration: 2000
                });
                reject(e);
              }
            },
            fail: (err) => {
              console.error('上传反面图片失败:', err);
              uni.hideLoading();
              let errorMsg = '上传失败，请重试';
              if (err.errMsg) {
                if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                  errorMsg = '上传超时，请检查网络连接';
                } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
                  errorMsg = '网络请求失败，请检查网络连接';
                } else {
                  errorMsg = `上传失败: ${err.errMsg}`;
                }
              }
              uni.showToast({ 
                title: errorMsg, 
                icon: 'none',
                duration: 3000
              });
              reject(new Error(errorMsg));
            }
          });
        });
      } catch (error) {
        console.error('上传反面图片失败:', error);
        uni.hideLoading();
      } finally {
        // 上传完成后，延迟清除操作标记
        setTimeout(() => {
          if (!this.loading && !this.ocrRecognizing) {
            this.isUserInputting = false;
          }
        }, 500);
      }
    },
    
    // 删除身份证图片
    removeIdCardImage(type) {
      if (type === 'front') {
        this.idCardFront = '';
        this.idCardFrontPath = '';
        this.frontImageId = null;
        this.ocrResult = null;
        // 删除正面图片时，不清空已输入的姓名和身份证号（用户可能想保留）
      } else {
        this.idCardBack = '';
        this.idCardBackPath = '';
        this.backImageId = null;
      }
    },
    
    // 自动认证（OCR识别成功后自动调用）
    async autoVerify() {
      if (this.loading) {
        return;
      }
      
      // 检查必要信息
      if (!this.realname || !this.idCard || !this.frontImageId) {
        console.warn('⚠️ 自动认证条件不满足，等待用户手动提交');
        return;
      }
      
      const id = this.idCard.trim().toUpperCase();
      const valid = /^[1-9]\d{16}[\dXx]$/.test(id);
      if (!valid) {
        console.warn('⚠️ 身份证号格式不正确，等待用户手动提交');
        return;
      }
      
      console.log('🚀 开始自动认证...');
      this.loading = true;
      
      try {
        const res = await verifyIdCard(
          this.realname.trim(), 
          id, 
          '', 
          '',
          this.frontImageId,
          this.backImageId
        );
        
        if (res.success && res.verified) {
          // 认证成功
          const app = getApp();
          app.globalData = app.globalData || {};
          
          if (!app.globalData.userProfile) {
            app.globalData.userProfile = {};
          }
          
          app.globalData.userProfile.realname = this.realname.trim();
          app.globalData.userProfile.idCard = id;
          app.globalData.userProfile.authStatus = '已认证';
          app.globalData.userProfile.authTime = new Date().getTime();
          
          // 根据当前用户ID按用户维度保存认证信息
          try {
            const userInfo = app.globalData.userInfo || uni.getStorageSync('userInfo') || {};
            const userId = userInfo.id || userInfo._id || userInfo.userId || userInfo.username || 'anonymous';
            const allProfiles = uni.getStorageSync('userProfilesById') || {};
            allProfiles[userId] = app.globalData.userProfile;

            uni.setStorageSync('userProfilesById', allProfiles);
            uni.setStorageSync('currentUserId', userId);
            // 兼容旧逻辑
            uni.setStorageSync('userProfile', app.globalData.userProfile);

            console.log('✅ 认证信息已按用户ID保存:', userId);
          } catch (e) {
            console.error('❌ 保存用户信息失败:', e);
          }
          
          this.realname = this.realname.trim();
          this.idCard = id;
          this.authed = true;
          
          // 清空图片和OCR结果（认证成功后自动删除）
          this.idCardFront = '';
          this.idCardBack = '';
          this.idCardFrontPath = '';
          this.idCardBackPath = '';
          this.ocrResult = null;
          this.frontImageId = null;
          this.backImageId = null;
          
          console.log('🗑️ 已清空身份证图片和OCR结果');
          
          uni.showToast({ 
            title: '认证成功', 
            icon: 'success',
            duration: 2000
          });
        } else {
          // 认证失败
          this.authed = false;
          let errorMessage = res.message || '认证失败，请稍后重试';
          
          uni.showModal({
            title: '认证失败',
            content: errorMessage,
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
        }
      } catch (error) {
        console.error('❌ 自动认证失败:', error);
        this.authed = false;
        
        let errorMessage = error.message || error.errMsg || '认证失败，请稍后重试';
        
        uni.showModal({
          title: '认证失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#4a90e2'
        });
      } finally {
        this.loading = false;
      }
    },
    
    async startAuth() {
      // 防止重复提交
      if (this.loading) {
        console.log('⚠️ 正在提交中，请勿重复点击');
        return;
      }

      console.log('🔍 开始提交认证，检查表单数据...');
      console.log('姓名:', this.realname);
      console.log('身份证号:', this.idCard);
      console.log('正面图片路径:', this.idCardFrontPath);
      console.log('反面图片路径:', this.idCardBackPath);

      // 如果上传了图片但还没有OCR识别结果，先进行OCR识别
      if (this.idCardFrontPath && !this.frontImageId) {
        console.log('ℹ️ 已上传图片，开始进行OCR识别...');
        await this.performOCR();
        
        // OCR识别后检查结果
        if (!this.realname || !this.idCard) {
          // 如果OCR识别失败，提示用户手动输入
          if (!this.realname && !this.idCard) {
            uni.showToast({ title: '识别失败，请手动输入姓名和身份证号', icon: 'none', duration: 2000 });
            return;
          } else if (!this.realname) {
            uni.showToast({ title: '姓名识别失败，请手动输入', icon: 'none', duration: 2000 });
            return;
          } else if (!this.idCard) {
            uni.showToast({ title: '身份证号识别失败，请手动输入', icon: 'none', duration: 2000 });
            return;
          }
        }
      }
      
      // 表单验证
      if (!this.realname || !this.realname.trim()) {
        console.warn('❌ 姓名未填写');
        uni.showToast({ title: '请输入姓名或上传身份证进行识别', icon: 'none', duration: 2000 });
        return;
      }
      
      if (!this.idCard || !this.idCard.trim()) {
        console.warn('❌ 身份证号未填写');
        uni.showToast({ title: '请输入身份证号或上传身份证进行识别', icon: 'none', duration: 2000 });
        return;
      }
      
      const id = this.idCard.trim().toUpperCase();
      const valid = /^[1-9]\d{16}[\dXx]$/.test(id);
      if (!valid) {
        console.warn('❌ 身份证号格式不正确:', id);
        uni.showToast({ title: '身份证号格式不正确，请输入18位身份证号', icon: 'none', duration: 2000 });
        return;
      }
      
      // 验证身份证图片（至少需要正面）
      if (!this.idCardFrontPath && !this.frontImageId) {
        console.warn('❌ 未上传身份证正面照片');
        uni.showToast({ title: '请上传身份证正面照片', icon: 'none', duration: 2000 });
        return;
      }

      console.log('✅ 表单验证通过，开始人脸比对认证流程...');
      
      // 标记用户正在操作
      this.isUserInputting = true;
      
      // 先弹出摄像头弹框进行人脸比对
      this.loading = true;

      try {
        // 步骤1: 打开摄像头进行人脸拍照
        console.log('📸 步骤1: 打开摄像头进行人脸拍照...');
        let faceImagePath = null;
        let faceImageId = null;
        
        try {
          faceImagePath = await this.openCameraForFaceVerify();
          
          if (!faceImagePath) {
            console.log('⚠️ 用户取消拍照');
            this.loading = false;
            return;
          }
          
          // 步骤2: 上传人脸照片
          console.log('📤 步骤2: 上传人脸照片...');
          uni.showLoading({ title: '上传人脸照片中...', mask: true });
          
          const token = getToken();
          const header = {};
          if (token) {
            header.Authorization = `Bearer ${token}`;
          }
          
          // #ifdef H5
          if (this.faceImageFile && faceImagePath.startsWith('blob:')) {
            console.log('📤 H5环境，使用FormData上传File对象...');
            const formData = new FormData();
            formData.append('faceImage', this.faceImageFile);
            
            const headers = {};
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/idcard/upload-face`, {
              method: 'POST',
              headers: headers,
              body: formData,
              credentials: 'include'
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`上传失败: HTTP ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            if (data.imageId || data.faceImageId) {
              faceImageId = data.imageId || data.faceImageId;
              console.log('✅ 获取到人脸图片ID:', faceImageId);
            } else {
              throw new Error(data.message || '上传成功但未返回图片ID');
            }
            
            URL.revokeObjectURL(faceImagePath);
            this.faceImageFile = null;
          } else {
            await new Promise((resolve, reject) => {
              uni.uploadFile({
                url: `${API_BASE_URL}/idcard/upload-face`,
                filePath: faceImagePath,
                name: 'faceImage',
                header,
                timeout: 30000, // 30秒超时（移动端网络可能较慢）
                success: (res) => {
                  try {
                    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                    if (data.imageId || data.faceImageId) {
                      faceImageId = data.imageId || data.faceImageId;
                      console.log('✅ 获取到人脸图片ID:', faceImageId);
                    }
                    resolve();
                  } catch (e) {
                    reject(e);
                  }
                },
                fail: (err) => {
                  console.error('上传人脸图片失败:', err);
                  let errorMsg = '上传失败';
                  if (err.errMsg) {
                    if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                      errorMsg = '上传超时，请检查网络连接';
                    } else {
                      errorMsg = `上传失败: ${err.errMsg}`;
                    }
                  }
                  reject(new Error(errorMsg));
                }
              });
            });
          }
          // #endif
          
          // #ifndef H5
          await new Promise((resolve, reject) => {
            uni.uploadFile({
              url: `${API_BASE_URL}/idcard/upload-face`,
              filePath: faceImagePath,
              name: 'faceImage',
              header,
              timeout: 30000, // 30秒超时（移动端网络可能较慢）
              success: (res) => {
                try {
                  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                  if (data.imageId || data.faceImageId) {
                    faceImageId = data.imageId || data.faceImageId;
                    console.log('✅ 获取到人脸图片ID:', faceImageId);
                  }
                  resolve();
                } catch (e) {
                  reject(e);
                }
              },
              fail: (err) => {
                console.error('上传人脸图片失败:', err);
                let errorMsg = '上传失败';
                if (err.errMsg) {
                  if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                    errorMsg = '上传超时，请检查网络连接';
                  } else {
                    errorMsg = `上传失败: ${err.errMsg}`;
                  }
                }
                reject(new Error(errorMsg));
              }
            });
          });
          // #endif
          
          uni.hideLoading();
        } catch (faceError) {
          uni.hideLoading();
          this.loading = false;
          console.error('❌ 人脸拍照或上传失败:', faceError);
          uni.showModal({
            title: '人脸拍照失败',
            content: faceError.message || '人脸拍照或上传失败，请重试',
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
          return;
        }
        
        // 步骤3: 确保有身份证正面图片ID
        if (!this.frontImageId && this.idCardFrontPath) {
          console.log('📤 步骤3: 上传身份证正面图片...');
          uni.showLoading({ title: '上传身份证图片中...', mask: true });
          
          try {
            // 上传身份证正面图片
            const token = getToken();
            const header = {};
            if (token) {
              header.Authorization = `Bearer ${token}`;
            }
            
            await new Promise((resolve, reject) => {
              uni.uploadFile({
                url: `${API_BASE_URL}/idcard/upload-front`,
                filePath: this.idCardFrontPath,
                name: 'frontImage',
                header,
                timeout: 30000, // 30秒超时（移动端网络可能较慢）
                success: (res) => {
                  try {
                    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                    if (data.imageId) {
                      this.frontImageId = data.imageId;
                      console.log('✅ 获取到身份证正面图片ID:', this.frontImageId);
                    }
                    resolve();
                  } catch (e) {
                    reject(e);
                  }
                },
                fail: (err) => {
                  console.error('上传身份证正面图片失败:', err);
                  let errorMsg = '上传失败';
                  if (err.errMsg) {
                    if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                      errorMsg = '上传超时，请检查网络连接';
                    } else {
                      errorMsg = `上传失败: ${err.errMsg}`;
                    }
                  }
                  reject(new Error(errorMsg));
                }
              });
            });
            
            uni.hideLoading();
          } catch (uploadError) {
            uni.hideLoading();
            this.loading = false;
            console.error('❌ 上传身份证图片失败:', uploadError);
            uni.showModal({
              title: '上传失败',
              content: '上传身份证图片失败，请重试',
              showCancel: false,
              confirmText: '我知道了',
              confirmColor: '#4a90e2'
            });
            return;
          }
        }
        
        if (!this.frontImageId) {
          this.loading = false;
          uni.showModal({
            title: '缺少身份证图片',
            content: '请先上传身份证正面照片',
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2'
          });
          return;
        }
        
        // 步骤4: 调用人脸身份证比对API
        console.log('📤 步骤4: 调用人脸身份证比对API...');
        uni.showLoading({ title: '正在进行人脸比对和实名认证...', mask: true });
        
        const res = await faceVerifyIdCard(
          this.realname.trim(),
          id,
          this.frontImageId,
          this.backImageId || '',
          faceImageId
        );
        
        uni.hideLoading();
        console.log('📥 收到人脸比对响应:', res);
        console.log('📊 响应详情:', {
          success: res.success,
          verified: res.verified,
          similarity: res.similarity,
          faceVerified: res.faceVerified,
          realnameVerified: res.realnameVerified,
          message: res.message,
          mode: res.mode
        });

        // 显示人脸比对详细信息
        if (res.similarity !== null && res.similarity !== undefined) {
          console.log(`📊 人脸相似度: ${res.similarity}%`);
          if (res.faceVerified) {
            console.log(`✅ 人脸比对通过（相似度: ${res.similarity}%，阈值: >=45）`);
          } else {
            console.log(`❌ 人脸比对未通过（相似度: ${res.similarity}%，阈值: >=45）`);
          }
        } else {
          if (res.mode === 'face_api_fallback_local_pass') {
            console.warn(`⚠️ 当前为降级模式，未真正调用第三方API，相似度: null`);
          } else {
            console.warn(`⚠️ API未返回相似度分数`);
          }
        }
        
        // 显示比对结果摘要
        console.log('📋 比对结果摘要:');
        console.log(`   - 人脸比对: ${res.faceVerified ? '✅ 通过' : '❌ 未通过'}`);
        console.log(`   - 实名认证: ${res.realnameVerified ? '✅ 通过' : '❌ 未通过'}`);
        console.log(`   - 综合结果: ${res.verified ? '✅ 认证成功' : '❌ 认证失败'}`);

        if (res.success && res.verified) {
          // 认证成功，先设置保护标记，防止onShow重置状态
          this.isUserInputting = true;
          
          // 认证成功，如果用户已登录，后端会自动更新User表
          // 如果未登录，尝试调用API更新（需要登录）
          const token = getToken();
          
          // 构建成功消息，包含相似度信息
          let successMessage = '实名认证成功！';
          if (res.similarity !== null && res.similarity !== undefined) {
            successMessage += `\n\n人脸相似度: ${res.similarity}%`;
            if (res.similarity >= 45) {
              successMessage += '\n✅ 人脸比对通过（确认为同一人）';
            } else {
              successMessage += '\n⚠️ 相似度较低，请确保是本人操作';
            }
          }
          if (res.faceVerified && res.realnameVerified) {
            successMessage += '\n✅ 实名认证通过';
          }
          
          // 先更新页面状态，确保页面显示正确
          this.realname = this.realname.trim();
          this.idCard = id;
          this.authed = true;
          
          // 保存到本地和全局
          const app = getApp();
          app.globalData = app.globalData || {};
          
          // 确保 userProfile 对象存在
          if (!app.globalData.userProfile) {
            app.globalData.userProfile = {};
          }
          
          // 更新认证信息
          app.globalData.userProfile.realname = this.realname.trim();
          app.globalData.userProfile.idCard = id;
          app.globalData.userProfile.authStatus = '已认证';
          app.globalData.userProfile.authTime = new Date().getTime(); // 记录认证时间

          // 持久化保存到本地存储
          try {
            uni.setStorageSync('userProfile', app.globalData.userProfile);
            console.log('✅ 认证信息已保存到本地存储');
          } catch (e) {
            console.error('❌ 保存用户信息失败:', e);
            // 如果存储失败，尝试清理后重试
            try {
              uni.removeStorageSync('userProfile');
              uni.setStorageSync('userProfile', app.globalData.userProfile);
            } catch (retryError) {
              console.error('❌ 重试保存也失败:', retryError);
            }
          }
          
          if (token) {
            try {
              console.log('📤 用户已登录，后端应已自动更新User表，再次确认更新...');
              const { request } = await import('@/utils/request.js');
              
              // 调用后端API更新用户认证状态（双重保险）
              const updateRes = await request({
                url: '/auth/me',
                method: 'PUT',
                data: {
                  realname: this.realname.trim(),
                  idCard: id,
                  authStatus: '已认证'
                },
                showLoading: false,
                showError: false
              });
              
              if (updateRes.success) {
                console.log('✅ 后端用户认证状态已确认更新');
              } else {
                console.warn('⚠️ 后端更新确认失败，但后端认证接口应已更新:', updateRes.message);
              }
            } catch (updateError) {
              console.warn('⚠️ 更新后端状态失败，但后端认证接口应已更新:', updateError.message);
              // 即使更新失败，后端认证接口也应该已经更新了
            }
          }

          // 清空图片和OCR结果（认证成功后自动删除）
          this.idCardFront = '';
          this.idCardBack = '';
          this.idCardFrontPath = '';
          this.idCardBackPath = '';
          this.ocrResult = null;
          this.frontImageId = null;
          this.backImageId = null;
          
          console.log('🗑️ 已清空身份证图片和OCR结果');
          
          // 延迟重新从后端获取最新用户信息，避免在显示结果时触发onShow重置
          setTimeout(async () => {
            try {
              await this.fetchUserInfoFromBackend();
              console.log('✅ 已重新同步后端用户信息');
            } catch (syncError) {
              console.warn('⚠️ 同步后端信息失败，使用本地数据:', syncError.message);
            }
          }, 2000); // 延迟2秒，确保用户看到结果
          
          // 使用上面构建好的 successMessage，这里只负责展示
          const successTitle = '认证成功';
          
          // 先显示toast
          uni.showToast({ 
            title: successTitle, 
            icon: 'success',
            duration: 2000
          });
          
          // 如果有相似度信息，显示详细提示
          if (successMessage) {
            // 延迟显示modal，确保toast先显示
            setTimeout(() => {
              uni.showModal({
                title: '认证成功',
                content: successMessage + '\n\n✅ 实名认证已通过',
                showCancel: false,
                confirmText: '我知道了',
                confirmColor: '#4a90e2',
                success: () => {
                  // 用户确认后，延迟清除保护标记，允许onShow正常工作
                  setTimeout(() => {
                    this.isUserInputting = false;
                    console.log('✅ 认证成功，已清除保护标记');
                  }, 500);
                }
              });
            }, 500);
          } else {
            // 如果没有详细消息，也延迟清除保护标记
            setTimeout(() => {
              this.isUserInputting = false;
              console.log('✅ 认证成功，已清除保护标记');
            }, 2500);
          }
          
          // 如果用户未登录，显示提示
          if (!token) {
            console.log('ℹ️ 用户未登录，认证信息已保存到IdCardVerify表，登录后可在账号设置中查看');
            setTimeout(() => {
              uni.showModal({
                title: '认证成功',
                content: '实名认证已成功！\n\n提示：您当前未登录，认证信息已保存。登录后认证信息将自动关联到您的账户。',
                showCancel: false,
                confirmText: '我知道了',
                confirmColor: '#4a90e2',
                success: () => {
                  setTimeout(() => {
                    this.isUserInputting = false;
                    console.log('✅ 认证成功，已清除保护标记');
                  }, 500);
                }
              });
            }, 2500);
          }
          
          // 不自动返回，让用户查看成功页面
        } else {
          // 认证失败，显示弹框警告
          this.authed = false;
          
          // 获取错误消息
          let errorMessage = res.message || '认证失败，请稍后重试';
          
          // 根据人脸比对和实名认证的结果提供详细的错误提示
          if (res.faceVerified !== undefined && res.realnameVerified !== undefined) {
            let detailMessage = '';
            if (res.similarity !== null && res.similarity !== undefined) {
              detailMessage = `\n\n人脸相似度: ${res.similarity}%`;
              if (res.similarity >= 45) {
                detailMessage += '\n✅ 人脸比对通过（确认为同一人）';
              } else if (res.similarity >= 40) {
                detailMessage += '\n⚠️ 相似度较低（不确定是否为同一人）';
              } else {
                detailMessage += '\n❌ 相似度不足（可能不是同一人）';
              }
            }
            
            if (!res.faceVerified && !res.realnameVerified) {
              errorMessage = '❌ 人脸比对：未通过\n❌ 实名认证：未通过' + detailMessage + '\n\n请确保：\n1. 是本人操作\n2. 姓名和身份证号正确\n3. 身份证照片清晰';
            } else if (!res.faceVerified) {
              errorMessage = '❌ 人脸比对：未通过\n✅ 实名认证：通过' + detailMessage + '\n\n请确保是本人操作，重新拍照';
            } else {
              errorMessage = '✅ 人脸比对：通过\n❌ 实名认证：未通过' + detailMessage + '\n\n姓名或身份证号可能不匹配，请检查输入信息';
            }
          } else {
            // 根据不同的错误类型提供更友好的提示
            if (errorMessage.includes('识别失败') || errorMessage.includes('不一致')) {
              errorMessage = '身份证图片识别失败或与输入信息不一致\n\n请检查：\n1. 图片是否清晰\n2. 姓名和身份证号是否与图片一致\n3. 图片是否为身份证原件照片';
            } else if (errorMessage.includes('实名认证失败')) {
              errorMessage = '实名认证失败\n\n可能原因：\n1. 姓名与身份证号不匹配\n2. 身份证信息有误\n3. 网络连接问题';
            }
          }
          
          // 显示弹框警告
          uni.showModal({
            title: '认证失败',
            content: errorMessage,
            showCancel: false,
            confirmText: '我知道了',
            confirmColor: '#4a90e2',
            success: (modalRes) => {
              if (modalRes.confirm) {
                console.log('用户已查看错误提示');
                // 用户确认后，清除保护标记
                setTimeout(() => {
                  this.isUserInputting = false;
                }, 500);
              }
            }
          });
          
          console.warn('❌ 认证失败:', errorMessage);
        }
      } catch (error) {
        // 错误处理
        console.error('❌ 认证失败:', error);
        console.error('错误详情:', error.message || error);
        console.error('错误堆栈:', error.stack);
        this.authed = false;
        
        // 获取错误消息
        let errorMessage = error.message || error.errMsg || '认证失败，请稍后重试';
        
        // 导入API_BASE_URL用于显示
        const { API_BASE_URL } = await import('@/utils/config.js');
        
        // 根据错误类型提供更详细的提示
        if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
          errorMessage = `请求超时\n\n请检查：\n1. 后端服务是否正常运行\n   地址：${API_BASE_URL}\n2. 网络连接是否正常\n3. 服务器响应是否过慢\n\n提示：请确保后端服务已启动（npm run dev）`;
        } else if (errorMessage.includes('fail') || errorMessage.includes('失败')) {
          errorMessage = `网络请求失败\n\n请检查：\n1. 后端服务是否启动\n   地址：${API_BASE_URL}\n2. 网络连接是否正常\n3. 接口地址是否正确\n4. 是否有CORS跨域问题\n\n提示：\n- H5环境：确保后端运行在 http://localhost:3000\n- 检查浏览器控制台是否有CORS错误`;
        } else if (errorMessage.includes('上传')) {
          errorMessage = '图片上传失败\n\n请检查：\n1. 图片格式是否正确\n2. 图片大小是否超过限制\n3. 网络连接是否正常';
        } else if (errorMessage.includes('不存在') || errorMessage.includes('不存在')) {
          errorMessage = '图片不存在\n\n可能原因：\n1. 图片上传失败\n2. 图片ID无效\n3. 请重新上传身份证照片';
        }
        
        // 显示弹框警告
        uni.showModal({
          title: '认证失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#4a90e2',
          success: (modalRes) => {
            if (modalRes.confirm) {
              console.log('用户已查看错误提示');
            }
          }
        });
      } finally {
        this.loading = false;
        // 认证流程结束后，清除操作标记
        this.isUserInputting = false;
        console.log('🏁 认证流程结束');
      }
    },
    async changeRealname() {
      // 变更实名 - 清除认证状态，重新认证
      uni.showModal({
        title: '变更实名',
        content: '确定要变更实名信息吗？变更后需要重新认证。',
        success: async (res) => {
          if (res.confirm) {
            this.authed = false;
            this.realname = '';
            this.idCard = '';
            this.idCardFront = '';
            this.idCardBack = '';
            this.idCardFrontPath = '';
            this.idCardBackPath = '';
            const app = getApp();
            const profile = app.globalData.userProfile || {};
            profile.authStatus = '未认证';
            profile.realname = '';
            profile.idCard = '';
            app.globalData.userProfile = profile;
            try {
              uni.setStorageSync('userProfile', profile);
            } catch (e) {
              console.error('保存用户信息失败:', e);
            }
            
            // 同步更新后端数据库
            try {
              const token = uni.getStorageSync('token');
              if (token) {
                console.log('📤 同步更新后端认证状态为未认证...');
                const { request } = await import('@/utils/request.js');
                await request({
                  url: '/auth/me',
                  method: 'PUT',
                  data: {
                    realname: '',
                    idCard: '',
                    authStatus: '未认证'
                  },
                  showLoading: false,
                  showError: false
                });
                console.log('✅ 后端认证状态已更新为未认证');
              }
            } catch (updateError) {
              console.warn('⚠️ 更新后端状态失败:', updateError.message);
            }
          }
        }
      });
    },
    async updateRealname() {
      // 更新实名 - 清除认证状态，重新认证
      uni.showModal({
        title: '更新实名',
        content: '确定要更新实名信息吗？更新后需要重新认证。',
        success: async (res) => {
          if (res.confirm) {
            this.authed = false;
            this.realname = '';
            this.idCard = '';
            this.idCardFront = '';
            this.idCardBack = '';
            this.idCardFrontPath = '';
            this.idCardBackPath = '';
            const app = getApp();
            const profile = app.globalData.userProfile || {};
            profile.authStatus = '未认证';
            profile.realname = '';
            profile.idCard = '';
            app.globalData.userProfile = profile;
            try {
              uni.setStorageSync('userProfile', profile);
            } catch (e) {
              console.error('保存用户信息失败:', e);
            }
            
            // 同步更新后端数据库
            try {
              const token = uni.getStorageSync('token');
              if (token) {
                console.log('📤 同步更新后端认证状态为未认证...');
                const { request } = await import('@/utils/request.js');
                await request({
                  url: '/auth/me',
                  method: 'PUT',
                  data: {
                    realname: '',
                    idCard: '',
                    authStatus: '未认证'
                  },
                  showLoading: false,
                  showError: false
                });
                console.log('✅ 后端认证状态已更新为未认证');
              }
            } catch (updateError) {
              console.warn('⚠️ 更新后端状态失败:', updateError.message);
            }
          }
        }
      });
    },
    
    /**
     * 打开摄像头进行人脸比对
     * @returns {Promise<String>} 返回拍摄的照片路径
     */
    openCameraForFaceVerify() {
      return new Promise((resolve, reject) => {
        // #ifdef H5
        // 检查浏览器是否支持getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('⚠️ 浏览器不支持getUserMedia，降级使用文件选择器');
          this.openCameraFallback(resolve, reject);
          return;
        }
        
        // 检查是否在HTTPS或localhost环境
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          console.warn('⚠️ 非安全环境，getUserMedia可能无法使用');
          uni.showModal({
            title: '提示',
            content: '摄像头功能需要在HTTPS环境或localhost下使用，是否使用文件选择器？',
            confirmText: '使用文件选择器',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.openCameraFallback(resolve, reject);
              } else {
                reject(new Error('用户取消'));
              }
            }
          });
          return;
        }
        
        this.showCameraModal = true;
        this.cameraResolve = resolve;
        this.cameraReject = reject;
        
        // 等待DOM完全渲染后再初始化摄像头
        this.$nextTick(() => {
          setTimeout(() => {
            this.initCamera().catch(err => {
              console.error('摄像头初始化失败:', err);
              // 如果初始化失败，尝试使用文件选择器作为后备
              if (err.message && !err.message.includes('用户取消')) {
                uni.showModal({
                  title: '摄像头初始化失败',
                  content: '无法访问摄像头，是否使用文件选择器选择照片？',
                  confirmText: '使用文件选择器',
                  cancelText: '取消',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      this.closeCamera();
                      this.openCameraFallback(resolve, reject);
                    } else {
                      this.closeCamera();
                      reject(new Error('用户取消'));
                    }
                  }
                });
              }
            });
          }, 300); // 增加等待时间，确保DOM完全渲染
        });
        // #endif
        
        // #ifndef H5
        // APP和小程序环境使用uni.chooseImage
        console.log('📸 APP/小程序环境，使用uni.chooseImage调用摄像头...');
        uni.chooseImage({
          count: 1,
          sourceType: ['camera'], // 只允许从摄像头拍摄
          camera: 'front', // 使用前置摄像头（人脸）
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            console.log('✅ 拍摄成功，照片路径:', tempFilePath);
            resolve(tempFilePath);
          },
          fail: (err) => {
            console.error('❌ 调用摄像头失败:', err);
            if (err.errMsg && err.errMsg.includes('cancel')) {
              reject(new Error('用户取消'));
            } else {
              // 如果摄像头调用失败，尝试使用相册选择
              uni.showModal({
                title: '摄像头调用失败',
                content: '无法调用摄像头，是否从相册选择照片？',
                confirmText: '从相册选择',
                cancelText: '取消',
                success: (retryRes) => {
                  if (retryRes.confirm) {
                    uni.chooseImage({
                      count: 1,
                      sourceType: ['album'],
                      success: (albumRes) => {
                        const tempFilePath = albumRes.tempFilePaths[0];
                        console.log('✅ 从相册选择成功，照片路径:', tempFilePath);
                        resolve(tempFilePath);
                      },
                      fail: (albumErr) => {
                        console.error('❌ 从相册选择失败:', albumErr);
                        reject(new Error('选择照片失败: ' + (albumErr.errMsg || '未知错误')));
                      }
                    });
                  } else {
                    reject(new Error('用户取消'));
                  }
                }
              });
            }
          }
        });
        // #endif
      });
    },
    
    /**
     * 初始化摄像头 (H5环境) - 使用Canvas显示，避免video播放问题
     */
    // #ifdef H5
    async initCamera() {
      try {
        // 等待DOM完全渲染
        await this.$nextTick();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 查找容器元素
        let container = document.getElementById('camera-canvas-container');
        
        if (!container) {
          console.error('❌ 找不到Canvas容器');
          throw new Error('找不到Canvas容器，请刷新页面重试');
        }
        
        // 尝试获取video元素，如果不存在或不是原生元素，则创建新的
        let video = document.getElementById('camera-video');
        
        // 检查是否是原生HTMLVideoElement
        if (!video || !(video instanceof HTMLVideoElement)) {
          console.log('⚠️ 未找到原生Video元素或不是HTMLVideoElement，创建新的原生video元素');
          
          // 移除旧的video元素（如果是uni-app组件）
          if (video && video.parentNode) {
            video.parentNode.removeChild(video);
          }
          
          // 创建原生video元素
          video = document.createElement('video');
          video.id = 'camera-video-native';
          video.style.display = 'none';
          video.style.width = '1px';
          video.style.height = '1px';
          video.style.position = 'absolute';
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          
          // 添加到body或container中（隐藏）
          document.body.appendChild(video);
          console.log('✅ 已创建原生Video元素');
        } else {
          console.log('✅ 找到原生Video元素');
        }
        
        console.log('✅ 找到容器和Video元素，开始初始化摄像头...');
        
        // 清理旧的canvas
        const oldCanvas = document.getElementById('camera-canvas-native');
        if (oldCanvas && oldCanvas.parentNode) {
          oldCanvas.parentNode.removeChild(oldCanvas);
        }
        
        // 创建新的canvas元素
        const canvas = document.createElement('canvas');
        canvas.id = 'camera-canvas-native';
        canvas.className = 'camera-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        
        // 等待容器尺寸稳定
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 设置canvas尺寸 - 确保与容器完全一致
        // 使用offsetWidth和offsetHeight获取实际渲染尺寸（包括边框）
        let containerWidth = container.offsetWidth || container.clientWidth || 640;
        let containerHeight = container.offsetHeight || container.clientHeight || 480;
        
        // 如果容器尺寸为0，使用默认值或等待
        if (containerWidth === 0 || containerHeight === 0) {
          console.warn('⚠️ 容器尺寸为0，使用默认值');
          containerWidth = 640;
          containerHeight = 480;
        }
        
        // 设置Canvas的实际像素尺寸（与CSS尺寸一致）
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // 确保Canvas的CSS尺寸与容器一致（100%填充）
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        container.appendChild(canvas);
        console.log('✅ 已创建Canvas元素，尺寸:', canvas.width, 'x', canvas.height, '，容器尺寸:', containerWidth, 'x', containerHeight);
        
        // 添加窗口大小变化监听，动态调整Canvas尺寸
        if (typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
              const { width, height } = entry.contentRect;
              if (width > 0 && height > 0 && canvas) {
                canvas.width = width;
                canvas.height = height;
                console.log('🔄 Canvas尺寸已更新:', width, 'x', height);
              }
            }
          });
          resizeObserver.observe(container);
          this.cameraResizeObserver = resizeObserver;
        }
        
        // 获取Canvas上下文
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('无法获取Canvas 2D上下文');
        }
        
        // 先绘制黑色背景
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.cameraCanvas = canvas;
        this.cameraCanvasCtx = ctx;
        
        // 确保video是原生HTMLVideoElement
        if (!(video instanceof HTMLVideoElement)) {
          throw new Error('Video元素不是原生HTMLVideoElement，无法使用MediaStream');
        }
        
        // 配置video元素 - 确保所有属性都正确设置
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        
        // 设置JavaScript属性（这些属性必须在设置srcObject之前设置）
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.controls = false;
        video.preload = 'none'; // 对于MediaStream，不需要预加载
        
        // 隐藏video元素（我们只用它来获取流，显示在Canvas上）
        video.style.display = 'none';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.position = 'absolute';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-1';
        
        // 清除旧的srcObject和src（必须在设置新流之前清除）
        if (video.srcObject) {
          const oldStream = video.srcObject;
          if (oldStream instanceof MediaStream) {
            oldStream.getTracks().forEach(track => {
              track.stop();
              console.log('🗑️ 已停止旧的视频轨道');
            });
          }
          video.srcObject = null;
        }
        
        // 清除旧的src（如果有）
        if (video.src) {
          video.src = '';
          video.removeAttribute('src');
        }
        
        // 注意：对于MediaStream，不需要调用video.load()
        // load()方法只用于加载视频文件（<video src="...">），不适用于MediaStream（video.srcObject = stream）
        
        this.cameraVideo = video;
        console.log('✅ Video元素已配置完成，类型:', video.constructor.name, '，是否为HTMLVideoElement:', video instanceof HTMLVideoElement);
        
        // 请求摄像头权限
        console.log('📹 正在请求摄像头权限...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false
        });
        
        console.log('✅ 获取到摄像头流:', stream);
        console.log('📊 视频轨道:', stream.getVideoTracks()[0]?.getSettings());
        
        // 保存stream
        this.cameraStream = stream;
        
        // 设置video的srcObject
        video.srcObject = stream;
        
        // 强制播放视频（对于MediaStream，这是必需的）
        try {
          await video.play();
          console.log('✅ 视频播放已启动');
        } catch (playError) {
          console.warn('⚠️ play()调用失败，但继续:', playError);
          // 即使play失败，也继续，因为某些浏览器会自动播放
        }
        
        // 对于MediaStream，loadedmetadata事件可能不会触发
        // 使用轮询方式检查视频尺寸，这是最可靠的方法
        await new Promise((resolve, reject) => {
          let checkCount = 0;
          const maxChecks = 100; // 最多检查100次（约5秒）
          const checkInterval = 50; // 每50ms检查一次
          
          const checkVideoReady = () => {
            checkCount++;
            
            // 检查视频尺寸
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('✅ 视频流已就绪，尺寸:', video.videoWidth, 'x', video.videoHeight);
              console.log('📊 视频状态:', {
                readyState: video.readyState,
                paused: video.paused,
                ended: video.ended,
                currentTime: video.currentTime
              });
              
              // 确保视频正在播放
              if (video.paused) {
                video.play().catch(err => {
                  console.warn('⚠️ 重新播放失败:', err);
                });
              }
              
              // 启动Canvas绘制
              this.startDrawingToCanvas();
              resolve();
              return;
            }
            
            // 如果还没准备好，继续检查
            if (checkCount < maxChecks) {
              setTimeout(checkVideoReady, checkInterval);
            } else {
              // 超时了，检查stream是否还在
              if (stream && stream.active) {
                const tracks = stream.getVideoTracks();
                if (tracks.length > 0 && tracks[0].readyState === 'live') {
                  console.warn('⚠️ 视频尺寸未就绪，但stream是活跃的，尝试强制绘制');
                  // 即使尺寸为0，也尝试绘制（某些情况下可能有效）
                  this.startDrawingToCanvas();
                  resolve();
                } else {
                  console.error('❌ 视频流未就绪，stream状态:', {
                    active: stream.active,
                    tracks: tracks.length,
                    trackState: tracks[0]?.readyState
                  });
                  reject(new Error('视频流加载超时，请检查摄像头是否正常工作'));
                }
              } else {
                console.error('❌ 视频流已断开');
                reject(new Error('视频流已断开，请重试'));
              }
            }
          };
          
          // 添加事件监听器作为辅助（虽然可能不会触发）
          const onLoadedMetadata = () => {
            console.log('✅ loadedmetadata事件触发，尺寸:', video.videoWidth, 'x', video.videoHeight);
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              checkVideoReady();
            }
          };
          
          const onCanPlay = () => {
            console.log('✅ canplay事件触发');
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              checkVideoReady();
            }
          };
          
          const onError = (err) => {
            console.error('❌ 视频元素错误:', err, video.error);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            reject(new Error('视频元素错误: ' + (video.error?.message || err.message || '未知错误')));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          video.addEventListener('canplay', onCanPlay, { once: true });
          video.addEventListener('error', onError, { once: true });
          
          // 立即开始检查
          setTimeout(checkVideoReady, 100);
        });
        
        console.log('✅ 摄像头初始化完成');
        
      } catch (error) {
        console.error('❌ 初始化摄像头失败:', error);
        let errorMessage = '无法访问摄像头';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '未找到摄像头设备，请检查摄像头是否已连接';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '浏览器不支持摄像头功能，请使用Chrome、Edge或Firefox浏览器';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试';
        } else if (error.message && error.message.includes('超时')) {
          errorMessage = '摄像头初始化超时，请检查摄像头是否正常工作';
        } else {
          errorMessage = '无法访问摄像头: ' + (error.message || '未知错误');
        }
        
        uni.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 4000
        });
        
        // 先保存 reject，避免 closeCamera() 清除它
        const reject = this.cameraReject;
        // 关闭摄像头（传入 false 表示不是用户主动取消，而是初始化失败）
        this.closeCamera(false);
        // 使用保存的 reject 来返回错误
        if (reject) {
          reject(new Error(errorMessage));
        }
      }
    },
    
    /**
     * 开始将视频流绘制到Canvas
     */
    startDrawingToCanvas() {
      if (!this.cameraCanvas || !this.cameraCanvasCtx || !this.cameraVideo) {
        console.error('❌ Canvas或Video未初始化');
        return;
      }
      
      // 停止之前的绘制循环
      if (this.cameraAnimationFrame) {
        cancelAnimationFrame(this.cameraAnimationFrame);
        this.cameraAnimationFrame = null;
      }
      
      const canvas = this.cameraCanvas;
      const ctx = this.cameraCanvasCtx;
      const video = this.cameraVideo;
      
      let frameCount = 0;
      let lastVideoWidth = 0;
      let lastVideoHeight = 0;
      const maxWaitFrames = 120; // 最多等待120帧（约2秒）
      
      const draw = () => {
        // 检查stream是否还存在
        if (!this.cameraStream || !this.cameraStream.active) {
          // 只在首次检测到断开时输出日志
          if (frameCount === 0 || frameCount % 300 === 0) {
            console.warn('⚠️ 摄像头流已断开，停止绘制');
          }
          if (this.cameraAnimationFrame) {
            cancelAnimationFrame(this.cameraAnimationFrame);
            this.cameraAnimationFrame = null;
          }
          return;
        }
        
        // 检查视频尺寸
        const currentWidth = video.videoWidth || 0;
        const currentHeight = video.videoHeight || 0;
        
        // 如果尺寸变化了，记录日志
        if (currentWidth !== lastVideoWidth || currentHeight !== lastVideoHeight) {
          if (currentWidth > 0 && currentHeight > 0) {
            console.log('✅ 检测到视频尺寸:', currentWidth, 'x', currentHeight);
            lastVideoWidth = currentWidth;
            lastVideoHeight = currentHeight;
          }
        }
        
        // 等待视频流准备好
        if (!currentWidth || !currentHeight) {
          frameCount++;
          if (frameCount < maxWaitFrames) {
            // 继续等待
            this.cameraAnimationFrame = requestAnimationFrame(draw);
          } else if (frameCount === maxWaitFrames) {
            // 超时了，但尝试强制绘制（某些情况下可能有效）
            console.warn('⚠️ 视频尺寸未就绪，但尝试强制绘制');
            this.cameraAnimationFrame = requestAnimationFrame(draw);
          } else {
            // 已经尝试过了，停止
            console.error('❌ 视频流未就绪，停止绘制');
            if (this.cameraAnimationFrame) {
              cancelAnimationFrame(this.cameraAnimationFrame);
              this.cameraAnimationFrame = null;
            }
            return;
          }
          return;
        }
        
        // 视频流已准备好，开始绘制（只在第一次输出日志）
        if (frameCount === 0) {
          console.log('✅ 开始绘制视频流，尺寸:', currentWidth, 'x', currentHeight);
        }
        
        try {
          // 重新获取Canvas实际尺寸（可能已变化）
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          
          // 验证Canvas尺寸
          if (canvasWidth <= 0 || canvasHeight <= 0) {
            console.error('❌ Canvas尺寸无效:', canvasWidth, 'x', canvasHeight);
            this.cameraAnimationFrame = requestAnimationFrame(draw);
            return;
          }
          
          // 计算绘制尺寸（填充整个Canvas，保持宽高比）
          const videoAspect = currentWidth / currentHeight;
          const canvasAspect = canvasWidth / canvasHeight;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          // 使用cover模式：填充整个Canvas，可能会裁剪部分内容
          if (videoAspect > canvasAspect) {
            // 视频更宽，以宽度为准（填充宽度）
            drawWidth = canvasWidth;
            drawHeight = drawWidth / videoAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
          } else {
            // 视频更高，以高度为准（填充高度）
            drawHeight = canvasHeight;
            drawWidth = drawHeight * videoAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
          }
          
          // 清除画布（黑色背景）
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // 绘制视频（使用镜像翻转）
          try {
            // 保存上下文状态
            ctx.save();
            
            // 设置镜像翻转：将坐标系原点移到Canvas右边缘，然后水平翻转
            ctx.translate(canvasWidth, 0);
            ctx.scale(-1, 1);
            
            // 在翻转后的坐标系中绘制视频
            // 翻转后坐标系：原点在右上角，x轴向左
            // 要在翻转后的坐标系中绘制一个矩形，其左上角在原坐标系的(drawX, drawY)
            // 在翻转后的坐标系中，这个矩形的左上角x坐标应该是 canvasWidth - drawX - drawWidth
            // 但因为坐标系已翻转（scale(-1,1)），所以x坐标需要取反，即 -(canvasWidth - drawX - drawWidth) = -canvasWidth + drawX + drawWidth
            // 简化：drawX + drawWidth - canvasWidth
            const flippedX = drawX + drawWidth - canvasWidth;
            
            ctx.drawImage(
              video,
              0, 0, currentWidth, currentHeight,  // 源图像区域（完整视频）
              flippedX, drawY, drawWidth, drawHeight  // 目标区域（翻转后坐标系）
            );
            
            // 恢复上下文状态
            ctx.restore();
            
            // 只在首次绘制或每300帧（约5秒）输出一次调试信息，减少日志量
            if (frameCount === 0 || frameCount % 300 === 0) {
              console.log('🎨 绘制视频 - Canvas:', canvasWidth, 'x', canvasHeight, 
                         'Video:', currentWidth, 'x', currentHeight,
                         'Draw区域:', drawWidth.toFixed(0), 'x', drawHeight.toFixed(0));
            }
            
          } catch (drawError) {
            console.error('❌ 镜像绘制失败:', drawError, '，尝试正常绘制');
            // 如果镜像绘制失败，使用正常绘制（不翻转）
            try {
              ctx.drawImage(
                video,
                0, 0, currentWidth, currentHeight,  // 源图像区域
                drawX, drawY, drawWidth, drawHeight  // 目标区域
              );
              // 只在首次或每300帧输出一次
              if (frameCount === 0 || frameCount % 300 === 0) {
                console.log('🎨 正常绘制 - Canvas:', canvasWidth, 'x', canvasHeight, 
                           'Video:', currentWidth, 'x', currentHeight);
              }
            } catch (normalDrawError) {
              console.error('❌ 正常绘制也失败:', normalDrawError);
              // 最后的兜底方案：直接拉伸填充整个Canvas（不保持宽高比）
              try {
                ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
                // 只在首次输出一次警告
                if (frameCount === 0) {
                  console.warn('⚠️ 使用兜底绘制方案（拉伸填充）');
                }
              } catch (fallbackError) {
                console.error('❌ 所有绘制方案都失败:', fallbackError);
              }
            }
          }
          
        } catch (error) {
          console.error('❌ 绘制Canvas失败:', error);
          // 绘制失败时继续尝试（可能是临时问题）
        }
        
        // 继续下一帧
        if (this.cameraStream && this.cameraStream.active) {
          this.cameraAnimationFrame = requestAnimationFrame(draw);
        } else {
          // stream已断开，停止绘制
          if (this.cameraAnimationFrame) {
            cancelAnimationFrame(this.cameraAnimationFrame);
            this.cameraAnimationFrame = null;
          }
        }
      };
      
      // 开始绘制循环
      draw();
      console.log('✅ 已启动Canvas绘制循环');
    },
    
    /**
     * 拍照 - 直接从Canvas捕获
     */
    capturePhoto() {
      if (!this.cameraCanvas || !this.cameraCanvasCtx || !this.cameraVideo || !this.cameraStream) {
        console.error('❌ 摄像头未初始化');
        uni.showToast({
          title: '摄像头未准备好，请稍候',
          icon: 'none'
        });
        return;
      }
      
      // 防止重复点击
      if (this.isCapturing) {
        console.log('⚠️ 正在拍照中，请稍候...');
        return;
      }
      
      // 检查视频是否准备好
      if (!this.cameraVideo.videoWidth || !this.cameraVideo.videoHeight) {
        console.warn('⚠️ 视频尚未准备好，等待中...');
        uni.showToast({
          title: '正在准备摄像头，请稍候',
          icon: 'none',
          duration: 1500
        });
        return;
      }
      
      try {
        // 设置拍照状态
        this.isCapturing = true;
        
        // 显示拍照闪光效果
        setTimeout(() => {
          this.isCapturing = false;
        }, 300);
        
        // 创建新的canvas用于拍照（使用原始视频尺寸，确保清晰）
        const captureCanvas = document.createElement('canvas');
        const videoWidth = this.cameraVideo.videoWidth;
        const videoHeight = this.cameraVideo.videoHeight;
        captureCanvas.width = videoWidth;
        captureCanvas.height = videoHeight;
        const captureCtx = captureCanvas.getContext('2d');
        
        // 从video直接绘制到captureCanvas（不镜像，保持真实方向用于人脸比对）
        captureCtx.drawImage(this.cameraVideo, 0, 0, videoWidth, videoHeight);
        
        // 转换为blob
        captureCanvas.toBlob((blob) => {
          if (!blob) {
            console.error('❌ 转换照片失败');
            uni.showToast({
              title: '拍照失败，请重试',
              icon: 'none'
            });
            this.isCapturing = false;
            return;
          }
          
          // 检查照片大小
          if (blob.size < 1000) {
            console.error('❌ 照片文件过小，可能拍摄失败');
            uni.showToast({
              title: '照片质量不足，请重试',
              icon: 'none'
            });
            this.isCapturing = false;
            return;
          }
          
          // 创建File对象
          const file = new File([blob], `face_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const blobUrl = URL.createObjectURL(file);
          
          console.log('✅ 拍照成功，照片URL:', blobUrl, '文件大小:', blob.size, 'bytes');
          console.log('📋 照片尺寸:', videoWidth, 'x', videoHeight);
          
          // 保存File对象
          this.faceImageFile = file;
          
          // 显示拍照成功提示
          uni.showToast({
            title: '拍照成功',
            icon: 'success',
            duration: 1000
          });
          
          // 延迟关闭摄像头
          setTimeout(() => {
            // 先保存 resolve，避免 closeCamera() 清除它
            const resolve = this.cameraResolve;
            
            // 关闭摄像头（传入 false 表示不是用户主动取消，而是拍照成功）
            this.closeCamera(false);
            
            // 使用保存的 resolve 来返回结果
            if (resolve) {
              resolve(blobUrl);
            }
          }, 800);
          
        }, 'image/jpeg', 0.92); // 高质量
        
      } catch (error) {
        this.isCapturing = false;
        console.error('❌ 拍照失败:', error);
        uni.showToast({
          title: '拍照失败: ' + (error.message || '未知错误'),
          icon: 'none',
          duration: 2000
        });
      }
    },
    
    /**
     * 关闭摄像头
     * @param {Boolean} isUserCancel - 是否是用户主动取消（默认true）
     */
    closeCamera(isUserCancel = true) {
      // 停止Canvas绘制循环
      if (this.cameraAnimationFrame) {
        cancelAnimationFrame(this.cameraAnimationFrame);
        this.cameraAnimationFrame = null;
      }
      
      // 停止摄像头流
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(track => {
          track.stop();
          console.log('🗑️ 已停止视频轨道');
        });
        this.cameraStream = null;
      }
      
      // 清理video元素
      if (this.cameraVideo) {
        // 清除srcObject
        if (this.cameraVideo.srcObject) {
          this.cameraVideo.srcObject = null;
        }
        // 清除src
        if (this.cameraVideo.src) {
          this.cameraVideo.src = '';
        }
        // 暂停播放
        try {
          this.cameraVideo.pause();
        } catch (e) {
          // 忽略暂停错误
        }
        
        // 如果是动态创建的原生video元素，移除它
        if (this.cameraVideo.id === 'camera-video-native' && this.cameraVideo.parentNode) {
          this.cameraVideo.parentNode.removeChild(this.cameraVideo);
          console.log('🗑️ 已移除动态创建的原生Video元素');
        }
        
        this.cameraVideo = null;
      }
      
      // 清理Canvas
      if (this.cameraCanvasCtx && this.cameraCanvas) {
        try {
          this.cameraCanvasCtx.fillStyle = '#000';
          this.cameraCanvasCtx.fillRect(0, 0, this.cameraCanvas.width, this.cameraCanvas.height);
        } catch (e) {
          // 忽略绘制错误
        }
      }
      
      if (this.cameraCanvas && this.cameraCanvas.parentNode) {
        this.cameraCanvas.parentNode.removeChild(this.cameraCanvas);
        console.log('🗑️ 已移除Canvas元素');
      }
      
      this.cameraCanvas = null;
      this.cameraCanvasCtx = null;
      
      // 清理ResizeObserver
      if (this.cameraResizeObserver) {
        this.cameraResizeObserver.disconnect();
        this.cameraResizeObserver = null;
        console.log('🗑️ 已清理ResizeObserver');
      }
      
      this.showCameraModal = false;
      this.isCapturing = false;
      
      this.cameraVideo = null;
      this.cameraCanvas = null;
      this.cameraCanvasCtx = null;
      
      // 只有在用户主动取消时才触发 reject
      if (isUserCancel && this.cameraReject) {
        this.cameraReject(new Error('用户取消'));
        this.cameraReject = null;
        this.cameraResolve = null;
      }
    },
    
    /**
     * 降级方案：使用文件选择器
     */
    openCameraFallback(resolve, reject) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'user';
      input.style.display = 'none';
      
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) {
          reject(new Error('用户取消'));
          setTimeout(() => {
            if (input.parentNode) {
              document.body.removeChild(input);
            }
          }, 100);
          return;
        }
        
        const blobUrl = URL.createObjectURL(file);
        console.log('✅ 从文件选择器获取照片:', blobUrl);
        this.faceImageFile = file;
        
        setTimeout(() => {
          if (input.parentNode) {
            document.body.removeChild(input);
          }
        }, 100);
        
        resolve(blobUrl);
      };
      
      input.oncancel = () => {
        reject(new Error('用户取消'));
        setTimeout(() => {
          if (input.parentNode) {
            document.body.removeChild(input);
          }
        }, 100);
      };
      
      document.body.appendChild(input);
      input.click();
    },
    // #endif
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

/* 认证成功页面样式 */
.success-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 36rpx;
}

.user-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  margin-top: 40rpx;
  width: 100%;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: #f0f0f0;
  margin-bottom: 20rpx;
}

.username {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.success-card {
  width: 100%;
  background: #f8f9fa;
  border-radius: 14rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 40rpx;
  box-sizing: border-box;
}

.success-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 30rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e5e5e5;
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.tips-section {
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

.tip-item {
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
  margin-bottom: 20rpx;
  text-align: center;
}

.tip-text {
  color: #666;
}

.tip-link {
  color: #4a90e2;
  text-decoration: underline;
}

/* 认证表单页面样式 */
.card {
  background: #fff;
  border-radius: 14rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.06);
  padding: 20rpx 22rpx;
  color: #333;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}

.error-message {
  text-align: center;
  padding: 60rpx 30rpx;
  color: #999;
  font-size: 28rpx;
  cursor: pointer;
  user-select: none;
  margin-top: 20rpx;
}

.error-message:active {
  opacity: 0.7;
}

.paragraph {
  font-size: 26rpx;
  line-height: 1.6;
  color: #555;
  margin-bottom: 20rpx;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 12rpx;
  background: #f7f8fc;
  border-radius: 12rpx;
}

.label {
  width: 140rpx;
  font-size: 26rpx;
  color: #555;
}

.input {
  flex: 1;
  font-size: 26rpx;
}

.btn {
  height: 86rpx;
  line-height: 86rpx;
  text-align: center;
  background: linear-gradient(180deg, #4a90e2 0%, #1f75e7 100%);
  color: #fff;
  border-radius: 14rpx;
  font-size: 28rpx;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.08);
  
  &.btn-disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

/* 上传相关样式 */
.upload-section {
  margin-top: 20rpx;
}

.upload-label {
  display: block;
  font-size: 26rpx;
  color: #555;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.upload-box {
  position: relative;
  width: 100%;
  height: 360rpx;
  background: #f7f8fc;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2rpx dashed #ddd;
}

.upload-image {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.upload-icon {
  font-size: 60rpx;
  margin-bottom: 12rpx;
}

.upload-text {
  font-size: 26rpx;
  color: #999;
}

.upload-remove {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 50rpx;
  height: 50rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  color: #fff;
  font-size: 36rpx;
  line-height: 50rpx;
  text-align: center;
  z-index: 10;
}

.upload-tip {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

/* OCR识别结果样式 */
.ocr-result {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f0f9ff;
  border-radius: 12rpx;
  border: 2rpx solid #4a90e2;
}

.ocr-result-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 16rpx;
}

.ocr-result-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
  
  &:last-child {
    border-bottom: none;
  }
}

.ocr-label {
  font-size: 26rpx;
  color: #666;
  width: 140rpx;
}

.ocr-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.ocr-value.ocr-missing {
  color: #ff4d4f;
  font-weight: 500;
}

/* OCR识别结果样式 */
.ocr-result {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f0f9ff;
  border-radius: 12rpx;
  border: 2rpx solid #4a90e2;
}


.ocr-result-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 16rpx;
}

.ocr-result-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
  
  &:last-child {
    border-bottom: none;
  }
}

.ocr-label {
  font-size: 26rpx;
  color: #666;
  width: 140rpx;
}

.ocr-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.ocr-result-tip {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e0e0e0;
}

.tip-text {
  font-size: 24rpx;
  color: #ff9800;
  font-weight: 500;
}

/* 摄像头模态框样式 (H5环境) */
/* #ifdef H5 */
.camera-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-container {
  width: 90%;
  max-width: 500px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.camera-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.camera-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.camera-close {
  font-size: 28px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.camera-close:hover {
  background: #f5f5f5;
}

.camera-content {
  position: relative;
  width: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.camera-canvas-container {
  width: 100%;
  max-height: 60vh;
  min-height: 300px;
  background: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.camera-canvas {
  width: 100%;
  height: 100%;
  display: block;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.camera-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 15px 25px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  text-align: center;
  font-size: 14px;
  border-radius: 8px;
  z-index: 10;
}

.camera-tips {
  padding: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.camera-tips-main {
  font-size: 14px;
  font-weight: 500;
}

.camera-tips-sub {
  font-size: 12px;
  color: #ffd700;
  opacity: 0.9;
}

.camera-flash {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 5;
  animation: flash 0.3s ease-out;
  pointer-events: none;
}

@keyframes flash {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.camera-canvas.camera-capturing {
  filter: brightness(1.2);
  transition: filter 0.1s;
}

.camera-actions {
  display: flex;
  padding: 20px;
  gap: 15px;
  background: #fff;
}

.camera-btn {
  flex: 1;
  height: 50px;
  line-height: 50px;
  text-align: center;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.camera-btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.camera-btn-cancel:hover {
  background: #e5e5e5;
}

.camera-btn-capture {
  background: linear-gradient(180deg, #4a90e2 0%, #1f75e7 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.camera-btn-capture:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(74, 144, 226, 0.4);
}

.camera-btn-capture:active {
  transform: translateY(0);
}
/* #endif */
</style>
 