<template>
  <view class="page">
    <!-- 日期选择栏 -->
    <view class="date-filter-bar">
      <scroll-view class="date-scroll" scroll-x>
        <view class="date-list">
          <view
            v-for="(date, index) in dateList"
            :key="index"
            class="date-item"
            :class="{ active: selectedDateIndex === index, full: date.isFull }"
            @click="selectDate(index)"
          >
            <text class="date-text">{{ date.label }}</text>
            <text v-if="date.status" class="date-status" :class="date.statusType">{{ date.status }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 医生列表 -->
    <scroll-view class="doctor-list" scroll-y>
      <view
        v-for="(doctor, index) in doctorList"
        :key="index"
        class="doctor-card"
        @click="goDoctorDetail(doctor)"
      >
        <view class="doctor-left">
          <image
            class="doctor-avatar"
            :src="doctor.avatar"
            mode="aspectFill"
          />
        </view>

        <view class="doctor-right">
          <view class="doctor-header-row">
            <view class="doctor-title-box">
              <text class="doctor-name">{{ doctor.name }}</text>
              <text class="doctor-level">{{ doctor.level }}</text>
            </view>
            <button
              class="btn-reserve"
              size="mini"
              @click.stop="onReserve(doctor)"
            >
              预约
            </button>
          </view>

          <view class="doctor-hospital-row">
            <text class="hospital">{{ doctor.hospital }}</text>
            <text class="dept">{{ doctor.dept }}</text>
          </view>

          <view class="doctor-goodat-row">
            <text class="goodat-label">擅长：</text>
            <text class="goodat-text">{{ doctor.goodAt }}</text>
          </view>

          <view class="doctor-tags-row">
            <view class="tag tag-reserve" @click.stop="onReserve(doctor)">
              <text class="tag-dot">●</text>
              <text>预约挂号(多点)</text>
            </view>
            <view class="tag tag-online" @click.stop="onConsult(doctor)">
              <text class="tag-dot">●</text>
              <text>在线咨询</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

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
      deptName: '',
      hospitalName: '',
      selectedDateIndex: 0,
      dateList: [],
      doctorList: [
        {
          name: '王医生',
          level: '主任医师',
          hospital: '北京大学第一医院',
          dept: '心血管内科',
          goodAt: '心血管疾病,心脏病,冠心病,心胸血...',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        },
        {
          name: '李医生',
          level: '副主任医师',
          hospital: '北京大学第一医院',
          dept: '心血管内科',
          goodAt: '高血压、冠心病、心律失常的诊断和治疗',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        },
        {
          name: '张医生',
          level: '主治医师',
          hospital: '北京大学第一医院',
          dept: '心血管内科',
          goodAt: '心力衰竭、心肌病的综合治疗',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        },
        {
          name: '刘医生',
          level: '主任医师',
          hospital: '北京大学第一医院',
          dept: '心血管内科',
          goodAt: '冠心病介入治疗、心脏起搏器植入',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        },
        {
          name: '陈医生',
          level: '副主任医师',
          hospital: '北京大学第一医院',
          dept: '心血管内科',
          goodAt: '心血管疾病的预防和康复治疗',
          avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
        }
      ]
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
    
    // 设置导航栏标题
    if (this.deptName) {
      uni.setNavigationBarTitle({
        title: this.deptName
      });
    }
    
    // 根据科室筛选医生（这里简化处理，实际应该从接口获取）
    if (this.deptName) {
      this.doctorList = this.doctorList.map(doctor => ({
        ...doctor,
        dept: this.deptName,
        hospital: this.hospitalName || doctor.hospital
      }));
    }
    
    // 生成基于当前日期的日期列表
    this.generateDateList();
  },
  methods: {
    // 生成基于当前日期的日期列表
    generateDateList() {
      const today = new Date();
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      
      // 初始化日期列表，第一个是"不限日期"
      this.dateList = [
        { label: '不限日期', status: '', statusType: '', isFull: false }
      ];
      
      // 生成未来7天的日期
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const weekDay = weekDays[date.getDay()];
        const label = `${month}.${day}`;
        
        let status = '';
        let statusType = '';
        let isFull = false;
        
        if (i === 0) {
          // 今天
          status = '今日有号';
          statusType = 'available';
          isFull = false;
        } else {
          // 未来日期，随机生成状态（模拟数据，实际应该从接口获取）
          const random = Math.random();
          if (random > 0.5) {
            // 50%的概率有号
            status = `${weekDay}有号`;
            statusType = 'available';
            isFull = false;
          } else {
            // 50%的概率约满
            status = `${weekDay}约满`;
            statusType = 'full';
            isFull = true;
          }
        }
        
        this.dateList.push({
          label: label,
          status: status,
          statusType: statusType,
          isFull: isFull
        });
      }
    },
    selectDate(index) {
      this.selectedDateIndex = index;
      // 如果点击"不限日期"（index === 0），跳转到科室月排班页面
      if (index === 0) {
        uni.navigateTo({
          url: `/pages/doctor/schedule?dept=${encodeURIComponent(this.deptName)}&hospital=${encodeURIComponent(this.hospitalName)}`
        });
      } else if (this.dateList[index].statusType === 'available') {
        // 如果点击的是有号的日期，跳转到排班表页面并传递日期
        uni.navigateTo({
          url: `/pages/doctor/schedule?dept=${encodeURIComponent(this.deptName)}&hospital=${encodeURIComponent(this.hospitalName)}&date=${encodeURIComponent(this.dateList[index].label)}`
        });
      }
    },
    goDoctorDetail(doctor) {
      // 跳转到医生详情页
      const query = encodeURIComponent(JSON.stringify(doctor));
      uni.navigateTo({
        url: '/pages/doctor/detail?doctor=' + query
      });
    },
    onReserve(doctor) {
      // 跳转到预约页面
      const doctorQuery = encodeURIComponent(JSON.stringify(doctor));
      uni.navigateTo({
        url: `/pages/doctor/appointment?doctor=${doctorQuery}`
      });
    },
    onConsult(doctor) {
      // 跳转到在线咨询页面
      uni.navigateTo({
        url: '/pages/online-consult/chat?doctor=' + encodeURIComponent(doctor.name)
      });
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

.date-filter-bar {
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.date-scroll {
  white-space: nowrap;
  width: 100%;
}

.date-list {
  flex-direction: row;
  display: flex;
  padding: 20rpx 24rpx;
  align-items: flex-end;
}

.date-item {
  padding: 16rpx 20rpx;
  margin-right: 20rpx;
  flex-direction: column;
  display: flex;
  align-items: center;
  position: relative;
  min-width: 100rpx;
}

.date-item.active {
  border-bottom: 4rpx solid #2979ff;
  padding-bottom: 12rpx;
}

.date-item.active .date-text {
  color: #2979ff;
  font-weight: 600;
}

.date-text {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 8rpx;
  white-space: nowrap;
}

.date-item.active .date-text {
  color: #2979ff;
}

.date-item:not(.active) .date-text {
  color: #333333;
}

.date-item.full .date-text {
  color: #999999;
}

.date-status {
  font-size: 22rpx;
  padding: 0;
  border-radius: 0;
  background-color: transparent;
  white-space: nowrap;
}

.date-status.available {
  color: #ff9800;
}

.date-status.full {
  color: #999999;
}

.doctor-list {
  flex: 1;
  padding: 16rpx 24rpx 40rpx;
}

.doctor-card {
  flex-direction: row;
  display: flex;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.04);
}

.doctor-left {
  width: 140rpx;
  margin-right: 20rpx;
}

.doctor-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
}

