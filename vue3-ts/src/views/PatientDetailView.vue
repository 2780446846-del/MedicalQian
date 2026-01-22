<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get, put } from '../utils/request'

const route = useRoute()
const router = useRouter()

// 患者数据
const patient = ref<any>(null)
const loading = ref(true)

// 编辑对话框状态
const showEditDialog = ref(false)
const patientForm = ref<any>({})
const updating = ref(false)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string>('')

// 关于部分编辑状态
const isEditingAbout = ref(false)
const aboutEditText = ref('')
const savingAbout = ref(false)

// 病历详情对话框
const showRecordDialog = ref(false)
const selectedRecord = ref<any>(null)

// 医生详情对话框
const showDoctorDialog = ref(false)
const selectedDoctor = ref<any>(null)

// 日程详情对话框
const showScheduleDialog = ref(false)
const selectedSchedule = ref<any>(null)

// 医生列表时间筛选
const doctorTimeFilter = ref('本周')

// 日程安排筛选
const scheduleFilter = ref('全部')
const scheduleFilterOptions = ['全部', '今天', '本周', '本月']

// 医生列表
const doctors = ref([
  { id: '1', name: '刘医生', avatar: '👨‍⚕️', doctorId: 'ID080745006C4' },
  { id: '2', name: '苏医生', avatar: '👩‍⚕️', doctorId: 'ID080745006C4' },
  { id: '3', name: '社医生', avatar: '👨‍⚕️', doctorId: 'ID080745006C4' },
  { id: '4', name: '韩医生', avatar: '👩‍⚕️', doctorId: 'ID080745006C4' },
  { id: '5', name: '杨医生', avatar: '👨‍⚕️', doctorId: 'ID080745006C4' },
  { id: '6', name: '何医生', avatar: '👩‍⚕️', doctorId: 'ID080745006C4' },
  { id: '7', name: '朱医生', avatar: '👨‍⚕️', doctorId: 'ID080745006C4' },
])

// 日程安排（所有日程）
const allSchedules = ref([
  { id: '1', title: '101通用会议室', time: '13:30 - 14:48', type: 'meeting', icon: '📅', date: new Date('2025-01-15') },
  { id: '2', title: '重症监护监测', time: '13:30 - 14:48', type: 'monitoring', icon: '👩‍⚕️', staff: '护士', date: new Date('2025-01-15') },
  { id: '3', title: '定期复查', time: '09:00 - 10:00', type: 'examination', icon: '🏥', date: new Date() },
  { id: '4', title: '医生会诊', time: '14:00 - 15:30', type: 'consultation', icon: '👨‍⚕️', date: new Date(Date.now() + 86400000) },
  { id: '5', title: '药物治疗', time: '10:30 - 11:00', type: 'treatment', icon: '💊', date: new Date(Date.now() + 2 * 86400000) },
])

// 筛选后的日程安排
const schedules = computed(() => {
  if (scheduleFilter.value === '全部') {
    return allSchedules.value
  }
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  return allSchedules.value.filter(schedule => {
    const scheduleDate = schedule.date ? new Date(schedule.date) : today
    scheduleDate.setHours(0, 0, 0, 0)
    
    if (scheduleFilter.value === '今天') {
      return scheduleDate.getTime() === today.getTime()
    } else if (scheduleFilter.value === '本周') {
      return scheduleDate >= weekStart && scheduleDate <= now
    } else if (scheduleFilter.value === '本月') {
      return scheduleDate >= monthStart && scheduleDate <= now
    }
    return true
  })
})

// 病历记录
const medicalRecords = ref([
  { 
    id: '1', 
    title: '轻度咳嗽', 
    date: '2025年5月6日', 
    status: '已康复', 
    icon: '🫁', 
    description: '患者出现轻度咳嗽症状，伴有轻微喉咙不适。经过检查，诊断为上呼吸道感染。给予抗炎药物治疗，建议多休息、多饮水。一周后复查，症状明显好转。' 
  },
  { 
    id: '2', 
    title: '常规体检', 
    date: '2025年4月15日', 
    status: '', 
    icon: '🏥', 
    description: '患者进行年度常规体检，各项指标检查正常。血压、血糖、血脂均在正常范围内。心电图检查无异常。建议继续保持良好的生活习惯，定期复查。' 
  },
  { 
    id: '3', 
    title: '感冒治疗', 
    date: '2025年3月20日', 
    status: '已康复', 
    icon: '🤧', 
    description: '患者因感冒就诊，主要症状为流鼻涕、打喷嚏、轻微发热。体温37.5°C。给予感冒药物治疗，建议多休息、多饮水。3天后症状缓解，已康复。' 
  },
])

