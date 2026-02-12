<template>
  <view class="trtc-page">
    <!-- 已安装 TRTC 插件时：显示通话界面（需在 HBuilderX 中引入插件并制作自定义基座） -->
    <!-- #ifdef APP-PLUS -->
    <view v-if="pluginReady && inCall" class="call-view">
      <view class="video-container">
        <!-- 本地预览：插件提供 trtc-local-view 时取消注释并绑定 viewId -->
        <!-- <trtc-local-view :viewId="localViewId" class="local-view"></trtc-local-view> -->
        <view class="local-view placehold">
          <text>本地画面</text>
        </view>
        <view class="remote-view placehold">
          <text>{{ remoteUserId ? '对方画面' : '等待对方加入...' }}</text>
        </view>
      </view>
      <view class="call-actions">
        <button class="hangup-btn" @click="hangup">挂断</button>
      </view>
    </view>

    <!-- 未安装插件或未配置：显示说明 -->
    <view v-else class="setup-tip">
      <text class="title">APP 端实时音视频</text>
      <text class="desc">需完成以下步骤后即可使用视频/语音通话：</text>
      <text class="step">1. 腾讯云控制台创建 TRTC 应用，获取 SDKAppID 和 SecretKey</text>
      <text class="step">2. 后端 .env 配置 TRTC_SDK_APP_ID、TRTC_SECRET_KEY</text>
      <text class="step">3. HBuilderX 安装插件：腾讯云实时音视频 SDK（id=7774）</text>
      <text class="step">4. 制作「自定义调试基座」并运行到真机</text>
      <text class="link">插件地址：https://ext.dcloud.net.cn/plugin?id=7774</text>
      <button class="back-btn" @click="goBack">返回咨询</button>
    </view>
    <!-- #endif -->

    <!-- 非 APP 端 -->
    <!-- #ifndef APP-PLUS -->
    <view class="setup-tip">
      <text class="desc">视频/语音通话仅在 APP 端可用，H5 端请使用浏览器内 WebRTC。</text>
      <button class="back-btn" @click="goBack">返回</button>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchUserSig } from '@/utils/trtcConfig.js'

const roomId = ref('')
const userId = ref('')
const callType = ref('video') // video | audio
const targetLabel = ref('医生')
const pluginReady = ref(false)
const inCall = ref(false)
const remoteUserId = ref('')
let trtcCloud = null
const localViewId = ref('local_' + Date.now())

onLoad((query) => {
  roomId.value = query.roomId || String(Math.floor(Math.random() * 100000))
  userId.value = query.userId || ('user_' + Date.now())
  callType.value = query.callType || 'video'
  targetLabel.value = query.targetLabel || '医生'
})

onMounted(async () => {
  // #ifdef APP-PLUS
  try {
    // 安装 DCloud 插件「腾讯云实时音视频 SDK」后，按插件文档引入 TrtcCloud
    // 例如: trtcCloud = require('@/uni_modules/trtc-sdk-app/...').createInstance()
    const mod = require('@/uni_modules/trtc-sdk-app/TrtcCloud.js')
    const TrtcCloud = mod.default || mod
    if (TrtcCloud && typeof TrtcCloud.createInstance === 'function') {
      trtcCloud = TrtcCloud.createInstance()
      pluginReady.value = true
      await enterRoom()
    }
  } catch (e) {
    console.warn('TRTC 插件未安装或路径不一致，将显示配置说明', e)
    pluginReady.value = false
  }
  // #endif
})

onUnmounted(() => {
  if (trtcCloud) {
    try {
      trtcCloud.exitRoom()
      trtcCloud.destroy()
    } catch (e) {}
  }
})

async function enterRoom() {
  try {
    const { userSig, sdkAppId } = await fetchUserSig(userId.value)
    const roomIdNum = parseInt(roomId.value, 10) || 0
    const params = {
      sdkAppId,
      userId: userId.value,
      userSig,
      roomId: roomIdNum,
      role: 20 // 20 主播 21 观众
    }
    if (trtcCloud) {
      trtcCloud.enterRoom(params, 2) // 2 音视频
      if (callType.value === 'video') {
        trtcCloud.startLocalPreview(localViewId.value)
      }
      trtcCloud.startLocalAudio()
      inCall.value = true
      // 监听远端用户进房/视频
      trtcCloud.on('onUserVideoAvailable', (userId, available) => {
        if (available) {
          remoteUserId.value = userId
          trtcCloud.startRemoteView(userId, 'remote_' + userId)
        }
      })
    }
  } catch (e) {
    console.error('TRTC 进房失败', e)
    uni.showToast({ title: '进房失败: ' + (e.message || e), icon: 'none' })
  }
}

function hangup() {
  if (trtcCloud) {
    trtcCloud.exitRoom()
    trtcCloud.destroy()
    trtcCloud = null
  }
  goBack()
}

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/online-consult/index' }) })
}
</script>

<style scoped>
.trtc-page {
  min-height: 100vh;
  background: #1a1a2e;
}
.call-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.video-container {
  flex: 1;
  position: relative;
}
.local-view,
.remote-view {
  position: absolute;
  background: #16213e;
  border-radius: 8rpx;
}
.local-view {
  right: 20rpx;
  top: 20rpx;
  width: 200rpx;
  height: 280rpx;
}
.remote-view {
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}
.placehold {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 28rpx;
}
.call-actions {
  padding: 30rpx;
  align-items: center;
}
.hangup-btn {
  width: 200rpx;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 40rpx;
}
.setup-tip {
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.setup-tip .title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}
.setup-tip .desc {
  color: #aaa;
  font-size: 28rpx;
}
.setup-tip .step {
  color: #ccc;
  font-size: 26rpx;
  line-height: 1.6;
}
.setup-tip .link {
  color: #4a90e2;
  font-size: 24rpx;
  word-break: break-all;
}
.back-btn {
  margin-top: 32rpx;
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 8rpx;
}
</style>
