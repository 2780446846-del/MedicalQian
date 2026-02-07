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
          placeholder="搜索科室名称"
          placeholder-class="search-placeholder"
          @input="onSearchInput"
        />
      </view>
    </view>

    <!-- 科室列表 -->
    <view class="content">
      <!-- 左侧主科室 -->
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

      <!-- 右侧子科室 -->
      <scroll-view class="right-column" scroll-y>
        <view
          v-for="(dept, index) in filteredSubDepartments"
          :key="index"
          class="dept-item"
          @click="selectDepartment(dept)"
        >
          <text class="dept-text">{{ dept }}</text>
          <text v-if="dept === lastSelectedDept" class="dept-tag">上次选过</text>
        </view>
        
        <!-- 空结果提示 -->
        <view v-if="filteredSubDepartments.length === 0 && searchKeyword" class="empty-result">
          <text class="empty-text">未找到相关科室</text>
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
      lastSelectedDept: '普内科', // 上次选过的科室
      categories: [
        {
          name: '内科',
          subDepartments: [
            '普内科',
            '心血管内科',
            '神经内科',
            '消化内科',
            '呼吸内科',
            '肾内科',
            '高压氧科',
            '内分泌科'
          ]
        },
        {
          name: '外科',
          subDepartments: [
            '普外科',
            '神经外科',
            '胸外科',
            '泌尿外科',
            '肛肠外科',
            '乳腺外科',
            '血管外科'
          ]
        },
        {
          name: '骨科',
          subDepartments: [
            '脊柱外科',
            '关节外科',
            '创伤骨科',
            '手外科',
            '运动医学科'
          ]
        },
        {
          name: '妇产科',
          subDepartments: [
            '妇科',
            '产科',
            '计划生育科',
            '生殖医学科'
          ]
        },
        {
          name: '儿科',
          subDepartments: [
            '小儿内科',
            '小儿外科',
            '新生儿科',
            '儿童保健科'
          ]
        },
        {
          name: '肿瘤科',
          subDepartments: [
            '肿瘤内科',
            '肿瘤外科',
            '放疗科',
            '介入治疗科'
          ]
        },
        {
          name: '口腔科',
          subDepartments: [
            '口腔内科',
            '口腔外科',
            '口腔修复科',
            '口腔正畸科'
          ]
        }
      ]
    };
  },
  computed: {
    filteredSubDepartments() {
      // 如果没有搜索关键词，显示当前分类的子科室
      if (!this.searchKeyword || this.searchKeyword.trim() === '') {
        return this.categories[this.activeCategoryIndex].subDepartments;
      }
      
      // 有搜索关键词时，在所有分类中搜索
      const keyword = this.searchKeyword.trim().toLowerCase();
      const allDepartments = [];
      
      this.categories.forEach(category => {
        category.subDepartments.forEach(dept => {
          if (dept.toLowerCase().includes(keyword)) {
            // 避免重复
            if (!allDepartments.includes(dept)) {
              allDepartments.push(dept);
            }
          }
        });
      });
      
      return allDepartments;
    }
  },
  methods: {
    selectCategory(index) {
      this.activeCategoryIndex = index;
      this.searchKeyword = ''; // 切换主科室时清空搜索
    },
    selectDepartment(dept) {
      // 通过事件通道返回选择的科室
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.$vm) {
        prevPage.$vm.selectedDepartment = dept;
        // 如果方法存在则调用
        if (typeof prevPage.$vm.applyDepartmentFilter === 'function') {
          prevPage.$vm.applyDepartmentFilter();
        }
      }
      // 返回上一页
      uni.navigateBack();
    },
    onSearchInput() {
      // 搜索时自动切换到第一个主科室
      if (this.searchKeyword && this.activeCategoryIndex !== 0) {
        // 如果搜索关键词在所有主科室的子科室中都找不到，可以保持当前选择
        // 这里简化处理，搜索时不清空主科室选择
      }
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

.dept-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dept-text {
  font-size: 28rpx;
  color: #333333;
}

.dept-tag {
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

