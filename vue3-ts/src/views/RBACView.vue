<template>
  <div class="rbac-page">
    <div class="page-header">
      <h1 class="page-title">权限管理 (RBAC)</h1>
      <p class="page-description">管理系统角色和权限，控制用户访问权限</p>
    </div>

    <!-- 标签页切换 -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 权限管理 -->
    <div v-if="activeTab === 'permissions'" class="tab-content">
      <div class="toolbar">
        <div class="search-box">
          <input
            v-model="permissionSearch"
            type="text"
            placeholder="搜索权限..."
            class="search-input"
          />
          <select v-model="permissionModuleFilter" class="filter-select">
            <option value="">所有模块</option>
            <option v-for="module in modules" :key="module" :value="module">
              {{ module }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary" @click="openPermissionDialog()">
          <span>➕</span> 新建权限
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>权限代码</th>
              <th>权限名称</th>
              <th>模块</th>
              <th>类型</th>
              <th>描述</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="permissionsLoading">
              <td colspan="7" class="loading-cell">
                <div class="loading-spinner"></div>
                加载中...
              </td>
            </tr>
            <tr v-else-if="filteredPermissions.length === 0">
              <td colspan="7" class="empty-cell">暂无权限数据</td>
            </tr>
            <tr v-else v-for="perm in filteredPermissions" :key="perm._id">
              <td><code class="code-text">{{ perm.code }}</code></td>
              <td>{{ perm.name }}</td>
              <td><span class="badge badge-module">{{ perm.module }}</span></td>
              <td><span class="badge badge-type">{{ perm.type }}</span></td>
              <td>{{ perm.description || '-' }}</td>
              <td>
                <span :class="['status-badge', perm.status === 'active' ? 'active' : 'inactive']">
                  {{ perm.status === 'active' ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn-icon" @click="openPermissionDialog(perm)" title="编辑">
                  ✏️
                </button>
                <button class="btn-icon btn-danger" @click="deletePermission(perm)" title="删除">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 角色管理 -->
    <div v-if="activeTab === 'roles'" class="tab-content">
      <div class="toolbar">
        <div class="search-box">
          <input
            v-model="roleSearch"
            type="text"
            placeholder="搜索角色..."
            class="search-input"
          />
        </div>
        <button class="btn btn-primary" @click="openRoleDialog()">
          <span>➕</span> 新建角色
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>角色代码</th>
              <th>角色名称</th>
              <th>描述</th>
              <th>权限数量</th>
              <th>状态</th>
              <th>系统角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rolesLoading">
              <td colspan="7" class="loading-cell">
                <div class="loading-spinner"></div>
                加载中...
              </td>
            </tr>
            <tr v-else-if="filteredRoles.length === 0">
              <td colspan="7" class="empty-cell">暂无角色数据</td>
            </tr>
            <tr v-else v-for="role in filteredRoles" :key="role._id">
              <td><code class="code-text">{{ role.code }}</code></td>
              <td>{{ role.name }}</td>
              <td>{{ role.description || '-' }}</td>
              <td>{{ role.permissions?.length || 0 }}</td>
              <td>
                <span :class="['status-badge', role.status === 'active' ? 'active' : 'inactive']">
                  {{ role.status === 'active' ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <span v-if="role.isSystem" class="badge badge-system">系统</span>
                <span v-else class="badge">自定义</span>
              </td>
              <td>
                <button class="btn-icon" @click="openRoleDialog(role)" title="编辑">
                  ✏️
                </button>
                <button
                  v-if="!role.isSystem"
                  class="btn-icon btn-danger"
                  @click="deleteRole(role)"
                  title="删除"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 权限对话框 -->
    <div v-if="showPermissionDialog" class="modal-overlay" @click.self="closePermissionDialog">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ editingPermission ? '编辑权限' : '新建权限' }}</h3>
          <button class="close-btn" @click="closePermissionDialog">×</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>权限代码 *</label>
            <input
              v-model="permissionForm.code"
              type="text"
              placeholder="如：patient:create"
              :disabled="!!editingPermission"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>权限名称 *</label>
            <input
              v-model="permissionForm.name"
              type="text"
              placeholder="如：创建患者"
              class="form-input"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>模块 *</label>
              <input
                v-model="permissionForm.module"
                type="text"
                placeholder="如：patient"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>类型 *</label>
              <input
                v-model="permissionForm.type"
                type="text"
                placeholder="如：create"
                class="form-input"
              />
            </div>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea
              v-model="permissionForm.description"
              placeholder="权限描述"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label>排序</label>
            <input
              v-model.number="permissionForm.sort"
              type="number"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="permissionForm.status" class="form-input">
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePermissionDialog">取消</button>
            <button class="btn btn-primary" @click="savePermission" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色对话框 -->
    <div v-if="showRoleDialog" class="modal-overlay" @click.self="closeRoleDialog">
      <div class="modal-dialog large">
        <div class="modal-header">
          <h3>{{ editingRole ? '编辑角色' : '新建角色' }}</h3>
          <button class="close-btn" @click="closeRoleDialog">×</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>角色代码 *</label>
            <input
              v-model="roleForm.code"
              type="text"
              placeholder="如：doctor"
              :disabled="!!editingRole"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>角色名称 *</label>
            <input
              v-model="roleForm.name"
              type="text"
              placeholder="如：医生"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea
              v-model="roleForm.description"
              placeholder="角色描述"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label>权限选择</label>
            <div class="permissions-selector">
              <div class="permission-modules">
                <div
                  v-for="(perms, module) in groupedPermissions"
                  :key="module"
                  class="permission-module"
                >
                  <div class="module-header">
                    <input
                      type="checkbox"
                      :checked="isModuleSelected(module)"
                      :indeterminate="isModuleIndeterminate(module)"
                      @change="toggleModule(module, ($event.target as HTMLInputElement).checked)"
                      class="module-checkbox"
                    />
                    <strong>{{ module }}</strong>
                    <span class="module-count">
                      ({{ getSelectedCount(module) }}/{{ perms.length }})
                    </span>
                  </div>
                  <div class="permission-list">
                    <label
                      v-for="perm in perms"
                      :key="perm._id"
                      class="permission-item"
                    >
                      <input
                        type="checkbox"
                        :value="perm._id"
                        v-model="roleForm.permissions"
                        class="permission-checkbox"
                      />
                      <span class="permission-name">{{ perm.name }}</span>
                      <code class="permission-code">{{ perm.code }}</code>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeRoleDialog">取消</button>
            <button class="btn btn-primary" @click="saveRole" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get, post, put, del } from '@/utils/request'

interface Permission {
  _id: string
  code: string
  name: string
  description?: string
  module: string
  type: string
  status: string
  sort: number
}

interface Role {
  _id: string
  code: string
  name: string
  description?: string
  permissions: Permission[] | string[]
  status: string
  isSystem: boolean
  sort: number
}

const activeTab = ref<'permissions' | 'roles'>('permissions')
const tabs: Array<{ key: 'permissions' | 'roles'; label: string }> = [
  { key: 'permissions', label: '权限管理' },
  { key: 'roles', label: '角色管理' }
]

// 权限相关
const permissions = ref<Permission[]>([])
const permissionsLoading = ref(false)
const permissionSearch = ref('')
const permissionModuleFilter = ref('')
const showPermissionDialog = ref(false)
const editingPermission = ref<Permission | null>(null)
const permissionForm = ref({
  code: '',
  name: '',
  description: '',
  module: '',
  type: '',
  status: 'active',
  sort: 0
})
const saving = ref(false)

// 角色相关
const roles = ref<Role[]>([])
const rolesLoading = ref(false)
const roleSearch = ref('')
const showRoleDialog = ref(false)
const editingRole = ref<Role | null>(null)
const roleForm = ref({
  code: '',
  name: '',
  description: '',
  permissions: [] as string[],
  status: 'active',
  sort: 0
})

// 计算属性
const modules = computed(() => {
  const moduleSet = new Set<string>()
  permissions.value.forEach(p => moduleSet.add(p.module))
  return Array.from(moduleSet).sort()
})

const filteredPermissions = computed(() => {
  let result = permissions.value

  if (permissionSearch.value) {
    const search = permissionSearch.value.toLowerCase()
    result = result.filter(
      p =>
        p.code.toLowerCase().includes(search) ||
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
    )
  }

  if (permissionModuleFilter.value) {
    result = result.filter(p => p.module === permissionModuleFilter.value)
  }

  return result
})

const filteredRoles = computed(() => {
  let result = roles.value

  if (roleSearch.value) {
    const search = roleSearch.value.toLowerCase()
    result = result.filter(
      r =>
        r.code.toLowerCase().includes(search) ||
        r.name.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
    )
  }

  return result
})

const groupedPermissions = computed(() => {
  const grouped: Record<string, Permission[]> = {}
  permissions.value
    .filter(p => p.status === 'active')
    .forEach(perm => {
      const module = perm.module
      if (!grouped[module]) {
        grouped[module] = []
      }
      if (grouped[module]) {
        grouped[module].push(perm)
      }
    })
  return grouped
})

// 方法
const fetchPermissions = async () => {
  try {
    permissionsLoading.value = true
    const response = await get<{ success: boolean; data: { list: Permission[] } }>(
      '/rbac/permissions/all'
    )
    if (response.success) {
      permissions.value = response.data.list
    }
  } catch (error) {
    console.error('获取权限列表失败:', error)
    alert('获取权限列表失败')
  } finally {
    permissionsLoading.value = false
  }
}

const fetchRoles = async () => {
  try {
    rolesLoading.value = true
    const response = await get<{ success: boolean; data: Role[] }>('/rbac/roles/all')
    if (response.success) {
      roles.value = response.data
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
    alert('获取角色列表失败')
  } finally {
    rolesLoading.value = false
  }
}

const openPermissionDialog = (perm?: Permission) => {
  if (perm) {
    editingPermission.value = perm
    permissionForm.value = {
      code: perm.code,
      name: perm.name,
      description: perm.description || '',
      module: perm.module,
      type: perm.type,
      status: perm.status,
      sort: perm.sort
    }
  } else {
    editingPermission.value = null
    permissionForm.value = {
      code: '',
      name: '',
      description: '',
      module: '',
      type: '',
      status: 'active',
      sort: 0
    }
  }
  showPermissionDialog.value = true
}

const closePermissionDialog = () => {
  showPermissionDialog.value = false
  editingPermission.value = null
}

const savePermission = async () => {
  if (!permissionForm.value.code || !permissionForm.value.name) {
    alert('请填写权限代码和名称')
    return
  }

  try {
    saving.value = true
    if (editingPermission.value) {
      await put(`/rbac/permissions/${editingPermission.value._id}`, permissionForm.value)
      alert('权限更新成功')
    } else {
      await post('/rbac/permissions', permissionForm.value)
      alert('权限创建成功')
    }
    closePermissionDialog()
    await fetchPermissions()
  } catch (error: any) {
    console.error('保存权限失败:', error)
    alert(error.message || '保存权限失败')
  } finally {
    saving.value = false
  }
}

const deletePermission = async (perm: Permission) => {
  if (!confirm(`确定要删除权限 "${perm.name}" 吗？`)) return

  try {
    await del(`/rbac/permissions/${perm._id}`)
    alert('权限删除成功')
    await fetchPermissions()
  } catch (error: any) {
    console.error('删除权限失败:', error)
    alert(error.message || '删除权限失败')
  }
}

const openRoleDialog = async (role?: Role) => {
  if (role) {
    editingRole.value = role
    roleForm.value = {
      code: role.code,
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map(p => (typeof p === 'string' ? p : p._id))
        : [],
      status: role.status,
      sort: role.sort
    }
  } else {
    editingRole.value = null
    roleForm.value = {
      code: '',
      name: '',
      description: '',
      permissions: [],
      status: 'active',
      sort: 0
    }
  }
  showRoleDialog.value = true
}

const closeRoleDialog = () => {
  showRoleDialog.value = false
  editingRole.value = null
}

const saveRole = async () => {
  if (!roleForm.value.code || !roleForm.value.name) {
    alert('请填写角色代码和名称')
    return
  }

  try {
    saving.value = true
    if (editingRole.value) {
      await put(`/rbac/roles/${editingRole.value._id}`, roleForm.value)
      alert('角色更新成功')
    } else {
      await post('/rbac/roles', roleForm.value)
      alert('角色创建成功')
    }
    closeRoleDialog()
    await fetchRoles()
  } catch (error: any) {
    console.error('保存角色失败:', error)
    alert(error.message || '保存角色失败')
  } finally {
    saving.value = false
  }
}

const deleteRole = async (role: Role) => {
  if (!confirm(`确定要删除角色 "${role.name}" 吗？`)) return

  try {
    await del(`/rbac/roles/${role._id}`)
    alert('角色删除成功')
    await fetchRoles()
  } catch (error: any) {
    console.error('删除角色失败:', error)
    alert(error.message || '删除角色失败')
  }
}

// 权限选择器相关方法
const isModuleSelected = (module: string) => {
  const modulePerms = groupedPermissions.value[module] || []
  return (
    modulePerms.length > 0 &&
    modulePerms.every(perm => roleForm.value.permissions.includes(perm._id))
  )
}

const isModuleIndeterminate = (module: string) => {
  const modulePerms = groupedPermissions.value[module] || []
  const selectedCount = modulePerms.filter(perm =>
    roleForm.value.permissions.includes(perm._id)
  ).length
  return selectedCount > 0 && selectedCount < modulePerms.length
}

const toggleModule = (module: string, checked: boolean) => {
  const modulePerms = groupedPermissions.value[module] || []
  if (checked) {
    // 添加模块所有权限
    modulePerms.forEach(perm => {
      if (!roleForm.value.permissions.includes(perm._id)) {
        roleForm.value.permissions.push(perm._id)
      }
    })
  } else {
    // 移除模块所有权限
    modulePerms.forEach(perm => {
      const index = roleForm.value.permissions.indexOf(perm._id)
      if (index > -1) {
        roleForm.value.permissions.splice(index, 1)
      }
    })
  }
}

const getSelectedCount = (module: string) => {
  const modulePerms = groupedPermissions.value[module] || []
  return modulePerms.filter(perm => roleForm.value.permissions.includes(perm._id)).length
}

// 生命周期
onMounted(() => {
  fetchPermissions()
  fetchRoles()
})
</script>

<style scoped>
.rbac-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.page-description {
  color: #64748b;
  font-size: 14px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #334155;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.search-box {
  display: flex;
  gap: 12px;
  flex: 1;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  min-width: 150px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 14px;
  color: #1e293b;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 40px !important;
  color: #94a3b8;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.code-text {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #667eea;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-module {
  background: #dbeafe;
  color: #1e40af;
}

.badge-type {
  background: #fef3c7;
  color: #92400e;
}

.badge-system {
  background: #fce7f3;
  color: #9f1239;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-icon:hover {
  opacity: 0.7;
}

.btn-icon.btn-danger:hover {
  color: #ef4444;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-dialog.large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.modal-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.permissions-selector {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.permission-modules {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-module {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.module-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.module-count {
  font-size: 12px;
  color: #64748b;
  font-weight: normal;
}

.permission-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.permission-item:hover {
  background: #f8fafc;
}

.permission-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.permission-name {
  flex: 1;
  font-size: 14px;
  color: #1e293b;
}

.permission-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}
</style>
