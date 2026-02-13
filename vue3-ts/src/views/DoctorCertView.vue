<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get, put } from '@/utils/request'

function resolvePhotoUrl(url: string): string {
  if (!url) return ''
  // COS 或其他外部 URL 直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 仅将本地后端 URL 转为相对路径，让 Vite 代理处理
    try {
      const u = new URL(url)
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || /^192\.168\./.test(u.hostname)) {
        return u.pathname // /uploads/images/xxx.jpg
      }
    } catch {
      // 解析失败，原样返回
    }
    return url
  }
  // 相对路径如 /uploads/... 直接返回，由 Vite 代理处理
  return url
}

interface CertItem {
  _id: string
  userId: string
  username: string
  realName: string
  certNo: string
  hospital: string
  department: string
  title: string
  photos: string[]
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  reviewerName?: string
  reviewRemark?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

const loading = ref(false)
const list = ref<CertItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('all')
const keyword = ref('')

// 审核弹窗
const showReviewDialog = ref(false)
const reviewTarget = ref<CertItem | null>(null)
const reviewAction = ref<'approved' | 'rejected'>('approved')
const reviewRemark = ref('')
const reviewLoading = ref(false)

// 详情弹窗
const showDetailDialog = ref(false)
const detailTarget = ref<CertItem | null>(null)

// 图片预览
const showImagePreview = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已撤销', value: 'revoked' },
]

// 撤销弹窗
const showRevokeDialog = ref(false)
const revokeTarget = ref<CertItem | null>(null)
const revokeRemark = ref('')
const revokeLoading = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res = await get<{
      success: boolean
      data: { list: CertItem[]; total: number; page: number; pageSize: number }
    }>('/doctor-cert/list', {
      data: {
        status: filterStatus.value,
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined,
      },
    })
    if (res.success) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('获取认证列表失败:', e)
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  page.value = 1
  fetchList()
}

function onSearch() {
  page.value = 1
  fetchList()
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchList()
}

function openDetail(item: CertItem) {
  detailTarget.value = item
  showDetailDialog.value = true
}

function openReview(item: CertItem, action: 'approved' | 'rejected') {
  reviewTarget.value = item
  reviewAction.value = action
  reviewRemark.value = ''
  showReviewDialog.value = true
}

async function submitReview() {
  if (!reviewTarget.value) return
  reviewLoading.value = true
  try {
    const res = await put<{ success: boolean; message: string }>(
      `/doctor-cert/review/${reviewTarget.value._id}`,
      {
        status: reviewAction.value,
        reviewRemark: reviewRemark.value,
      }
    )
    if (res.success) {
      showReviewDialog.value = false
      showDetailDialog.value = false
      fetchList()
    }
  } catch (e: unknown) {
    console.error('审核失败:', e)
    alert((e instanceof Error ? e.message : '') || '审核失败')
  } finally {
    reviewLoading.value = false
  }
}

function openImagePreview(photos: string[], index: number) {
  previewImages.value = photos
  previewIndex.value = index
  showImagePreview.value = true
}

function prevImage() {
  if (previewIndex.value > 0) previewIndex.value--
}

function nextImage() {
  if (previewIndex.value < previewImages.value.length - 1) previewIndex.value++
}

function statusLabel(s: string) {
  const m: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝', revoked: '已撤销' }
  return m[s] || s
}

function openRevoke(item: CertItem) {
  revokeTarget.value = item
  revokeRemark.value = ''
  showRevokeDialog.value = true
}

async function submitRevoke() {
  if (!revokeTarget.value) return
  revokeLoading.value = true
  try {
    const res = await put<{ success: boolean; message: string }>(
      `/doctor-cert/revoke/${revokeTarget.value._id}`,
      { reviewRemark: revokeRemark.value }
    )
    if (res.success) {
      showRevokeDialog.value = false
      showDetailDialog.value = false
      fetchList()
    }
  } catch (e: unknown) {
    console.error('撤销失败:', e)
    alert((e instanceof Error ? e.message : '') || '撤销失败')
  } finally {
    revokeLoading.value = false
  }
}

function statusClass(s: string) {
  return `status-${s}`
}

