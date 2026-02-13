import { aiClient, type ChatMessage } from './apiClient';

export interface LocalChatMessage extends ChatMessage {
  id: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: LocalChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatService {
  createSession(name?: string): ChatSession;
  getCurrentSession(): ChatSession | null;
  sendMessage(message: string, signal?: AbortSignal): Promise<LocalChatMessage>;
  getSessionHistory(): LocalChatMessage[];
  clearSession(): void;
  addSystemPrompt(prompt: string): void;
  switchSession(sessionId: string): void;
  getAllSessions(): ChatSession[];
  deleteSession(sessionId: string): void;
  updateSessionName(sessionId: string, newName: string): void;
  regenerateLastAssistantReply(signal?: AbortSignal): Promise<LocalChatMessage>;
  queryPatientInfo(patientId: string, signal?: AbortSignal): Promise<LocalChatMessage>;
}

export class ChatServiceImpl implements ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  private systemPrompt: string = '你是一个专业的医疗辅助系统，专门为医生提供病人信息查询和医疗咨询支持。\n\n专业范围：\n1. 病人信息查询与整理（病历、检查结果、用药记录等）\n2. 临床决策支持（症状分析、诊断建议、治疗方案参考）\n3. 药物信息查询（适应症、禁忌症、药物相互作用、剂量调整）\n4. 检查检验结果解读（实验室指标、影像学检查）\n5. 医学知识检索（疾病指南、最新研究、临床路径）\n6. 病历书写辅助（主诉、现病史、诊断依据等）\n\n使用场景：\n- 查询病人历史病历和检查结果\n- 辅助诊断和治疗决策\n- 药物使用指导和注意事项\n- 检查检验结果的专业解读\n- 医学文献和指南查询\n\n回答要求：\n- 使用专业医学术语，准确简洁\n- 提供循证医学依据，引用相关指南或研究\n- 给出具体的建议和操作步骤\n- 标注重要注意事项和风险提示\n- 对于不确定的信息，明确说明并建议进一步确认\n\n重要提醒：\n- 本系统仅提供辅助决策支持，不能替代医生的专业判断\n- 最终诊断和治疗方案由医生负责\n- 对于危急重症，请立即采取相应急救措施\n\n请为医生提供专业、准确的医疗辅助服务。';
  private readonly STORAGE_KEY = 'ai_chat_sessions';
  private readonly CURRENT_SESSION_KEY = 'ai_chat_current_session';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const sessionsJson = localStorage.getItem(this.STORAGE_KEY);
      if (sessionsJson) {
        console.log('从LocalStorage加载会话数据');
        const sessionsData = JSON.parse(sessionsJson);

        sessionsData.forEach((session: any) => {
          console.log('会话:', session.id, '消息数量:', session.messages?.length || 0);
          if (session.messages) {
            session.messages.forEach((msg: any, index: number) => {
              if (typeof msg.content !== 'string') {
                console.warn(`消息 ${index} 的 content 类型不是字符串，正在转换:`, typeof msg.content);
                msg.content = String(msg.content);
              }
              const contentPreview = typeof msg.content === 'string'
                ? msg.content.substring(0, 50)
                : JSON.stringify(msg.content).substring(0, 50);
              console.log(`  消息 ${index}:`, msg.role, typeof msg.content, contentPreview);
            });
          }
        });

        this.sessions = new Map(sessionsData.map((session: {
          id: string;
          name: string;
          messages: Array<{
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: string;
          }>;
          createdAt: string;
          updatedAt: string;
        }) => [
          session.id,
          {
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: {
              id: string;
              role: 'user' | 'assistant' | 'system';
              content: string;
              timestamp: string;
            }) => ({
              ...msg,
              content: typeof msg.content === 'string' ? msg.content : String(msg.content),
              timestamp: new Date(msg.timestamp)
            }))
          }
        ]));

        let needsCleanup = false;
        sessionsData.forEach((session: any) => {
          if (session.messages) {
            session.messages.forEach((msg: any) => {
              if (typeof msg.content !== 'string') {
                needsCleanup = true;
                msg.content = String(msg.content);
              }
            });
          }
        });

        if (needsCleanup) {
          console.log('检测到数据格式问题，正在清理 localStorage...');
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionsData));
        }

        const currentSessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
        if (currentSessionId && this.sessions.has(currentSessionId)) {
          this.currentSessionId = currentSessionId;
        } else if (this.sessions.size > 0) {
          this.currentSessionId = this.sessions.keys().next().value;
        }
      }
    } catch (error) {
      console.error('从LocalStorage加载会话数据失败:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CURRENT_SESSION_KEY);
    }
  }

  private saveToStorage(): void {
    try {
      const sessionsData = Array.from(this.sessions.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionsData));

      if (this.currentSessionId) {
        localStorage.setItem(this.CURRENT_SESSION_KEY, this.currentSessionId);
      } else {
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('保存会话数据到LocalStorage失败:', error);
    }
  }

  public createSession(name: string = `会话 ${this.sessions.size + 1}`): ChatSession {
    const session: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(session.id, session);
    this.saveToStorage();
    return session;
  }

  public getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  public switchSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId;
      this.saveToStorage();
    } else {
      throw new Error(`会话不存在: ${sessionId}`);
    }
  }

  public async sendMessage(userMessage: string, signal?: AbortSignal): Promise<LocalChatMessage> {
    console.log('开始发送消息:', userMessage);
    let currentSession = this.getCurrentSession();
    console.log('当前会话:', currentSession ? currentSession.id : 'null');

    if (!currentSession) {
      console.log('创建新会话');
      let sessionName = userMessage;

      const greetings = ['你好', '您好', '请问', '帮我', '告诉我', '查询', '想知道', '请教'];
      for (const greeting of greetings) {
        if (sessionName.startsWith(greeting)) {
          sessionName = sessionName.substring(greeting.length).trim();
          break;
        }
      }

      sessionName = sessionName.replace(/[?？!！,，。:：;；]/g, '');

      if (sessionName.length > 15) {
        sessionName = sessionName.substring(0, 15) + '...';
      }

      if (!sessionName || sessionName.length < 2) {
        const sessionCount = this.getAllSessions().length;
        sessionName = `会话 ${sessionCount + 1}`;
      }

      currentSession = this.createSession(sessionName);
      this.switchSession(currentSession.id);
    }

    const newUserMessage: LocalChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    console.log('添加用户消息到会话:', newUserMessage);
    currentSession.messages.push(newUserMessage);
    currentSession.updatedAt = new Date();

    try {
      console.log('准备调用AI API');
      const apiMessages: ChatMessage[] = [];

      if (this.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: this.systemPrompt
        });
      }

      const mappedMessages = currentSession.messages.map(msg => {
        let content = msg.content;

        if (typeof content !== 'string') {
          console.error('消息content类型错误:', msg.id, typeof content, content);
          content = String(content);
        }

        console.log('处理消息:', msg.id, msg.role, typeof content, content.substring(0, 100));

        return {
          role: msg.role,
          content: content
        };
      });

      console.log('准备发送的消息:', JSON.stringify(mappedMessages, null, 2));

      apiMessages.push(...mappedMessages);

      console.log('完整的API消息数组:', JSON.stringify(apiMessages, null, 2));

      let streamingMessage: LocalChatMessage | null = null;

      const aiResponse = await aiClient.sendChatRequest(
        apiMessages,
        { stream: true },
        { signal, onToken: (delta) => {
          if (!streamingMessage) {
            streamingMessage = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: delta,
              timestamp: new Date()
            };
            currentSession.messages.push(streamingMessage);
          } else {
            streamingMessage.content += delta;
            streamingMessage.timestamp = new Date();
          }
        } }
      );

      let aiMessage: LocalChatMessage | null = streamingMessage;
      if (!aiMessage) {
        aiMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };
        currentSession.messages.push(aiMessage);
      }

      currentSession.messages = [...currentSession.messages];
      currentSession.updatedAt = new Date();

      this.saveToStorage();
      return aiMessage;
    } catch (error) {
      console.error('API调用失败:', error);

      const errorMessage: LocalChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `抱歉，我暂时无法为您提供帮助：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      };

      currentSession.messages.push(errorMessage);
      currentSession.updatedAt = new Date();

      this.saveToStorage();
      return errorMessage;
    }
  }

  public getSessionHistory(): LocalChatMessage[] {
    const currentSession = this.getCurrentSession();
    return currentSession ? [...currentSession.messages] : [];
  }

  public clearSession(): void {
    const currentSession = this.getCurrentSession();
    if (currentSession) {
      currentSession.messages = [];
      currentSession.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  public addSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  public getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  public deleteSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);

      if (this.currentSessionId === sessionId) {
        const remainingSessions = Array.from(this.sessions.keys());
        if (remainingSessions.length > 0) {
          this.currentSessionId = remainingSessions[0];
        } else {
          this.currentSessionId = null;
        }
      }
      this.saveToStorage();
    }
  }

  public updateSessionName(sessionId: string, newName: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.name = newName;
      session.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  public async regenerateLastAssistantReply(signal?: AbortSignal): Promise<LocalChatMessage> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      throw new Error('没有可用的会话');
    }
    if (currentSession.messages.length === 0) {
      throw new Error('当前会话没有消息');
    }
    const last = currentSession.messages[currentSession.messages.length - 1];
    if (last.role !== 'assistant') {
      throw new Error('最后一条消息不是AI回复');
    }
    currentSession.messages.pop();
    currentSession.updatedAt = new Date();
    try {
      const apiMessages: ChatMessage[] = [];
      if (this.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: this.systemPrompt
        });
      }
      apiMessages.push(...currentSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
      const aiResponse = await aiClient.sendChatRequest(apiMessages, undefined, signal);
      const aiMessage: LocalChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      currentSession.messages.push(aiMessage);
      currentSession.updatedAt = new Date();
      this.saveToStorage();
      return aiMessage;
    } catch (error) {
      const errorMessage: LocalChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `抱歉，我暂时无法重新生成：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      };
      currentSession.messages.push(errorMessage);
      currentSession.updatedAt = new Date();
      this.saveToStorage();
      return errorMessage;
    }
  }

  public async queryPatientInfo(patientId: string, signal?: AbortSignal): Promise<LocalChatMessage> {
    const queryMessage = `请查询病人ID为 ${patientId} 的病人信息，包括：\n1. 基本信息（姓名、年龄、性别、联系方式等）\n2. 既往病史\n3. 过敏史\n4. 用药记录\n5. 近期检查结果\n6. 家族史\n\n请按结构化格式整理信息。`;

    const newUserMessage: LocalChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: queryMessage,
      timestamp: new Date()
    };

    let currentSession = this.getCurrentSession();
    if (!currentSession) {
      currentSession = this.createSession(`病人查询: ${patientId}`);
      this.switchSession(currentSession.id);
    }

    currentSession.messages.push(newUserMessage);
    currentSession.updatedAt = new Date();

    try {
      const apiMessages: ChatMessage[] = [];
      if (this.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: this.systemPrompt
        });
      }

      const mappedMessages = currentSession.messages.map(msg => {
        let content = msg.content;
        if (typeof content !== 'string') {
          console.error('消息content类型错误:', msg.id, typeof content, content);
          content = String(content);
        }
        return {
          role: msg.role,
          content: content
        };
      });

      apiMessages.push(...mappedMessages);

      let streamingMessage: LocalChatMessage | null = null;
      const aiResponse = await aiClient.sendChatRequest(
        apiMessages,
        { stream: true },
        { signal, onToken: (delta) => {
          if (!streamingMessage) {
            streamingMessage = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: delta,
              timestamp: new Date()
            };
            currentSession.messages.push(streamingMessage);
          } else {
            streamingMessage.content += delta;
            streamingMessage.timestamp = new Date();
          }
        } }
      );

      let aiMessage: LocalChatMessage | null = streamingMessage;
      if (!aiMessage) {
        aiMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };
        currentSession.messages.push(aiMessage);
      }

      currentSession.messages = [...currentSession.messages];
      currentSession.updatedAt = new Date();
      this.saveToStorage();
      return aiMessage;
    } catch (error) {
      const errorMessage: LocalChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `查询失败：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      };
      currentSession.messages.push(errorMessage);
      currentSession.updatedAt = new Date();
      this.saveToStorage();
      return errorMessage;
    }
  }
}

export const chatService = new ChatServiceImpl();
