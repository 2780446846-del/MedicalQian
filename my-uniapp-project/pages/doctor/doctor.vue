<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="city" @click="chooseCity">
        <text class="city-name">{{ city }}</text>
        <text class="city-arrow">▼</text>
      </view>
      <view class="search-box">
        <text class="icon-search">🔍</text>
        <input
          class="search-input"
          type="text"
          v-model="keyword"
          placeholder="搜索医院、科室、疾病、医生"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @confirm="onSearch"
          @input="onSearchInput"
        />
        <view class="voice-icon" @click="toggleVoiceSearch" :class="{ recording: isRecording }">
          <text class="voice-icon-text">{{ isRecording ? '🔴' : '🎤' }}</text>
        </view>
      </view>
      
      <!-- 语音搜索提示 -->
      <view v-if="isRecording" class="voice-recording-tip">
        <text class="tip-text">正在录音，点击停止</text>
        <text class="tip-time">{{ recordingTime }}秒</text>
      </view>
      <view class="chat-icon" @click="goMessages">
        <text>💬</text>
        <view v-if="unreadMessageCount > 0" class="message-badge">{{ unreadMessageCount > 99 ? '99+' : unreadMessageCount }}</view>
      </view>
    </view>

    <!-- 智能推荐入口 -->
    <view class="smart-recommend-banner" @click="goSmartRecommend">
      <view class="banner-content">
        <view class="banner-icon">🤖</view>
        <view class="banner-text">
          <text class="banner-title">智能推荐</text>
          <text class="banner-desc">根据症状和历史记录为您推荐最合适的医生</text>
        </view>
        <view class="banner-arrow">›</view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view
        class="filter-item sort-filter"
        :class="{ active: activeFilterIndex === 0 }"
        @click="toggleSortMenu"
      >
        <text class="filter-text">{{ sortTypeText }}</text>
        <text class="filter-arrow">▾</text>
      </view>
      
      <!-- 排序菜单 -->
      <view v-if="showSortMenu" class="sort-menu" @click.stop>
        <view
          v-for="(item, index) in sortOptions"
          :key="index"
          class="sort-menu-item"
          :class="{ active: sortType === item.value }"
          @click="selectSortType(item.value)"
        >
          <text class="sort-menu-text">{{ item.label }}</text>
          <text v-if="sortType === item.value" class="sort-menu-check">✓</text>
        </view>
      </view>
      
      <!-- 遮罩层 -->
      <view v-if="showSortMenu" class="sort-mask" @click="closeSortMenu"></view>
      <view
        class="filter-item"
        :class="{ active: activeFilterIndex === 1 }"
        @click="onFilterChange(1)"
      >
        <text class="filter-text">科室</text>
        <text class="filter-arrow">▾</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: activeFilterIndex === 2 }"
        @click="onFilterChange(2)"
      >
        <text class="filter-text">疾病</text>
        <text class="filter-arrow">▾</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: activeFilterIndex === 3 }"
        @click="onFilterChange(3)"
      >
        <text class="filter-text">筛选</text>
        <text class="filter-arrow">▾</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: showMapView }"
        @click="toggleMapView"
      >
        <text class="filter-text">{{ showMapView ? '列表' : '地图' }}</text>
      </view>
    </view>

    <!-- 地图视图 -->
    <view v-if="showMapView" class="map-view-container">
      <view class="map-header">
        <view class="map-stats">
          <view class="stat-item">
            <view class="stat-label">医院总数</view>
            <view class="stat-value">{{ hospitalCount }}</view>
          </view>
          <view class="stat-item">
            <view class="stat-label">医生总数</view>
            <view class="stat-value">{{ filteredDoctorList.length }}</view>
          </view>
          <view class="stat-item">
            <view class="stat-label">覆盖城市</view>
            <view class="stat-value">1</view>
          </view>
        </view>
      </view>
      <view class="map-container">
        <view id="doctor-map" class="doctor-map"></view>
      </view>
    </view>

    <!-- 医生列表 - 瀑布流布局 -->
    <scroll-view v-else class="doctor-list" scroll-y>
      <view class="waterfall-container">
        <view 
          v-for="(column, colIndex) in waterfallColumns" 
          :key="colIndex" 
          class="waterfall-column"
        >
          <view
            v-for="(doctor, index) in column"
            :key="doctor.id || index"
            class="doctor-card"
            @click="goDoctorDetail(doctor)"
          >
            <view class="doctor-left">
              <image
                class="doctor-avatar"
                :src="doctor.avatar"
                mode="aspectFill"
              />
            </view>

            <view class="doctor-right">
              <view class="doctor-header-row">
                <view class="doctor-title-box">
                  <text class="doctor-name">{{ doctor.name }}</text>
                  <text class="doctor-level">{{ doctor.level }}</text>
                </view>
                <button
                  class="btn-reserve"
                  size="mini"
                  @click.stop="onReserve(doctor)"
                >
                  预约
                </button>
              </view>

              <view class="doctor-hospital-row">
                <text class="hospital">{{ doctor.hospital }}</text>
                <text class="dept">{{ doctor.dept }}</text>
              </view>

              <view class="doctor-goodat-row">
                <text class="goodat-label">擅长：</text>
                <text class="goodat-text">{{ doctor.goodAt }}</text>
              </view>

              <view class="doctor-tags-row">
                <view class="tag tag-reserve" @click.stop="onReserve(doctor)">
                  <text class="tag-dot">●</text>
                  <text>预约挂号(多点)</text>
                </view>
                <view class="tag tag-online" @click.stop="onConsult(doctor)">
                  <text class="tag-dot">●</text>
                  <text>在线咨询</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空结果提示 -->
      <view v-if="filteredDoctorList.length === 0 && keyword" class="empty-result">
        <text class="empty-text">未找到相关医生</text>
        <text class="empty-hint">请尝试其他关键词</text>
      </view>
    </scroll-view>

    <!-- 筛选弹窗 -->
    <uni-popup ref="filterPopup" type="right" :mask-click="true" @close="onFilterPopupClose">
      <view class="filter-popup">
        <scroll-view class="popup-content" scroll-y>
          <!-- 服务类型 -->
          <view class="filter-section">
            <text class="section-title">服务类型</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.serviceType === '门诊预约' }" 
                @click="selectFilterOption('serviceType', '门诊预约')"
              >
                门诊预约
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.serviceType === '互联网医院' }" 
                @click="selectFilterOption('serviceType', '互联网医院')"
              >
                互联网医院
              </view>
            </view>
          </view>
          
          <!-- 医院等级 -->
          <view class="filter-section">
            <text class="section-title">医院等级</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '三甲医院' }" 
                @click="selectFilterOption('hospitalLevel', '三甲医院')"
              >
                三甲医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '三级医院' }" 
                @click="selectFilterOption('hospitalLevel', '三级医院')"
              >
                三级医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '二级医院' }" 
                @click="selectFilterOption('hospitalLevel', '二级医院')"
              >
                二级医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalLevel === '一级医院' }" 
                @click="selectFilterOption('hospitalLevel', '一级医院')"
              >
                一级医院
              </view>
            </view>
          </view>
          
          <!-- 距离 -->
          <view class="filter-section">
            <text class="section-title">距离</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '5km内' }" 
                @click="selectFilterOption('distance', '5km内')"
              >
                5km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '10km内' }" 
                @click="selectFilterOption('distance', '10km内')"
              >
                10km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '20km内' }" 
                @click="selectFilterOption('distance', '20km内')"
              >
                20km内
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.distance === '50km内' }" 
                @click="selectFilterOption('distance', '50km内')"
              >
                50km内
              </view>
            </view>
          </view>
          
          <!-- 医院类型 -->
          <view class="filter-section">
            <text class="section-title">医院类型</text>
            <view class="filter-options-grid">
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '综合医院' }" 
                @click="selectFilterOption('hospitalType', '综合医院')"
              >
                综合医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '儿童医院' }" 
                @click="selectFilterOption('hospitalType', '儿童医院')"
              >
                儿童医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '骨科医院' }" 
                @click="selectFilterOption('hospitalType', '骨科医院')"
              >
                骨科医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '妇产医院' }" 
                @click="selectFilterOption('hospitalType', '妇产医院')"
              >
                妇产医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '口腔医院' }" 
                @click="selectFilterOption('hospitalType', '口腔医院')"
              >
                口腔医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '精神科医院' }" 
                @click="selectFilterOption('hospitalType', '精神科医院')"
              >
                精神科医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '肿瘤医院' }" 
                @click="selectFilterOption('hospitalType', '肿瘤医院')"
              >
                肿瘤医院
              </view>
              <view 
                class="filter-option" 
                :class="{ active: filters.hospitalType === '其他' }" 
                @click="selectFilterOption('hospitalType', '其他')"
              >
                其他
              </view>
            </view>
          </view>
          
          <!-- 底部按钮 -->
          <view class="popup-footer">
            <button class="footer-btn reset-btn" @click="resetFilters">重置</button>
            <button class="footer-btn confirm-btn" @click="applyFilters">确定</button>
          </view>
        </scroll-view>
      </view>
    </uni-popup>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
	</view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getDoctorList } from '@/api/doctor.js';

	export default {
	components: {
		ThemeToggle
	},
		data() {
			const allDoctorList = [
				{
					id: 1,
					name: '张医生',
					level: '主任医师',
					hospital: '北京大学第一医院',
					dept: '心血管内科',
					goodAt: '心血管疾病、心脏病、冠心病',
					avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
					price: 50,
					appointmentCount: 2312,
					rating: 4.9,
					consultationCount: 542
				},
				{
					id: 2,
					name: '李医生',
					level: '副主任医师',
					hospital: '北京协和医院',
					dept: '神经内科',
					goodAt: '神经疾病、头痛、失眠',
					avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
					price: 60,
					appointmentCount: 1856,
					rating: 4.8,
					consultationCount: 432
				},
				{
					id: 3,
					name: '王医生',
					level: '主治医师',
					hospital: '北京天坛医院',
					dept: '骨科',
					goodAt: '骨科疾病、骨折、关节疼痛',
					avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
					price: 45,
					appointmentCount: 1523,
					rating: 4.7,
					consultationCount: 389
				},
				{
					id: 4,
					name: '刘医生',
					level: '主任医师',
					hospital: '北京朝阳医院',
					dept: '消化内科',
					goodAt: '消化系统疾病、胃炎、胃溃疡',
					avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
					price: 55,
					appointmentCount: 2098,
					rating: 4.85,
					consultationCount: 512
				},
				{
					id: 5,
					name: '陈医生',
					level: '副主任医师',
					hospital: '北京友谊医院',
					dept: '皮肤科',
					goodAt: '皮肤病、湿疹、过敏',
					avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
					price: 40,
					appointmentCount: 1245,
					rating: 4.75,
					consultationCount: 321
				},
				{
					id: 6,
					name: '赵医生',
					level: '主任医师',
					hospital: '北京同仁医院',
					dept: '眼科',
					goodAt: '眼科疾病、白内障、青光眼',
					avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
					price: 65,
					appointmentCount: 2689,
					rating: 4.88,
					consultationCount: 623
				},
				{
					id: 7,
					name: '孙医生',
					level: '主治医师',
					hospital: '北京儿童医院',
					dept: '儿科',
					goodAt: '儿科疾病、小儿感冒、发育迟缓',
					avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
					price: 50,
					appointmentCount: 3124,
					rating: 4.82,
					consultationCount: 756
				},
				{
					id: 8,
					name: '周医生',
					level: '副主任医师',
					hospital: '北京妇产医院',
					dept: '妇产科',
					goodAt: '妇科疾病、产科、不孕不育',
					avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
					price: 58,
					appointmentCount: 1987,
					rating: 4.79,
					consultationCount: 498
				},
				{
					id: 9,
					name: '吴医生',
					level: '主任医师',
					hospital: '北京肿瘤医院',
					dept: '肿瘤内科',
					goodAt: '肿瘤诊断、化疗、靶向治疗',
					avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
					price: 80,
					appointmentCount: 1456,
					rating: 4.91,
					consultationCount: 389
				},
				{
					id: 10,
					name: '郑医生',
					level: '主治医师',
					hospital: '北京口腔医院',
					dept: '口腔科',
					goodAt: '口腔疾病、牙齿矫正、种植牙',
					avatar: 'https://randomuser.me/api/portraits/men/10.jpg',
					price: 48,
					appointmentCount: 1678,
					rating: 4.73,
					consultationCount: 412
				},
				{
					id: 11,
					name: '钱医生',
					level: '副主任医师',
					hospital: '北京宣武医院',
					dept: '神经外科',
					goodAt: '神经外科手术、脑肿瘤、脑血管病',
					avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
					price: 75,
					appointmentCount: 1123,
					rating: 4.86,
					consultationCount: 298
				},
				{
					id: 12,
					name: '马医生',
					level: '主任医师',
					hospital: '北京安贞医院',
					dept: '心外科',
					goodAt: '心脏外科手术、先天性心脏病',
					avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
					price: 85,
					appointmentCount: 987,
					rating: 4.92,
					consultationCount: 245
				},
				{
					id: 13,
					name: '朱医生',
					level: '主治医师',
					hospital: '北京积水潭医院',
					dept: '烧伤科',
					goodAt: '烧伤治疗、创面修复、疤痕治疗',
					avatar: 'https://randomuser.me/api/portraits/men/13.jpg',
					price: 52,
					appointmentCount: 756,
					rating: 4.68,
					consultationCount: 187
				},
				{
					id: 14,
					name: '胡医生',
					level: '副主任医师',
					hospital: '北京中日友好医院',
					dept: '呼吸内科',
					goodAt: '呼吸系统疾病、哮喘、慢阻肺',
					avatar: 'https://randomuser.me/api/portraits/men/14.jpg',
					price: 56,
					appointmentCount: 2145,
					rating: 4.81,
					consultationCount: 534
				},
				{
					id: 15,
					name: '林医生',
					level: '主任医师',
					hospital: '北京301医院',
					dept: '内分泌科',
					goodAt: '糖尿病、甲状腺疾病、肥胖症',
					avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
					price: 62,
					appointmentCount: 1789,
					rating: 4.84,
					consultationCount: 467
				},
				{
					id: 16,
					name: '黄医生',
					level: '主治医师',
					hospital: '北京302医院',
					dept: '感染科',
					goodAt: '感染性疾病、肝病、传染病',
					avatar: 'https://randomuser.me/api/portraits/men/16.jpg',
					price: 54,
					appointmentCount: 1345,
					rating: 4.76,
					consultationCount: 356
				},
				{
					id: 17,
					name: '杨医生',
					level: '副主任医师',
					hospital: '北京306医院',
					dept: '泌尿外科',
					goodAt: '泌尿系统疾病、肾结石、前列腺',
					avatar: 'https://randomuser.me/api/portraits/men/17.jpg',
					price: 59,
					appointmentCount: 1567,
					rating: 4.78,
					consultationCount: 423
				},
				{
					id: 18,
					name: '罗医生',
					level: '主任医师',
					hospital: '北京309医院',
					dept: '胸外科',
					goodAt: '胸部疾病、肺癌、食管癌',
					avatar: 'https://randomuser.me/api/portraits/men/18.jpg',
					price: 78,
					appointmentCount: 1098,
					rating: 4.87,
					consultationCount: 287
				},
				{
					id: 19,
					name: '高医生',
					level: '主治医师',
					hospital: '北京307医院',
					dept: '血液科',
					goodAt: '血液疾病、白血病、贫血',
					avatar: 'https://randomuser.me/api/portraits/men/19.jpg',
					price: 63,
					appointmentCount: 892,
					rating: 4.71,
					consultationCount: 234
				},
				{
					id: 20,
					name: '梁医生',
					level: '副主任医师',
					hospital: '北京308医院',
					dept: '康复科',
					goodAt: '康复治疗、运动损伤、康复训练',
					avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
					price: 47,
					appointmentCount: 1234,
					rating: 4.74,
					consultationCount: 312
				}
			];
			
			return {
			theme: getCurrentTheme(),
			city: '北京',
			keyword: '',
			unreadMessageCount: 3, // 未读消息数量
			activeFilterIndex: -1,
			// 语音搜索相关
			isRecording: false, // 是否正在录音
			recordingTime: 0, // 录音时长（秒）
			recorderManager: null, // 录音管理器
			recordingTimer: null, // 录音计时器
			sortType: 'comprehensive', // 排序类型：comprehensive综合排序, price_asc价格从低到高, price_desc价格从高到低, appointment_desc预约量从高到低, rating_desc评分从高到低
			showSortMenu: false, // 是否显示排序菜单
			showMapView: false, // 是否显示地图视图
			mapInstance: null, // 地图实例
			mapMarkers: [], // 地图标记
			mapRippleCircles: [], // 涟漪圆圈
			MAP_KEY: 'aab8394f9ad4c8088514c3a844880440', // 高德地图API Key
			targetHospitalName: '', // 目标医院名称（用于从其他页面跳转过来定位）
			sortOptions: [
				{ label: '综合排序', value: 'comprehensive' },
				{ label: '价格从低到高', value: 'price_asc' },
				{ label: '价格从高到低', value: 'price_desc' },
				{ label: '预约量从高到低', value: 'appointment_desc' },
				{ label: '评分从高到低', value: 'rating_desc' }
			],
			// 筛选条件
			filters: {
				serviceType: null, // 服务类型
				hospitalLevel: null, // 医院等级
				distance: null, // 距离
				hospitalType: null // 医院类型
			},
			allDoctorList: allDoctorList,
			doctorList: allDoctorList
		}
	},
	computed: {
		sortTypeText() {
			const option = this.sortOptions.find(item => item.value === this.sortType);
			return option ? option.label : '综合排序';
		},
		// 瀑布流列数
		waterfallColumnCount() {
			// 根据屏幕宽度动态计算列数，移动端通常2列
			return 2;
		},
		// 瀑布流列数据
		waterfallColumns() {
			const list = this.filteredDoctorList;
			const columnCount = this.waterfallColumnCount;
			const columns = Array.from({ length: columnCount }, () => []);
			
			// 将医生列表分配到不同的列中
			list.forEach((doctor, index) => {
				// 简单轮询分配，也可以根据内容高度智能分配
				const columnIndex = index % columnCount;
				columns[columnIndex].push(doctor);
			});
			
			return columns;
		},
		hospitalCount() {
			// 统计不同医院的数量
			const hospitals = new Set();
			this.filteredDoctorList.forEach(doctor => {
				if (doctor.hospital) {
					hospitals.add(doctor.hospital);
				}
			});
			return hospitals.size;
		},
		filteredDoctorList() {
			let list = this.allDoctorList;
			
			// 搜索过滤
			if (this.keyword && this.keyword.trim() !== '') {
				const keyword = this.keyword.trim().toLowerCase();
				list = list.filter(doctor => {
					// 搜索医生姓名
					const nameMatch = doctor.name.toLowerCase().includes(keyword);
					// 搜索科室
					const deptMatch = doctor.dept.toLowerCase().includes(keyword);
					// 搜索医院
					const hospitalMatch = doctor.hospital.toLowerCase().includes(keyword);
					// 搜索擅长领域
					const goodAtMatch = doctor.goodAt.toLowerCase().includes(keyword);
					// 搜索职称
					const levelMatch = doctor.level.toLowerCase().includes(keyword);
					
					return nameMatch || deptMatch || hospitalMatch || goodAtMatch || levelMatch;
				});
			}
			
			// 筛选过滤
			list = list.filter(doctor => {
				const hospitalName = doctor.hospital || '';
				
				// 服务类型筛选（暂时跳过，因为医生数据中没有此字段）
				// if (this.filters.serviceType) {
				//   // 可以根据需要实现
				// }
				
				// 医院等级筛选
				if (this.filters.hospitalLevel) {
					const levelMap = {
						'三甲医院': ['三甲'],
						'三级医院': ['三甲', '三乙', '三丙', '三级'],
						'二级医院': ['二甲', '二乙', '二丙', '二级'],
						'一级医院': ['一甲', '一乙', '一丙', '一级']
					};
					const levels = levelMap[this.filters.hospitalLevel] || [];
					const hospitalLevel = this.getHospitalLevel(hospitalName);
					if (!levels.includes(hospitalLevel)) {
						return false;
					}
				}
				
				// 距离筛选（暂时跳过，因为医生数据中没有距离字段）
				// if (this.filters.distance) {
				//   // 可以根据需要实现
				// }
				
				// 医院类型筛选
				if (this.filters.hospitalType) {
					const hospitalType = this.getHospitalType(hospitalName);
					if (this.filters.hospitalType === '其他') {
						// 如果是"其他"，则匹配所有不在已知类型中的医院（即"未知"类型）
						if (hospitalType !== '未知') {
							return false;
						}
					} else {
						// 否则精确匹配
						if (hospitalType !== this.filters.hospitalType) {
							return false;
						}
					}
				}
				
				return true;
			});
			
			// 排序
			const sortedList = [...list];
			switch (this.sortType) {
				case 'price_asc':
					// 价格从低到高
					sortedList.sort((a, b) => a.price - b.price);
					break;
				case 'price_desc':
					// 价格从高到低
					sortedList.sort((a, b) => b.price - a.price);
					break;
				case 'appointment_desc':
					// 预约量从高到低
					sortedList.sort((a, b) => b.appointmentCount - a.appointmentCount);
					break;
				case 'rating_desc':
					// 评分从高到低
					sortedList.sort((a, b) => b.rating - a.rating);
					break;
				case 'comprehensive':
				default:
					// 综合排序：优先按评分和预约量的综合排序
					sortedList.sort((a, b) => {
						// 综合得分 = 评分 * 0.6 + 预约量归一化 * 0.4
						const scoreA = a.rating * 0.6 + (a.appointmentCount / 3000) * 0.4;
						const scoreB = b.rating * 0.6 + (b.appointmentCount / 3000) * 0.4;
						return scoreB - scoreA;
					});
					break;
			}
			
			return sortedList;
		},
	},
	watch: {
		// 监听筛选后的医生列表变化，更新地图标记
		filteredDoctorList: {
			handler() {
				if (this.showMapView && this.mapInstance) {
					this.addHospitalMarkers();
				}
			},
			deep: true
		}
	},
	onLoad(options) {
		// tabbar 页面无法通过 URL 参数传递，所以从本地存储读取
		// 接收传递的医院名称参数
		const storedHospitalName = uni.getStorageSync('targetHospitalName');
		const showMapView = uni.getStorageSync('showMapView');
		
		if (storedHospitalName) {
			this.targetHospitalName = storedHospitalName;
			// 清除存储，避免影响下次进入页面
			uni.removeStorageSync('targetHospitalName');
		}
		
		// 如果设置了显示地图，自动切换到地图视图
		if (showMapView) {
			this.showMapView = true;
			uni.removeStorageSync('showMapView');
			// 延迟初始化地图，确保DOM已经渲染
			this.$nextTick(() => {
				setTimeout(() => {
					this.initMap();
				}, 300);
			});
		}
	},
	onShow() {
		// 监听主题变更
		uni.$on('themeChange', this.updateTheme);
		this.updateTheme();
		
		// 监听城市变更
		uni.$on('cityChanged', this.onCityChanged);
		
		// 加载城市信息
		this.loadCity();
		
		// 从后端加载医生列表
		this.loadDoctorsFromAPI();
	},
	onHide() {
		uni.$off('themeChange', this.updateTheme);
		uni.$off('cityChanged', this.onCityChanged);
		// 页面隐藏时清理地图
		this.destroyMap();
	},
	beforeDestroy() {
		// 组件销毁时清理地图
		this.destroyMap();
		// 清理录音相关资源
		if (this.isRecording) {
			this.stopRecording();
		}
		if (this.recordingTimer) {
			clearInterval(this.recordingTimer);
			this.recordingTimer = null;
		}
	},
	methods: {
		async loadDoctorsFromAPI() {
			try {
				const res = await getDoctorList({ pageSize: 30 });
				if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
					this.allDoctorList = res.data.map((d, i) => ({
						id: d.id || d._id || i + 1,
						name: d.name || '医生',
						level: d.title || '医师',
						hospital: d.hospital || '本院',
						dept: d.department || '综合科',
						goodAt: d.specialties || '',
						avatar: d.avatar || `https://randomuser.me/api/portraits/men/${(i % 20) + 1}.jpg`,
						price: 50,
						appointmentCount: 0,
						rating: 4.5,
						consultationCount: 0,
					}));
					this.doctorList = this.allDoctorList;
				}
			} catch (e) {
				console.warn('从后端加载医生列表失败，使用默认数据', e);
			}
		},
		updateTheme(theme) {
			try {
				this.theme = theme || getCurrentTheme();
				// 使用 $nextTick 确保在正确的渲染周期更新
				this.$nextTick(() => {
					// 仅在必要时强制更新
					if (this.$forceUpdate && typeof this.$forceUpdate === 'function') {
						this.$forceUpdate();
					}
				});
			} catch (e) {
				console.warn('主题更新失败:', e);
				// 即使出错也更新主题数据
				this.theme = getCurrentTheme();
			}
		},
		chooseCity() {
			uni.navigateTo({
				url: '/pages/city/index'
			});
		},
		onSearch() {
			// 搜索逻辑已通过computed实现
			console.log('搜索关键词:', this.keyword);
			if (this.keyword && this.keyword.trim() !== '') {
				const resultCount = this.filteredDoctorList.length;
				if (resultCount === 0) {
					uni.showToast({
						title: '未找到相关医生',
						icon: 'none'
					});
				}
			}
		},
		onSearchInput(e) {
			this.keyword = e.detail.value;
		},
		// 切换语音搜索
		toggleVoiceSearch() {
			if (this.isRecording) {
				// 停止录音
				this.stopRecording();
			} else {
				// 开始录音
				this.startRecording();
			}
		},
		// 开始录音
		startRecording() {
			// #ifdef H5
			uni.showToast({
				title: 'H5暂不支持语音搜索',
				icon: 'none'
			});
			// #endif
			
			// #ifdef APP-PLUS || MP-WEIXIN
			try {
				this.recorderManager = uni.createRecorderManager();
				
				// 监听录音开始
				this.recorderManager.onStart(() => {
					this.isRecording = true;
					this.recordingTime = 0;
					
					// 开始计时
					this.recordingTimer = setInterval(() => {
						this.recordingTime++;
						// 最多录音60秒
						if (this.recordingTime >= 60) {
							this.stopRecording();
						}
					}, 1000);
					
					uni.showToast({
						title: '开始录音',
						icon: 'none',
						duration: 1000
					});
				});
				
				// 监听录音结束
				this.recorderManager.onStop((res) => {
					this.isRecording = false;
					if (this.recordingTimer) {
						clearInterval(this.recordingTimer);
						this.recordingTimer = null;
					}
					
					// 实际项目中应该将音频上传到服务器进行语音识别
					// 这里使用模拟数据
					this.handleVoiceRecognition(res);
				});
				
				// 监听录音错误
				this.recorderManager.onError((err) => {
					console.error('录音错误:', err);
					this.isRecording = false;
					if (this.recordingTimer) {
						clearInterval(this.recordingTimer);
						this.recordingTimer = null;
					}
					uni.showToast({
						title: '录音失败，请重试',
						icon: 'none'
					});
				});
				
				// 开始录音
				this.recorderManager.start({
					duration: 60000, // 最长录音时长60秒
					sampleRate: 16000,
					numberOfChannels: 1,
					encodeBitRate: 96000,
					format: 'mp3'
				});
			} catch (e) {
				console.error('录音初始化失败:', e);
				uni.showToast({
					title: '录音功能不可用',
					icon: 'none'
				});
			}
			// #endif
		},
		// 停止录音
		stopRecording() {
			if (this.recorderManager) {
				this.recorderManager.stop();
			}
		},
		// 处理语音识别结果（模拟）
		handleVoiceRecognition(res) {
			// 实际项目中应该调用语音识别API
			// 这里使用模拟数据演示
			uni.showLoading({
				title: '识别中...'
			});
			
			// 模拟识别延迟
			setTimeout(() => {
				uni.hideLoading();
				
				// 模拟识别结果（实际应该从API获取）
				// 这里随机返回一些常见的搜索词
				const mockKeywords = ['内科', '外科', '儿科', '妇科', '眼科', '口腔科', '头痛', '感冒', '发烧', '胃痛'];
				const randomKeyword = mockKeywords[Math.floor(Math.random() * mockKeywords.length)];
				
				// 将识别结果填入搜索框
				this.keyword = randomKeyword;
				
				uni.showToast({
					title: `识别结果: ${randomKeyword}`,
					icon: 'none',
					duration: 2000
				});
				
				// 自动执行搜索
				this.onSearch();
			}, 1000);
		},
		goChat() {
			uni.showToast({
				title: '客服功能开发中',
				icon: 'none'
			});
		},
		goSmartRecommend() {
			uni.navigateTo({
				url: '/pages/doctor/smart-recommend',
				fail: (err) => {
					console.error('跳转到智能推荐页面失败:', err);
					uni.showToast({
						title: '跳转失败，请重试',
						icon: 'none'
					});
				}
			});
		},
		goMessages() {
			uni.navigateTo({
				url: '/pages/mine/messages'
			});
		},
		toggleSortMenu() {
			// 关闭其他菜单
			if (this.activeFilterIndex !== 0) {
				this.activeFilterIndex = 0;
			}
			// 切换排序菜单
			this.showSortMenu = !this.showSortMenu;
		},
		closeSortMenu() {
			this.showSortMenu = false;
		},
		selectSortType(type) {
			this.sortType = type;
			this.showSortMenu = false;
		},
		onFilterChange(index) {
			// 关闭排序菜单
			this.showSortMenu = false;
			
			// 切换激活状态
			if (this.activeFilterIndex === index) {
				this.activeFilterIndex = -1;
			} else {
				this.activeFilterIndex = index;
			}
			
			// 根据筛选类型执行相应操作
			switch (index) {
				case 0:
					// 综合排序（已在toggleSortMenu中处理）
					break;
				case 1:
					// 科室
					uni.navigateTo({
						url: '/pages/doctor/department'
					});
					break;
				case 2:
					// 疾病
					uni.navigateTo({
						url: '/pages/doctor/disease'
					});
					break;
				case 3:
					// 筛选
					this.toggleFilterPopup();
					break;
			}
		},
		goDoctorDetail(doctor) {
			// 传递完整的医生信息
			const doctorData = encodeURIComponent(JSON.stringify(doctor));
			uni.navigateTo({
				url: `/pages/doctor/detail?doctor=${doctorData}`
			});
		},
		onReserve(doctor) {
			uni.navigateTo({
				url: `/pages/doctor/appointment?doctorId=${doctor.id}`
			});
		},
		onConsult(doctor) {
			uni.showToast({
				title: '在线咨询功能开发中',
				icon: 'none'
			});
		},
		loadCity() {
			// 从本地存储加载城市信息
			try {
				const savedCity = uni.getStorageSync('currentCity');
				if (savedCity) {
					this.city = savedCity;
				}
			} catch (e) {
				console.warn('加载城市信息失败:', e);
			}
		},
		onCityChanged(cityName) {
			this.city = cityName;
		},
		toggleMapView() {
			this.showMapView = !this.showMapView;
			if (this.showMapView) {
				// 切换到地图视图时初始化地图
				this.$nextTick(() => {
					setTimeout(() => {
						this.initMap();
					}, 300);
				});
			} else {
				// 切换到列表视图时清理地图
				this.destroyMap();
			}
		},
		// 初始化高德地图
		initMap() {
			if (typeof window === 'undefined' || !window.AMap) {
				console.log('高德地图API未加载，尝试加载...');
				// 配置安全密钥（高德2.0强制要求）
				if (!window._AMapSecurityConfig) {
					window._AMapSecurityConfig = {
						securityJsCode: this.MAP_KEY
					};
				}
				// 动态加载高德地图2.0核心库
				const script = document.createElement('script');
				script.src = `https://webapi.amap.com/maps?v=2.0&key=${this.MAP_KEY}&plugin=AMap.ControlBar,AMap.ToolBar,AMap.Marker,AMap.InfoWindow`;
				script.type = 'text/javascript';
				script.onload = () => {
					this.initGaodeMap();
				};
				script.onerror = () => {
					console.error('高德地图加载失败，请检查Key权限配置或网络！');
				};
				document.body.appendChild(script);
			} else {
				this.initGaodeMap();
			}
		},
		// 初始化高德地图实例
		initGaodeMap() {
			if (!window.AMap) return;
			
			this.$nextTick(() => {
				setTimeout(() => {
					const mapContainer = document.getElementById('doctor-map');
					if (!mapContainer) {
						console.error('地图容器不存在');
						return;
					}
					
					// 如果地图已存在，先销毁
					if (this.mapInstance) {
						this.mapInstance.destroy();
						this.mapInstance = null;
					}
					
					// 创建地图实例（使用2D模式，更适合移动端）
					this.mapInstance = new window.AMap.Map('doctor-map', {
						viewMode: '2D',
						zoom: 10,
						center: [116.397428, 39.90923], // 北京中心点坐标
						resizeEnable: true,
						dragEnable: true,
						zoomEnable: true,
						mapStyle: 'amap://styles/normal'
					});
					
					// 添加工具栏
					const toolBar = new window.AMap.ToolBar({
						position: {
							left: '10px',
							top: '10px'
						}
					});
					toolBar.addTo(this.mapInstance);
					
					// 添加医院/医生标记点
					this.addHospitalMarkers();
					
					// 如果有目标医院，定位到该医院（延迟执行，确保标记已添加）
					if (this.targetHospitalName) {
						setTimeout(() => {
							this.focusOnHospital(this.targetHospitalName);
						}, 200);
					}
					
					// 地图加载完成
					this.mapInstance.on('complete', () => {
						console.log('✅ 高德地图加载成功！');
					});
				}, 100);
			});
		},
		// 添加医院/医生标记点
		addHospitalMarkers() {
			if (!this.mapInstance || !window.AMap) return;
			
			// 清除已有标记
			this.mapMarkers.forEach(marker => {
				this.mapInstance.remove(marker);
			});
			this.mapMarkers = [];
			
			// 按医院分组医生
			const hospitalMap = {};
			this.filteredDoctorList.forEach(doctor => {
				if (!hospitalMap[doctor.hospital]) {
					hospitalMap[doctor.hospital] = {
						name: doctor.hospital,
						doctors: [],
						location: this.getHospitalLocation(doctor.hospital)
					};
				}
				hospitalMap[doctor.hospital].doctors.push(doctor);
			});
			
			// 为每个医院添加标记点
			Object.values(hospitalMap).forEach((hospital, index) => {
				if (!hospital.location) return;
				
				const [lng, lat] = hospital.location;
				const doctorCount = hospital.doctors.length;
				
				// 创建自定义标记图标
				const icon = new window.AMap.Icon({
					size: new window.AMap.Size(32, 32),
					image: this.createMarkerIcon(doctorCount),
					imageSize: new window.AMap.Size(32, 32)
				});
				
				// 创建标记
				const marker = new window.AMap.Marker({
					position: [lng, lat],
					icon: icon,
					title: hospital.name,
					zIndex: 100 + index
				});
				
				// 创建自定义信息窗口容器
				const infoContent = document.createElement('div');
				infoContent.style.cssText = 'padding:10px;background:#fff;border-radius:4px;min-width:200px;cursor:pointer;';
				infoContent.innerHTML = `
					<div style="font-size:16px;color:#333;margin-bottom:8px;font-weight:600;">${hospital.name}</div>
					<div style="font-size:14px;color:#666;margin-bottom:4px;">医生数量: <span style="color:#4A90E2;font-weight:600;">${doctorCount}</span></div>
					<div style="font-size:12px;color:#4A90E2;margin-top:8px;cursor:pointer;text-decoration:underline;">点击查看详情</div>
				`;
				
				// 添加点击事件
				infoContent.addEventListener('click', () => {
					this.navigateToHospitalDetail(hospital.name);
				});
				
				// 创建信息窗口
				const infoWindow = new window.AMap.InfoWindow({
					content: infoContent,
					offset: new window.AMap.Pixel(0, -30),
					isCustom: true
				});
				
				// 点击标记显示信息窗口
				marker.on('click', () => {
					infoWindow.open(this.mapInstance, marker.getPosition());
				});
				
				// 添加涟漪动画效果
				this.addRippleEffect(marker, [lng, lat]);
				
				marker.setMap(this.mapInstance);
				this.mapMarkers.push(marker);
			});
			
			// 自动适配地图显示范围（如果没有目标医院）
			if (this.mapMarkers.length > 0 && !this.targetHospitalName) {
				this.mapInstance.setFitView(this.mapMarkers);
			}
		},
		// 创建标记图标（根据医生数量显示不同颜色和大小）
		createMarkerIcon(count) {
			// 根据数量确定颜色
			let color = '#4A90E2'; // 默认蓝色
			if (count > 10) {
				color = '#52c41a'; // 绿色 - 高密度
			} else if (count > 5) {
				color = '#4A90E2'; // 蓝色 - 中高密度
			} else if (count > 2) {
				color = '#faad14'; // 橙色 - 中密度
			} else {
				color = '#ff4d4f'; // 红色 - 低密度
			}
			
			// 创建SVG图标
			const size = Math.max(24, Math.min(40, Math.sqrt(count) * 3));
			const svg = `
				<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
					<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" opacity="0.8" stroke="#fff" stroke-width="2"/>
					<circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#fff"/>
					<circle cx="${size/2}" cy="${size/2}" r="2" fill="${color}"/>
				</svg>
			`;
			
			return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
		},
		// 添加涟漪动画效果
		addRippleEffect(marker, position) {
			if (!this.mapInstance || !window.AMap) return;
			
			const ripple = new window.AMap.Circle({
				center: position,
				radius: 20,
				strokeColor: '#4A90E2',
				strokeWeight: 2,
				strokeOpacity: 0.6,
				fillColor: '#4A90E2',
				fillOpacity: 0.1,
				zIndex: 50
			});
			ripple.setMap(this.mapInstance);
			this.mapRippleCircles.push(ripple);
			
			// 动画效果
			let radius = 20;
			const animate = () => {
				radius += 2;
				if (radius > 80) {
					radius = 20;
				}
				ripple.setRadius(radius);
				ripple.setOptions({
					strokeOpacity: Math.max(0, 0.6 - (radius - 20) / 60),
					fillOpacity: Math.max(0, 0.1 - (radius - 20) / 60)
				});
				if (this.showMapView && this.mapInstance) {
					requestAnimationFrame(animate);
				}
			};
			animate();
		},
		// 获取医院位置（根据医院名称返回坐标，这里使用示例数据）
		getHospitalLocation(hospitalName) {
			// 北京主要医院坐标数据
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
				'北京宣武医院': [116.3607, 39.9042]
			};
			
			return hospitalLocations[hospitalName] || [116.397428, 39.90923]; // 默认北京中心点
		},
		// 获取医院地址（根据医院名称返回地址）
		getHospitalAddress(hospitalName) {
			// 北京主要医院地址数据
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
				'北京宣武医院': '北京市西城区长椿街45号'
			};
			
			return hospitalAddresses[hospitalName] || '北京市';
		},
		// 跳转到医院详情页
		navigateToHospitalDetail(hospitalName) {
			const address = this.getHospitalAddress(hospitalName);
			const location = this.getHospitalLocation(hospitalName);
			uni.navigateTo({
				url: `/pages/hospital-detail/index?name=${encodeURIComponent(hospitalName)}&address=${encodeURIComponent(address)}&level=三甲&longitude=${location[0]}&latitude=${location[1]}`
			});
		},
		// 定位到指定医院
		focusOnHospital(hospitalName) {
			if (!this.mapInstance || !window.AMap) return;
			
			const location = this.getHospitalLocation(hospitalName);
			if (!location) return;
			
			// 设置地图中心点和缩放级别
			this.mapInstance.setCenter(location);
			this.mapInstance.setZoom(16);
			
			// 查找对应的标记并显示信息窗口
			const targetMarker = this.mapMarkers.find(marker => {
				const position = marker.getPosition();
				const lng = typeof position.lng === 'number' ? position.lng : position.getLng();
				const lat = typeof position.lat === 'number' ? position.lat : position.getLat();
				return Math.abs(lng - location[0]) < 0.001 && 
				       Math.abs(lat - location[1]) < 0.001;
			});
			
			if (targetMarker) {
				// 显示信息窗口
				setTimeout(() => {
					// 创建自定义信息窗口容器
					const infoContent = document.createElement('div');
					infoContent.style.cssText = 'padding:10px;background:#fff;border-radius:4px;min-width:200px;cursor:pointer;';
					infoContent.innerHTML = `
						<div style="font-size:16px;color:#333;margin-bottom:8px;font-weight:600;">${hospitalName}</div>
						<div style="font-size:12px;color:#4A90E2;margin-top:8px;cursor:pointer;text-decoration:underline;">点击查看详情</div>
					`;
					
					// 添加点击事件
					infoContent.addEventListener('click', () => {
						this.navigateToHospitalDetail(hospitalName);
					});
					
					const infoWindow = new window.AMap.InfoWindow({
						content: infoContent,
						offset: new window.AMap.Pixel(0, -30),
						isCustom: true
					});
					const position = targetMarker.getPosition();
					infoWindow.open(this.mapInstance, position);
				}, 300);
			}
		},
		// 销毁地图
		destroyMap() {
			// 清除涟漪动画
			this.mapRippleCircles.forEach(circle => {
				if (this.mapInstance) {
					this.mapInstance.remove(circle);
				}
			});
			this.mapRippleCircles = [];
			
			// 清除标记
			this.mapMarkers.forEach(marker => {
				if (this.mapInstance) {
					this.mapInstance.remove(marker);
				}
			});
			this.mapMarkers = [];
			
			// 销毁地图实例
			if (this.mapInstance) {
				this.mapInstance.destroy();
				this.mapInstance = null;
			}
		},
		toggleFilterPopup() {
			// 关闭排序菜单
			this.showSortMenu = false;
			// 切换筛选弹窗
			if (this.$refs.filterPopup) {
				this.$refs.filterPopup.open();
			}
		},
		closeFilterPopup() {
			if (this.$refs.filterPopup) {
				this.$refs.filterPopup.close();
			}
		},
		onFilterPopupClose() {
			// 弹窗关闭时的处理
		},
		selectFilterOption(key, value) {
			// 切换选中状态，如果已选中则取消
			if (this.filters[key] === value) {
				this.filters[key] = null;
			} else {
				this.filters[key] = value;
			}
		},
		resetFilters() {
			// 重置所有筛选条件
			this.filters = {
				serviceType: null,
				hospitalLevel: null,
				distance: null,
				hospitalType: null
			};
		},
		applyFilters() {
			// 应用筛选条件
			this.closeFilterPopup();
			// 筛选逻辑已在computed中实现，这里不需要额外操作
		},
		// 从医院名称中提取医院等级
		getHospitalLevel(hospitalName) {
			if (!hospitalName) return '';
			// 常见三甲医院
			const sanjiaHospitals = ['北京大学第一医院', '北京协和医院', '北京天坛医院', '北京朝阳医院', 
				'北京友谊医院', '北京同仁医院', '北京301医院', '北京安贞医院', '北京中日友好医院'];
			if (sanjiaHospitals.some(h => hospitalName.includes(h))) {
				return '三甲';
			}
			// 检查名称中是否包含等级信息
			if (hospitalName.includes('三甲') || hospitalName.includes('三级甲等')) {
				return '三甲';
			} else if (hospitalName.includes('三乙') || hospitalName.includes('三级乙等')) {
				return '三乙';
			} else if (hospitalName.includes('三丙') || hospitalName.includes('三级丙等')) {
				return '三丙';
			} else if (hospitalName.includes('三级')) {
				return '三级';
			} else if (hospitalName.includes('二甲') || hospitalName.includes('二级甲等')) {
				return '二甲';
			} else if (hospitalName.includes('二乙') || hospitalName.includes('二级乙等')) {
				return '二乙';
			} else if (hospitalName.includes('二丙') || hospitalName.includes('二级丙等')) {
				return '二丙';
			} else if (hospitalName.includes('二级')) {
				return '二级';
			} else if (hospitalName.includes('一甲') || hospitalName.includes('一级甲等')) {
				return '一甲';
			} else if (hospitalName.includes('一乙') || hospitalName.includes('一级乙等')) {
				return '一乙';
			} else if (hospitalName.includes('一丙') || hospitalName.includes('一级丙等')) {
				return '一丙';
			} else if (hospitalName.includes('一级')) {
				return '一级';
			}
			// 默认返回空字符串，表示未知等级
			return '';
		},
		// 从医院名称中提取医院类型
		getHospitalType(hospitalName) {
			if (!hospitalName) return '未知';
			if (hospitalName.includes('儿童医院')) {
				return '儿童医院';
			} else if (hospitalName.includes('骨科医院')) {
				return '骨科医院';
			} else if (hospitalName.includes('妇产医院')) {
				return '妇产医院';
			} else if (hospitalName.includes('口腔医院')) {
				return '口腔医院';
			} else if (hospitalName.includes('精神') || hospitalName.includes('心理')) {
				return '精神科医院';
			} else if (hospitalName.includes('肿瘤')) {
				return '肿瘤医院';
			} else if (hospitalName.includes('医院')) {
				// 如果包含"医院"但不匹配上述类型，默认为综合医院
				return '综合医院';
			}
			return '未知';
		}
	}
}
</script>

