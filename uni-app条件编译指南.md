# 📱 uni-app 条件编译指南

> 让你的 WebRTC 直播功能支持多端（H5、App、小程序）

---

## 🎯 什么是条件编译？

**条件编译**：根据不同平台，编译不同的代码

```javascript
// #ifdef H5
console.log('这段代码只在 H5 端运行')
// #endif

// #ifdef APP-PLUS
console.log('这段代码只在 App 端运行')
// #endif

// #ifdef MP-WEIXIN
console.log('这段代码只在微信小程序运行')
// #endif
```

---

## 📋 支持的平台标识

| 平台 | 标识 | 说明 |
|------|------|------|
| **H5** | `H5` | 网页端 |
| **App** | `APP-PLUS` | iOS + Android |
| **iOS** | `APP-PLUS-NVUE` | iOS 原生 |
| **Android** | `APP-PLUS-NVUE` | Android 原生 |
| **微信小程序** | `MP-WEIXIN` | 微信小程序 |
| **支付宝小程序** | `MP-ALIPAY` | 支付宝小程序 |
| **所有小程序** | `MP` | 所有小程序平台 |

---

## 🔧 已修改的文件

### 1. WebRTC 配置文件

**文件**：`config/webrtc.ts`

```typescript
// WebRTC 配置
export const WEBRTC_CONFIG = {
  // 根据平台选择不同的信令服务器地址
  
  // #ifdef H5
  // H5 端：本地开发
  SIGNAL_SERVER: 'ws://localhost:3000/webrtc-signal',
  // #endif
  
  // #ifdef APP-PLUS
  // App 端：使用局域网 IP 或公网域名
  // SIGNAL_SERVER: 'ws://192.168.1.100:3000/webrtc-signal',  // 局域网
  // SIGNAL_SERVER: 'wss://your-domain.com/webrtc-signal',    // 生产环境
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：必须使用 wss://（HTTPS）
  // SIGNAL_SERVER: 'wss://your-domain.com/webrtc-signal',
  // #endif
  
  // ICE 服务器配置
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  
  // 媒体约束
  // #ifdef H5
  // H5 端：使用标准的 WebRTC API
  MEDIA_CONSTRAINTS: {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }
  // #endif
  
  // #ifdef APP-PLUS
  // App 端：可能需要不同的配置
  // MEDIA_CONSTRAINTS: {
  //   video: {
  //     width: { ideal: 1280 },
  //     height: { ideal: 720 },
  //     frameRate: { ideal: 30 }
  //   },
  //   audio: true
  // }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：使用小程序的 live-pusher 和 live-player 组件
  // 不使用标准的 WebRTC API
  // MEDIA_CONSTRAINTS: {
  //   // 小程序特定配置
  // }
  // #endif
}
```

---

## 📝 医生端页面条件编译示例

### Template 部分

```vue
<template>
  <view class="live-container">
    <view class="camera-wrapper">
      
      <!-- #ifdef H5 -->
      <!-- H5 端：使用 renderjs 操作原生 video -->
      <view v-if="isLiving" class="video-container" 
            :change:prop="renderScript.updateStream" 
            :prop="streamData">
        <view id="videoWrapper" class="video-wrapper-inner"></view>
      </view>
      <!-- #endif -->
      
      <!-- #ifdef APP-PLUS -->
      <!-- App 端：使用 uni-app 的 camera 组件 -->
      <camera v-if="isLiving" 
              device-position="front" 
              flash="off" 
              @error="onCameraError">
        <cover-view class="camera-cover">
          <cover-view class="top-bar">
            <cover-view class="doctor-card">
              <cover-image class="avatar" :src="doctorInfo.avatar" />
              <cover-view class="info">
                <cover-view class="name">{{ doctorInfo.name }}</cover-view>
              </cover-view>
            </cover-view>
          </cover-view>
        </cover-view>
      </camera>
      <!-- #endif -->
      
      <!-- #ifdef MP-WEIXIN -->
      <!-- 微信小程序：使用 live-pusher 组件 -->
      <live-pusher v-if="isLiving" 
                   :url="pushUrl" 
                   mode="RTC" 
                   autopush 
                   @statechange="onPusherStateChange"
                   @error="onPusherError">
      </live-pusher>
      <!-- #endif -->
      
      <!-- 其他 UI 元素（所有平台共用） -->
      <view v-if="isLiving" class="live-overlay">
        <!-- 顶部信息栏 -->
        <view class="top-bar">
          <view class="doctor-card">
            <image class="avatar" :src="doctorInfo.avatar" />
            <view class="info">
              <text class="name">{{ doctorInfo.name }}</text>
            </view>
          </view>
        </view>
        
        <!-- 聊天消息 -->
        <view class="chat-messages">
          <view v-for="msg in recentMessages" :key="msg.id">
            <text>{{ msg.username }}：{{ msg.content }}</text>
          </view>
        </view>
      </view>
      
    </view>
  </view>
</template>
```

