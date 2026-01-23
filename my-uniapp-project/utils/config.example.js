/**
 * 项目配置文件示例
 * 
 * 使用说明：
 * 1. 复制此文件为 config.js: cp config.example.js config.js
 * 2. 修改 API_BASE_URL 和 SOCKET_URL 为你的后端服务器地址
 * 3. 确保 config.js 已被添加到 .gitignore（避免提交个人配置）
 */

// API基础URL配置（用于HTTP请求）
export const API_BASE_URL = 'http://localhost:3000/api'

// Socket.IO 服务器地址（用于WebSocket连接）
export const SOCKET_URL = 'http://localhost:3000'

// 导出默认配置对象
export default {
  API_BASE_URL,
  SOCKET_URL
}

