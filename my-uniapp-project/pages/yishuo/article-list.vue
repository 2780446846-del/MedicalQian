<template>
	<view class="page">
		<!-- 导航栏 -->
		<view class="navbar">
			<view class="navbar-content">
				<view class="nav-back-btn" @click="goBack">
					<text class="back-icon">‹</text>
				</view>
				<text class="navbar-title">医说</text>
				<view class="add-article-btn" @click="addArticle">
					<text class="add-btn-text">+ 添加文章</text>
				</view>
			</view>
		</view>
		
		<!-- 文章列表 -->
		<view class="article-list-container">
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
		
		<!-- 主题切换按钮 -->
		<ThemeToggle />
		
		<!-- 添加文章弹窗 -->
		<uni-popup ref="addArticlePopup" type="center" :is-mask-click="false">
			<view class="add-article-modal">
				<view class="modal-header">
					<text class="modal-title">添加文章</text>
					<text class="modal-close" @click="closeAddArticleModal">×</text>
				</view>
				
				<scroll-view class="modal-body" scroll-y>
					<!-- 标题输入 -->
					<view class="form-item">
						<text class="form-label">文章标题</text>
						<input 
							class="form-input" 
							v-model="articleForm.title" 
							placeholder="请输入文章标题" 
							maxlength="100"
						/>
					</view>
					
					<!-- 图片/视频上传 -->
					<view class="form-item">
						<text class="form-label">添加图片或视频</text>
						<view class="media-upload">
							<view class="media-tabs">
								<view 
									class="media-tab" 
									:class="{ active: mediaType === 'image' }"
									@click="switchMediaType('image')"
								>
									图片
								</view>
								<view 
									class="media-tab" 
									:class="{ active: mediaType === 'video' }"
									@click="switchMediaType('video')"
								>
									视频
								</view>
							</view>
							
							<!-- 图片上传区域 -->
							<view v-if="mediaType === 'image'" class="upload-area">
								<view v-if="articleForm.image" class="image-preview">
									<image 
										:src="articleForm.image" 
										mode="aspectFill" 
										class="preview-img"
										@error="onImagePreviewError"
										@load="onImagePreviewLoad"
									></image>
									<view class="delete-btn" @click="deleteImage">
										<text>×</text>
									</view>
								</view>
								<view v-else-if="imageUploadStatus === 'uploading'" class="upload-progress-container">
									<view class="upload-progress-content">
										<text class="upload-progress-icon">📤</text>
										<text class="upload-progress-text">上传中 {{ imageUploadProgress }}%</text>
										<view class="progress-bar">
											<view class="progress-fill" :style="{ width: imageUploadProgress + '%' }"></view>
										</view>
									</view>
								</view>
								<view v-else class="upload-placeholder" @click="chooseImage">
									<text class="upload-icon">📷</text>
									<text class="upload-text">点击选择图片</text>
								</view>
							</view>
							
							<!-- 视频上传区域 -->
							<view v-if="mediaType === 'video'" class="upload-area">
								<view v-if="articleForm.video" class="video-preview">
									<video 
										:src="getVideoUrl(articleForm.video)" 
										class="preview-video" 
										:controls="true"
										:show-center-play-btn="true"
										:show-play-btn="true"
										:enable-play-gesture="true"
										:poster="''"
										@error="onVideoPreviewError"
										@play="onVideoPreviewPlay"
									></video>
									<view class="delete-btn" @click="deleteVideo">
										<text>×</text>
									</view>
								</view>
								<view v-else-if="videoUploadStatus === 'uploading'" class="upload-progress-container">
									<view class="upload-progress-content">
										<text class="upload-progress-icon">📤</text>
										<text class="upload-progress-text">上传中 {{ videoUploadProgress }}%</text>
										<view class="progress-bar">
											<view class="progress-fill" :style="{ width: videoUploadProgress + '%' }"></view>
										</view>
									</view>
								</view>
								<view v-else class="upload-placeholder" @click="chooseVideo">
									<text class="upload-icon">🎥</text>
									<text class="upload-text">点击选择视频</text>
								</view>
							</view>
						</view>
					</view>
					
					<!-- 文章内容输入 -->
					<view class="form-item">
						<text class="form-label">文章内容</text>
						<view class="form-textarea-wrapper">
							<textarea 
								class="form-textarea" 
								v-model="articleForm.content" 
								placeholder="请输入文章内容" 
								maxlength="5000"
								:auto-height="true"
							></textarea>
							<view class="char-count">{{ articleForm.content.length }}/5000</view>
						</view>
					</view>
				</scroll-view>
				
				<view class="modal-footer">
					<view class="footer-btn cancel-btn" @click="closeAddArticleModal">取消</view>
					<view class="footer-btn confirm-btn" @click="saveArticle">保存</view>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getAllArticles, saveArticle } from '@/utils/articleStorage.js';