### Script 部分

```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { WEBRTC_CONFIG } from '@/config/webrtc'

// #ifdef H5
// H5 端：使用 WebRTC
import { WebRTCDoctor } from '@/utils/webrtc'
let webrtcDoctor: WebRTCDoctor | null = null
// #endif

// #ifdef APP-PLUS
// App 端：使用 uni-app 的 API
// import { AppRTCDoctor } from '@/utils/app-rtc'
// let appRtcDoctor: AppRTCDoctor | null = null
// #endif

// #ifdef MP-WEIXIN
// 微信小程序：使用小程序的 API
// import { WxRTCDoctor } from '@/utils/wx-rtc'
// let wxRtcDoctor: WxRTCDoctor | null = null
// #endif

const isLiving = ref(false)

// 开始直播
const startLive = async () => {
  // #ifdef H5
  // H5 端：使用 WebRTC
  console.log('H5 端开始直播')
  webrtcDoctor = new WebRTCDoctor()
  await webrtcDoctor.connect(WEBRTC_CONFIG.SIGNAL_SERVER)
  // ... H5 特定逻辑
  // #endif
  
  // #ifdef APP-PLUS
  // App 端：使用 uni-app API
  console.log('App 端开始直播')
  // appRtcDoctor = new AppRTCDoctor()
  // await appRtcDoctor.startLive()
  // ... App 特定逻辑
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：使用小程序 API
  console.log('微信小程序开始直播')
  // wxRtcDoctor = new WxRTCDoctor()
  // await wxRtcDoctor.startLive()
  // ... 小程序特定逻辑
  // #endif
  
  isLiving.value = true
}

// #ifdef H5
// H5 端特有的方法
const setWebRTCStream = (stream: MediaStream) => {
  console.log('H5 端收到视频流')
  webrtcDoctor?.setLocalStream(stream)
}
// #endif

// #ifdef APP-PLUS
// App 端特有的方法
// const onCameraError = (e: any) => {
//   console.log('App 端摄像头错误:', e)
// }
// #endif

// #ifdef MP-WEIXIN
// 微信小程序特有的方法
// const onPusherStateChange = (e: any) => {
//   console.log('小程序推流状态变化:', e)
// }
// const onPusherError = (e: any) => {
//   console.log('小程序推流错误:', e)
// }
// #endif

</script>
```

### Style 部分

```scss
<style lang="scss" scoped>
.live-container {
  width: 100vw;
  height: 100vh;
  background: #000;
}

// #ifdef H5
// H5 端特有样式
.video-container {
  width: 100%;
  height: 100%;
}
// #endif

// #ifdef APP-PLUS
// App 端特有样式
camera {
  width: 100%;
  height: 100%;
}
// #endif

// #ifdef MP-WEIXIN
// 微信小程序特有样式
live-pusher {
  width: 100%;
  height: 100%;
}
// #endif

// 所有平台共用样式
.live-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
```

---

## 🎨 观众端页面条件编译示例

### Template 部分

