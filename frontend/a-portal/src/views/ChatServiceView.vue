<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { createOrGetConversation, getConversationMessages, sendSupportMessage, clearConversationMessages, type SupportMessage } from '../api/support';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const sending = ref(false);
const error = ref('');
const conversationId = ref<number | null>(null);
const messages = ref<SupportMessage[]>([]);
const inputText = ref('');
const chatBodyEl = ref<HTMLElement | null>(null);
const imageInputEl = ref<HTMLInputElement | null>(null);
let pollTimer: number | null = null;
let clearTimer: number | null = null;

const userId = computed(() => authStore.user?.id || null);

const loadConversation = async () => {
  if (!userId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const conv = await createOrGetConversation(userId.value);
    conversationId.value = conv.id;
    await loadMessages();
  } catch (e: any) {
    error.value = e?.message || 'Failed to load conversation';
  } finally {
    loading.value = false;
  }
};

const loadMessages = async () => {
  if (!conversationId.value) return;
  try {
    const msgs = await getConversationMessages(conversationId.value);
    messages.value = msgs;
    await nextTick();
    scrollToBottom();
  } catch (e: any) {
    console.error('Load messages failed:', e);
  }
};

const scrollToBottom = () => {
  const el = chatBodyEl.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const isImageMessage = (content: string) => content.startsWith('IMG::');
const imageUrlFromContent = (content: string) => content.slice(5);

const triggerPickImage = () => {
  imageInputEl.value?.click();
};

const compressImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read image failed'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Load image failed'));
      img.onload = () => {
        const maxW = 900;
        const maxH = 900;
        let width = img.width;
        let height = img.height;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL('image/jpeg', 0.82);
        resolve(out);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
};

const handleImageSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!conversationId.value || !userId.value) return;

  sending.value = true;
  try {
    const dataUrl = await compressImageToDataUrl(file);
    await sendSupportMessage({
      conversationId: conversationId.value,
      senderType: 'user',
      senderId: userId.value,
      content: `IMG::${dataUrl}`,
    });
    await loadMessages();
    await nextTick();
    scrollToBottom();
  } catch (err: any) {
    window.alert(err?.message || 'Upload image failed');
  } finally {
    sending.value = false;
  }
};

const handleSend = async () => {
  if (!conversationId.value || !userId.value) return;
  const text = inputText.value.trim();
  if (!text) return;
  sending.value = true;
  try {
    await sendSupportMessage({
      conversationId: conversationId.value,
      senderType: 'user',
      senderId: userId.value,
      content: text,
    });
    inputText.value = '';
    await loadMessages();
    await nextTick();
    scrollToBottom();
  } catch (e: any) {
    window.alert(e?.message || 'Send failed');
  } finally {
    sending.value = false;
  }
};

onMounted(async () => {
  // 如果上次挂载设置了清理定时器，这里清掉，防止用户刚返回又被清空
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  await loadConversation();
  pollTimer = window.setInterval(loadMessages, 4000);
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  // 页面关闭 1 分钟后自动清理消息（保留会话）
  const cid = conversationId.value;
  if (cid) {
    clearTimer = window.setTimeout(() => {
      clearConversationMessages(cid).catch((err) => {
        console.error('Clear conversation messages failed:', err);
      });
    }, 60_000);
  }
});

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};
</script>

<template>
  <div class="chat-page">
    <!-- 蓝色头部 -->
    <header class="chat-header">
      <div class="header-left">
        <img class="avatar" src="/customer-service-avatar.png.jpg" alt="Customer service" />
      </div>
      <div class="header-right">
        <button class="icon-btn" title="Volume">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        <button class="icon-btn" title="Minimize" @click="router.back()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="icon-btn close-btn" title="Close" @click="router.back()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>

    <!-- 白色聊天区域 -->
    <main ref="chatBodyEl" class="chat-body">
      <div v-if="loading" class="center-text">Loading...</div>
      <div v-else-if="error" class="center-text error">{{ error }}</div>
      <div v-else class="message-list">
        <!-- 消息列表 -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="msg.senderType === 'user' ? 'me' : 'service'"
        >
          <div v-if="msg.senderType === 'service'" class="avatar-wrapper">
            <img class="avatar small" src="/customer-service-avatar.png.jpg" alt="Customer service" />
          </div>
          <div class="message-content">
            <div class="time">{{ formatTime(msg.createdAt) }}</div>
            <div class="bubble" :class="msg.senderType === 'user' ? 'user-bubble' : 'service-bubble'">
              <img
                v-if="isImageMessage(msg.content)"
                class="chat-image"
                :src="imageUrlFromContent(msg.content)"
                alt="image"
              />
              <div v-else class="content">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 输入区域 -->
    <footer class="chat-input">
      <div class="input-left">
        <button class="input-icon-btn" title="Image" @click="triggerPickImage">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
      </div>
      <input
        ref="imageInputEl"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleImageSelected"
      />
      <input
        v-model="inputText"
        type="text"
        placeholder="Please enter"
        @keyup.enter="handleSend"
      />
      <button class="send-btn" :disabled="sending || !inputText.trim()" @click="handleSend">
        {{ sending ? 'Sending...' : 'Send' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #fff;
  color: #333;
  overflow: hidden;
}

/* 蓝色头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #2563eb;
  color: #fff;
  flex-shrink: 0;
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.small {
  width: 32px;
  height: 32px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.2);
}

/* 白色聊天区域 */
.chat-body {
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
  padding: 8px 16px 16px 16px;
  min-height: 0;
  flex: 1;
  position: relative;
  z-index: 1;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-body::-webkit-scrollbar {
  display: none;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 100%;
  min-height: 100%;
  padding-bottom: 20px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message-row.me {
  justify-content: flex-end;
}

.message-row.service {
  justify-content: flex-start;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-row.me .message-content {
  align-items: flex-end;
}

.message-row.service .message-content {
  align-items: flex-start;
}

.time {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 4px;
  padding: 0 4px;
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.chat-image {
  display: block;
  max-width: 240px;
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.service-bubble {
  background: #f3f4f6;
  color: #111827;
  border-bottom-left-radius: 4px;
}

.user-bubble {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.content {
  white-space: pre-wrap;
}

/* 输入区域 */
.chat-input {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  gap: 8px;
  flex-shrink: 0;
  height: 60px;
  box-sizing: border-box;
}

.input-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-icon-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.input-icon-btn:hover {
  color: #2563eb;
  background: #f3f4f6;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #111827;
  outline: none;
  font-size: 14px;
}

.chat-input input:focus {
  border-color: #2563eb;
  background: #fff;
}

.chat-input input::placeholder {
  color: #9ca3af;
}

.send-btn {
  padding: 10px 20px;
  border-radius: 20px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.center-text {
  text-align: center;
  margin-top: 40px;
  color: #9ca3af;
}

.center-text.error {
  color: #ef4444;
}
</style>

