<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { get, post, del } from '@/utils/request'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - xlsx 库的类型定义可能不完整
import * as XLSX from 'xlsx'

interface Staff {
  _id: string
  name: string
  employeeId?: string
  phone?: string
  email?: string
  gender?: string
  avatar?: string
  department?: string
  position?: string
  jobTitle?: string
  workStatus?: string
  hireDate?: string
  birthday?: string
  address?: string
  idCard?: string
  emergencyContact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  remarks?: string
}

const router = useRouter()

// 数据
const loading = ref(false)
const searchKeyword = ref('')
const departments = ref<string[]>([])

// 虚拟列表相关
const virtualListContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)
const itemHeight = ref(0) // 卡片或列表项的高度
const visibleCount = ref(0) // 可见区域能显示多少个项目
const bufferSize = ref(5) // 缓冲区大小（上下各多渲染5个）

// 所有员工数据（从后端获取，不分页）
const allStaffList = ref<Staff[]>([])
const total = ref(0)

// 新建员工相关
const showCreateDialog = ref(false)
const creating = ref(false)
const newStaffForm = ref({
  name: '',
  employeeId: '',
  phone: '',
  email: '',
  gender: '',
  birthday: '',
  department: '',
  position: '',
  jobTitle: '',
  workStatus: '在职',
  hireDate: new Date().toISOString().split('T')[0],
  address: '',
  idCard: '',
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
  },
  remarks: ''
})

// 获取员工列表（一次性获取所有数据）
async function fetchStaffList() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: 1,
      pageSize: 1000 // 优化：从 10000 改为 1000，减少初始加载时间
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const response = await get<{
      success: boolean
      data: {
        list: Staff[]
        total: number
        page: number
        pageSize: number
        totalPages: number
      }
      message?: string
      error?: string
    }>('/staff/list', { data: params })

    if (response.success && response.data) {
      allStaffList.value = response.data.list || []
      total.value = response.data.total || 0

      // 重置滚动位置到顶部
      scrollTop.value = 0

      // 初始化虚拟列表
      nextTick(() => {
        setTimeout(() => {
          initVirtualList()
          // 滚动到顶部
          if (virtualListContainer.value) {
            virtualListContainer.value.scrollTop = 0
          }
        }, 50)
      })
    } else {
      // 如果返回了错误，但结构正确，至少显示空列表
      allStaffList.value = []
      total.value = 0
      throw new Error(response.message || response.error || '获取员工列表失败')
    }
  } catch (error: unknown) {
    console.error('获取员工列表失败:', error)
    
    let errorMessage = '获取员工列表失败'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String((error as any).message)
    }
    
    console.error('错误详情:', errorMessage)

    // 更友好的错误提示
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
      alert('无法连接到服务器，请检查：\n1. 后端服务器是否已启动（端口 3000）\n2. 服务器地址是否正确\n3. 网络连接是否正常\n4. 浏览器控制台是否有 CORS 错误')
    } else if (errorMessage.includes('数据库') || errorMessage.includes('Database')) {
      alert('数据库连接失败，请检查：\n1. 数据库服务是否正常运行\n2. 数据库连接配置是否正确\n3. 查看后端控制台的错误信息')
    } else {
      // 提取更友好的错误信息
      const friendlyMessage = errorMessage.replace(/获取员工列表失败[:：]?/g, '').trim() || '未知错误'
      alert(`获取员工列表失败：${friendlyMessage}\n\n请检查：\n1. 后端服务是否正常运行\n2. 查看浏览器控制台获取详细错误信息`)
    }
  } finally {
    loading.value = false
  }
}

// 获取部门列表
async function fetchDepartments() {
  try {
    const response = await get<{
      success: boolean
      data: string[]
    }>('/staff/departments')

    if (response.success) {
      departments.value = response.data
    }
  } catch (error: unknown) {
    console.error('获取部门列表失败:', error)
    const errorMessage = error instanceof Error ? error.message : '获取部门列表失败'
    console.warn('获取部门列表失败，将使用空列表:', errorMessage)
  }
}


// 初始化虚拟列表
function initVirtualList() {
  if (!virtualListContainer.value) return

  // 列表视图：每行高度（包括padding和border）
  itemHeight.value = 74 // 列表行高度 (18px padding * 2 + 38px content ≈ 74px)

  // 计算容器高度
  containerHeight.value = virtualListContainer.value.clientHeight || window.innerHeight - 300

  // 计算可见区域能显示多少个项目
  visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + bufferSize.value * 2
}

