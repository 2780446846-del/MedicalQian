# WebRTC 直播功能使用指南

## 问题原因

之前出现 "信令服务器连接失败" 的错误是因为：
- ❌ 项目中缺少 WebSocket 信令服务器
- ❌ 配置的服务器地址 `ws://192.168.8.12:3000/webrtc-signal` 无法连接

## 解决方案

已创建独立的 WebSocket 信令服务器 `webrtc-signal-server.js`

## 启动步骤

### 1. 安装依赖

在项目根目录（`Group-project` 文件夹）打开终端，运行：

```bash
npm install
```

这会安装 `ws` (WebSocket 库) 和 `nodemon` (开发工具)

### 2. 启动信令服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

启动成功后会看到：

```
✅ WebRTC 信令服务器已启动
📡 监听地址: ws://0.0.0.0:3000/webrtc-signal
🌐 HTTP 服务: http://0.0.0.0:3000
```

### 3. 获取本机 IP 地址

**Windows:**
```bash
ipconfig
```
查找 "IPv4 地址"，例如：`192.168.1.100`

**Mac/Linux:**
```bash
ifconfig
```
或
```bash
ip addr
```

### 4. 更新配置文件

打开 `my-uniapp-project/config/webrtc.ts`，修改信令服务器地址：

```typescript
export const WEBRTC_CONFIG = {
  // 将 IP 地址改为你的本机 IP
  SIGNAL_SERVER: 'ws://你的IP地址:3000/webrtc-signal',
  // 例如: 'ws://192.168.1.100:3000/webrtc-signal'
  
  // ... 其他配置保持不变
}
```

### 5. 重新运行 uni-app 项目

在 `my-uniapp-project` 目录运行：

```bash
npm run dev:h5
```

或在 HBuilderX 中重新运行项目。

## 测试步骤

### 医生端（推流）

1. 打开医生直播页面 `/pages/doctor/live`
2. 输入直播主题（如：心血管健康科普）
3. 点击 "开始直播"
4. 允许摄像头和麦克风权限
5. 看到 "直播已开始" 提示

### 观众端（拉流）

1. 打开观众观看页面 `/pages/viewer/live`
2. 输入直播间 ID（从医生端获取）
3. 点击 "加入直播"
4. 应该能看到医生的视频画面

## 网络要求

### 同一局域网测试
- ✅ 医生端和观众端在同一 WiFi 网络
- ✅ 使用局域网 IP 地址（如 192.168.x.x）
- ✅ 防火墙允许端口 3000

### 跨网络测试（需要额外配置）
- 需要公网 IP 或域名
- 需要配置 TURN 服务器（用于 NAT 穿透）
- 建议使用 HTTPS (wss://)

## 常见问题

### 1. 信令服务器连接失败
- ✅ 检查服务器是否启动（运行 `npm start`）
- ✅ 检查 IP 地址是否正确
- ✅ 检查防火墙是否阻止端口 3000
- ✅ 确保设备在同一局域网

### 2. 摄像头无法启动
- ✅ 检查浏览器权限设置
- ✅ 确保使用 HTTPS 或 localhost
- ✅ 检查摄像头是否被其他应用占用

### 3. 观众看不到视频
- ✅ 检查医生端是否成功开启直播
- ✅ 检查控制台是否有 WebRTC 连接错误
- ✅ 尝试刷新页面重新连接

### 4. 视频卡顿或延迟
- ✅ 检查网络带宽
- ✅ 降低视频分辨率（修改 `MEDIA_CONSTRAINTS`）
- ✅ 使用有线网络代替 WiFi

## 生产环境部署

### 1. 使用 HTTPS (wss://)
```typescript
SIGNAL_SERVER: 'wss://your-domain.com/webrtc-signal'
```

### 2. 配置 TURN 服务器
```typescript
ICE_SERVERS: [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
]
```

### 3. 使用 PM2 管理进程
```bash
npm install -g pm2
pm2 start webrtc-signal-server.js --name webrtc-signal
pm2 save
pm2 startup
```

## 服务器日志

信令服务器会输出详细日志：
- ✅ 客户端连接/断开
- 🏠 直播间创建/关闭
- 👤 观众加入/离开
- 📤 消息转发（Offer/Answer/ICE）
- 📊 每分钟统计信息

## 技术架构

```
医生端 (WebRTCDoctor)
    ↓ WebSocket
信令服务器 (webrtc-signal-server.js)
    ↓ WebSocket
观众端 (WebRTCViewer)

医生端 ←→ P2P (WebRTC) ←→ 观众端
```

## 端口说明

- **3000**: WebSocket 信令服务器
- **19302**: Google STUN 服务器（公网）

## 安全建议

1. ✅ 生产环境使用 wss:// (加密连接)
2. ✅ 添加身份验证机制
3. ✅ 限制直播间数量和观众数量
4. ✅ 添加速率限制防止滥用
5. ✅ 定期清理过期的直播间

## 性能优化

1. 调整视频参数（分辨率、帧率、码率）
2. 使用 CDN 分发静态资源
3. 启用 Gzip 压缩
4. 使用负载均衡（多个信令服务器）
5. 监控服务器资源使用情况

## 支持与反馈

如有问题，请检查：
1. 浏览器控制台日志
2. 信令服务器终端日志
3. 网络连接状态
4. WebRTC 连接统计信息