// 时间槽
const timeSlots = ref(['10:00', '11:00', '12:00', '13:00', '14:00'])

// 查看病历详情
function viewRecordDetail(record: any) {
  selectedRecord.value = record
  showRecordDialog.value = true
}

// 关闭病历详情
function closeRecordDialog() {
  showRecordDialog.value = false
  selectedRecord.value = null
}

// 查看医生详情
function viewDoctorDetail(doctor: any) {
  selectedDoctor.value = doctor
  showDoctorDialog.value = true
}

// 关闭医生详情
function closeDoctorDialog() {
  showDoctorDialog.value = false
  selectedDoctor.value = null
}

// 查看日程详情
function viewScheduleDetail(schedule: any) {
  selectedSchedule.value = schedule
  showScheduleDialog.value = true
}

// 关闭日程详情
function closeScheduleDialog() {
  showScheduleDialog.value = false
  selectedSchedule.value = null
}

// 医生列表时间筛选变化
function onDoctorTimeFilterChange() {
  // 这里可以根据筛选条件重新获取医生列表
  console.log('筛选条件:', doctorTimeFilter.value)
}

// 联系医生
function callDoctor(doctor: any) {
  // 这里可以实现联系医生的功能
  alert(`正在联系 ${doctor.name}...`)
}

// 与医生聊天
function chatWithDoctor(doctor: any) {
  router.push(`/chat?doctorId=${doctor.id}&doctorName=${doctor.name}`)
}

// 获取日程类型名称
function getScheduleTypeName(type: string) {
  const typeMap: Record<string, string> = {
    'meeting': '会议',
    'monitoring': '监测',
    'treatment': '治疗',
    'examination': '检查',
    'consultation': '咨询'
  }
  return typeMap[type] || type
}

// 编辑日程
function editSchedule(schedule: any) {
  // 跳转到日程安排页面并编辑
  router.push({
    path: '/schedule',
    query: { edit: schedule.id }
  })
}

// 开始编辑关于信息
function startEditAbout() {
  aboutEditText.value = patient.value?.about || ''
  isEditingAbout.value = true
}

// 取消编辑关于信息
function cancelEditAbout() {
  isEditingAbout.value = false
  aboutEditText.value = ''
}

// 保存关于信息
async function saveAbout() {
  if (savingAbout.value) return
  
  savingAbout.value = true
  try {
    const patientId = route.params.id as string
    const patientData = {
      ...patient.value,
      about: aboutEditText.value.trim()
    }

    const response = await put<{
      success: boolean
      message: string
      data: any
    }>(`/patients/${patientId}`, patientData)

    if (response.success) {
      // 更新本地数据
      if (patient.value) {
        patient.value.about = aboutEditText.value.trim()
      }
      isEditingAbout.value = false
    } else {
      alert('保存失败：' + (response.message || '未知错误'))
    }
  } catch (error: unknown) {
    console.error('保存关于信息失败:', error)
    const errorMessage = error instanceof Error ? error.message : '保存失败，请稍后重试'
    alert('保存失败：' + errorMessage)
  } finally {
    savingAbout.value = false
  }
}

// 格式化日程日期
function formatScheduleDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[d.getDay()]
  return `${month}月${day}日 星期${weekday}`
}