// 计算虚拟列表的可见范围
const visibleRange = computed(() => {
  if (allStaffList.value.length === 0) {
    return { start: 0, end: 0 }
  }

  const start = Math.max(0, Math.floor(scrollTop.value / itemHeight.value) - bufferSize.value)
  const end = Math.min(
    allStaffList.value.length,
    start + visibleCount.value
  )

  return { start, end }
})

// 获取可见的员工列表
const visibleStaffList = computed(() => {
  return allStaffList.value.slice(visibleRange.value.start, visibleRange.value.end)
})

// 计算上方占位高度
const topOffset = computed(() => {
  const offset = visibleRange.value.start * itemHeight.value
  return Math.max(0, offset)
})

// 计算下方占位高度
const bottomOffset = computed(() => {
  const remaining = allStaffList.value.length - visibleRange.value.end
  return remaining * itemHeight.value
})

// 处理滚动事件
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop

  // 如果容器高度变化，重新初始化
  if (virtualListContainer.value) {
    const currentHeight = virtualListContainer.value.clientHeight
    if (Math.abs(currentHeight - containerHeight.value) > 50) {
      initVirtualList()
    }
  }
}

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  // 设置新的定时器，延迟300ms执行搜索
  searchTimer = setTimeout(() => {
    scrollTop.value = 0
    fetchStaffList()
  }, 300)
}

// 立即搜索（回车时）
function handleSearchImmediate() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  scrollTop.value = 0
  fetchStaffList()
}

// 查看详情
function viewDetail(staff: Staff) {
  router.push(`/staff/${staff._id}`)
}

// 删除员工
async function deleteStaff(staff: Staff, event: Event) {
  event.stopPropagation()

  if (!confirm(`确定要删除员工 "${staff.name}" 吗？`)) {
    return
  }

  try {
    const response = await del<{ success: boolean; message: string }>(`/staff/${staff._id}`)

    if (response.success) {
      alert('删除成功')
      fetchStaffList()
    }
  } catch (error) {
    console.error('删除员工失败:', error)
    alert('删除失败，请稍后重试')
  }
}

