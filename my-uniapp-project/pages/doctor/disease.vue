<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-box">
        <text class="icon-search">🔍</text>
        <input
          class="search-input"
          type="text"
          v-model="searchKeyword"
          placeholder="搜索疾病名称"
          placeholder-class="search-placeholder"
          @input="onSearchInput"
        />
      </view>
    </view>

    <!-- 疾病列表 -->
    <view class="content">
      <!-- 左侧身体部位分类 -->
      <scroll-view class="left-column" scroll-y>
        <view
          v-for="(category, index) in categories"
          :key="index"
          class="category-item"
          :class="{ active: activeCategoryIndex === index }"
          @click="selectCategory(index)"
        >
          <text class="category-text">{{ category.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧疾病列表 -->
      <scroll-view class="right-column" scroll-y>
        <view
          v-for="(disease, index) in filteredDiseases"
          :key="index"
          class="disease-item"
          @click="selectDisease(disease)"
        >
          <text class="disease-text">{{ disease }}</text>
          <text v-if="disease === lastSelectedDisease" class="disease-tag">上次选过</text>
        </view>
        
        <!-- 空结果提示 -->
        <view v-if="filteredDiseases.length === 0 && searchKeyword" class="empty-result">
          <text class="empty-text">未找到相关疾病</text>
          <text class="empty-hint">请尝试其他关键词</text>
        </view>
      </scroll-view>
    </view>

    <!-- 右下角悬浮按钮 -->
    <view class="float-btn" @click="onFloatClick">
      <text class="float-icon">☀️</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchKeyword: '',
      activeCategoryIndex: 0,
      lastSelectedDisease: '发烧', // 上次选过的疾病
      categories: [
        {
          name: '头部',
          diseases: [
            '发烧',
            '头痛',
            '偏头痛',
            '眼干',
            '眼疲劳',
            '鼻窦炎',
            '口腔溃疡',
            '头部疾病',
            '耳鸣',
            '眩晕',
            '失眠'
          ]
        },
        {
          name: '全身',
          diseases: [
            '感冒',
            '发热',
            '乏力',
            '食欲不振',
            '体重下降',
            '全身疼痛',
            '过敏',
            '免疫力低下'
          ]
        },
        {
          name: '胸部',
          diseases: [
            '胸闷',
            '胸痛',
            '心悸',
            '咳嗽',
            '哮喘',
            '呼吸困难',
            '肺炎',
            '支气管炎'
          ]
        },
        {
          name: '四肢',
          diseases: [
            '关节痛',
            '肌肉酸痛',
            '四肢麻木',
            '四肢无力',
            '关节炎',
            '风湿',
            '痛风'
          ]
        },
        {
          name: '背部',
          diseases: [
            '背痛',
            '腰痛',
            '颈椎病',
            '腰椎间盘突出',
            '肩周炎',
            '脊柱侧弯'
          ]
        },
        {
          name: '骨',
          diseases: [
            '骨折',
            '骨质疏松',
            '骨关节炎',
            '骨痛',
            '骨肿瘤',
            '骨感染'
          ]
        },
        {
          name: '臀部',
          diseases: [
            '坐骨神经痛',
            '臀部疼痛',
            '尾骨痛',
            '髋关节痛'
          ]
        },
        {
          name: '手部',
          diseases: [
            '手痛',
            '手腕痛',
            '手指麻木',
            '腱鞘炎',
            '类风湿关节炎',
            '手部外伤'
          ]
        },
        {
          name: '脚部',
          diseases: [
            '脚痛',
            '脚踝痛',
            '足底筋膜炎',
            '脚部外伤',
            '脚气',
            '甲沟炎'
          ]
        }
      ]
    };
  },
  computed: {
    filteredDiseases() {
      // 如果没有搜索关键词，显示当前分类的疾病
      if (!this.searchKeyword || this.searchKeyword.trim() === '') {
        return this.categories[this.activeCategoryIndex].diseases;
      }
      
      // 有搜索关键词时，在所有分类中搜索
      const keyword = this.searchKeyword.trim().toLowerCase();
      const allDiseases = [];
      
      this.categories.forEach(category => {
        category.diseases.forEach(disease => {
          if (disease.toLowerCase().includes(keyword)) {
            // 避免重复
            if (!allDiseases.includes(disease)) {
              allDiseases.push(disease);
            }
          }
        });
      });
      
      return allDiseases;
    }
  },
  methods: {
    selectCategory(index) {
      this.activeCategoryIndex = index;
      this.searchKeyword = ''; // 切换分类时清空搜索
    },
    selectDisease(disease) {
      // 通过事件通道返回选择的疾病
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.$vm) {
        prevPage.$vm.selectedDisease = disease;
        // 如果方法存在则调用
        if (typeof prevPage.$vm.applyDiseaseFilter === 'function') {
          prevPage.$vm.applyDiseaseFilter();
        }
      }
      // 返回上一页
      uni.navigateBack();
    },
    onSearchInput() {
      // 搜索功能已通过computed实现
    },
    onFloatClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
}

.search-bar {
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-box {
  height: 64rpx;
  border-radius: 32rpx;
  background-color: #f3f4f6;
  padding: 0 24rpx;
  flex-direction: row;
  align-items: center;
  display: flex;
}

.icon-search {
  font-size: 26rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
}

.search-placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

.content {
  flex: 1;
  flex-direction: row;
  display: flex;
  overflow: hidden;
}

.left-column {
  width: 200rpx;
  background-color: #f8f9fa;
  border-right: 1rpx solid #f0f0f0;
}

.category-item {
  padding: 32rpx 20rpx;
  border-left: 6rpx solid transparent;
  position: relative;
}

.category-item.active {
  background-color: #ffffff;
  border-left-color: #2979ff;
}

.category-item.active .category-text {
  color: #2979ff;
  font-weight: 600;
}

.category-text {
  font-size: 28rpx;
  color: #333333;
}

.right-column {
  flex: 1;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
}

.disease-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.disease-text {
  font-size: 28rpx;
  color: #333333;
}

.disease-tag {
  font-size: 22rpx;
  color: #999999;
  background-color: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.float-btn {
  position: fixed;
  right: 40rpx;
  bottom: 160rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background-color: #ffb84d;
  align-items: center;
  justify-content: center;
  display: flex;
  box-shadow: 0 8rpx 20rpx rgba(255, 170, 51, 0.5);
}

.float-icon {
  font-size: 40rpx;
}

/* 空结果提示 */
.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
  
  .empty-text {
    font-size: 32rpx;
    color: #999999;
    margin-bottom: 16rpx;
  }
  
  .empty-hint {
    font-size: 26rpx;
    color: #cccccc;
  }
}
</style>

