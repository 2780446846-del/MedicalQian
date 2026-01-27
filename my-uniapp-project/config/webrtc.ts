// WebRTC 配置
export const WEBRTC_CONFIG = {
  // 信令服务器地址
  // ⚠️ 重要：后端服务器已经包含 WebRTC 信令服务！
  // 1. 启动后端服务器: cd houduan && npm start
  // 2. 后端服务器会自动启动 WebRTC 信令服务
  // 3. 默认端口: 3000
  
  // 根据平台选择不同的信令服务器地址
  // #ifdef H5
  // H5 端：本地开发（后端在本地运行）
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
  
  // 使用 natapp 隧道（后端通过 natapp 暴露）
  // SIGNAL_SERVER: 'ws://v5df693c.natappfree.cc/webrtc-signal',
  
  // 局域网IP（后端在局域网其他设备）
  // SIGNAL_SERVER: 'ws://192.168.1.100:3000/webrtc-signal',
  
  // 生产环境（使用 HTTPS）
  // SIGNAL_SERVER: 'wss://your-domain.com/webrtc-signal',
  
  // ICE 服务器配置 
  ICE_SERVERS: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    },
    // 如果需要 TURN 服务器（用于 NAT 穿透）
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
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

