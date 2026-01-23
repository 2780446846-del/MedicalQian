<template>
  <view class="page">
    <scroll-view class="content" scroll-y>
      <!-- 动态生成所有月份的排班 -->
      <view 
        v-for="(monthData, index) in monthList" 
        :key="index"
        class="month-section"
      >
        <text class="month-title">{{ monthData.year }}年{{ monthData.month }}月</text>
        <view class="calendar">
          <!-- 星期标题 -->
          <view class="week-header">
            <text class="week-day" v-for="day in weekDays" :key="day">{{ day }}</text>
          </view>
          <!-- 日期网格 -->
          <view class="date-grid">
            <view
              v-for="(date, dateIndex) in monthData.dates"
              :key="dateIndex"
              class="date-cell"
              :class="getDateClass(date)"
              @click="selectDate(date, monthData.year, monthData.month)"
            >
              <text v-if="date.day" class="date-number">{{ date.day }}</text>
              <text v-if="date.status" class="date-status" :class="date.statusType">{{ date.status }}</text>
              <text v-if="date.tip" class="date-tip">{{ date.tip }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部收起按钮 -->
    <view class="bottom-actions">
      <button class="collapse-btn" @click="collapseSchedule">
        <text class="collapse-icon">▲</text>
        <text class="collapse-text">收起排班</text>
      </button>
    </view>

    <!-- 右下角悬浮按钮 -->
    <view class="float-btn" @click="onFloatClick">
      <text class="float-icon">☀️</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      weekDays: ['日', '一', '二', '三', '四', '五', '六'],
      deptName: '',
      hospitalName: '',
      selectedDate: null,
      monthList: [] // 存储所有月份的数据
    };
  },
  onLoad(options) {
    // 接收传递的科室和医院信息
    if (options.dept) {
      this.deptName = decodeURIComponent(options.dept);
    }
    if (options.hospital) {
      this.hospitalName = decodeURIComponent(options.hospital);
    }
    if (options.date) {
      this.selectedDate = decodeURIComponent(options.date);
    }
    
    // 生成全年（未来12个月）的日历数据
    this.generateYearCalendar();
  },
  methods: {
    // 生成全年日历数据
    generateYearCalendar() {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();
      
      this.monthList = [];
      
      // 生成未来12个月的数据
      for (let i = 0; i < 12; i++) {
        const targetMonth = currentMonth + i;
        let year = currentYear;
        let month = targetMonth;
        
        // 处理跨年
        if (month > 12) {
          month = month - 12;
          year = year + 1;
        }
        
        const monthData = this.generateMonthCalendar(year, month, currentYear, currentMonth, currentDay);
        this.monthList.push({
          year,
          month,
          dates: monthData
        });
      }
    },
    
    // 生成单个月的日历数据
    generateMonthCalendar(year, month, currentYear, currentMonth, currentDay) {
      // 获取该月第一天是星期几（0=周日，1=周一...）
      const firstDay = new Date(year, month - 1, 1).getDay();
      // 获取该月有多少天
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const dates = [];
      
      // 添加月初的空格
      for (let i = 0; i < firstDay; i++) {
        dates.push({ day: null });
      }
      
      // 添加日期
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = { day };
        const date = new Date(year, month - 1, day);
        const isToday = year === currentYear && month === currentMonth && day === currentDay;
        const isPast = date < new Date(currentYear, currentMonth - 1, currentDay);
        
        // 判断是否是今天
        if (isToday) {
          dateObj.status = '今日 有号';
          dateObj.statusType = 'today';
        } else if (isPast) {
          // 过去的日期显示为约满
          dateObj.status = '约满';
          dateObj.statusType = 'full';
        } else {
          // 未来日期的状态随机生成（模拟数据）
          // 可以根据实际需求从接口获取
          const random = Math.random();
          if (random > 0.7) {
            // 30%的概率显示有号
            dateObj.status = '有号';
            dateObj.statusType = 'available';
          } else if (random > 0.4) {
            // 30%的概率显示约满
            dateObj.status = '约满';
            dateObj.statusType = 'full';
          } else {
            // 40%的概率不显示状态（未开放）
          }
        }
        
        dates.push(dateObj);
      }
      
      return dates;
    },
    
    getDateClass(date) {
      const classes = [];
      if (date.statusType === 'today') {
        classes.push('date-today');
      } else if (date.statusType === 'available') {
        classes.push('date-available');
      } else if (date.statusType === 'full') {
        classes.push('date-full');
      }
      return classes.join(' ');
    },
    
    selectDate(date, year, month) {
      if (!date.day) return;
      
      // 如果日期有号，跳转到预约页面
      if (date.statusType === 'available' || date.statusType === 'today') {
        // 构建日期字符串
        const monthStr = month < 10 ? '0' + month : month;
        const dayStr = date.day < 10 ? '0' + date.day : date.day;
        const dateStr = `${year}年${monthStr}月${dayStr}日`;
        const weekDay = this.getWeekDay(date.day, year, month);
        
        // 准备预约信息
        const appointmentInfo = {
          hospital: this.hospitalName || '北京大学第一医院',
          dept: this.deptName || '心血管内科',
          date: dateStr,
          time: weekDay,
          type: '专家门诊',
          fee: 318
        };
        
        // 使用默认医生信息
        const doctor = {
          name: '王医生',
          level: '主任医师',
          hospital: this.hospitalName || '北京大学第一医院',
          dept: this.deptName || '心血管内科',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        };
        
        // 跳转到预约页面
        const doctorQuery = encodeURIComponent(JSON.stringify(doctor));
        const hospital = encodeURIComponent(appointmentInfo.hospital);
        const dept = encodeURIComponent(appointmentInfo.dept);
        const dateParam = encodeURIComponent(appointmentInfo.date);
        const time = encodeURIComponent(appointmentInfo.time);
        const type = encodeURIComponent(appointmentInfo.type);
        const fee = encodeURIComponent(appointmentInfo.fee);
        
        uni.navigateTo({
          url: `/pages/doctor/appointment?doctor=${doctorQuery}&hospital=${hospital}&dept=${dept}&date=${dateParam}&time=${time}&type=${type}&fee=${fee}`
        });
      } else if (date.statusType === 'full') {
        uni.showToast({
          title: '该日期已约满',
          icon: 'none'
        });
      }
    },
    
    getWeekDay(day, year, month) {
      // 根据日期返回星期
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const date = new Date(year, month - 1, day);
      const weekDayIndex = date.getDay();
      return weekDays[weekDayIndex];
    },
    
    collapseSchedule() {
      // 收起排班，返回上一页
      uni.navigateBack();
    },
    
    onFloatClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6fa;
}

