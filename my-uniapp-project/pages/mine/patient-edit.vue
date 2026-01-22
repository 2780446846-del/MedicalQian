<template>
  <view class="page">
    <view class="form-container">
      <view class="form-item">
        <text class="label">姓名 <text class="required">*</text></text>
        <input
          class="input"
          v-model="formData.name"
          placeholder="请输入姓名"
          maxlength="20"
        />
      </view>

      <view class="form-item">
        <text class="label">性别 <text class="required">*</text></text>
        <view class="radio-group">
          <view
            class="radio-item"
            :class="{ active: formData.gender === '男' }"
            @click="formData.gender = '男'"
          >
            <text>男</text>
          </view>
          <view
            class="radio-item"
            :class="{ active: formData.gender === '女' }"
            @click="formData.gender = '女'"
          >
            <text>女</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">年龄 <text class="required">*</text></text>
        <input
          class="input"
          v-model="formData.age"
          type="number"
          placeholder="请输入年龄"
          maxlength="3"
        />
      </view>

      <view class="form-item">
        <text class="label">身份证号</text>
        <input
          class="input"
          v-model="formData.idCard"
          placeholder="请输入身份证号（选填）"
          maxlength="18"
        />
      </view>

      <view class="form-item">
        <text class="label">手机号</text>
        <input
          class="input"
          v-model="formData.phone"
          type="number"
          placeholder="请输入手机号（选填）"
          maxlength="11"
        />
      </view>

      <view class="form-item">
        <text class="label">与本人关系</text>
        <picker
          mode="selector"
          :range="relationOptions"
          :value="relationIndex"
          @change="onRelationChange"
        >
          <view class="picker-view">
            <text :class="{ placeholder: !formData.relation }">
              {{ formData.relation || '请选择关系（选填）' }}
            </text>
            <uni-icons type="arrowright" size="16" color="#999"></uni-icons>
          </view>
        </picker>
      </view>
    </view>

    <view class="button-container">
      <button class="delete-btn" v-if="isEdit" @click="handleDelete">删除就诊人</button>
      <button class="save-btn" @click="handleSave">保存</button>
    </view>

    <!-- 主题切换按钮 -->
    <ThemeToggle />
  </view>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue';
import { getCurrentTheme } from '@/utils/theme.js';
import { savePatient, deletePatient, getPatientById } from '@/utils/patientStorage.js';

export default {
  components: {
    ThemeToggle
  },
  data() {
    return {
      theme: getCurrentTheme(),
      isEdit: false,
      patientId: null,
      formData: {
        name: '',
        gender: '',
        age: '',
        idCard: '',
        phone: '',
        relation: ''
      },
      relationOptions: ['本人', '配偶', '子女', '父母', '其他亲属', '其他']
    };
  },
  computed: {
    relationIndex() {
      const index = this.relationOptions.indexOf(this.formData.relation);
      return index >= 0 ? index : 0;
    }
  },
  onLoad(options) {
    if (options.id) {
      // 编辑模式
      this.isEdit = true;
      this.patientId = options.id;
      this.loadPatientData();
    }
  },
  onShow() {
    uni.$on('themeChange', this.updateTheme);
    this.updateTheme();
  },
  onHide() {
    uni.$off('themeChange', this.updateTheme);
  },
  methods: {
    updateTheme(theme) {
      try {
        this.theme = theme || getCurrentTheme();
      } catch (e) {
        console.warn('主题更新失败:', e);
        this.theme = getCurrentTheme();
      }
    },
    loadPatientData() {
      const patient = getPatientById(this.patientId);
      if (patient) {
        this.formData = {
          name: patient.name || '',
          gender: patient.gender || '',
          age: patient.age || '',
          idCard: patient.idCard || '',
          phone: patient.phone || '',
          relation: patient.relation || ''
        };
      }
    },
    onRelationChange(e) {
      this.formData.relation = this.relationOptions[e.detail.value];
    },
    validateForm() {
      if (!this.formData.name || !this.formData.name.trim()) {
        uni.showToast({
          title: '请输入姓名',
          icon: 'none'
        });
        return false;
      }
      if (!this.formData.gender) {
        uni.showToast({
          title: '请选择性别',
          icon: 'none'
        });
        return false;
      }
      if (!this.formData.age || !this.formData.age.trim()) {
        uni.showToast({
          title: '请输入年龄',
          icon: 'none'
        });
        return false;
      }
      const age = parseInt(this.formData.age);
      if (isNaN(age) || age < 0 || age > 150) {
        uni.showToast({
          title: '请输入有效的年龄',
          icon: 'none'
        });
        return false;
      }
      // 验证身份证号格式（如果填写了）
      if (this.formData.idCard && this.formData.idCard.trim()) {
        const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
        if (!idCardRegex.test(this.formData.idCard)) {
          uni.showToast({
            title: '身份证号格式不正确',
            icon: 'none'
          });
          return false;
        }
      }
      // 验证手机号格式（如果填写了）
      if (this.formData.phone && this.formData.phone.trim()) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(this.formData.phone)) {
          uni.showToast({
            title: '手机号格式不正确',
            icon: 'none'
          });
          return false;
        }
      }
      return true;
    },
    handleSave() {
      if (!this.validateForm()) {
        return;
      }
      
      try {
        const patientData = {
          ...this.formData,
          age: parseInt(this.formData.age),
          id: this.patientId
        };
        
        savePatient(patientData);
        
        uni.showToast({
          title: this.isEdit ? '修改成功' : '添加成功',
          icon: 'success'
        });
        
        // 触发就诊人更新事件
        uni.$emit('patientUpdated');
        
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (e) {
        console.error('保存就诊人失败:', e);
        uni.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      }
    },
    handleDelete() {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该就诊人吗？删除后无法恢复。',
        success: (res) => {
          if (res.confirm) {
            try {
              deletePatient(this.patientId);
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
              // 触发就诊人更新事件
              uni.$emit('patientUpdated');
              setTimeout(() => {
                uni.navigateBack();
              }, 1500);
            } catch (e) {
              console.error('删除就诊人失败:', e);
              uni.showToast({
                title: '删除失败，请重试',
                icon: 'none'
              });
            }
          }
        }
      });
    }
  }
};
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding: 30rpx;
  padding-bottom: 200rpx;
  transition: background-color 0.3s ease;
}

.form-container {
  background-color: var(--card-bg);
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.form-item {
  margin-bottom: 40rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  display: block;
  font-size: 28rpx;
  color: var(--text-color);
  margin-bottom: 20rpx;
  font-weight: 500;
  transition: color 0.3s ease;
  
  .required {
    color: #ff4d4f;
  }
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: var(--bg-color);
  border: 1rpx solid var(--border-color);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: var(--text-color);
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  box-sizing: border-box;
}

.radio-group {
  display: flex;
  gap: 20rpx;
}

.radio-item {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
  border: 1rpx solid var(--border-color);
  border-radius: 8rpx;
  font-size: 28rpx;
  color: var(--text-color-secondary);
  transition: all 0.3s ease;
  
  &.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: #ffffff;
  }
}

.picker-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: var(--bg-color);
  border: 1rpx solid var(--border-color);
  border-radius: 8rpx;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  
  text {
    font-size: 28rpx;
    color: var(--text-color);
    transition: color 0.3s ease;
    
    &.placeholder {
      color: var(--text-color-tertiary);
    }
  }
}

.button-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: var(--bg-color);
  box-shadow: 0 -4rpx 12rpx var(--shadow-color);
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.delete-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #ff4d4f;
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
  margin-bottom: 20rpx;
}

.save-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
}
</style>

