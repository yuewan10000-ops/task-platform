<script lang="ts">
import { defineComponent } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getRechargeConfig, createRechargeRequest } from '../api/rechargeConfig';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'ServiceView',
  components: { RouterLink },
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const authStore = useAuthStore();
    return { t, router, authStore };
  },
  data() {
    return {
      trc20Address: '',
      trxAddress: '',
      loading: false,
      error: '',
      uploadedImage: '' as string,
      submitting: false,
    };
  },
  mounted() {
    this.fetchConfig();
  },
  methods: {
    async fetchConfig() {
      this.loading = true;
      this.error = '';
      try {
        const data = await getRechargeConfig();
        this.trc20Address = data.trc20Address ?? '';
        this.trxAddress = data.trxAddress ?? '';
      } catch (err: any) {
        console.error(err);
        this.error = err?.message || 'Failed to load addresses';
      } finally {
        this.loading = false;
      }
    },
    async copyText(text: string) {
      try {
        await navigator.clipboard.writeText(text);
        window.alert('Copied');
      } catch (err) {
        console.error(err);
        window.alert('Copy failed, please copy manually');
      }
    },
    handleFileSelect(event: Event) {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            this.uploadedImage = result;
          }
        };
        reader.readAsDataURL(file);
      }

      // 重置input，允许重复选择同一文件
      target.value = '';
    },
    removeImage() {
      this.uploadedImage = '';
    },
    triggerFileInput() {
      const input = this.$refs.fileInput as HTMLInputElement;
      input?.click();
    },
    async handleSubmit() {
      if (!this.uploadedImage) {
        window.alert('Please upload your recharge voucher first');
        return;
      }
      if (!this.authStore.user?.id) {
        window.alert('Please re-login');
        this.router.push('/login');
        return;
      }
      this.submitting = true;
      try {
        await createRechargeRequest({
          userId: this.authStore.user.id,
          amount: 0,
          voucherImage: this.uploadedImage,
        });
        // 提交成功后重置页面状态
        this.uploadedImage = '';
        // 重置文件输入
        const input = this.$refs.fileInput as HTMLInputElement;
        if (input) {
          input.value = '';
        }
        window.alert('Recharge voucher submitted successfully, pending review');
      } catch (err: any) {
        console.error('Submit error:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Submit failed, please try again';
        window.alert(errorMessage);
      } finally {
        this.submitting = false;
      }
    },
  },
});
</script>

<!-- eslint-disable vue/no-undef -->
<template>
  <div class="page">
    <header class="bar">
      <RouterLink class="back" to="/home">←</RouterLink>
      <h1>{{ t('service.title') }}</h1>
    </header>

    <section class="card">
      <div class="header-section">
        <div class="icon-wrapper">
          <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" :stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" :stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" :stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="title">Recharge Address</h2>
        <p class="intro">Please use the addresses below to top up your account</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">Loading addresses...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p class="error">{{ error }}</p>
      </div>

      <div v-else class="address-list">
        <div class="address-card">
          <div class="card-header">
            <div class="label-wrapper">
              <div class="label-icon trc20">₮</div>
              <span class="label">TRC20 Address</span>
            </div>
            <button class="copy-btn" @click="copyText(trc20Address)">
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <div class="address-wrapper">
            <p class="address">{{ trc20Address || 'Address not configured' }}</p>
          </div>
        </div>

        <div class="address-card">
          <div class="card-header">
            <div class="label-wrapper">
              <div class="label-icon trx">⚡</div>
              <span class="label">TRX Address</span>
            </div>
            <button class="copy-btn" @click="copyText(trxAddress)">
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <div class="address-wrapper">
            <p class="address">{{ trxAddress || 'Address not configured' }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="upload-card">
      <div class="upload-header">
        <h2 class="upload-title">Please upload your recharge voucher</h2>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileSelect"
      />

      <div class="upload-area" @click="triggerFileInput">
        <div v-if="!uploadedImage" class="upload-placeholder">
          <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="placeholder-text">Add</p>
        </div>
        <div v-else class="uploaded-image-wrapper">
          <img :src="uploadedImage" alt="Recharge voucher" class="uploaded-image" />
          <button class="remove-btn" @click.stop="removeImage" aria-label="Remove image">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <button class="submit-btn" :disabled="!uploadedImage || submitting" @click="handleSubmit">
        <span v-if="submitting">Submitting...</span>
        <span v-else>Submit</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: 
    linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(30, 144, 255, 0.3) 50%, rgba(255, 20, 147, 0.3) 100%),
    linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0d0f14 100%),
    url('/home-bg-DHK5U4-9.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  color: #f7f8fb;
  padding-bottom: 80px;
  position: relative;
}