<style lang="scss">
.page {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: var(--bg-color);
	transition: background-color 0.3s ease;
	overflow: hidden;
}

/* 顶部搜索栏 */
.header {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	padding-left: 30rpx;
	padding-right: 30rpx;
	background-color: var(--card-bg);
	border-bottom: 1rpx solid var(--border-color);
	transition: background-color 0.3s ease, border-color 0.3s ease;
	
	.city {
		display: flex;
		align-items: center;
		margin-right: 20rpx;
		
		.city-name {
			font-size: 28rpx;
			color: var(--text-color);
			margin-right: 8rpx;
			transition: color 0.3s ease;
		}
		
		.city-arrow {
			font-size: 20rpx;
			color: var(--text-color-secondary);
			transition: color 0.3s ease;
		}
	}
	
	.search-box {
		flex: 1;
		display: flex;
		align-items: center;
		background-color: var(--bg-color);
		border-radius: 40rpx;
		padding: 12rpx 20rpx;
		transition: background-color 0.3s ease;
		position: relative;
		
		.icon-search {
			font-size: 32rpx;
			margin-right: 12rpx;
			flex-shrink: 0;
		}
		
		.search-input {
			flex: 1;
			font-size: 28rpx;
			color: var(--text-color);
			transition: color 0.3s ease;
		}
		
		.search-placeholder {
			color: var(--text-color-tertiary);
		}
		
		.voice-icon {
			margin-left: 12rpx;
			width: 48rpx;
			height: 48rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			border-left: 1rpx solid var(--border-color);
			padding-left: 12rpx;
			transition: all 0.3s ease;
			cursor: pointer;
			-webkit-tap-highlight-color: transparent;
		}
		
		.voice-icon.recording {
			animation: pulse 1s infinite;
		}
		
		.voice-icon-text {
			font-size: 32rpx;
		}
	}
	
	.chat-icon {
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 20rpx;
		font-size: 36rpx;
		position: relative;
		
		.message-badge {
			position: absolute;
			top: -4rpx;
			right: -4rpx;
			min-width: 32rpx;
			height: 32rpx;
			padding: 0 8rpx;
			background-color: #ff4444;
			color: #ffffff;
			border-radius: 16rpx;
			font-size: 20rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			line-height: 1;
			border: 2rpx solid #ffffff;
		}
	}
}

