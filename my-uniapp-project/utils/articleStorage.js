/**
 * 医说文章本地存储工具
 */

const STORAGE_KEY = 'yishuo_articles'

/**
 * 获取所有文章
 */
export function getAllArticles() {
	try {
		const articles = uni.getStorageSync(STORAGE_KEY)
		return articles ? JSON.parse(articles) : []
	} catch (error) {
		console.error('获取文章列表失败:', error)
		return []
	}
}

/**
 * 保存文章
 * @param {Object} articleData - 文章数据
 */
export function saveArticle(articleData) {
	try {
		const articles = getAllArticles()
		
		// 生成新文章的ID（使用时间戳 + 随机数确保唯一性）
		const newId = Date.now() + Math.floor(Math.random() * 1000)
		
		// 格式化日期
		const now = new Date()
		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, '0')
		const day = String(now.getDate()).padStart(2, '0')
		const formattedDate = `${year}-${month}-${day}`
		
		// 创建文章对象
		const article = {
			id: newId,
			title: articleData.title || '',
			subtitle: articleData.content ? articleData.content.substring(0, 50) : '', // 使用内容前50字符作为副标题
			content: articleData.content || '',
			readCount: '0', // 初始阅读数为0
			date: formattedDate,
			image: articleData.image || '/static/logo.png',
			video: articleData.video || '',
			mediaType: articleData.video ? 'video' : 'image', // 记录媒体类型：有视频就是video，否则是image
			createTime: Date.now()
		}
		
		// 将新文章添加到数组开头（最新文章在前）
		articles.unshift(article)
		
		// 保存到本地存储
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(articles))
		
		// 触发文章更新事件，通知其他页面刷新
		uni.$emit('articlesUpdated', article)
		
		return article
	} catch (error) {
		console.error('保存文章失败:', error)
		throw error
	}
}

/**
 * 根据ID获取文章
 * @param {Number} articleId - 文章ID
 */
export function getArticleById(articleId) {
	try {
		const articles = getAllArticles()
		return articles.find(article => article.id === articleId) || null
	} catch (error) {
		console.error('获取文章失败:', error)
		return null
	}
}

/**
 * 删除文章
 * @param {Number} articleId - 文章ID
 */
export function deleteArticle(articleId) {
	try {
		const articles = getAllArticles()
		const filteredArticles = articles.filter(article => article.id !== articleId)
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(filteredArticles))
		
		// 触发文章更新事件
		uni.$emit('articlesUpdated')
		
		return true
	} catch (error) {
		console.error('删除文章失败:', error)
		return false
	}
}

/**
 * 更新文章阅读数
 * @param {Number} articleId - 文章ID
 */
export function updateArticleReadCount(articleId) {
	try {
		const articles = getAllArticles()
		const article = articles.find(item => item.id === articleId)
		if (article) {
			const currentCount = parseInt(article.readCount) || 0
			article.readCount = String(currentCount + 1)
			uni.setStorageSync(STORAGE_KEY, JSON.stringify(articles))
			
			// 触发阅读数更新事件，通知其他页面刷新
			uni.$emit('articleReadCountUpdated', {
				articleId: articleId,
				readCount: article.readCount
			})
			
			return article.readCount
		}
		return null
	} catch (error) {
		console.error('更新阅读数失败:', error)
		return null
	}
}