// 获取员工头像（使用images中的图片）
function getStaffAvatar(staff: Staff) {
  if (staff.avatar) {
    return staff.avatar
  }
  // 统一使用一张图片
  return '/images/doctor1.png'
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

// 获取职位显示
function getJobDisplay(staff: Staff) {
  return staff.jobTitle || staff.position || staff.department || '员工'
}

// 判断是否为全职（根据hireDate判断，这里简化处理）
function isFullTime(staff: Staff) {
  // 可以根据实际业务逻辑判断
  return staff.workStatus === '在职' && !staff.employeeId?.includes('EXT')
}

// 跳转页码输入

// 打开新建对话框
function openCreateDialog() {
  showCreateDialog.value = true
  newStaffForm.value = {
    name: '',
    employeeId: '',
    phone: '',
    email: '',
    gender: '',
    birthday: '',
    department: '',
    position: '',
    jobTitle: '',
    workStatus: '在职',
    hireDate: new Date().toISOString().split('T')[0],
    address: '',
    idCard: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    remarks: ''
  }
}

// 关闭新建对话框
function closeCreateDialog() {
  showCreateDialog.value = false
}

// 创建新员工
async function createStaff() {
  if (!newStaffForm.value.name) {
    alert('请输入员工姓名')
    return
  }

  creating.value = true
  try {
    const response = await post<{
      success: boolean
      message: string
      data: Staff
    }>('/staff', newStaffForm.value)

    if (response.success) {
      alert('员工创建成功！')
      closeCreateDialog()
      fetchStaffList()
      fetchDepartments()
    }
  } catch (error: unknown) {
    console.error('创建员工失败:', error)
    const errorMessage = error instanceof Error ? error.message : '创建失败，请稍后重试'
    alert(errorMessage)
  } finally {
    creating.value = false
  }
}

// 导出员工数据为Excel
const exporting = ref(false)
const exportProgress = ref(0)
const showExportProgress = ref(false)

async function exportStaffToExcel() {
  try {
    exporting.value = true
    exportProgress.value = 0
    showExportProgress.value = true

    // 获取所有员工数据（不分页）
    exportProgress.value = 20
    const response = await get<{
      success: boolean
      data: {
        list: Staff[]
        total: number
      }
    }>('/staff/list', {
      data: {
        page: 1,
        pageSize: 10000 // 获取所有数据
      }
    })

    if (!response.success || !response.data) {
      showExportProgress.value = false
      alert('获取员工数据失败')
      return
    }

    const staffData = response.data.list
    exportProgress.value = 40

    // 准备Excel数据（分批处理，避免阻塞UI）
    const excelData: Array<Record<string, string>> = []
    const batchSize = 500 // 每批处理500条

    for (let i = 0; i < staffData.length; i += batchSize) {
      const batch = staffData.slice(i, i + batchSize)
      const batchData = batch.map(staff => ({
        '姓名': staff.name || '',
        '工号': staff.employeeId || '',
        '手机号': staff.phone || '',
        '邮箱': staff.email || '',
        '性别': staff.gender || '',
        '部门': staff.department || '',
        '职位': staff.position || '',
        '职称': staff.jobTitle || '',
        '工作状态': staff.workStatus || '',
        '入职日期': staff.hireDate || '',
        '生日': staff.birthday || '',
        '地址': staff.address || '',
        '身份证号': staff.idCard || '',
        '紧急联系人': staff.emergencyContact?.name || '',
        '紧急联系人电话': staff.emergencyContact?.phone || '',
        '紧急联系人关系': staff.emergencyContact?.relationship || '',
        '备注': staff.remarks || ''
      }))
      excelData.push(...batchData)

      // 更新进度
      exportProgress.value = 40 + Math.floor((i / staffData.length) * 30)

      // 让出控制权，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    exportProgress.value = 70

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 姓名
      { wch: 12 }, // 工号
      { wch: 15 }, // 手机号
      { wch: 20 }, // 邮箱
      { wch: 6 },  // 性别
      { wch: 12 }, // 部门
      { wch: 12 }, // 职位
      { wch: 12 }, // 职称
      { wch: 10 }, // 工作状态
      { wch: 12 }, // 入职日期
      { wch: 12 }, // 生日
      { wch: 30 }, // 地址
      { wch: 18 }, // 身份证号
      { wch: 12 }, // 紧急联系人
      { wch: 15 }, // 紧急联系人电话
      { wch: 12 }, // 紧急联系人关系
      { wch: 30 }  // 备注
    ]
    ws['!cols'] = colWidths

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '员工列表')

    exportProgress.value = 90

    // 生成文件名
    const fileName = `员工列表_${new Date().toISOString().split('T')[0]}.xlsx`

    // 导出文件
    XLSX.writeFile(wb, fileName)

    exportProgress.value = 100

    // 延迟关闭进度提示，让用户看到完成状态
    setTimeout(() => {
      showExportProgress.value = false
      alert(`✅ 成功导出 ${staffData.length} 条员工数据\n\n文件名：${fileName}`)
    }, 300)
  } catch (error) {
    console.error('导出失败:', error)
    showExportProgress.value = false
    alert('导出失败，请稍后重试')
  } finally {
    exporting.value = false
    exportProgress.value = 0
  }
}

// 导入员工数据
const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importProgress = ref(0)
const showImportProgress = ref(false)

