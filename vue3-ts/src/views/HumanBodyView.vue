<template>
  <div class="dashboard-container">
    <!-- 背景网格 -->
    <div class="grid-background"></div>
    
    <!-- 顶部标题栏 -->
    <div class="header">
      <div class="title-section">
        <h1 class="main-title">人体器官医疗监控中心</h1>
        <div class="datetime">{{ currentDateTime }}</div>
      </div>
      <button class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏显示'">
        <span v-if="!isFullscreen">⛶</span>
        <span v-else>⛶</span>
      </button>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 左侧面板 - 三个模块 -->
      <div class="left-panel">
        <!-- 今日关键指标 -->
        <div class="panel-card key-indicators-card">
          <div class="card-title">
            <span class="card-icon">📅</span>
            今日关键指标
          </div>
          <div class="key-indicators">
            <div class="indicator-item">
              <div class="indicator-icon-simple">❤️</div>
              <div class="indicator-content">
                <div class="indicator-label">循环系统病例</div>
                <div class="indicator-value">{{ keyIndicators.cardiac }}</div>
              </div>
            </div>
            <div class="indicator-item">
              <div class="indicator-icon-simple">🧠</div>
              <div class="indicator-content">
                <div class="indicator-label">神经系统病例</div>
                <div class="indicator-value">{{ keyIndicators.neurological }}</div>
              </div>
            </div>
            <div class="indicator-item">
              <div class="indicator-icon-simple">🫀</div>
              <div class="indicator-content">
                <div class="indicator-label">消化系统病例</div>
                <div class="indicator-value">{{ keyIndicators.digestive }}</div>
              </div>
            </div>
            <div class="indicator-item">
              <div class="indicator-icon-simple">⚠️</div>
              <div class="indicator-content">
                <div class="indicator-label">紧急手术病例</div>
                <div class="indicator-value">{{ keyIndicators.emergency }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 器官系统病例分布 - 3D心脏模型 -->
        <div class="panel-card bed-usage-card">
            <div class="card-title">
            <span class="card-icon">🫀</span>
            器官系统病例分布
          </div>
          <div class="bed-chart-wrapper">
            <div class="heart-model-container" ref="heartModelRef"></div>
            <!-- 心脏部位信息面板 -->
            <div v-if="selectedHeartPart" class="heart-info-panel">
              <div class="heart-info-header">
                <h3>{{ selectedHeartPart.name }}</h3>
                <button class="close-btn" @click="closeHeartInfo">×</button>
              </div>
              <div class="heart-info-content">
                <div class="heart-info-item">
                  <span class="label">描述：</span>
                  <span class="value">{{ selectedHeartPart.description }}</span>
                </div>
                <div class="heart-info-item" v-if="selectedHeartPart.branches && selectedHeartPart.branches.length > 0">
                  <span class="label">分支结构：</span>
                  <div class="branches-list">
                    <span v-for="(branch, index) in selectedHeartPart.branches" :key="index" class="branch-tag">
                      {{ branch }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 器官病例统计 -->
        <div class="panel-card">
            <div class="card-title">
            <span class="card-icon">📊</span>
            器官病例统计
          </div>
          <div class="equipment-table">
            <div class="table-header">
              <div class="table-cell">器官系统</div>
              <div class="table-cell">状态</div>
              <div class="table-cell">病例占比</div>
            </div>
            <div
              v-for="(organ, index) in organCasesList"
              :key="index"
              class="table-row"
            >
              <div class="table-cell">{{ organ.name }}</div>
              <div class="table-cell">
                <span :class="['status-badge', organ.statusClass]">
                  {{ organ.status }}
                </span>
              </div>
              <div class="table-cell">{{ organ.rate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央区域 - 包含人体模型和柱状图 -->
      <div class="center-section">
        <!-- 中央3D人体模型 - 70% -->
        <div class="center-panel">
          <div class="human-body-container" ref="humanBodyRef">
            <div class="human-body-overlay"></div>
            <!-- 肌肉信息面板 -->
            <div v-if="selectedMuscle" class="muscle-info-panel">
              <div class="muscle-info-header">
                <h3>{{ selectedMuscle.name }}</h3>
                <button class="close-btn" @click="closeMuscleInfo">×</button>
              </div>
              <div class="muscle-info-content">
                <div class="muscle-info-item">
                  <span class="label">位置：</span>
                  <span class="value">{{ selectedMuscle.location }}</span>
                </div>
                <div class="muscle-info-item">
                  <span class="label">功能：</span>
                  <span class="value">{{ selectedMuscle.function }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.origin">
                  <span class="label">起点：</span>
                  <span class="value">{{ selectedMuscle.origin }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.insertion">
                  <span class="label">止点：</span>
                  <span class="value">{{ selectedMuscle.insertion }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.innervation">
                  <span class="label">神经支配：</span>
                  <span class="value">{{ selectedMuscle.innervation }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.bloodSupply">
                  <span class="label">血液供应：</span>
                  <span class="value">{{ selectedMuscle.bloodSupply }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.description">
                  <span class="label">描述：</span>
                  <span class="value">{{ selectedMuscle.description }}</span>
                </div>
                <div class="muscle-info-item" v-if="selectedMuscle.clinicalNotes" style="background: rgba(255, 193, 7, 0.1); border-left-color: rgba(255, 193, 7, 0.5);">
                  <span class="label" style="color: #ffc107;">临床提示：</span>
                  <span class="value">{{ selectedMuscle.clinicalNotes }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部柱状图 - 30% -->
        <div class="bottom-panel">
          <div class="panel-card">
            <div class="card-title">人体器官科室患者分布</div>
            <div class="chart-container" ref="departmentChartRef"></div>
          </div>
        </div>
      </div>

      <!-- 右侧面板 - 三个模块 -->
      <div class="right-panel">
        <!-- 身体结构分析图 -->
        <div class="panel-card">
          <div class="card-title">身体结构分析</div>
          <div class="chart-container" ref="bodyStructureChartRef"></div>
        </div>

        <!-- 药品库存预警 -->
        <div class="panel-card">
          <div class="card-title">器官医疗用药库存预警</div>
          <div class="chart-container" ref="drugChartRef"></div>
        </div>

        <!-- 患者流量趋势 -->
        <div class="panel-card">
          <div class="card-title">器官疾病患者流量趋势</div>
          <div class="chart-container" ref="flowChartRef"></div>
        </div>

        <!-- 实时通知 -->
        <div class="panel-card">
          <div class="card-title">实时通知</div>
          <div class="notifications-list">
            <div
              v-for="(notification, index) in notifications"
              :key="index"
              class="notification-item"
              :class="notification.type"
            >
              <div class="notification-time">{{ notification.time }}</div>
              <div class="notification-content">{{ notification.content }}</div>
              <div class="notification-label">{{ notification.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// 当前日期时间
const currentDateTime = ref('')

// 全屏状态
const isFullscreen = ref(false)

// 今日关键指标 - 器官病例统计
const keyIndicators = ref({
  patients: 656, // 总病例数
  cardiac: 128, // 循环系统病例
  neurological: 95, // 神经系统病例
  digestive: 112, // 消化系统病例
  respiratory: 88, // 呼吸系统病例
  urological: 76, // 泌尿系统病例
  endocrine: 92, // 内分泌系统病例
  emergency: 28 // 紧急手术病例
})

// 器官病例统计列表
const organCasesList = ref([
  { name: '循环系统', cases: 128, status: '正常', statusClass: 'normal', rate: '19.5%' },
  { name: '神经系统', cases: 95, status: '正常', statusClass: 'normal', rate: '14.5%' },
  { name: '消化系统', cases: 112, status: '正常', statusClass: 'normal', rate: '17.1%' },
  { name: '呼吸系统', cases: 88, status: '正常', statusClass: 'normal', rate: '13.4%' },
  { name: '泌尿系统', cases: 76, status: '正常', statusClass: 'normal', rate: '11.6%' },
  { name: '内分泌系统', cases: 92, status: '正常', statusClass: 'normal', rate: '14.0%' }
])

// 通知列表
const notifications = ref([
  {
    time: '14:30',
    content: '心内科：急性心肌梗死患者介入手术成功，血管再通良好',
    label: '正常',
    type: 'normal'
  },
  {
    time: '13:15',
    content: '神经外科：脑出血患者紧急开颅手术进行中，生命体征稳定',
    label: '紧急',
    type: 'urgent'
  },
  {
    time: '11:45',
    content: '消化内科：胃镜检查发现早期胃癌，已安排内镜下切除术',
    label: '提醒',
    type: 'reminder'
  },
  {
    time: '10:20',
    content: '呼吸科：重症肺炎患者呼吸机辅助治疗，氧合指标改善',
    label: '正常',
    type: 'normal'
  },
  {
    time: '09:50',
    content: '泌尿外科：肾结石患者体外冲击波碎石完成，结石已排出',
    label: '正常',
    type: 'normal'
  },
  {
    time: '08:30',
    content: '肝胆外科：肝肿瘤患者腹腔镜切除术顺利完成，恢复良好',
    label: '正常',
    type: 'normal'
  }
])

// 图表引用
const bodyStructureChartRef = ref<HTMLDivElement | null>(null)
const drugChartRef = ref<HTMLDivElement | null>(null)
const flowChartRef = ref<HTMLDivElement | null>(null)
const departmentChartRef = ref<HTMLDivElement | null>(null)
const humanBodyRef = ref<HTMLDivElement | null>(null)
const heartModelRef = ref<HTMLDivElement | null>(null)

// Three.js 相关
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let humanBody: THREE.Group | null = null
let animationId: number | null = null
let controls: OrbitControls | null = null
let raycaster: THREE.Raycaster | null = null
const mouse: THREE.Vector2 = new THREE.Vector2()
let clickableMarkers: THREE.Mesh[] = []

// 心脏模型相关
let heartScene: THREE.Scene | null = null
let heartCamera: THREE.PerspectiveCamera | null = null
let heartRenderer: THREE.WebGLRenderer | null = null
let heartLabelRenderer: CSS2DRenderer | null = null
let heartModel: THREE.Group | null = null
let heartAnimationId: number | null = null
let heartControls: OrbitControls | null = null
let heartRaycaster: THREE.Raycaster | null = null
const heartMouse: THREE.Vector2 = new THREE.Vector2()
let heartClickableMarkers: THREE.Mesh[] = []
let heartLabels: CSS2DObject[] = []
let heartLines: THREE.Line[] = []
let heartLabelOffsetX = 1.0

// 心脏部位数据 - 标签分布在模型周围（参考图片格式）
const heartParts: Record<number, any> = {
  1: {
    name: '下腔静脉',
    position: new THREE.Vector3(0.7, -0.8, 0.1),
    align: 'left',
    labelOffsetY: -0.05,
    description: '下腔静脉，收集下半身的静脉血，注入右心房',
    branches: ['肝静脉', '肾静脉', '髂总静脉']
  },
  2: {
    name: '右心室',
    position: new THREE.Vector3(0.6, -0.3, 0.2),
    align: 'left',
    description: '接收右心房的血液，通过肺动脉将血液泵送到肺部',
    branches: ['三尖瓣', '肺动脉瓣', '肺动脉']
  },
  3: {
    name: '右心房',
    position: new THREE.Vector3(0.8, 0.3, 0.2),
    align: 'left',
    description: '接收来自上、下腔静脉的静脉血，是心脏的四个腔室之一',
    branches: ['上腔静脉', '下腔静脉', '冠状窦']
  },
  4: {
    name: '主动脉',
    position: new THREE.Vector3(-0.5, 0.6, 0),
    align: 'left',
    labelOffsetY: 0.05,
    description: '人体最大的动脉，从左心室发出，将含氧血液输送到全身',
    branches: ['升主动脉', '主动脉弓', '降主动脉']
  },
  5: {
    name: '肺动脉',
    position: new THREE.Vector3(0.5, 0.5, 0.3),
    align: 'right',
    labelOffsetY: 0.02,
    description: '从右心室发出，将静脉血输送到肺部进行气体交换',
    branches: ['肺动脉干', '左肺动脉', '右肺动脉']
  },
  6: {
    name: '左心房',
    position: new THREE.Vector3(-0.8, 0.3, 0.2),
    align: 'right',
    description: '接收来自肺静脉的含氧血液',
    branches: ['肺静脉', '二尖瓣']
  },
  7: {
    name: '左心室',
    position: new THREE.Vector3(-0.6, -0.3, 0.2),
    align: 'right',
    description: '心脏的主要泵血腔室，通过主动脉将含氧血液泵送到全身',
    branches: ['二尖瓣', '主动脉瓣', '主动脉']
  },
  8: {
    name: '上腔静脉',
    position: new THREE.Vector3(0.9, 1.0, 0),
    align: 'right',
    labelOffsetY: 0.1,
    description: '收集头部、颈部和上肢的静脉血，注入右心房',
    branches: ['左头臂静脉', '右头臂静脉']
  }
}

// 选中的心脏部位信息
const selectedHeartPart = ref<any>(null)

// 选中的肌肉信息
const selectedMuscle = ref<any>(null)

// 肌肉部位数据（根据图片中的标注点）
const muscleData: Record<number, any> = {
  1: {
    name: '大脑',
    location: '颅腔内，位于头部最上方',
    function: '思维、记忆、学习、语言、情绪控制、运动协调、感觉处理、自主神经调节等高级神经功能',
    origin: '主要结构：大脑皮层、基底节、丘脑、下丘脑、脑干、小脑',
    insertion: '通过脑干与脊髓相连，通过12对脑神经与身体各部分联系',
    innervation: '中枢神经系统，包含约860亿个神经元，通过突触连接形成复杂的神经网络',
    bloodSupply: '颈内动脉、椎动脉（形成Willis环），大脑中动脉、前动脉、后动脉',
    description: '大脑是人体最复杂的器官，分为左右两个半球，由胼胝体连接。大脑皮层负责高级认知功能，包括语言、记忆、决策等。不同脑区负责不同功能，如前额叶负责执行功能，颞叶负责记忆，顶叶负责感觉整合，枕叶负责视觉处理。',
    clinicalNotes: '脑部损伤可能导致认知障碍、运动功能障碍、语言障碍、记忆问题等。常见疾病包括脑卒中、阿尔茨海默病、帕金森病等。保持健康的生活方式、充足睡眠和适度运动有助于维护大脑健康。'
  },
  2: {
    name: '胸大肌',
    location: '左侧上胸部',
    function: '肩关节内收、内旋和屈曲',
    origin: '锁骨、胸骨、第1-6肋软骨',
    insertion: '肱骨大结节嵴',
    innervation: '胸内、外侧神经',
    bloodSupply: '胸肩峰动脉',
    description: '覆盖胸部的主要肌肉，参与上肢运动'
  },
  3: {
    name: '左三角肌',
    location: '左肩',
    function: '肩关节外展、前屈和后伸',
    origin: '锁骨外侧、肩峰、肩胛冈',
    insertion: '肱骨三角肌粗隆',
    innervation: '腋神经',
    bloodSupply: '旋肱后动脉',
    description: '肩部最外层肌肉，形成肩部轮廓'
  },
  4: {
    name: '右肱二头肌',
    location: '右上臂前侧',
    function: '肘关节屈曲、前臂旋后',
    origin: '长头：肩胛骨盂上结节；短头：肩胛骨喙突',
    insertion: '桡骨粗隆',
    innervation: '肌皮神经',
    bloodSupply: '肱动脉',
    description: '上臂前侧的主要屈肌'
  },
  5: {
    name: '肋骨（骨性结构）',
    location: '右侧肋骨前端',
    function: '保护胸腔内脏器，参与呼吸运动',
    origin: '胸椎椎体',
    insertion: '胸骨（真肋）或上位肋骨（假肋）',
    innervation: '肋间神经',
    bloodSupply: '肋间动脉',
    description: '构成胸廓的骨性结构，保护心脏和肺部'
  },
  6: {
    name: '腹直肌',
    location: '腹部中央',
    function: '脊柱前屈、压缩腹腔',
    origin: '耻骨联合和耻骨嵴',
    insertion: '第5-7肋软骨和剑突',
    innervation: '肋间神经（T7-T12）',
    bloodSupply: '腹壁上、下动脉',
    description: '腹部前壁的主要肌肉，形成"六块腹肌"'
  },
  7: {
    name: '外斜肌',
    location: '左侧腹部',
    function: '脊柱侧屈和旋转，压缩腹腔',
    origin: '第5-12肋骨外侧面',
    insertion: '髂嵴、腹股沟韧带',
    innervation: '肋间神经、髂腹下神经',
    bloodSupply: '下位肋间动脉',
    description: '腹部侧壁的主要肌肉'
  },
  8: {
    name: '左前臂肌群（前侧）',
    location: '左前臂',
    function: '腕关节和手指的屈曲',
    origin: '肱骨内上髁',
    insertion: '腕骨、掌骨、指骨',
    innervation: '正中神经、尺神经',
    bloodSupply: '桡动脉、尺动脉',
    description: '前臂前侧的屈肌群，控制手腕和手指的屈曲运动'
  },
  9: {
    name: '右前臂肌群（前侧）',
    location: '右前臂',
    function: '腕关节和手指的屈曲',
    origin: '肱骨内上髁',
    insertion: '腕骨、掌骨、指骨',
    innervation: '正中神经、尺神经',
    bloodSupply: '桡动脉、尺动脉',
    description: '前臂前侧的屈肌群，控制手腕和手指的屈曲运动'
  },
  10: {
    name: '左股四头肌',
    location: '左大腿前侧',
    function: '膝关节伸展',
    origin: '股直肌：髂前下棘；股外侧肌：股骨粗线外侧；股内侧肌：股骨粗线内侧；股中间肌：股骨前面',
    insertion: '胫骨粗隆（通过髌韧带）',
    innervation: '股神经',
    bloodSupply: '股动脉',
    description: '大腿前侧的主要伸肌群，包括股直肌、股外侧肌、股内侧肌和股中间肌'
  },
  11: {
    name: '内收肌群/缝匠肌',
    location: '左大腿内侧',
    function: '髋关节内收（内收肌）；髋关节屈曲、外旋和膝关节屈曲（缝匠肌）',
    origin: '内收肌：耻骨、坐骨；缝匠肌：髂前上棘',
    insertion: '内收肌：股骨粗线；缝匠肌：胫骨上端内侧',
    innervation: '闭孔神经（内收肌）；股神经（缝匠肌）',
    bloodSupply: '闭孔动脉、股动脉',
    description: '大腿内侧的肌肉群，包括内收长肌、内收短肌、内收大肌和缝匠肌'
  }
}

// 标记点位置（相对于模型中心的3D坐标，根据图片中的精确标注位置）
// 注意：X轴正值为右侧，负值为左侧；Y轴正值为上方，负值为下方；Z轴正值为前方，负值为后方
const markerPositions: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0.25, 2.2, 0.15),     // 右侧颈部，胸锁乳突肌和上斜方肌区域（精确定位到颈部右侧）
  2: new THREE.Vector3(-0.35, 1.55, 0.22),   // 左侧胸大肌
  3: new THREE.Vector3(-0.68, 1.45, 0.08),   // 左三角肌，左肩
  4: new THREE.Vector3(0.72, 1.15, 0.15),    // 右肱二头肌，右上臂前侧
  5: new THREE.Vector3(0.45, 1.0, 0.18),     // 右侧肋骨前端的骨性结构
  6: new THREE.Vector3(0, 0.65, 0.25),       // 腹直肌，腹部中央（六块腹肌区域）
  7: new THREE.Vector3(-0.48, 0.35, 0.12),   // 左侧外斜肌，腹部左侧
  8: new THREE.Vector3(-0.78, 0.55, 0.08),   // 左前臂肌肉（前侧肌群）
  9: new THREE.Vector3(0.78, 0.55, 0.08),    // 右前臂肌肉（前侧肌群）
  10: new THREE.Vector3(-0.32, -0.45, 0.12), // 左股四头肌，左大腿前侧
  11: new THREE.Vector3(-0.28, -0.2, 0.15)   // 左大腿内侧，内收肌和缝匠肌
}

// ECharts 实例
let bodyStructureChart: echarts.ECharts | null = null
let drugChart: echarts.ECharts | null = null
let flowChart: echarts.ECharts | null = null
let departmentChart: echarts.ECharts | null = null

// 计算基础字体大小（基于视口宽度）
const baseFontSize = computed(() => {
  return Math.min(window.innerWidth / 100, window.innerHeight / 60)
})

// 更新日期时间
const updateDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[now.getDay()]
  
  currentDateTime.value = `${year}.${month}.${day} ${hours}:${minutes}:${seconds} ${weekday}`
}

// 切换全屏
const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    // 进入全屏
    const element = document.documentElement
    
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }
      
      // 全屏成功后再添加类名和调整尺寸
      document.body.classList.add('fullscreen-mode')
      // 设置全屏背景色（固定浅色）
      const bgGradient = 'linear-gradient(135deg, #0a1929 0%, #0d1b2a 50%, #0f1621 100%)'
      const bgSolid = '#0a1929'
      document.documentElement.style.background = bgGradient
      document.documentElement.style.backgroundColor = bgSolid
      document.body.style.background = bgGradient
      document.body.style.backgroundColor = bgSolid
      const app = document.getElementById('app')
      if (app) {
        (app as HTMLElement).style.background = bgGradient
        ;(app as HTMLElement).style.backgroundColor = bgSolid
      }
      // 等待DOM更新完成后再调整
      setTimeout(() => {
        // 强制隐藏侧边栏
        const sidebar = document.querySelector('.sidebar')
        if (sidebar) {
          (sidebar as HTMLElement).style.display = 'none'
          ;(sidebar as HTMLElement).style.visibility = 'hidden'
          ;(sidebar as HTMLElement).style.opacity = '0'
          ;(sidebar as HTMLElement).style.width = '0'
          ;(sidebar as HTMLElement).style.position = 'absolute'
          ;(sidebar as HTMLElement).style.left = '-9999px'
          ;(sidebar as HTMLElement).style.pointerEvents = 'none'
        }
        
        // 强制显示内容
        const appShell = document.querySelector('.app-shell')
        if (appShell) {
          (appShell as HTMLElement).style.gridTemplateColumns = '0 1fr'
          ;(appShell as HTMLElement).style.width = '100vw'
          ;(appShell as HTMLElement).style.height = '100vh'
          ;(appShell as HTMLElement).style.position = 'fixed'
          ;(appShell as HTMLElement).style.top = '0'
          ;(appShell as HTMLElement).style.left = '0'
          ;(appShell as HTMLElement).style.right = '0'
          ;(appShell as HTMLElement).style.bottom = '0'
        }
        
        const main = document.querySelector('.main')
        if (main) {
          (main as HTMLElement).style.width = '100vw'
          ;(main as HTMLElement).style.height = '100vh'
          ;(main as HTMLElement).style.margin = '0'
          ;(main as HTMLElement).style.padding = '0'
        }
        
        const dashboardContainer = document.querySelector('.dashboard-container')
        if (dashboardContainer) {
          (dashboardContainer as HTMLElement).style.display = 'flex'
          ;(dashboardContainer as HTMLElement).style.visibility = 'visible'
          ;(dashboardContainer as HTMLElement).style.opacity = '1'
          ;(dashboardContainer as HTMLElement).style.width = '100vw'
          ;(dashboardContainer as HTMLElement).style.height = '100vh'
          ;(dashboardContainer as HTMLElement).style.position = 'fixed'
          ;(dashboardContainer as HTMLElement).style.top = '0'
          ;(dashboardContainer as HTMLElement).style.left = '0'
          ;(dashboardContainer as HTMLElement).style.right = '0'
          ;(dashboardContainer as HTMLElement).style.bottom = '0'
        }
        
        const contentWrapper = document.querySelector('.content-wrapper')
        if (contentWrapper) {
          (contentWrapper as HTMLElement).style.display = 'grid'
          ;(contentWrapper as HTMLElement).style.visibility = 'visible'
          ;(contentWrapper as HTMLElement).style.opacity = '1'
          ;(contentWrapper as HTMLElement).style.gridTemplateColumns = '25% 1fr 25%'
          ;(contentWrapper as HTMLElement).style.width = '100%'
          ;(contentWrapper as HTMLElement).style.height = '100%'
        }
        
        // 重新调整所有图表
        handleResize()
        // 重新调整3D模型
        const handle3DResize = (window as any).__handle3DResize
        if (handle3DResize) {
          handle3DResize()
        }
        // 重新调整心脏3D模型
        const handleHeartResize = (window as any).__handleHeartResize
        if (handleHeartResize) {
          handleHeartResize()
        }
      }, 300)
    } catch (error) {
      console.error('全屏失败:', error)
    }
  } else {
    // 退出全屏
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
      
      // 退出全屏后移除类名和调整尺寸
      document.body.classList.remove('fullscreen-mode')
      // 等待DOM更新完成后再调整
      setTimeout(() => {
        // 重新调整所有图表
        handleResize()
        // 重新调整3D模型
        const handle3DResize = (window as any).__handle3DResize
        if (handle3DResize) {
          handle3DResize()
        }
        // 重新调整心脏3D模型
        const handleHeartResize = (window as any).__handleHeartResize
        if (handleHeartResize) {
          handleHeartResize()
        }
      }, 300)
    } catch (error) {
      console.error('退出全屏失败:', error)
    }
  }
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  )
  
  isFullscreen.value = isCurrentlyFullscreen
  
  // 延迟更新，确保全屏API完成后再调整
  setTimeout(() => {
    // 同步更新 body 类
    if (isCurrentlyFullscreen) {
      document.body.classList.add('fullscreen-mode')
      // 设置全屏背景色（固定浅色）
      const bgGradient = 'linear-gradient(135deg, #0a1929 0%, #0d1b2a 50%, #0f1621 100%)'
      const bgSolid = '#0a1929'
      document.documentElement.style.background = bgGradient
      document.documentElement.style.backgroundColor = bgSolid
      document.body.style.background = bgGradient
      document.body.style.backgroundColor = bgSolid
      const app = document.getElementById('app')
      if (app) {
        (app as HTMLElement).style.background = bgGradient
        ;(app as HTMLElement).style.backgroundColor = bgSolid
      }
      
      // 强制隐藏侧边栏
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        (sidebar as HTMLElement).style.display = 'none'
        ;(sidebar as HTMLElement).style.visibility = 'hidden'
        ;(sidebar as HTMLElement).style.opacity = '0'
        ;(sidebar as HTMLElement).style.width = '0'
        ;(sidebar as HTMLElement).style.position = 'absolute'
        ;(sidebar as HTMLElement).style.left = '-9999px'
        ;(sidebar as HTMLElement).style.pointerEvents = 'none'
      }
      
      // 强制显示内容
      const appShell = document.querySelector('.app-shell')
      if (appShell) {
        (appShell as HTMLElement).style.gridTemplateColumns = '0 1fr'
        ;(appShell as HTMLElement).style.width = '100vw'
        ;(appShell as HTMLElement).style.height = '100vh'
        ;(appShell as HTMLElement).style.position = 'fixed'
        ;(appShell as HTMLElement).style.top = '0'
        ;(appShell as HTMLElement).style.left = '0'
        ;(appShell as HTMLElement).style.right = '0'
        ;(appShell as HTMLElement).style.bottom = '0'
      }
      
      const main = document.querySelector('.main')
      if (main) {
        (main as HTMLElement).style.width = '100vw'
        ;(main as HTMLElement).style.height = '100vh'
        ;(main as HTMLElement).style.margin = '0'
        ;(main as HTMLElement).style.padding = '0'
      }
      
      const dashboardContainer = document.querySelector('.dashboard-container')
      if (dashboardContainer) {
        (dashboardContainer as HTMLElement).style.display = 'flex'
        ;(dashboardContainer as HTMLElement).style.visibility = 'visible'
        ;(dashboardContainer as HTMLElement).style.opacity = '1'
        ;(dashboardContainer as HTMLElement).style.width = '100vw'
        ;(dashboardContainer as HTMLElement).style.height = '100vh'
        ;(dashboardContainer as HTMLElement).style.position = 'fixed'
        ;(dashboardContainer as HTMLElement).style.top = '0'
        ;(dashboardContainer as HTMLElement).style.left = '0'
        ;(dashboardContainer as HTMLElement).style.right = '0'
        ;(dashboardContainer as HTMLElement).style.bottom = '0'
      }
      
      const contentWrapper = document.querySelector('.content-wrapper')
      if (contentWrapper) {
        (contentWrapper as HTMLElement).style.display = 'grid'
        ;(contentWrapper as HTMLElement).style.visibility = 'visible'
        ;(contentWrapper as HTMLElement).style.opacity = '1'
        ;(contentWrapper as HTMLElement).style.gridTemplateColumns = '25% 1fr 25%'
        ;(contentWrapper as HTMLElement).style.width = '100%'
        ;(contentWrapper as HTMLElement).style.height = '100%'
      }
      
      // 确保3D模型容器和canvas可以接收点击事件
      const humanBodyContainer = document.querySelector('.human-body-container')
      if (humanBodyContainer) {
        ;(humanBodyContainer as HTMLElement).style.pointerEvents = 'auto'
        ;(humanBodyContainer as HTMLElement).style.zIndex = '10'
        ;(humanBodyContainer as HTMLElement).style.position = 'relative'
      }
      
      // 确保canvas元素可以接收点击事件
      const canvas = document.querySelector('.human-body-container canvas')
      if (canvas) {
        ;(canvas as HTMLElement).style.pointerEvents = 'auto'
        ;(canvas as HTMLElement).style.zIndex = '10'
        ;(canvas as HTMLElement).style.position = 'relative'
      }
    } else {
      document.body.classList.remove('fullscreen-mode')
      // 恢复背景色
      document.documentElement.style.background = ''
      document.documentElement.style.backgroundColor = ''
      document.body.style.background = ''
      document.body.style.backgroundColor = ''
      const app = document.getElementById('app')
      if (app) {
        (app as HTMLElement).style.background = ''
        ;(app as HTMLElement).style.backgroundColor = ''
      }
      
      // 恢复侧边栏
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        (sidebar as HTMLElement).style.display = ''
        ;(sidebar as HTMLElement).style.visibility = ''
        ;(sidebar as HTMLElement).style.opacity = ''
        ;(sidebar as HTMLElement).style.width = ''
        ;(sidebar as HTMLElement).style.position = ''
        ;(sidebar as HTMLElement).style.left = ''
        ;(sidebar as HTMLElement).style.pointerEvents = ''
      }
      
      // 恢复其他元素
      const appShell = document.querySelector('.app-shell')
      if (appShell) {
        (appShell as HTMLElement).style.gridTemplateColumns = ''
        ;(appShell as HTMLElement).style.width = ''
        ;(appShell as HTMLElement).style.height = ''
        ;(appShell as HTMLElement).style.position = ''
        ;(appShell as HTMLElement).style.top = ''
        ;(appShell as HTMLElement).style.left = ''
        ;(appShell as HTMLElement).style.right = ''
        ;(appShell as HTMLElement).style.bottom = ''
      }
      
      const main = document.querySelector('.main')
      if (main) {
        (main as HTMLElement).style.width = ''
        ;(main as HTMLElement).style.height = ''
        ;(main as HTMLElement).style.margin = ''
        ;(main as HTMLElement).style.padding = ''
      }
      
      const dashboardContainer = document.querySelector('.dashboard-container')
      if (dashboardContainer) {
        (dashboardContainer as HTMLElement).style.position = ''
        ;(dashboardContainer as HTMLElement).style.top = ''
        ;(dashboardContainer as HTMLElement).style.left = ''
        ;(dashboardContainer as HTMLElement).style.right = ''
        ;(dashboardContainer as HTMLElement).style.bottom = ''
        ;(dashboardContainer as HTMLElement).style.width = ''
        ;(dashboardContainer as HTMLElement).style.height = ''
      }
      
      const contentWrapper = document.querySelector('.content-wrapper')
      if (contentWrapper) {
        (contentWrapper as HTMLElement).style.gridTemplateColumns = ''
        ;(contentWrapper as HTMLElement).style.width = ''
        ;(contentWrapper as HTMLElement).style.height = ''
      }
    }
    
    // 等待DOM更新完成后再调整
    setTimeout(() => {
      // 重新调整所有图表
      handleResize()
      
      // 重新调整3D模型
      const handle3DResize = (window as any).__handle3DResize
      if (handle3DResize) {
        handle3DResize()
      }
      // 重新调整心脏3D模型
      const handleHeartResize = (window as any).__handleHeartResize
      if (handleHeartResize) {
        handleHeartResize()
      }
    }, 300)
  }, 100)
}

// 创建带数字的圆圈纹理
const createNumberedCircleTexture = (number: number, size: number = 64): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('无法创建Canvas上下文')
  }
  
  // 绘制白色圆圈
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // 绘制黑色数字
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${size * 0.5}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(number.toString(), size / 2, size / 2)
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// 创建可点击的标记点（白色圆圈+黑色数字）
const createClickableMarkers = () => {
  if (!humanBody || !scene || !humanBodyRef.value) return
  
  clickableMarkers = []
  
  // 为每个标记点创建可点击的透明球体和带数字的圆圈sprite
  Object.keys(markerPositions).forEach((key) => {
    const id = parseInt(key)
    const position = markerPositions[id]
    
    if (!position || !humanBody) return
    
    // 创建透明的可点击球体（用于点击检测）
    const geometry = new THREE.SphereGeometry(0.12, 16, 16)
    const material = new THREE.MeshBasicMaterial({
    transparent: true,
      opacity: 0.01, // 几乎完全透明，仅用于点击检测
      visible: true
  })
    const marker = new THREE.Mesh(geometry, material)
    
    // 设置位置
    marker.position.copy(position)
    
    // 存储标记点ID
    ;(marker as any).muscleId = id
    
    // 添加到场景
    humanBody.add(marker)
    clickableMarkers.push(marker)

    // 创建带数字的圆圈精灵
    const texture = createNumberedCircleTexture(id, 64)
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
    transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
  })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(0.15, 0.15, 1)
    sprite.position.copy(position)
    // 根据位置调整sprite的Z轴，确保在模型表面可见
    // 对于后侧标记点（Z轴负值），需要更向前移动
    if (position.z < 0) {
      sprite.position.z = position.z + 0.12 // 后侧标记点需要更向前
    } else {
      sprite.position.z = position.z + 0.05 // 前侧标记点稍微向前
    }
    
    // 存储标记点ID到sprite
    ;(sprite as any).muscleId = id
    
    // 添加到场景
    humanBody.add(sprite)
  })
}

