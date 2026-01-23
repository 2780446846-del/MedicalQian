<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">智能推荐</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 症状输入区域 -->
    <view class="symptom-section">
      <view class="section-title">描述您的症状</view>
      <view class="symptom-input-box">
        <textarea
          class="symptom-input"
          v-model="symptomDescription"
          placeholder="例如：头痛、发热、咳嗽、胃痛等..."
          maxlength="200"
          @input="onSymptomInput"
        ></textarea>
        <view class="char-count">{{ symptomDescription.length }}/200</view>
      </view>
      <button class="search-btn" @click="searchBySymptom" :disabled="!symptomDescription.trim()">
        智能匹配医生
      </button>
    </view>

    <!-- 热门标签 -->
    <view class="hot-tags-section">
      <!-- 热门科室 -->
      <view class="tags-group">
        <view class="tags-title">
          <text class="title-icon">🏥</text>
          <text class="title-text">热门科室</text>
        </view>
        <scroll-view class="tags-scroll" scroll-x show-scrollbar="false">
          <view class="tags-list">
            <view
              v-for="(dept, index) in hotDepartments"
              :key="index"
              class="tag-item"
              :class="{ active: selectedDeptTag === dept }"
              @click="selectDeptTag(dept)"
            >
              <text class="tag-text">{{ dept }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      
      <!-- 热门疾病 -->
      <view class="tags-group">
        <view class="tags-title">
          <text class="title-icon">🩺</text>
          <text class="title-text">热门疾病</text>
        </view>
        <scroll-view class="tags-scroll" scroll-x show-scrollbar="false">
          <view class="tags-list">
            <view
              v-for="(disease, index) in hotDiseases"
              :key="index"
              class="tag-item"
              :class="{ active: selectedDiseaseTag === disease }"
              @click="selectDiseaseTag(disease)"
            >
              <text class="tag-text">{{ disease }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 推荐标签 -->
    <view class="recommend-tags" v-if="recommendTags.length > 0">
      <view class="tags-title">为您推荐</view>
      <view class="tags-list">
        <view
          v-for="(tag, index) in recommendTags"
          :key="index"
          class="tag-item"
          :class="{ active: tag.active }"
          @click="selectTag(tag)"
        >
          <text class="tag-icon">{{ tag.icon }}</text>
          <text class="tag-text">{{ tag.text }}</text>
        </view>
      </view>
    </view>

    <!-- 推荐结果 -->
    <scroll-view class="recommend-content" scroll-y>
      <!-- 基于历史记录推荐 -->
      <view v-if="historyRecommendations.length > 0" class="recommend-section">
        <view class="section-header">
          <text class="section-title-text">基于您的就诊历史</text>
          <view class="recommend-badge">为您推荐</view>
        </view>
        <view
          v-for="doctor in historyRecommendations"
          :key="doctor.id"
          class="doctor-card"
          @click="viewDoctorDetail(doctor)"
        >
          <view class="doctor-avatar">
            <image :src="doctor.avatar" mode="aspectFill" class="avatar-img"></image>
            <view class="recommend-label">历史就诊</view>
          </view>
          <view class="doctor-info">
            <view class="doctor-name-row">
              <text class="doctor-name">{{ doctor.name }}</text>
              <text class="doctor-level">{{ doctor.level }}</text>
            </view>
            <text class="doctor-hospital">{{ doctor.hospital }}</text>
            <text class="doctor-dept">{{ doctor.dept }}</text>
            <view class="doctor-specialties">
              <text class="specialties-label">擅长：</text>
              <text class="specialties-text">{{ doctor.goodAt }}</text>
            </view>
            <view class="recommend-reason">
              <text class="reason-icon">💡</text>
              <text class="reason-text">{{ doctor.recommendReason }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 基于症状匹配推荐 -->
      <view v-if="symptomRecommendations.length > 0" class="recommend-section">
        <view class="section-header">
          <text class="section-title-text">根据症状智能匹配</text>
          <view class="recommend-badge">智能推荐</view>
        </view>
        <view
          v-for="doctor in symptomRecommendations"
          :key="doctor.id"
          class="doctor-card"
          @click="viewDoctorDetail(doctor)"
        >
          <view class="doctor-avatar">
            <image :src="doctor.avatar" mode="aspectFill" class="avatar-img"></image>
            <view class="recommend-label match-label">症状匹配</view>
          </view>
          <view class="doctor-info">
            <view class="doctor-name-row">
              <text class="doctor-name">{{ doctor.name }}</text>
              <text class="doctor-level">{{ doctor.level }}</text>
            </view>
            <text class="doctor-hospital">{{ doctor.hospital }}</text>
            <text class="doctor-dept">{{ doctor.dept }}</text>
            <view class="doctor-specialties">
              <text class="specialties-label">擅长：</text>
              <text class="specialties-text">{{ doctor.goodAt }}</text>
            </view>
            <view class="match-score">
              <text class="score-label">匹配度：</text>
              <view class="score-bar">
                <view class="score-fill" :style="{ width: doctor.matchScore + '%' }"></view>
              </view>
              <text class="score-text">{{ doctor.matchScore }}%</text>
            </view>
            <view class="recommend-reason">
              <text class="reason-icon">🎯</text>
              <text class="reason-text">{{ doctor.recommendReason }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相似病例推荐 -->
      <view v-if="similarCaseRecommendations.length > 0" class="recommend-section">
        <view class="section-header">
          <text class="section-title-text">相似病例患者选择</text>
          <view class="recommend-badge">热门选择</view>
        </view>
        <view
          v-for="doctor in similarCaseRecommendations"
          :key="doctor.id"
          class="doctor-card"
          @click="viewDoctorDetail(doctor)"
        >
          <view class="doctor-avatar">
            <image :src="doctor.avatar" mode="aspectFill" class="avatar-img"></image>
            <view class="recommend-label similar-label">相似病例</view>
          </view>
          <view class="doctor-info">
            <view class="doctor-name-row">
              <text class="doctor-name">{{ doctor.name }}</text>
              <text class="doctor-level">{{ doctor.level }}</text>
            </view>
            <text class="doctor-hospital">{{ doctor.hospital }}</text>
            <text class="doctor-dept">{{ doctor.dept }}</text>
            <view class="doctor-specialties">
              <text class="specialties-label">擅长：</text>
              <text class="specialties-text">{{ doctor.goodAt }}</text>
            </view>
            <view class="similar-info">
              <text class="similar-text">{{ doctor.similarCount }}位相似患者选择了这位医生</text>
            </view>
            <view class="recommend-reason">
              <text class="reason-icon">👥</text>
              <text class="reason-text">{{ doctor.recommendReason }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="allRecommendations.length === 0 && !isLoading" class="empty-state">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">暂无推荐</text>
        <text class="empty-hint">请描述您的症状或查看历史就诊记录</text>
      </view>

      <!-- 加载中 -->
      <view v-if="isLoading" class="loading-state">
        <text class="loading-text">正在为您智能匹配...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getAllAppointments } from '@/utils/appointmentStorage.js';
import { getAllConsultations } from '@/utils/consultationStorage.js';
import { getUserInfo } from '@/utils/auth.js';

export default {
  data() {
    return {
      symptomDescription: '',
      recommendTags: [],
      historyRecommendations: [],
      symptomRecommendations: [],
      similarCaseRecommendations: [],
      isLoading: false,
      allDoctors: [],
      // 热门科室标签
      hotDepartments: ['内科', '外科', '儿科', '妇科', '眼科', '口腔科', '皮肤科', '骨科', '神经内科', '心血管内科', '消化内科', '呼吸内科'],
      // 热门疾病标签
      hotDiseases: ['感冒', '头痛', '胃痛', '失眠', '高血压', '糖尿病', '咳嗽', '发烧', '腰痛', '关节痛', '皮肤过敏', '牙痛'],
      // 选中的标签
      selectedDeptTag: '',
      selectedDiseaseTag: ''
    };
  },
  computed: {
    allRecommendations() {
      return [
        ...this.historyRecommendations,
        ...this.symptomRecommendations,
        ...this.similarCaseRecommendations
      ];
    }
  },
  onLoad() {
    this.loadRecommendations();
    this.initRecommendTags();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    initRecommendTags() {
      // 初始化推荐标签
      this.recommendTags = [
        { text: '头痛', icon: '🤕', active: false, keyword: '头痛' },
        { text: '发热', icon: '🌡️', active: false, keyword: '发热' },
        { text: '咳嗽', icon: '😷', active: false, keyword: '咳嗽' },
        { text: '胃痛', icon: '🤢', active: false, keyword: '胃痛' },
        { text: '失眠', icon: '😴', active: false, keyword: '失眠' },
        { text: '皮肤', icon: '🧴', active: false, keyword: '皮肤' },
        { text: '关节', icon: '🦴', active: false, keyword: '关节' },
        { text: '心脏', icon: '❤️', active: false, keyword: '心脏' }
      ];
    },
    selectTag(tag) {
      // 切换标签选中状态
      tag.active = !tag.active;
      if (tag.active) {
        this.symptomDescription = tag.keyword;
        this.searchBySymptom();
      }
    },
    // 选择科室标签
    selectDeptTag(dept) {
      // 如果点击的是已选中的标签，则取消选择
      if (this.selectedDeptTag === dept) {
        this.selectedDeptTag = '';
        this.symptomDescription = '';
      } else {
        this.selectedDeptTag = dept;
        this.selectedDiseaseTag = ''; // 取消疾病标签选择
        this.symptomDescription = dept; // 设置症状描述
        // 自动搜索
        this.searchBySymptom();
      }
    },
    // 选择疾病标签
    selectDiseaseTag(disease) {
      // 如果点击的是已选中的标签，则取消选择
      if (this.selectedDiseaseTag === disease) {
        this.selectedDiseaseTag = '';
        this.symptomDescription = '';
      } else {
        this.selectedDiseaseTag = disease;
        this.selectedDeptTag = ''; // 取消科室标签选择
        this.symptomDescription = disease; // 设置症状描述
        // 自动搜索
        this.searchBySymptom();
      }
    },
    onSymptomInput() {
      // 症状输入时的处理
    },
    loadRecommendations() {
      // 加载所有推荐
      this.loadHistoryRecommendations();
      this.loadSimilarCaseRecommendations();
    },
    loadHistoryRecommendations() {
      // 基于历史就诊记录推荐
      try {
        const appointments = getAllAppointments();
        const consultations = getAllConsultations();
        
        // 分析历史记录，提取科室、疾病等信息
        const historyDepts = new Set();
        const historyDiseases = new Set();
        
        appointments.forEach(apt => {
          if (apt.dept) historyDepts.add(apt.dept);
          if (apt.specialty) historyDepts.add(apt.specialty);
        });
        
        consultations.forEach(consult => {
          if (consult.patientInfo?.department) {
            historyDepts.add(consult.patientInfo.department);
          }
        });
        
        // 如果有关注的科室，推荐相关医生
        if (historyDepts.size > 0) {
          this.historyRecommendations = this.getDoctorsByDept(Array.from(historyDepts));
        }
      } catch (e) {
        console.error('加载历史推荐失败:', e);
      }
    },
    searchBySymptom() {
      if (!this.symptomDescription.trim()) {
        uni.showToast({
          title: '请输入症状描述',
          icon: 'none'
        });
        return;
      }
      
      this.isLoading = true;
      
      // 模拟智能匹配延迟
      setTimeout(() => {
        this.symptomRecommendations = this.matchDoctorsBySymptom(this.symptomDescription);
        this.isLoading = false;
        
        if (this.symptomRecommendations.length === 0) {
          uni.showToast({
            title: '未找到匹配的医生',
            icon: 'none'
          });
        }
      }, 800);
    },
    matchDoctorsBySymptom(symptom) {
      // 根据症状匹配医生
      const symptomKeywords = this.extractKeywords(symptom);
      const matchedDoctors = [];
      
      this.getAllDoctors().forEach(doctor => {
        const matchScore = this.calculateMatchScore(doctor, symptomKeywords);
        if (matchScore > 0) {
          matchedDoctors.push({
            ...doctor,
            matchScore: matchScore,
            recommendReason: this.generateRecommendReason(doctor, symptomKeywords)
          });
        }
      });
      
      // 按匹配度排序
      matchedDoctors.sort((a, b) => b.matchScore - a.matchScore);
      
      return matchedDoctors.slice(0, 5); // 返回前5个
    },
    extractKeywords(symptom) {
      // 提取症状关键词
      const keywords = [];
      const symptomLower = symptom.toLowerCase();
      
      // 常见症状关键词映射
      const symptomMap = {
        '头痛': ['头痛', '头疼', '偏头痛'],
        '发热': ['发热', '发烧', '体温'],
        '咳嗽': ['咳嗽', '咳', '咳痰'],
        '胃痛': ['胃痛', '胃疼', '胃部', '胃炎'],
        '失眠': ['失眠', '睡不着', '睡眠'],
        '皮肤': ['皮肤', '皮疹', '湿疹', '过敏'],
        '关节': ['关节', '关节痛', '关节炎'],
        '心脏': ['心脏', '心悸', '胸闷', '心慌']
      };
      
      Object.keys(symptomMap).forEach(key => {
        if (symptomMap[key].some(k => symptomLower.includes(k))) {
          keywords.push(key);
        }
      });
      
      return keywords;
    },
    calculateMatchScore(doctor, keywords) {
      // 计算匹配度
      let score = 0;
      const goodAtLower = (doctor.goodAt || '').toLowerCase();
      const deptLower = (doctor.dept || '').toLowerCase();
      
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (goodAtLower.includes(keywordLower)) {
          score += 30;
        }
        if (deptLower.includes(keywordLower)) {
          score += 20;
        }
      });
      
      // 根据医生评分和预约量增加基础分
      if (doctor.rating) {
        score += doctor.rating * 10;
      }
      if (doctor.appointmentCount) {
        score += Math.min(doctor.appointmentCount / 100, 10);
      }
      
      return Math.min(score, 100);
    },
    generateRecommendReason(doctor, keywords) {
      // 生成推荐理由
      if (keywords.length > 0) {
        return `擅长治疗${keywords.join('、')}相关疾病`;
      }
      return `专业治疗相关症状，经验丰富`;
    },
    loadSimilarCaseRecommendations() {
      // 加载相似病例推荐（模拟数据）
      this.similarCaseRecommendations = [
        {
          id: 101,
          name: '张医生',
          level: '主任医师',
          hospital: '北京协和医院',
          dept: '神经内科',
          goodAt: '头痛、偏头痛、神经痛',
          avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
          similarCount: 128,
          recommendReason: '128位相似症状患者选择了这位医生'
        },
        {
          id: 102,
          name: '李医生',
          level: '副主任医师',
          hospital: '北京大学第一医院',
          dept: '消化内科',
          goodAt: '胃炎、胃痛、消化不良',
          avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
          similarCount: 95,
          recommendReason: '95位相似症状患者选择了这位医生'
        }
      ];
    },
    getDoctorsByDept(depts) {
      // 根据科室获取医生
      const doctors = this.getAllDoctors();
      const matched = [];
      
      depts.forEach(dept => {
        const deptDoctors = doctors.filter(d => 
          (d.dept && d.dept.includes(dept)) || 
          (d.department && d.department.includes(dept))
        );
        
        deptDoctors.forEach(doctor => {
          if (!matched.find(d => d.id === doctor.id)) {
            matched.push({
              ...doctor,
              recommendReason: `您曾就诊于${dept}，推荐相关专家`
            });
          }
        });
      });
      
      return matched.slice(0, 3);
    },
    getAllDoctors() {
      // 获取所有医生列表（这里可以从API获取，暂时使用模拟数据）
      if (this.allDoctors.length === 0) {
        this.allDoctors = [
          {
            id: 1,
            name: '王医生',
            level: '主任医师',
            hospital: '北京大学第一医院',
            dept: '心血管内科',
            department: '心血管内科',
            goodAt: '心血管疾病、心脏病、冠心病、心胸血...',
            avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            rating: 4.9,
            appointmentCount: 2312
          },
          {
            id: 2,
            name: '李医生',
            level: '副主任医师',
            hospital: '北京协和医院',
            dept: '神经内科',
            department: '神经内科',
            goodAt: '神经疾病、头痛、失眠、偏头痛',
            avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
            rating: 4.8,
            appointmentCount: 1856
          },
          {
            id: 3,
            name: '张医生',
            level: '主治医师',
            hospital: '北京天坛医院',
            dept: '骨科',
            department: '骨科',
            goodAt: '骨科疾病、骨折、关节疼痛、关节炎',
            avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
            rating: 4.7,
            appointmentCount: 1523
          },
          {
            id: 4,
            name: '刘医生',
            level: '主任医师',
            hospital: '北京朝阳医院',
            dept: '消化内科',
            department: '消化内科',
            goodAt: '消化系统疾病、胃炎、胃溃疡、胃痛',
            avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
            rating: 4.85,
            appointmentCount: 2098
          },
          {
            id: 5,
            name: '陈医生',
            level: '副主任医师',
            hospital: '北京友谊医院',
            dept: '皮肤科',
            department: '皮肤科',
            goodAt: '皮肤病、湿疹、过敏、皮疹',
            avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
            rating: 4.75,
            appointmentCount: 1245
          }
        ];
      }
      return this.allDoctors;
    },
    viewDoctorDetail(doctor) {
      // 跳转到医生详情页
      const doctorData = encodeURIComponent(JSON.stringify(doctor));
      uni.navigateTo({
        url: `/pages/doctor/detail?doctor=${doctorData}`,
        fail: (err) => {
          console.error('跳转到医生详情页失败:', err);
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

/* 症状输入区域 */
.symptom-section {
  margin-top: 100rpx;
  padding: 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 20rpx;
}

.symptom-input-box {
  position: relative;
  margin-bottom: 20rpx;
}

.symptom-input {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx;
  background-color: #f8f9fa;
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.char-count {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  font-size: 22rpx;
  color: #999999;
}

.search-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #4a90e2;
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.search-btn[disabled] {
  background-color: #c0c4cc;
}

.search-btn::after {
  border: none;
}

/* 热门标签区域 */
.hot-tags-section {
  padding: 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tags-group {
  margin-bottom: 30rpx;
}

.tags-group:last-child {
  margin-bottom: 0;
}

.tags-title {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.title-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}

.tags-scroll {
  white-space: nowrap;
  width: 100%;
}

.tags-list {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  background-color: #f5f6fa;
  border-radius: 40rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.tag-item:active {
  transform: scale(0.95);
}

.tag-item.active {
  background-color: #e8f4ff;
  border-color: #4a90e2;
}

.tag-text {
  font-size: 26rpx;
  color: #333333;
  white-space: nowrap;
}

.tag-item.active .tag-text {
  color: #4a90e2;
  font-weight: 600;
}

/* 推荐标签 */
.recommend-tags {
  padding: 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.recommend-tags .tags-title {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 16rpx;
  display: block;
}

.recommend-tags .tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.recommend-tags .tag-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: #f8f9fa;
  border: 1rpx solid #e0e0e0;
  border-radius: 40rpx;
  font-size: 26rpx;
  color: #666666;
}

.recommend-tags .tag-item.active {
  background-color: #e6f0ff;
  border-color: #4a90e2;
  color: #4a90e2;
}

.tag-icon {
  font-size: 28rpx;
}

/* 推荐内容 */
.recommend-content {
  flex: 1;
  padding: 24rpx;
}

.recommend-section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.recommend-badge {
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 20rpx;
  font-size: 22rpx;
}

/* 医生卡片 */
.doctor-card {
  display: flex;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.doctor-avatar {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.recommend-label {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  padding: 4rpx 12rpx;
  background-color: #ff6b6b;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 20rpx;
}

.match-label {
  background-color: #4ecdc4;
}

.similar-label {
  background-color: #ffa726;
}

.doctor-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.doctor-name-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
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
  font-size: 26rpx;
  color: #666666;
}

.doctor-dept {
  font-size: 24rpx;
  color: #999999;
}

.doctor-specialties {
  display: flex;
  gap: 8rpx;
  font-size: 24rpx;
}

.specialties-label {
  color: #999999;
}

.specialties-text {
  color: #666666;
  flex: 1;
}

.match-score {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}

.score-label {
  font-size: 24rpx;
  color: #666666;
}

.score-bar {
  flex: 1;
  height: 8rpx;
  background-color: #f0f0f0;
  border-radius: 4rpx;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4 0%, #44a08d 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.score-text {
  font-size: 24rpx;
  color: #4ecdc4;
  font-weight: 600;
}

.similar-info {
  margin-top: 8rpx;
}

.similar-text {
  font-size: 24rpx;
  color: #ffa726;
}

.recommend-reason {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 12rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
}

.reason-icon {
  font-size: 24rpx;
}

.reason-text {
  font-size: 24rpx;
  color: #666666;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #cccccc;
}

/* 加载中 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #999999;
}
</style>

