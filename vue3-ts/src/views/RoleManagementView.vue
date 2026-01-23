<template>
  <div class="role-management-container">
    <div class="page-header">
      <h2 class="page-title">角色权限管理</h2>
      <div class="header-info">
        <div class="current-role">
          <span class="label">当前角色：</span>
          <span class="role-badge" :class="`role-${rbacStore.currentRole}`">
            {{ rbacStore.currentRole ? rbacStore.getRoleName(rbacStore.currentRole) : '未设置' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 角色切换（仅用于演示） -->
    <div class="role-switcher-section">
      <h3 class="section-title">角色切换（演示）</h3>
      <div class="role-buttons">
        <button
          v-for="role in roles"
          :key="role"
          class="role-btn"
          :class="{ active: rbacStore.currentRole === role }"
          @click="switchRole(role)"
        >
          {{ rbacStore.getRoleName(role) }}
        </button>
      </div>
    </div>

    <!-- 权限测试区域 -->
    <div class="permission-test-section">
      <h3 class="section-title">权限测试</h3>
      <div class="test-grid">
        <div class="test-card">
          <h4>预约管理权限</h4>
          <div class="permission-list">
            <div class="permission-item">
              <span>查看预约</span>
              <span :class="rbacStore.hasPermission('appointment:view') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('appointment:view') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>创建预约</span>
              <span :class="rbacStore.hasPermission('appointment:create') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('appointment:create') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>删除预约</span>
              <span :class="rbacStore.hasPermission('appointment:delete') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('appointment:delete') ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>

        <div class="test-card">
          <h4>患者管理权限</h4>
          <div class="permission-list">
            <div class="permission-item">
              <span>查看患者</span>
              <span :class="rbacStore.hasPermission('patient:view') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('patient:view') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>创建患者</span>
              <span :class="rbacStore.hasPermission('patient:create') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('patient:create') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>删除患者</span>
              <span :class="rbacStore.hasPermission('patient:delete') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('patient:delete') ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>

        <div class="test-card">
          <h4>员工管理权限</h4>
          <div class="permission-list">
            <div class="permission-item">
              <span>查看员工</span>
              <span :class="rbacStore.hasPermission('staff:view') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('staff:view') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>创建员工</span>
              <span :class="rbacStore.hasPermission('staff:create') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('staff:create') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>删除员工</span>
              <span :class="rbacStore.hasPermission('staff:delete') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('staff:delete') ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>

        <div class="test-card">
          <h4>系统管理权限</h4>
          <div class="permission-list">
            <div class="permission-item">
              <span>系统设置</span>
              <span :class="rbacStore.hasPermission('system:settings') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('system:settings') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>用户管理</span>
              <span :class="rbacStore.hasPermission('system:users') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('system:users') ? '✓' : '✗' }}
              </span>
            </div>
            <div class="permission-item">
              <span>角色管理</span>
              <span :class="rbacStore.hasPermission('system:roles') ? 'allowed' : 'denied'">
                {{ rbacStore.hasPermission('system:roles') ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 指令使用示例 -->
    <div class="directive-example-section">
      <h3 class="section-title">权限指令使用示例</h3>
      <div class="example-grid">
        <div class="example-card">
          <h4>基于权限的按钮显示</h4>
          <div class="button-group">
            <button
              v-permission="'appointment:create'"
              class="demo-btn primary"
            >
              创建预约（需要 appointment:create 权限）
            </button>
            <button
              v-permission="'appointment:delete'"
              class="demo-btn danger"
            >
              删除预约（需要 appointment:delete 权限）
            </button>
            <button
              v-permission="'staff:create'"
              class="demo-btn success"
            >
              创建员工（需要 staff:create 权限）
            </button>
          </div>
        </div>

        <div class="example-card">
          <h4>基于角色的按钮显示</h4>
          <div class="button-group">
            <button
              v-permission="'admin'"
              class="demo-btn primary"
            >
              管理员功能（仅管理员可见）
            </button>
            <button
              v-permission="['admin', 'doctor']"
              class="demo-btn success"
            >
              管理员/医生功能
            </button>
          </div>
        </div>

        <div class="example-card">
          <h4>复杂权限检查</h4>
          <div class="button-group">
            <button
              v-permission="{ permission: ['appointment:view', 'appointment:edit'], mode: 'all' }"
              class="demo-btn primary"
            >
              需要所有权限（查看+编辑）
            </button>
            <button
              v-permission="{ permission: ['appointment:view', 'appointment:edit'], mode: 'any' }"
              class="demo-btn success"
            >
              需要任意权限（查看或编辑）
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色权限详情 -->
    <div class="role-details-section">
      <h3 class="section-title">角色权限详情</h3>
      <div class="role-details-grid">
        <div
          v-for="role in roles"
          :key="role"
          class="role-detail-card"
        >
          <h4 class="role-name">{{ rbacStore.getRoleName(role) }}</h4>
          <div class="permissions-list">
            <div
              v-for="permission in getRolePermissions(role)"
              :key="permission"
              class="permission-tag"
            >
              {{ rbacStore.getPermissionName(permission) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRbacStore } from '../stores/rbac'
import type { Role, Permission } from '../stores/rbac'

const rbacStore = useRbacStore()

const roles: Role[] = ['admin', 'doctor', 'nurse', 'receptionist', 'patient']

// 角色权限映射（从rbac store获取）
const rolePermissionsMap: Record<Role, Permission[]> = {
  admin: [
    'appointment:view', 'appointment:create', 'appointment:edit', 'appointment:delete',
    'appointment:accept', 'appointment:cancel',
    'patient:view', 'patient:create', 'patient:edit', 'patient:delete',
    'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
    'schedule:view', 'schedule:create', 'schedule:edit', 'schedule:delete',
    'analytics:view', 'analytics:export',
    'ai:analysis', 'ai:assistant', 'ai:chat',
    'system:settings', 'system:users', 'system:roles',
    'reminder:view', 'reminder:send', 'reminder:manage',
    'profile:view', 'profile:edit',
  ],
  doctor: [
    'appointment:view', 'appointment:create', 'appointment:edit',
    'appointment:accept', 'appointment:cancel',
    'patient:view', 'patient:create', 'patient:edit',
    'schedule:view', 'schedule:create', 'schedule:edit',
    'analytics:view',
    'ai:analysis', 'ai:assistant', 'ai:chat',
    'reminder:view', 'reminder:send',
    'profile:view', 'profile:edit',
  ],
  nurse: [
    'appointment:view', 'appointment:create', 'appointment:edit',
    'patient:view', 'patient:create', 'patient:edit',
    'schedule:view',
    'reminder:view', 'reminder:send', 'reminder:manage',
    'profile:view', 'profile:edit',
  ],
  receptionist: [
    'appointment:view', 'appointment:create', 'appointment:edit',
    'appointment:accept', 'appointment:cancel',
    'patient:view', 'patient:create', 'patient:edit',
    'schedule:view',
    'reminder:view', 'reminder:send', 'reminder:manage',
    'profile:view', 'profile:edit',
  ],
  patient: [
    'appointment:view', 'appointment:create',
    'patient:view',
    'schedule:view',
    'profile:view', 'profile:edit',
  ],
}

const getRolePermissions = (role: Role): Permission[] => {
  return rolePermissionsMap[role] || []
}

const switchRole = (role: Role) => {
  rbacStore.setRole(role)
  // 同时更新auth store的用户信息（用于演示）
  const { useAuthStore } = require('../stores/auth')
  const authStore = useAuthStore()
  if (authStore.userInfo) {
    authStore.userInfo.role = role
    localStorage.setItem('sso_user_info', JSON.stringify(authStore.userInfo))
  }
}
</script>

<style scoped>
.role-management-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1d2129;
  margin: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-role {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: #6e736c;
}

.role-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.role-admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.role-doctor {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.role-nurse {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.role-receptionist {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.role-patient {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
}

.role-switcher-section,
.permission-test-section,
.directive-example-section,
.role-details-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.role-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.role-btn {
  padding: 10px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #1d2129;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.role-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.role-btn.active {
  background: #409eff;
  border-color: #409eff;
  color: white;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.test-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.test-card h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 12px 0;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
}

.permission-item .allowed {
  color: #67c23a;
  font-weight: 600;
}

.permission-item .denied {
  color: #f56c6c;
  font-weight: 600;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.example-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.example-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 12px 0;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn.primary {
  background: #409eff;
  color: white;
}

.demo-btn.success {
  background: #67c23a;
  color: white;
}

.demo-btn.danger {
  background: #f56c6c;
  color: white;
}

.demo-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.role-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.role-detail-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.role-name {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 12px 0;
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  padding: 4px 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}
</style>





