import { http } from './http';

export interface SupportConversation {
  id: number;
  userId: number;
  serviceId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
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

export const createOrGetConversation = (userId: number): Promise<SupportConversation> => {
  return http.post('/support/conversations', { userId });
};

export const getUserConversations = (userId: number): Promise<SupportConversation[]> => {
  return http.get(`/support/conversations/user/${userId}`);
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

export const clearConversationMessages = (conversationId: number): Promise<{ deleted: number }> => {
  return http.post(`/support/conversations/${conversationId}/clear`);
};

