<template>
	<view class="page">
		<!-- 医说 -->
		<view class="medical-talk-section">
			<view class="section-header-row">
				<text class="section-title">医说</text>
				<text class="view-more" @click="viewMoreMedicalTalk">查看更多></text>
			</view>
			
			<view class="article-list">
				<view 
					v-for="article in articles" 
					:key="article.id" 
					class="article-card"
					@click="selectArticle(article.id)"
				>
					<view class="article-content">
						<view class="article-title">{{ article.title }}</view>
						<view class="article-subtitle">{{ article.subtitle }}</view>
						<view class="article-meta">
							<text class="read-count">{{ article.readCount }}阅读</text>
							<text class="article-date">{{ article.date }}</text>
						</view>
					</view>
					<view class="article-image">
						<video 
							v-if="article.mediaType === 'video' && article.video"
							:src="getVideoUrl(article.video)"
							class="article-video-thumb"
							:controls="false"
							:show-center-play-btn="true"
							:show-play-btn="false"
							:enable-play-gesture="false"
							:autoplay="false"
							:muted="true"
							object-fit="cover"
							:poster="getVideoPoster(article) || undefined"
							@loadedmetadata="onVideoMetadataLoaded"
						></video>
						<image 
							v-else
							:src="article.image" 
							mode="aspectFill" 
							class="article-img"
						></image>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 主题切换按钮 -->
		<ThemeToggle />
	</view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getAllArticles } from '@/utils/articleStorage.js';
import { API_BASE_URL } from '@/utils/config.js';

export default {
	components: {
		ThemeToggle
	},
	data() {
		return {
			theme: getCurrentTheme(),
			// 医说文章数据（从本地存储加载，只显示前4条）
			articles: []
		}
	},
	onLoad() {
		// 加载文章列表
		this.loadArticles();
	},
	onShow() {
		// 监听主题变更
		uni.$on('themeChange', this.updateTheme);
		// 监听文章更新事件
		uni.$on('articlesUpdated', this.loadArticles);
		// 监听阅读数更新事件
		uni.$on('articleReadCountUpdated', this.updateArticleReadCount);
		// 重新加载文章列表（可能在其他页面添加了新文章）
		this.loadArticles();
	},
	onHide() {
		uni.$off('themeChange', this.updateTheme);
		uni.$off('articlesUpdated', this.loadArticles);
		uni.$off('articleReadCountUpdated', this.updateArticleReadCount);
	},
	methods: {
		// 加载文章列表
		loadArticles() {
			try {
				// 直接从本地存储加载所有文章，只显示前4条
				const savedArticles = getAllArticles();
				this.articles = (savedArticles || []).slice(0, 4);
			} catch (error) {
				console.error('加载文章列表失败:', error);
				this.articles = [];
			}
		},
		// 更新文章阅读数
		updateArticleReadCount(data) {
			try {
				if (data && data.articleId) {
					// 查找并更新对应文章的阅读数
					const article = this.articles.find(a => a.id === data.articleId);
					if (article && data.readCount) {
						article.readCount = data.readCount;
					}
				}
			} catch (error) {
				console.error('更新阅读数失败:', error);
			}
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
		// 查看更多医说
		viewMoreMedicalTalk() {
			uni.navigateTo({
				url: '/pages/yishuo/article-list',
				fail: (err) => {
					console.error('跳转失败:', err);
					uni.showToast({
						title: '跳转失败',
						icon: 'none'
					});
				}
			});
		},
		// 选择文章
		selectArticle(articleId) {
			uni.navigateTo({
				url: `/pages/yishuo/article-detail?id=${articleId}`,
				fail: (err) => {
					console.error('跳转失败:', err);
					uni.showToast({
						title: '跳转失败',
						icon: 'none'
					});
				}
			});
		},
		// 获取完整文件URL
		getFullFileUrl(pathStr) {
			if (!pathStr) {
				return '';
			}
			
			const path = String(pathStr).trim();
			
			// 如果已经是完整URL，直接返回
			if (path.startsWith('http://') || path.startsWith('https://')) {
				return path;
			}
			
			// 如果是静态资源路径，直接返回
			if (path.startsWith('/static/')) {
				return path;
			}
			
			// 获取后端服务器基础地址
			let baseOrigin = API_BASE_URL.replace(/\/api$/, '');
			if (!baseOrigin || baseOrigin === '/' || baseOrigin.startsWith('/')) {
				baseOrigin = 'http://localhost:3000';
			}
			
			return `${baseOrigin}${path}`;
		},
		// 获取视频URL
		getVideoUrl(url) {
			if (!url) {
				return '';
			}
			
			const urlStr = String(url).trim();
			
			// 如果已经是完整URL，直接返回
			if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
				return urlStr;
			}
			
			// 相对路径转换为完整URL
			return this.getFullFileUrl(urlStr);
		},
		// 获取视频封面图
		getVideoPoster(article) {
			// 如果文章有保存的封面图且不是默认值，使用它
			if (article.image && article.image !== '/static/logo.png' && article.image.trim() !== '') {
				// 如果是完整URL，直接返回
				if (article.image.startsWith('http://') || article.image.startsWith('https://')) {
					return article.image;
				}
				// 否则转换为完整URL
				return this.getFullFileUrl(article.image);
			}
			// 如果没有封面图，返回null，让video自动使用第一帧
			return null;
		},
		// 视频元数据加载完成
		onVideoMetadataLoaded(e) {
			// 视频元数据加载完成，第一帧应该已经可以显示了
			console.log('视频元数据加载完成');
		}
	}
}
</script>

