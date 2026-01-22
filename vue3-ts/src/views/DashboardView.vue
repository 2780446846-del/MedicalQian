<template>
  <div class="dashboard-view">
    <!-- 顶部三个摘要卡片 -->
    <div class="summary-cards">
      <!-- 患者总数 -->
      <div class="summary-card">
        <div class="card-header">
          <h3 class="card-title">患者总数</h3>
          <span class="help-icon">?</span>
        </div>
        <div class="card-content">
          <div class="large-number">221</div>
          <div class="trend-indicator decrease">
            <span class="arrow">↓</span>
            <span class="percentage">22%</span>
          </div>
          <div class="description">患者数量已下降22%</div>
        </div>
      </div>

      <!-- 预约总数 -->
      <div class="summary-card">
        <div class="card-header">
          <h3 class="card-title">预约总数</h3>
          <span class="help-icon">?</span>
        </div>
        <div class="card-content">
          <div class="large-number">160</div>
          <div class="trend-indicator increase">
            <span class="arrow">↑</span>
            <span class="percentage">20%</span>
          </div>
          <div class="description">预约量增加了20%</div>
        </div>
      </div>

      <!-- 空闲诊室 -->
      <div class="summary-card">
        <div class="card-header">
          <h3 class="card-title">空闲诊室</h3>
          <span class="help-icon">?</span>
          <span class="hospital-icon">🏥</span>
        </div>
        <div class="card-content">
          <div class="large-number">200</div>
          <div class="trend-indicator increase">
            <span class="arrow">↑</span>
            <span class="percentage">25%</span>
          </div>
          <div class="description">25% 空闲、75% 占用</div>
        </div>
      </div>
    </div>

    <!-- 底部三列数据可视化 -->
    <div class="visualization-section">
      <!-- 左列：柱状图 -->
      <div class="chart-column">
        <div class="chart-card">
          <h4 class="chart-title">周数据统计</h4>
          <div ref="barChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 中列：折线图 -->
      <div class="chart-column">
        <div class="chart-card">
          <h4 class="chart-title">时间趋势</h4>
          <div ref="lineChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 右列：饼图和文本数据 -->
      <div class="chart-column">
        <div class="chart-card">
          <h4 class="chart-title">诊室使用情况</h4>
          <div ref="donutChartRef" class="chart-container"></div>
          <div class="room-stats">
            <div class="stat-item">
              <span class="stat-label">可用</span>
              <span class="stat-value">200 间</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">不可用</span>
              <span class="stat-value">600 间</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

// 图表引用
const barChartRef = ref<HTMLDivElement | null>(null)
const lineChartRef = ref<HTMLDivElement | null>(null)
const donutChartRef = ref<HTMLDivElement | null>(null)

let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let donutChart: echarts.ECharts | null = null

// 初始化柱状图
const initBarChart = () => {
  if (!barChartRef.value) return
  
  barChart = echarts.init(barChartRef.value)
  const option = {
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 14, color: '#666' },
    },
    yAxis: {
      type: 'value',
      max: 200,
      interval: 50,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#666' },
      splitLine: { 
        lineStyle: { color: '#f0f0f0' },
        show: true
      },
    },
    series: [{
      data: [120, 190, 140, 70, 90, 120, 140],
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: '#4A90E2',
        borderRadius: [4, 4, 0, 0],
      },
    }],
  }
  barChart.setOption(option)
}

// 初始化折线图
const initLineChart = () => {
  if (!lineChartRef.value) return
  
  lineChart = echarts.init(lineChartRef.value)
  const option = {
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#666' },
    },
    yAxis: {
      type: 'value',
      min: 100,
      max: 400,
      interval: 50,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 12, color: '#666' },
      splitLine: { 
        lineStyle: { color: '#f0f0f0' },
        show: true
      },
    },
    series: [{
      data: [120, 150, 180, 220, 280, 380, 320, 250],
      type: 'line',
      smooth: true,
      lineStyle: { color: '#4A90E2', width: 3 },
      itemStyle: { color: '#4A90E2' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(74, 144, 226, 0.3)' },
            { offset: 1, color: 'rgba(74, 144, 226, 0)' },
          ],
        },
      },
    }],
  }
  lineChart.setOption(option)
}

// 初始化饼图
const initDonutChart = () => {
  if (!donutChartRef.value) return
  
  donutChart = echarts.init(donutChartRef.value)
  const option = {
    tooltip: {
      trigger: 'item',
    },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'center',
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4CAF50',
        formatter: '25%',
      },
      labelLine: {
        show: false,
      },
      data: [
        { value: 25, name: '可用', itemStyle: { color: '#4CAF50' } },
        { value: 75, name: '不可用', itemStyle: { color: '#E0E0E0' } },
      ],
    }],
  }
  donutChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  nextTick(() => {
    initBarChart()
    initLineChart()
    initDonutChart()
  })
}

// 窗口大小改变时重新调整图表
const handleResize = () => {
  barChart?.resize()
  lineChart?.resize()
  donutChart?.resize()
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  lineChart?.dispose()
  donutChart?.dispose()
})
</script>

<style scoped>
.dashboard-view {
  padding: 32px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 顶部摘要卡片 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.summary-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0;
}

.help-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.hospital-icon {
  font-size: 20px;
  margin-left: auto;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.large-number {
  font-size: 48px;
  font-weight: 700;
  color: #1d2129;
}

.trend-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
}

.trend-indicator.increase {
  color: #4CAF50;
}

.trend-indicator.decrease {
  color: #f44336;
}

.arrow {
  font-size: 18px;
}

.percentage {
  font-size: 16px;
}

.description {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

/* 底部可视化区域 */
.visualization-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.chart-column {
  display: flex;
  flex-direction: column;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 16px 0;
}

.chart-container {
  width: 100%;
  height: 400px;
  flex: 1;
}

/* 诊室统计 */
.room-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .visualization-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 16px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .visualization-section {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
  }
}
</style>