// 获取患者病历记录
async function fetchMedicalRecords(patientId: string) {
  try {
    // 尝试从后端获取病历记录
    const response = await get(`/patients/${patientId}/medical-records`)
    if (response && response.success && Array.isArray(response.data)) {
      medicalRecords.value = response.data.map((record: any) => ({
        id: record._id || record.id || String(Date.now() + Math.random()),
        title: record.title || record.diagnosis || '病历记录',
        date: record.date || record.createdAt ? new Date(record.date || record.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('zh-CN'),
        status: record.status || (record.recovered ? '已康复' : ''),
        icon: record.icon || '🏥',
        description: record.description || record.details || record.content || '暂无详细描述'
      }))
      return
    }
  } catch (error) {
    console.log('获取病历记录失败，使用默认数据:', error)
  }
  
  // 如果API失败，保持使用默认数据
}

// 获取患者数据
async function fetchPatient() {
  const patientId = route.params.id as string
  if (!patientId) {
    router.push('/patients')
    return
  }

  try {
    loading.value = true
    
    // 获取病历记录
    await fetchMedicalRecords(patientId)
    
    // 首先尝试从患者列表API获取（因为可能没有单独的详情API）
    const listResponse = await get('/patients')
    if (listResponse && listResponse.success && Array.isArray(listResponse.data)) {
      // 从列表中查找匹配的患者
      const foundPatient = listResponse.data.find((p: any) => 
        (p._id && p._id === patientId) || (p.id && p.id === patientId)
      )
      
      if (foundPatient) {
        patient.value = {
          ...foundPatient,
          // 补充默认值
          education: foundPatient.education || '北京大学',
          educationLocation: foundPatient.educationLocation || '北京市海淀区颐和园路5号',
          rating: foundPatient.rating || 5,
          about: foundPatient.about || '暂无关于信息',
          diagnosis: foundPatient.diagnosis || '轻度发烧',
          diagnosisDescription: foundPatient.diagnosisDescription || '患者目前身体状况良好，各项指标正常。',
          email: foundPatient.email || 'shenduye**@gmail.com'
        }
        return
      }
    }
    
    // 如果列表中没有找到，尝试单独的详情API
    try {
      const detailResponse = await get(`/patients/${patientId}`)
      if (detailResponse && detailResponse.success && detailResponse.data) {
        patient.value = {
          ...detailResponse.data,
          education: detailResponse.data.education || '北京大学',
          educationLocation: detailResponse.data.educationLocation || '北京市海淀区颐和园路5号',
          rating: detailResponse.data.rating || 5,
          about: detailResponse.data.about || '暂无关于信息',
          diagnosis: detailResponse.data.diagnosis || '轻度发烧',
          diagnosisDescription: detailResponse.data.diagnosisDescription || '患者目前身体状况良好，各项指标正常。',
          email: detailResponse.data.email || 'shenduye**@gmail.com'
        }
        return
      }
    } catch (detailError) {
      console.log('详情API不存在，已从列表API获取')
    }
    
    // 如果都失败了，显示错误
    console.error('未找到患者数据')
    alert('未找到该患者信息')
    router.push('/patients')
    
  } catch (error) {
    console.error('获取患者详情失败:', error)
    alert('获取患者信息失败，请稍后重试')
    router.push('/patients')
  } finally {
    loading.value = false
  }
}

// 获取患者头像
function getPatientAvatar() {
  if (patient.value?.avatar && patient.value.avatar.startsWith('data:')) {
    return null
  }
  return '👩'
}

// 编辑资料
function editProfile() {
  if (patient.value) {
    // 填充表单数据
    patientForm.value = {
      name: patient.value.name || '',
      gender: patient.value.gender || '',
      age: patient.value.age || undefined,
      phone: patient.value.phone || '',
      address: patient.value.address || '',
      email: patient.value.email || '',
      category: patient.value.category || '普通',
      treatmentPlan: patient.value.treatmentPlan || '',
      paymentStatus: patient.value.paymentStatus || '待处理',
      avatar: patient.value.avatar || '',
      about: patient.value.about || '',
      diagnosis: patient.value.diagnosis || '',
      diagnosisDescription: patient.value.diagnosisDescription || ''
    }
    avatarPreview.value = patient.value.avatar || ''
    avatarFile.value = null
    showEditDialog.value = true
  }
}

// 关闭编辑对话框
function closeEditDialog() {
  showEditDialog.value = false
  patientForm.value = {}
  avatarPreview.value = ''
  avatarFile.value = null
}

// 处理头像选择
function handleAvatarSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    avatarFile.value = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(avatarFile.value)
  }
}

// 删除头像
function removeAvatar() {
  avatarPreview.value = ''
  avatarFile.value = null
  patientForm.value.avatar = ''
}

// 更新患者
async function updatePatient() {
  if (!patientForm.value.name) {
    alert('请输入患者姓名')
    return
  }

  updating.value = true
  try {
    // 上传头像（如果选择了新头像）
    let avatarUrl = patientForm.value.avatar || ''
    if (avatarFile.value) {
      const reader = new FileReader()
      await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          avatarUrl = e.target?.result as string
          resolve(avatarUrl)
        }
        reader.onerror = reject
        reader.readAsDataURL(avatarFile.value!)
      })
    }

    const patientId = route.params.id as string
    const patientData = {
      ...patientForm.value,
      avatar: avatarUrl
    }

    const response = await put<{
      success: boolean
      message: string
      data: any
    }>(`/patients/${patientId}`, patientData)

    if (response.success) {
      alert('患者信息更新成功！')
      closeEditDialog()
      // 重新获取患者数据
      await fetchPatient()
    } else {
      alert('更新失败：' + (response.message || '未知错误'))
    }
  } catch (error: unknown) {
    console.error('更新患者失败:', error)
    const errorMessage = error instanceof Error ? error.message : '更新失败，请稍后重试'
    alert('更新失败：' + errorMessage)
  } finally {
    updating.value = false
  }
}