<style lang="scss">
.page {
	min-height: 100vh;
	background-color: var(--bg-color, #ffffff);
	padding-bottom: 40rpx;
	transition: background-color 0.3s ease;
}

// 医说
.medical-talk-section {
	padding: 40rpx 30rpx;
	background-color: var(--card-bg, #fff);
	transition: background-color 0.3s ease;
	
	.section-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
		
		.section-title {
			font-size: 36rpx;
			font-weight: bold;
			color: var(--text-color, #333);
			transition: color 0.3s ease;
		}
		
		.view-more {
			font-size: 26rpx;
			color: var(--text-color-tertiary, #999);
			transition: color 0.3s ease;
		}
	}
	
	.article-list {
		.article-card {
			background: var(--card-bg, #fff);
			border-radius: 16rpx;
			padding: 30rpx;
			margin-bottom: 20rpx;
			display: flex;
			box-shadow: 0 2rpx 8rpx var(--shadow-color, rgba(0, 0, 0, 0.05));
			transition: background-color 0.3s ease, box-shadow 0.3s ease;
			
			.article-content {
				flex: 1;
				min-width: 0;
				margin-right: 20rpx;
				
				.article-title {
					font-size: 30rpx;
					font-weight: bold;
					color: var(--text-color, #333);
					line-height: 1.5;
					margin-bottom: 12rpx;
					display: -webkit-box;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 2;
					transition: color 0.3s ease;
					line-clamp: 2;
					overflow: hidden;
				}
				
				.article-subtitle {
					font-size: 24rpx;
					color: var(--text-color-tertiary, #999);
					line-height: 1.5;
					margin-bottom: 16rpx;
					display: -webkit-box;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 1;
					line-clamp: 1;
					overflow: hidden;
					transition: color 0.3s ease;
				}
				
				.article-meta {
					display: flex;
					justify-content: space-between;
					align-items: center;
					
					.read-count {
						font-size: 22rpx;
						color: var(--text-color-tertiary, #999);
						transition: color 0.3s ease;
					}
					
					.article-date {
						font-size: 22rpx;
						color: var(--text-color-tertiary, #999);
						transition: color 0.3s ease;
					}
				}
			}
			
			.article-image {
				width: 160rpx;
				height: 160rpx;
				border-radius: 12rpx;
				overflow: hidden;
				flex-shrink: 0;
				background: #f0f0f0;
				
				.article-img {
					width: 100%;
					height: 100%;
				}
				
				.article-video-thumb {
					width: 100%;
					height: 100%;
					border-radius: 12rpx;
				}
			}
		}
	}
}
</style>