function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="cert-review-page">
    <div class="page-header">
      <h2>医师认证审核</h2>
      <p class="subtitle">审核用户提交的医师资格认证申请</p>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          :class="['tab-btn', { active: filterStatus === opt.value }]"
          @click="filterStatus = opt.value; onFilterChange()"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="search-box">
        <input
          v-model="keyword"
          placeholder="搜索姓名/编号/用户名"
          class="search-input"
          @keyup.enter="onSearch"
        />
        <button class="search-btn" @click="onSearch">搜索</button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <div v-if="loading" class="loading-mask">加载中...</div>
      <table class="cert-table" v-else>
        <thead>
          <tr>
            <th>姓名</th>
            <th>用户名</th>
            <th>证书编号</th>
            <th>医院</th>
            <th>科室</th>
            <th>职称</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="list.length === 0">
            <td colspan="9" class="empty">暂无数据</td>
          </tr>
          <tr v-for="item in list" :key="item._id">
            <td>{{ item.realName }}</td>
            <td>{{ item.username }}</td>
            <td>{{ item.certNo }}</td>
            <td>{{ item.hospital || '-' }}</td>
            <td>{{ item.department || '-' }}</td>
            <td>{{ item.title || '-' }}</td>
            <td>
              <span :class="['status-badge', statusClass(item.status)]">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td>{{ formatTime(item.createdAt) }}</td>
            <td>
              <div class="action-btns">
                <button class="btn-detail" @click="openDetail(item)">详情</button>
                <template v-if="item.status === 'pending'">
                  <button class="btn-approve" @click="openReview(item, 'approved')">通过</button>
                  <button class="btn-reject" @click="openReview(item, 'rejected')">拒绝</button>
                </template>
                <button v-if="item.status === 'approved'" class="btn-revoke" @click="openRevoke(item)">撤销</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页 (共 {{ total }} 条)</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailDialog && detailTarget" class="dialog-overlay" @click.self="showDetailDialog = false">
      <div class="dialog detail-dialog">
        <div class="dialog-header">
          <h3>认证详情</h3>
          <button class="close-btn" @click="showDetailDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="detail-grid">
            <div class="detail-item"><span class="label">姓名</span><span>{{ detailTarget.realName }}</span></div>
            <div class="detail-item"><span class="label">用户名</span><span>{{ detailTarget.username }}</span></div>
            <div class="detail-item"><span class="label">证书编号</span><span>{{ detailTarget.certNo }}</span></div>
            <div class="detail-item"><span class="label">医院</span><span>{{ detailTarget.hospital || '-' }}</span></div>
            <div class="detail-item"><span class="label">科室</span><span>{{ detailTarget.department || '-' }}</span></div>
            <div class="detail-item"><span class="label">职称</span><span>{{ detailTarget.title || '-' }}</span></div>
            <div class="detail-item">
              <span class="label">状态</span>
              <span :class="['status-badge', statusClass(detailTarget.status)]">{{ statusLabel(detailTarget.status) }}</span>
            </div>
            <div class="detail-item"><span class="label">提交时间</span><span>{{ formatTime(detailTarget.createdAt) }}</span></div>
            <div class="detail-item" v-if="detailTarget.reviewerName">
              <span class="label">审核人</span><span>{{ detailTarget.reviewerName }}</span>
            </div>
            <div class="detail-item" v-if="detailTarget.reviewedAt">
              <span class="label">审核时间</span><span>{{ formatTime(detailTarget.reviewedAt) }}</span>
            </div>
            <div class="detail-item full" v-if="detailTarget.reviewRemark">
              <span class="label">审核备注</span><span>{{ detailTarget.reviewRemark }}</span>
            </div>
          </div>

          <div class="photos-section" v-if="detailTarget.photos && detailTarget.photos.length">
            <h4>证书照片</h4>
            <div class="photos-grid">
              <img
                v-for="(p, i) in detailTarget.photos"
                :key="i"
                :src="resolvePhotoUrl(p)"
                class="cert-photo"
                loading="lazy"
                @error="($event.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><rect fill=%22%23f5f5f5%22 width=%22140%22 height=%22140%22/><text x=%2270%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2214%22>加载失败</text></svg>'"
                @click="openImagePreview(detailTarget.photos, i)"
              />
            </div>
          </div>
        </div>
        <div class="dialog-footer" v-if="detailTarget.status === 'pending'">
          <button class="btn-approve" @click="openReview(detailTarget, 'approved')">通过</button>
          <button class="btn-reject" @click="openReview(detailTarget, 'rejected')">拒绝</button>
        </div>
        <div class="dialog-footer" v-if="detailTarget.status === 'approved'">
          <button class="btn-revoke" @click="openRevoke(detailTarget)">撤销认证</button>
        </div>
      </div>
    </div>

    <!-- 审核弹窗 -->
    <div v-if="showReviewDialog && reviewTarget" class="dialog-overlay" @click.self="showReviewDialog = false">
      <div class="dialog review-dialog">
        <div class="dialog-header">
          <h3>{{ reviewAction === 'approved' ? '通过认证' : '拒绝认证' }}</h3>
          <button class="close-btn" @click="showReviewDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <p class="review-info">
            申请人：<strong>{{ reviewTarget.realName }}</strong>（{{ reviewTarget.username }}）<br />
            证书编号：<strong>{{ reviewTarget.certNo }}</strong>
          </p>
          <div class="form-group">
            <label>审核备注{{ reviewAction === 'rejected' ? '（拒绝原因）' : '' }}</label>
            <textarea
              v-model="reviewRemark"
              class="remark-input"
              :placeholder="reviewAction === 'rejected' ? '请输入拒绝原因...' : '可选填审核备注...'"
              rows="3"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="showReviewDialog = false">取消</button>
          <button
            :class="reviewAction === 'approved' ? 'btn-approve' : 'btn-reject'"
            :disabled="reviewLoading"
            @click="submitReview"
          >
            {{ reviewLoading ? '提交中...' : (reviewAction === 'approved' ? '确认通过' : '确认拒绝') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 撤销弹窗 -->
    <div v-if="showRevokeDialog && revokeTarget" class="dialog-overlay" @click.self="showRevokeDialog = false">
      <div class="dialog review-dialog">
        <div class="dialog-header">
          <h3>撤销认证</h3>
          <button class="close-btn" @click="showRevokeDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <p class="review-info">
            确认撤销 <strong>{{ revokeTarget.realName }}</strong>（{{ revokeTarget.username }}）的医师认证？<br />
            撤销后该用户将恢复为普通用户。
          </p>
          <div class="form-group">
            <label>撤销原因</label>
            <textarea
              v-model="revokeRemark"
              class="remark-input"
              placeholder="请输入撤销原因..."
              rows="3"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="showRevokeDialog = false">取消</button>
          <button class="btn-revoke" :disabled="revokeLoading" @click="submitRevoke">
            {{ revokeLoading ? '提交中...' : '确认撤销' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="showImagePreview" class="image-preview-overlay" @click.self="showImagePreview = false">
      <div class="preview-container">
        <button class="preview-close" @click="showImagePreview = false">×</button>
        <button class="preview-arrow left" v-if="previewIndex > 0" @click="prevImage">‹</button>
        <img :src="resolvePhotoUrl(previewImages[previewIndex] || '')" class="preview-img" />
        <button class="preview-arrow right" v-if="previewIndex < previewImages.length - 1" @click="nextImage">›</button>
        <div class="preview-counter">{{ previewIndex + 1 }} / {{ previewImages.length }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cert-review-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px;
}

.subtitle {
  color: #888;
  font-size: 14px;
  margin: 0 0 24px;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #4a90e2;
  color: #fff;
  border-color: #4a90e2;
}

.tab-btn:hover:not(.active) {
  border-color: #4a90e2;
  color: #4a90e2;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 220px;
  outline: none;
}

.search-input:focus {
  border-color: #4a90e2;
}

.search-btn {
  padding: 6px 16px;
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

/* 表格 */
.table-wrap {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
  position: relative;
  min-height: 200px;
}

.loading-mask {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #999;
  font-size: 15px;
}

.cert-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.cert-table th {
  background: #f7f8fa;
  padding: 12px 14px;
  text-align: left;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
  border-bottom: 1px solid #eee;
}

.cert-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f2f2f2;
  color: #333;
}

.cert-table tbody tr:hover {
  background: #f9fbff;
}

.empty {
  text-align: center;
  color: #bbb;
  padding: 40px 0 !important;
}

/* 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: #fff7e6;
  color: #d48806;
}

.status-approved {
  background: #e6f7e6;
  color: #389e0d;
}

.status-rejected {
  background: #fff1f0;
  color: #cf1322;
}

.status-revoked {
  background: #f0f0f0;
  color: #8c8c8c;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 6px;
}

.btn-detail, .btn-approve, .btn-reject, .btn-cancel, .btn-revoke {
  padding: 4px 12px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-detail {
  background: #e8f0fe;
  color: #4a90e2;
}

.btn-approve {
  background: #e6f7e6;
  color: #389e0d;
}

.btn-reject {
  background: #fff1f0;
  color: #cf1322;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-revoke {
  background: #fff7e6;
  color: #d46b08;
}

.btn-detail:hover { opacity: 0.8; }
.btn-approve:hover { opacity: 0.8; }
.btn-reject:hover { opacity: 0.8; }
.btn-cancel:hover { opacity: 0.8; }
.btn-revoke:hover { opacity: 0.8; }

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.pagination button {
  padding: 6px 16px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #888;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  color: #1a1a2e;
}

.close-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.dialog-body {
  padding: 20px 24px;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-footer button {
  padding: 8px 20px;
  font-size: 14px;
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 12px;
  color: #999;
}

.detail-item span:last-child {
  font-size: 14px;
  color: #333;
}

/* 证书照片 */
.photos-section {
  margin-top: 20px;
}

.photos-section h4 {
  font-size: 14px;
  color: #555;
  margin: 0 0 12px;
}

.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cert-photo {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #eee;
  transition: transform 0.2s;
}

.cert-photo:hover {
  transform: scale(1.05);
}

/* 审核表单 */
.review-info {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin: 0 0 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.remark-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.remark-input:focus {
  border-color: #4a90e2;
}

/* 图片预览 */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-img {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 8px;
  object-fit: contain;
}

.preview-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 32px;
  cursor: pointer;
}

.preview-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  font-size: 40px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 8px;
}

.preview-arrow.left { left: -60px; }
.preview-arrow.right { right: -60px; }

.preview-counter {
  text-align: center;
  color: #fff;
  font-size: 14px;
  margin-top: 12px;
}
</style>