function triggerImport() {
  fileInputRef.value?.click()
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  // 验证文件类型
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    alert('请选择 Excel 文件（.xlsx 或 .xls）')
    return
  }

  // 验证文件大小（限制50MB）
  if (file.size > 50 * 1024 * 1024) {
    alert('文件大小不能超过 50MB')
    return
  }

  importing.value = true
  importProgress.value = 0
  showImportProgress.value = true

  try {
    // 读取文件
    importProgress.value = 10
    const arrayBuffer = await file.arrayBuffer()
    importProgress.value = 20

    // 解析Excel（使用 setTimeout 让出控制权，避免阻塞UI）
    await new Promise(resolve => setTimeout(resolve, 0))

    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // 获取第一个工作表
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      showImportProgress.value = false
      importing.value = false
      importProgress.value = 0
      alert('Excel 文件中没有工作表')
      return
    }
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      showImportProgress.value = false
      importing.value = false
      importProgress.value = 0
      alert('无法获取工作表名称')
      return
    }
    const worksheet = workbook.Sheets[firstSheetName]

    if (!worksheet) {
      showImportProgress.value = false
      importing.value = false
      importProgress.value = 0
      alert('无法读取工作表数据')
      return
    }

    // 转换为JSON
    interface ExcelRow {
      [key: string]: string | number | undefined
    }
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[]

    if (jsonData.length === 0) {
      showImportProgress.value = false
      alert('Excel 文件中没有数据')
      return
    }

    importProgress.value = 30

    // 辅助函数：将值转换为字符串
    const toString = (value: string | number | undefined): string => {
      if (value === undefined || value === null) return ''
      return String(value)
    }

    // 验证并转换数据格式（分批处理，避免阻塞UI）
    const staffDataList: Partial<Staff>[] = []
    const errors: Array<{ row: number; message: string }> = []
    const batchSize = 200 // 每批处理200条

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize)

      batch.forEach((row: ExcelRow, batchIndex: number) => {
        const index = i + batchIndex
        const rowNum = index + 2 // Excel行号（从2开始，因为第1行是标题）

        // 姓名是必填项
        const name = toString(row['姓名']) || toString(row['name'])
        if (!name) {
          errors.push({ row: rowNum, message: '姓名为必填项' })
          return
        }

        const staffData: Partial<Staff> = {
          name: name,
          employeeId: toString(row['工号']) || toString(row['employeeId']),
          phone: toString(row['手机号']) || toString(row['phone']),
          email: toString(row['邮箱']) || toString(row['email']),
          gender: toString(row['性别']) || toString(row['gender']),
          department: toString(row['部门']) || toString(row['department']),
          position: toString(row['职位']) || toString(row['position']),
          jobTitle: toString(row['职称']) || toString(row['jobTitle']),
          workStatus: toString(row['工作状态']) || toString(row['workStatus']) || '在职',
          hireDate: toString(row['入职日期']) || toString(row['hireDate']),
          birthday: toString(row['生日']) || toString(row['birthday']),
          address: toString(row['地址']) || toString(row['address']),
          idCard: toString(row['身份证号']) || toString(row['idCard']),
          emergencyContact: {
            name: toString(row['紧急联系人']) || toString(row['emergencyContactName']),
            phone: toString(row['紧急联系人电话']) || toString(row['emergencyContactPhone']),
            relationship: toString(row['紧急联系人关系']) || toString(row['emergencyContactRelationship'])
          },
          remarks: toString(row['备注']) || toString(row['remarks'])
        }

        staffDataList.push(staffData)
      })

      // 更新进度
      importProgress.value = 30 + Math.floor((i / jsonData.length) * 30)

      // 让出控制权，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    importProgress.value = 60

    // 显示错误信息（如果有）
    if (errors.length > 0) {
      const errorMsg = `数据验证发现 ${errors.length} 个错误：\n${errors.slice(0, 5).map(e => `第 ${e.row} 行：${e.message}`).join('\n')}${errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : ''}`

      const shouldContinue = confirm(`${errorMsg}\n\n是否继续导入有效数据？`)
      if (!shouldContinue) {
        showImportProgress.value = false
        importing.value = false
        importProgress.value = 0
        if (target) target.value = ''
        return
      }
    }

    if (staffDataList.length === 0) {
      showImportProgress.value = false
      alert('没有有效的数据可以导入')
      return
    }

    // 确认导入
    const confirmMsg = `准备导入 ${staffDataList.length} 条员工数据${errors.length > 0 ? `（跳过 ${errors.length} 条错误数据）` : ''}，是否继续？`
    if (!confirm(confirmMsg)) {
      showImportProgress.value = false
      importing.value = false
      importProgress.value = 0
      if (target) target.value = ''
      return
    }

    // 使用批量导入API（性能优化）
    importProgress.value = 70

    const response = await post<{
      success: boolean
      message: string
      data: {
        total: number
        success: number
        failed: number
        errors: Array<{ row: number; message: string }>
        duplicateErrors: Array<{ row: number; message: string; data: Partial<Staff> }>
      }
    }>('/staff/batch', { staffList: staffDataList })

    importProgress.value = 100

    if (response.success && response.data) {
      const { success, failed, errors: importErrors, duplicateErrors } = response.data

      // 构建结果消息
      let resultMsg = `✅ 导入完成！\n\n成功：${success} 条\n失败：${failed} 条`

      const allErrors = [...(importErrors || []), ...(duplicateErrors || [])]
      if (allErrors.length > 0) {
        if (allErrors.length <= 10) {
          resultMsg += `\n\n失败详情：\n${allErrors.map(e => `第 ${e.row} 行：${e.message || '创建失败'}`).join('\n')}`
        } else {
          resultMsg += `\n\n失败详情（前10条）：\n${allErrors.slice(0, 10).map(e => `第 ${e.row} 行：${e.message || '创建失败'}`).join('\n')}\n...还有 ${allErrors.length - 10} 条失败记录`
        }
      }

      // 延迟关闭进度提示
      setTimeout(() => {
        showImportProgress.value = false
        alert(resultMsg)

        // 刷新列表
        if (success > 0) {
          fetchStaffList()
          fetchDepartments()
        }
      }, 300)
    } else {
      showImportProgress.value = false
      alert(response.message || '导入失败，请稍后重试')
    }

    // 清空文件输入
    if (target) {
      target.value = ''
    }
  } catch (error) {
    console.error('导入失败:', error)
    showImportProgress.value = false
    const errorMsg = error instanceof Error ? error.message : '导入失败，请检查文件格式是否正确'
    alert(`导入失败：${errorMsg}`)
  } finally {
    importing.value = false
    importProgress.value = 0
  }
}

