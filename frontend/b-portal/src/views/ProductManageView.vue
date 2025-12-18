<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
  type Product,
} from '../api/products';

const products = ref<Product[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');

// 批量导入相关
const showBulkModal = ref(false);
const bulkUploading = ref(false);
const bulkProgress = ref({ current: 0, total: 0, percentage: 0 });
const bulkFiles = ref<File[]>([]);

const showModal = ref(false);
const editingProduct = ref<Product | null>(null);
const form = ref({
  name: '',
  image: '',
  isActive: true,
});

const load = async () => {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    products.value = await getProducts();
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  editingProduct.value = null;
  form.value = {
    name: '',
    image: '',
    isActive: true,
  };
  showModal.value = true;
};

const openEditModal = (product: Product) => {
  editingProduct.value = product;
  form.value = {
    name: product.name,
    image: product.image || '',
    isActive: product.isActive,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingProduct.value = null;
};

// 压缩图片
const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 计算缩放比例
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建画布'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

// 处理图片上传
const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件';
    return;
  }

  // 检查文件大小（限制5MB）
  if (file.size > 5 * 1024 * 1024) {
    error.value = '图片大小不能超过5MB';
    return;
  }

  try {
    // 压缩图片
    error.value = '正在压缩图片...';
    const compressedBase64 = await compressImage(file);
    form.value.image = compressedBase64;
    error.value = '';
    message.value = '图片已压缩并加载';
    setTimeout(() => {
      message.value = '';
    }, 2000);

    // 根据图片自动填充商品名称（如果名称为空）
    if (!form.value.name.trim()) {
      // 从文件名提取商品名称（去除扩展名）
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      // 清理文件名，移除特殊字符，保留中英文、数字和空格
      const cleanName = fileName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim();
      form.value.name = cleanName || '商品';
    }
  } catch (err: any) {
    error.value = err?.message || '图片处理失败';
  }
};

const save = async () => {
  if (!form.value.name.trim()) {
    error.value = '请输入商品名称';
    return;
  }

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const payload = {
      name: form.value.name,
      image: form.value.image || null,
      isActive: form.value.isActive,
    };
    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, payload);
      message.value = '更新成功';
    } else {
      await createProduct(payload);
      message.value = '创建成功';
    }
    closeModal();
    await load();
  } catch (err: any) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这个商品吗？')) return;
  try {
    await deleteProduct(id);
    message.value = '删除成功';
    await load();
  } catch (err: any) {
    error.value = err?.message || '删除失败';
  }
};

// 批量导入相关函数
const openBulkModal = () => {
  bulkFiles.value = [];
  bulkProgress.value = { current: 0, total: 0, percentage: 0 };
  showBulkModal.value = true;
};

const closeBulkModal = () => {
  showBulkModal.value = false;
  bulkFiles.value = [];
  bulkProgress.value = { current: 0, total: 0, percentage: 0 };
};

const handleBulkFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  
  // 过滤出图片文件
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    error.value = '请选择图片文件';
    return;
  }
  
  // 限制最多2000张
  if (imageFiles.length > 2000) {
    error.value = '最多只能选择2000张图片';
    bulkFiles.value = imageFiles.slice(0, 2000);
  } else {
    bulkFiles.value = imageFiles;
  }
  
  message.value = `已选择 ${bulkFiles.value.length} 张图片`;
  setTimeout(() => {
    message.value = '';
  }, 3000);
};