// 处理模型点击事件
const onModelClick = (event: MouseEvent) => {
  if (!raycaster || !camera || !renderer || !humanBodyRef.value) return
  
  // 计算鼠标在归一化设备坐标中的位置
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // 更新射线
  raycaster.setFromCamera(mouse, camera)
  
  // 检测与标记点的交点
  const intersects = raycaster.intersectObjects(clickableMarkers)
  
  if (intersects.length > 0 && intersects[0]) {
    const clickedMarker = intersects[0].object as THREE.Mesh
    const muscleId = (clickedMarker as any).muscleId
    
    if (muscleId && muscleData[muscleId]) {
      selectedMuscle.value = muscleData[muscleId]
    }
  }
}

// 关闭肌肉信息面板
const closeMuscleInfo = () => {
  selectedMuscle.value = null
}

// 加载真实3D人体模型（直接渲染，保持原始材质）
const loadRealHumanModel = async (): Promise<THREE.Object3D | null> => {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()
    const modelUrl = '/models/human-body.glb'
    
    const timeout = setTimeout(() => {
      console.warn('模型加载超时')
      resolve(null)
    }, 15000)
    
    loader.load(
      modelUrl,
      (gltf) => {
        clearTimeout(timeout)
        try {
          const model = gltf.scene.clone()
          
          // 计算边界框以居中模型
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          
          if (maxDim === 0) {
            console.warn('模型尺寸为0')
            resolve(null)
            return
          }
          
          // 居中并缩放模型
          model.position.sub(center)
          const targetHeight = 5
          const scale = targetHeight / maxDim
          model.scale.set(scale, scale, scale)
          
          // 向上移动一个头的高度（人体高度约7-8个头高）
          const headHeight = targetHeight / 7.5 // 约一个头的高度
          model.position.y += headHeight
          
          // 确保材质和几何体正确渲染，并提高亮度
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material]
                materials.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial || 
                      mat instanceof THREE.MeshPhongMaterial ||
                      mat instanceof THREE.MeshLambertMaterial) {
                    mat.needsUpdate = true
                    // 提高材质亮度
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.emissive = new THREE.Color(0x333333) // 添加自发光，提高亮度
                      mat.emissiveIntensity = 0.3
                    }
                    // 增加材质的整体亮度
                    if (mat.color) {
                      const currentColor = mat.color.clone()
                      // 提高颜色亮度（增加RGB值）
                      mat.color.setRGB(
                        Math.min(1, currentColor.r * 1.4),
                        Math.min(1, currentColor.g * 1.4),
                        Math.min(1, currentColor.b * 1.4)
                      )
                    }
                  }
                })
              }
              child.geometry.computeVertexNormals()
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          
          resolve(model)
        } catch (error) {
          console.error('处理模型时出错:', error)
          resolve(null)
        }
      },
      undefined,
      (error) => {
        clearTimeout(timeout)
        console.warn('加载模型失败:', error)
        resolve(null)
      }
    )
  })
}