// 调试：检查API连接
async function checkApiConnection() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  console.log('🔍 API基础URL:', apiBaseUrl)
  console.log('🔍 完整的员工列表URL:', `${apiBaseUrl}/staff/list`)
  console.log('🔍 完整的部门列表URL:', `${apiBaseUrl}/staff/departments`)

  try {
    const healthCheck = await fetch(apiBaseUrl.replace('/api', '/health'))
    if (healthCheck.ok) {
      const health = await healthCheck.json()
      console.log('✅ 后端服务器连接正常:', health)
    }
  } catch (e) {
    console.error('❌ 无法连接到后端服务器:', e)
    console.error('💡 请确保后端服务器已启动: cd houduan && node app.js')
  }
}

onMounted(() => {
  checkApiConnection()
  fetchStaffList()
  fetchDepartments()
  // position 列表会在 fetchStaffList 后从数据中提取

  // 预加载统一头像图片，避免滚动时重新加载
  const avatarImg = new Image()
  avatarImg.src = '/images/doctor1.png'

  // 监听窗口大小变化，重新初始化虚拟列表
  const handleResize = () => {
    nextTick(() => {
      initVirtualList()
    })
  }
  window.addEventListener('resize', handleResize)

  // 延迟初始化虚拟列表，确保DOM已渲染
  setTimeout(() => {
    initVirtualList()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', initVirtualList)
})

// 监听数据变化，重新初始化虚拟列表
watch(() => allStaffList.value.length, () => {
  nextTick(() => {
    setTimeout(() => {
      initVirtualList()
    }, 50)
  })
})
</script>

<template>
  <div class="page-container">
    <!-- 顶部标题和筛选 -->
    <header class="page-header">
      <h1 class="page-title">员工管理</h1>

      <div class="header-controls">
        <!-- 搜索和新建 -->
        <div class="header-actions">
          <!-- 仅保留列表视图 -->
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索"
              class="search-input"
              @input="handleSearch"
              @keyup.enter="handleSearchImmediate"
            />
          </div>
          <button class="import-btn" @click="triggerImport" title="导入员工" :disabled="importing || exporting">
            <span class="import-icon">📥</span>
            <span v-if="importing">导入中...</span>
          </button>
          <button class="export-btn" @click="exportStaffToExcel" title="导出员工" :disabled="loading || exporting">
            <span class="export-icon">📤</span>
            <span v-if="exporting">导出中...</span>
          </button>
          <button class="add-btn" @click="openCreateDialog" title="新建员工">
            <span class="add-icon">+</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileImport"
    />

    <!-- 员工列表 -->
    <div class="staff-list-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="allStaffList.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">暂无员工数据</div>
        <div class="empty-subtitle">请添加员工或调整搜索条件</div>
      </div>

      <!-- 列表视图（虚拟列表） -->
      <div
        class="staff-list-view"
      >
        <div class="list-header">
          <div class="list-col list-col-avatar">头像</div>
          <div class="list-col list-col-name">姓名</div>
          <div class="list-col list-col-age">年龄</div>
          <div class="list-col list-col-job">职位</div>
          <div class="list-col list-col-dept">部门</div>
          <div class="list-col list-col-phone">电话</div>
          <div class="list-col list-col-email">邮箱</div>
          <div class="list-col list-col-status">状态</div>
          <div class="list-col list-col-actions">操作</div>
        </div>

        <div
          ref="virtualListContainer"
          class="list-content virtual-list-container"
          @scroll="handleScroll"
        >
          <!-- 上方占位 -->
          <div :style="{ height: `${topOffset}px` }"></div>

          <!-- 可见区域的列表项 -->
        <div
            v-for="(staff, index) in visibleStaffList"
            :key="`row-${staff._id}-${visibleRange.start + index}`"
          class="list-row"
            :data-index="visibleRange.start + index"
        >
          <div class="list-col list-col-avatar">
            <img
                :key="`avatar-${staff._id}`"
                :src="getStaffAvatar(staff)"
              :alt="staff.name"
              class="list-avatar"
                loading="lazy"
              @error="(e) => {
                (e.target as HTMLImageElement).src = '/images/doctor1.png'
              }"
            />
          </div>
          <div class="list-col list-col-name">
            <span class="list-name">{{ staff.name }}</span>
          </div>
          <div class="list-col list-col-age">
            <span v-if="calculateAge(staff.birthday)">{{ calculateAge(staff.birthday) }}岁</span>
            <span v-else class="text-muted">-</span>
          </div>
          <div class="list-col list-col-job">
            <span>{{ getJobDisplay(staff) }}</span>
          </div>
          <div class="list-col list-col-dept">
            <span>{{ staff.department || '-' }}</span>
          </div>
          <div class="list-col list-col-phone">
            <span>{{ staff.phone || '-' }}</span>
          </div>
          <div class="list-col list-col-email">
            <span>{{ staff.email || '-' }}</span>
          </div>
          <div class="list-col list-col-status">
              <div class="status-group">
            <span class="status-tag status-active">在职</span>
            <span v-if="isFullTime(staff)" class="status-tag status-fulltime">全职</span>
            <span v-else class="status-tag status-external">外聘</span>
              </div>
          </div>
          <div class="list-col list-col-actions">
            <button class="action-btn detail-btn" @click="viewDetail(staff)">
              详情
            </button>
            <button class="action-btn delete-btn" @click="deleteStaff(staff, $event)">
              删除
            </button>
        </div>
      </div>

          <!-- 下方占位 -->
          <div :style="{ height: `${bottomOffset}px` }"></div>
        </div>
      </div>

      <!-- 数据统计信息（替代分页） -->
      <div v-if="total > 0" class="data-info">
        <div class="data-info-text">
          共 {{ total }} 条记录
        </div>
      </div>
          </div>

    <!-- 导出进度提示 -->
    <div v-if="showExportProgress" class="progress-modal">
      <div class="progress-content">
        <div class="progress-title">正在导出数据...</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${exportProgress}%` }"></div>
          </div>
        <div class="progress-text">{{ exportProgress }}%</div>
        </div>
    </div>

    <!-- 导入进度提示 -->
    <div v-if="showImportProgress" class="progress-modal">
      <div class="progress-content">
        <div class="progress-title">正在导入数据...</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${importProgress}%` }"></div>
        </div>
        <div class="progress-text">{{ importProgress }}%</div>
      </div>
    </div>

    <!-- 新建员工对话框 -->
    <div v-if="showCreateDialog" class="modal-overlay" @click="closeCreateDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">新建员工</h2>
          <button class="modal-close" @click="closeCreateDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">姓名 <span class="required">*</span></label>
              <input
                v-model="newStaffForm.name"
                type="text"
                class="form-input"
                placeholder="请输入姓名"
              />
            </div>
            <div class="form-group">
              <label class="form-label">工号</label>
              <input
                v-model="newStaffForm.employeeId"
                type="text"
                class="form-input"
                placeholder="留空将自动生成"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">性别</label>
              <select v-model="newStaffForm.gender" class="form-input">
                <option value="">请选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="保密">保密</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">出生日期</label>
              <input
                v-model="newStaffForm.birthday"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">手机号码</label>
              <input
                v-model="newStaffForm.phone"
                type="tel"
                class="form-input"
                placeholder="请输入手机号码"
              />
            </div>
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input
                v-model="newStaffForm.email"
                type="email"
                class="form-input"
                placeholder="请输入邮箱"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部门</label>
              <input
                v-model="newStaffForm.department"
                type="text"
                class="form-input"
                placeholder="请输入部门"
              />
            </div>
            <div class="form-group">
              <label class="form-label">职位</label>
              <input
                v-model="newStaffForm.position"
                type="text"
                class="form-input"
                placeholder="请输入职位"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">职称</label>
              <input
                v-model="newStaffForm.jobTitle"
                type="text"
                class="form-input"
                placeholder="请输入职称"
              />
            </div>
            <div class="form-group">
              <label class="form-label">工作状态</label>
              <select v-model="newStaffForm.workStatus" class="form-input">
                <option value="在职">在职</option>
                <option value="离职">离职</option>
                <option value="休假">休假</option>
                <option value="停职">停职</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">入职日期</label>
              <input
                v-model="newStaffForm.hireDate"
                type="date"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">身份证号</label>
              <input
                v-model="newStaffForm.idCard"
                type="text"
                class="form-input"
                placeholder="请输入身份证号"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label class="form-label">地址</label>
              <input
                v-model="newStaffForm.address"
                type="text"
                class="form-input"
                placeholder="请输入地址"
              />
            </div>
          </div>

          <div class="form-section-title">紧急联系人</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">联系人姓名</label>
              <input
                v-model="newStaffForm.emergencyContact.name"
                type="text"
                class="form-input"
                placeholder="请输入联系人姓名"
              />
            </div>
            <div class="form-group">
              <label class="form-label">联系电话</label>
              <input
                v-model="newStaffForm.emergencyContact.phone"
                type="tel"
                class="form-input"
                placeholder="请输入联系电话"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">关系</label>
              <input
                v-model="newStaffForm.emergencyContact.relationship"
                type="text"
                class="form-input"
                placeholder="请输入关系"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label class="form-label">备注</label>
              <textarea
                v-model="newStaffForm.remarks"
                class="form-textarea"
                placeholder="请输入备注信息"
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeCreateDialog">取消</button>
          <button class="modal-btn confirm-btn" @click="createStaff" :disabled="creating">
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f7f4;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0 0 20px 0;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: #f5f5f5;
}

