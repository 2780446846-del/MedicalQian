/**
 * uni-app 请求工具
 * 统一处理请求、token、错误处理
 */
import { API_BASE_URL } from './config.js'

// 使用配置文件中的 API_BASE_URL，支持在不同电脑上配置不同的后端地址
// 如果没有配置，则使用默认值作为后备
const BASE_URL = API_BASE_URL || 'http://localhost:3000/api';

/**
 * 统一请求方法
 * @param {Object} options 请求配置
 * @param {String} options.url 请求路径（相对路径）
 * @param {String} options.method 请求方法 GET/POST/PUT/DELETE
 * @param {Object} options.data 请求数据
 * @param {Boolean} options.needAuth 是否需要认证（默认true）
 * @param {Boolean} options.showLoading 是否显示加载提示（默认true）
 * @param {Boolean} options.showError 是否显示错误提示（默认true）
 */
export function request(options) {
  return new Promise((resolve, reject) => {
    const { 
      url, 
      method = 'GET', 
      data = {}, 
      needAuth = true,
      showLoading = true,
      showError = true
    } = options;

    // 标记是否显示了loading，确保配对使用
    let loadingShown = false;

    // 统一的隐藏loading函数
    const hideLoadingSafe = () => {
      if (showLoading && loadingShown) {
        try {
          uni.hideLoading();
          loadingShown = false;
        } catch (e) {
          console.warn('hideLoading失败:', e);
        }
      }
    };

    try {
      // 获取token - 直接读取两个KEY，确保兼容
      let token = '';
      if (needAuth) {
        try {
          // 优先读取 sso_token（新KEY）
          token = uni.getStorageSync('sso_token') || '';
          // 如果新KEY没有，读取旧KEY：token
          if (!token) {
            token = uni.getStorageSync('token') || '';
            // 如果从旧KEY读到，同步到新KEY
            if (token) {
              uni.setStorageSync('sso_token', token);
              console.log('✅ 从旧KEY读取token并同步到新KEY');
            }
          }
          // H5环境下，也检查localStorage
          // #ifdef H5
          if (!token && typeof localStorage !== 'undefined') {
            token = localStorage.getItem('sso_token') || localStorage.getItem('token') || '';
            if (token) {
              // 同步到uni.storage
              uni.setStorageSync('sso_token', token);
              uni.setStorageSync('token', token);
            }
          }
          // #endif
        } catch (e) {
          console.error('获取token失败:', e);
          token = '';
        }
      }

      // 构建请求头
      const header = {
        'Content-Type': 'application/json',
      };
      if (token && needAuth) {
        header['Authorization'] = `Bearer ${token}`;
      }

      // 显示加载提示（可选）
      if (showLoading) {
        try {
          uni.showLoading({
            title: '处理中...',
            mask: true,
          });
          loadingShown = true;
        } catch (e) {
          console.warn('showLoading失败:', e);
        }
      }

      // 移动端需要完整的URL，确保能正确访问
      const fullUrl = BASE_URL + url;
      console.log('📡 API请求:', method, fullUrl);
      
      uni.request({
        url: fullUrl,
        method: method,
        data: data,
        header: header,
        timeout: 10000, // 10秒超时（减少等待时间，快速反馈）
        success: (res) => {
          // 确保隐藏loading
          hideLoadingSafe();

          // HTTP状态码检查
          if (res.statusCode === 200 || res.statusCode === 201) {
            const result = res.data;

            // 业务状态检查
            if (result.success === false) {
              // 业务失败
              const errorMsg = result.message || '请求失败';
              if (showError) {
                uni.showToast({
                  title: errorMsg,
                  icon: 'none',
                  duration: 2000,
                });
              }
              reject(result);
            } else {
              // 成功
              resolve(result);
            }
          } else if (res.statusCode === 401) {
            // 未授权，清除所有认证信息并跳转登录
            try {
              // 清除新版 SSO token
              uni.removeStorageSync('sso_token');
              uni.removeStorageSync('sso_refresh_token');
              uni.removeStorageSync('sso_user_info');
              // 清除旧版 token
            uni.removeStorageSync('token');
            uni.removeStorageSync('userInfo');
            uni.removeStorageSync('userProfile');
              uni.removeStorageSync('userProfilesById');
            uni.removeStorageSync('currentUserId');
              
              // H5环境下，同时清除localStorage
              // #ifdef H5
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('sso_token');
                localStorage.removeItem('sso_refresh_token');
                localStorage.removeItem('sso_user_info');
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
              }
              // #endif
            } catch (e) {
              console.error('清除认证信息失败:', e);
            }
            
            if (showError) {
              uni.showToast({
                title: '登录已过期，请重新登录',
                icon: 'none',
              });
            }
            setTimeout(() => {
              uni.reLaunch({
                url: '/pages/login/login',
              });
            }, 1500);
            reject(res.data);
          } else {
            // 其他HTTP错误
            const errorMsg = res.data?.message || `请求失败(${res.statusCode})`;
            if (showError) {
              uni.showToast({
                title: errorMsg,
                icon: 'none',
              });
            }
            reject(res.data);
          }
        },
        fail: (err) => {
          // 确保隐藏loading
          hideLoadingSafe();
          
          console.error('请求失败:', err);
          
          // 改进错误提示，针对 CORS 和网络错误给出更明确的提示
          let errorMsg = err.errMsg || '网络请求失败，请检查网络连接';
          
          // 检测超时错误
          if (err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('超时'))) {
            errorMsg = '连接服务器超时，请检查网络连接或稍后重试';
          }
          // 检测 CORS 错误（H5 环境下）
          // #ifdef H5
          else if (err.errMsg && (err.errMsg.includes('CORS') || err.errMsg.includes('blocked'))) {
            errorMsg = '跨域请求被阻止，请检查后端 CORS 配置或使用本地后端地址';
          } else if (err.errMsg && err.errMsg.includes('fail')) {
            // 网络失败，提示检查后端服务
            const baseUrl = BASE_URL.replace('/api', '');
            errorMsg = `连接服务器失败，请检查后端服务是否正常运行 (${baseUrl})`;
          }
          // #endif
          
          if (showError) {
            uni.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000, // 延长显示时间，让用户看清楚
            });
          }
          reject(err);
        },
      });
    } catch (error) {
      // 如果发生异常，确保隐藏loading
      hideLoadingSafe();
      console.error('请求异常:', error);
      reject(error);
    }
  });
}

/**
 * GET请求
 */
export function get(url, data = {}, needAuth = true) {
  return request({ url, method: 'GET', data, needAuth });
}

/**
 * POST请求
 */
export function post(url, data = {}, needAuth = true) {
  return request({ url, method: 'POST', data, needAuth });
}

/**
 * PUT请求
 */
export function put(url, data = {}, needAuth = true) {
  return request({ url, method: 'PUT', data, needAuth });
}

/**
 * DELETE请求
 */
export function del(url, data = {}, needAuth = true) {
  return request({ url, method: 'DELETE', data, needAuth });
}

// 默认导出request函数（兼容性）
export default request;

