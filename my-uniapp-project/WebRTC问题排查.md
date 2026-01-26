# WebRTC 直播问题排查指南

## 🔍 问题：观众端看不到直播画面

### 排查步骤：

#### 1. 检查后端服务器
```bash
# 确保后端服务器正在运行
cd houduan
npm start
```

**检查点**：
- ✅ 服务器是否在 `http://localhost:3000` 运行
- ✅ WebSocket 服务是否启动（查看控制台输出）

#### 2. 检查浏览器控制台（F12）

**医生端控制台应该看到**：
```
✅ 信令服务器连接成功
✅ 直播间创建成功: room_xxx
摄像头已启动
本地流已设置到 WebRTC
👤 观众加入: 观众xxx
✅ 为观众 viewer_xxx 创建了 PeerConnection
```

**观众端控制台应该看到**：
```
✅ 信令服务器连接成功
✅ 加入直播间成功
收到信令消息: offer
✅ Answer 已发送
✅ 收到远程视频流
视频轨道数: 1
音频轨道数: 1
```

#### 3. 常见问题和解决方案

##### 问题 A：信令服务器连接失败
**症状**：控制台显示 `WebSocket connection failed`

**解决方案**：
1. 检查 `config/webrtc.ts` 中的 `SIGNAL_SERVER` 地址
2. 确保后端服务器正在运行
3. 检查防火墙设置

##### 问题 B：没有收到远程视频流
**症状**：控制台显示 `加入直播间成功` 但没有 `收到远程视频流`

**可能原因**：
1. 医生端没有正确设置本地流
2. WebRTC 连接未建立
3. ICE 候选交换失败

**解决方案**：
```javascript
// 在观众端添加更多日志
webrtcViewer.onConnectionStateChange = (state) => {
  console.log('🔗 连接状态:', state)
  // 应该看到: connecting -> connected
}
```

##### 问题 C：renderjs 没有触发
**症状**：控制台显示 `收到远程视频流` 但没有 `updateRemoteStream called`

**解决方案**：
检查 `remoteStreamData` 的绑定是否正确：
```vue
<view :change:prop="renderScript.updateRemoteStream" :prop="remoteStreamData">
```

##### 问题 D：视频元素创建但不显示
**症状**：控制台显示 `远程视频元素已添加到 DOM` 但屏幕仍然黑屏

**解决方案**：
1. 检查视频流是否有效：`stream.active === true`
2. 检查视频轨道状态：`stream.getVideoTracks()[0].enabled === true`
3. 尝试手动播放：`videoElement.play()`

#### 4. 测试 WebRTC 连接

在浏览器控制台运行以下代码测试：

```javascript
// 测试 getUserMedia
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ 摄像头访问成功')
    console.log('视频轨道:', stream.getVideoTracks())
    console.log('音频轨道:', stream.getAudioTracks())
  })
  .catch(err => {
    console.error('❌ 摄像头访问失败:', err)
  })

// 测试 WebSocket 连接
const ws = new WebSocket('ws://localhost:3000/webrtc-signal')
ws.onopen = () => console.log('✅ WebSocket 连接成功')
ws.onerror = (err) => console.error('❌ WebSocket 连接失败:', err)
```

#### 5. 完整的测试流程

1. **启动后端**
   ```bash
   cd houduan
   npm start
   ```

2. **打开医生端**
   - 访问 `pages/doctor/live`
   - 输入直播主题
   - 点击"开始直播"
   - 允许摄像头权限
   - **确认能看到自己的画面**

3. **打开观众端**（新标签页）
   - 访问 `pages/live/list`
   - 点击直播间进入
   - 或直接访问 `pages/viewer/live?roomId=xxx`

4. **检查控制台**
   - 医生端：应该显示"观众加入"
   - 观众端：应该显示"收到远程视频流"

#### 6. 如果还是不行

**临时解决方案**：使用简化版本

创建一个测试页面，直接测试 WebRTC 连接：

```html
<!-- test-webrtc.html -->
<!DOCTYPE html>
<html>
<head>
  <title>WebRTC 测试</title>
</head>
<body>
  <h1>医生端</h1>
  <video id="localVideo" autoplay muted style="width:300px"></video>
  
  <h1>观众端</h1>
  <video id="remoteVideo" autoplay style="width:300px"></video>
  
  <script>
    // 简单的 WebRTC 测试代码
    let localStream, pc1, pc2;
    
    async function start() {
      // 获取本地流
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      document.getElementById('localVideo').srcObject = localStream;
      
      // 创建两个 PeerConnection 模拟医生和观众
      pc1 = new RTCPeerConnection();
      pc2 = new RTCPeerConnection();
      
      // 添加本地流到 pc1
      localStream.getTracks().forEach(track => {
        pc1.addTrack(track, localStream);
      });
      
      // pc2 接收远程流
      pc2.ontrack = (event) => {
        console.log('收到远程流');
        document.getElementById('remoteVideo').srcObject = event.streams[0];
      };
      
      // ICE 候选交换
      pc1.onicecandidate = (e) => {
        if (e.candidate) pc2.addIceCandidate(e.candidate);
      };
      pc2.onicecandidate = (e) => {
        if (e.candidate) pc1.addIceCandidate(e.candidate);
      };
      
      // 创建 offer
      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);
      
      // 创建 answer
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);
      
      console.log('✅ WebRTC 连接建立成功');
    }
    
    start();
  </script>
</body>
</html>
```

如果这个测试页面能正常显示两个视频，说明 WebRTC 本身没问题，问题在于 uni-app 的集成。

#### 7. 联系我

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整日志（医生端和观众端）
2. 后端服务器的日志
3. 使用的浏览器版本
4. 是否在 HTTPS 环境下运行

---

**提示**：WebRTC 在 localhost 下可以使用 HTTP，但在生产环境必须使用 HTTPS！