.filter-tab.active {
  background: #e9ecef;
  border-color: #007aff;
  color: #007aff;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px;
}

.view-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #666;
}

.view-btn:hover {
  background: #f5f5f5;
}

.view-btn.active {
  background: #007aff;
  color: #fff;
}

.view-icon {
  font-size: 18px;
  line-height: 1;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  color: #999;
}

.search-input {
  padding: 10px 16px 10px 36px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  width: 200px;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007aff;
}

.import-btn,
.export-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  border: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.import-btn {
  background: #2196F3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.import-btn:hover:not(:disabled) {
  background: #1976D2;
}

.import-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  background: #FF9800;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.export-btn:hover:not(:disabled) {
  background: #F57C00;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.import-icon,
.export-icon {
  font-size: 18px;
  line-height: 1;
}

.add-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #4CAF50;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.add-btn:hover {
  background: #45a049;
}

.add-icon {
  line-height: 1;
}

.staff-list-container {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-height: 400px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
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

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 500;
  color: #2d2f31;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #6e736c;
}

/* 员工卡片网格 - 每行3个 */
/* 虚拟列表容器 */
.virtual-list-container {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 300px);
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f1f5f9;
}

.virtual-list-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.staff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 28px;
  position: relative;
  margin-bottom: 24px;
  padding: 4px;
}

