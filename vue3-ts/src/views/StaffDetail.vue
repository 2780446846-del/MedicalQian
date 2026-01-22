<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get, put } from '../utils/request'

interface Staff {
  _id: string
  name: string
  employeeId?: string
  phone?: string
  email?: string
  gender?: string
  avatar?: string
  birthday?: string
  department?: string
  position?: string
  jobTitle?: string
  workStatus?: string
  hireDate?: string
  address?: string
  idCard?: string
  emergencyContact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  remarks?: string
}

const route = useRoute()
const router = useRouter()

const staffId = ref<string>('')
const staff = ref<Staff | null>(null)
const loading = ref(false)
const saving = ref(false)
const isEditing = ref(false)

// 编辑表单数据
const formData = ref<Partial<Staff> & {
  emergencyContact?: {
    name?: string
    phone?: string
    relationship?: string
  }
}>({
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  }
})

// 获取员工详情
async function fetchStaffDetail() {
  if (!staffId.value) return

  loading.value = true
  try {
    const response = await get<{
      success: boolean
      data: Staff
    }>(`/staff/${staffId.value}`)

    if (response.success) {
      staff.value = response.data
      formData.value = {
        ...response.data,
        emergencyContact: response.data.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      }
    }
  } catch (error) {
    console.error('获取员工详情失败:', error)
    alert('获取员工详情失败，请稍后重试')
    router.back()
  } finally {
    loading.value = false
  }
}

// 进入编辑模式
function enterEditMode() {
  isEditing.value = true
  formData.value = {
    ...staff.value,
    emergencyContact: staff.value?.emergencyContact || {
      name: '',
      phone: '',
      relationship: ''
    }
  }
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false
  if (staff.value) {
    formData.value = {
      ...staff.value,
      emergencyContact: staff.value.emergencyContact || {
        name: '',
        phone: '',
        relationship: ''
      }
    }
  }
}

// 保存员工信息
async function saveStaff() {
  if (!staffId.value) return

  saving.value = true
  try {
    const response = await put<{
      success: boolean
      message: string
      data: Staff
    }>(`/staff/${staffId.value}`, formData.value)

    if (response.success) {
      staff.value = response.data
      isEditing.value = false
      alert('保存成功')
    }
  } catch (error: unknown) {
    console.error('保存员工信息失败:', error)
    const errorMessage = error instanceof Error ? error.message : '保存失败，请稍后重试'
    alert(errorMessage)
  } finally {
    saving.value = false
  }
}

// 返回列表
function goBack() {
  router.push('/staff')
}

