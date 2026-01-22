<template>
  <slot v-if="hasAccess" />
  <slot v-else name="no-access">
    <div v-if="showFallback" class="no-access">
      <p>{{ fallbackText }}</p>
    </div>
  </slot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermission } from '@/composables/usePermission'

interface Props {
  permission?: string | string[]
  module?: string
  type?: string
  role?: string | string[]
  mode?: 'any' | 'all'
  showFallback?: boolean
  fallbackText?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'any',
  showFallback: false,
  fallbackText: '您没有访问权限'
})

const { hasPermission, hasModulePermission, hasRole } = usePermission()

const hasAccess = computed(() => {
  // 检查角色
  if (props.role) {
    return hasRole(props.role)
  }

  // 检查模块权限
  if (props.module && props.type) {
    return hasModulePermission(props.module, props.type)
  }

  // 检查权限
  if (props.permission) {
    return hasPermission(props.permission, props.mode)
  }

  return true
})
</script>

<style scoped>
.no-access {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}

.no-access p {
  margin: 0;
  font-size: 14px;
}
</style>
