<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { getAllConversations, getConversationMessages, sendSupportMessage, markConversationRead, type SupportConversation, type SupportMessage } from '../api/support';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const loadingConvs = ref(false);
const conversations = ref<SupportConversation[]>([]);
const selectedId = ref<number | null>(null);
const currentConversation = ref<SupportConversation | null>(null);
const messages = ref<SupportMessage[]>([]);
const inputText = ref('');
const sending = ref(false);
const noteText = ref('');
const activeTab = ref<'note' | 'conv'>('note');
const noteSavedTip = ref(false);

const isImageMessage = (content: string) => content.startsWith('IMG::');
const imageUrlFromContent = (content: string) => content.slice(5);

const loadConversations = async () => {
  loadingConvs.value = true;
  try {
    conversations.value = await getAllConversations();
    if (conversations.value.length > 0 && !selectedId.value) {
      handleSelect(conversations.value[0].id);
    }
  } catch (e: any) {
    console.error('Load conversations failed:', e);
  } finally {
    loadingConvs.value = false;
  }
};

const handleSelect = async (id: number) => {
  selectedId.value = id;
  currentConversation.value = conversations.value.find(c => c.id === id) || null;
  await loadMessages(id);
  // 进入会话后，标记用户消息为已读，并刷新列表（用于更新未读提示）
  try {
    await markConversationRead(id);
    await loadConversations();
  } catch (e) {
    console.error('Mark read failed:', e);
  }
};

const loadMessages = async (conversationId: number) => {
  try {
    messages.value = await getConversationMessages(conversationId);
  } catch (e: any) {
    console.error('Load messages failed:', e);
  }
};

const handleSend = async () => {
  // 注意：admin-login 返回 user.id=0（系统客服），0 需要被视为合法值
  if (!selectedId.value || !inputText.value.trim() || authStore.user?.id === undefined || authStore.user?.id === null) return;
  sending.value = true;
  try {
    await sendSupportMessage({
      conversationId: selectedId.value,
      senderType: 'service',
      senderId: authStore.user.id,
      content: inputText.value.trim(),
    });
    inputText.value = '';
    await loadMessages(selectedId.value);
    await loadConversations();
  } catch (e: any) {
    window.alert(e?.message || '发送失败');
  } finally {
    sending.value = false;
  }
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

onMounted(() => {
  authStore.initAuth();
  loadConversations();
  // 载入记事本
  try {
    const saved = localStorage.getItem('support-notepad');
    if (saved !== null) noteText.value = saved;
    else noteText.value = '';
  } catch (e) {
    console.error('Load notepad failed:', e);
  }
  // 每4秒刷新一次
  setInterval(() => {
    if (selectedId.value) {
      loadMessages(selectedId.value);
    }
    loadConversations();
  }, 4000);
});

// 保存记事本到 localStorage
const saveNoteToStorage = () => {
  try {
    localStorage.setItem('support-notepad', noteText.value ?? '');
  } catch (e) {
    console.error('Save notepad failed:', e);
  }
};

// 保存记事本并显示提示
const saveNoteWithTip = () => {
  saveNoteToStorage();
  noteSavedTip.value = true;
  setTimeout(() => {
    noteSavedTip.value = false;
  }, 1500);
};

// 自动持久化记事本（防止刷新后丢失）
watch(
  noteText,
  (val) => {
    try {
      localStorage.setItem('support-notepad', val ?? '');
    } catch (e) {
      console.error('Save notepad failed:', e);
    }
  },
  { immediate: false }
);
</script>

<template>
  <div class="support-page">
    <header class="header">
      <h2>在线客服</h2>
    </header>
    <div class="content">
      <aside class="sidebar">
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'note' }" @click="activeTab = 'note'">记事本</button>
          <button class="tab" :class="{ active: activeTab === 'conv' }" @click="activeTab = 'conv'">会话</button>
        </div>

        <div v-if="activeTab === 'note'" class="notepad full">
          <div class="notepad-title">记事本（仅本机保存，自动保存）</div>
          <textarea
            v-model="noteText"
            class="notepad-textarea"
            placeholder="输入常用回复或笔记..."
            @input="saveNoteToStorage"
          ></textarea>
          <div class="notepad-actions">
            <button
              class="notepad-save"
              @click="saveNoteWithTip"
            >
              保存
            </button>
            <span v-if="noteSavedTip" class="save-tip">已保存</span>
          </div>
        </div>

        <div v-else class="conv-list">
          <div v-if="loadingConvs" class="sidebar-empty">加载中...</div>
          <div v-else-if="conversations.length === 0" class="sidebar-empty">暂无会话</div>
          <div
            v-else
            v-for="conv in conversations"
            :key="conv.id"
            class="conv-item"
            :class="{ active: conv.id === selectedId }"
            @click="handleSelect(conv.id)"
          >
            <img class="avatar" src="/customer-service-avatar.png.jpg" alt="客服" />
            <div class="conv-info">
              <div class="name">{{ conv.user?.account || `User ${conv.userId}` }}</div>
              <div class="meta">
                {{ conv.status === 'open' ? '进行中' : '已关闭' }} · {{ new Date(conv.updatedAt).toLocaleString() }}
              </div>
            </div>
            <span v-if="conv.unreadCount && conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</span>
          </div>
        </div>
      </aside>
      <main class="chat" v-if="currentConversation">
        <div class="chat-header">
          <div class="chat-user-info">
            <img class="avatar" src="/customer-service-avatar.png.jpg" alt="客服" />
            <div>
              <div class="user-name">{{ currentConversation.user?.account || `User ${currentConversation.userId}` }}</div>
              <div class="user-status">{{ currentConversation.status === 'open' ? '进行中' : '已关闭' }}</div>
            </div>
          </div>
        </div>
        <div class="chat-body">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row"
            :class="msg.senderType === 'user' ? 'user-msg' : 'service-msg'"
          >
            <div v-if="msg.senderType === 'user'" class="avatar-wrapper">
              <img class="avatar small" src="/customer-service-avatar.png.jpg" alt="用户" />
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
                <span v-else>{{ msg.content }}</span>
              </div>
            </div>
            <div v-if="msg.senderType === 'service'" class="avatar-wrapper">
              <img class="avatar small" src="/customer-service-avatar.png.jpg" alt="客服" />
            </div>
          </div>
        </div>
        <div class="chat-input">
          <input
            v-model="inputText"
            type="text"
            placeholder="输入消息..."
            @keyup.enter="handleSend"
          />
          <button :disabled="sending || !inputText.trim()" @click="handleSend">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </main>
      <div v-else class="no-selection">
        <p>请选择一个会话</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.support-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
}