@media (min-width: 1400px) {
  .staff-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1200px) {
  .staff-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  }
}

@media (max-width: 900px) {
  .staff-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 600px) {
  .staff-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.staff-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.staff-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #007aff 0%, #00a8ff 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.staff-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.15);
  border-color: #007aff;
}

.staff-card:hover::before {
  opacity: 1;
}

.card-header {
  position: relative;
  margin-bottom: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.staff-avatar {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transition: transform 0.3s ease;
  display: block;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  will-change: transform;
}

.staff-card:hover .staff-avatar {
  transform: scale(1.05);
}

.status-tags {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  z-index: 2;
}

.status-tag {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.status-active {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: #fff;
}

.status-fulltime {
  background: rgba(255, 255, 255, 0.95);
  color: #495057;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.status-external {
  background: rgba(255, 255, 255, 0.95);
  color: #6c757d;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.card-body {
  text-align: center;
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.staff-name {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 10px 0;
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.staff-age {
  font-size: 15px;
  color: #6c757d;
  margin-bottom: 10px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.staff-age::before {
  content: '👤';
  font-size: 14px;
}

.staff-job {
  font-size: 15px;
  color: #495057;
  font-weight: 500;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  display: inline-block;
  margin-top: 4px;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.detail-btn {
  background-color: #007aff;
  color: #fff;
}

.detail-btn:hover {
  background-color: #0056b3;
}

.delete-btn {
  background-color: #f44336;
  color: #fff;
}

.delete-btn:hover {
  background-color: #da190b;
}

/* 列表视图 */
.staff-list-view {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  max-height: calc(100vh - 300px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.staff-list-view .list-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  flex-shrink: 0;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 90px 130px 90px 160px 130px 150px 220px 130px 160px;
  gap: 20px;
  padding: 18px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 2px solid #dee2e6;
  font-weight: 700;
  font-size: 13px;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.list-row {
  display: grid;
  grid-template-columns: 90px 130px 90px 160px 130px 150px 220px 130px 160px;
  gap: 20px;
  padding: 18px 24px;
  border-bottom: 1px solid #e9ecef;
  transition: all 0.2s ease;
  align-items: center;
  background: #ffffff;
  position: relative;
}

.list-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #007aff;
  opacity: 0;
  transition: opacity 0.2s;
}

.list-row:hover {
  background: linear-gradient(90deg, #f8f9ff 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.08);
  transform: translateX(2px);
}

.list-row:hover::before {
  opacity: 1;
}

.list-row:last-child {
  border-bottom: none;
}

.list-col {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #2d2f31;
}

.list-col-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-col-actions .action-btn {
  font-size: 12px;
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.list-col-actions .detail-btn {
  background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
  box-shadow: 0 2px 4px rgba(0, 122, 255, 0.2);
}

.list-col-actions .detail-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 122, 255, 0.3);
}

.list-col-actions .delete-btn {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.2);
}

.list-col-actions .delete-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
}

.list-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e9ecef;
  transition: all 0.3s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  will-change: transform;
}

.list-row:hover .list-avatar {
  border-color: #007aff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
}

.list-name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 15px;
  letter-spacing: -0.2px;
}

.list-col-age,
.list-col-job,
.list-col-dept {
  color: #495057;
  font-weight: 500;
}

.list-col-phone,
.list-col-email {
  color: #6c757d;
  font-size: 13px;
}

.list-col-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.status-group .status-tag {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.text-muted {
  color: #999;
}

/* 分页 */
.virtual-list-info {
  margin-top: 24px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.pagination-wrapper {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

.pagination-info {
  text-align: center;
  font-size: 14px;
  color: #6e736c;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.page-btn {
  padding: 8px 16px;
  background-color: #007aff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 60px;
}

.page-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.page-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
  align-items: center;
}

.page-number-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  color: #2d2f31;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number-btn:hover:not(:disabled):not(.active) {
  background: #f5f5f5;
  border-color: #007aff;
}

.page-number-btn.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.page-number-btn.ellipsis {
  cursor: default;
  border: none;
  background: transparent;
}

.page-number-btn.ellipsis:hover {
  background: transparent;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid #e9ecef;
  font-size: 14px;
  color: #666;
}

.page-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  outline: none;
}

.page-input:focus {
  border-color: #007aff;
}

.page-jump-btn {
  padding: 6px 12px;
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.page-jump-btn:hover {
  background: #45a049;
}

/* 新建员工对话框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #6e736c;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background-color: #f5f5f5;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
}

.modal-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.confirm-btn {
  background-color: #007aff;
  color: #fff;
}

.confirm-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.confirm-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d2f31;
  margin: 24px 0 16px 0;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #2d2f31;
}

.required {
  color: #f44336;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #007aff;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

@media (max-width: 1200px) {
  .staff-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .list-header,
  .list-row {
    grid-template-columns: 60px 100px 60px 120px 100px 120px 150px 100px 120px;
    font-size: 12px;
    gap: 8px;
    padding: 12px 16px;
  }
}

@media (max-width: 768px) {
  .staff-grid {
    grid-template-columns: 1fr;
  }

  .header-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-tabs {
    justify-content: center;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .list-header,
  .list-row {
    display: none; /* 移动端隐藏列表视图，建议使用卡片视图 */
  }

  .list-header.mobile-visible,
  .list-row.mobile-visible {
    display: block;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .page-jump {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid #e9ecef;
    padding-top: 12px;
    width: 100%;
    justify-content: center;
  }

  .page-numbers {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
