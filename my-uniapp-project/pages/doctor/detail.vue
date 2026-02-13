<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="nav-actions">
        <view class="nav-action-btn" @click="toggleFavorite">
          <text class="action-icon" :class="{ favorited: isFavorited }">{{ isFavorited ? '★' : '☆' }}</text>
        </view>
        <view class="nav-action-btn" @click="shareDoctor">
          <text class="action-icon">↗</text>
        </view>
      </view>
    </view>
    
    <!-- 医生信息头部 -->
    <view class="doctor-header">
      <view class="doctor-info-card">
        <image class="doctor-avatar-large" :src="doctorInfo.avatar" mode="aspectFill" />
        <view class="doctor-info-right">
          <view class="doctor-name-row">
            <text class="doctor-name-large">{{ doctorInfo.name }}</text>
            <text class="doctor-level-large">{{ doctorInfo.level }}</text>
          </view>
          <text class="doctor-hospital-large">{{ doctorInfo.hospital }}{{ doctorInfo.title || '' }}</text>
          <view class="doctor-stats">
            <view class="stat-item">
              <text class="stat-value">预约量 {{ doctorInfo.appointmentCount || 2312 }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">咨询量 {{ doctorInfo.consultationCount || 542 }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">关注量 {{ doctorInfo.followCount || '32k' }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 医生简介 -->
      <view class="doctor-intro">
        <text class="intro-quote">"</text>
        <text class="intro-text">{{ doctorInfo.introduction || doctorInfo.goodAt || '内分泌专家,甲状腺综合手术治疗专家,省级内分泌科委员会委员,独创中医疗法,内分泌科疑难杂症综合治疗' }}</text>
      </view>
    </view>

    <!-- 导航标签 -->
    <view class="nav-tabs">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ active: activeTabIndex === index }"
        @click="switchTab(index)"
      >
        <text class="tab-text">{{ tab }}</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content" scroll-y>
      <!-- 预约挂号内容 -->
      <view v-if="activeTabIndex === 0" class="appointment-content">
        <!-- 医院1 -->
        <view class="hospital-section">
          <view class="hospital-header">
            <text class="hospital-name">{{ doctorInfo.hospital }}</text>
            <text class="hospital-link" @click="goHospitalHome">医院首页 ></text>
          </view>
          <view class="dept-section">
            <text class="dept-name">{{ doctorInfo.dept }}门诊</text>
            <view class="time-slots">
              <view
                v-for="(slot, index) in appointmentSlots1"
                :key="index"
                class="time-slot"
                :class="{ disabled: slot.status === 'full' }"
                @click="bookAppointment(slot)"
              >
                <text class="slot-text">{{ slot.date }} {{ slot.time }} {{ slot.status === 'full' ? '约满' : '预约' }}</text>
              </view>
            </view>
          </view>
          
          <!-- 特需门诊 -->
          <view class="dept-section">
            <view class="dept-header-row">
              <text class="dept-name">特需{{ doctorInfo.dept }}门诊(西院)</text>
              <text class="internet-link" @click="showInternetDesc">互联网门诊说明></text>
            </view>
            <view class="time-slots">
              <view
                v-for="(slot, index) in appointmentSlots2"
                :key="index"
                class="time-slot"
                :class="{ disabled: slot.status === 'full' }"
                @click="bookAppointment(slot)"
              >
                <text class="slot-text">{{ slot.date }} {{ slot.time }} {{ slot.status === 'full' ? '约满' : '预约' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 医院2 - 多点坐诊 -->
        <view class="hospital-section">
          <view class="hospital-header">
            <view class="hospital-name-row">
              <text class="hospital-name">朝阳医院社区门诊中心</text>
              <text class="multi-tag">多点坐诊</text>
            </view>
            <text class="hospital-link" @click="goHospitalHome">医院首页 ></text>
          </view>
          <view class="dept-section">
            <text class="dept-name">普通内科门诊</text>
            <view class="time-slots">
              <view
                v-for="(slot, index) in appointmentSlots3"
                :key="index"
                class="time-slot"
                :class="{ disabled: slot.status === 'full' }"
                @click="bookAppointment(slot)"
              >
                <text class="slot-text">{{ slot.date }} {{ slot.time }} {{ slot.status === 'full' ? '约满' : '预约' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 医疗服务内容 -->
      <view v-if="activeTabIndex === 1" class="medical-services-content">
        <view class="service-item" @click="goExpertConsultation">
          <view class="service-icon expert-icon">
            <view class="icon-chat"></view>
          </view>
          <view class="service-info">
            <text class="service-title">专家问诊</text>
            <text class="service-desc">48小时内可追问咨询</text>
          </view>
          <view class="service-price">
            <text class="current-price">¥49/次</text>
            <text class="original-price">¥100/次</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="service-item disabled">
          <view class="service-icon rehab-icon">
            <view class="icon-phone"></view>
          </view>
          <view class="service-info">
            <text class="service-title">康复电话</text>
            <text class="service-desc">诊后康复,专家随访电话服务</text>
          </view>
          <text class="service-status">暂未开通</text>
          <text class="arrow-icon">›</text>
        </view>
      </view>

      <!-- 患者评价内容 -->
      <view v-if="activeTabIndex === 2" class="reviews-content">
        <view class="section-header">
          <text class="section-title">患者评价</text>
          <text class="view-more" @click="viewMoreReviews">查看更多></text>
        </view>
        <view
          v-for="(review, index) in reviews"
          :key="index"
          class="review-item"
        >
          <view class="review-stars">
            <text
              v-for="i in 5"
              :key="i"
              class="star"
              :class="{ active: i <= review.rating }"
            >★</text>
          </view>
          <text class="review-text">{{ review.comment }}</text>
          <view class="review-meta">
            <text class="reviewer">{{ review.reviewer }} {{ review.type }}</text>
            <text class="review-dept">{{ review.department }}</text>
            <text class="review-date">{{ review.date }}</text>
          </view>
        </view>
      </view>

      <!-- 问诊历史内容 -->
      <view v-if="activeTabIndex === 3" class="consultation-history-content">
        <view class="section-header">
          <text class="section-title">历史问诊</text>
          <text class="view-more" @click="viewMoreHistory">查看更多></text>
        </view>
        <view
          v-for="(consultation, index) in consultationHistory"
          :key="index"
          class="consultation-item"
          @click="viewConsultationDetail(consultation)"
        >
          <text class="consultation-question">{{ consultation.patientInfo }} {{ consultation.question }}</text>
          <text class="consultation-reply">{{ consultation.reply }}</text>
          <text class="consultation-date">{{ consultation.date }}</text>
        </view>
      </view>

      <!-- 医生文章内容 -->
      <view v-if="activeTabIndex === 4" class="articles-content">
        <view class="section-header">
          <text class="section-title">医生文章</text>
          <text class="view-more" @click="viewMoreArticles">查看更多></text>
        </view>
        <view
          v-for="(article, index) in articles"
          :key="index"
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
      </view>
    </scroll-view>

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
      doctorInfo: {},
      activeTabIndex: 0,
      tabs: ['预约挂号', '医疗服务', '患者评价', '问诊历史', '医生文章'],
      appointmentSlots1: [],
      appointmentSlots2: [],
      appointmentSlots3: [],
      isFavorited: false, // 是否已收藏
      reviews: [
        {
          rating: 5,
          comment: '医生很有耐心,不错不错,感谢',
          reviewer: '王先生',
          type: '门诊挂号',
          department: '神经内科',
          date: '2020-03-03'
        },
        {
          rating: 4,
          comment: '医生很有耐心,不错不错,感谢',
          reviewer: '王先生',
          type: '门诊挂号',
          department: '内分泌科',
          date: '2020-03-02'
        },
        {
          rating: 3,
          comment: '问诊速度有点快,希望能和医生沟通的更久',
          reviewer: '王先生',
          type: '互联网预约',
          department: '肿瘤科',
          date: '2020-03-02'
        },
        {
          rating: 5,
          comment: '在线看病很方便,药品药单直接邮寄到家很快',
          reviewer: '李女士',
          type: '互联网预约',
          department: '内分泌科',
          date: '2020-03-01'
        }
      ],
      consultationHistory: [
        {
          patientInfo: '男(31岁)',
          question: '甲状腺肿瘤:红肿疼痛如何缓解?',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullQuestion: '甲状腺肿瘤:红肿疼痛如何缓解?最近发现颈部有肿块，并且伴有红肿和疼痛感，不知道是什么原因，应该如何缓解症状？',
          fullReply: '您好,根据您的症状描述,甲状腺肿瘤引起的红肿疼痛需要及时就医。建议您：1. 避免按压和摩擦患处；2. 保持局部清洁干燥；3. 尽快到医院进行专业检查；4. 根据医生建议进行相应治疗。如果疼痛剧烈，可以暂时使用冷敷缓解，但不要自行用药。'
        },
        {
          patientInfo: '男(42岁)',
          question: '内分泌紊乱失眠应该如何调理',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullQuestion: '内分泌紊乱失眠应该如何调理？最近工作压力大，经常失眠，白天精神不好，怀疑是内分泌问题，想知道如何调理？',
          fullReply: '您好,内分泌紊乱导致的失眠需要综合调理。建议您：1. 规律作息，每天固定时间睡觉和起床；2. 睡前避免使用电子设备；3. 适当运动，但避免睡前剧烈运动；4. 饮食清淡，避免晚餐过饱；5. 可以尝试放松技巧如深呼吸、冥想；6. 如果症状严重，建议到医院进行内分泌检查，必要时在医生指导下用药。'
        },
        {
          patientInfo: '男(27岁)',
          question: '甲状腺肿瘤:红肿疼痛如何缓解?',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullQuestion: '甲状腺肿瘤:红肿疼痛如何缓解?最近发现颈部有肿块，并且伴有红肿和疼痛感，不知道是什么原因，应该如何缓解症状？',
          fullReply: '您好,甲状腺肿瘤需要专业诊断和治疗。建议您尽快到医院进行甲状腺B超和甲状腺功能检查，以明确诊断。在等待检查期间，注意休息，避免过度劳累，保持情绪稳定。'
        },
        {
          patientInfo: '男(42岁)',
          question: '内分泌紊乱失眠应该如何调理',
          reply: '[医生回复]您好,根据您的症状描述为您...',
          date: '2020-03-02',
          fullQuestion: '内分泌紊乱失眠应该如何调理？最近工作压力大，经常失眠，白天精神不好，怀疑是内分泌问题，想知道如何调理？',
          fullReply: '您好,内分泌紊乱导致的失眠需要综合调理。建议您：1. 规律作息，每天固定时间睡觉和起床；2. 睡前避免使用电子设备；3. 适当运动，但避免睡前剧烈运动；4. 饮食清淡，避免晚餐过饱；5. 可以尝试放松技巧如深呼吸、冥想；6. 如果症状严重，建议到医院进行内分泌检查，必要时在医生指导下用药。'
        }
      ],
      articles: [
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
        }
      ]
    };
  },
  onLoad(options) {
    // 接收传递的医生信息
    if (options.doctor) {
      try {
        this.doctorInfo = JSON.parse(decodeURIComponent(options.doctor));
      } catch (e) {
        console.error('解析医生信息失败', e);
        // 如果解析失败，尝试根据ID查找
        if (options.id) {
          this.loadDoctorById(options.id);
        } else {
          this.initDefaultDoctor();
        }
      }
    } else if (options.id) {
      // 如果只传递了ID，根据ID查找医生
      this.loadDoctorById(options.id);
    } else {
      this.initDefaultDoctor();
    }
    
    // 生成基于当前日期的预约时间段
    this.generateAppointmentSlots();
  },
  methods: {
    // 检查当前医生是否已收藏
    checkFavoriteStatus() {
      const favDoctors = uni.getStorageSync('fav_doctors') || [];
      const id = this.doctorInfo.id || this.doctorInfo._id;
      this.isFavorited = favDoctors.some(d => (d.id || d._id) == id);
    },
    // 根据ID加载医生信息
    async loadDoctorById(doctorId) {
      // 先尝试从后端API获取
      try {
        const { get } = require('@/utils/api.js');
        const res = await get(`/doctor/${doctorId}`);
        if (res && res.success && res.data) {
          const d = res.data;
          this.doctorInfo = {
            id: d._id || d.id || doctorId,
            name: d.name || '医生',
            level: d.title || '医师',
            hospital: d.hospital || '',
            dept: d.department || '',
            goodAt: d.specialties || d.goodAt || '',
            avatar: d.avatar || `https://randomuser.me/api/portraits/men/${(doctorId % 20) + 1}.jpg`,
            appointmentCount: d.appointmentCount || 0,
            consultationCount: d.consultationCount || 0,
            followCount: d.followCount || 0,
            introduction: d.introduction || d.goodAt || ''
          };
          this.checkFavoriteStatus();
          return;
        }
      } catch (e) {
        console.warn('后端加载医生失败，使用本地数据:', e);
      }
      // 回退到本地模拟数据
      const allDoctors = [
        { id: 1, name: '张医生', level: '主任医师', hospital: '北京大学第一医院', dept: '心血管内科', goodAt: '心血管疾病、心脏病、冠心病', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', appointmentCount: 2312, consultationCount: 542, followCount: '32k' },
        { id: 2, name: '李医生', level: '副主任医师', hospital: '北京协和医院', dept: '神经内科', goodAt: '神经疾病、头痛、失眠', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', appointmentCount: 1856, consultationCount: 432, followCount: '28k' },
        { id: 3, name: '王医生', level: '主治医师', hospital: '北京天坛医院', dept: '骨科', goodAt: '骨科疾病、骨折、关节疼痛', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', appointmentCount: 1523, consultationCount: 389, followCount: '25k' },
        { id: 4, name: '刘医生', level: '主任医师', hospital: '北京朝阳医院', dept: '消化内科', goodAt: '消化系统疾病、胃炎、胃溃疡', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', appointmentCount: 2098, consultationCount: 512, followCount: '30k' },
        { id: 5, name: '陈医生', level: '副主任医师', hospital: '北京友谊医院', dept: '皮肤科', goodAt: '皮肤病、湿疹、过敏', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', appointmentCount: 1245, consultationCount: 321, followCount: '22k' },
        { id: 6, name: '赵医生', level: '主任医师', hospital: '北京同仁医院', dept: '眼科', goodAt: '眼科疾病、白内障、青光眼', avatar: 'https://randomuser.me/api/portraits/men/6.jpg', appointmentCount: 2689, consultationCount: 623, followCount: '35k' },
        { id: 7, name: '孙医生', level: '主治医师', hospital: '北京儿童医院', dept: '儿科', goodAt: '儿科疾病、小儿感冒、发育迟缓', avatar: 'https://randomuser.me/api/portraits/men/7.jpg', appointmentCount: 3124, consultationCount: 756, followCount: '40k' },
        { id: 8, name: '周医生', level: '副主任医师', hospital: '北京妇产医院', dept: '妇产科', goodAt: '妇科疾病、产科、不孕不育', avatar: 'https://randomuser.me/api/portraits/men/8.jpg', appointmentCount: 1987, consultationCount: 498, followCount: '29k' },
        { id: 9, name: '吴医生', level: '主任医师', hospital: '北京肿瘤医院', dept: '肿瘤内科', goodAt: '肿瘤诊断、化疗、靶向治疗', avatar: 'https://randomuser.me/api/portraits/men/9.jpg', appointmentCount: 1456, consultationCount: 389, followCount: '20k' },
        { id: 10, name: '郑医生', level: '主治医师', hospital: '北京口腔医院', dept: '口腔科', goodAt: '口腔疾病、牙齿矫正、种植牙', avatar: 'https://randomuser.me/api/portraits/men/10.jpg', appointmentCount: 1678, consultationCount: 412, followCount: '24k' },
        { id: 11, name: '钱医生', level: '副主任医师', hospital: '北京宣武医院', dept: '神经外科', goodAt: '神经外科手术、脑肿瘤、脑血管病', avatar: 'https://randomuser.me/api/portraits/men/11.jpg', appointmentCount: 1123, consultationCount: 298, followCount: '18k' },
        { id: 12, name: '马医生', level: '主任医师', hospital: '北京安贞医院', dept: '心外科', goodAt: '心脏外科手术、先天性心脏病', avatar: 'https://randomuser.me/api/portraits/men/12.jpg', appointmentCount: 987, consultationCount: 245, followCount: '16k' },
        { id: 13, name: '朱医生', level: '主治医师', hospital: '北京积水潭医院', dept: '烧伤科', goodAt: '烧伤治疗、创面修复、疤痕治疗', avatar: 'https://randomuser.me/api/portraits/men/13.jpg', appointmentCount: 756, consultationCount: 187, followCount: '14k' },
        { id: 14, name: '胡医生', level: '副主任医师', hospital: '北京中日友好医院', dept: '呼吸内科', goodAt: '呼吸系统疾病、哮喘、慢阻肺', avatar: 'https://randomuser.me/api/portraits/men/14.jpg', appointmentCount: 2145, consultationCount: 534, followCount: '31k' },
        { id: 15, name: '林医生', level: '主任医师', hospital: '北京301医院', dept: '内分泌科', goodAt: '糖尿病、甲状腺疾病、肥胖症', avatar: 'https://randomuser.me/api/portraits/men/15.jpg', appointmentCount: 1789, consultationCount: 467, followCount: '27k' },
        { id: 16, name: '黄医生', level: '主治医师', hospital: '北京302医院', dept: '感染科', goodAt: '感染性疾病、肝病、传染病', avatar: 'https://randomuser.me/api/portraits/men/16.jpg', appointmentCount: 1345, consultationCount: 356, followCount: '21k' },
        { id: 17, name: '杨医生', level: '副主任医师', hospital: '北京306医院', dept: '泌尿外科', goodAt: '泌尿系统疾病、肾结石、前列腺', avatar: 'https://randomuser.me/api/portraits/men/17.jpg', appointmentCount: 1567, consultationCount: 423, followCount: '23k' },
        { id: 18, name: '罗医生', level: '主任医师', hospital: '北京309医院', dept: '胸外科', goodAt: '胸部疾病、肺癌、食管癌', avatar: 'https://randomuser.me/api/portraits/men/18.jpg', appointmentCount: 1098, consultationCount: 287, followCount: '17k' },
        { id: 19, name: '高医生', level: '主治医师', hospital: '北京307医院', dept: '血液科', goodAt: '血液疾病、白血病、贫血', avatar: 'https://randomuser.me/api/portraits/men/19.jpg', appointmentCount: 892, consultationCount: 234, followCount: '15k' },
        { id: 20, name: '梁医生', level: '副主任医师', hospital: '北京308医院', dept: '康复科', goodAt: '康复治疗、运动损伤、康复训练', avatar: 'https://randomuser.me/api/portraits/men/20.jpg', appointmentCount: 1234, consultationCount: 312, followCount: '19k' }
      ];
      
      const doctor = allDoctors.find(d => d.id == doctorId);
      if (doctor) {
        this.doctorInfo = doctor;
      } else {
        this.initDefaultDoctor();
      }
      this.checkFavoriteStatus();
    },
    initDefaultDoctor() {
      this.doctorInfo = {
        name: '王医生',
        level: '主任医师',
        hospital: '北京协和医院',
        title: '博士生导师',
        dept: '内分泌科',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
        goodAt: '内分泌专家,甲状腺综合手术治疗专家,省级内分泌科委员会委员,独创中医疗法,内分泌科疑难杂症综合治疗',
        appointmentCount: 2312,
        consultationCount: 542,
        followCount: '32k'
      };
    },
    // 生成基于当前日期的预约时间段
    generateAppointmentSlots() {
      const today = new Date();
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const timePeriods = ['上午', '下午', '晚上'];
      
      // 生成第一个时间段组（今天和未来2-3天）
      this.appointmentSlots1 = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const weekDay = weekDays[date.getDay()];
        const timePeriod = i === 0 ? '上午' : (i % 2 === 0 ? '上午' : '下午');
        
        // 第一个和第二个时间段设为约满，其他的设为可用
        this.appointmentSlots1.push({
          date: `${month}/${day}`,
          time: `${weekDay}${timePeriod}`,
          status: i < 2 ? 'full' : 'available'
        });
      }
      
      // 生成第二个时间段组（未来3-4天）
      this.appointmentSlots2 = [];
      for (let i = 3; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const weekDay = weekDays[date.getDay()];
        const timePeriod = i === 3 ? '上午' : '下午';
        
        this.appointmentSlots2.push({
          date: `${month}/${day}`,
          time: `${weekDay}${timePeriod}`,
          status: 'available'
        });
      }
      
      // 生成第三个时间段组（未来2-3天）
      this.appointmentSlots3 = [];
      for (let i = 2; i < 4; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const weekDay = weekDays[date.getDay()];
        const timePeriod = i === 2 ? '上午' : (date.getDay() === 0 ? '上午' : '下午');
        
        this.appointmentSlots3.push({
          date: `${month}/${day}`,
          time: `${weekDay}${timePeriod}`,
          status: i === 2 ? 'full' : 'available'
        });
      }
    },
    switchTab(index) {
      this.activeTabIndex = index;
    },
    bookAppointment(slot) {
      if (slot.status === 'full') {
        uni.showToast({
          title: '该时间段已约满',
          icon: 'none'
        });
        return;
      }
      // 跳转到预约页面
      const doctorQuery = encodeURIComponent(JSON.stringify(this.doctorInfo));
      const hospital = encodeURIComponent(this.doctorInfo.hospital || '北京协和医院');
      const dept = encodeURIComponent(this.doctorInfo.dept || '内分泌科');
      // 转换日期格式：05/08 -> 2020年05月08日（简化处理，使用当前年份）
      const currentYear = new Date().getFullYear();
      const dateParts = slot.date.split('/');
      const formattedDate = `${currentYear}年${dateParts[0]}月${dateParts[1]}日`;
      const date = encodeURIComponent(formattedDate);
      const time = encodeURIComponent(slot.time);
      const type = encodeURIComponent('专家门诊');
      const fee = encodeURIComponent(318);
      
      uni.navigateTo({
        url: `/pages/doctor/appointment?doctor=${doctorQuery}&hospital=${hospital}&dept=${dept}&date=${date}&time=${time}&type=${type}&fee=${fee}`
      });
    },
    goHospitalHome() {
      // 跳转到医院详情页
      const hospitalName = this.doctorInfo.hospital || '北京大学第一医院';
      const address = this.getHospitalAddress(hospitalName);
      const location = this.getHospitalLocation(hospitalName);
      
      uni.navigateTo({
        url: `/pages/hospital-detail/index?name=${encodeURIComponent(hospitalName)}&address=${encodeURIComponent(address)}&level=三甲&longitude=${location[0]}&latitude=${location[1]}`,
        fail: (err) => {
          console.error('跳转到医院详情页失败:', err);
          uni.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    },
    showInternetDesc() {
      // 显示互联网门诊说明弹窗
      uni.showModal({
        title: '互联网门诊说明',
        content: '互联网门诊是一种新型的医疗服务模式，患者可以通过手机或电脑在线咨询医生，无需到医院现场。\n\n服务特点：\n1. 在线问诊：通过视频、语音或文字与医生沟通\n2. 电子处方：医生可在线开具电子处方\n3. 药品配送：支持药品配送到家\n4. 复诊续方：慢性病患者可在线复诊续方\n5. 报告查询：在线查看检查报告和病历\n\n适用人群：\n• 常见病、慢性病复诊患者\n• 需要健康咨询的用户\n• 行动不便的患者\n• 时间紧张无法到院的患者\n\n注意事项：\n• 急重症患者请及时到医院就诊\n• 首次就诊建议到医院面诊\n• 互联网门诊不能完全替代线下诊疗',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#2979ff'
      });
    },
    // 获取医院位置（根据医院名称返回坐标）
    getHospitalLocation(hospitalName) {
      const hospitalLocations = {
        '北京大学第一医院': [116.3732, 39.9885],
        '北京协和医院': [116.4179, 39.9042],
        '北京天坛医院': [116.4074, 39.8806],
        '北京朝阳医院': [116.4681, 39.9289],
        '北京友谊医院': [116.3607, 39.8765],
        '北京同仁医院': [116.4345, 39.9042],
        '北京儿童医院': [116.3509, 39.9042],
        '北京妇产医院': [116.4345, 39.9042],
        '北京肿瘤医院': [116.3509, 39.9042],
        '北京口腔医院': [116.3732, 39.9042],
        '北京301医院': [116.2732, 39.9042],
        '北京安贞医院': [116.4074, 39.9885],
        '北京中日友好医院': [116.4179, 39.9885],
        '北京302医院': [116.2732, 39.9042],
        '北京306医院': [116.3509, 39.9885],
        '北京309医院': [116.2732, 39.9885],
        '北京307医院': [116.2732, 39.9042],
        '北京308医院': [116.2732, 39.9042],
        '北京积水潭医院': [116.3732, 39.9042],
        '北京宣武医院': [116.3607, 39.9042],
        '朝阳医院社区门诊中心': [116.4681, 39.9289]
      };
      return hospitalLocations[hospitalName] || [116.397428, 39.90923];
    },
    // 获取医院地址（根据医院名称返回地址）
    getHospitalAddress(hospitalName) {
      const hospitalAddresses = {
        '北京大学第一医院': '北京市东城区东单北大街53号',
        '北京协和医院': '北京市东城区王府井大街1号',
        '北京天坛医院': '北京市东城区天坛西里6号',
        '北京朝阳医院': '北京市朝阳区工人体育场南路8号',
        '北京友谊医院': '北京市西城区永安路95号',
        '北京同仁医院': '北京市东城区东交民巷1号',
        '北京儿童医院': '北京市西城区南礼士路56号',
        '北京妇产医院': '北京市朝阳区姚家园路251号',
        '北京肿瘤医院': '北京市海淀区阜成路52号',
        '北京口腔医院': '北京市东城区天坛西里4号',
        '北京301医院': '北京市海淀区复兴路28号',
        '北京安贞医院': '北京市朝阳区安贞路2号',
        '北京中日友好医院': '北京市朝阳区樱花园东街2号',
        '北京302医院': '北京市丰台区西四环中路100号',
        '北京306医院': '北京市朝阳区安翔北里9号',
        '北京309医院': '北京市海淀区黑山扈路17号',
        '北京307医院': '北京市丰台区东大街8号',
        '北京308医院': '北京市海淀区太平路27号',
        '北京积水潭医院': '北京市西城区新街口东街31号',
        '北京宣武医院': '北京市西城区长椿街45号',
        '朝阳医院社区门诊中心': '北京市朝阳区工人体育场南路8号'
      };
      return hospitalAddresses[hospitalName] || '北京市';
    },
    onFloatClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    },
    goBack() {
      uni.navigateBack();
    },
    toggleFavorite() {
      const favDoctors = uni.getStorageSync('fav_doctors') || [];
      const id = this.doctorInfo.id || this.doctorInfo._id;
      if (this.isFavorited) {
        // 取消收藏
        const idx = favDoctors.findIndex(d => (d.id || d._id) == id);
        if (idx > -1) favDoctors.splice(idx, 1);
        this.isFavorited = false;
      } else {
        // 添加收藏
        favDoctors.unshift({
          id: id,
          name: this.doctorInfo.name,
          avatar: this.doctorInfo.avatar,
          department: this.doctorInfo.dept,
          hospital: this.doctorInfo.hospital,
          desc: this.doctorInfo.level
        });
        this.isFavorited = true;
      }
      uni.setStorageSync('fav_doctors', favDoctors);
      uni.showToast({ title: this.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
    },
    shareDoctor() {
      uni.showToast({
        title: '分享功能开发中',
        icon: 'none'
      });
    },
    goExpertConsultation() {
      uni.navigateTo({
        url: `/pages/online-consult/index?doctorId=${this.doctorInfo.id || ''}`
      });
    },
    viewMoreReviews() {
      // 跳转到患者评价列表页面
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      const reviewsData = encodeURIComponent(JSON.stringify(this.reviews));
      uni.navigateTo({
        url: `/pages/doctor/reviews?doctor=${doctorData}&reviews=${reviewsData}`,
        fail: (err) => {
          console.error('跳转到评价页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    },
    viewMoreHistory() {
      // 跳转到历史问诊列表页面
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      const consultationsData = encodeURIComponent(JSON.stringify(this.consultationHistory));
      uni.navigateTo({
        url: `/pages/doctor/consultation-history?doctor=${doctorData}&consultations=${consultationsData}`,
        fail: (err) => {
          console.error('跳转到历史问诊页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    },
    viewMoreArticles() {
      // 跳转到医生文章列表页面
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      const articlesData = encodeURIComponent(JSON.stringify(this.articles));
      uni.navigateTo({
        url: `/pages/doctor/articles?doctor=${doctorData}&articles=${articlesData}`,
        fail: (err) => {
          console.error('跳转到文章列表页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    },
    viewConsultationDetail(consultation) {
      // 跳转到问诊详情页面
      const consultationData = encodeURIComponent(JSON.stringify(consultation));
      const doctorData = encodeURIComponent(JSON.stringify(this.doctorInfo));
      uni.navigateTo({
        url: `/pages/doctor/consultation-detail?consultation=${consultationData}&doctor=${doctorData}`,
        fail: (err) => {
          console.error('跳转到问诊详情页面失败:', err);
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
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

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6fa;
}

/* 顶部导航栏 */
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
  background: transparent;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .back-icon {
    font-size: 48rpx;
    color: #ffffff;
    line-height: 1;
  }
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.nav-action-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .action-icon {
    font-size: 40rpx;
    color: #ffffff;
    line-height: 1;
    
    &.favorited {
      color: #ffd700;
    }
  }
}

.doctor-header {
  background: linear-gradient(180deg, #4a90e2 0%, #2979ff 100%);
  padding: 80rpx 24rpx 40rpx;
}

.doctor-info-card {
  flex-direction: row;
  display: flex;
  margin-bottom: 24rpx;
}

.doctor-avatar-large {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
  background-color: #ffffff;
}

.doctor-info-right {
  flex: 1;
}

.doctor-name-row {
  flex-direction: row;
  display: flex;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.doctor-name-large {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  margin-right: 16rpx;
}

.doctor-level-large {
  font-size: 26rpx;
  color: #ffffff;
  opacity: 0.9;
}

.doctor-hospital-large {
  font-size: 26rpx;
  color: #ffffff;
  opacity: 0.9;
  margin-bottom: 20rpx;
  display: block;
}

.doctor-stats {
  flex-direction: row;
  display: flex;
  gap: 24rpx;
}

.stat-item {
  flex-direction: row;
  display: flex;
}

.stat-value {
  font-size: 24rpx;
  color: #ffffff;
  opacity: 0.9;
}

.doctor-intro {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 24rpx;
  position: relative;
}

.intro-quote {
  font-size: 60rpx;
  color: #ffffff;
  opacity: 0.3;
  position: absolute;
  left: 20rpx;
  top: 10rpx;
}

.intro-text {
  font-size: 26rpx;
  color: #ffffff;
  line-height: 1.6;
  padding-left: 40rpx;
}

.nav-tabs {
  flex-direction: row;
  display: flex;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  padding: 24rpx 0;
  align-items: center;
  justify-content: center;
  display: flex;
  position: relative;
}

.tab-item.active {
  border-bottom: 4rpx solid #2979ff;
}

.tab-item.active .tab-text {
  color: #2979ff;
  font-weight: 600;
}

.tab-text {
  font-size: 28rpx;
  color: #666666;
}

.content {
  flex: 1;
  padding: 20rpx 24rpx;
}

.appointment-content {
  padding-bottom: 40rpx;
}

.hospital-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.hospital-header {
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.hospital-name-row {
  flex-direction: row;
  display: flex;
  align-items: center;
}

.hospital-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  margin-right: 12rpx;
}

.multi-tag {
  font-size: 20rpx;
  color: #2979ff;
  background-color: #e6f0ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.hospital-link {
  font-size: 24rpx;
  color: #2979ff;
}

.dept-section {
  margin-bottom: 32rpx;
}

.dept-section:last-child {
  margin-bottom: 0;
}

.dept-header-row {
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.dept-name {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;
}

.internet-link {
  font-size: 24rpx;
  color: #ff9800;
}

.time-slots {
  flex-direction: row;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.time-slot {
  padding: 12rpx 20rpx;
  border-radius: 8rpx;
  background-color: #2979ff;
  min-width: 180rpx;
  align-items: center;
  justify-content: center;
  display: flex;
  flex: 0 0 auto;
}

.time-slot.disabled {
  background-color: #e0e0e0;
}

.slot-text {
  font-size: 26rpx;
  color: #ffffff;
  white-space: nowrap;
}

.time-slot.disabled .slot-text {
  color: #999999;
}

/* 医疗服务内容 */
.medical-services-content {
  padding-bottom: 40rpx;
}

.service-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  
  &.disabled {
    opacity: 0.6;
  }
}

.service-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  
  &.expert-icon {
    background-color: #e8f5e9;
  }
  
  &.rehab-icon {
    background-color: #f5f5f5;
  }
  
  .icon-chat {
    width: 40rpx;
    height: 30rpx;
    border: 3rpx solid #4caf50;
    border-radius: 8rpx;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8rpx;
      left: 8rpx;
      width: 0;
      height: 0;
      border-left: 6rpx solid transparent;
      border-right: 6rpx solid transparent;
      border-top: 8rpx solid #4caf50;
    }
  }
  
  .icon-phone {
    width: 32rpx;
    height: 32rpx;
    border: 3rpx solid #999999;
    border-radius: 6rpx;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 6rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 2rpx;
      height: 8rpx;
      background-color: #999999;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: 4rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 12rpx;
      height: 2rpx;
      background-color: #999999;
      border-radius: 2rpx;
    }
  }
}

.service-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .service-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 8rpx;
  }
  
  .service-desc {
    font-size: 24rpx;
    color: #999999;
  }
}

.service-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 16rpx;
  
  .current-price {
    font-size: 30rpx;
    font-weight: 600;
    color: #ff9800;
    margin-bottom: 4rpx;
  }
  
  .original-price {
    font-size: 22rpx;
    color: #999999;
    text-decoration: line-through;
  }
}

.service-status {
  font-size: 24rpx;
  color: #999999;
  margin-right: 16rpx;
}

.arrow-icon {
  font-size: 32rpx;
  color: #cccccc;
}

/* 患者评价内容 */
.reviews-content {
  padding-bottom: 40rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }
  
  .view-more {
    font-size: 26rpx;
    color: #999999;
  }
}

.review-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.review-stars {
  display: flex;
  margin-bottom: 12rpx;
  
  .star {
    font-size: 28rpx;
    color: #e0e0e0;
    margin-right: 4rpx;
    
    &.active {
      color: #ffd700;
    }
  }
}

.review-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.6;
  margin-bottom: 12rpx;
  display: block;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  .reviewer,
  .review-dept,
  .review-date {
    font-size: 24rpx;
    color: #999999;
  }
}

/* 问诊历史内容 */
.consultation-history-content {
  padding-bottom: 40rpx;
}

.consultation-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.consultation-question {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;
}

.consultation-reply {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 12rpx;
  display: block;
}

.consultation-date {
  font-size: 24rpx;
  color: #999999;
  display: block;
}

/* 医生文章内容 */
.articles-content {
  padding-bottom: 40rpx;
}

.article-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}

.article-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-right: 20rpx;
  
  .article-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 8rpx;
    display: block;
  }
  
  .article-subtitle {
    font-size: 26rpx;
    color: #666666;
    margin-bottom: 12rpx;
    display: block;
  }
  
  .article-meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
    
    .article-reads,
    .article-date {
      font-size: 24rpx;
      color: #999999;
    }
  }
}

.article-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
  
  .article-img {
    width: 100%;
    height: 100%;
  }
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
</style>