.tab.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notepad.full {
  padding: 12px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.notepad {
  padding: 12px 12px 0 12px;
  border-bottom: 1px solid #f1f5f9;
}

.notepad-title {
  font-size: 13px;
  color: #475569;
  margin-bottom: 6px;
}

.notepad-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  resize: none;
  font-size: 13px;
  min-height: 90px;
  outline: none;
  flex: 1;
}

.notepad-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.notepad-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notepad-save {
  width: auto;
  min-width: 80px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.notepad-save:hover {
  background: #1d4ed8;
}

.save-tip {
  font-size: 12px;
  color: #22c55e;
}

.conv-list {
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.sidebar-empty {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
}

.conv-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
}

.conv-item:hover {
  background: #f9fafb;
}

.conv-item.active {
  background: #eff6ff;
}

.conv-item .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.unread-badge {
  margin-left: 10px;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  line-height: 1.2;
}

.conv-info {
  flex: 1;
}

.conv-info .name {
  font-weight: 600;
  margin-bottom: 4px;
}

.conv-info .meta {
  font-size: 12px;
  color: #6b7280;
}

.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-user-info .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.user-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.user-status {
  font-size: 12px;
  color: #6b7280;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.message-row.user-msg {
  justify-content: flex-start;
}

.message-row.service-msg {
  justify-content: flex-end;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar.small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.message-content {
  max-width: 60%;
  display: flex;
  flex-direction: column;
}

.message-row.user-msg .message-content {
  align-items: flex-start;
}

.message-row.service-msg .message-content {
  align-items: flex-end;
}

.time {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 4px;
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
  max-width: 320px;
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.user-bubble {
  background: #f3f4f6;
  color: #111827;
}

.service-bubble {
  background: #2563eb;
  color: #fff;
}

.chat-input {
  display: flex;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  gap: 12px;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
}

.chat-input input:focus {
  border-color: #2563eb;
}

.chat-input button {
  padding: 10px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.chat-input button:hover:not(:disabled) {
  background: #1d4ed8;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
</style>

