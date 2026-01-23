import { useRbacStore } from '../stores/rbac'
import type { Permission, Role } from '../stores/rbac'

/**
 * 检查当前用户是否有指定权限
 */
export function checkPermission(permission: Permission): boolean {
  const rbacStore = useRbacStore()
  return rbacStore.hasPermission(permission)
}

/**
 * 检查当前用户是否有任意一个权限
 */
export function checkAnyPermission(permissions: Permission[]): boolean {
  const rbacStore = useRbacStore()
  return rbacStore.hasAnyPermission(permissions)
}

/**
 * 检查当前用户是否有所有权限
 */
export function checkAllPermissions(permissions: Permission[]): boolean {
  const rbacStore = useRbacStore()
  return rbacStore.hasAllPermissions(permissions)
}

/**
 * 检查当前用户是否有指定角色
 */
export function checkRole(role: Role): boolean {
  const rbacStore = useRbacStore()
  return rbacStore.hasRole(role)
}

/**
 * 检查当前用户是否有任意一个角色
 */
export function checkAnyRole(roles: Role[]): boolean {
  const rbacStore = useRbacStore()
  return rbacStore.hasAnyRole(roles)
}

/**
 * 路由权限检查
 * 用于路由守卫中检查用户是否有权限访问某个路由
 */
export function checkRoutePermission(requiredPermissions?: Permission[], requiredRoles?: Role[]): boolean {
  const rbacStore = useRbacStore()
  
  // 如果没有要求，则允许访问
  if (!requiredPermissions && !requiredRoles) {
    return true
  }

  // 检查角色
  if (requiredRoles && requiredRoles.length > 0) {
    if (!rbacStore.hasAnyRole(requiredRoles)) {
      return false
    }
  }

  // 检查权限
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!rbacStore.hasAnyPermission(requiredPermissions)) {
      return false
    }
  }

  return true
}





