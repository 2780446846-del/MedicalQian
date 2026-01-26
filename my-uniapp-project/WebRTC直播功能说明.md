# WebRTC 直播功能使用说明

## 📋 功能概述

本项目实现了基于 WebRTC 的实时视频直播功能，支持：
- ✅ 医生端开启直播（推流）
- ✅ 观众端观看直播（拉流）
- ✅ 实时音视频传输
- ✅ 多观众同时观看
- ✅ 聊天互动功能
- ✅ 观众统计

## 🏗️ 架构说明

### 1. 后端（信令服务器）
- **文件**: `houduan/routes/webrtc-signal.js`
- **功能**: WebSocket 信令服务器，协调医生端和观众端的连接
- **端口**: 3000
- **路径**: `/webrtc-signal`

### 2. 前端配置
- **文件**: `Group-project/my-uniapp-project/config/webrtc.ts`
- **功能**: WebRTC 配置（信令服务器地址、ICE 服务器等）

### 3. WebRTC 工具类
- **文件**: `Group-project/my-uniapp-project/utils/webrtc.ts`
- **类**:
  - `WebRTCDoctor`: 医生端推流管理
  - `WebRTCViewer`: 观众端拉流管理

### 4. 页面
- **医生端**: `pages/doctor/live.vue` - 开启直播
- **观众端**: `pages/viewer/live.vue` - 观看直播
- **直播列表**: `pages/live/list.vue` - 查看所有直播间

## 🚀 使用步骤

### 第一步：启动后端服务器

```bash
cd houduan
npm install ws  # 安装 WebSocket 依赖
npm start
```

确保服务器运行在 `http://localhost:3000`

### 第二步：配置信令服务器地址

编辑 `config/webrtc.ts`，根据您的环境修改：

```typescript
export const WEBRTC_CONFIG = {
  // 开发环境
  SIGNAL_SERVER: 'ws://localhost:3000/webrtc-signal',
  
  // 生产环境（需要替换为您的域名）
  // SIGNAL_SERVER: 'wss://your-domain.com/webrtc-signal',
  
  // ...
}
```

### 第三步：医生端开启直播

1. 打开医生端直播页面：`pages/doctor/live.vue`
2. 输入直播主题（如：心血管健康科普）
3. 点击"开始直播"按钮
4. 允许浏览器访问摄像头和麦克风
5. 直播开始！

### 第四步：观众端观看直播

**方式1：通过直播列表**
1. 打开直播列表页面：`pages/live/list.vue`
2. 查看所有正在直播的房间
3. 点击任意直播间进入观看

**方式2：直接进入**
1. 获取直播间 ID（roomId）
2. 导航到观众页面：`pages/viewer/live.vue?roomId=xxx`
3. 自动连接并观看直播

## 📱 页面路由配置

在 `pages.json` 中添加以下路由：

```json
{
  "pages": [
    {
      "path": "pages/doctor/live",
      "style": {
        "navigationBarTitleText": "医生直播",
        "navigationBarBackgroundColor": "#000000",
        "navigationBarTextStyle": "white"
      }
    },
    {
      "path": "pages/viewer/live",
      "style": {
        "navigationBarTitleText": "观看直播",
        "navigationBarBackgroundColor": "#000000",
        "navigationBarTextStyle": "white"
      }
    },
    {
      "path": "pages/live/list",
      "style": {
        "navigationBarTitleText": "直播间列表",
        "navigationBarBackgroundColor": "#667eea",
        "navigationBarTextStyle": "white"
      }
    }
  ]
}
```

## 🔧 技术细节

### WebRTC 连接流程

#### 医生端（推流）
1. 连接信令服务器
2. 创建直播间
3. 获取本地摄像头流
4. 等待观众加入
5. 为每个观众创建 RTCPeerConnection
6. 发送 Offer 给观众
7. 接收 Answer 并建立连接
8. 传输音视频流

#### 观众端（拉流）
1. 连接信令服务器
2. 加入直播间
3. 接收医生的 Offer
4. 创建 RTCPeerConnection
5. 发送 Answer 给医生
6. 接收远程音视频流
7. 显示视频画面

### 信令消息类型

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `create-room` | 医生 → 服务器 | 创建直播间 |
| `join-room` | 观众 → 服务器 | 加入直播间 |
| `offer` | 医生 → 观众 | SDP Offer |
| `answer` | 观众 → 医生 | SDP Answer |
| `ice-candidate` | 双向 | ICE 候选 |
| `viewer-joined` | 服务器 → 医生 | 观众加入通知 |
| `viewer-left` | 服务器 → 医生 | 观众离开通知 |
| `room-closed` | 服务器 → 观众 | 直播结束通知 |

## ⚠️ 注意事项

### 1. HTTPS 要求
- WebRTC 需要 HTTPS 环境（localhost 除外）
- 生产环境必须使用 HTTPS 和 WSS

### 2. 浏览器兼容性
- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 支持（需要 iOS 11+）
- 微信小程序: ⚠️ 需要使用 `live-pusher` 和 `live-player` 组件

### 3. 网络要求
- 需要稳定的网络连接
- 建议使用 STUN/TURN 服务器处理 NAT 穿透
- 默认使用 Google 的公共 STUN 服务器

### 4. 性能优化
- 单个医生最多支持 10-20 个观众（取决于带宽）
- 如需更多观众，建议使用 SFU（Selective Forwarding Unit）
- 或使用传统的推流服务器（RTMP）

## 🐛 常见问题

### Q1: 无法访问摄像头
**A**: 检查浏览器权限设置，确保允许访问摄像头和麦克风

### Q2: 连接失败
**A**: 
- 检查信令服务器是否运行
- 检查 WebSocket 地址是否正确
- 查看浏览器控制台错误信息

### Q3: 视频黑屏
**A**:
- 确保医生端已成功获取摄像头
- 检查 WebRTC 连接状态
- 查看 ICE 候选是否交换成功

### Q4: 延迟较高
**A**:
- 检查网络质量
- 降低视频分辨率
- 使用更近的 STUN/TURN 服务器

## 📊 API 接口

### 获取直播间列表
```
GET /api/webrtc/rooms
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "roomId": "room_123",
      "doctorName": "王医生",
      "title": "心血管健康科普",
      "startTime": 1234567890,
      "viewerCount": 5
    }
  ]
}
```

### 获取指定直播间信息
```
GET /api/webrtc/rooms/:roomId
```

## 🔐 安全建议

1. **身份验证**: 添加用户认证，防止未授权访问
2. **房间权限**: 限制谁可以创建直播间
3. **内容审核**: 监控直播内容，防止违规
4. **速率限制**: 防止恶意创建大量连接
5. **加密传输**: 生产环境使用 HTTPS/WSS

## 📈 扩展功能

可以继续添加的功能：
- [ ] 屏幕共享
- [ ] 录制直播
- [ ] 美颜滤镜
- [ ] 虚拟背景
- [ ] 弹幕系统
- [ ] 礼物打赏
- [ ] 直播回放
- [ ] 多路视频（连麦）

## 📞 技术支持

如有问题，请查看：
- 浏览器控制台日志
- 服务器日志
- WebRTC 连接状态

---

**祝您使用愉快！** 🎉