// 拨打电话
function callPatient() {
  if (!patient.value?.phone) {
    alert('该患者未填写电话号码')
    return
  }
  
  // 尝试拨打电话
  const phoneNumber = patient.value.phone.replace(/\D/g, '') // 移除所有非数字字符
  if (phoneNumber) {
    window.location.href = `tel:${phoneNumber}`
  } else {
    alert('电话号码格式不正确')
  }
}

// 聊天
function chatWithPatient() {
  router.push(`/chat?patientId=${route.params.id}`)
}

onMounted(() => {
  fetchPatient()
})
</script>

<template>
  <div class="patient-detail-page">
    <!-- 面包屑导航 -->
    <div class="breadcrumb">
      <span class="breadcrumb-item" @click="router.push('/patients')">患者</span>
      <span class="breadcrumb-separator">></span>
      <span class="breadcrumb-item active">患者详情</span>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="patient" class="patient-detail-content">
      <!-- 左侧列 -->
      <div class="left-column">
        <!-- 患者资料卡片 -->
        <div class="patient-profile-card">
          <div class="profile-photo-section">
            <div class="patient-photo">
              <img v-if="patient.avatar && patient.avatar.startsWith('data:')" :src="patient.avatar" alt="患者照片" />
              <span v-else class="photo-placeholder">{{ getPatientAvatar() }}</span>
            </div>
            <div class="profile-actions">
              <button 
                class="action-btn call-btn" 
                @click="callPatient"
                :disabled="!patient.phone"
                :title="patient.phone ? '拨打电话' : '该患者未填写电话号码'"
              >
                <span class="btn-icon">📞</span>
                呼叫
              </button>
              <button class="action-btn chat-btn" @click="chatWithPatient">
                <span class="btn-icon">💬</span>
                聊天
              </button>
            </div>
          </div>
          <div class="profile-info-section">
            <div class="profile-header">
              <div class="profile-name-section">
                <h2 class="patient-name">{{ patient.name }}</h2>
                <div class="patient-label">患者</div>
              </div>
              <button class="edit-profile-btn" @click="editProfile">
                <span class="edit-icon">✏️</span>
                编辑资料
              </button>
            </div>
            <div class="profile-tags">
              <span class="tag gender-tag">{{ patient.gender || '未设置' }}</span>
              <span class="tag treatment-tag">{{ patient.treatmentPlan || patient.category || '普通' }}</span>
            </div>
            <div class="profile-details">
              <div class="detail-row">
                <span class="detail-icon">📍</span>
                <span class="detail-label">地址:</span>
                <span class="detail-value">{{ patient.address || '未填写' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-icon">📱</span>
                <span class="detail-label">手机号码:</span>
                <span class="detail-value">{{ patient.phone || '未填写' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-icon">📧</span>
                <span class="detail-label">电子邮件:</span>
                <span class="detail-value">{{ patient.email || '未填写' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 年龄卡片 -->
        <div class="info-card age-card">
          <div class="card-label">年龄</div>
          <div class="card-value-large">{{ patient.age || '-' }}</div>
          <div class="card-description">{{ patient.age ? `${patient.age}岁属于成年人` : '未填写' }}</div>
        </div>

        <!-- 评分卡片 -->
        <div class="info-card rating-card">
          <div class="card-label">评分</div>
          <div class="card-value-large">
            {{ patient.rating || 5 }}
            <span class="star-icon">⭐</span>
          </div>
          <div class="card-description">这位医生评价良好</div>
        </div>

        <!-- 教育背景卡片 -->
        <div class="info-card education-card">
          <div class="card-label">教育背景</div>
          <div class="education-content">
            <div class="education-icon">🏛️</div>
            <div class="education-info">
              <div class="education-name">{{ patient.education || '北京大学' }}</div>
              <div class="education-location">{{ patient.educationLocation || '北京市海淀区颐和园路5号' }}</div>
            </div>
          </div>
        </div>

        <!-- 医院病历单 -->
        <div class="medical-records-section">
          <div class="section-title">医院病历单</div>
          <div class="records-list">
            <div v-for="record in medicalRecords" :key="record.id" class="record-card">
              <div class="record-icon">{{ record.icon }}</div>
              <div class="record-content">
                <div class="record-title">{{ record.title }}</div>
                <div class="record-description">{{ record.description }}</div>
                <div class="record-footer">
                  <span class="record-date">{{ record.date }}</span>
                  <span v-if="record.status" class="record-status" :class="{ recovered: record.status === '已康复' }">
                    {{ record.status }}
                  </span>
                </div>
              </div>
              <button class="view-record-btn" @click="viewRecordDetail(record)">查看</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧列 -->
      <div class="right-column">
        <!-- 关于部分 -->
        <div class="about-section">
          <div class="section-header">
            <div class="section-title">关于</div>
            <button 
              v-if="!isEditingAbout" 
              class="edit-about-btn" 
              @click="startEditAbout" 
              title="编辑关于信息"
            >
              <span class="edit-icon-small">✏️</span>
            </button>
          </div>
          <div class="about-content">
            <!-- 编辑模式 -->
            <div v-if="isEditingAbout" class="about-edit-mode">
              <textarea 
                v-model="aboutEditText" 
                class="about-textarea" 
                placeholder="请输入患者的相关信息、病史、注意事项等..."
                rows="6"
              ></textarea>
              <div class="about-edit-actions">
                <button class="about-cancel-btn" @click="cancelEditAbout" :disabled="savingAbout">
                  取消
                </button>
                <button class="about-save-btn" @click="saveAbout" :disabled="savingAbout">
                  {{ savingAbout ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>
            <!-- 显示模式 -->
            <div v-else>
              <div v-if="patient.about && patient.about.trim()" class="about-text">
                {{ patient.about }}
              </div>
              <div v-else class="about-empty">
                <div class="empty-icon">📝</div>
                <div class="empty-text">暂无关于信息</div>
                <button class="add-about-btn" @click="startEditAbout">添加关于信息</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 医生列表 -->
        <div class="doctors-section">
          <div class="section-header">
            <div class="section-title">医生列表</div>
            <select class="time-filter" v-model="doctorTimeFilter" @change="onDoctorTimeFilterChange">
              <option value="本周">本周</option>
              <option value="本月">本月</option>
              <option value="本年">本年</option>
            </select>
          </div>
          <div class="doctors-list">
            <div 
              v-for="doctor in doctors" 
              :key="doctor.id" 
              class="doctor-item"
              @click="viewDoctorDetail(doctor)"
            >
              <div class="doctor-avatar">{{ doctor.avatar }}</div>
              <div class="doctor-info">
                <div class="doctor-name">{{ doctor.name }}</div>
                <div class="doctor-id">{{ doctor.doctorId }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 医生诊断 -->
        <div class="diagnosis-section">
          <div class="section-header">
            <div class="section-title">医生诊断</div>
            <span class="diagnosis-tag">{{ patient.diagnosis || '轻度发烧' }}</span>
          </div>
          <div class="diagnosis-content">
            <p class="diagnosis-text">{{ patient.diagnosisDescription || patient.diagnosis || '暂无详细诊断信息' }}</p>
          </div>
        </div>

        <!-- 日程安排 -->
        <div class="schedule-section">
          <div class="section-header">
            <div class="section-title">日程安排</div>
            <select class="schedule-filter" v-model="scheduleFilter">
              <option v-for="option in scheduleFilterOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
          <div class="schedule-timeline">
            <div class="time-slots">
              <div v-for="slot in timeSlots" :key="slot" class="time-slot">
                {{ slot }}
              </div>
            </div>
            <div class="schedule-events">
              <div v-if="schedules.length === 0" class="schedule-empty">
                <div class="empty-icon">📅</div>
                <div class="empty-text">暂无日程安排</div>
              </div>
              <div
                v-for="schedule in schedules"
                :key="schedule.id"
                class="schedule-event"
                :class="schedule.type"
                @click="viewScheduleDetail(schedule)"
              >
                <div class="event-icon">{{ schedule.icon }}</div>
                <div class="event-content">
                  <div class="event-title">{{ schedule.title }}</div>
                  <div class="event-time">{{ schedule.time }}</div>
                  <div v-if="schedule.staff" class="event-staff">{{ schedule.staff }}</div>
                  <div v-if="schedule.date" class="event-date">
                    {{ formatScheduleDate(schedule.date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑患者对话框 -->
    <div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
      <div class="modal-dialog edit-dialog">
        <div class="modal-header">
          <h3 class="modal-title">编辑患者资料</h3>
          <button class="close-btn" @click="closeEditDialog">×</button>
        </div>
        <div class="modal-content">
          <!-- 头像上传 -->
          <div class="form-group avatar-group">
            <label class="form-label">头像</label>
            <div class="avatar-upload-section">
              <div class="avatar-preview-wrapper">
                <div v-if="avatarPreview" class="avatar-preview">
                  <img :src="avatarPreview" alt="头像预览" class="avatar-preview-img" />
                  <div class="avatar-overlay">
                    <label for="avatar-input-edit" class="avatar-change-btn">更换</label>
                    <button type="button" class="avatar-delete-btn" @click="removeAvatar">删除</button>
                  </div>
                </div>
                <div v-else class="avatar-placeholder">
                  <div class="avatar-icon">👤</div>
                  <label for="avatar-input-edit" class="avatar-upload-label">上传头像</label>
                </div>
                <input 
                  id="avatar-input-edit"
                  type="file" 
                  accept="image/*" 
                  class="avatar-input"
                  @change="handleAvatarSelect"
                />
              </div>
              <div class="avatar-hint">图片最大尺寸为2mb</div>
            </div>
          </div>

          <!-- 姓名 -->
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input v-model="patientForm.name" type="text" class="form-input" placeholder="患者姓名" />
          </div>

          <!-- 地址 -->
          <div class="form-group">
            <label class="form-label">地址</label>
            <input v-model="patientForm.address" type="text" class="form-input" placeholder="患者地址" />
          </div>

          <!-- 性别 -->
          <div class="form-group">
            <label class="form-label">性别</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="gender-edit" 
                  value="男" 
                  v-model="patientForm.gender"
                  class="radio-input"
                />
                <span class="radio-text">男性</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="gender-edit" 
                  value="女" 
                  v-model="patientForm.gender"
                  class="radio-input"
                />
                <span class="radio-text">女性</span>
              </label>
            </div>
          </div>

          <!-- 手机号 -->
          <div class="form-group">
            <label class="form-label">手机号</label>
            <input v-model="patientForm.phone" type="tel" class="form-input" placeholder="请输入手机号" />
          </div>

          <!-- 电子邮件 -->
          <div class="form-group">
            <label class="form-label">电子邮件</label>
            <input v-model="patientForm.email" type="email" class="form-input" placeholder="请输入电子邮件" />
          </div>
          
          <!-- 年龄 -->
          <div class="form-group">
            <label class="form-label">年龄</label>
            <input v-model.number="patientForm.age" type="number" class="form-input" placeholder="请输入年龄" />
          </div>

          <!-- 治疗方案 -->
          <div class="form-group">
            <label class="form-label">治疗方案</label>
            <select v-model="patientForm.treatmentPlan" class="form-input form-select">
              <option value="" disabled>患者治疗方案</option>
              <option value="门诊">门诊</option>
              <option value="住院">住院</option>
              <option value="急诊">急诊</option>
              <option value="手术">手术</option>
              <option value="重症监护">重症监护</option>
            </select>
          </div>

          <!-- 支付状态 -->
          <div class="form-group">
            <label class="form-label">支付</label>
            <select v-model="patientForm.paymentStatus" class="form-input form-select">
              <option value="待处理">待处理</option>
              <option value="未支付">未支付</option>
              <option value="部分支付">部分支付</option>
              <option value="已支付">已支付</option>
            </select>
          </div>

          <!-- 患者类别 -->
          <div class="form-group">
            <label class="form-label">患者类别</label>
            <select v-model="patientForm.category" class="form-input">
              <option value="普通">普通</option>
              <option value="成年人">成年人</option>
              <option value="老年人">老年人</option>
              <option value="儿童">儿童</option>
              <option value="VIP">VIP</option>
              <option value="急诊">急诊</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEditDialog">取消</button>
          <button class="save-btn" @click="updatePatient" :disabled="updating">
            {{ updating ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 病历详情对话框 -->
    <div v-if="showRecordDialog && selectedRecord" class="modal-overlay" @click.self="closeRecordDialog">
      <div class="modal-dialog record-detail-dialog">
        <div class="modal-header">
          <h3 class="modal-title">病历详情</h3>
          <button class="close-btn" @click="closeRecordDialog">×</button>
        </div>
        <div class="modal-content">
          <div class="record-detail-content">
            <div class="record-detail-icon">{{ selectedRecord.icon }}</div>
            <div class="record-detail-info">
              <div class="record-detail-title">{{ selectedRecord.title }}</div>
              <div class="record-detail-date">
                <span class="date-label">日期：</span>
                <span class="date-value">{{ selectedRecord.date }}</span>
              </div>
              <div v-if="selectedRecord.status" class="record-detail-status">
                <span class="status-label">状态：</span>
                <span class="status-value" :class="{ recovered: selectedRecord.status === '已康复' }">
                  {{ selectedRecord.status }}
                </span>
              </div>
              <div class="record-detail-description">
                <div class="description-label">详细描述：</div>
                <div class="description-content">{{ selectedRecord.description || '暂无详细描述' }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeRecordDialog">关闭</button>
        </div>
      </div>
    </div>

    <!-- 医生详情对话框 -->
    <div v-if="showDoctorDialog && selectedDoctor" class="modal-overlay" @click.self="closeDoctorDialog">
      <div class="modal-dialog doctor-detail-dialog">
        <div class="modal-header">
          <h3 class="modal-title">医生详情</h3>
          <button class="close-btn" @click="closeDoctorDialog">×</button>
        </div>
        <div class="modal-content">
          <div class="doctor-detail-content">
            <div class="doctor-detail-avatar">{{ selectedDoctor.avatar }}</div>
            <div class="doctor-detail-info">
              <div class="doctor-detail-name">{{ selectedDoctor.name }}</div>
              <div class="doctor-detail-id">
                <span class="id-label">医生ID：</span>
                <span class="id-value">{{ selectedDoctor.doctorId }}</span>
              </div>
              <div class="doctor-detail-actions">
                <button class="doctor-action-btn call-btn" @click="callDoctor(selectedDoctor)">
                  <span class="btn-icon">📞</span>
                  联系医生
                </button>
                <button class="doctor-action-btn chat-btn" @click="chatWithDoctor(selectedDoctor)">
                  <span class="btn-icon">💬</span>
                  在线咨询
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDoctorDialog">关闭</button>
        </div>
      </div>
    </div>

    <!-- 日程详情对话框 -->
    <div v-if="showScheduleDialog && selectedSchedule" class="modal-overlay" @click.self="closeScheduleDialog">
      <div class="modal-dialog schedule-detail-dialog">
        <div class="modal-header">
          <h3 class="modal-title">日程详情</h3>
          <button class="close-btn" @click="closeScheduleDialog">×</button>
        </div>
        <div class="modal-content">
          <div class="schedule-detail-content">
            <div class="schedule-detail-icon">{{ selectedSchedule.icon }}</div>
            <div class="schedule-detail-info">
              <div class="schedule-detail-title">{{ selectedSchedule.title }}</div>
              <div class="schedule-detail-time">
                <span class="time-label">时间：</span>
                <span class="time-value">{{ selectedSchedule.time }}</span>
              </div>
              <div v-if="selectedSchedule.staff" class="schedule-detail-staff">
                <span class="staff-label">负责人员：</span>
                <span class="staff-value">{{ selectedSchedule.staff }}</span>
              </div>
              <div class="schedule-detail-type">
                <span class="type-label">类型：</span>
                <span class="type-value">{{ getScheduleTypeName(selectedSchedule.type) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeScheduleDialog">关闭</button>
          <button class="save-btn" @click="editSchedule(selectedSchedule)">编辑日程</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-detail-page {
  min-height: 100vh;
  background: #f5f7f4;
  padding: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #64748b;
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: #2f9b52;
}

.breadcrumb-item.active {
  color: #1e293b;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #cbd5e1;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #2f9b52;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.patient-detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 左侧列 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 患者资料卡片 */
.patient-profile-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 24px;
}

.profile-photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.patient-photo {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f4eb 0%, #d1fae5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #2f9b52;
}

.patient-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  font-size: 64px;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.call-btn {
  background: #2f9b52;
  color: white;
}

.call-btn:hover:not(:disabled) {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #94a3b8;
}

.chat-btn {
  background: #e2e8f0;
  color: #64748b;
}

.chat-btn:hover {
  background: #cbd5e1;
}

.profile-info-section {
  flex: 1;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.profile-name-section {
  flex: 1;
}

.patient-name {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.patient-label {
  font-size: 14px;
  color: #64748b;
}

.edit-profile-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2f9b52;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-profile-btn:hover {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.profile-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.gender-tag {
  background: #e8f4eb;
  color: #065f46;
}

.treatment-tag {
  background: #dbeafe;
  color: #1e40af;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
}

.detail-icon {
  font-size: 16px;
}

.detail-label {
  font-weight: 500;
  min-width: 80px;
}

.detail-value {
  color: #1e293b;
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
  font-weight: 500;
}

.card-value-large {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.star-icon {
  font-size: 32px;
}

.card-description {
  font-size: 14px;
  color: #64748b;
}

.education-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.education-icon {
  font-size: 48px;
}

.education-info {
  flex: 1;
}

.education-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.education-location {
  font-size: 14px;
  color: #64748b;
}

/* 医院病历单 */
.medical-records-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 20px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.record-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.record-content {
  flex: 1;
}

.record-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.record-description {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.6;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-date {
  font-size: 12px;
  color: #94a3b8;
}

.record-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
}

.record-status.recovered {
  background: #d1fae5;
  color: #065f46;
}

.view-record-btn {
  padding: 8px 16px;
  background: #2f9b52;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  align-self: flex-start;
}

.view-record-btn:hover {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

/* 右侧列 */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 关于部分 */
.about-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.about-content {
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

.about-text {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.about-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  color: #94a3b8;
  font-size: 14px;
  margin-bottom: 16px;
}

.add-about-btn {
  padding: 8px 16px;
  background: #2f9b52;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.add-about-btn:hover {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.edit-about-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-about-btn:hover {
  background: #f1f5f9;
}

.edit-icon-small {
  font-size: 16px;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.6;
}

/* 关于编辑模式样式 */
.about-edit-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: #1e293b;
  resize: vertical;
  min-height: 120px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.about-textarea:focus {
  border-color: #2f9b52;
  box-shadow: 0 0 0 3px rgba(47, 155, 82, 0.1);
}

.about-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.about-cancel-btn,
.about-save-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.about-cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.about-cancel-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.about-save-btn {
  background: #2f9b52;
  color: white;
}

.about-save-btn:hover:not(:disabled) {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.about-cancel-btn:disabled,
.about-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 医生列表 */
.doctors-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.time-filter {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
}

.doctors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doctor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.doctor-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
  background: #f8fafc;
  border-radius: 12px;
  transition: background 0.2s;
}

.doctor-item:hover {
  background: #f1f5f9;
}

.doctor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.doctor-info {
  flex: 1;
}

.doctor-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.doctor-id {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}

/* 医生诊断 */
.diagnosis-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.diagnosis-tag {
  padding: 6px 12px;
  background: #e8f4eb;
  color: #065f46;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.diagnosis-content {
  margin-top: 16px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

.diagnosis-text {
  margin: 0 0 8px 0;
}

/* 日程安排 */
.schedule-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.schedule-timeline {
  position: relative;
  margin-top: 20px;
}

.time-slots {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.time-slot {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
}

.schedule-events {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-event {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #2f9b52;
  transition: all 0.3s;
}

.schedule-event:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}

.schedule-event.monitoring {
  border-left-color: #667eea;
}

.event-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.event-content {
  flex: 1;
}

.event-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.event-time {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.event-staff {
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .patient-detail-content {
    grid-template-columns: 1fr;
  }
}
/* 编辑对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.edit-dialog {
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-text {
  font-size: 14px;
  color: #333;
}

.avatar-group {
  margin-bottom: 24px;
}

.avatar-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-preview-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 2px solid #e2e8f0;
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-change-btn,
.avatar-delete-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s;
}

.avatar-change-btn:hover,
.avatar-delete-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-placeholder:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.avatar-icon {
  font-size: 32px;
}

.avatar-upload-label {
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
}

.avatar-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.avatar-hint {
  font-size: 12px;
  color: #94a3b8;
}

.cancel-btn,
.save-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.save-btn {
  background: #2f9b52;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 病历详情对话框样式 */
.record-detail-dialog {
  max-width: 600px;
}

.record-detail-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.record-detail-icon {
  font-size: 64px;
  flex-shrink: 0;
}

.record-detail-info {
  flex: 1;
}

.record-detail-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.record-detail-date,
.record-detail-status {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}

.date-label,
.status-label {
  font-weight: 600;
}

.date-value {
  color: #1e293b;
}

.status-value {
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
}

.status-value.recovered {
  background: #e8f4eb;
  color: #065f46;
}

.record-detail-description {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.description-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}

.description-content {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 医生详情对话框样式 */
.doctor-detail-dialog {
  max-width: 500px;
}

.doctor-detail-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.doctor-detail-avatar {
  font-size: 80px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #e2e8f0;
}

.doctor-detail-info {
  width: 100%;
}

.doctor-detail-name {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.doctor-detail-id {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 24px;
}

.id-label {
  font-weight: 500;
}

.id-value {
  color: #1e293b;
  font-family: monospace;
}

.doctor-detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.doctor-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.doctor-action-btn.call-btn {
  background: #2f9b52;
  color: white;
}

.doctor-action-btn.call-btn:hover {
  background: #278842;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 155, 82, 0.3);
}

.doctor-action-btn.chat-btn {
  background: #e2e8f0;
  color: #64748b;
}

.doctor-action-btn.chat-btn:hover {
  background: #cbd5e1;
}

/* 日程详情对话框样式 */
.schedule-detail-dialog {
  max-width: 500px;
}

.schedule-detail-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.schedule-detail-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.schedule-detail-info {
  flex: 1;
}

.schedule-detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.schedule-detail-time,
.schedule-detail-staff,
.schedule-detail-type {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}

.time-label,
.staff-label,
.type-label {
  font-weight: 600;
}

.time-value,
.staff-value,
.type-value {
  color: #1e293b;
}

/* 日程事件可点击样式 */
.schedule-event {
  cursor: pointer;
  transition: all 0.2s;
}

.schedule-event:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.schedule-filter {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  color: #64748b;
}

.schedule-filter:hover {
  border-color: #2f9b52;
}

.schedule-filter:focus {
  border-color: #2f9b52;
  box-shadow: 0 0 0 3px rgba(47, 155, 82, 0.1);
}

.schedule-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
}

.schedule-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.schedule-empty .empty-text {
  font-size: 14px;
}

.event-date {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