// 初始化3D人体模型 - 直接渲染GLB模型，保持原始材质
const initHumanBody = async () => {
  if (!humanBodyRef.value) return

  // 创建场景
  scene = new THREE.Scene()
  // 完全按照图一的3D场景背景 - 更亮的蓝色
  scene.background = new THREE.Color(0x1a2332)

  // 创建相机（根据图片样式调整初始位置）
  const width = humanBodyRef.value.clientWidth
  const height = humanBodyRef.value.clientHeight
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 0, 8) // 根据图片样式调整初始距离

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // 提高渲染器亮度（使用色调映射）
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2 // 提高曝光度
  humanBodyRef.value.appendChild(renderer.domElement)

  // 创建人体模型组（根据图片样式设置初始大小）
  humanBody = new THREE.Group()
  humanBody.scale.set(0.8, 0.8, 0.8) // 根据图片样式调整初始缩放

  // 加载真实3D模型
  const loadedModel = await loadRealHumanModel()
  
  if (!loadedModel) {
    console.error('3D模型加载失败')
    return
  }

  // 直接使用加载的模型，保持原始材质和颜色
  humanBody.add(loadedModel)
  
  // 创建可点击的标记点
  createClickableMarkers()
  
  // 添加环境光（提高亮度）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0) // 从0.6提高到1.0
  scene.add(ambientLight)

  // 添加主光源（提高亮度）
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2) // 从0.8提高到1.2
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // 添加补光（提高亮度）
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6) // 从0.3提高到0.6
  fillLight.position.set(-5, 5, -5)
  scene.add(fillLight)

  // 添加点光源增强细节（提高亮度）
  const pointLight = new THREE.PointLight(0xffffff, 0.8, 100) // 从0.5提高到0.8
  pointLight.position.set(0, 5, 10)
  scene.add(pointLight)
  
  // 添加额外的点光源从前方照亮
  const frontLight = new THREE.PointLight(0xffffff, 0.6, 100)
  frontLight.position.set(0, 0, 8)
  scene.add(frontLight)

  scene.add(humanBody)

  // 初始化射线检测器
  raycaster = new THREE.Raycaster()
  
  // 添加点击事件监听（确保可以接收点击事件）
  renderer.domElement.style.pointerEvents = 'auto'
  renderer.domElement.style.cursor = 'pointer'
  renderer.domElement.addEventListener('click', onModelClick, { passive: false })

  // 创建轨道控制器（实现鼠标拖动旋转）
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true // 启用阻尼，使旋转更平滑
  controls.dampingFactor = 0.05 // 阻尼系数
  controls.enableZoom = true // 允许缩放
  controls.enablePan = false // 禁用平移（只允许旋转和缩放）
  controls.minDistance = 5 // 最小缩放距离（根据图片样式调整）
  controls.maxDistance = 20 // 最大缩放距离（根据图片样式调整）
  controls.target.set(0, 0, 0) // 设置旋转中心点
  controls.update()

  // 动画循环
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    // 更新控制器（必须每帧调用）
    if (controls) {
      controls.update()
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }
  animate()

  // 窗口大小调整（3D模型专用）
  const handle3DResize = () => {
    if (!humanBodyRef.value || !camera || !renderer) return
    const width = humanBodyRef.value.clientWidth
    const height = humanBodyRef.value.clientHeight
    if (width > 0 && height > 0) {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
      // 确保canvas可以接收点击事件
      renderer.domElement.style.pointerEvents = 'auto'
      renderer.domElement.style.cursor = 'pointer'
      // 更新控制器
      if (controls) {
        controls.update()
      }
    }
  }
  window.addEventListener('resize', handle3DResize)
  
  // 将3D resize函数暴露给外部调用
  ;(window as any).__handle3DResize = handle3DResize
}