.page::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 50%, rgba(138, 43, 226, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 20, 147, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(30, 144, 255, 0.15) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.page > * {
  position: relative;
  z-index: 1;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}
.bar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #e5e7eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.back {
  color: #f7f8fb;
  font-size: 20px;
  text-decoration: none;
  line-height: 1;
  transition: transform 0.2s;
}
.back:hover {
  transform: translateX(-2px);
}
.card {
  background: linear-gradient(135deg, rgba(16, 18, 24, 0.95) 0%, rgba(20, 22, 30, 0.95) 100%);
  margin: 20px 12px 24px;
  padding: 28px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
  backdrop-filter: blur(20px);
}

.header-section {
  text-align: center;
  padding-bottom: 8px;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(251, 113, 133, 0.2) 100%);
  border-radius: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(225, 29, 72, 0.3);
}

.icon {
  width: 32px;
  height: 32px;
  color: #fb7185;
}

.title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #e5e7eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.intro {
  margin: 0;
  color: #9ca3af;
  font-size: 14px;
  line-height: 1.6;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(225, 29, 72, 0.2);
  border-top-color: #fb7185;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #9ca3af;
  font-size: 14px;
}

.error-icon {
  font-size: 48px;
}

.error {
  margin: 0;
  color: #ef4444;
  font-size: 14px;
  text-align: center;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.address-card {
  background: linear-gradient(135deg, rgba(17, 19, 26, 0.8) 0%, rgba(22, 24, 32, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.address-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(225, 29, 72, 0.5) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.address-card:hover {
  border-color: rgba(225, 29, 72, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.2);
}

.address-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.label-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.label-icon.trc20 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.label-icon.trx {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.label {
  font-weight: 700;
  color: #f7f8fb;
  font-size: 16px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.1) 0%, rgba(251, 113, 133, 0.1) 100%);
  color: #fb7185;
  border-radius: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.copy-btn:hover {
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(251, 113, 133, 0.2) 100%);
  border-color: rgba(225, 29, 72, 0.4);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
}

.copy-btn:active {
  transform: scale(0.98);
}

.copy-icon {
  width: 14px;
  height: 14px;
}

.address-wrapper {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.address {
  margin: 0;
  word-break: break-all;
  color: #e5e7eb;
  font-family: 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.8;
  letter-spacing: 0.3px;
}


.upload-card {
  background: linear-gradient(135deg, rgba(16, 18, 24, 0.95) 0%, rgba(20, 22, 30, 0.95) 100%);
  margin: 0 12px 24px;
  padding: 28px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
}

.upload-header {
  text-align: center;
  padding-bottom: 20px;
}

.upload-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f7f8fb;
  line-height: 1.5;
}

.upload-area {
  border: 2px dashed rgba(225, 29, 72, 0.4);
  border-radius: 16px;
  min-height: 200px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(17, 19, 26, 0.5) 0%, rgba(22, 24, 32, 0.5) 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: rgba(225, 29, 72, 0.6);
  background: linear-gradient(135deg, rgba(17, 19, 26, 0.7) 0%, rgba(22, 24, 32, 0.7) 100%);
  transform: translateY(-2px);
}

.upload-area:active {
  transform: translateY(0);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  width: 100%;
  min-height: 200px;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: #fb7185;
  opacity: 0.7;
}

.placeholder-text {
  margin: 0;
  color: #f7f8fb;
  font-size: 18px;
  font-weight: 600;
}

.uploaded-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;
}

.uploaded-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  min-height: 180px;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  z-index: 10;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: scale(1.1);
}

.remove-btn:active {
  transform: scale(0.95);
}

.remove-btn svg {
  width: 18px;
  height: 18px;
}

.submit-btn {
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(225, 29, 72, 0.9) 0%, rgba(251, 113, 133, 0.9) 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(225, 29, 72, 1) 0%, rgba(251, 113, 133, 1) 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(225, 29, 72, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (min-width: 720px) {
  .card,
  .upload-card {
    width: min(720px, 92vw);
    margin-left: auto;
    margin-right: auto;
    padding: 32px 28px;
  }
  .card {
    margin-top: 24px;
    margin-bottom: 24px;
  }
  .upload-card {
    margin-bottom: 32px;
  }
  .bar {
    width: min(720px, 92vw);
    margin: 0 auto;
    padding-left: 4px;
  }
  .address-card {
    padding: 24px;
  }
}
</style>
