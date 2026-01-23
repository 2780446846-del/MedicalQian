<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="nav-bar">
        <view class="nav-back" @click="goBack">
          <uni-icons type="left" size="20" color="#333"></uni-icons>
        </view>
        <text class="nav-title">我的就诊人</text>
        <view class="nav-right">
          <view class="nav-btn" @click="toggleSelectMode">
            <text class="nav-btn-text">{{ isSelectMode ? '取消' : '选择' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-container">
      <view class="search-box">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索姓名、手机号或身份证号"
          @input="handleSearch"
        />
        <view v-if="searchKeyword" class="search-clear" @click="clearSearch">
          <uni-icons type="clear" size="16" color="#999"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 筛选和排序栏 -->
    <view class="filter-sort-bar">
      <!-- 筛选栏 -->
      <view class="filter-bar">
        <view
          class="filter-item"
          :class="{ active: filterGender }"
          @click="toggleGenderFilter"
        >
          <text class="filter-text">{{ filterGender || '性别' }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view
          class="filter-item"
          :class="{ active: filterRelation }"
          @click="toggleRelationFilter"
        >
          <text class="filter-text">{{ filterRelation || '关系' }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view
          v-if="filterGender || filterRelation"
          class="filter-item clear-filter"
          @click="clearAllFilters"
        >
          <text class="filter-text">清除</text>
        </view>
      </view>

      <!-- 排序栏 -->
      <view class="sort-bar">
        <view class="sort-item" @click="toggleSortMenu">
          <text class="sort-text">{{ sortText }}</text>
          <text class="sort-arrow">▾</text>
        </view>
      </view>

      <!-- 性别筛选菜单 -->
      <view v-if="showGenderMenu" class="filter-menu" @click.stop>
        <view
          v-for="item in genderOptions"
          :key="item"
          class="filter-menu-item"
          :class="{ active: filterGender === item }"
          @click="selectGender(item)"
        >
          <text class="filter-menu-text">{{ item }}</text>
          <text v-if="filterGender === item" class="filter-menu-check">✓</text>
        </view>
      </view>

      <!-- 关系筛选菜单 -->
      <view v-if="showRelationMenu" class="filter-menu" @click.stop>
        <view
          v-for="item in relationOptions"
          :key="item"
          class="filter-menu-item"
          :class="{ active: filterRelation === item }"
          @click="selectRelation(item)"
        >
          <text class="filter-menu-text">{{ item }}</text>
          <text v-if="filterRelation === item" class="filter-menu-check">✓</text>
        </view>
      </view>

      <!-- 排序菜单 -->
      <view v-if="showSortMenu" class="sort-menu" @click.stop>
        <view
          v-for="item in sortOptions"
          :key="item.value"
          class="sort-menu-item"
          :class="{ active: sortField === item.value && sortOrder === item.order }"
          @click="selectSort(item.value, item.order)"
        >
          <text class="sort-menu-text">{{ item.label }}</text>
          <text v-if="sortField === item.value && sortOrder === item.order" class="sort-menu-check">✓</text>
        </view>
      </view>

      <!-- 遮罩层 -->
      <view v-if="showGenderMenu || showRelationMenu || showSortMenu" class="menu-mask" @click="closeAllMenus"></view>
    </view>

    <!-- 数据统计按钮 -->
    <view class="stats-toggle-bar" v-if="allPatients.length > 0">
      <view class="stats-toggle-btn" @click="toggleStats">
        <uni-icons :type="showStats ? 'arrowup' : 'arrowdown'" size="16" color="#4A90E2"></uni-icons>
        <text class="stats-toggle-text">{{ showStats ? '隐藏统计' : '显示统计' }}</text>
      </view>
    </view>

    <!-- 数据可视化区域 -->
    <view v-if="showStats && allPatients.length > 0" class="stats-section">
      <!-- 统计卡片 -->
      <view class="stats-cards">
        <view class="stat-card">
          <text class="stat-label">总患者数</text>
          <text class="stat-value">{{ allPatients.length }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">男性</text>
          <text class="stat-value male">{{ statistics.gender.male }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">女性</text>
          <text class="stat-value female">{{ statistics.gender.female }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">平均年龄</text>
          <text class="stat-value">{{ statistics.averageAge }}</text>
        </view>
      </view>

      <!-- 性别分布图表 -->
      <view class="chart-card">
        <view class="chart-title">
          <text>性别分布</text>
        </view>
        <view class="chart-content">
          <view class="pie-chart-container">
            <view class="gender-progress">
              <view class="gender-progress-item">
                <view class="gender-progress-bar">
                  <view class="gender-progress-fill male-fill" :style="{ width: statistics.gender.malePercent + '%' }"></view>
                </view>
                <view class="gender-progress-label">
                  <view class="gender-color-dot" style="background-color: #4A90E2;"></view>
                  <text>男性 {{ statistics.gender.malePercent }}%</text>
                </view>
              </view>
              <view class="gender-progress-item">
                <view class="gender-progress-bar">
                  <view class="gender-progress-fill female-fill" :style="{ width: statistics.gender.femalePercent + '%' }"></view>
                </view>
                <view class="gender-progress-label">
                  <view class="gender-color-dot" style="background-color: #FF6B9D;"></view>
                  <text>女性 {{ statistics.gender.femalePercent }}%</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 年龄分布图表 -->
      <view class="chart-card">
        <view class="chart-title">
          <text>年龄分布</text>
        </view>
        <view class="chart-content">
          <view class="age-distribution">
            <view 
              v-for="(item, index) in statistics.ageGroups" 
              :key="index"
              class="age-group-item"
            >
              <view class="age-group-label">
                <text>{{ item.label }}</text>
                <text class="age-group-count">{{ item.count }}人</text>
              </view>
              <view class="age-group-bar">
                <view 
                  class="age-group-fill" 
                  :style="{ width: item.percent + '%', backgroundColor: item.color }"
                ></view>
              </view>
              <text class="age-group-percent">{{ item.percent }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 关系分布图表 -->
      <view class="chart-card">
        <view class="chart-title">
          <text>关系分布</text>
        </view>
        <view class="chart-content">
          <view class="relation-distribution">
            <view 
              v-for="(item, index) in statistics.relations" 
              :key="index"
              class="relation-item"
            >
              <view class="relation-label-row">
                <text class="relation-label">{{ item.relation || '未设置' }}</text>
                <text class="relation-count">{{ item.count }}人 ({{ item.percent }}%)</text>
              </view>
              <view class="relation-bar">
                <view 
                  class="relation-fill" 
                  :style="{ width: item.percent + '%', backgroundColor: getRelationColor(item.relation) }"
                ></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 就诊人列表 -->
    <view class="content">
      <view v-if="allPatients.length === 0" class="empty-state">
        <view class="empty-icon">👤</view>
        <text class="empty-text">暂无就诊人</text>
        <text class="empty-hint">点击下方按钮添加就诊人</text>
      </view>

      <view v-else-if="filteredPatients.length === 0" class="empty-state">
        <view class="empty-icon">🔍</view>
        <text class="empty-text">未找到匹配的就诊人</text>
        <text class="empty-hint">请尝试修改搜索条件</text>
        <view class="clear-search-btn" @click="clearAllFiltersAndSearch">
          <text>清除筛选条件</text>
        </view>
      </view>

      <view v-else class="patient-list">
        <!-- 全选栏 -->
        <view v-if="isSelectMode" class="select-all-bar">
          <view class="select-all-checkbox" @click="toggleSelectAll">
            <uni-icons 
              :type="isAllSelected ? 'checkbox-filled' : 'checkbox'" 
              size="20" 
              :color="isAllSelected ? '#4A90E2' : '#999'"
            ></uni-icons>
            <text class="select-all-text">全选 ({{ selectedPatients.length }}/{{ filteredPatients.length }})</text>
          </view>
        </view>

        <view
          v-for="patient in filteredPatients"
          :key="patient.id"
          class="patient-card"
          :class="{ 'select-mode': isSelectMode, 'selected': isSelected(patient.id) }"
          @click="isSelectMode ? toggleSelection(patient.id) : editPatient(patient.id)"
        >
          <!-- 选择框 -->
          <view v-if="isSelectMode" class="patient-select-checkbox">
            <uni-icons 
              :type="isSelected(patient.id) ? 'checkbox-filled' : 'checkbox'" 
              size="24" 
              :color="isSelected(patient.id) ? '#4A90E2' : '#999'"
            ></uni-icons>
          </view>

          <view class="patient-header">
            <view class="patient-info">
              <text class="patient-name">{{ patient.name }}</text>
              <view class="patient-tags">
                <text class="tag">{{ patient.gender }}</text>
                <text class="tag">{{ patient.age }}岁</text>
                <text v-if="patient.relation" class="tag relation">{{ patient.relation }}</text>
              </view>
            </view>
            <view class="patient-actions">
              <view
                class="action-btn"
                @click.stop="setAsDefault(patient.id)"
                v-if="defaultPatientId !== patient.id"
              >
                <text class="action-text">设为默认</text>
              </view>
              <view v-else class="default-badge">
                <text>默认</text>
              </view>
            </view>
          </view>
          <view class="patient-details">
            <view v-if="patient.idCard" class="detail-item">
              <text class="detail-label">身份证：</text>
              <text class="detail-value">{{ formatIdCard(patient.idCard) }}</text>
            </view>
            <view v-if="patient.phone" class="detail-item">
              <text class="detail-label">手机号：</text>
              <text class="detail-value">{{ formatPhone(patient.phone) }}</text>
            </view>
          </view>
          <view class="patient-footer">
            <view class="edit-btn" @click.stop="editPatient(patient.id)">
              <uni-icons type="compose" size="16" color="#4A90E2"></uni-icons>
              <text>编辑</text>
            </view>
            <view class="delete-btn" @click.stop="deletePatient(patient.id)">
              <uni-icons type="trash" size="16" color="#ff4d4f"></uni-icons>
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view v-if="isSelectMode" class="batch-action-bar">
      <view class="batch-action-info">
        <text class="batch-action-text">已选择 {{ selectedPatients.length }} 项</text>
      </view>
      <view class="batch-action-buttons">
        <view class="batch-action-btn delete" @click="batchDelete" v-if="selectedPatients.length > 0">
          <uni-icons type="trash" size="18" color="#ffffff"></uni-icons>
          <text>删除</text>
        </view>
        <view class="batch-action-btn export" @click="batchExport" v-if="selectedPatients.length > 0">
          <uni-icons type="download" size="18" color="#ffffff"></uni-icons>
          <text>导出</text>
        </view>
      </view>
    </view>

    <!-- 添加按钮 -->
    <view class="add-button-container" :class="{ 'with-batch-bar': isSelectMode }">
      <view class="action-buttons-row">
        <button class="add-button secondary import-btn" @click="showImportMenu">
          <uni-icons type="upload" size="20" color="#4A90E2"></uni-icons>
          <text>导入</text>
        </button>
        <button class="add-button secondary export-btn" @click="exportAllPatients">
          <uni-icons type="download" size="20" color="#4A90E2"></uni-icons>
          <text>导出</text>
        </button>
      </view>
      <button class="add-button secondary" @click="addSamplePatients" style="margin-bottom: 20rpx; margin-top: 0;">
        <uni-icons type="plus" size="20" color="#4A90E2"></uni-icons>
        <text>添加14条数据到后端</text>
      </button>
      <button class="add-button" @click="addPatient">
        <uni-icons type="plus" size="20" color="#ffffff"></uni-icons>
        <text>添加就诊人</text>
      </button>
    </view>

    <!-- 导入菜单 -->
    <view v-if="showImportPopup" class="import-popup" @click.stop>
      <view class="import-popup-content">
        <view class="import-popup-header">
          <text class="import-popup-title">导入患者数据</text>
          <view class="import-popup-close" @click="closeImportMenu">
            <uni-icons type="close" size="20" color="#999"></uni-icons>
          </view>
        </view>
        <view class="import-popup-body">
          <view class="import-tip">
            <text>支持CSV格式文件，请确保文件包含以下字段：</text>
            <text class="import-tip-field">姓名（必需）、性别、年龄、手机号、身份证号、关系</text>
          </view>
          <button class="import-button" @click="chooseImportFile">
            <uni-icons type="folder" size="20" color="#4A90E2"></uni-icons>
            <text>选择文件</text>
          </button>
        </view>
      </view>
      <view class="import-popup-mask" @click="closeImportMenu"></view>
    </view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { getPatients, deletePatient as deletePatientById, setDefaultPatient, getDefaultPatient, savePatient } from '@/utils/patientStorage.js';
import { post } from '@/utils/api.js';

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      theme: getCurrentTheme(),
      allPatients: [], // 所有患者数据
      defaultPatientId: null,
      // 搜索相关
      searchKeyword: '',
      // 筛选相关
      filterGender: '',
      filterRelation: '',
      showGenderMenu: false,
      showRelationMenu: false,
      genderOptions: ['男', '女'],
      relationOptions: ['本人', '配偶', '父亲', '母亲', '儿子', '女儿', '其他'],
      // 排序相关
      sortField: '', // 排序字段：name, age, createdAt
      sortOrder: 'asc', // 排序顺序：asc, desc
      showSortMenu: false,
      // 批量操作相关
      isSelectMode: false, // 是否处于选择模式
      selectedPatients: [], // 选中的患者ID列表
      // 导入导出相关
      showImportPopup: false, // 是否显示导入弹窗
      sortOptions: [
        { label: '按姓名 A-Z', value: 'name', order: 'asc' },
        { label: '按姓名 Z-A', value: 'name', order: 'desc' },
        { label: '按年龄 从小到大', value: 'age', order: 'asc' },
        { label: '按年龄 从大到小', value: 'age', order: 'desc' },
        { label: '按添加时间 最新', value: 'createdAt', order: 'desc' },
        { label: '按添加时间 最早', value: 'createdAt', order: 'asc' },
        { label: '默认排序', value: '', order: 'asc' }
      ]
    };
  },
  computed: {
    // 过滤后的患者列表
    filteredPatients() {
      let patients = [...this.allPatients];

      // 搜索过滤
      if (this.searchKeyword && this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase();
        patients = patients.filter(patient => {
          const nameMatch = patient.name && patient.name.toLowerCase().includes(keyword);
          const phoneMatch = patient.phone && patient.phone.includes(keyword);
          const idCardMatch = patient.idCard && patient.idCard.includes(keyword);
          return nameMatch || phoneMatch || idCardMatch;
        });
      }

      // 性别筛选
      if (this.filterGender) {
        patients = patients.filter(patient => patient.gender === this.filterGender);
      }

      // 关系筛选
      if (this.filterRelation) {
        patients = patients.filter(patient => patient.relation === this.filterRelation);
      }

      // 排序
      if (this.sortField) {
        patients.sort((a, b) => {
          let aValue = a[this.sortField] || '';
          let bValue = b[this.sortField] || '';

          // 处理日期字符串
          if (this.sortField === 'createdAt') {
            aValue = new Date(aValue).getTime() || 0;
            bValue = new Date(bValue).getTime() || 0;
          }

          // 处理数字
          if (this.sortField === 'age') {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
          }

          // 处理字符串
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
          }
          if (typeof bValue === 'string') {
            bValue = bValue.toLowerCase();
          }

          if (this.sortOrder === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }
        });
      } else {
        // 默认排序：默认就诊人优先，然后按创建时间倒序
        patients.sort((a, b) => {
          const aIsDefault = a.id === this.defaultPatientId;
          const bIsDefault = b.id === this.defaultPatientId;
          if (aIsDefault && !bIsDefault) return -1;
          if (!aIsDefault && bIsDefault) return 1;
          
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
      }

      return patients;
    },
    // 排序文本显示
    sortText() {
      const option = this.sortOptions.find(
        opt => opt.value === this.sortField && opt.order === this.sortOrder
      );
      return option ? option.label : '排序';
    },
    // 是否全选
    isAllSelected() {
      return this.filteredPatients.length > 0 && 
             this.selectedPatients.length === this.filteredPatients.length;
    }
  },
  watch: {
    // 监听患者数据变化，更新统计
    allPatients: {
      handler() {
        this.updateStatistics();
      },
      immediate: true
    },
    // 监听统计显示状态
    showStats(newVal) {
      // 统计面板显示时，数据已经通过watch自动更新
    }
  },
  onShow() {
    this.loadPatients();
    uni.$on('themeChange', this.updateTheme);
    uni.$on('patientUpdated', this.loadPatients);
    this.updateTheme();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
    uni.$off('patientUpdated', this.loadPatients);
  },
  methods: {
    updateTheme(theme) {
      try {
        this.theme = theme || getCurrentTheme();
      } catch (e) {
        console.warn('主题更新失败:', e);
        this.theme = getCurrentTheme();
      }
    },
    loadPatients() {
      this.allPatients = getPatients();
      const defaultPatient = getDefaultPatient();
      this.defaultPatientId = defaultPatient ? defaultPatient.id : null;
    },
    goBack() {
      uni.navigateBack();
    },
    addPatient() {
      uni.navigateTo({
        url: '/pages/mine/patient-edit'
      });
    },
    editPatient(patientId) {
      uni.navigateTo({
        url: `/pages/mine/patient-edit?id=${patientId}`
      });
    },
    setAsDefault(patientId) {
      setDefaultPatient(patientId);
      this.loadPatients();
      uni.showToast({
        title: '已设为默认',
        icon: 'success'
      });
    },
    deletePatient(patientId) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该就诊人吗？删除后无法恢复。',
        success: (res) => {
          if (res.confirm) {
            try {
              deletePatientById(patientId);
              this.loadPatients();
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (e) {
              console.error('删除就诊人失败:', e);
              uni.showToast({
                title: '删除失败，请重试',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    formatIdCard(idCard) {
      if (!idCard) return '';
      if (idCard.length === 18) {
        return idCard.substring(0, 6) + '********' + idCard.substring(14);
      }
      return idCard;
    },
    formatPhone(phone) {
      if (!phone) return '';
      if (phone.length === 11) {
        return phone.substring(0, 3) + '****' + phone.substring(7);
      }
      return phone;
    },
    async addSamplePatients() {
      // 14条真实的患者数据（将通过API传到后端）
      const samplePatients = [
        { name: '张明', gender: '男', age: 32, phone: '13800138001', idCard: '110101199001011234', relation: '本人' },
        { name: '李芳', gender: '女', age: 28, phone: '13800138002', idCard: '110101199205152345', relation: '配偶' },
        { name: '王强', gender: '男', age: 65, phone: '13800138003', idCard: '110101195807203456', relation: '父亲' },
        { name: '赵丽', gender: '女', age: 62, phone: '13800138004', idCard: '110101196102254567', relation: '母亲' },
        { name: '刘小华', gender: '男', age: 8, phone: '13800138005', idCard: '110101201512156789', relation: '儿子' },
        { name: '陈静', gender: '女', age: 35, phone: '13800138006', idCard: '110101198805208901', relation: '本人' },
        { name: '杨波', gender: '男', age: 41, phone: '13800138007', idCard: '110101198207123012', relation: '本人' },
        { name: '周娟', gender: '女', age: 29, phone: '13800138008', idCard: '110101199311074523', relation: '本人' },
        { name: '吴建国', gender: '男', age: 58, phone: '13800138009', idCard: '110101196403185634', relation: '父亲' },
        { name: '徐秀英', gender: '女', age: 55, phone: '13800138010', idCard: '110101196811227845', relation: '母亲' },
        { name: '孙小美', gender: '女', age: 12, phone: '13800138011', idCard: '110101201104039056', relation: '女儿' },
        { name: '马军', gender: '男', age: 45, phone: '13800138012', idCard: '110101197708161267', relation: '本人' },
        { name: '朱丽', gender: '女', age: 38, phone: '13800138013', idCard: '110101198503224578', relation: '本人' },
        { name: '胡强', gender: '男', age: 26, phone: '13800138014', idCard: '110101199708038901', relation: '本人' }
      ];
      
      uni.showLoading({
        title: '正在添加数据...',
        mask: true
      });
      
      let successCount = 0;
      let failCount = 0;
      
      try {
        // 依次添加每条数据到后端
        for (let i = 0; i < samplePatients.length; i++) {
          const patient = samplePatients[i];
          try {
            // 调用后端API添加患者
            const response = await post('/api/patients', patient, {
              showLoading: false,
              showError: false
            });
            
            if (response && response.success) {
              successCount++;
              console.log(`✅ 成功添加患者: ${patient.name}`);
            } else {
              failCount++;
              console.error(`❌ 添加患者失败: ${patient.name}`, response?.message || '未知错误');
            }
            
            // 添加延迟，避免请求过快
            if (i < samplePatients.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            failCount++;
            console.error(`❌ 添加患者异常: ${patient.name}`, error);
          }
        }
        
        uni.hideLoading();
        
        // 显示结果
        if (successCount > 0) {
          uni.showToast({
            title: `成功添加 ${successCount} 条数据${failCount > 0 ? `，${failCount} 条失败` : ''}`,
            icon: successCount === samplePatients.length ? 'success' : 'none',
            duration: 2000
          });
        } else {
          uni.showToast({
            title: '添加失败，请检查网络连接',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        uni.hideLoading();
        console.error('添加患者数据失败:', error);
        uni.showToast({
          title: '添加数据失败，请重试',
          icon: 'none'
        });
      }
    },
    // 搜索相关方法
    handleSearch() {
      // 实时搜索，不需要额外处理，computed会自动更新
    },
    clearSearch() {
      this.searchKeyword = '';
    },
    // 筛选相关方法
    toggleGenderFilter() {
      this.showGenderMenu = !this.showGenderMenu;
      this.showRelationMenu = false;
      this.showSortMenu = false;
    },
    toggleRelationFilter() {
      this.showRelationMenu = !this.showRelationMenu;
      this.showGenderMenu = false;
      this.showSortMenu = false;
    },
    selectGender(gender) {
      this.filterGender = this.filterGender === gender ? '' : gender;
      this.showGenderMenu = false;
    },
    selectRelation(relation) {
      this.filterRelation = this.filterRelation === relation ? '' : relation;
      this.showRelationMenu = false;
    },
    clearAllFilters() {
      this.filterGender = '';
      this.filterRelation = '';
      this.closeAllMenus();
    },
    clearAllFiltersAndSearch() {
      this.searchKeyword = '';
      this.filterGender = '';
      this.filterRelation = '';
      this.closeAllMenus();
    },
    // 排序相关方法
    toggleSortMenu() {
      this.showSortMenu = !this.showSortMenu;
      this.showGenderMenu = false;
      this.showRelationMenu = false;
    },
    selectSort(field, order) {
      this.sortField = field;
      this.sortOrder = order;
      this.showSortMenu = false;
    },
    // 关闭所有菜单
    closeAllMenus() {
      this.showGenderMenu = false;
      this.showRelationMenu = false;
      this.showSortMenu = false;
    },
    // 数据统计相关方法
    toggleStats() {
      this.showStats = !this.showStats;
    },
    updateStatistics() {
      const patients = this.allPatients;
      if (patients.length === 0) {
        this.statistics = {
          gender: { male: 0, female: 0, malePercent: 0, femalePercent: 0 },
          averageAge: 0,
          ageGroups: [],
          relations: []
        };
        return;
      }

      // 性别统计
      const maleCount = patients.filter(p => p.gender === '男').length;
      const femaleCount = patients.filter(p => p.gender === '女').length;
      const totalGender = maleCount + femaleCount;
      
      this.statistics.gender = {
        male: maleCount,
        female: femaleCount,
        malePercent: totalGender > 0 ? Math.round((maleCount / totalGender) * 100) : 0,
        femalePercent: totalGender > 0 ? Math.round((femaleCount / totalGender) * 100) : 0
      };

      // 年龄统计
      const ages = patients.map(p => parseInt(p.age)).filter(age => !isNaN(age) && age > 0);
      this.statistics.averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

      // 年龄分组
      const ageGroups = [
        { label: '0-18岁', min: 0, max: 18, color: '#FFB74D', count: 0 },
        { label: '19-30岁', min: 19, max: 30, color: '#4A90E2', count: 0 },
        { label: '31-50岁', min: 31, max: 50, color: '#66BB6A', count: 0 },
        { label: '51-65岁', min: 51, max: 65, color: '#FFA726', count: 0 },
        { label: '65岁以上', min: 66, max: 999, color: '#EF5350', count: 0 }
      ];

      ages.forEach(age => {
        const group = ageGroups.find(g => age >= g.min && age <= g.max);
        if (group) group.count++;
      });

      ageGroups.forEach(group => {
        group.percent = ages.length > 0 ? Math.round((group.count / ages.length) * 100) : 0;
      });

      this.statistics.ageGroups = ageGroups;

      // 关系统计
      const relationMap = {};
      patients.forEach(p => {
        const relation = p.relation || '未设置';
        relationMap[relation] = (relationMap[relation] || 0) + 1;
      });

      const relations = Object.keys(relationMap).map(relation => ({
        relation,
        count: relationMap[relation],
        percent: Math.round((relationMap[relation] / patients.length) * 100)
      })).sort((a, b) => b.count - a.count);

      this.statistics.relations = relations;
    },
    getRelationColor(relation) {
      const colors = {
        '本人': '#4A90E2',
        '配偶': '#FF6B9D',
        '父亲': '#66BB6A',
        '母亲': '#FFA726',
        '儿子': '#AB47BC',
        '女儿': '#EC407A',
        '其他': '#78909C',
        '未设置': '#BDBDBD'
      };
      return colors[relation] || '#78909C';
    },
    // 批量操作相关方法
    toggleSelectMode() {
      this.isSelectMode = !this.isSelectMode;
      if (!this.isSelectMode) {
        this.selectedPatients = [];
      }
    },
    toggleSelection(patientId) {
      const index = this.selectedPatients.indexOf(patientId);
      if (index > -1) {
        this.selectedPatients.splice(index, 1);
      } else {
        this.selectedPatients.push(patientId);
      }
    },
    isSelected(patientId) {
      return this.selectedPatients.indexOf(patientId) > -1;
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        // 取消全选：移除当前过滤列表中的所有患者
        const filteredIds = this.filteredPatients.map(p => p.id);
        this.selectedPatients = this.selectedPatients.filter(id => !filteredIds.includes(id));
      } else {
        // 全选：添加当前过滤列表中的所有患者
        const filteredIds = this.filteredPatients.map(p => p.id);
        filteredIds.forEach(id => {
          if (this.selectedPatients.indexOf(id) === -1) {
            this.selectedPatients.push(id);
          }
        });
      }
    },
    batchDelete() {
      if (this.selectedPatients.length === 0) {
        uni.showToast({
          title: '请至少选择一个患者',
          icon: 'none'
        });
        return;
      }
      
      uni.showModal({
        title: '确认删除',
        content: `确定要删除选中的 ${this.selectedPatients.length} 个就诊人吗？删除后无法恢复。`,
        success: (res) => {
          if (res.confirm) {
            try {
              let successCount = 0;
              let failCount = 0;
              
              this.selectedPatients.forEach(patientId => {
                try {
                  deletePatientById(patientId);
                  successCount++;
                } catch (e) {
                  console.error('删除就诊人失败:', e);
                  failCount++;
                }
              });
              
              this.selectedPatients = [];
              this.isSelectMode = false;
              this.loadPatients();
              
              uni.showToast({
                title: `成功删除 ${successCount} 个${failCount > 0 ? `，${failCount} 个失败` : ''}`,
                icon: successCount > 0 ? 'success' : 'none',
                duration: 2000
              });
            } catch (e) {
              console.error('批量删除失败:', e);
              uni.showToast({
                title: '批量删除失败，请重试',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    batchExport() {
      if (this.selectedPatients.length === 0) {
        uni.showToast({
          title: '请至少选择一个患者',
          icon: 'none'
        });
        return;
      }
      
      const patientsToExport = this.allPatients.filter(p => this.selectedPatients.includes(p.id));
      this.exportPatients(patientsToExport, `患者列表_选中${this.selectedPatients.length}项`);
    },
    // 导入导出相关方法
    showImportMenu() {
      this.showImportPopup = true;
    },
    closeImportMenu() {
      this.showImportPopup = false;
    },
    chooseImportFile() {
      // #ifdef H5
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importCSVFile(file);
        }
      };
      input.click();
      // #endif
      
      // #ifndef H5
      uni.showToast({
        title: '当前环境不支持文件选择',
        icon: 'none'
      });
      // #endif
    },
    importCSVFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            uni.showToast({
              title: 'CSV文件格式错误，至少需要包含表头和一行数据',
              icon: 'none'
            });
            return;
          }
          
          // 解析CSV（简单版本，处理逗号分隔和引号）
          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };
          
          // 解析表头
          const headers = parseCSVLine(lines[0]);
          const headerMap = {};
          headers.forEach((header, index) => {
            headerMap[header.trim()] = index;
          });
          
          // 字段映射
          const fieldMap = {
            '姓名': 'name', '名字': 'name', 'name': 'name',
            '性别': 'gender', 'gender': 'gender',
            '年龄': 'age', 'age': 'age',
            '电话': 'phone', '手机': 'phone', '手机号': 'phone', 'phone': 'phone',
            '身份证': 'idCard', '身份证号': 'idCard', 'idCard': 'idCard',
            '关系': 'relation', 'relation': 'relation'
          };
          
          // 解析数据行
          const patientsToImport = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            const patient = {};
            Object.keys(headerMap).forEach(headerKey => {
              const fieldKey = fieldMap[headerKey] || headerKey.toLowerCase();
              const valueIndex = headerMap[headerKey];
              if (valueIndex < values.length) {
                let value = values[valueIndex]?.trim();
                if (value && fieldKey === 'age') {
                  const age = parseInt(value);
                  if (!isNaN(age)) patient[fieldKey] = age;
                } else if (value) {
                  patient[fieldKey] = value;
                }
              }
            });
            
            if (patient.name) {
              patientsToImport.push(patient);
            }
          }
          
          if (patientsToImport.length === 0) {
            uni.showToast({
              title: 'CSV文件中没有有效的数据行',
              icon: 'none'
            });
            return;
          }
          
          // 确认导入
          uni.showModal({
            title: '确认导入',
            content: `将要导入 ${patientsToImport.length} 条数据，是否继续？`,
            success: (res) => {
              if (res.confirm) {
                this.doImport(patientsToImport);
              }
            }
          });
        } catch (error) {
          console.error('解析CSV文件失败:', error);
          uni.showToast({
            title: '解析文件失败，请检查文件格式',
            icon: 'none'
          });
        }
      };
      
      reader.onerror = () => {
        uni.showToast({
          title: '读取文件失败',
          icon: 'none'
        });
      };
      
      reader.readAsText(file, 'UTF-8');
      this.closeImportMenu();
    },
    async doImport(patientsToImport) {
      uni.showLoading({
        title: '正在导入...',
        mask: true
      });
      
      let successCount = 0;
      let failCount = 0;
      
      try {
        for (let i = 0; i < patientsToImport.length; i++) {
          const patient = patientsToImport[i];
          try {
            savePatient(patient);
            successCount++;
          } catch (e) {
            console.error('导入患者失败:', e);
            failCount++;
          }
        }
        
        uni.hideLoading();
        
        uni.showModal({
          title: '导入完成',
          content: `成功: ${successCount} 条\n失败: ${failCount} 条`,
          showCancel: false,
          success: () => {
            this.loadPatients();
            uni.$emit('patientUpdated');
          }
        });
      } catch (error) {
        uni.hideLoading();
        console.error('导入失败:', error);
        uni.showToast({
          title: '导入失败，请重试',
          icon: 'none'
        });
      }
    },
    exportAllPatients() {
      if (this.allPatients.length === 0) {
        uni.showToast({
          title: '暂无数据可导出',
          icon: 'none'
        });
        return;
      }
      
      this.exportPatients(this.allPatients, '患者列表_全部');
    },
    exportPatients(patients, fileName = '患者列表') {
      // 准备导出数据
      const exportData = patients.map(patient => ({
        '姓名': patient.name || '-',
        '性别': patient.gender || '-',
        '年龄': patient.age ? String(patient.age) : '-',
        '手机号': patient.phone || '-',
        '身份证号': patient.idCard || '-',
        '关系': patient.relation || '-'
      }));
      
      // 转换为CSV格式
      const headers = ['姓名', '性别', '年龄', '手机号', '身份证号', '关系'];
      const csvRows = [headers.join(',')];
      
      exportData.forEach(row => {
        const values = headers.map(header => {
          let value = row[header] || '';
          // 处理包含逗号、引号或换行的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          } else {
            value = `"${value}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const BOM = '\uFEFF'; // UTF-8 BOM，确保Excel正确显示中文
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // #ifdef H5
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      uni.showToast({
        title: '导出成功',
        icon: 'success'
      });
      // #endif
      
      // #ifndef H5
      // 非H5环境，使用uni.downloadFile
      // 注意：uni.downloadFile需要服务器URL，这里提示用户
      uni.showModal({
        title: '提示',
        content: '导出功能在当前环境下需要使用文件服务。建议使用H5环境或通过服务器导出。',
        showCancel: false
      });
      // #endif
    }
  }
};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

.header {
  background-color: var(--card-bg);
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 30rpx;
  position: relative;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.nav-placeholder {
  width: 60rpx;
}

.nav-right {
  display: flex;
  align-items: center;
}

.nav-btn {
  padding: 8rpx 20rpx;
  background-color: rgba(74, 144, 226, 0.1);
  border-radius: 20rpx;
  
  .nav-btn-text {
    font-size: 26rpx;
    color: var(--primary-color);
  }
}

/* 搜索框样式 */
.search-container {
  padding: 20rpx 30rpx;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

.search-box {
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 24rpx;
  background-color: var(--card-bg);
  border-radius: 36rpx;
  border: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.search-input {
  flex: 1;
  height: 100%;
  margin-left: 16rpx;
  font-size: 28rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
}

/* 筛选和排序栏样式 */
.filter-sort-bar {
  position: relative;
  background-color: var(--bg-color);
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.filter-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  gap: 20rpx;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: var(--card-bg);
  border-radius: 32rpx;
  border: 1rpx solid var(--border-color);
  transition: all 0.3s ease;
  
  &.active {
    background-color: rgba(74, 144, 226, 0.1);
    border-color: var(--primary-color);
    
    .filter-text {
      color: var(--primary-color);
    }
    
    .filter-arrow {
      color: var(--primary-color);
    }
  }
  
  &.clear-filter {
    background-color: rgba(255, 77, 77, 0.1);
    border-color: #ff4d4f;
    
    .filter-text {
      color: #ff4d4f;
    }
  }
}

.filter-text {
  font-size: 26rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.filter-arrow {
  font-size: 20rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
}

.sort-bar {
  padding: 0 30rpx 20rpx;
}

.sort-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: var(--card-bg);
  border-radius: 32rpx;
  border: 1rpx solid var(--border-color);
  transition: all 0.3s ease;
  width: fit-content;
  margin-left: auto;
}

.sort-text {
  font-size: 26rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.sort-arrow {
  font-size: 20rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
}

/* 筛选菜单样式 */
.filter-menu,
.sort-menu {
  position: absolute;
  top: 100%;
  left: 30rpx;
  right: 30rpx;
  background-color: var(--card-bg);
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx var(--shadow-color);
  z-index: 100;
  max-height: 600rpx;
  overflow-y: auto;
  margin-top: 8rpx;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.sort-menu {
  left: auto;
  right: 30rpx;
  min-width: 280rpx;
}

.filter-menu-item,
.sort-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.active {
    background-color: rgba(74, 144, 226, 0.1);
    
    .filter-menu-text,
    .sort-menu-text {
      color: var(--primary-color);
    }
    
    .filter-menu-check,
    .sort-menu-check {
      color: var(--primary-color);
    }
  }
  
  &:active {
    background-color: rgba(74, 144, 226, 0.15);
  }
}

.filter-menu-text,
.sort-menu-text {
  font-size: 28rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.filter-menu-check,
.sort-menu-check {
  font-size: 28rpx;
  color: var(--primary-color);
  font-weight: bold;
}

.menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 99;
}

/* 数据统计相关样式 */
.stats-toggle-bar {
  padding: 20rpx 30rpx;
  background-color: var(--bg-color);
  border-bottom: 1rpx solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.stats-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: var(--card-bg);
  border-radius: 32rpx;
  border: 1rpx solid var(--border-color);
  transition: all 0.3s ease;
  width: fit-content;
  margin: 0 auto;
}

.stats-toggle-text {
  font-size: 26rpx;
  color: var(--primary-color);
}

.stats-section {
  padding: 30rpx;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.stat-label {
  font-size: 26rpx;
  color: var(--text-color-secondary);
  margin-bottom: 16rpx;
  transition: color 0.3s ease;
}

.stat-value {
  font-size: 48rpx;
  font-weight: 600;
  color: var(--primary-color);
  transition: color 0.3s ease;
  
  &.male {
    color: #4A90E2;
  }
  
  &.female {
    color: #FF6B9D;
  }
}

.chart-card {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.chart-title {
  margin-bottom: 30rpx;
  
  text {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--text-color);
    transition: color 0.3s ease;
  }
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.pie-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.pie-chart-canvas {
  width: 300px;
  height: 300px;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.legend-color {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
}

.legend-text {
  font-size: 28rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.age-distribution {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.age-group-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.age-group-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  text {
    font-size: 28rpx;
    color: var(--text-color);
    transition: color 0.3s ease;
  }
  
  .age-group-count {
    font-size: 24rpx;
    color: var(--text-color-secondary);
    transition: color 0.3s ease;
  }
}

.age-group-bar {
  width: 100%;
  height: 32rpx;
  background-color: var(--bg-color);
  border-radius: 16rpx;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.age-group-fill {
  height: 100%;
  border-radius: 16rpx;
  transition: width 0.5s ease;
}

.age-group-percent {
  font-size: 24rpx;
  color: var(--text-color-secondary);
  align-self: flex-end;
  transition: color 0.3s ease;
}

.relation-distribution {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.relation-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.relation-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.relation-label {
  font-size: 28rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.relation-count {
  font-size: 24rpx;
  color: var(--text-color-secondary);
  transition: color 0.3s ease;
}

.relation-bar {
  width: 100%;
  height: 32rpx;
  background-color: var(--bg-color);
  border-radius: 16rpx;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.relation-fill {
  height: 100%;
  border-radius: 16rpx;
  transition: width 0.5s ease;
}

.content {
  padding: 30rpx;
  padding-bottom: 160rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
    opacity: 0.5;
  }
  
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
  
  .clear-search-btn {
    margin-top: 40rpx;
    padding: 20rpx 40rpx;
    background-color: var(--primary-color);
    border-radius: 40rpx;
    
    text {
      font-size: 28rpx;
      color: #ffffff;
    }
  }
}

.patient-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 全选栏样式 */
.select-all-bar {
  padding: 20rpx 30rpx;
  background-color: var(--card-bg);
  border-radius: 16rpx;
  margin-bottom: 10rpx;
  transition: background-color 0.3s ease;
}

.select-all-checkbox {
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  .select-all-text {
    font-size: 28rpx;
    color: var(--text-color);
    transition: color 0.3s ease;
  }
}

.patient-card {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  
  &.select-mode {
    padding-left: 80rpx;
  }
  
  &.selected {
    background-color: rgba(74, 144, 226, 0.05);
    border: 2rpx solid var(--primary-color);
  }
}

.patient-select-checkbox {
  position: absolute;
  left: 30rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.patient-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.patient-info {
  flex: 1;
}

.patient-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12rpx;
  display: block;
  transition: color 0.3s ease;
}

.patient-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  background-color: var(--bg-color);
  border-radius: 20rpx;
  font-size: 22rpx;
  color: var(--text-color-secondary);
  transition: background-color 0.3s ease, color 0.3s ease;
  
  &.relation {
    background-color: rgba(74, 144, 226, 0.1);
    color: var(--primary-color);
  }
}

.patient-actions {
  display: flex;
  align-items: center;
}

.action-btn {
  padding: 8rpx 20rpx;
  background-color: rgba(74, 144, 226, 0.1);
  border-radius: 20rpx;
  
  .action-text {
    font-size: 24rpx;
    color: var(--primary-color);
  }
}

.default-badge {
  padding: 8rpx 20rpx;
  background-color: var(--primary-color);
  border-radius: 20rpx;
  
  text {
    font-size: 24rpx;
    color: #ffffff;
  }
}

.patient-details {
  margin-bottom: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--border-color);
  transition: border-color 0.3s ease;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.detail-label {
  font-size: 26rpx;
  color: var(--text-color-secondary);
  margin-right: 12rpx;
  transition: color 0.3s ease;
}

.detail-value {
  font-size: 26rpx;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.patient-footer {
  display: flex;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--border-color);
  transition: border-color 0.3s ease;
}

.edit-btn,
.delete-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 64rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  
  text {
    color: var(--text-color);
    transition: color 0.3s ease;
  }
}

.edit-btn {
  background-color: rgba(74, 144, 226, 0.1);
  
  text {
    color: var(--primary-color);
  }
}

.delete-btn {
  background-color: rgba(255, 77, 77, 0.1);
  
  text {
    color: #ff4d4f;
  }
}

/* 批量操作栏样式 */
.batch-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: var(--card-bg);
  box-shadow: 0 -4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-action-info {
  flex: 1;
  
  .batch-action-text {
    font-size: 28rpx;
    color: var(--text-color);
    transition: color 0.3s ease;
  }
}

.batch-action-buttons {
  display: flex;
  gap: 20rpx;
}

.batch-action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  
  text {
    color: #ffffff;
  }
  
  &.delete {
    background-color: #ff4d4f;
  }
  
  &.export {
    background-color: var(--primary-color);
  }
}

.add-button-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: var(--bg-color);
  box-shadow: 0 -4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  
  &.with-batch-bar {
    padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  }
}

.action-buttons-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.action-buttons-row .add-button {
  flex: 1;
  margin-bottom: 0;
}

.add-button {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  
  &.secondary {
    background-color: #ffffff;
    color: #4A90E2;
    border: 1rpx solid #4A90E2;
  }
}

/* 导入弹窗样式 */
.import-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.import-popup-content {
  position: relative;
  width: 600rpx;
  max-width: 90%;
  background-color: var(--card-bg);
  border-radius: 24rpx;
  padding: 40rpx;
  z-index: 1001;
  transition: background-color 0.3s ease;
}

.import-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30rpx;
  
  .import-popup-title {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--text-color);
    transition: color 0.3s ease;
  }
  
  .import-popup-close {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--bg-color);
    transition: background-color 0.3s ease;
  }
}

.import-popup-body {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.import-tip {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  background-color: var(--bg-color);
  border-radius: 12rpx;
  transition: background-color 0.3s ease;
  
  text {
    font-size: 26rpx;
    color: var(--text-color-secondary);
    transition: color 0.3s ease;
  }
  
  .import-tip-field {
    color: var(--primary-color);
    font-weight: 500;
  }
}

.import-button {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
}
</style>