.doctor-right {
  flex: 1;
}

.doctor-header-row {
  flex-direction: row;
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.doctor-title-box {
  flex: 1;
  flex-direction: row;
  display: flex;
  align-items: baseline;
}

.doctor-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.doctor-level {
  font-size: 24rpx;
  color: #666666;
  margin-left: 12rpx;
}

.btn-reserve {
  padding: 0 24rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 24rpx;
  color: #2979ff;
  background-color: #e6f0ff;
  border-radius: 30rpx;
}

.btn-reserve::after {
  border: none;
}

.doctor-hospital-row {
  flex-direction: row;
  display: flex;
  flex-wrap: wrap;
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 8rpx;
}

.hospital {
  margin-right: 10rpx;
}

.dept {
  color: #999999;
}

.doctor-goodat-row {
  flex-direction: row;
  display: flex;
  font-size: 22rpx;
  color: #999999;
  margin-bottom: 12rpx;
}

.goodat-label {
  color: #c0c4cc;
}

.goodat-text {
  flex: 1;
}

.doctor-tags-row {
  flex-direction: row;
  display: flex;
}

.tag {
  flex-direction: row;
  display: flex;
  align-items: center;
  padding: 8rpx 18rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  margin-right: 12rpx;
}

.tag-reserve {
  background-color: #e6f0ff;
  color: #2979ff;
}

.tag-online {
  background-color: #e8f8f2;
  color: #1abc9c;
}

.tag-dot {
  font-size: 22rpx;
  margin-right: 6rpx;
}

.float-btn {
  position: fixed;
  right: 40rpx;
  bottom: 160rpx;
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