// 加载心脏3D模型
const loadHeartModel = async (): Promise<THREE.Object3D | null> => {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()
    const modelUrl = '/models/human_heart_3d_model__anatomy__medical_project.glb'
    
    const timeout = setTimeout(() => {
      console.warn('心脏模型加载超时')
      resolve(null)
    }, 15000)
    
    loader.load(
      modelUrl,
      (gltf) => {
        clearTimeout(timeout)
        try {
          const model = gltf.scene.clone()
          
          // 计算边界框以居中模型
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          
          if (maxDim === 0) {
            console.warn('心脏模型尺寸为0')
            resolve(null)
            return
          }
          
          // 居中并缩放模型，使其适合容器（自动最大完整显示）
          model.position.sub(center)
          // 计算容器可用空间，确保模型完整显示
          const containerSize = Math.min(2.5, 2.5) // 左侧面板可用空间
          const scale = (containerSize * 0.9) / maxDim // 留10%边距
          model.scale.set(scale, scale, scale)
          
          // 确保材质和几何体正确渲染，并提高亮度
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material]
                materials.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial || 
                      mat instanceof THREE.MeshPhongMaterial ||
                      mat instanceof THREE.MeshLambertMaterial) {
                    mat.needsUpdate = true
                    // 提高材质亮度
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.emissive = new THREE.Color(0x333333) // 添加自发光，提高亮度
                      mat.emissiveIntensity = 0.3
                    }
                    // 增加材质的整体亮度
                    if (mat.color) {
                      const currentColor = mat.color.clone()
                      // 提高颜色亮度（增加RGB值）
                      mat.color.setRGB(
                        Math.min(1, currentColor.r * 1.4),
                        Math.min(1, currentColor.g * 1.4),
                        Math.min(1, currentColor.b * 1.4)
                      )
                    }
                  }
                })
              }
              child.geometry.computeVertexNormals()
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          
          resolve(model)
        } catch (error) {
          console.error('处理心脏模型时出错:', error)
          resolve(null)
        }
      },
      undefined,
      (error) => {
        clearTimeout(timeout)
        console.warn('加载心脏模型失败:', error)
        resolve(null)
      }
    )
  })
}

