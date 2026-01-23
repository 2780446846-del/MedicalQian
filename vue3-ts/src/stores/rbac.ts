import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// 角色类型定义
export type Role = 'admin' | 'doctor' | 'nurse' | 'patient' | 'receptionist'

// 权限类型定义
export type Permission =
  // 预约管理
  | 'appointment:view'
  | 'appointment:create'
  | 'appointment:edit'
  | 'appointment:delete'
  | 'appointment:accept'
  | 'appointment:cancel'
  // 患者管理
  | 'patient:view'
  | 'patient:create'
  | 'patient:edit'
  | 'patient:delete'
  // 员工管理
  | 'staff:view'
  | 'staff:create'
  | 'staff:edit'
  | 'staff:delete'
  // 日程管理
  | 'schedule:view'
  | 'schedule:create'
  | 'schedule:edit'
  | 'schedule:delete'
  // 数据分析
  | 'analytics:view'
  | 'analytics:export'
  // AI功能
  | 'ai:analysis'
  | 'ai:assistant'
  | 'ai:chat'
  // 系统管理
  | 'system:settings'
  | 'system:users'
  | 'system:roles'
  // 提醒管理
  | 'reminder:view'
  | 'reminder:send'
  | 'reminder:manage'
  // 个人资料
  | 'profile:view'
  | 'profile:edit'

// 角色-权限映射表
const rolePermissions: Record<Role, Permission[]> = {
  // 管理员：拥有所有权限
  admin: [
    'appointment:view',
    'appointment:create',
    'appointment:edit',
    'appointment:delete',
    'appointment:accept',
    'appointment:cancel',
    'patient:view',
    'patient:create',
    'patient:edit',
    'patient:delete',
    'staff:view',
    'staff:create',
    'staff:edit',
    'staff:delete',
    'schedule:view',
    'schedule:create',
    'schedule:edit',
    'schedule:delete',
    'analytics:view',
    'analytics:export',
    'ai:analysis',
    'ai:assistant',
    'ai:chat',
    'system:settings',
    'system:users',
    'system:roles',
    'reminder:view',
    'reminder:send',
    'reminder:manage',
    'profile:view',
    'profile:edit',
  ],
  // 医生：可以管理预约、查看患者、使用AI功能
  doctor: [
    'appointment:view',
    'appointment:create',
    'appointment:edit',
    'appointment:accept',
    'appointment:cancel',
    'patient:view',
    'patient:create',
    'patient:edit',
    'schedule:view',
    'schedule:create',
    'schedule:edit',
    'analytics:view',
    'ai:analysis',
    'ai:assistant',
    'ai:chat',
    'reminder:view',
    'reminder:send',
    'profile:view',
    'profile:edit',
  ],
  // 护士：可以查看预约、患者，管理提醒
  nurse: [
    'appointment:view',
    'appointment:create',
    'appointment:edit',
    'patient:view',
    'patient:create',
    'patient:edit',
    'schedule:view',
    'reminder:view',
    'reminder:send',
    'reminder:manage',
    'profile:view',
    'profile:edit',
  ],
  // 前台：可以管理预约、患者信息
  receptionist: [
    'appointment:view',
    'appointment:create',
    'appointment:edit',
    'appointment:accept',
    'appointment:cancel',
    'patient:view',
    'patient:create',
    'patient:edit',
    'schedule:view',
    'reminder:view',
    'reminder:send',
    'reminder:manage',
    'profile:view',
    'profile:edit',
  ],
  // 患者：只能查看自己的信息
  patient: [
    'appointment:view',
    'appointment:create',
    'patient:view',
    'schedule:view',
    'profile:view',
    'profile:edit',
  ],
}

// 角色显示名称
export const roleNames: Record<Role, string> = {
  admin: '管理员',
  doctor: '医生',
  nurse: '护士',
  receptionist: '前台',
  patient: '患者',
}

// 权限显示名称
export const permissionNames: Record<Permission, string> = {
  'appointment:view': '查看预约',
  'appointment:create': '创建预约',
  'appointment:edit': '编辑预约',
  'appointment:delete': '删除预约',
  'appointment:accept': '接受预约',
  'appointment:cancel': '取消预约',
  'patient:view': '查看患者',
  'patient:create': '创建患者',
  'patient:edit': '编辑患者',
  'patient:delete': '删除患者',
  'staff:view': '查看员工',
  'staff:create': '创建员工',
  'staff:edit': '编辑员工',
  'staff:delete': '删除员工',
  'schedule:view': '查看日程',
  'schedule:create': '创建日程',
  'schedule:edit': '编辑日程',
  'schedule:delete': '删除日程',
  'analytics:view': '查看分析',
  'analytics:export': '导出数据',
  'ai:analysis': 'AI分析',
  'ai:assistant': 'AI助手',
  'ai:chat': 'AI聊天',
  'system:settings': '系统设置',
  'system:users': '用户管理',
  'system:roles': '角色管理',
  'reminder:view': '查看提醒',
  'reminder:send': '发送提醒',
  'reminder:manage': '管理提醒',
  'profile:view': '查看资料',
  'profile:edit': '编辑资料',
}

export const useRbacStore = defineStore('rbac', () => {
  // 当前用户角色（从auth store获取）
  const currentRole = ref<Role | null>(null)
  
  // 当前用户权限列表
  const permissions = computed<Permission[]>(() => {
    if (!currentRole.value) {
      return []
    }
    return rolePermissions[currentRole.value] || []
  })

  // 检查是否有某个权限
  const hasPermission = (permission: Permission): boolean => {
    return permissions.value.includes(permission)
  }

  // 检查是否有任意一个权限
  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission))
  }

  // 检查是否有所有权限
  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission))
  }

  // 检查是否有某个角色
  const hasRole = (role: Role): boolean => {
    return currentRole.value === role
  }

  // 检查是否有任意一个角色
  const hasAnyRole = (roleList: Role[]): boolean => {
    return roleList.some(role => hasRole(role))
  }

  // 设置当前用户角色
  const setRole = (role: Role | null) => {
    currentRole.value = role
    // 保存到localStorage
    if (role) {
      localStorage.setItem('user_role', role)
    } else {
      localStorage.removeItem('user_role')
    }
  }

  // 从localStorage恢复角色
  const initRole = () => {
    const savedRole = localStorage.getItem('user_role') as Role | null
    if (savedRole && rolePermissions[savedRole]) {
      currentRole.value = savedRole
    }
  }

  // 获取角色显示名称
  const getRoleName = (role: Role): string => {
    return roleNames[role] || role
  }

  // 获取权限显示名称
  const getPermissionName = (permission: Permission): string => {
    return permissionNames[permission] || permission
  }

  // 初始化
  initRole()

  return {
    currentRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    setRole,
    getRoleName,
    getPermissionName,
  }
})





