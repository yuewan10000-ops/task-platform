<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  getProductPriceConfig,
  updateProductPriceConfig,
  type ProductPriceConfig,
} from '../api/productPriceConfig';

const config = ref<ProductPriceConfig | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');

const form = ref({
  minRate: 0.29, // 小数形式（0.29 = 29%）
  maxRate: 0.60, // 小数形式（0.60 = 60%）
  minRatePercent: 29, // 百分比形式（用于滑块显示）
  maxRatePercent: 60, // 百分比形式（用于滑块显示）
});

const load = async () => {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    config.value = await getProductPriceConfig();
    const minRate = Number(config.value.minRate);
    const maxRate = Number(config.value.maxRate);
    form.value = {
      minRate: minRate,
      maxRate: maxRate,
      minRatePercent: minRate * 100,
      maxRatePercent: maxRate * 100,
    };
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

// 更新最小比例
const updateMinRate = (percent: number) => {
  form.value.minRatePercent = percent;
  form.value.minRate = percent / 100;
  // 确保最小值不超过最大值
  if (form.value.minRatePercent > form.value.maxRatePercent) {
    form.value.maxRatePercent = form.value.minRatePercent;
    form.value.maxRate = form.value.minRate;
  }
};

// 更新最大比例
const updateMaxRate = (percent: number) => {
  form.value.maxRatePercent = percent;
  form.value.maxRate = percent / 100;
  // 确保最大值不小于最小值
  if (form.value.maxRatePercent < form.value.minRatePercent) {
    form.value.minRatePercent = form.value.maxRatePercent;
    form.value.minRate = form.value.maxRate;
  }
};

const save = async () => {
  // 确保比例范围有效
  if (form.value.minRatePercent < 1 || form.value.minRatePercent > 100) {
    error.value = '最小比例必须在1-100%之间';
    return;
  }
  if (form.value.maxRatePercent < 1 || form.value.maxRatePercent > 100) {
    error.value = '最大比例必须在1-100%之间';
    return;
  }
  if (form.value.minRatePercent > form.value.maxRatePercent) {
    error.value = '最小比例不能大于最大比例';
    return;
  }

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    await updateProductPriceConfig({
      minRate: form.value.minRate,
      maxRate: form.value.maxRate,
    });
    message.value = '保存成功';
    await load();
  } catch (err: any) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="product-price-config">
    <header class="page-header">
      <div>
        <h2>商品价格管理</h2>
        <p class="subtitle">设置所有用户订单的价格比例范围，设置后将对会员列表中的所有用户生效。</p>
      </div>
      <button class="refresh" :disabled="loading" @click="load">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </header>

    <div v-if="message" class="status success">{{ message }}</div>
    <div v-if="error" class="status error">{{ error }}</div>

    <div class="card">
      <div class="field">
        <label>价格比例范围：{{ form.minRatePercent.toFixed(0) }}% - {{ form.maxRatePercent.toFixed(0) }}%</label>
        <div class="range-slider-container">
          <div class="range-slider-wrapper">
            <input
              v-model.number="form.minRatePercent"
              @input="updateMinRate(form.minRatePercent)"
              type="range"
              min="1"
              max="100"
              step="1"
              class="range-slider range-slider-min"
            />
            <input
              v-model.number="form.maxRatePercent"
              @input="updateMaxRate(form.maxRatePercent)"
              type="range"
              min="1"
              max="100"
              step="1"
              class="range-slider range-slider-max"
            />
          </div>
          <div class="range-labels">
            <span>1%</span>
            <span>100%</span>
          </div>
        </div>
        <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 8px;">
          设置后，A端所有用户的订单价格将在用户本金的{{ form.minRatePercent.toFixed(0) }}%-{{ form.maxRatePercent.toFixed(0) }}%之间随机生成
        </small>
      </div>
      <div class="actions">
        <button class="primary" :disabled="saving || loading" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-price-config {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.refresh {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
}

.status {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.status.success {
  background: #d1fae5;
  color: #065f46;
}

.status.error {
  background: #fee2e2;
  color: #991b1b;
}

.card {
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.field {
  margin-bottom: 24px;
}

.field label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 16px;
}

.range-slider-container {
  margin-top: 12px;
}

.range-slider-wrapper {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
}

.range-slider {
  position: absolute;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  pointer-events: none;
}

.range-slider-min {
  z-index: 2;
}

.range-slider-max {
  z-index: 1;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  pointer-events: all;
  position: relative;
  z-index: 3;
}

.range-slider-min::-webkit-slider-thumb {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}

.range-slider-max::-webkit-slider-thumb {
  background: linear-gradient(135deg, #10b981, #059669);
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  pointer-events: all;
  position: relative;
  z-index: 3;
}

.range-slider-min::-moz-range-thumb {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}

.range-slider-max::-moz-range-thumb {
  background: linear-gradient(135deg, #10b981, #059669);
}

.range-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.primary {
  border: none;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  border-radius: 10px;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