// 创建心脏部位标签 - 按照图片格式：白色文字，深色半透明背景，蓝色发光边框
const createHeartLabel = (partId: number, position: THREE.Vector3): CSS2DObject => {
  const part = heartParts[partId]
  if (!part) return null as any

  const div = document.createElement('div')
  div.className = 'heart-label'
  div.textContent = part.name
  // 按照图片格式：白色文字
  div.style.color = '#ffffff'
  div.style.fontSize = '14px'
  div.style.fontWeight = '600'
  div.style.padding = '6px 18px'
  div.style.minWidth = '86px'
  div.style.textAlign = 'center'
  // 深色半透明背景（更接近图一的按钮样式）
  div.style.background = 'rgba(20, 50, 72, 0.95)'
  // 蓝色发光边框
  div.style.border = '1px solid rgba(0, 229, 255, 0.8)'
  div.style.borderRadius = '8px'
  div.style.pointerEvents = 'auto'
  div.style.whiteSpace = 'nowrap'
  div.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.7)'
  div.style.cursor = 'pointer'
  // 蓝色发光效果（更接近图片）
  div.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5), inset 0 0 10px rgba(0, 229, 255, 0.15)'
  div.style.transition = 'all 0.3s ease'
  div.style.fontFamily = "'Microsoft YaHei', 'PingFang SC', sans-serif"
  div.style.backdropFilter = 'blur(5px)'
  
  // 添加悬停效果
  div.addEventListener('mouseenter', () => {
    div.style.background = 'rgba(20, 60, 90, 0.98)'
    div.style.borderColor = '#00f0ff'
    div.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.8), inset 0 0 15px rgba(0, 229, 255, 0.25)'
    div.style.transform = 'scale(1.08)'
  })
  
  div.addEventListener('mouseleave', () => {
    div.style.background = 'rgba(20, 50, 72, 0.95)'
    div.style.borderColor = 'rgba(0, 229, 255, 0.8)'
    div.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5), inset 0 0 10px rgba(0, 229, 255, 0.15)'
    div.style.transform = 'scale(1)'
  })
  
  // 点击标签显示信息
  div.addEventListener('click', (e) => {
    e.stopPropagation()
    selectedHeartPart.value = part
  })

  const label = new CSS2DObject(div)
  label.position.copy(position)
  return label
}

// 创建连接线 - 从标签指向心脏部位（按照图片格式：细的浅蓝色线条）
const createHeartLine = (start: THREE.Vector3, end: THREE.Vector3): THREE.Line => {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
  const material = new THREE.LineBasicMaterial({
    color: 0x2fe3ff,
    linewidth: 2,
    transparent: true,
    opacity: 0.85
  })
  return new THREE.Line(geometry, material)
}

// 创建心脏标注点 - 标签分布在模型周围（按照图片格式）
const createHeartMarkers = () => {
  if (!heartModel || !heartScene) return

  heartClickableMarkers = []
  heartLabels = []
  heartLines = []

  // 创建所有部位的标注
  Object.keys(heartParts).forEach((key) => {
    const id = parseInt(key)
    const part = heartParts[id]
    if (!part || !part.position) return

    // 创建可点击的标记点（在心脏部位，更小更精致）
    const geometry = new THREE.SphereGeometry(0.06, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0x64c8ff, // 浅蓝色，与连接线颜色一致
      transparent: true,
      opacity: 0.8
    })
    const marker = new THREE.Mesh(geometry, material)
    marker.position.copy(part.position)
    ;(marker as any).partId = id
    if (heartModel) {
      heartModel.add(marker)
      heartClickableMarkers.push(marker)

      // 使用预设的标签位置（按左右阵列紧贴模型）
      const labelPos = (() => {
        const offsetX = part.align === 'right' ? heartLabelOffsetX : -heartLabelOffsetX
        const offsetY = part.labelOffsetY || 0
        return new THREE.Vector3(offsetX, part.position.y + offsetY, 0)
      })()
      
      // 创建标签
      if (heartLabelRenderer) {
        const label = createHeartLabel(id, labelPos)
        if (label && heartModel) {
          heartModel.add(label)
          heartLabels.push(label)
        }
      }

      // 创建连接线：从标签位置指向心脏部位
      const line = createHeartLine(labelPos, part.position)
      if (heartModel) {
        heartModel.add(line)
        heartLines.push(line)
      }
    }
  })
}

// 处理心脏模型点击事件
const onHeartModelClick = (event: MouseEvent) => {
  if (!heartRaycaster || !heartCamera || !heartRenderer || !heartModelRef.value) return
  
  const rect = heartRenderer.domElement.getBoundingClientRect()
  heartMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  heartMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  heartRaycaster.setFromCamera(heartMouse, heartCamera)
  const intersects = heartRaycaster.intersectObjects(heartClickableMarkers)
  
  if (intersects.length > 0 && intersects[0]) {
    const clickedMarker = intersects[0].object as THREE.Mesh
    const partId = (clickedMarker as any).partId
    
    if (partId && heartParts[partId]) {
      selectedHeartPart.value = heartParts[partId]
    }
  }
}

// 关闭心脏信息面板
const closeHeartInfo = () => {
  selectedHeartPart.value = null
}

// 初始化心脏3D模型
const initHeartModel = async () => {
  if (!heartModelRef.value) return

  // 创建场景
  heartScene = new THREE.Scene()
  // 完全按照图一的3D场景背景 - 更亮的蓝色
  heartScene.background = new THREE.Color(0x1a2332)

  // 创建相机
  const width = heartModelRef.value.clientWidth
  const height = heartModelRef.value.clientHeight
  heartCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  
  // 加载心脏模型
  const loadedModel = await loadHeartModel()
  
  if (!loadedModel) {
    console.error('心脏模型加载失败')
    return
  }

  // 计算模型边界框，自动调整相机位置以完整显示
  const box = new THREE.Box3().setFromObject(loadedModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  heartLabelOffsetX = Math.max(0.55, Math.min(1.2, size.x * 0.55))
  
  if (maxDim === 0) {
    console.error('心脏模型尺寸无效')
    return
  }
  
  // 自动计算相机距离，确保模型完整显示（最大完整显示，包括标签）
  // 考虑标签在左侧，需要更宽的视野
  const fov = heartCamera.fov * (Math.PI / 180)
  const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.1 // 留10%边距，近距离显示
  heartCamera.position.set(0, 0, distance)
  heartCamera.lookAt(center)

  // 创建渲染器
  heartRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  heartRenderer.setSize(width, height)
  heartRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  heartRenderer.shadowMap.enabled = true
  heartRenderer.shadowMap.type = THREE.PCFSoftShadowMap
  // 提高渲染器亮度（使用色调映射）
  heartRenderer.toneMapping = THREE.ACESFilmicToneMapping
  heartRenderer.toneMappingExposure = 1.2 // 提高曝光度
  heartModelRef.value.appendChild(heartRenderer.domElement)

  // 创建CSS2D标签渲染器
  heartLabelRenderer = new CSS2DRenderer()
  heartLabelRenderer.setSize(width, height)
  heartLabelRenderer.domElement.style.position = 'absolute'
  heartLabelRenderer.domElement.style.top = '0'
  heartLabelRenderer.domElement.style.pointerEvents = 'none'
  heartModelRef.value.appendChild(heartLabelRenderer.domElement)

  // 创建心脏模型组
  heartModel = new THREE.Group()
  heartModel.add(loadedModel)
  
  // 创建标注点、标签和连接线
  createHeartMarkers()
  
  // 添加环境光（提高亮度）
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0) // 从0.6提高到1.0
  heartScene.add(ambientLight)

  // 添加主光源（提高亮度）
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2) // 从0.8提高到1.2
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  heartScene.add(directionalLight)

  // 添加补光（提高亮度）
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6) // 从0.3提高到0.6
  fillLight.position.set(-5, 5, -5)
  heartScene.add(fillLight)

  // 添加点光源增强细节（提高亮度）
  const pointLight = new THREE.PointLight(0xffffff, 0.8, 100) // 从0.5提高到0.8
  pointLight.position.set(0, 5, 10)
  heartScene.add(pointLight)
  
  // 添加额外的点光源从前方照亮
  const frontLight = new THREE.PointLight(0xffffff, 0.6, 100)
  frontLight.position.set(0, 0, 8)
  heartScene.add(frontLight)

  heartScene.add(heartModel)

  // 初始化射线检测器
  heartRaycaster = new THREE.Raycaster()

  // 添加点击事件监听
  heartRenderer.domElement.style.pointerEvents = 'auto'
  heartRenderer.domElement.style.cursor = 'pointer'
  heartRenderer.domElement.addEventListener('click', onHeartModelClick, { passive: false })

  // 创建轨道控制器（支持鼠标拖动）
  heartControls = new OrbitControls(heartCamera, heartRenderer.domElement)
  heartControls.enableDamping = true
  heartControls.dampingFactor = 0.05
  heartControls.enableZoom = true
  heartControls.enablePan = true // 允许平移
  heartControls.minDistance = distance * 0.6 // 限制最小距离，保持近距离
  heartControls.maxDistance = distance * 2 // 限制最大距离，保持近距离
  heartControls.target.copy(center)
  heartControls.update()

  // 动画循环
  const animate = () => {
    heartAnimationId = requestAnimationFrame(animate)

    // 更新控制器
    if (heartControls) {
      heartControls.update()
    }

    // 更新标签位置（跟随模型旋转）
    if (heartLabelRenderer && heartScene && heartCamera) {
      heartLabelRenderer.render(heartScene, heartCamera)
    }

    if (heartRenderer && heartScene && heartCamera) {
      heartRenderer.render(heartScene, heartCamera)
    }
  }
  animate()

  // 窗口大小调整
  const handleHeartResize = () => {
    if (!heartModelRef.value || !heartCamera || !heartRenderer) return
    const width = heartModelRef.value.clientWidth
    const height = heartModelRef.value.clientHeight
    if (width > 0 && height > 0) {
      heartCamera.aspect = width / height
      heartCamera.updateProjectionMatrix()
      heartRenderer.setSize(width, height)
      if (heartLabelRenderer) {
        heartLabelRenderer.setSize(width, height)
      }
      if (heartControls) {
        heartControls.update()
      }
    }
  }
  window.addEventListener('resize', handleHeartResize)
  
  // 将心脏resize函数暴露给外部调用
  ;(window as any).__handleHeartResize = handleHeartResize
}