// 格式化日期
function formatDateForInput(dateStr?: string) {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

// 计算年龄
function calculateAge(birthday?: string) {
  if (!birthday) return null
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// 计算工作经验（从入职日期开始）
function calculateExperience(hireDate?: string) {
  if (!hireDate) return null
  const hire = new Date(hireDate)
  const today = new Date()
  let years = today.getFullYear() - hire.getFullYear()
  const monthDiff = today.getMonth() - hire.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
    years--
  }
  return years
}

// 获取员工头像
function getStaffAvatar(staff: Staff | null) {
  if (staff?.avatar) {
    return staff.avatar
  }
  // 根据ID选择图片
  if (!staff?._id) return '/images/doctor1.png'
  const index = parseInt(staff._id.slice(-1), 16) % 3
  return `/images/doctor${index + 1}.png`
}

// 隐藏手机号中间部分
function maskPhone(phone?: string) {
  if (!phone || phone.length < 11) return phone || '-'
  return phone.slice(0, 3) + '********' + phone.slice(-3)
}

// 隐藏邮箱中间部分
function maskEmail(email?: string) {
  if (!email) return '-'
  const [name, domain] = email.split('@')
  if (!domain || !name) return email
  if (name.length <= 2) return email
  return name.slice(0, 2) + '***' + '@' + domain
}

// 隐藏地址中间部分
function maskAddress(address?: string) {
  if (!address) return '-'
  if (address.length <= 6) return address
  return address.slice(0, 3) + '***' + address.slice(-3)
}

// 模拟数据（实际应该从API获取）
const patientList = ref([
  { id: 'ID08974509604', name: '刘医生', avatar: '/images/doctor1.png' },
  { id: 'ID08974509604', name: '苏医生', avatar: '/images/doctor2.png' },
  { id: 'ID08974509604', name: '杜医生', avatar: '/images/doctor3.png' },
  { id: 'ID08974509604', name: '韩医生', avatar: '/images/doctor1.png' },
  { id: 'ID08974509604', name: '杨医生', avatar: '/images/doctor2.png' },
  { id: 'ID08974509604', name: '何医生', avatar: '/images/doctor3.png' },
  { id: 'ID08974509604', name: '朱医生', avatar: '/images/doctor1.png' }
])

const weeklyPatientCount = ref(40)
const patientIncrease = ref(20)

onMounted(() => {
  const id = route.params.id as string
  if (id) {
    staffId.value = id
    fetchStaffDetail()
  } else {
    router.push('/staff')
  }
})
</script>

<template>
  <div class="detail-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb">
      <span class="breadcrumb-item" @click="goBack">员工</span>
      <span class="breadcrumb-separator">></span>
      <span class="breadcrumb-item active">员工详情</span>
    </div>

    <!-- 编辑按钮 -->
    <div class="edit-header">
      <button v-if="!isEditing" class="edit-btn" @click="enterEditMode">
        <span class="edit-icon">✏️</span>
        编辑资料
      </button>
      <div v-else class="edit-actions">
        <button class="cancel-btn" @click="cancelEdit">取消</button>
        <button class="save-btn" @click="saveStaff" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 员工详情内容 -->
    <div v-else-if="staff" class="detail-content">
      <!-- 左侧信息栏 -->
      <div class="left-panel">
        <!-- 员工头像和基本信息 -->
        <div class="profile-card">
          <img
            :src="getStaffAvatar(staff)"
            :alt="staff.name"
            class="profile-avatar"
            @error="(e) => {
              if (e.target && 'src' in e.target) {
                e.target.src = '/images/doctor1.png'
              }
            }"
          />
          <div class="profile-actions">
            <button class="action-btn call-btn">
              <span class="action-icon">📞</span>
              呼叫
            </button>
            <button class="action-btn chat-btn">
              <span class="action-icon">💬</span>
              聊天
            </button>
          </div>
          <div class="profile-info">
            <div class="status-tags">
              <span class="status-tag status-active">在职</span>
              <span class="status-tag status-fulltime">全职</span>
            </div>
            <h2 class="profile-name">{{ staff.name }}</h2>
            <p class="profile-title">{{ staff.jobTitle || staff.position || staff.department || '员工' }}</p>
            <div class="contact-info">
              <div class="contact-item">
                <span class="contact-icon">📍</span>
                <span class="contact-text">地址 {{ maskAddress(staff.address) }}</span>
              </div>
              <div class="contact-item">
                <span class="contact-icon">✉️</span>
                <span class="contact-text">电子邮件 {{ maskEmail(staff.email) }}</span>
              </div>
              <div class="contact-item">
                <span class="contact-icon">📱</span>
                <span class="contact-text">手机号码 {{ maskPhone(staff.phone) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 经验 -->
        <div class="info-card">
          <div class="info-value">{{ calculateExperience(staff.hireDate) || 0 }}</div>
          <div class="info-label">年从业经验</div>
          <div class="info-subtitle">从{{ staff.hireDate ? new Date(staff.hireDate).getFullYear() : '-' }}年开始</div>
        </div>

        <!-- 评分 -->
        <div class="info-card">
          <div class="info-value rating-value">
            <span class="rating-number">5</span>
            <span class="rating-star">⭐</span>
          </div>
          <div class="info-label">这位医生评价良好</div>
        </div>

        <!-- 教育背景 -->
        <div class="info-card education-card">
          <div class="education-title">教育背景</div>
          <div class="education-name">Harvard University</div>
          <div class="education-location">马萨诸塞厅,剑桥市,美国</div>
        </div>

        <!-- 满意度 -->
        <div class="info-card satisfaction-card">
          <div class="satisfaction-chart">
            <div class="chart-value">90%</div>
            <div class="chart-label">良好</div>
            <div class="chart-value-small">10%</div>
            <div class="chart-label-small">较差</div>
          </div>
          <div class="satisfaction-info">
            <div class="satisfaction-number">6.000</div>
            <div class="satisfaction-text">用户对其表现感到满意</div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="right-panel">
        <!-- 患者列表 -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">患者列表</h3>
            <select class="time-select">
              <option>本周</option>
              <option>本月</option>
              <option>本年</option>
            </select>
          </div>
          <div class="patient-list">
            <div
              v-for="(patient, index) in patientList"
              :key="index"
              class="patient-item"
            >
              <img
                :src="patient.avatar"
                :alt="patient.name"
                class="patient-avatar"
                @error="(e) => {
                  if (e.target && 'src' in e.target) {
                    e.target.src = '/images/doctor1.png'
                  }
                }"
              />
              <div class="patient-info">
                <div class="patient-name">{{ patient.name }}</div>
                <div class="patient-id">{{ patient.id }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 本周患者总数 -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">本周患者总数</h3>
          </div>
          <div class="patient-stats">
            <div class="stats-chart">
              <div class="chart-line"></div>
            </div>
            <div class="stats-number">{{ weeklyPatientCount }}</div>
            <div class="stats-change positive">
              患者数量增加了{{ patientIncrease }}%
            </div>
          </div>
        </div>

        <!-- 日程安排 -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">日程安排</h3>
          </div>
          <div class="schedule-container">
            <div class="schedule-times">
              <span>10:00</span>
              <span>11:00</span>
              <span>12:00</span>
              <span>13:00</span>
              <span>14:00</span>
            </div>
            <div class="schedule-events">
              <div class="schedule-event" style="left: 50%; width: 40%; top: 0;">
                <div class="event-title">101通用会议室</div>
                <div class="event-participants">全体</div>
              </div>
              <div class="schedule-event" style="left: 50%; width: 40%; top: 40px;">
                <div class="event-title">重症监护监测</div>
                <div class="event-participants">
                  <img src="/images/doctor1.png" class="event-avatar" />
                  护士
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">关于</h3>
          </div>
          <div class="about-content">
            <textarea
              v-if="isEditing"
              v-model="formData.remarks"
              class="about-textarea"
              placeholder="请输入关于信息..."
              rows="6"
            ></textarea>
            <div v-else class="about-text">
              {{ staff.remarks || '暂无相关信息' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #f5f7f4;
  padding: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: #007aff;
}

.breadcrumb-item.active {
  color: #2d2f31;
  cursor: default;
}

.breadcrumb-separator {
  color: #999;
}

.edit-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background: #45a049;
}

.edit-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.save-btn {
  background: #007aff;
  color: #fff;
}

.save-btn:hover:not(:disabled) {
  background: #0056b3;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6e736c;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.detail-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 16px;
  border: 4px solid #f5f5f5;
}

.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.call-btn {
  background: #4CAF50;
  color: #fff;
}

.call-btn:hover {
  background: #45a049;
}

.chat-btn {
  background: #2196F3;
  color: #fff;
}

.chat-btn:hover {
  background: #1976D2;
}

.action-icon {
  font-size: 16px;
}

.profile-info {
  text-align: left;
}

.status-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #4CAF50;
  color: #fff;
}

.status-fulltime {
  background: #e9ecef;
  color: #666;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0 0 8px 0;
}

.profile-title {
  font-size: 16px;
  color: #666;
  margin: 0 0 20px 0;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.contact-icon {
  font-size: 16px;
}

.contact-text {
  flex: 1;
}

.info-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.info-value {
  font-size: 48px;
  font-weight: 700;
  color: #2d2f31;
  margin-bottom: 8px;
}

.rating-value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.rating-number {
  font-size: 48px;
  font-weight: 700;
  color: #2d2f31;
}

.rating-star {
  font-size: 32px;
  color: #FFD700;
}

.info-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.info-subtitle {
  font-size: 12px;
  color: #999;
}

.education-card {
  text-align: left;
}

.education-title {
  font-size: 14px;
  font-weight: 600;
  color: #2d2f31;
  margin-bottom: 12px;
}

.education-name {
  font-size: 18px;
  font-weight: 600;
  color: #2d2f31;
  margin-bottom: 8px;
}

.education-location {
  font-size: 14px;
  color: #666;
}

.satisfaction-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.satisfaction-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-value {
  font-size: 24px;
  font-weight: 600;
  color: #4CAF50;
}

.chart-label {
  font-size: 12px;
  color: #666;
}

.chart-value-small {
  font-size: 16px;
  font-weight: 600;
  color: #f44336;
  margin-top: 8px;
}

.chart-label-small {
  font-size: 12px;
  color: #666;
}

.satisfaction-info {
  flex: 1;
  text-align: center;
}

.satisfaction-number {
  font-size: 36px;
  font-weight: 700;
  color: #2d2f31;
  margin-bottom: 8px;
}

.satisfaction-text {
  font-size: 12px;
  color: #666;
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0;
}

.time-select {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.patient-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.patient-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.patient-info {
  flex: 1;
}

.patient-name {
  font-size: 14px;
  font-weight: 500;
  color: #2d2f31;
  margin-bottom: 4px;
}

.patient-id {
  font-size: 12px;
  color: #999;
}

.patient-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stats-chart {
  width: 100%;
  height: 60px;
  position: relative;
}

.chart-line {
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, #4CAF50 0%, #4CAF50 100%);
  border-radius: 4px;
  position: relative;
}

.chart-line::after {
  content: '';
  position: absolute;
  top: -4px;
  right: 0;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #4CAF50;
}

.stats-number {
  font-size: 48px;
  font-weight: 700;
  color: #2d2f31;
}

.stats-change {
  font-size: 14px;
  font-weight: 500;
}

.stats-change.positive {
  color: #4CAF50;
}

.schedule-container {
  position: relative;
  min-height: 200px;
  padding: 20px 0;
}

.schedule-times {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 12px;
  color: #999;
}

.schedule-events {
  position: relative;
  min-height: 150px;
}

.schedule-event {
  position: absolute;
  background: #E3F2FD;
  border-radius: 6px;
  padding: 12px;
  border-left: 4px solid #2196F3;
}

.event-title {
  font-size: 14px;
  font-weight: 500;
  color: #2d2f31;
  margin-bottom: 6px;
}

.event-participants {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.about-content {
  min-height: 150px;
}

.about-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 150px;
}

.about-textarea:focus {
  border-color: #007aff;
}

.about-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 1200px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .left-panel {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .profile-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .left-panel {
    grid-template-columns: 1fr;
  }

  .profile-actions {
    flex-direction: column;
  }
}
</style>
