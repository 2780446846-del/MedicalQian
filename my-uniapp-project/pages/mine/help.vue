<template>
  <view class="help-page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack"><uni-icons type="left" size="20" color="#333"></uni-icons></view>
      <text class="nav-title">帮助中心</text>
      <view class="nav-right"></view>
    </view>

    <view class="contact-bar">
      <view class="contact-item" @click="callService">
        <text class="contact-icon">📞</text>
        <text class="contact-text">客服电话</text>
      </view>
      <view class="contact-item" @click="feedBack">
        <text class="contact-icon">💬</text>
        <text class="contact-text">意见反馈</text>
      </view>
    </view>

    <view class="section-title">常见问题</view>
    <scroll-view class="faq-list" scroll-y>
      <view v-for="(faq, idx) in faqs" :key="idx" class="faq-item" @click="toggleFaq(idx)">
        <view class="faq-q">
          <text class="faq-q-text">{{ faq.q }}</text>
          <text class="faq-arrow" :class="{ open: faq.open }">▾</text>
        </view>
        <view v-if="faq.open" class="faq-a">
          <text class="faq-a-text">{{ faq.a }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      faqs: [
        { q: '如何预约挂号？', a: '在首页点击"预约挂号"，选择医院、科室和医生，选择就诊时间后提交预约并完成支付即可。', open: false },
        { q: '预约成功后如何支付？', a: '预约成功后会自动跳转到支付宝支付页面，完成支付后预约即生效。也可在"我的预约-待支付"中重新发起支付。', open: false },
        { q: '如何取消预约？', a: '进入"我的-我的预约"，找到对应预约，点击取消即可。已支付的预约取消后费用将原路退回。', open: false },
        { q: '如何添加就诊人？', a: '进入"我的-我的就诊人"，点击"添加就诊人"，填写姓名、性别、年龄、手机号等信息保存即可。', open: false },
        { q: '在线问诊如何使用？', a: '在首页点击"在线问诊"或选择医生后点击"在线咨询"，描述病情后等待医生回复，支持图文咨询。', open: false },
        { q: '如何查看就诊记录？', a: '进入"我的-我的预约-历史"，可以查看所有历史就诊记录。', open: false },
        { q: '支付失败怎么办？', a: '请检查网络连接和支付账户余额。如仍失败，可在"我的预约-待支付"中重新发起支付，或联系客服处理。', open: false },
        { q: '如何进行实名认证？', a: '进入"我的-设置-实名认证"，上传身份证照片并填写真实姓名和身份证号完成认证。', open: false },
        { q: '医生直播如何观看？', a: '在首页点击"医生直播"入口或在直播列表中选择正在直播的医生即可观看，支持实时互动提问。', open: false },
        { q: '如何联系客服？', a: '可拨打客服热线400-123-4567（工作日9:00-18:00），或通过意见反馈功能留言。', open: false }
      ]
    };
  },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) uni.navigateBack();
      else uni.switchTab({ url: '/pages/mine/mine' });
    },
    toggleFaq(idx) {
      this.faqs[idx].open = !this.faqs[idx].open;
    },
    callService() {
      uni.makePhoneCall({ phoneNumber: '4001234567', fail: () => {} });
    },
    feedBack() {
      uni.showModal({
        title: '意见反馈',
        editable: true,
        placeholderText: '请输入您的意见或建议...',
        success: (res) => {
          if (res.confirm && res.content) {
            uni.showToast({ title: '感谢您的反馈', icon: 'success' });
          }
        }
      });
    }
  }
};
</script>

<style lang="scss">
.help-page { min-height: 100vh; background: #f7f8fa; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 30rpx; padding-top: calc(20rpx + env(safe-area-inset-top)); background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.nav-back { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 700; color: #333; }
.nav-right { width: 60rpx; }

.contact-bar { display: flex; background: #fff; margin: 16rpx; border-radius: 12rpx; overflow: hidden; }
.contact-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 28rpx 0; }
.contact-item:first-child { border-right: 1rpx solid #f0f0f0; }
.contact-icon { font-size: 48rpx; margin-bottom: 8rpx; }
.contact-text { font-size: 26rpx; color: #333; }

.section-title { padding: 20rpx 30rpx 12rpx; font-size: 28rpx; font-weight: 700; color: #333; }

.faq-list { height: calc(100vh - 360rpx - env(safe-area-inset-top)); padding: 0 16rpx 16rpx; }
.faq-item { background: #fff; border-radius: 12rpx; margin-bottom: 12rpx; overflow: hidden; }
.faq-q { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx; }
.faq-q-text { flex: 1; font-size: 28rpx; color: #333; font-weight: 500; }
.faq-arrow { font-size: 24rpx; color: #999; transition: transform 0.2s; }
.faq-arrow.open { transform: rotate(180deg); }
.faq-a { padding: 0 28rpx 24rpx; }
.faq-a-text { font-size: 26rpx; color: #666; line-height: 1.7; }
</style>