// 初始化器官系统病例分布图表（已替换为3D模型，保留函数以防需要）
const initBedChart = () => {
  // 已替换为3D心脏模型，不再需要饼图
  return
  /*
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}例 ({d}%)',
      backgroundColor: 'rgba(10, 25, 41, 0.95)',
      borderColor: '#00e5ff',
      borderWidth: 1,
      textStyle: { color: '#e0f2fe' }
    },
    // 隐藏图例，避免占据块级区域空间
    legend: {
      show: false
    },
    series: [
      {
        name: '器官系统病例分布',
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#bbdefb',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: Math.max(9, baseFontSize.value * 0.65),
          // 浅色文字，保证暗色背景可见
          color: '#e8f1ff',
          fontWeight: 'bold',
          position: 'outside',
          distanceToLabelLine: 5
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10,
          lineStyle: {
            // 与文字颜色保持一致
            color: '#e8f1ff',
            width: 1
          }
        },
        emphasis: {
          label: {
            show: true,
            fontSize: Math.max(11, baseFontSize.value * 0.8),
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: [
          { value: 128, name: '循环系统', itemStyle: { color: '#e53935' } },
          { value: 95, name: '神经系统', itemStyle: { color: '#8e24aa' } },
          { value: 112, name: '消化系统', itemStyle: { color: '#1e88e5' } },
          { value: 88, name: '呼吸系统', itemStyle: { color: '#00acc1' } },
          { value: 76, name: '泌尿系统', itemStyle: { color: '#43a047' } },
          { value: 92, name: '内分泌系统', itemStyle: { color: '#f57c00' } }
        ]
      },
      {
        name: '总数',
        type: 'pie',
        radius: ['0%', '33%'],
        center: ['32%', '50%'],
        label: {
          show: true,
          position: 'center',
          formatter: '591\n器官病例',
          fontSize: Math.max(11, baseFontSize.value * 0.85),
          fontWeight: 'bold',
          color: '#e8f1ff',
          lineHeight: 16
        },
        data: [{ value: 591, itemStyle: { color: 'transparent' } }]
      }
    ]
  }
  if (bedChart) {
    bedChart.setOption(option)
  }
  */
}

// 初始化身体结构分析图表（器官病例分布）
const initBodyStructureChart = () => {
  if (!bodyStructureChartRef.value) return

  bodyStructureChart = echarts.init(bodyStructureChartRef.value)
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}例 ({d}%)',
      backgroundColor: 'rgba(10, 25, 41, 0.95)',
      borderColor: '#00e5ff',
      borderWidth: 1,
      textStyle: { color: '#e0f2fe' }
    },
    // 隐藏图例，避免遮挡图形内容
    legend: {
      show: false
    },
    series: [
      {
        name: '器官系统病例分布',
        type: 'pie',
        radius: ['35%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#bbdefb',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: Math.max(10, baseFontSize.value * 0.7),
          color: '#ffffff',
          fontWeight: 'bold',
          position: 'outside',
          distanceToLabelLine: 5
        },
        labelLine: {
          show: true,
          length: 20,
          length2: 15,
          lineStyle: {
            color: '#ffffff',
            width: 1
          },
          smooth: 0.2
        },
        emphasis: {
          label: {
            show: true,
            fontSize: Math.max(12, baseFontSize.value * 0.85),
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.6)'
          }
        },
        data: [
          { 
            value: 128, 
            name: '循环系统',
            itemStyle: { color: '#e53935' }
          },
          { 
            value: 95, 
            name: '神经系统',
            itemStyle: { color: '#8e24aa' }
          },
          { 
            value: 112, 
            name: '消化系统',
            itemStyle: { color: '#1e88e5' }
          },
          { 
            value: 88, 
            name: '呼吸系统',
            itemStyle: { color: '#00acc1' }
          },
          { 
            value: 76, 
            name: '泌尿系统',
            itemStyle: { color: '#43a047' }
          },
          { 
            value: 92, 
            name: '内分泌系统',
            itemStyle: { color: '#f57c00' }
          },
          { 
            value: 65, 
            name: '其他系统',
            itemStyle: { color: '#757575' }
          }
        ]
      }
    ]
  }
  bodyStructureChart.setOption(option)
}

// 初始化药品库存预警图表
const initDrugChart = () => {
  if (!drugChartRef.value) return

  drugChart = echarts.init(drugChartRef.value)
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c}%',
      backgroundColor: 'rgba(10, 25, 41, 0.95)',
      borderColor: '#00e5ff',
      borderWidth: 1,
      textStyle: { color: '#e0f2fe' }
    },
    grid: {
      left: '15%',
      right: '10%',
      top: '10%',
      bottom: '10%'
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(9, baseFontSize.value * 0.65)
      },
      splitLine: {
        lineStyle: {
          color: '#1a3a5c',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'category',
        data: ['阿司匹林', '美托洛尔', '奥美拉唑', '氨茶碱', '头孢曲松'],
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(9, baseFontSize.value * 0.65)
      },
      axisLine: {
        lineStyle: {
          color: '#1a3a5c'
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: [
          { value: 85, itemStyle: { color: '#4caf50' } },
          { value: 72, itemStyle: { color: '#ff9800' } },
          { value: 68, itemStyle: { color: '#2196f3' } },
          { value: 55, itemStyle: { color: '#4caf50' } },
          { value: 78, itemStyle: { color: '#9c27b0' } }
        ],
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#ffffff',
          fontSize: Math.max(8, baseFontSize.value * 0.6)
        },
        barWidth: '50%'
      }
    ]
  }
  drugChart.setOption(option)
}

// 初始化患者流量趋势图表
const initFlowChart = () => {
  if (!flowChartRef.value) return

  flowChart = echarts.init(flowChartRef.value)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}人',
      backgroundColor: 'rgba(10, 25, 41, 0.95)',
      borderColor: '#00e5ff',
      borderWidth: 1,
      textStyle: { color: '#00e5ff' }
    },
    legend: {
      data: ['入院治疗', '康复出院'],
      top: '5%',
      textStyle: {
        color: '#ffffff',
        fontSize: Math.max(10, baseFontSize.value * 0.7)
      }
    },
    grid: {
      left: '12%',
      right: '8%',
      top: '22%',
      bottom: '18%'
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours,
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(9, baseFontSize.value * 0.65)
      },
      axisLine: {
        lineStyle: {
          color: '#1a3a5c'
        }
      }
    },
    yAxis: {
      type: 'value',
      max: 25,
      interval: 5,
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(9, baseFontSize.value * 0.65)
      },
      splitLine: {
        lineStyle: {
          color: '#1a3a5c',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '入院治疗',
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(100, 200, 255, 0.4)' },
              { offset: 1, color: 'rgba(100, 200, 255, 0.05)' }
            ]
          }
        },
        lineStyle: {
          color: '#64c8ff',
          width: 2
        },
        itemStyle: {
          color: '#64c8ff'
        },
        data: [8, 10, 12, 14, 15, 18, 20, 22, 25, 28, 30, 32, 28, 25, 22, 20, 18, 15, 12, 10, 8, 6, 5, 4]
      },
      {
        name: '康复出院',
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#2196f3',
          width: 2
        },
        itemStyle: {
          color: '#2196f3'
        },
        data: [12, 10, 8, 6, 5, 4, 3, 4, 5, 7, 9, 11, 12, 14, 16, 18, 16, 14, 12, 10, 8, 6, 5, 4]
      }
    ]
  }
  flowChart.setOption(option)
}

// 初始化科室患者分布图表
const initDepartmentChart = () => {
  if (!departmentChartRef.value) return

  departmentChart = echarts.init(departmentChartRef.value)
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c}人',
      backgroundColor: 'rgba(10, 25, 41, 0.95)',
      borderColor: '#00e5ff',
      borderWidth: 1,
      textStyle: { color: '#e0f2fe' }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: ['心内科', '神经内科', '消化内科', '呼吸科', '泌尿外科', '肝胆外科', '内分泌科'],
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(9, baseFontSize.value * 0.65),
        rotate: 0
      },
      axisLine: {
        lineStyle: {
          color: '#1a3a5c'
        }
      }
    },
    yAxis: {
      type: 'value',
      max: 150,
      name: '病例数量(例)',
      nameTextStyle: {
        color: '#ffffff',
        fontSize: Math.max(8, baseFontSize.value * 0.6)
      },
      axisLabel: {
        color: '#ffffff',
        fontSize: Math.max(8, baseFontSize.value * 0.6)
      },
      splitLine: {
        lineStyle: {
          color: '#1a3a5c',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: [128, 95, 112, 88, 76, 65, 92],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#4fc3f7' },
              { offset: 1, color: '#00e5ff' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}例',
          color: '#ffffff',
          fontSize: Math.max(8, baseFontSize.value * 0.6),
          fontWeight: 'bold'
        },
        barWidth: '55%',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(79, 195, 247, 0.5)'
          }
        }
      }
    ]
  }
  departmentChart.setOption(option)
}

