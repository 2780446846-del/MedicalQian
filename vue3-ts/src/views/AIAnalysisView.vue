<script setup lang="ts"></script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1 class="page-title">AI数据分析</h1>
      <p class="page-subtitle">智能医疗数据分析与洞察</p>
    </header>

    <div class="content-area">
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">AI数据分析</div>
        <div class="empty-subtitle">功能开发中，敬请期待</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #ffffff;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #2d2f31;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6e736c;
  margin: 0;
}

.content-area {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.empty-state {
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 500;
  color: #2d2f31;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #6e736c;
}
</style>