import { API_BASE_URL } from '@/utils/config.js';
import { upload as uploadFile } from '@/utils/api.js';

export default {
	components: {
		ThemeToggle
	},
	data() {
		return {
			theme: getCurrentTheme(),
			// 屏幕信息
			screenInfo: {
				windowWidth: 375,
				windowHeight: 667
			},
			// 媒体类型：image 或 video
			mediaType: 'image',
			// 文章表单数据
			articleForm: {
				title: '',
				content: '',
				image: '',
				video: ''
			},
			// 图片上传状态
			imageUploadProgress: 0,
			imageUploadStatus: 'idle', // idle | uploading | success | error
			// 视频上传状态（用于大文件分片上传）
			videoUploadProgress: 0,
			videoUploadStatus: 'idle', // idle | uploading | success | error
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
				},
				{
					id: 5,
					title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
					subtitle: '元宵吃汤圆,有什么禁忌吗?',
					readCount: '8908',
					date: '2020-03-03',
					image: '/static/logo.png'
				},
				{
					id: 6,
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
		// 获取屏幕信息用于自适应
		this.getScreenInfo();
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
		// 重新获取屏幕信息（屏幕可能旋转）
		this.getScreenInfo();
		// 重新加载文章列表（可能在其他页面添加了新文章）
		this.loadArticles();
	},
	onHide() {
		uni.$off('themeChange', this.updateTheme);
		uni.$off('articlesUpdated', this.loadArticles);
		uni.$off('articleReadCountUpdated', this.updateArticleReadCount);
	},
	methods: {
		// 获取屏幕信息
		getScreenInfo() {
			try {
				const systemInfo = uni.getSystemInfoSync();
				this.screenInfo = {
					windowWidth: systemInfo.windowWidth || 375,
					windowHeight: systemInfo.windowHeight || 667
				};
			} catch (e) {
				console.warn('获取屏幕信息失败:', e);
				this.screenInfo = {
					windowWidth: 375,
					windowHeight: 667
				};
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
		// 添加文章 - 打开弹窗
		addArticle() {
			// 重置表单
			this.resetForm();
			// 打开弹窗
			this.$refs.addArticlePopup.open();
		},
		// 关闭添加文章弹窗
		closeAddArticleModal() {
			this.$refs.addArticlePopup.close();
			// 延迟重置表单，等待动画完成
			setTimeout(() => {
				this.resetForm();
			}, 300);
		},
		// 重置表单
		resetForm() {
			this.articleForm = {
				title: '',
				content: '',
				image: '',
				video: ''
			};
			this.mediaType = 'image';
			this.imageUploadProgress = 0;
			this.imageUploadStatus = 'idle';
			this.videoUploadProgress = 0;
			this.videoUploadStatus = 'idle';
		},
		// 切换媒体类型
		switchMediaType(type) {
			this.mediaType = type;
			// 切换类型时清空之前选择的媒体
			if (type === 'image') {
				this.articleForm.video = '';
			} else {
				this.articleForm.image = '';
			}
		},
		// 选择图片
		async chooseImage() {
			try {
				const res = await new Promise((resolve, reject) => {
					uni.chooseImage({
						count: 1,
						sizeType: ['compressed', 'original'], // 支持原图和压缩图
						sourceType: ['album', 'camera'],
						success: resolve,
						fail: reject
					});
				});

				const tempFilePath = res.tempFilePaths[0];
				console.log('选择的图片:', tempFilePath);

				// 设置上传状态
				this.imageUploadStatus = 'uploading';
				this.imageUploadProgress = 0;

				// 上传图片到服务器（带进度回调）
				const uploadRes = await uploadFile('/image/upload', tempFilePath, 'image', {}, {
					onProgressUpdate: (progressEvent) => {
						// uni.uploadFile 的进度回调
						if (progressEvent.progress !== undefined) {
							this.imageUploadProgress = Math.round(progressEvent.progress);
						} else if (progressEvent.totalBytesSent && progressEvent.totalBytesExpectedToSend) {
							this.imageUploadProgress = Math.round((progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend) * 100);
						}
					}
				});

				this.imageUploadStatus = 'success';
				this.imageUploadProgress = 100;

				if (uploadRes && uploadRes.success && uploadRes.data && uploadRes.data.url) {
					// 处理图片URL：如果是COS URL（https://开头），直接使用；否则转换为完整URL
					let imageUrl = uploadRes.data.url;
					if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
						imageUrl = this.getFullFileUrl(imageUrl);
					}
					
					// 确保URL完整且有效
					if (!imageUrl || imageUrl.trim() === '') {
						throw new Error('图片URL无效');
					}
					
					// 移除URL末尾可能的空格或换行符
					imageUrl = imageUrl.trim();
					
					this.articleForm.image = imageUrl;
					this.mediaType = 'image';
					console.log('✅ 图片上传成功');
					console.log('   完整URL:', imageUrl);
					console.log('   URL长度:', imageUrl.length);
					console.log('   URL是否以https开头:', imageUrl.startsWith('https://'));
					
					uni.showToast({
						title: '图片上传成功',
						icon: 'success',
						duration: 1500
					});
				} else {
					throw new Error(uploadRes?.message || '上传失败');
				}
			} catch (err) {
				console.error('选择或上传图片失败:', err);
				this.imageUploadStatus = 'error';
				this.imageUploadProgress = 0;
				
				// 用户取消选择时不显示错误
				if (err.errMsg && err.errMsg.includes('cancel')) {
					this.imageUploadStatus = 'idle';
					return;
				}

				uni.showToast({
					title: err.message || '图片上传失败，请重试',
					icon: 'none',
					duration: 2000
				});
			}
		},
		// 删除图片
		deleteImage() {
			this.articleForm.image = '';
			this.imageUploadStatus = 'idle';
			this.imageUploadProgress = 0;
		},
		// 图片预览加载成功
		onImagePreviewLoad(e) {
			console.log('✅ 图片预览加载成功:', this.articleForm.image);
		},
		// 图片预览加载失败
		onImagePreviewError(e) {
			console.error('❌ 图片预览加载失败:', e);
			console.error('图片URL:', this.articleForm.image);
			uni.showToast({
				title: '图片加载失败，请检查URL',
				icon: 'none',
				duration: 2000
			});
		},
		// 视频预览播放
		onVideoPreviewPlay(e) {
			console.log('✅ 视频开始播放:', this.articleForm.video);
		},
		// 视频预览加载失败
		onVideoPreviewError(e) {
			const originalUrl = this.articleForm.video;
			const convertedUrl = this.getVideoUrl(originalUrl);
			console.error('❌ 视频预览加载失败:', e);
			console.error('原始URL:', originalUrl);
			console.error('转换后URL:', convertedUrl);
			console.error('URL类型:', typeof originalUrl);
			console.error('是否为完整URL:', originalUrl && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')));
			uni.showToast({
				title: '视频加载失败，请检查URL或格式',
				icon: 'none',
				duration: 2000
			});
		},
		// 选择视频
		chooseVideo() {
			uni.chooseVideo({
				sourceType: ['album', 'camera'],
				maxDuration: 300, // 最大时长5分钟
				camera: 'back',
				success: async (res) => {
					const tempFilePath = res.tempFilePath;
					console.log('选择的视频临时路径:', tempFilePath);
					console.log('视频时长:', res.duration, '秒');

					// H5 端使用分片上传 + 断点续传 + 秒传，其它端回退为普通上传
					// #ifdef H5
					try {
						await this.handleBigVideoUploadH5(res);
					} catch (error) {
						console.error('大文件分片上传失败，回退到普通上传:', error);
						await this.uploadVideoNormal(tempFilePath);
					}
					// #endif

					// #ifndef H5
					await this.uploadVideoNormal(tempFilePath);
					// #endif
				},
				fail: (err) => {
					console.error('选择视频失败:', err);
					uni.showToast({
						title: '选择视频失败',
						icon: 'none'
					});
				}
			});
		},
		// 普通整文件上传（非H5平台或H5兜底）
		async uploadVideoNormal(tempFilePath) {
			try {
				this.videoUploadStatus = 'uploading';
				this.videoUploadProgress = 0;

				// 上传视频到服务器（带进度回调）
				const res = await uploadFile('/video/upload', tempFilePath, 'video', {}, {
					onProgressUpdate: (progressEvent) => {
						// uni.uploadFile 的进度回调
						if (progressEvent.progress !== undefined) {
							this.videoUploadProgress = Math.round(progressEvent.progress);
						} else if (progressEvent.totalBytesSent && progressEvent.totalBytesExpectedToSend) {
							this.videoUploadProgress = Math.round((progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend) * 100);
						}
					}
				});

				if (res && res.success && res.data && res.data.url) {
					// 后端返回的URL如果是COS URL（https://开头），直接使用
					// 如果是相对路径，通过getFullFileUrl转换为完整URL
					const videoUrl = res.data.url.startsWith('http://') || res.data.url.startsWith('https://') 
						? res.data.url 
						: this.getFullFileUrl(res.data.url);
					this.articleForm.video = videoUrl;
					this.mediaType = 'video';
					this.videoUploadStatus = 'success';
					this.videoUploadProgress = 100;
					console.log('✅ 视频上传成功，URL:', videoUrl);
					uni.showToast({
						title: '视频上传成功',
						icon: 'success',
						duration: 1500
					});
				} else {
					this.videoUploadStatus = 'error';
					throw new Error(res?.message || '上传失败');
				}
			} catch (error) {
				console.error('普通视频上传失败:', error);
				this.videoUploadStatus = 'error';
				this.videoUploadProgress = 0;
				uni.showToast({
					title: '视频上传失败，请重试',
					icon: 'none',
					duration: 2000
				});
			}
		},
		// H5 端：大文件分片上传 + 断点续传 + 秒传
		async handleBigVideoUploadH5(videoRes) {
			// 仅在 H5 环境下调用
			const tempFilePath = videoRes.tempFilePath;

			this.videoUploadStatus = 'uploading';
			this.videoUploadProgress = 0;

			uni.showLoading({
				title: '准备上传视频...',
				mask: true
			});

			// 将 tempFilePath 转为 Blob
			const fetchRes = await fetch(tempFilePath);
			const blob = await fetchRes.blob();

			const fileName = (videoRes.name) || `video_${Date.now()}.mp4`;
			const extIndex = fileName.lastIndexOf('.');
			const ext = extIndex !== -1 ? fileName.substring(extIndex) : '.mp4';

			// 计算文件哈希（用于秒传 / 断点续传）
			const arrayBuffer = await blob.arrayBuffer();
			const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

			// 第一步：检查是否已上传（秒传）或已上传部分分片
			const checkResp = await fetch(`${API_BASE_URL}/video/check`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
                credentials: 'include',
				body: JSON.stringify({
					fileHash,
					filename: fileName,
					size: blob.size,
					ext
				})
			});

			const checkData = await checkResp.json();
			if (!checkData.success) {
				throw new Error(checkData.message || '检查上传状态失败');
			}

			const checkInfo = checkData.data || {};

			// 秒传：文件已经在服务器上
			if (checkInfo.alreadyUploaded && checkInfo.url) {
				uni.hideLoading();
				// 后端返回的URL如果是COS URL（https://开头），直接使用
				let videoUrl = checkInfo.url;
				if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
					videoUrl = this.getFullFileUrl(videoUrl);
				}
				
				// 确保URL完整且有效
				if (!videoUrl || videoUrl.trim() === '') {
					throw new Error('视频URL无效');
				}
				
				videoUrl = videoUrl.trim();
				this.articleForm.video = videoUrl;
				this.mediaType = 'video';
				this.videoUploadStatus = 'success';
				this.videoUploadProgress = 100;
				console.log('✅ 视频秒传成功');
				console.log('   完整URL:', videoUrl);
				console.log('   URL长度:', videoUrl.length);
				uni.showToast({
					title: '已秒传，无需重新上传',
					icon: 'success',
					duration: 1500
				});
				return;
			}

			// 需要分片上传
			const uploadedChunks = checkInfo.uploadedChunks || [];
			const chunkSize = 5 * 1024 * 1024; // 5MB 一个分片
			const totalChunks = Math.ceil(blob.size / chunkSize);

			for (let index = 0; index < totalChunks; index++) {
				// 已经上传过该分片，跳过（断点续传）
				if (uploadedChunks.includes(index)) {
					this.videoUploadProgress = Math.round(((index + 1) / totalChunks) * 100);
					continue;
				}

				const start = index * chunkSize;
				const end = Math.min(blob.size, start + chunkSize);
				const chunkBlob = blob.slice(start, end);

				const formData = new FormData();
				formData.append('fileHash', fileHash);
				formData.append('chunkIndex', index);
				formData.append('totalChunks', totalChunks);
				formData.append('filename', fileName);
				formData.append('ext', ext);
				formData.append('chunk', chunkBlob, `${fileHash}-${index}${ext}`);

				const uploadResp = await fetch(`${API_BASE_URL}/video/upload-chunk`, {
					method: 'POST',
					body: formData,
                    credentials: 'include'
				});

				const uploadData = await uploadResp.json();
				if (!uploadData.success) {
					throw new Error(uploadData.message || `分片 ${index} 上传失败`);
				}

				this.videoUploadProgress = Math.round(((index + 1) / totalChunks) * 100);
			}

			// 所有分片上传完成 -> 通知服务端合并
			const mergeResp = await fetch(`${API_BASE_URL}/video/merge`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
                credentials: 'include',
				body: JSON.stringify({
					fileHash,
					filename: fileName,
					ext,
					totalChunks
				})
			});

			const mergeData = await mergeResp.json();
			uni.hideLoading();

			if (!mergeData.success || !mergeData.data || !mergeData.data.url) {
				throw new Error(mergeData.message || '视频合并失败');
			}

			// 后端返回的URL如果是COS URL（https://开头），直接使用
			// 如果是相对路径，通过getFullFileUrl转换为完整URL
			let videoUrl = mergeData.data.url;
			if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
				videoUrl = this.getFullFileUrl(videoUrl);
			}
			
			// 确保URL完整且有效
			if (!videoUrl || videoUrl.trim() === '') {
				throw new Error('视频URL无效');
			}
			
			// 移除URL末尾可能的空格或换行符
			videoUrl = videoUrl.trim();
			
			this.articleForm.video = videoUrl;
			this.mediaType = 'video';
			this.videoUploadStatus = 'success';
			this.videoUploadProgress = 100;
			console.log('✅ 视频合并完成');
			console.log('   完整URL:', videoUrl);
			console.log('   URL长度:', videoUrl.length);
			console.log('   URL是否以https开头:', videoUrl.startsWith('https://'));

			uni.showToast({
				title: '视频上传完成',
				icon: 'success',
				duration: 1500
			});
		},
		// 将后端返回的相对路径转换为完整可访问的URL
		getFullFileUrl(path) {
			if (!path) {
				console.warn('⚠️ getFullFileUrl: path为空');
				return '';
			}
			
			// 确保是字符串类型
			const pathStr = String(path).trim();
			
			// 已经是完整URL（包括COS URL）
			if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
				// 检查是否是localhost，如果是，可能需要转换为后端服务器地址
				if (pathStr.includes('localhost:5173') || pathStr.includes('127.0.0.1:5173')) {
					console.warn('⚠️ 检测到localhost URL，尝试转换为后端服务器地址');
					// 从配置中获取后端服务器地址
					let backendOrigin = API_BASE_URL.replace(/\/api$/, '');
					if (!backendOrigin || backendOrigin === '/' || backendOrigin.startsWith('/')) {
						backendOrigin = 'http://v96e6967.natappfree.cc';
					}
					// 提取路径部分
					const urlPath = pathStr.replace(/^https?:\/\/[^\/]+/, '');
					const correctedUrl = `${backendOrigin}${urlPath}`;
					console.log(`🔧 修正localhost URL: ${pathStr} -> ${correctedUrl}`);
					return correctedUrl;
				}
				return pathStr;
			}
			
			// 获取后端服务器基础地址（不是前端开发服务器地址）
			let baseOrigin = '';
			
			// 从 API_BASE_URL 推导后端服务器地址
			baseOrigin = API_BASE_URL.replace(/\/api$/, '');
			
			// 如果 API_BASE_URL 是相对路径（如 /api），需要获取实际的后端服务器地址
			if (!baseOrigin || baseOrigin === '/' || baseOrigin.startsWith('/')) {
				// #ifdef H5
				// H5开发环境下，API_BASE_URL可能是 /api（通过代理）
				// 需要从代理配置或环境变量获取实际后端地址
				// 这里使用配置的后端服务器地址
				baseOrigin = 'http://v96e6967.natappfree.cc';
				// #endif
				
				// #ifndef H5
				// 非H5环境，使用配置的完整URL
				baseOrigin = 'http://v96e6967.natappfree.cc';
				// #endif
			}
			
			const fullUrl = `${baseOrigin}${pathStr}`;
			console.log(`🔗 URL转换:`);
			console.log(`   原始路径: ${pathStr}`);
			console.log(`   API_BASE_URL: ${API_BASE_URL}`);
			console.log(`   后端服务器地址: ${baseOrigin}`);
			console.log(`   完整URL: ${fullUrl}`);
			return fullUrl;
		},
		// 获取视频URL（确保是完整URL）
		getVideoUrl(url) {
			if (!url) {
				console.warn('⚠️ getVideoUrl: URL为空');
				return '';
			}
			
			// 确保是字符串类型
			const urlStr = String(url).trim();
			
			// 已经是完整URL
			if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
				console.log('✅ getVideoUrl: 已经是完整URL:', urlStr);
				return urlStr;
			}
			
			// 相对路径转换为完整URL
			const fullUrl = this.getFullFileUrl(urlStr);
			console.log('🔗 getVideoUrl: 转换相对路径');
			console.log('   原始:', urlStr);
			console.log('   转换后:', fullUrl);
			return fullUrl;
		},
		// 删除视频
		deleteVideo() {
			this.articleForm.video = '';
		},
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
					
					// 合并文章列表（保存的文章在前，默认文章在后）
					this.articles = [...newArticles, ...this.articles];
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
		// 保存文章
		saveArticle() {
			// 验证表单
			if (!this.articleForm.title || this.articleForm.title.trim() === '') {
				uni.showToast({
					title: '请输入文章标题',
					icon: 'none'
				});
				return;
			}
			
			if (!this.articleForm.content || this.articleForm.content.trim() === '') {
				uni.showToast({
					title: '请输入文章内容',
					icon: 'none'
				});
				return;
			}
			
			if (!this.articleForm.image && !this.articleForm.video) {
				uni.showToast({
					title: '请选择图片或视频',
					icon: 'none'
				});
				return;
			}
			
			// 显示保存中提示
			uni.showLoading({
				title: '保存中...'
			});
			
			try {
				// 保存文章到本地存储
				const newArticle = saveArticle({
					title: this.articleForm.title.trim(),
					content: this.articleForm.content.trim(),
					image: this.articleForm.image,
					video: this.articleForm.video
				});
				
				// 将新文章添加到列表开头
				this.articles.unshift(newArticle);
				
				uni.hideLoading();
				uni.showToast({
					title: '保存成功',
					icon: 'success',
					duration: 1500
				});
				
				// 关闭弹窗
				this.closeAddArticleModal();
			} catch (error) {
				console.error('保存文章失败:', error);
				uni.hideLoading();
				uni.showToast({
					title: '保存失败，请重试',
					icon: 'none'
				});
			}
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
		// 返回上一页
		goBack() {
			const pages = getCurrentPages();
			if (pages && pages.length > 1) {
				uni.navigateBack({
					delta: 1,
					fail: (err) => {
						console.warn('返回失败:', err);
						// 如果返回失败，尝试跳转到医说页面
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
				// 如果没有上一页，跳转到医说页面
				uni.switchTab({
					url: '/pages/yishuo/yishuo',
					fail: () => {
						uni.showToast({
							title: '无法返回',
							icon: 'none'
						});
					}
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
	padding-bottom: 40rpx;
	transition: background-color 0.3s ease;
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
			flex: 1;
			text-align: center;
			position: absolute;
			left: 0;
			right: 0;
			pointer-events: none;
		}
		
		.add-article-btn {
			background-color: rgba(255, 255, 255, 0.2);
			border: 2rpx solid rgba(255, 255, 255, 0.5);
			border-radius: 30rpx;
			padding: 12rpx 24rpx;
			transition: all 0.3s ease;
			z-index: 1;
			
			&:active {
				background-color: rgba(255, 255, 255, 0.3);
			}
			
			.add-btn-text {
				font-size: 26rpx;
				color: #ffffff;
				font-weight: 500;
			}
		}
	}
}

// 文章列表容器
.article-list-container {
	padding: 30rpx;
	
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

// 添加文章弹窗样式
.add-article-modal {
	width: 680rpx;
	max-width: 90vw;
	min-width: 0;
	height: auto;
	max-height: 85vh;
	background-color: var(--card-bg, #fff);
	border-radius: 20rpx;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	position: relative;
	margin: 0 auto;
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border-bottom: 1rpx solid var(--border-color, #e5e5e5);
		box-sizing: border-box;
		flex-shrink: 0;
		
		.modal-title {
			font-size: 36rpx;
			font-weight: bold;
			color: var(--text-color, #333);
		}
		
		.modal-close {
			font-size: 48rpx;
			color: var(--text-color-tertiary, #999);
			width: 60rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			line-height: 1;
			transition: color 0.3s ease;
			
			&:active {
				color: var(--text-color, #333);
			}
		}
	}
	
	.modal-body {
		flex: 1;
		padding: 30rpx;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		box-sizing: border-box;
		width: 100%;
		
		.form-item {
			margin-bottom: 30rpx;
			width: 100%;
			box-sizing: border-box;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.form-label {
				display: block;
				font-size: 28rpx;
				font-weight: 500;
				color: var(--text-color, #333);
				margin-bottom: 16rpx;
			}
			
			.form-input {
				width: 100%;
				height: 80rpx;
				padding: 0 20rpx;
				background-color: var(--bg-color-secondary, #f5f5f5);
				border-radius: 12rpx;
				font-size: 28rpx;
				color: var(--text-color, #333);
				box-sizing: border-box;
				transition: background-color 0.3s ease;
			}
			
			.form-textarea-wrapper {
				position: relative;
				width: 100%;
				box-sizing: border-box;
				
				.form-textarea {
					width: 100%;
					min-height: 200rpx;
					max-height: 400rpx;
					padding: 20rpx 100rpx 20rpx 20rpx;
					background-color: var(--bg-color-secondary, #f5f5f5);
					border-radius: 12rpx;
					font-size: 28rpx;
					color: var(--text-color, #333);
					box-sizing: border-box;
					transition: background-color 0.3s ease;
					line-height: 1.6;
					resize: none;
					overflow-wrap: break-word;
					word-wrap: break-word;
				}
				
				.char-count {
					position: absolute;
					bottom: 20rpx;
					right: 20rpx;
					font-size: 24rpx;
					color: var(--text-color-tertiary, #999);
					pointer-events: none;
					background-color: transparent;
					white-space: nowrap;
				}
			}
		}
		
		.media-upload {
			width: 100%;
			box-sizing: border-box;
			
			.media-tabs {
				display: flex;
				gap: 20rpx;
				margin-bottom: 20rpx;
				width: 100%;
				box-sizing: border-box;
				
				.media-tab {
					flex: 1;
					height: 60rpx;
					line-height: 60rpx;
					text-align: center;
					background-color: var(--bg-color-secondary, #f5f5f5);
					border-radius: 12rpx;
					font-size: 26rpx;
					color: var(--text-color-secondary, #666);
					transition: all 0.3s ease;
					
					&.active {
						background-color: #4a90e2;
						color: #ffffff;
						font-weight: 500;
					}
				}
			}
			
			.upload-area {
				width: 100%;
				box-sizing: border-box;
				
				.upload-placeholder {
					width: 100%;
					min-height: 300rpx;
					max-height: 400rpx;
					aspect-ratio: 4 / 3;
					background-color: var(--bg-color-secondary, #f5f5f5);
					border-radius: 12rpx;
					border: 2rpx dashed var(--border-color, #d0d0d0);
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					transition: all 0.3s ease;
					box-sizing: border-box;
					overflow: hidden;
					
					&:active {
						background-color: var(--bg-color, #e8e8e8);
						border-color: #4a90e2;
					}
					
					.upload-icon {
						font-size: 80rpx;
						margin-bottom: 16rpx;
					}
					
					.upload-text {
						font-size: 26rpx;
						color: var(--text-color-tertiary, #999);
					}
				}
				
				.upload-progress-container {
					width: 100%;
					min-height: 300rpx;
					max-height: 400rpx;
					aspect-ratio: 4 / 3;
					background-color: var(--bg-color-secondary, #f5f5f5);
					border-radius: 12rpx;
					border: 2rpx solid #4a90e2;
					display: flex;
					align-items: center;
					justify-content: center;
					box-sizing: border-box;
					
					.upload-progress-content {
						width: 80%;
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 20rpx;
						
						.upload-progress-icon {
							font-size: 60rpx;
							animation: pulse 1.5s ease-in-out infinite;
						}
						
						.upload-progress-text {
							font-size: 28rpx;
							color: var(--text-color, #333);
							font-weight: 500;
						}
						
						.progress-bar {
							width: 100%;
							height: 8rpx;
							background-color: rgba(74, 144, 226, 0.2);
							border-radius: 4rpx;
							overflow: hidden;
							
							.progress-fill {
								height: 100%;
								background: linear-gradient(90deg, #4a90e2, #5ba0f2);
								border-radius: 4rpx;
								transition: width 0.3s ease;
								animation: progress-shine 1.5s ease-in-out infinite;
							}
						}
					}
				}
				
				@keyframes pulse {
					0%, 100% {
						transform: scale(1);
						opacity: 1;
					}
					50% {
						transform: scale(1.1);
						opacity: 0.8;
					}
				}
				
				@keyframes progress-shine {
					0% {
						box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.4);
					}
					50% {
						box-shadow: 0 0 10rpx 5rpx rgba(74, 144, 226, 0.6);
					}
					100% {
						box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.4);
					}
				}
				
				.image-preview, .video-preview {
					position: relative;
					width: 100%;
					min-height: 300rpx;
					max-height: 400rpx;
					aspect-ratio: 4 / 3;
					border-radius: 12rpx;
					overflow: hidden;
					background-color: #000;
					
					.preview-img {
						width: 100%;
						height: 100%;
						object-fit: cover;
					}
					
					.preview-video {
						width: 100%;
						height: 100%;
					}
					
					.delete-btn {
						position: absolute;
						top: 10rpx;
						right: 10rpx;
						width: 50rpx;
						height: 50rpx;
						background-color: rgba(0, 0, 0, 0.6);
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						color: #ffffff;
						font-size: 36rpx;
						font-weight: bold;
						line-height: 1;
						z-index: 10;
						
						&:active {
							background-color: rgba(0, 0, 0, 0.8);
						}
					}
				}
			}
		}
	}
	
	.modal-footer {
		display: flex;
		gap: 20rpx;
		padding: 30rpx;
		border-top: 1rpx solid var(--border-color, #e5e5e5);
		box-sizing: border-box;
		flex-shrink: 0;
		width: 100%;
		
		.footer-btn {
			flex: 1;
			height: 80rpx;
			line-height: 80rpx;
			text-align: center;
			border-radius: 12rpx;
			font-size: 28rpx;
			font-weight: 500;
			transition: all 0.3s ease;
			box-sizing: border-box;
			min-width: 0;
			
			&.cancel-btn {
				background-color: var(--bg-color-secondary, #f5f5f5);
				color: var(--text-color, #333);
				
				&:active {
					background-color: var(--bg-color, #e8e8e8);
				}
			}
			
			&.confirm-btn {
				background-color: #4a90e2;
				color: #ffffff;
				
				&:active {
					background-color: #3a7bc8;
				}
			}
		}
	}
}
</style>