/* 语音录音提示 */
.voice-recording-tip {
	position: fixed;
	top: 200rpx;
	left: 50%;
	transform: translateX(-50%);
	z-index: 999;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 30rpx 50rpx;
	background-color: rgba(0, 0, 0, 0.8);
	border-radius: 16rpx;
	backdrop-filter: blur(10rpx);
}

.tip-text {
	font-size: 28rpx;
	color: #ffffff;
	margin-bottom: 12rpx;
}

.tip-time {
	font-size: 36rpx;
	font-weight: 600;
	color: #ff6b6b;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.7;
		transform: scale(1.1);
	}
}

/* 筛选栏 */
/* 智能推荐入口 */
.smart-recommend-banner {
	margin: 20rpx 30rpx;
	padding: 24rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.banner-content {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.banner-icon {
	font-size: 48rpx;
}

.banner-text {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.banner-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
}

.banner-desc {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.9);
}

.banner-arrow {
	font-size: 40rpx;
	color: #ffffff;
	font-weight: 300;
}

.filter-bar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: var(--bg-color);
	gap: 20rpx;
	transition: background-color 0.3s ease;
	position: relative;
	
	.filter-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 64rpx;
		padding: 0 20rpx;
		background-color: var(--card-bg);
		border-radius: 12rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
		cursor: pointer;
		transition: all 0.3s ease;
		
		&.active {
			background-color: var(--primary-color);
			
			.filter-text {
				color: #ffffff;
				font-weight: 600;
			}
			
			.filter-arrow {
				color: #ffffff;
			}
		}
		
		.filter-text {
			font-size: 26rpx;
			color: var(--text-color);
			margin-right: 6rpx;
			transition: color 0.3s ease;
		}
		
		.filter-arrow {
			font-size: 18rpx;
			color: var(--text-color-secondary);
			transition: color 0.3s ease;
		}
		
		&.sort-filter {
			position: relative;
			z-index: 10;
		}
	}
	
	/* 排序菜单 */
	.sort-menu {
		position: absolute;
		top: 100%;
		left: 30rpx;
		right: calc(75% + 20rpx);
		background-color: var(--card-bg);
		border-radius: 12rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
		margin-top: 8rpx;
		z-index: 100;
		overflow: hidden;
		
		.sort-menu-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 24rpx 30rpx;
			border-bottom: 1rpx solid var(--border-color);
			cursor: pointer;
			transition: background-color 0.2s ease;
			
			&:last-child {
				border-bottom: none;
			}
			
			&:active {
				background-color: var(--bg-color);
			}
			
			&.active {
				background-color: rgba(74, 144, 226, 0.1);
				
				.sort-menu-text {
					color: var(--primary-color);
					font-weight: 600;
				}
				
				.sort-menu-check {
					color: var(--primary-color);
				}
			}
			
			.sort-menu-text {
				font-size: 28rpx;
				color: var(--text-color);
				transition: color 0.2s ease;
			}
			
			.sort-menu-check {
				font-size: 32rpx;
				color: var(--primary-color);
				font-weight: bold;
			}
		}
	}
	
	/* 遮罩层 */
	.sort-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		background-color: transparent;
	}
}

