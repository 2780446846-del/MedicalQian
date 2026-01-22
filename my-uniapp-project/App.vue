<script>
	// #ifdef H5
	import { getToken, getRefreshToken, getUserInfo } from '@/utils/auth.js'
	// #endif
	import { initTheme } from '@/utils/theme.js';
	import { trackPageView } from '@/utils/tracker.js';
	
	export default {
		globalData: {
			consultData: null,
			userProfile: null,
			userInfo: null
		},
		onLaunch: function() {
			console.log('App Launch')
			
			// #ifdef H5
			// 处理Vue Router警告：uni-app使用pages.json路由，不是Vue Router
			// 如果浏览器地址栏有/login路径，重定向到正确的uni-app路径
			if (typeof window !== 'undefined' && window.location.pathname === '/login') {
				// 延迟执行，确保uni-app已初始化
				setTimeout(() => {
					if (typeof uni !== 'undefined' && uni.reLaunch) {
						uni.reLaunch({
							url: '/pages/login/login'
						})
					}
				}, 100)
			}
			// #endif
			
			// #ifdef APP-PLUS
			// 清除可能存在的无效API地址（如natapp等）
			try {
				const storedUrl = uni.getStorageSync('API_BASE_URL')
				if (storedUrl) {
					// 如果包含natapp或无效地址，清除它
					if (storedUrl.includes('natapp') || storedUrl.includes('127.0.0.1:80') || !storedUrl.includes('http')) {
						console.warn('⚠️ 清除无效的API地址:', storedUrl)
						uni.removeStorageSync('API_BASE_URL')
					}
				}
			} catch (e) {
				console.warn('检查API地址失败:', e)
			}
			// #endif
			
			// 应用启动埋点
			trackPageView('app_launch')
			
			// #ifdef H5
			// 初始化跨端口通信监听器（用于单点登录）
			if (typeof window !== 'undefined') {
				
				// 监听来自Vue3的消息请求
				if (!window.ssoMessageListener) {
					window.ssoMessageListener = (event) => {
						// 只接受来自 Vue3 的消息
						if (event.origin === 'http://localhost:5174' && event.data && event.data.type === 'token_request') {
							const token = getToken()
							if (token) {
								const response = {
									type: 'token_response',
									key: 'sso_token',
									value: token,
									refreshToken: getRefreshToken(),
									userInfo: getUserInfo(),
									source: 'uniapp'
								}
								event.source.postMessage(response, event.origin)
							}
						}
					}
					window.addEventListener('message', window.ssoMessageListener)
				}
				
				// 同时使用 BroadcastChannel（同源内通信，作为备用）
				if (typeof BroadcastChannel !== 'undefined') {
					const channel = new BroadcastChannel('sso_token_channel')
					
					channel.onmessage = (event) => {
						const { type, source } = event.data
						
						// 忽略自己发送的消息（避免循环）
						if (source === 'uniapp') {
							return
						}
						
						if (type === 'token_request') {
							const token = getToken()
							if (token) {
								const message = {
									type: 'token_response',
									key: 'sso_token',
									value: token,
									refreshToken: getRefreshToken(),
									userInfo: getUserInfo()
								}
								channel.postMessage(message)
							}
						}
					}
					
					channel.onerror = (error) => {
						console.error('UniApp BroadcastChannel 错误:', error)
					}
					
					this.globalData.ssoChannel = channel
				}
			}
			// #endif
			
			// 应用启动时从本地存储加载用户数据
			this.loadUserData();
			
			// 初始化主题
			try {
				initTheme();
			} catch (e) {
				console.error('初始化主题失败:', e);
			}
		},
		onShow: function() {
			// 应用显示埋点
			trackPageView('app_show')
			// 每次显示时也重新加载，确保数据同步
			this.loadUserData();
		},
		onHide: function() {
			// 应用隐藏埋点
			trackPageView('app_hide')
			// 应用隐藏时保存数据
			this.saveUserData();
		},
		methods: {
			loadUserData() {
				try {
					// 从本地存储加载当前登录用户信息
					const userInfo = uni.getStorageSync('userInfo')
					if (userInfo) {
						this.globalData.userInfo = userInfo
					}

					// 计算当前用户ID（用于区分不同用户的资料）
					const currentUserIdFromStorage = uni.getStorageSync('currentUserId')
					const calcUserId =
						(userInfo && (userInfo.id || userInfo._id || userInfo.userId || userInfo.username)) ||
						currentUserIdFromStorage ||
						null

					// 读取所有用户资料映射
					const allProfiles = uni.getStorageSync('userProfilesById') || {}

					let userProfile = null
					if (calcUserId && allProfiles[calcUserId]) {
						userProfile = allProfiles[calcUserId]
						this.globalData.userProfile = userProfile
						uni.setStorageSync('currentUserId', calcUserId)
					} else {
						// 兼容旧数据：如果还没有按用户区分的资料，就使用单一的 userProfile
						const legacyProfile = uni.getStorageSync('userProfile')
						if (legacyProfile) {
							userProfile = legacyProfile
							this.globalData.userProfile = userProfile
						}
					}

					// 如果仍然没有资料，初始化默认模板
					if (!userProfile) {
						this.globalData.userProfile = {
							avatarUrl: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
							nickname: (userInfo && userInfo.username) || '用户昵称',
							gender: '保密',
							phone: '',
							authStatus: '未认证',
							realname: '',
							idCard: ''
						}
						console.log('ℹ️ 未找到历史资料，已初始化默认userProfile')
					}
				} catch (e) {
					console.error('❌ 加载用户数据失败:', e);
					// 初始化默认值
					this.globalData.userProfile = {
						avatarUrl: 'https://dummyimage.com/200x200/4a90e2/ffffff&text=Avatar',
						nickname: '用户昵称',
						gender: '保密',
						phone: '',
						authStatus: '未认证',
						realname: '',
						idCard: ''
					};
				}
			},
			saveUserData() {
				try {
					if (this.globalData.userProfile) {
						uni.setStorageSync('userProfile', this.globalData.userProfile);
					}
					if (this.globalData.userInfo) {
						uni.setStorageSync('userInfo', this.globalData.userInfo);
					}
				} catch (e) {
					console.error('❌ 保存用户数据失败:', e);
				}
			}
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import '@/uni_modules/uni-scss/index.scss';
	/* #ifndef APP-NVUE */
	@import '@/static/customicons.css';
	// 主题CSS变量
	:root {
		--bg-color: #f3f5fb;
		--card-bg: #ffffff;
		--text-color: #333333;
		--text-color-secondary: #666666;
		--text-color-tertiary: #999999;
		--border-color: #e5e5e5;
		--primary-color: #4a90e2;
		--shadow-color: rgba(0, 0, 0, 0.06);
	}
	
	// 暗色主题
	[data-theme="dark"] {
		--bg-color: #1a1a1a;
		--card-bg: #2d2d2d;
		--text-color: #ffffff;
		--text-color-secondary: #cccccc;
		--text-color-tertiary: #999999;
		--border-color: #404040;
		--primary-color: #5ba0f2;
		--shadow-color: rgba(0, 0, 0, 0.3);
	}
	
	// 设置整个项目的背景色
	page {
		background-color: var(--bg-color);
		transition: background-color 0.3s ease;
	}

	/* #endif */
	.example-info {
		font-size: 14px;
		color: #333;
		padding: 10px;
	}
</style>