```vue
<template>
  <view class="viewer-container">
    
    <!-- #ifdef H5 -->
    <!-- H5 端：使用原生 video 元素 -->
    <view class="video-wrapper">
      <view id="remoteVideoWrapper"></view>
    </view>
    <!-- #endif -->
    
    <!-- #ifdef APP-PLUS -->
    <!-- App 端：使用 uni-app 的 video 组件 -->
    <video :src="videoUrl" 
           autoplay 
           controls 
           @error="onVideoError">
    </video>
    <!-- #endif -->
    
    <!-- #ifdef MP-WEIXIN -->
    <!-- 微信小程序：使用 live-player 组件 -->
    <live-player :src="playUrl" 
                 mode="RTC" 
                 autoplay 
                 @statechange="onPlayerStateChange"
                 @error="onPlayerError">
    </live-player>
    <!-- #endif -->
    
    <!-- 聊天输入（所有平台共用） -->
    <view class="chat-input">
      <input v-model="inputMessage" placeholder="说点什么..." />
      <button @click="sendMessage">发送</button>
    </view>
    
  </view>
</template>
```

---

## 📊 不同平台的实现方式

### H5 端（已实现）

```
✅ 使用标准 WebRTC API
✅ navigator.mediaDevices.getUserMedia()
✅ RTCPeerConnection
✅ WebSocket 信令
✅ 原生 video 元素
```

### App 端（待实现）

```
⏳ 使用 uni-app 的 camera 组件
⏳ 使用 uni-app 的 video 组件
⏳ 或使用原生插件
⏳ WebSocket 信令（同 H5）
```

### 微信小程序（待实现）

```
⏳ 使用 live-pusher 组件（推流）
⏳ 使用 live-player 组件（拉流）
⏳ 使用小程序的实时音视频 API
⏳ 需要申请权限和备案
```

---

## 🚀 编译命令

### H5 端（当前使用）

```bash
# 开发环境
npm run dev:h5

# 生产环境
npm run build:h5
```

### App 端

```bash
# 开发环境
npm run dev:app

# 生产环境（Android）
npm run build:app-android

# 生产环境（iOS）
npm run build:app-ios
```

### 微信小程序

```bash
# 开发环境
npm run dev:mp-weixin

# 生产环境
npm run build:mp-weixin
```

---

## 📝 条件编译语法总结

### 1. 单平台

```javascript
// #ifdef H5
console.log('只在 H5 运行')
// #endif
```

### 2. 多平台（或）

```javascript
// #ifdef H5 || APP-PLUS
console.log('在 H5 或 App 运行')
// #endif
```

### 3. 排除平台

```javascript
// #ifndef MP-WEIXIN
console.log('除了微信小程序，其他平台都运行')
// #endif
```

### 4. 多平台（且）

```javascript
// #ifdef H5
// #ifdef APP-PLUS
console.log('同时满足 H5 和 App（实际不可能）')
// #endif
// #endif
```

---

## 🎯 下一步工作

### 当前状态

```
✅ H5 端：完全实现
⏳ App 端：已添加条件编译，待实现
⏳ 微信小程序：已添加条件编译，待实现
```

### 实现 App 端需要

1. **创建 App 端的 WebRTC 封装**
   - 文件：`utils/app-rtc.ts`
   - 使用 uni-app 的 camera 和 video 组件
   - 或使用原生插件

2. **配置 App 权限**
   - manifest.json 中添加摄像头权限
   - manifest.json 中添加麦克风权限

3. **测试**
   - 使用 HBuilderX 打包
   - 在真机上测试

### 实现微信小程序需要

1. **申请权限**
   - 实时音视频权限
   - 域名备案

2. **创建小程序端的封装**
   - 文件：`utils/wx-rtc.ts`
   - 使用 live-pusher 和 live-player

3. **配置域名白名单**
   - 在微信公众平台配置
   - 添加 WebSocket 域名

---

## 💡 优势

### 使用条件编译的好处

```
✅ 一套代码，多端运行
✅ 代码复用率高
✅ 维护成本低
✅ 可以针对不同平台优化
✅ 编译后只包含当前平台的代码（体积小）
```

### 示例

```javascript
// 源代码（包含所有平台）
// #ifdef H5
console.log('H5')
// #endif
// #ifdef APP-PLUS
console.log('App')
// #endif

// 编译成 H5 后
console.log('H5')

// 编译成 App 后
console.log('App')
```

---

## 🎉 总结

现在你的项目已经支持条件编译了！

- ✅ **H5 端**：完全可用
- ⏳ **App 端**：代码已预留，待实现
- ⏳ **微信小程序**：代码已预留，待实现

**当前可以正常使用 H5 端，其他平台的代码不会影响 H5 端的运行！** 🚀

