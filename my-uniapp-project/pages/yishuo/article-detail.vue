<template>
	<view class="page">
		<!-- 导航栏 -->
		<view class="navbar">
			<view class="navbar-content">
				<view class="nav-back-btn" @click="goBack">
					<text class="back-icon">‹</text>
				</view>
				<text class="navbar-title">文章详情</text>
				<view 
					v-if="canDelete" 
					class="nav-delete-btn" 
					@click="showDeleteConfirm"
				>
					<text class="delete-icon">删除</text>
				</view>
				<view v-else class="nav-placeholder"></view>
			</view>
		</view>
		
		<!-- 文章内容 -->
		<scroll-view class="article-container" scroll-y>
			<!-- 文章标题 -->
			<view class="article-header">
				<text class="article-title">{{ article.title || '加载中...' }}</text>
				<view class="article-meta">
					<text class="article-date">{{ article.date || '' }}</text>
					<text class="read-count">{{ article.readCount || '0' }}阅读</text>
				</view>
			</view>
			
			<!-- 图片或视频 -->
			<view class="article-media">
				<!-- 视频 -->
				<video 
					v-if="article.video && (article.mediaType === 'video' || (!article.mediaType && article.video))"
					:src="article.video"
					class="article-video"
					:controls="true"
					:show-center-play-btn="true"
					:show-fullscreen-btn="true"
					:enable-play-gesture="true"
					object-fit="contain"
					@error="onVideoError"
				></video>
				
				<!-- 图片 -->
				<image 
					v-else-if="article.image && article.mediaType !== 'video'" 
					:src="article.image" 
					mode="widthFix" 
					class="article-image"
					@error="onImageError"
				></image>
				
				<!-- 如果既没有图片也没有视频，显示占位图 -->
				<view v-else class="media-placeholder">
					<text class="placeholder-icon">📄</text>
					<text class="placeholder-text">暂无图片或视频</text>
				</view>
			</view>
			
			<!-- 文章内容 -->
			<view class="article-content">
				<text class="content-text">{{ article.content || '暂无内容' }}</text>
			</view>
		</scroll-view>
		
		<!-- 主题切换按钮 -->
		<ThemeToggle />
	</view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getAllArticles, getArticleById, updateArticleReadCount, deleteArticle } from '@/utils/articleStorage.js';
import { API_BASE_URL } from '@/utils/config.js';