// 处理窗口大小调整
const handleResize = () => {
  // 使用 nextTick 确保 DOM 更新完成
  setTimeout(() => {
    try {
  bodyStructureChart?.resize()
  drugChart?.resize()
  flowChart?.resize()
  departmentChart?.resize()
  
  // 重新设置图表字体大小
  if (bodyStructureChart) {
    const option = bodyStructureChart.getOption() as any
        if (option && option.legend && option.legend.textStyle) {
    option.legend.textStyle.fontSize = Math.max(9, baseFontSize.value * 0.65)
    bodyStructureChart.setOption(option)
  }
      }
    } catch (error) {
      console.error('调整图表尺寸时出错:', error)
    }
  }, 50)
}

onMounted(() => {
  updateDateTime()
  setInterval(updateDateTime, 1000)

  // 初始化图表 - 延迟确保DOM已渲染
  setTimeout(async () => {
    initBedChart() // 已替换为3D模型，函数为空
    initBodyStructureChart()
    initDrugChart()
    initFlowChart()
    initDepartmentChart()
    await initHumanBody()
    await initHeartModel() // 初始化心脏3D模型
  }, 300)

  window.addEventListener('resize', handleResize)
  
  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('msfullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // 移除全屏监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('msfullscreenchange', handleFullscreenChange)
  
  // 清理全屏类
  document.body.classList.remove('fullscreen-mode')
  
  // 清理window上的3D resize函数引用
  if ((window as any).__handle3DResize) {
    delete (window as any).__handle3DResize
  }
  if ((window as any).__handleHeartResize) {
    delete (window as any).__handleHeartResize
  }
  
  // 清理控制器
  if (controls) {
    controls.dispose()
    controls = null
  }
  if (heartControls) {
    heartControls.dispose()
    heartControls = null
  }
  
  // 移除点击事件监听
  if (renderer) {
    renderer.domElement.removeEventListener('click', onModelClick)
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (heartAnimationId) {
    cancelAnimationFrame(heartAnimationId)
  }
  
  bodyStructureChart?.dispose()
  drugChart?.dispose()
  flowChart?.dispose()
  departmentChart?.dispose()
  
  if (renderer) {
    renderer.dispose()
  }
  if (heartRenderer) {
    heartRenderer.dispose()
  }
  if (heartLabelRenderer) {
    heartLabelRenderer.domElement.remove()
  }
  
  // 移除点击事件监听
  if (heartRenderer) {
    heartRenderer.domElement.removeEventListener('click', onHeartModelClick)
  }
})
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100vh;
  /* 完全按照图一的背景颜色 - 更亮的深蓝色 */
  background: #1a2332;
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(0, 188, 212, 0.08) 0%, transparent 50%),
    linear-gradient(135deg, #1a2332 0%, #1e2a3a 50%, #1a2332 100%);
  background-color: #1a2332;
  color: #ffffff;
  overflow: hidden;
  position: relative;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  display: flex;
  flex-direction: column;
}

/* 背景网格 - 按照图片中的网格效果 */
.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
  background-size: 2vw 2vh;
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
  background-color: transparent;
}

/* 顶部标题栏 */
.header {
  height: clamp(50px, 6vh, 70px);
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(16px, 2vw, 24px);
  border-bottom: 1px solid rgba(0, 229, 255, 0.3);
  /* 完全按照图一的顶部标题栏背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.92);
  backdrop-filter: blur(15px);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 229, 255, 0.15);
}

.title-section {
  text-align: center;
}

.main-title {
  font-size: clamp(18px, 2vw, 36px);
  font-weight: bold;
  margin: 0;
  background: linear-gradient(90deg, #00e5ff, #00bcd4, #00e5ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(0, 229, 255, 0.8), 0 0 60px rgba(0, 229, 255, 0.4);
  line-height: 1.2;
  filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.6));
}

.datetime {
  font-size: clamp(10px, 1vw, 16px);
  color: #00e5ff;
  margin-top: clamp(2px, 0.3vh, 4px);
  opacity: 0.9;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
}

/* 全屏按钮 */
.fullscreen-btn {
  background: rgba(0, 229, 255, 0.15);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: clamp(6px, 0.6vw, 8px);
  color: #00e5ff;
  font-size: clamp(18px, 1.8vw, 24px);
  width: clamp(36px, 3.5vw, 44px);
  height: clamp(36px, 3.5vw, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
  outline: none;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3), inset 0 0 10px rgba(0, 229, 255, 0.1);
}

.fullscreen-btn:hover {
  background: rgba(0, 229, 255, 0.25);
  border-color: rgba(0, 229, 255, 0.7);
  box-shadow: 0 0 25px rgba(0, 229, 255, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.2);
  transform: scale(1.05);
  color: #ffffff;
}

.fullscreen-btn:active {
  transform: scale(0.95);
}

/* 主要内容区域 */
.content-wrapper {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 25% 1fr 25%;
  gap: clamp(8px, 1vw, 16px);
  padding: clamp(8px, 1vh, 12px) clamp(8px, 1vw, 16px);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* 中央区域 - 包含人体模型和柱状图 */
.center-section {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1vh, 12px);
  min-width: 0;
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vh, 12px);
  min-width: 0;
  overflow: hidden;
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vh, 12px);
  min-width: 0;
  overflow: hidden;
}

/* 中央面板 - 人体模型区域 70% */
.center-panel {
  flex: 0 0 70%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.human-body-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.human-body-overlay {
  pointer-events: none;
}

/* 肌肉信息面板 - 完全按照图一的面板背景 - 更亮的蓝色 */
.muscle-info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 350px;
  max-height: 80vh;
  background: rgba(26, 35, 50, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 229, 255, 0.25);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(15px);
  z-index: 1000;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.muscle-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(0, 229, 255, 0.3);
}

.muscle-info-header h3 {
  color: #00e5ff;
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.4);
}

.close-btn {
  background: rgba(244, 67, 54, 0.3);
  border: 1px solid #f44336;
  color: #f44336;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(244, 67, 54, 0.5);
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
}

.muscle-info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.muscle-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  /* 完全按照图一的信息项背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.5);
  border-radius: 8px;
  border-left: 3px solid rgba(0, 229, 255, 0.45);
  transition: all 0.3s ease;
}

.muscle-info-item:hover {
  background: rgba(26, 35, 50, 0.7);
  border-left-color: #00e5ff;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
}

.muscle-info-item .label {
  color: #00e5ff;
  font-weight: bold;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

.muscle-info-item .value {
  color: #e0f2fe;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

/* 自定义滚动条 */
.muscle-info-panel::-webkit-scrollbar {
  width: 6px;
}

.muscle-info-panel::-webkit-scrollbar-track {
  background: rgba(187, 222, 251, 0.3);
  border-radius: 3px;
}

.muscle-info-panel::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.5);
  border-radius: 3px;
}

.muscle-info-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 195, 247, 0.7);
}

.human-body-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 229, 255, 0.1) 100%);
  pointer-events: none;
  z-index: 1;
}

/* 面板卡片 - 完全按照图一的面板背景 - 更亮的蓝色 */
.panel-card {
  background: rgba(26, 35, 50, 0.7);
  border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: clamp(6px, 0.6vw, 12px);
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(0, 229, 255, 0.12),
    inset 0 0 20px rgba(0, 229, 255, 0.05);
  padding: clamp(8px, 1vh, 12px) clamp(8px, 0.8vw, 12px);
  backdrop-filter: blur(10px);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.panel-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.35), rgba(0, 188, 212, 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.card-title {
  font-size: clamp(11px, 1vw, 16px);
  font-weight: bold;
  color: #00e5ff;
  margin-bottom: clamp(4px, 0.5vh, 8px);
  text-align: left;
  padding-bottom: clamp(4px, 0.5vh, 6px);
  border-bottom: 1px solid rgba(0, 229, 255, 0.3);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.5vw, 8px);
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.6), 0 0 20px rgba(0, 229, 255, 0.3);
  letter-spacing: 0.5px;
}

.card-icon {
  font-size: clamp(14px, 1.2vw, 18px);
  display: inline-block;
}

/* 今日关键指标卡片 - 缩小整体尺寸 */
.key-indicators-card {
  flex: 0 0 auto;
  max-height: 35%;
  min-height: 0;
}

/* 今日关键指标 */
.key-indicators {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(4px, 0.5vh, 8px);
  flex: 1;
  min-height: 0;
  padding: clamp(2px, 0.3vh, 4px);
}

.indicator-item {
  /* 完全按照图一的指标卡片背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: clamp(5px, 0.5vw, 8px);
  padding: clamp(6px, 0.7vh, 10px) clamp(8px, 0.7vw, 12px);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 0;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2), inset 0 0 10px rgba(0, 229, 255, 0.08);
  scale: 0.9;
  transform-origin: center;
}

.indicator-item:hover {
  background: rgba(26, 35, 50, 0.8);
  border-color: rgba(0, 229, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.4), inset 0 0 15px rgba(0, 229, 255, 0.15);
  transform: translateY(-2px) scale(0.92);
}

.indicator-icon-simple {
  width: clamp(24px, 2.2vw, 32px);
  height: clamp(24px, 2.2vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(14px, 1.4vw, 18px);
  margin-right: clamp(6px, 0.6vw, 10px);
  color: #ffffff;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.4));
  flex-shrink: 0;
}

.indicator-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.indicator-label {
  font-size: clamp(9px, 0.75vw, 12px);
  color: #ffffff;
  opacity: 0.9;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.indicator-value {
  font-size: clamp(14px, 1.4vw, 20px);
  font-weight: bold;
  color: #00e5ff;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.4);
  line-height: 1.2;
  white-space: nowrap;
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
}

/* 床位使用情况特殊布局 */
.bed-usage-card {
  position: relative;
}

.bed-chart-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
}

