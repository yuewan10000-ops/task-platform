import http from './http';

export interface SupportConversation {
  id: number;
  userId: number;
  serviceId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  user?: {
    id: number;
    account: string | null;
    name: string | null;
  } | null;
}

export interface SupportMessage {
  id: number;
  conversationId: number;
  senderType: 'user' | 'service';
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export const getAllConversations = (): Promise<SupportConversation[]> => {
  return http.get('/support/conversations');
};

export const getSupportUnreadCount = (): Promise<{ count: number }> => {
  return http.get('/support/unread-count');
};

export const markConversationRead = (conversationId: number): Promise<{ updated: number }> => {
  return http.post(`/support/conversations/${conversationId}/read`);
};

export const getConversationMessages = (conversationId: number): Promise<SupportMessage[]> => {
  return http.get(`/support/conversations/${conversationId}/messages`);
};

export const sendSupportMessage = (params: {
  conversationId: number;
  senderType: 'user' | 'service';
  senderId: number;
  content: string;
}): Promise<SupportMessage> => {
  return http.post('/support/messages', params);
};

