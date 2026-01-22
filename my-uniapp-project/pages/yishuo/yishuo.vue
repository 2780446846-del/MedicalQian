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
						<image :src="article.image" mode="aspectFill" class="article-img"></image>
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

export default {
	components: {
		ThemeToggle
	},
	data() {
		return {
			theme: getCurrentTheme(),
			// 医说文章数据
			articles: [
				{
					id: 1,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png'
				},
				{
					id: 2,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png'
				},
				{
					id: 3,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png'
				},
				{
					id: 4,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png'
				}
			]
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
				const savedArticles = getAllArticles();
				
				// 如果有保存的文章，合并到现有列表中
				if (savedArticles && savedArticles.length > 0) {
					// 获取现有的默认文章ID集合
					const defaultIds = this.articles.map(a => a.id);
					
					// 过滤掉已存在的文章，只添加新保存的文章
					const newArticles = savedArticles.filter(a => !defaultIds.includes(a.id));
					
					// 合并文章列表（保存的文章在前，默认文章在后，只显示前4条）
					const mergedArticles = [...newArticles, ...this.articles];
					this.articles = mergedArticles.slice(0, 4);
				}
			} catch (error) {
				console.error('加载文章列表失败:', error);
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
			}
		}
	}
}
</style>