// 批量上传商品
const handleBulkUpload = async () => {
  if (bulkFiles.value.length === 0) {
    error.value = '请先选择图片文件';
    return;
  }
  
  bulkUploading.value = true;
  error.value = '';
  message.value = '';
  bulkProgress.value = { current: 0, total: bulkFiles.value.length, percentage: 0 };
  
  try {
    const BATCH_SIZE = 50; // 每批处理50张图片
    const totalBatches = Math.ceil(bulkFiles.value.length / BATCH_SIZE);
    let successCount = 0;
    let failCount = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchFiles = bulkFiles.value.slice(
        batchIndex * BATCH_SIZE,
        (batchIndex + 1) * BATCH_SIZE
      );
      
      // 处理当前批次
      const products = await Promise.all(
        batchFiles.map(async (file) => {
          try {
            // 压缩图片
            const compressedBase64 = await compressImage(file);
            
            // 从文件名提取商品名称
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            const cleanName = fileName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim();
            const name = cleanName || `商品_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            return {
              name,
              image: compressedBase64,
              isActive: true,
            };
          } catch (err) {
            console.error(`处理文件 ${file.name} 失败:`, err);
            failCount++;
            return null;
          }
        })
      );
      
      // 过滤掉失败的商品
      const validProducts = products.filter(p => p !== null) as Array<{
        name: string;
        image: string;
        isActive: boolean;
      }>;
      
      if (validProducts.length > 0) {
        // 批量创建商品（每批最多50个）
        try {
          await bulkCreateProducts({ products: validProducts });
          successCount += validProducts.length;
        } catch (err: any) {
          console.error('批量创建失败:', err);
          failCount += validProducts.length;
        }
      }
      
      // 更新进度
      bulkProgress.value.current = Math.min(
        (batchIndex + 1) * BATCH_SIZE,
        bulkFiles.value.length
      );
      bulkProgress.value.percentage = Math.round(
        (bulkProgress.value.current / bulkProgress.value.total) * 100
      );
    }
    
    message.value = `批量导入完成！成功: ${successCount}，失败: ${failCount}`;
    closeBulkModal();
    await load();
    
    setTimeout(() => {
      message.value = '';
    }, 5000);
  } catch (err: any) {
    error.value = err?.message || '批量导入失败';
  } finally {
    bulkUploading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="product-manage">
    <header class="page-header">
      <div>
        <h2>商品管理</h2>
        <p class="subtitle">管理 A 端订单使用的商品信息（图片、名称、描述）。</p>
      </div>
      <div class="header-actions">
        <button class="refresh" :disabled="loading" @click="load">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
        <button class="secondary" @click="openBulkModal">批量导入</button>
        <button class="primary" @click="openAddModal">添加商品</button>
      </div>
    </header>

    <div v-if="message" class="status success">{{ message }}</div>
    <div v-if="error" class="status error">{{ error }}</div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>商品名称</th>
            <th>图片</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="loading-cell">加载中...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td colspan="6" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-else v-for="product in products" :key="product.id">
            <td>{{ product.id }}</td>
            <td>
              <div class="name-cell" :title="product.name">
                {{ product.name }}
              </div>
            </td>
            <td>
              <img
                v-if="product.image"
                :src="product.image"
                alt="Product"
                class="product-thumb"
              />
              <span v-else>-</span>
            </td>
            <td>
              <span :class="['status-badge', product.isActive ? 'active' : 'inactive']">
                {{ product.isActive ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ new Date(product.updatedAt).toLocaleString('zh-CN') }}</td>
            <td>
              <button class="btn-edit" @click="openEditModal(product)">编辑</button>
              <button class="btn-delete" @click="handleDelete(product.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingProduct ? '编辑商品' : '添加商品' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>商品名称 *</label>
            <input v-model="form.name" type="text" placeholder="输入商品名称" required />
          </div>
          <div class="field">
            <label>商品图片</label>
            <input
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              class="file-input"
            />
            <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 4px;">
              支持 JPG、PNG、GIF 格式，最大 5MB
            </small>
            <div v-if="form.image" class="image-preview-container">
              <img :src="form.image" alt="Preview" class="image-preview" />
              <button class="remove-image" @click="form.image = ''">删除图片</button>
            </div>
          </div>
          <div class="field">
            <label>
              <input v-model="form.isActive" type="checkbox" />
              启用（启用的商品会在A端订单中随机显示）
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-save" :disabled="saving" @click="save">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showBulkModal" class="modal-overlay" @click="closeBulkModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>批量导入商品</h3>
          <button class="modal-close" @click="closeBulkModal">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>选择图片文件（支持多选，最多2000张）</label>
            <input
              type="file"
              accept="image/*"
              multiple
              @change="handleBulkFileSelect"
              class="file-input"
              :disabled="bulkUploading"
            />
            <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 4px;">
              支持 JPG、PNG、GIF 格式，每张图片最大 5MB。系统会根据文件名自动生成商品名称和描述。
            </small>
            <div v-if="bulkFiles.length > 0" class="bulk-files-info">
              <p>已选择 <strong>{{ bulkFiles.length }}</strong> 张图片</p>
              <div v-if="bulkUploading" class="progress-container">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: bulkProgress.percentage + '%' }"
                  ></div>
                </div>
                <p class="progress-text">
                  正在上传: {{ bulkProgress.current }} / {{ bulkProgress.total }} 
                  ({{ bulkProgress.percentage }}%)
                </p>
              </div>
            </div>
          </div>
          <div class="field">
            <div class="bulk-tips">
              <h4>使用说明：</h4>
              <ul>
                <li>选择包含商品图片的文件夹中的所有图片文件</li>
                <li>系统会根据文件名自动生成商品名称（去除扩展名和特殊字符）</li>
                <li>所有导入的商品默认状态为"启用"</li>
                <li>批量导入会分批处理，每批50张图片，避免超时</li>
                <li>建议每次导入不超过500张，以确保稳定性</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeBulkModal" :disabled="bulkUploading">取消</button>
          <button 
            class="btn-save" 
            :disabled="bulkUploading || bulkFiles.length === 0" 
            @click="handleBulkUpload"
          >
            {{ bulkUploading ? `上传中... ${bulkProgress.percentage}%` : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-manage {
  max-width: 1400px;
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

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh,
.primary {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
}

.primary {
  border: none;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-weight: 600;
}

.secondary {
  border: 1px solid #8b5cf6;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  font-weight: 600;
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

.table-wrapper {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
}

th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  color: #1f2937;
}

.loading-cell,
.empty-cell {
  text-align: center;
  color: #6b7280;
  padding: 40px;
}

.product-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.name-cell {
  max-width: 360px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.btn-edit,
.btn-delete {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 4px 8px;
  margin-right: 8px;
  font-size: 14px;
}

.btn-delete {
  color: #ef4444;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.modal-close {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 24px;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.field input[type="text"],
.field textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.field textarea {
  resize: vertical;
  min-height: 80px;
}

.field input[type="checkbox"] {
  margin-right: 8px;
}

.file-input {
  width: 100%;
  padding: 8px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  cursor: pointer;
}

.image-preview-container {
  margin-top: 12px;
  position: relative;
  display: inline-block;
}

.image-preview {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  display: block;
}

.remove-image {
  margin-top: 8px;
  padding: 6px 12px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-save {
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-save {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-files-info {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.bulk-files-info p {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 14px;
}

.progress-container {
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.progress-text {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.bulk-tips {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.bulk-tips h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
  font-size: 14px;
  font-weight: 600;
}

.bulk-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #0c4a6e;
  font-size: 13px;
  line-height: 1.8;
}

.bulk-tips li {
  margin-bottom: 6px;
}
</style>