/* 心脏3D模型容器 */
.heart-model-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.heart-model-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* 心脏部位信息面板 - 完全按照图一的面板背景 - 更亮的蓝色 */
.heart-info-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 280px;
  max-height: 70vh;
  background: rgba(26, 35, 50, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 229, 255, 0.25);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(15px);
  z-index: 1000;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

.heart-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0, 229, 255, 0.3);
}

.heart-info-header h3 {
  color: #00e5ff;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.4);
}

.heart-info-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.heart-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  /* 完全按照图一的信息项背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.5);
  border-radius: 6px;
  border-left: 3px solid rgba(0, 229, 255, 0.45);
}

.heart-info-item .label {
  color: #00e5ff;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

.heart-info-item .value {
  color: #e0f2fe;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.branches-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.branch-tag {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(0, 229, 255, 0.15);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 4px;
  color: #00e5ff;
  font-size: 11px;
  font-weight: 500;
  text-shadow: 0 0 5px rgba(0, 229, 255, 0.5);
}

/* CSS2D标签样式 - 蓝色发光矩形 */
:global(.heart-label) {
  user-select: none;
  pointer-events: auto;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  backdrop-filter: blur(5px);
}

:global(.heart-label:hover) {
  z-index: 1000;
}

/* 设备状态表格 */
.equipment-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-size: clamp(9px, 0.75vw, 13px);
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 0.8fr;
  gap: clamp(4px, 0.5vw, 8px);
  padding: clamp(6px, 0.8vh, 10px) clamp(4px, 0.5vw, 8px);
  flex-shrink: 0;
  align-items: center;
}

.table-header {
  /* 完全按照图一的表格表头背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.65);
  border-bottom: 2px solid rgba(0, 229, 255, 0.35);
  font-weight: bold;
  color: #00e5ff;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
  font-size: clamp(10px, 0.85vw, 14px);
}

.table-row {
  border-bottom: 1px solid rgba(0, 229, 255, 0.15);
  color: #e0f2fe;
  transition: background 0.3s ease;
  font-size: clamp(9px, 0.8vw, 13px);
}

.table-row:hover {
  /* 完全按照图一的表格行悬停背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.5);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
}

.table-cell {
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-content: flex-start;
}

.table-cell:last-child {
  justify-content: flex-end;
}

.status-badge {
  padding: clamp(2px, 0.2vh, 4px) clamp(6px, 0.6vw, 10px);
  border-radius: clamp(4px, 0.4vw, 6px);
  font-size: clamp(9px, 0.75vw, 12px);
  white-space: nowrap;
  font-weight: 500;
  display: inline-block;
}

.status-badge.normal {
  background: rgba(76, 175, 80, 0.4);
  color: #4caf50;
  border: 1px solid #4caf50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
}

.status-badge.in-use {
  background: rgba(255, 152, 0, 0.4);
  color: #ff9800;
  border: 1px solid #ff9800;
  box-shadow: 0 0 5px rgba(255, 152, 0, 0.3);
}

.status-badge.maintenance {
  background: rgba(244, 67, 54, 0.4);
  color: #f44336;
  border: 1px solid #f44336;
  box-shadow: 0 0 5px rgba(244, 67, 54, 0.3);
}

/* 通知列表 */
.notifications-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.5vh, 8px);
  padding-right: clamp(4px, 0.5vw, 8px);
}

/* 自定义滚动条样式 */
.notifications-list::-webkit-scrollbar {
  width: clamp(4px, 0.4vw, 6px);
}

.notifications-list::-webkit-scrollbar-track {
  background: rgba(187, 222, 251, 0.3);
  border-radius: clamp(2px, 0.2vw, 4px);
}

.notifications-list::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.5);
  border-radius: clamp(2px, 0.2vw, 4px);
  transition: background 0.3s ease;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 195, 247, 0.7);
}

.notification-item {
  /* 完全按照图一的通知项背景 - 更亮的蓝色 */
  background: rgba(26, 35, 50, 0.6);
  border-left: 3px solid;
  border-radius: clamp(4px, 0.4vw, 8px);
  padding: clamp(6px, 0.7vh, 10px) clamp(6px, 0.7vw, 10px);
  font-size: clamp(9px, 0.75vw, 13px);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
  transition: all 0.3s ease;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: fit-content;
}

.notification-item:hover {
  background: rgba(26, 35, 50, 0.8);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
  transform: translateX(5px);
}

.notification-item.urgent {
  border-left-color: #f44336;
}

.notification-item.reminder {
  border-left-color: #ff9800;
}

.notification-item.normal {
  border-left-color: #4caf50;
}

.notification-time {
  color: #00e5ff;
  font-weight: bold;
  margin-bottom: clamp(1px, 0.2vh, 2px);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
  font-size: clamp(10px, 0.8vw, 14px);
  line-height: 1.2;
}

.notification-content {
  color: #e0f2fe;
  margin-bottom: clamp(2px, 0.3vh, 4px);
  line-height: 1.5;
  word-break: break-word;
  word-wrap: break-word;
  font-size: clamp(9px, 0.75vw, 13px);
  overflow: visible;
  white-space: normal;
  display: block;
  flex: 1;
}

.notification-label {
  display: inline-block;
  padding: clamp(1px, 0.15vh, 3px) clamp(3px, 0.4vw, 6px);
  border-radius: clamp(3px, 0.25vw, 5px);
  font-size: clamp(8px, 0.65vw, 11px);
  font-weight: bold;
  margin-top: clamp(2px, 0.2vh, 3px);
  align-self: flex-start;
}

.notification-item.urgent .notification-label {
  background: rgba(244, 67, 54, 0.3);
  color: #f44336;
}

.notification-item.reminder .notification-label {
  background: rgba(255, 152, 0, 0.3);
  color: #ff9800;
}

.notification-item.normal .notification-label {
  background: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

/* 底部面板 - 柱状图区域 30% */
.bottom-panel {
  flex: 0 0 30%;
  min-height: 0;
  max-height: 30%;
  position: relative;
  z-index: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bottom-panel .panel-card {
  height: 100%;
  min-height: 0;
  padding: clamp(8px, 1vh, 12px) clamp(8px, 0.8vw, 12px);
  display: flex;
  flex-direction: column;
}

/* 移除滚动条样式，因为不再需要滚动 */

/* 全屏模式样式 - 完全隐藏侧边栏，可视化数据占满整个屏幕 */
:global(body.fullscreen-mode),
:global(body.fullscreen-mode) html {
  overflow: hidden !important;
  /* 完全按照图一的背景 - 更亮的蓝色 */
  background: #1a2332 !important;
  background-color: #1a2332 !important;
}

:global(body.fullscreen-mode) #app {
  /* 完全按照图一的背景 - 更亮的蓝色 */
  background: #1a2332 !important;
  background-color: #1a2332 !important;
  min-height: 100vh !important;
}

:global(body.fullscreen-mode) html {
  /* 完全按照图一的背景 - 更亮的蓝色 */
  background: #1a2332 !important;
  background-color: #1a2332 !important;
}


:global(body.fullscreen-mode) .app-shell {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  grid-template-columns: 0 1fr !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  z-index: 99999 !important;
  /* 完全按照图一的背景 - 更亮的蓝色 */
  background: #1a2332 !important;
  background-color: #1a2332 !important;
}

:global(body.fullscreen-mode) .sidebar {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  overflow: hidden !important;
  visibility: hidden !important;
  opacity: 0 !important;
  position: absolute !important;
  left: -9999px !important;
  z-index: -1 !important;
  pointer-events: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

:global(body.fullscreen-mode) .main {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  z-index: 1 !important;
  background: transparent !important;
}

/* 全屏模式下的 dashboard-container 占据全屏 */
:global(body.fullscreen-mode) .dashboard-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
  display: flex !important;
  flex-direction: column !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 1 !important;
}

/* 确保全屏模式下内容区域可见并占满全屏，保持正确的grid布局 */
:global(body.fullscreen-mode) .content-wrapper {
  visibility: visible !important;
  opacity: 1 !important;
  display: grid !important;
  grid-template-columns: 25% 1fr 25% !important;
  width: 100% !important;
  height: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: clamp(8px, 1vh, 12px) clamp(8px, 1vw, 16px) !important;
  gap: clamp(8px, 1vw, 16px) !important;
}

:global(body.fullscreen-mode) .header {
  visibility: visible !important;
  opacity: 1 !important;
  display: flex !important;
  width: 100% !important;
  flex-shrink: 0 !important;
}

:global(body.fullscreen-mode) .left-panel,
:global(body.fullscreen-mode) .right-panel,
:global(body.fullscreen-mode) .center-section {
  visibility: visible !important;
  opacity: 1 !important;
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* 确保全屏模式下所有面板正常显示 */
:global(body.fullscreen-mode) .panel-card,
:global(body.fullscreen-mode) .stat-card {
  visibility: visible !important;
  opacity: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

:global(body.fullscreen-mode) .chart-container {
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
}

:global(body.fullscreen-mode) .notifications-list {
  visibility: visible !important;
  opacity: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 确保全屏模式下背景网格可见 */
:global(body.fullscreen-mode) .grid-background {
  visibility: visible !important;
  opacity: 0.6 !important;
  z-index: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

/* 确保全屏模式下3D模型容器可以接收点击事件 */
:global(body.fullscreen-mode) .human-body-container {
  pointer-events: auto !important;
  z-index: 10 !important;
  position: relative !important;
}

/* 确保全屏模式下canvas元素可以接收点击事件 */
:global(body.fullscreen-mode) .human-body-container canvas {
  pointer-events: auto !important;
  z-index: 10 !important;
  position: relative !important;
}

/* 确保全屏模式下overlay不阻止点击 */
:global(body.fullscreen-mode) .human-body-overlay {
  pointer-events: none !important;
  z-index: 1 !important;
}

/* 超小屏幕适配 */
@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: clamp(180px, 16%, 240px) 1fr clamp(180px, 16%, 240px);
    gap: clamp(6px, 0.8vw, 12px);
    padding: clamp(6px, 0.8vh, 10px) clamp(6px, 0.8vw, 12px);
  }
  
  .header {
    height: clamp(45px, 5vh, 60px);
  }
  
  .bottom-panel {
    height: clamp(50px, 5vh, 70px);
  }
}

/* 极小屏幕适配 */
@media (max-width: 768px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    gap: clamp(4px, 0.6vh, 8px);
  }
  
  .left-panel,
  .right-panel {
    flex-direction: row;
    overflow-x: hidden;
  }
  
  .panel-card {
    min-width: clamp(180px, 35vw, 260px);
  }
}
</style>
