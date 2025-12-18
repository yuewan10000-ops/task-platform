import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const router = express.Router();

// 创建或获取当前用户的开放会话（A 端用户）
const createConversationSchema = z.object({
  userId: z.number().int().positive(),
});

router.post('/conversations', async (req, res) => {
  try {
    const { userId } = createConversationSchema.parse(req.body);

    // 查找是否已有未关闭会话
    let conversation = await prisma.supportConversation.findFirst({
      where: { userId, status: 'open' },
    });

    if (!conversation) {
      conversation = await prisma.supportConversation.create({
        data: {
          userId,
        },
      });
      
      // 为新会话创建一条欢迎消息（使用系统用户ID 0作为客服）
      await prisma.supportMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: 'service',
          senderId: 0, // 系统客服ID
          content: "Hello, it's our pleasure to serve you!",
        },
      });
    }

    res.json(conversation);
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(400).json({ message: error?.message || 'Create conversation failed' });
  }
});

// 获取用户自己的会话列表（A 端）
router.get('/conversations/user/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const conversations = await prisma.supportConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(conversations);
  } catch (error: any) {
    console.error('List user conversations error:', error);
    res.status(500).json({ message: error?.message || 'Load conversations failed' });
  }
});

// B 端：获取所有会话，按创建时间和状态排序
router.get('/conversations', async (_req, res) => {
  try {
    const unreadGroups = await prisma.supportMessage.groupBy({
      by: ['conversationId'],
      where: {
        senderType: 'user',
        isRead: false,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map<number, number>();
    unreadGroups.forEach((g) => unreadMap.set(g.conversationId, g._count._all));

    const conversations = await prisma.supportConversation.findMany({
      orderBy: [
        { status: 'asc' }, // open 优先
        { updatedAt: 'desc' },
      ],
      include: {
        user: true,
        service: true,
      },
    });

    res.json(
      conversations.map((c) => ({
        ...c,
        unreadCount: unreadMap.get(c.id) ?? 0,
      }))
    );
  } catch (error: any) {
    console.error('List all conversations error:', error);
    res.status(500).json({ message: error?.message || 'Load conversations failed' });
  }
});

// B 端：获取全部未读数量（用户发给客服的消息）
router.get('/unread-count', async (_req, res) => {
  try {
    const count = await prisma.supportMessage.count({
      where: {
        senderType: 'user',
        isRead: false,
      },
    });
    res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: error?.message || 'Load unread count failed' });
  }
});

// B 端：标记某个会话的用户消息为已读
router.post('/conversations/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const result = await prisma.supportMessage.updateMany({
      where: {
        conversationId: id,
        senderType: 'user',
        isRead: false,
      },
      data: { isRead: true },
    });
    res.json({ updated: result.count });
  } catch (error: any) {
    console.error('Mark conversation read error:', error);
    res.status(500).json({ message: error?.message || 'Mark read failed' });
  }
});

// 清理会话聊天记录（删除消息，保留会话）
router.post('/conversations/:id/clear', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const deleted = await prisma.supportMessage.deleteMany({
      where: { conversationId: id },
    });
    // 更新会话时间戳，便于排序
    await prisma.supportConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    res.json({ deleted: deleted.count });
  } catch (error: any) {
    console.error('Clear conversation messages error:', error);
    res.status(500).json({ message: error?.message || 'Clear messages failed' });
  }
});

// 分配客服（可选）
const assignSchema = z.object({
  serviceId: z.number().int().positive(),
});

router.put('/conversations/:id/assign', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const { serviceId } = assignSchema.parse(req.body);

    const updated = await prisma.supportConversation.update({
      where: { id },
      data: {
        serviceId,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Assign service error:', error);
    res.status(400).json({ message: error?.message || 'Assign service failed' });
  }
});

// 消息发送
const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  senderType: z.enum(['user', 'service']),
  // admin-login 返回的系统客服为 0，需要允许 0
  senderId: z.number().int().nonnegative(),
  content: z.string().min(1),
});

router.post('/messages', async (req, res) => {
  try {
    const data = sendMessageSchema.parse(req.body);

    const message = await prisma.supportMessage.create({
      data: {
        conversationId: data.conversationId,
        senderType: data.senderType,
        senderId: data.senderId,
        content: data.content,
      },
    });

    // 更新会话的更新时间
    await prisma.supportConversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    res.json(message);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(400).json({ message: error?.message || 'Send message failed' });
  }
});

// 获取某个会话的消息列表
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }

    const messages = await prisma.supportMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error: any) {
    console.error('List messages error:', error);
    res.status(500).json({ message: error?.message || 'Load messages failed' });
  }
});

export default router;

