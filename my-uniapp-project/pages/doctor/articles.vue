<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">医生文章</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 医生信息 -->
    <view class="doctor-info-section" v-if="doctorInfo.name">
      <view class="doctor-info-card">
        <image class="doctor-avatar" :src="doctorInfo.avatar" mode="aspectFill" />
        <view class="doctor-info">
          <text class="doctor-name">{{ doctorInfo.name }}</text>
          <text class="doctor-level">{{ doctorInfo.level }}</text>
          <text class="doctor-hospital">{{ doctorInfo.hospital }}</text>
        </view>
      </view>
    </view>

    <!-- 文章列表 -->
    <scroll-view class="articles-list" scroll-y>
      <view
        v-for="(article, index) in allArticles"
        :key="article.id || index"
        class="article-item"
        @click="viewArticle(article)"
      >
        <view class="article-content">
          <text class="article-title">{{ article.title }}</text>
          <text class="article-subtitle">{{ article.subtitle }}</text>
          <view class="article-meta">
            <text class="article-reads">{{ article.readCount }}阅读</text>
            <text class="article-date">{{ article.date }}</text>
          </view>
        </view>
        <view class="article-image">
          <image :src="article.image" mode="aspectFill" class="article-img"></image>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="allArticles.length === 0" class="empty-state">
        <text class="empty-text">暂无文章</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      doctorInfo: {},
      allArticles: []
    };
  },
  onLoad(options) {
    // 接收传递的医生信息
    if (options.doctor) {
      try {
        this.doctorInfo = JSON.parse(decodeURIComponent(options.doctor));
      } catch (e) {
        console.error('解析医生信息失败', e);
      }
    }

    // 接收传递的文章数据
    if (options.articles) {
      try {
        this.allArticles = JSON.parse(decodeURIComponent(options.articles));
      } catch (e) {
        console.error('解析文章数据失败', e);
        // 使用默认文章数据
        this.loadDefaultArticles();
      }
    } else {
      // 如果没有传递文章数据，使用默认数据
      this.loadDefaultArticles();
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    loadDefaultArticles() {
      // 默认文章数据（与 detail.vue 中的保持一致，并扩展更多）
      this.allArticles = [
        {
          id: 1,
          title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
          subtitle: '元宵吃汤圆,有什么禁忌吗?',
          readCount: '8908',
          date: '2020-03-03',
          image: '/static/logo.png',
          content: '汤圆是元宵节的传统美食，但很多人担心空腹吃汤圆是否合适，以及无糖汤圆是否真的不会让人发胖。\n\n首先，关于空腹吃汤圆的问题：\n1. 汤圆主要由糯米制成，糯米属于高GI食物，空腹食用容易导致血糖快速升高。\n2. 对于糖尿病患者或血糖控制不佳的人群，不建议空腹食用汤圆。\n3. 建议在正餐后适量食用，或者搭配其他食物一起食用。\n\n关于无糖汤圆：\n1. 无糖汤圆虽然不含蔗糖，但糯米本身含有大量碳水化合物，仍然会转化为糖分。\n2. 无糖不等于无热量，过量食用仍然会导致体重增加。\n3. 建议控制食用量，每次3-5个为宜。\n\n总的来说，汤圆可以适量食用，但要注意食用时间和数量，特别是对于有血糖问题的人群。'
        },
        {
          id: 2,
          title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
          subtitle: '元宵吃汤圆,有什么禁忌吗?',
          readCount: '8908',
          date: '2020-03-03',
          image: '/static/logo.png',
          content: '汤圆是元宵节的传统美食，但很多人担心空腹吃汤圆是否合适，以及无糖汤圆是否真的不会让人发胖。\n\n首先，关于空腹吃汤圆的问题：\n1. 汤圆主要由糯米制成，糯米属于高GI食物，空腹食用容易导致血糖快速升高。\n2. 对于糖尿病患者或血糖控制不佳的人群，不建议空腹食用汤圆。\n3. 建议在正餐后适量食用，或者搭配其他食物一起食用。\n\n关于无糖汤圆：\n1. 无糖汤圆虽然不含蔗糖，但糯米本身含有大量碳水化合物，仍然会转化为糖分。\n2. 无糖不等于无热量，过量食用仍然会导致体重增加。\n3. 建议控制食用量，每次3-5个为宜。\n\n总的来说，汤圆可以适量食用，但要注意食用时间和数量，特别是对于有血糖问题的人群。'
        },
        {
          id: 3,
          title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
          subtitle: '元宵吃汤圆,有什么禁忌吗?',
          readCount: '8908',
          date: '2020-03-03',
          image: '/static/logo.png',
          content: '汤圆是元宵节的传统美食，但很多人担心空腹吃汤圆是否合适，以及无糖汤圆是否真的不会让人发胖。\n\n首先，关于空腹吃汤圆的问题：\n1. 汤圆主要由糯米制成，糯米属于高GI食物，空腹食用容易导致血糖快速升高。\n2. 对于糖尿病患者或血糖控制不佳的人群，不建议空腹食用汤圆。\n3. 建议在正餐后适量食用，或者搭配其他食物一起食用。\n\n关于无糖汤圆：\n1. 无糖汤圆虽然不含蔗糖，但糯米本身含有大量碳水化合物，仍然会转化为糖分。\n2. 无糖不等于无热量，过量食用仍然会导致体重增加。\n3. 建议控制食用量，每次3-5个为宜。\n\n总的来说，汤圆可以适量食用，但要注意食用时间和数量，特别是对于有血糖问题的人群。'
        },
        {
          id: 4,
          title: '空腹能不能吃汤圆? 无糖汤圆不"胖人"吗?',
          subtitle: '元宵吃汤圆,有什么禁忌吗?',
          readCount: '8908',
          date: '2020-03-03',
          image: '/static/logo.png',
          content: '汤圆是元宵节的传统美食，但很多人担心空腹吃汤圆是否合适，以及无糖汤圆是否真的不会让人发胖。\n\n首先，关于空腹吃汤圆的问题：\n1. 汤圆主要由糯米制成，糯米属于高GI食物，空腹食用容易导致血糖快速升高。\n2. 对于糖尿病患者或血糖控制不佳的人群，不建议空腹食用汤圆。\n3. 建议在正餐后适量食用，或者搭配其他食物一起食用。\n\n关于无糖汤圆：\n1. 无糖汤圆虽然不含蔗糖，但糯米本身含有大量碳水化合物，仍然会转化为糖分。\n2. 无糖不等于无热量，过量食用仍然会导致体重增加。\n3. 建议控制食用量，每次3-5个为宜。\n\n总的来说，汤圆可以适量食用，但要注意食用时间和数量，特别是对于有血糖问题的人群。'
        },
        {
          id: 5,
          title: '春季养生小贴士',
          subtitle: '如何通过饮食调理身体',
          readCount: '5623',
          date: '2020-03-01',
          image: '/static/logo.png',
          content: '春季是万物复苏的季节，也是养生的好时机。春季养生需要注意以下几点：\n\n1. 饮食调理：\n   - 多吃新鲜蔬菜和水果，补充维生素\n   - 适量食用温补食物，如红枣、桂圆等\n   - 少吃生冷食物，保护脾胃\n\n2. 运动锻炼：\n   - 选择适合的户外运动，如散步、慢跑\n   - 避免剧烈运动，循序渐进\n   - 注意运动后的保暖\n\n3. 作息规律：\n   - 早睡早起，顺应自然规律\n   - 保证充足的睡眠时间\n   - 避免熬夜\n\n4. 情绪调节：\n   - 保持心情愉悦\n   - 多与朋友交流\n   - 适当放松，缓解压力\n\n春季养生要顺应自然，循序渐进，才能达到最佳效果。'
        },
        {
          id: 6,
          title: '如何预防感冒',
          subtitle: '提高免疫力的方法',
          readCount: '7234',
          date: '2020-02-28',
          image: '/static/logo.png',
          content: '感冒是常见的呼吸道疾病，预防感冒需要从多个方面入手：\n\n1. 增强免疫力：\n   - 保证充足的睡眠\n   - 均衡饮食，多摄入维生素C\n   - 适量运动，增强体质\n\n2. 注意个人卫生：\n   - 勤洗手，特别是在接触公共物品后\n   - 避免用手触摸口鼻眼\n   - 保持室内空气流通\n\n3. 避免接触传染源：\n   - 避免与感冒患者密切接触\n   - 在流感高发期减少去人群密集的地方\n   - 必要时佩戴口罩\n\n4. 及时就医：\n   - 出现感冒症状及时就医\n   - 遵医嘱用药，不要自行用药\n   - 注意休息，多喝水\n\n预防感冒需要长期坚持，养成良好的生活习惯是关键。'
        }
      ];
    },
    viewArticle(article) {
      // 跳转到文章详情页面
      const articleData = encodeURIComponent(JSON.stringify(article));
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      uni.navigateTo({
        url: `/pages/doctor/article-detail?article=${articleData}&doctor=${doctorData}`,
        fail: (err) => {
          console.error('跳转到文章详情页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6fa;
}

/* 导航栏 */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333333;
  font-weight: 300;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
}

/* 医生信息 */
.doctor-info-section {
  margin-top: 100rpx;
  padding: 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.doctor-info-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.doctor-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.doctor-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.doctor-level {
  font-size: 24rpx;
  color: #666666;
}

.doctor-hospital {
  font-size: 24rpx;
  color: #999999;
}

/* 文章列表 */
.articles-list {
  flex: 1;
  padding: 24rpx;
  padding-top: 0;
}

.article-item {
  display: flex;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.article-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-right: 20rpx;
}

.article-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  line-height: 1.5;
  display: block;
}

.article-subtitle {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.5;
  display: block;
}

.article-meta {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999999;
}

.article-reads {
  color: #999999;
}

.article-date {
  color: #999999;
}

.article-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.article-img {
  width: 100%;
  height: 100%;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}
</style>

