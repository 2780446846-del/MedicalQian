<template>
  <view class="messages-page">
    <!-- 消息列表 -->
    <scroll-view class="messages-list" scroll-y>
      <view
        v-for="(message, index) in messageList"
        :key="message.id || index"
        class="message-card"
        @click="viewMessage(message)"
      >
        <view class="message-icon">
          <view class="icon-bg">
            <view class="icon-inner">
              <view class="icon-line"></view>
              <view class="icon-line"></view>
              <view class="icon-line"></view>
              <view class="icon-corner"></view>
            </view>
          </view>
        </view>
        <view class="message-content">
          <view class="message-header">
            <text class="message-title">{{ message.title }}</text>
            <text class="message-date">{{ message.date }}</text>
          </view>
          <text class="message-text">{{ message.content }}</text>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="messageList.length === 0" class="empty-state">
        <text class="empty-text">暂无消息</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      messageList: [
        {
          id: 1,
          title: '预约挂号取消通知',
          date: '2020-05-01',
          content: '您已取消2019-05-05的骨科普通号预约挂号，如有疑问请联系客服。',
          type: 'appointment_cancel',
          read: false
        },
        {
          id: 2,
          title: '预约挂号取消通知',
          date: '2020-05-01',
          content: '您已取消2019-05-05的骨科普通号预约挂号，如有疑问请联系客服。',
          type: 'appointment_cancel',
          read: false
        },
        {
          id: 3,
          title: '预约挂号取消通知',
          date: '2020-05-01',
          content: '您已取消2019-05-05的骨科普通号预约挂号，如有疑问请联系客服。',
          type: 'appointment_cancel',
          read: false
        },
        {
          id: 4,
          title: '预约成功通知',
          date: '2020-04-28',
          content: '您已成功预约2020-05-10的心血管内科专家号，请按时就诊。',
          type: 'appointment_success',
          read: true
        },
        {
          id: 5,
          title: '就诊提醒',
          date: '2020-04-25',
          content: '您预约的2020-05-05骨科普通号即将到期，请提前做好准备。',
          type: 'appointment_reminder',
          read: true
        },
        {
          id: 6,
          title: '系统通知',
          date: '2020-04-20',
          content: '系统将于2020-04-25 22:00-24:00进行维护，期间可能无法使用部分功能。',
          type: 'system',
          read: true
        }
      ]
    }
  },
  onLoad() {
    this.loadMessages();
  },
  methods: {
    async loadMessages() {
      // 从后端获取预约数据生成通知消息
      try {
        const { get } = require('@/utils/api.js');
        const res = await get('/appointment');
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const msgs = res.data.map((a, i) => {
            const status = a.status || 'pendingPayment';
            const titleMap = {
              pendingPayment: '待支付提醒',
              pendingVisit: '预约成功通知',
              pendingRate: '就诊完成，请评价',
              rated: '评价成功',
              cancelled: '预约取消通知',
              history: '历史预约'
            };
            const contentMap = {
              pendingPayment: `您预约的${a.doctorName || ''}医生（${a.date} ${a.time}）尚未支付，请尽快完成支付。`,
              pendingVisit: `您已成功预约${a.doctorName || ''}医生，就诊时间：${a.date} ${a.time}，请按时前往${a.hospital || '医院'}就诊。`,
              pendingRate: `您于${a.date}在${a.hospital || ''}就诊已完成，请对${a.doctorName || ''}医生进行评价。`,
              rated: `感谢您对${a.doctorName || ''}医生的评价。`,
              cancelled: `您预约的${a.doctorName || ''}医生（${a.date} ${a.time}）已取消。`,
              history: `您于${a.date}在${a.hospital || ''}的就诊记录已归档。`
            };
            return {
              id: a._id || i + 1,
              title: titleMap[status] || '系统通知',
              date: (a.createdAt || '').substring(0, 10) || a.date || '',
              content: contentMap[status] || `预约${a.doctorName || ''}医生`,
              type: status.includes('cancel') ? 'appointment_cancel' : 'appointment_success',
              read: status !== 'pendingPayment'
            };
          });
          if (msgs.length > 0) {
            this.messageList = msgs;
            return;
          }
        }
      } catch (e) {
        console.warn('从后端加载消息失败:', e);
      }
      // 保留默认消息作为fallback（已在data中）
    },
    viewMessage(message) {
      // 标记为已读
      if (!message.read) {
        message.read = true;
        // 可以调用API更新已读状态
      }
      
      // 根据消息类型跳转到不同页面
      switch (message.type) {
        case 'appointment_cancel':
        case 'appointment_success':
        case 'appointment_reminder':
          uni.navigateTo({
            url: '/pages/mine/appointments'
          });
          break;
        default:
          // 显示消息详情
          uni.showToast({
            title: message.title,
            icon: 'none',
            duration: 2000
          });
          break;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.messages-page {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

/* 消息列表 */
.messages-list {
  flex: 1;
  padding: 20rpx 16rpx;
  background-color: #ffffff;
  box-sizing: border-box;
}

/* 消息卡片 */
.message-card {
  display: flex;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  padding: 24rpx 20rpx;
  margin-bottom: 16rpx;
  
  .message-icon {
    margin-right: 20rpx;
    flex-shrink: 0;
    
    .icon-bg {
      width: 80rpx;
      height: 80rpx;
      background-color: #4A90E2;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      
      .icon-inner {
        width: 50rpx;
        height: 60rpx;
        position: relative;
        
        .icon-line {
          width: 100%;
          height: 3rpx;
          background-color: #ffffff;
          margin-bottom: 6rpx;
          border-radius: 2rpx;
          
          &:nth-child(1) {
            width: 80%;
          }
          &:nth-child(2) {
            width: 90%;
          }
          &:nth-child(3) {
            width: 70%;
          }
        }
        
        .icon-corner {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16rpx;
          height: 16rpx;
          border: 3rpx solid #ffffff;
          border-top: none;
          border-left: none;
          border-radius: 0 0 4rpx 0;
        }
      }
    }
  }
  
  .message-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    
    .message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10rpx;
      
      .message-title {
        font-size: 32rpx;
        font-weight: 600;
        color: #000000;
        flex: 1;
      }
      
      .message-date {
        font-size: 24rpx;
        color: #999999;
        margin-left: 16rpx;
        flex-shrink: 0;
        white-space: nowrap;
      }
    }
    
    .message-text {
      font-size: 28rpx;
      color: #000000;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      word-break: break-all;
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: #999999;
  }
}
</style>

