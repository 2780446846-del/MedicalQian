import type { ObjectDirective, DirectiveBinding } from 'vue'
import { usePermission } from '@/composables/usePermission'

/**
 * 权限指令 v-permission
 * 用法：
 *   v-permission="'patient:create'" - 需要单个权限
 *   v-permission="['patient:create', 'patient:update']" - 需要任一权限
 *   v-permission.all="['patient:create', 'patient:update']" - 需要所有权限
 */
const permission: ObjectDirective<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { hasPermission } = usePermission()
    const { value, modifiers } = binding

    if (!value) {
      return
    }

    const mode = modifiers.all ? 'all' : 'any'
    const has = hasPermission(value, mode)

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { hasPermission } = usePermission()
    const { value, modifiers } = binding

    if (!value) {
      return
    }

    const mode = modifiers.all ? 'all' : 'any'
    const has = hasPermission(value, mode)

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    } else {
      // 恢复原始display样式
      const originalDisplay = el.dataset.originalDisplay || ''
      if (originalDisplay === 'none') {
        el.style.display = ''
      } else {
        el.style.display = originalDisplay
      }
    }
  }
}

/**
 * 角色指令 v-role
 * 用法：
 *   v-role="'admin'" - 需要单个角色
 *   v-role="['admin', 'doctor']" - 需要任一角色
 */
const role: ObjectDirective<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { hasRole } = usePermission()
    const { value } = binding

    if (!value) {
      return
    }

    const has = hasRole(value)

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { hasRole } = usePermission()
    const { value } = binding

    if (!value) {
      return
    }

    const has = hasRole(value)

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    } else {
      // 恢复原始display样式
      const originalDisplay = el.dataset.originalDisplay || ''
      if (originalDisplay === 'none') {
        el.style.display = ''
      } else {
        el.style.display = originalDisplay
      }
    }
  }
}

/**
 * 超级管理员权限指令
 * 用法：v-super-admin - 只有超级管理员才能看到
 */
const superAdmin: ObjectDirective<HTMLElement, boolean> = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { isSuperAdmin } = usePermission()
    const has = isSuperAdmin.value

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { isSuperAdmin } = usePermission()
    const has = isSuperAdmin.value

    if (!has) {
      // 保存原始display样式
      if (!el.dataset.originalDisplay) {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    } else {
      // 恢复原始display样式
      const originalDisplay = el.dataset.originalDisplay || ''
      if (originalDisplay === 'none') {
        el.style.display = ''
      } else {
        el.style.display = originalDisplay
      }
    }
  }
}

export { permission, role, superAdmin }
export default permission
