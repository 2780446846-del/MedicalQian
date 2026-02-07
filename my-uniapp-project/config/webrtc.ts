// WebRTC 配置（信令地址与 utils/config.js 中的 HOST 一致，真机/模拟器通用）
import { WEBRTC_SIGNAL_WS } from '@/utils/config.js'

export const WEBRTC_CONFIG = {
  // 信令服务器地址（与 API_BASE_URL / SOCKET_URL 同主机）
  SIGNAL_SERVER: WEBRTC_SIGNAL_WS,
  
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
}