.content {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.month-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.month-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}

.calendar {
  width: 100%;
}

.week-header {
  flex-direction: row;
  display: flex;
  margin-bottom: 16rpx;
}

.week-day {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #666666;
  font-weight: 500;
}

.date-grid {
  flex-direction: row;
  display: flex;
  flex-wrap: wrap;
}

.date-cell {
  width: calc(100% / 7);
  min-height: 100rpx;
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 4rpx;
  position: relative;
}

.date-number {
  font-size: 26rpx;
  color: #333333;
  margin-bottom: 4rpx;
}

.date-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  white-space: nowrap;
}

.date-today {
  background-color: #fff3e0;
}

.date-today .date-number {
  color: #ff9800;
  font-weight: 600;
}

.date-today .date-status {
  color: #ff9800;
  background-color: transparent;
  padding: 2rpx 0;
}

.date-available {
  background-color: #e6f0ff;
}

.date-available .date-number {
  color: #2979ff;
}

.date-available .date-status {
  color: #2979ff;
  background-color: transparent;
  padding: 2rpx 0;
}

.date-full {
  background-color: #f5f5f5;
}

.date-full .date-number {
  color: #999999;
}

.date-full .date-status {
  color: #999999;
  background-color: transparent;
  padding: 2rpx 0;
}

.date-tip {
  font-size: 18rpx;
  color: #999999;
  margin-top: 4rpx;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  flex-direction: row;
  display: flex;
  justify-content: flex-end;
}

.collapse-btn {
  padding: 16rpx 32rpx;
  background-color: #2979ff;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  flex-direction: row;
  display: flex;
  align-items: center;
  height: auto;
  line-height: normal;
}

.collapse-btn::after {
  border: none;
}

.collapse-icon {
  font-size: 20rpx;
  margin-right: 8rpx;
}

.collapse-text {
  font-size: 26rpx;
}

.float-btn {
  position: fixed;
  right: 40rpx;
  bottom: 140rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background-color: #ffb84d;
  align-items: center;
  justify-content: center;
  display: flex;
  box-shadow: 0 8rpx 20rpx rgba(255, 170, 51, 0.5);
}

.float-icon {
  font-size: 40rpx;
}
</style>
