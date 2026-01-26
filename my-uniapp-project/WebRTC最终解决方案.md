# WebRTC 直播问题 - 最终解决方案

## 🔴 问题根源

从控制台日志可以看到：
```
❌ 本地流不存在，无法创建连接
```

**原因**：WebRTC 实例创建并创建直播间后，观众立即加入，但此时摄像头流还没有被设置到 WebRTC 实例中。

## ✅ 解决方案

需要改变执行顺序：

### 错误的顺序（当前）：
1. 创建 WebRTC 实例
2. 连接信令服务器
3. 创建直播间 ← 观众可以立即加入
4. 获取摄像头流 ← 太晚了！
5. 设置本地流到 WebRTC

### 正确的顺序：
1. 获取摄像头流 ← 先获取
2. 创建 WebRTC 实例
3. **设置本地流到 WebRTC** ← 在创建直播间之前
4. 连接信令服务器
5. 创建直播间 ← 现在观众加入时流已经准备好了

## 📝 修改步骤

### 修改 `pages/doctor/live.vue` 中的 `startLive` 函数：

找到这段代码（大约在第 200-280 行）：

```typescript
// 开始直播
const startLive = async () => {
  if (!liveTitle.value.trim()) {
    uni.showToast({
      title: '请输入直播主题',
      icon: 'none'
    })
    return
  }
  
  try {
    // 检测摄像头
    await detectCameras()
    
    // 显示加载提示
    uni.showLoading({
      title: '正在启动直播...',
      mask: true
    })
    
    // 1. 初始化 WebRTC
    webrtcDoctor = new WebRTCDoctor()
    
    // ... 其他代码
```

**替换为**：

```typescript
// 开始直播
const startLive = async () => {
  if (!liveTitle.value.trim()) {
    uni.showToast({
      title: '请输入直播主题',
      icon: 'none'
    })
    return
  }
  
  try {
    // 检测摄像头
    await detectCameras()
    
    // 显示加载提示
    uni.showLoading({
      title: '正在获取摄像头...',
      mask: true
    })
    
    // 1. 先触发renderjs获取摄像头
    isLiving.value = true
    streamData.value = { 
      action: 'start', 
      position: devicePosition.value
    }
    
    // 注意：WebRTC 初始化将在 setWebRTCStream 中完成
    console.log('⏳ 等待摄像头流准备...')
    
  } catch (error) {
    console.error('开始直播失败:', error)
    uni.hideLoading()
    uni.showModal({
      title: '无法启动直播',
      content: error instanceof Error ? error.message : '请确保已授予摄像头权限',
      showCancel: false
    })
  }
}
```

### 修改 `setWebRTCStream` 函数：

找到这段代码（大约在第 350 行）：

```typescript
// 接收来自 renderjs 的视频流（用于 WebRTC）
const setWebRTCStream = (stream: MediaStream) => {
  console.log('📹 收到来自 renderjs 的视频流:', stream)
  // ...
}
```

**替换为**：

```typescript
// 接收来自 renderjs 的视频流（用于 WebRTC）
const setWebRTCStream = async (stream: MediaStream) => {
  console.log('📹 收到来自 renderjs 的视频流:', stream)
  console.log('视频轨道:', stream.getVideoTracks().length)
  console.log('音频轨道:', stream.getAudioTracks().length)
  
  currentStream = stream
  
  try {
    console.log('🚀 开始初始化 WebRTC...')
    
    // 1. 初始化 WebRTC
    webrtcDoctor = new WebRTCDoctor()
    
    // 2. 立即设置本地流（在创建直播间之前！）
    webrtcDoctor.setLocalStream(stream)
    console.log('✅ 本地流已设置到 WebRTC')
    
    // 3. 设置回调
    webrtcDoctor.onRoomCreated = (roomId) => {
      console.log('✅ 直播间创建成功:', roomId)
      uni.hideLoading()
      uni.showToast({
        title: '直播已开始',
        icon: 'success'
      })
    }
    
    webrtcDoctor.onViewerJoined = (viewerId, viewerName, count) => {
      console.log('👤 观众加入:', viewerName)
      viewerCount.value = count
      messages.value.push({
        id: messageId++,
        type: 'system',
        content: `${viewerName} 加入了直播间`
      })
    }
    
    webrtcDoctor.onViewerLeft = (viewerId, viewerName, count) => {
      console.log('👋 观众离开:', viewerName)
      viewerCount.value = count
      messages.value.push({
        id: messageId++,
        type: 'system',
        content: `${viewerName} 离开了直播间`
      })
    }
    
    webrtcDoctor.onError = (error) => {
      console.error('❌ WebRTC 错误:', error)
      uni.showToast({
        title: error,
        icon: 'none'
      })
    }
    
    // 4. 连接信令服务器
    console.log('🔌 连接信令服务器...')
    await webrtcDoctor.connect(WEBRTC_CONFIG.SIGNAL_SERVER)
    
    // 5. 创建直播间（现在本地流已经准备好了）
    const roomId = 'room_' + Date.now()
    const doctorId = 'doctor_' + Date.now()
    console.log('🏠 创建直播间:', roomId)
    await webrtcDoctor.createRoom(roomId, doctorId, doctorInfo.value.name, liveTitle.value)
    
    // 6. 开始计时和模拟数据
    liveStartTime = Date.now()
    updateLiveTime()
    startReceiveMessages()
    startReceiveLikes()
    
    console.log('🎉 直播启动完成！')
    
  } catch (error) {
    console.error('❌ 初始化 WebRTC 失败:', error)
    uni.hideLoading()
    uni.showModal({
      title: '无法启动直播',
      content: error instanceof Error ? error.message : '初始化失败',
      showCancel: false
    })
  }
}
```

## 🎯 关键改动

1. **`startLive`**: 只负责触发摄像头获取，不再初始化 WebRTC
2. **`setWebRTCStream`**: 收到摄像头流后，立即初始化 WebRTC 并设置本地流，然后才创建直播间

这样确保了：
- ✅ 摄像头流先准备好
- ✅ 本地流设置到 WebRTC
- ✅ 然后才创建直播间
- ✅ 观众加入时本地流已经存在

## 📋 完整的执行流程

1. 用户点击"开始直播"
2. `startLive()` 触发 renderjs 获取摄像头
3. renderjs 获取摄像头成功
4. renderjs 调用 `setWebRTCStream(stream)`
5. `setWebRTCStream()` 初始化 WebRTC
6. 设置本地流到 WebRTC ← **关键步骤**
7. 连接信令服务器
8. 创建直播间
9. 观众加入时，本地流已经准备好 ✅

---

**请按照上面的说明修改代码，然后重新测试！**