export default {
	components: {
		ThemeToggle
	},
	data() {
		return {
			theme: getCurrentTheme(),
			articleId: null,
			article: {
				title: '',
				content: '',
				date: '',
				readCount: '0',
				image: '',
				video: '',
				mediaType: 'image'
			}
		}
	},
	computed: {
		// 判断是否可以删除（只有保存的文章可以删除，默认文章ID 1-4不能删除）
		canDelete() {
			return this.articleId && this.articleId > 4;
		}
	},
	onLoad(options) {
		// 获取文章ID
		if (options && options.id) {
			this.articleId = parseInt(options.id);
			this.loadArticle();
		} else {
			uni.showToast({
				title: '文章ID无效',
				icon: 'none'
			});
			setTimeout(() => {
				this.goBack();
			}, 1500);
		}
	},
	onShow() {
		// 监听主题变更
		uni.$on('themeChange', this.updateTheme);
	},
	onHide() {
		uni.$off('themeChange', this.updateTheme);
	},
	methods: {
		// 加载文章详情
		loadArticle() {
			try {
				// 先从默认文章列表中查找
				const defaultArticles = this.getDefaultArticles();
				let article = defaultArticles.find(a => a.id === this.articleId);
				
				// 如果默认文章中没有，从本地存储中查找
				if (!article) {
					// 先尝试用 getArticleById
					article = getArticleById(this.articleId);
					
					// 如果还是没有，从所有文章中查找（兼容处理）
					if (!article) {
						const allArticles = getAllArticles();
						article = allArticles.find(a => a.id === this.articleId);
					}
				}
				
				if (article) {
					// 确定媒体类型：优先使用保存的mediaType，否则根据video字段判断
					let mediaType = article.mediaType;
					if (!mediaType) {
						mediaType = article.video ? 'video' : 'image';
					}
					
					// 处理视频URL：如果是COS URL（https://开头），直接使用；否则转换为完整URL
					let videoUrl = article.video || '';
					if (videoUrl && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
						// 从 API_BASE_URL 推导出服务端根地址
						const baseOrigin = API_BASE_URL.replace(/\/api$/, '');
						videoUrl = `${baseOrigin}${videoUrl}`;
					}
					
					// 处理图片URL：如果是COS URL（https://开头），直接使用；否则转换为完整URL
					let imageUrl = article.image || '';
					if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/static/')) {
						const baseOrigin = API_BASE_URL.replace(/\/api$/, '');
						imageUrl = `${baseOrigin}${imageUrl}`;
					}
					
					this.article = {
						title: article.title || '',
						content: article.content || article.subtitle || '',
						date: article.date || '',
						readCount: article.readCount || '0',
						image: imageUrl,
						video: videoUrl,
						mediaType: mediaType
					};
					
					console.log('📹 加载文章视频URL:', videoUrl);
					
					// 更新阅读数（只有保存的文章才会更新阅读数）
					if (article.id > 4) { // 默认文章ID是1-4，大于4的是保存的文章
						this.updateReadCount();
					}
				} else {
					uni.showToast({
						title: '文章不存在',
						icon: 'none'
					});
					setTimeout(() => {
						this.goBack();
					}, 1500);
				}
			} catch (error) {
				console.error('加载文章失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			}
		},
		// 获取默认文章列表
		getDefaultArticles() {
			return [
				{
					id: 1,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					content: '元宵节吃汤圆是传统习俗，但是空腹吃汤圆需要注意。汤圆主要由糯米制成，糯米粘性大，不易消化，空腹食用容易引起胃部不适。无糖汤圆虽然不添加糖分，但仍然含有淀粉和碳水化合物，过量食用仍然会导致热量摄入增加，因此不能说完全不"胖人"。',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png',
					mediaType: 'image'
				},
				{
					id: 2,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					content: '元宵节吃汤圆是传统习俗，但是空腹吃汤圆需要注意。汤圆主要由糯米制成，糯米粘性大，不易消化，空腹食用容易引起胃部不适。无糖汤圆虽然不添加糖分，但仍然含有淀粉和碳水化合物，过量食用仍然会导致热量摄入增加，因此不能说完全不"胖人"。',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png',
					mediaType: 'image'
				},
				{
					id: 3,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					content: '元宵节吃汤圆是传统习俗，但是空腹吃汤圆需要注意。汤圆主要由糯米制成，糯米粘性大，不易消化，空腹食用容易引起胃部不适。无糖汤圆虽然不添加糖分，但仍然含有淀粉和碳水化合物，过量食用仍然会导致热量摄入增加，因此不能说完全不"胖人"。',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png',
					mediaType: 'image'
				},
				{
					id: 4,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					content: '元宵节吃汤圆是传统习俗，但是空腹吃汤圆需要注意。汤圆主要由糯米制成，糯米粘性大，不易消化，空腹食用容易引起胃部不适。无糖汤圆虽然不添加糖分，但仍然含有淀粉和碳水化合物，过量食用仍然会导致热量摄入增加，因此不能说完全不"胖人"。',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png',
					mediaType: 'image'
				}
			];
		},
		// 更新阅读数
		updateReadCount() {
			try {
				// 尝试从本地存储更新阅读数（如果是保存的文章）
				const newReadCount = updateArticleReadCount(this.articleId);
				if (newReadCount) {
					// 更新当前显示的阅读数
					this.article.readCount = newReadCount;
				} else {
					// 如果是默认文章（不在本地存储中），只更新当前显示的阅读数
					const currentCount = parseInt(this.article.readCount) || 0;
					this.article.readCount = String(currentCount + 1);
					// 触发事件通知列表页更新（即使不在本地存储中）
					uni.$emit('articleReadCountUpdated', {
						articleId: this.articleId,
						readCount: this.article.readCount
					});
				}
			} catch (error) {
				console.error('更新阅读数失败:', error);
			}
		},
		// 图片加载错误处理
		onImageError(e) {
			console.error('图片加载失败:', e);
			this.article.image = '/static/logo.png'; // 使用默认图片
		},
		// 视频加载错误处理
		onVideoError(e) {
			console.error('视频加载失败:', e);
			uni.showToast({
				title: '视频加载失败',
				icon: 'none',
				duration: 2000
			});
		},
		updateTheme(theme) {
			try {
				this.theme = theme || getCurrentTheme();
				this.$nextTick(() => {
					if (this.$forceUpdate && typeof this.$forceUpdate === 'function') {
						this.$forceUpdate();
					}
				});
			} catch (e) {
				console.warn('主题更新失败:', e);
				this.theme = getCurrentTheme();
			}
		},
		// 显示删除确认
		showDeleteConfirm() {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这篇文章吗？删除后无法恢复。',
				confirmText: '删除',
				confirmColor: '#ff3b30',
				cancelText: '取消',
				success: (res) => {
					if (res.confirm) {
						this.deleteArticle();
					}
				}
			});
		},
		// 删除文章
		deleteArticle() {
			if (!this.articleId || this.articleId <= 4) {
				uni.showToast({
					title: '默认文章不能删除',
					icon: 'none'
				});
				return;
			}
			
			uni.showLoading({
				title: '删除中...'
			});
			
			try {
				const success = deleteArticle(this.articleId);
				if (success) {
					uni.hideLoading();
					uni.showToast({
						title: '删除成功',
						icon: 'success',
						duration: 1500
					});
					
					// 延迟返回，让用户看到成功提示
					setTimeout(() => {
						this.goBack();
					}, 1500);
				} else {
					uni.hideLoading();
					uni.showToast({
						title: '删除失败',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('删除文章失败:', error);
				uni.hideLoading();
				uni.showToast({
					title: '删除失败，请重试',
					icon: 'none'
				});
			}
		},
		// 返回上一页
		goBack() {
			const pages = getCurrentPages();
			if (pages && pages.length > 1) {
				uni.navigateBack({
					delta: 1,
					fail: (err) => {
						console.warn('返回失败:', err);
						uni.switchTab({
							url: '/pages/yishuo/yishuo',
							fail: () => {
								uni.showToast({
									title: '返回失败',
									icon: 'none'
								});
							}
						});
					}
				});
			} else {
				uni.switchTab({
					url: '/pages/yishuo/yishuo'
				});
			}
		}
	}
}
</script>

<style lang="scss">
.page {
	min-height: 100vh;
	background-color: var(--bg-color, #ffffff);
	transition: background-color 0.3s ease;
	display: flex;
	flex-direction: column;
}

// 导航栏
.navbar {
	background-color: #4a90e2;
	padding: 20rpx 30rpx;
	padding-top: calc(var(--status-bar-height) + 20rpx);
	position: sticky;
	top: 0;
	z-index: 100;
	
	.navbar-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: relative;
		
		.nav-back-btn {
			width: 60rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-right: 20rpx;
			transition: all 0.3s ease;
			z-index: 1;
			
			&:active {
				opacity: 0.7;
			}
			
			.back-icon {
				font-size: 56rpx;
				color: #ffffff;
				font-weight: bold;
				line-height: 1;
			}
		}
		
		.navbar-title {
			font-size: 36rpx;
			font-weight: bold;
			color: #ffffff;
			position: absolute;
			left: 0;
			right: 0;
			text-align: center;
			pointer-events: none;
		}
		
		.nav-placeholder {
			width: 60rpx;
			height: 60rpx;
			margin-left: 20rpx;
		}
		
		.nav-delete-btn {
			width: 80rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-left: 20rpx;
			transition: all 0.3s ease;
			z-index: 1;
			
			&:active {
				opacity: 0.7;
			}
			
			.delete-icon {
				font-size: 28rpx;
				color: #ffffff;
				font-weight: 500;
			}
		}
	}
}

// 文章容器
.article-container {
	flex: 1;
	width: 100%;
	box-sizing: border-box;
	
	// 文章头部（标题）
	.article-header {
		padding: 40rpx 30rpx 30rpx;
		background-color: var(--card-bg, #fff);
		border-bottom: 1rpx solid var(--border-color, #f0f0f0);
		
		.article-title {
			display: block;
			font-size: 44rpx;
			font-weight: bold;
			color: var(--text-color, #333);
			line-height: 1.6;
			margin-bottom: 24rpx;
			word-wrap: break-word;
			word-break: break-all;
		}
		
		.article-meta {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			.article-date {
				font-size: 24rpx;
				color: var(--text-color-tertiary, #999);
			}
			
			.read-count {
				font-size: 24rpx;
				color: var(--text-color-tertiary, #999);
			}
		}
	}
	
	// 文章媒体（图片或视频）
	.article-media {
		width: 100%;
		background-color: var(--card-bg, #fff);
		padding: 0;
		overflow: hidden;
		
		.article-image {
			width: 100%;
			display: block;
		}
		
		.article-video {
			width: 100%;
			height: 420rpx;
			background-color: #000;
		}
		
		.media-placeholder {
			width: 100%;
			height: 400rpx;
			background-color: var(--bg-color-secondary, #f5f5f5);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			
			.placeholder-icon {
				font-size: 100rpx;
				margin-bottom: 20rpx;
			}
			
			.placeholder-text {
				font-size: 28rpx;
				color: var(--text-color-tertiary, #999);
			}
		}
	}
	
	// 文章内容（文字）
	.article-content {
		padding: 40rpx 30rpx;
		background-color: var(--card-bg, #fff);
		
		.content-text {
			display: block;
			font-size: 32rpx;
			color: var(--text-color, #333);
			line-height: 1.8;
			word-wrap: break-word;
			word-break: break-all;
			white-space: pre-wrap;
		}
	}
}
</style>