/* 医生列表 */
.doctor-list {
	flex: 1;
	padding: 20rpx 15rpx;
	box-sizing: border-box;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}

/* 瀑布流容器 */
.waterfall-container {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 20rpx;
}

/* 瀑布流列 */
.waterfall-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

/* 医生卡片 */
.doctor-card {
	display: flex;
	flex-direction: column;
	background-color: var(--card-bg);
	border-radius: 16rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx var(--shadow-color);
	transition: background-color 0.3s ease, box-shadow 0.3s ease;
	width: 100%;
	box-sizing: border-box;
	
	.doctor-left {
		width: 100%;
		margin-bottom: 16rpx;
		display: flex;
		justify-content: center;
		
		.doctor-avatar {
			width: 100%;
			height: 300rpx;
			border-radius: 12rpx;
		}
	}
	
	.doctor-right {
		flex: 1;
		display: flex;
		flex-direction: column;
		
		.doctor-header-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 12rpx;
			
			.doctor-title-box {
				display: flex;
				align-items: center;
				
				.doctor-name {
					font-size: 32rpx;
					font-weight: 700;
					color: var(--text-color);
					margin-right: 12rpx;
					transition: color 0.3s ease;
				}
				
				.doctor-level {
					font-size: 24rpx;
					color: var(--text-color-secondary);
					transition: color 0.3s ease;
				}
			}
			
			.btn-reserve {
				padding: 12rpx 28rpx;
				background-color: var(--primary-color);
				color: #ffffff;
				border-radius: 40rpx;
				font-size: 26rpx;
				font-weight: 500;
				border: none;
				height: 56rpx;
				line-height: 32rpx;
				min-width: 100rpx;
				white-space: nowrap;
				box-sizing: border-box;
			}
		}
		
		.doctor-hospital-row {
			display: flex;
			align-items: center;
			margin-bottom: 12rpx;
			
			.hospital {
				font-size: 26rpx;
				color: var(--text-color-secondary);
				margin-right: 12rpx;
				transition: color 0.3s ease;
			}
			
			.dept {
				font-size: 26rpx;
				color: var(--text-color-secondary);
				transition: color 0.3s ease;
			}
		}
		
		.doctor-goodat-row {
			display: flex;
			align-items: flex-start;
			margin-bottom: 16rpx;
			
			.goodat-label {
				font-size: 24rpx;
				color: var(--text-color-tertiary);
				margin-right: 8rpx;
				transition: color 0.3s ease;
			}
			
			.goodat-text {
				flex: 1;
				font-size: 24rpx;
				color: var(--text-color-tertiary);
				transition: color 0.3s ease;
			}
		}
		
		.doctor-tags-row {
			display: flex;
			align-items: center;
			gap: 16rpx;
			
			.tag {
				display: flex;
				align-items: center;
				padding: 10rpx 20rpx;
				border-radius: 8rpx;
				font-size: 24rpx;
				height: 56rpx;
				box-sizing: border-box;
				
				.tag-dot {
					font-size: 16rpx;
					margin-right: 6rpx;
				}
				
				&.tag-reserve {
					background-color: rgba(74, 144, 226, 0.1);
					color: var(--primary-color);
				}
				
				&.tag-online {
					background-color: rgba(255, 152, 0, 0.1);
					color: #ff9800;
				}
			}
		}
	}
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
		color: var(--text-color-secondary);
		margin-bottom: 16rpx;
		transition: color 0.3s ease;
	}
	
	.empty-hint {
		font-size: 26rpx;
		color: var(--text-color-tertiary);
		transition: color 0.3s ease;
	}
}

