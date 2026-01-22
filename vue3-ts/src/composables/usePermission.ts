import { ref, computed } from 'vue'
import { get } from '@/utils/request'
import { useAuthStore, type Permission, type Role } from '@/stores/auth'

interface PermissionData {
  role: {
    id: string
    code: string
    name: string
  } | null
  permissions: string[]
}

const permissionData = ref<PermissionData>({
  role: null,
  permissions: []
})

const loading = ref(false)

/**
 * 权限管理 Composable
 */
export function usePermission() {
  const authStore = useAuthStore()

  /**
   * 获取用户权限（从后端加载并更新到 auth store）
   */
  const fetchPermissions = async () => {
    if (!authStore.isAuthenticated) {
      permissionData.value = { role: null, permissions: [] }
      return
    }

    try {
      loading.value = true
      const response = await get<{ 
        success: boolean
        data: {
          role: {
            id: string
            code: string
            name: string
          } | null
          permissions: string[]
        }
      }>('/rbac/user/permissions')
      
      if (response.success) {
        permissionData.value = response.data
        
        // 同时更新 authStore 中的用户信息（保持兼容性）
        if (authStore.userInfo) {
          const role = response.data.role
          const permissionCodes = response.data.permissions || []
          
          // 将权限代码转换为权限对象（简化版，只包含 code）
          const permissions: Permission[] = permissionCodes.map(code => ({
            id: code,
            code,
            name: code,
            type: code.split(':')[1] || '',
            module: code.split(':')[0] || ''
          }))
          
          // 更新 userInfo
          authStore.userInfo.roles = role ? [{
            id: role.id,
            code: role.code,
            name: role.name
          }] : []
          authStore.userInfo.permissions = permissions
          
          // 更新 localStorage
          localStorage.setItem('sso_user_info', JSON.stringify(authStore.userInfo))
        }
      }
    } catch (error) {
      console.error('获取用户权限失败:', error)
      // 优化：如果权限获取失败，不阻止页面加载，使用默认权限
      // 对于超级管理员，即使权限获取失败也应该能访问
      const username = authStore.userInfo?.username
      if (username && username.toLowerCase() === 'admin') {
        // 如果是admin用户，设置默认超级管理员权限
        permissionData.value = {
          role: {
            id: 'super_admin',
            code: 'super_admin',
            name: '超级管理员'
          },
          permissions: []
        }
      } else {
      permissionData.value = { role: null, permissions: [] }
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 检查是否拥有指定权限
   * @param permission 权限代码或权限代码数组
   * @param mode 检查模式：'any'（任一权限）或 'all'（所有权限），默认为 'any'
   */
  const hasPermission = (permission: string | string[], mode: 'any' | 'all' = 'any'): boolean => {
    if (!authStore.isAuthenticated) {
      return false
    }

    // 超级管理员拥有所有权限
    if (authStore.isSuperAdmin) {
      return true
    }

    // admin 角色也拥有所有权限（临时方案，确保admin有完整功能）
    const userRoleCode = permissionData.value.role?.code || 
                        authStore.userInfo?.roles?.[0]?.code ||
                        authStore.userInfo?.role
    if (userRoleCode === 'admin') {
      return true
    }

    // 优先使用 permissionData，如果没有则使用 authStore
    const userPermissions = permissionData.value.permissions.length > 0 
      ? permissionData.value.permissions 
      : (authStore.userInfo?.permissions?.map(p => p.code) || [])

    const codes = Array.isArray(permission) ? permission : [permission]

    if (mode === 'all') {
      // 需要拥有所有权限
      return codes.every(code => userPermissions.includes(code))
    } else {
      // 拥有任意一个权限即可
      return codes.some(code => userPermissions.includes(code))
    }
  }

  /**
   * 检查是否有指定角色
   * @param role 角色代码或角色代码数组
   */
  const hasRole = (role: string | string[]): boolean => {
    if (!authStore.isAuthenticated) {
      return false
    }

    // 优先使用 permissionData，如果没有则使用 authStore
    const userRoleCode = permissionData.value.role?.code || 
                        authStore.userInfo?.roles?.[0]?.code

    if (!userRoleCode) {
      return false
    }

    const codes = Array.isArray(role) ? role : [role]
    return codes.includes(userRoleCode)
  }

  /**
   * 检查是否有指定模块权限
   * @param module 模块名称
   * @param type 操作类型（可选）
   */
  const hasModulePermission = (module: string, type?: string): boolean => {
    if (!authStore.isAuthenticated) {
      return false
    }

    // 超级管理员拥有所有权限
    if (authStore.isSuperAdmin) {
      return true
    }

    // 如果指定了操作类型，检查具体权限
    if (type) {
      const permissionCode = `${module}:${type}`
      return hasPermission(permissionCode)
    }

    // 否则检查是否有该模块下的任何权限
    const userPermissions = permissionData.value.permissions.length > 0 
      ? permissionData.value.permissions 
      : (authStore.userInfo?.permissions?.map(p => p.code) || [])
    
    return userPermissions.some(code => code.startsWith(`${module}:`))
  }

  /**
   * 检查是否为超级管理员
   */
  const isSuperAdmin = computed(() => {
    // 优先检查 authStore
    if (authStore.isSuperAdmin) {
      return true
    }
    
    // 检查权限数据中的角色
    if (permissionData.value.role?.code === 'super_admin') {
      return true
    }
    
    // 检查用户信息中的角色
    const userRoleCode = permissionData.value.role?.code || 
                        authStore.userInfo?.roles?.[0]?.code ||
                        (typeof authStore.userInfo?.role === 'string' ? authStore.userInfo.role : authStore.userInfo?.role?.code)
    
    if (userRoleCode === 'super_admin') {
      return true
    }
    
    // 检查用户名是否为 admin（超级管理员标识）
    if (authStore.userInfo?.username && authStore.userInfo.username.toLowerCase() === 'admin') {
      return true
    }
    
    return false
  })

  /**
   * 获取用户角色
   */
  const getUserRole = computed(() => {
    return permissionData.value.role || authStore.userInfo?.roles?.[0] || null
  })

  /**
   * 获取用户权限列表
   */
  const getUserPermissions = computed(() => {
    if (permissionData.value.permissions.length > 0) {
      return permissionData.value.permissions
    }
    return authStore.userInfo?.permissions?.map(p => p.code) || []
  })

  /**
   * 重置权限数据
   */
  const resetPermissions = () => {
    permissionData.value = { role: null, permissions: [] }
  }

  // 响应式的权限状态（保持向后兼容）
  const isLoggedIn = computed(() => authStore.isAuthenticated)
  const userRoles = computed(() => authStore.userInfo?.roles || [])
  const userPermissions = computed(() => getUserPermissions.value)

  return {
    // 权限数据
    permissionData: computed(() => permissionData.value),
    loading: computed(() => loading.value),
    
    // 权限检查方法
    fetchPermissions,
    hasPermission,
    hasRole,
    hasModulePermission,
    
    // 状态信息
    isSuperAdmin,
    isLoggedIn,
    getUserRole,
    getUserPermissions,
    userRoles,
    userPermissions,
    
    // 工具方法
    resetPermissions
  }
}