/* 筛选弹窗样式 */
.filter-popup {
	background: var(--card-bg);
	border-radius: 0;
	width: 600rpx;
	height: 100vh;
	display: flex;
	flex-direction: column;
	transition: background-color 0.3s ease;
	overflow: hidden;
}

.filter-popup .popup-header {
	display: flex;
	align-items: center;
	padding: 30rpx 20rpx;
	border-bottom: 1rpx solid var(--border-color);
	transition: border-color 0.3s ease;
	flex-shrink: 0;
}

.filter-popup .popup-header .popup-title {
	font-size: 32rpx;
	font-weight: bold;
	color: var(--text-color);
	transition: color 0.3s ease;
}

.filter-popup .popup-content {
	flex: 1;
	overflow-y: auto;
	padding: 20rpx;
	min-height: 0;
	box-sizing: border-box;
}

.filter-popup .filter-section {
	margin-bottom: 30rpx;
}

.filter-popup .filter-section .section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: var(--text-color);
	display: block;
	margin-bottom: 20rpx;
	transition: color 0.3s ease;
}

.filter-popup .filter-section .filter-options-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 20rpx;
}

.filter-popup .filter-section .filter-options-grid .filter-option {
	background: #ffffff;
	color: var(--text-color);
	font-size: 28rpx;
	padding: 20rpx 16rpx;
	border-radius: 40rpx;
	border: 1rpx solid #e0e0e0;
	text-align: center;
	transition: all 0.2s ease;
	cursor: pointer;
	min-height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.filter-popup .filter-section .filter-options-grid .filter-option.active {
	background: #4A90E2;
	color: #ffffff;
	font-weight: bold;
	border-color: #4A90E2;
}

.filter-popup .filter-section .filter-options-grid .filter-option:active {
	transform: scale(0.95);
}

.filter-popup .popup-footer {
	display: flex;
	gap: 20rpx;
	padding: 20rpx 0;
	margin-top: 20rpx;
	background: transparent;
}

.filter-popup .popup-footer .footer-btn {
	flex: 1;
	height: 80rpx;
	border: none;
	border-radius: 40rpx;
	font-size: 30rpx;
	font-weight: bold;
}

.filter-popup .popup-footer .footer-btn.reset-btn {
	background: #E3F2FD;
	color: #4A90E2;
	transition: background-color 0.3s ease, color 0.3s ease;
}

.filter-popup .popup-footer .footer-btn.confirm-btn {
	background: var(--primary-color);
	color: #ffffff;
}

/* 地图视图样式 */
.map-view-container {
	flex: 1;
	display: flex;
	flex-direction: column;
	background-color: var(--bg-color);
	overflow: hidden;
}

.map-header {
	padding: 20rpx 30rpx;
	background-color: var(--card-bg);
	border-bottom: 1rpx solid var(--border-color);
	transition: background-color 0.3s ease, border-color 0.3s ease;
}

.map-stats {
	display: flex;
	justify-content: space-around;
	gap: 20rpx;
}

.map-stats .stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.map-stats .stat-label {
	font-size: 24rpx;
	color: var(--text-color-secondary);
	transition: color 0.3s ease;
}

.map-stats .stat-value {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--primary-color);
	transition: color 0.3s ease;
}

.map-container {
	flex: 1;
	position: relative;
	min-height: 0;
}

.doctor-map {
	width: 100%;
	height: 100%;
	position: absolute;
	top: 0;
	left: 0;
}
</style>
