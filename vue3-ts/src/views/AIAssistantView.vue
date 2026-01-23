<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { chatService, type ChatSession, type LocalChatMessage } from '../services/ai/chatService';
import { aiClient } from '../services/ai/apiClient';

const messages = ref<LocalChatMessage[]>([]);
const inputValue = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const sessions = ref<ChatSession[]>([]);
const currentSession = ref<ChatSession | null>(null);
const messagesEndRef = ref<HTMLElement | null>(null);
const isSessionsListExpanded = ref(true);
const showEmergency = ref(false);
const showPatientQuery = ref(false);
const emergencyNote = ref('');
const patientId = ref('');
const selectedSymptoms = reactive<Record<string, string[]>>({});
const selectedGroup = ref('');
const abortController = ref<AbortController | null>(null);

const emergencyGroups: Record<string, string[]> = {
  '成人': ['胸痛', '呼吸困难', '严重出血', '昏迷', '剧烈腹痛', '抽搐', '严重过敏反应', '高烧不退', '头部外伤', '疑似中毒'],
  '儿童': ['高烧不退', '呼吸困难', '抽搐', '腹泻脱水', '过敏反应', '头部外伤', '误食中毒'],
  '孕妇': ['腹痛伴出血', '呼吸困难', '高血压头痛', '胎动异常', '严重呕吐脱水', '过敏反应', '晕厥'],
  '老年人': ['胸痛', '呼吸困难', '意识障碍', '跌倒外伤', '心悸气短', '高热谵妄', '严重过敏反应']
};

const quickTemplates = [
  { label: '病人信息查询', content: '请帮我查询病人信息：包括基本信息、既往病史、过敏史、用药记录、近期检查结果、家族史等。请按结构化格式整理信息。' },
  { label: '症状分析', content: '请帮我分析病人的症状表现：主要症状、持续时间、严重程度、伴随症状、诱发因素、缓解因素。请给出可能的诊断方向和鉴别诊断。' },
  { label: '用药指导', content: '请提供用药指导：药物名称、适应症、用法用量、禁忌症、不良反应、药物相互作用、特殊人群用药注意事项。' },
  { label: '检查结果解读', content: '请解读检查检验结果：实验室指标（血常规、生化等）、影像学检查（CT、MRI、超声等）。请说明临床意义和后续建议。' },
  { label: '诊断辅助', content: '请提供诊断辅助支持：基于症状、体征、检查结果，给出可能的诊断、诊断依据、鉴别诊断、建议的进一步检查。' },
  { label: '病历书写', content: '请协助书写病历：主诉、现病史、既往史、个人史、家族史、体格检查、辅助检查、初步诊断、诊疗计划。' }
];

const scrollToBottom = () => {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
};

const loadSessions = () => {
  const allSessions = chatService.getAllSessions();
  sessions.value = allSessions;

  const current = chatService.getCurrentSession();
  if (current) {
    currentSession.value = current;
    messages.value = current.messages;
    setTimeout(scrollToBottom, 0);
  }
};

const handleSendMessage = async (overrideMessage?: string) => {
  const content = overrideMessage ?? inputValue.value.trim();
  if (!content || loading.value) return;

  inputValue.value = '';
  loading.value = true;
  error.value = null;

  if (abortController.value) {
    abortController.value.abort();
  }
  abortController.value = new AbortController();

  try {
    const sendMessagePromise = chatService.sendMessage(content, abortController.value.signal);
    const updatedHistory = chatService.getSessionHistory();

    messages.value = updatedHistory;
    setTimeout(scrollToBottom, 0);

    await sendMessagePromise;

    const finalHistory = chatService.getSessionHistory();
    messages.value = finalHistory;
    setTimeout(scrollToBottom, 0);
  } catch (err) {
    console.error('发送消息失败:', err);
    if (err instanceof Error && err.message !== 'API请求已取消') {
      error.value = err.message;
      alert(`发送消息失败: ${err.message}`);
    }
  } finally {
    loading.value = false;
    abortController.value = null;
  }
};

const applyTemplate = async (t: { label: string; content: string }) => {
  if (t.label === '病人信息查询') {
    showPatientQuery.value = true;
  } else {
    inputValue.value = t.content;
    await handleSendMessage(t.content);
  }
};

const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
};

const handleRegenerate = async () => {
  if (loading.value) return;
  loading.value = true;
  error.value = null;

  if (abortController.value) {
    abortController.value.abort();
  }
  abortController.value = new AbortController();

  try {
    await chatService.regenerateLastAssistantReply(abortController.value.signal);
    const finalHistory = chatService.getSessionHistory();
    messages.value = finalHistory;
    setTimeout(scrollToBottom, 0);
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = '重新生成失败';
    }
  } finally {
    loading.value = false;
    abortController.value = null;
  }
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
};

const handleNewSession = () => {
  try {
    chatService.clearSession();
    const newSession = chatService.createSession();
    chatService.switchSession(newSession.id);

    messages.value = [];
    currentSession.value = newSession;
    sessions.value = chatService.getAllSessions();
  } catch (error) {
    console.error('创建新会话失败:', error);
  }
};

const toggleSessionsList = () => {
  isSessionsListExpanded.value = !isSessionsListExpanded.value;
};

const handleSwitchSession = (sessionId: string) => {
  try {
    chatService.switchSession(sessionId);
    const current = chatService.getCurrentSession();
    if (current) {
      currentSession.value = current;
      messages.value = current.messages;
      sessions.value = chatService.getAllSessions();
      setTimeout(scrollToBottom, 0);
    }
  } catch (error) {
    console.error('切换会话失败:', error);
  }
};

const handleDeleteSession = (sessionId: string) => {
  if (confirm('确定要删除这个会话吗？')) {
    try {
      chatService.deleteSession(sessionId);

      const allSessions = chatService.getAllSessions();
      sessions.value = allSessions;

      if (currentSession.value?.id === sessionId && allSessions.length > 0) {
        chatService.switchSession(allSessions[0].id);
        currentSession.value = allSessions[0];
        messages.value = allSessions[0].messages;
      } else if (allSessions.length === 0) {
        currentSession.value = null;
        messages.value = [];
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  }
};

const handleUpdateSessionName = (sessionId: string, newName: string) => {
  try {
    chatService.updateSessionName(sessionId, newName);
    const allSessions = chatService.getAllSessions();
    sessions.value = allSessions;

    if (currentSession.value?.id === sessionId) {
      currentSession.value = { ...currentSession.value, name: newName };
    }
  } catch (error) {
    console.error('更新会话名称失败:', error);
  }
};

const handleCancelGeneration = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
    loading.value = false;
  }
};

const toggleSymptom = (group: string, symptom: string) => {
  const current = selectedSymptoms[group] || [];
  if (current.includes(symptom)) {
    selectedSymptoms[group] = current.filter(s => s !== symptom);
  } else {
    selectedSymptoms[group] = [...current, symptom];
  }
};

const handleEmergencySubmit = () => {
  const symptoms = Object.values(selectedSymptoms).flat();
  if (symptoms.length === 0) {
    alert('请至少选择一个症状');
    return;
  }

  const symptomText = symptoms.join('、');
  let content = `我遇到可能的紧急情况：${symptomText}。`;
  if (emergencyNote.value) {
    content += ` 补充说明：${emergencyNote.value}`;
  }
  content += ' 请根据以下信息给出是否需要立即就医的建议，并提供急救要点与注意事项。';

  handleSendMessage(content);
  showEmergency.value = false;
  Object.keys(selectedSymptoms).forEach(key => {
    selectedSymptoms[key] = [];
  });
  emergencyNote.value = '';
  selectedGroup.value = '';
};

const handlePatientQuerySubmit = async () => {
  if (!patientId.value.trim()) {
    alert('请输入病人ID');
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const aiMessage = await chatService.queryPatientInfo(patientId.value.trim());
    const current = chatService.getCurrentSession();
    if (current) {
      currentSession.value = current;
      messages.value = current.messages;
    }
    setTimeout(scrollToBottom, 0);
  } catch (err) {
    console.error('查询病人信息失败:', err);
    if (err instanceof Error && err.message !== 'API请求已取消') {
      error.value = err.message;
      alert(`查询失败: ${err.message}`);
    }
  } finally {
    loading.value = false;
    patientId.value = '';
    showPatientQuery.value = false;
  }
};

watch(messages, () => {
  setTimeout(scrollToBottom, 0);
});

onMounted(() => {
  loadSessions();

  const hebeiLocation = { latitude: 38.04, longitude: 115.48, city: '河北' };
  aiClient.setManualLocation(hebeiLocation);
});
</script>

<template>
  <div class="page-container">
      <div class="ai-chat-container">
      <div class="chat-header">
        <h2>🏥 医疗辅助系统</h2>
        <div class="header-actions">
          <button class="patient-query-btn" @click="showPatientQuery = true" title="病人信息查询">👤 病人查询</button>
          <button class="emergency-btn" @click="showEmergency = true" title="紧急医疗助手">🚨 紧急医疗助手</button>
        </div>
      </div>

      <div class="medical-banner">
        ⚠️ 本系统为医生提供病人信息查询和医疗决策辅助支持，不能替代医生的专业判断。最终诊断和治疗方案由医生负责。对于危急重症，请立即采取相应急救措施。
      </div>

      <div class="chat-main-content">
        <div v-if="isSessionsListExpanded" class="sessions-list">
          <div class="sessions-header">
            <h3>会话列表</h3>
            <button class="new-session-mini-btn" @click="handleNewSession">+ 新建</button>
          </div>
          <div class="sessions-container">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="session-item"
            >
              <input
                :value="session.name"
                class="session-name"
                :class="{ active: currentSession?.id === session.id }"
                @change="(e: Event) => handleUpdateSessionName(session.id, (e.target as HTMLInputElement).value)"
              />
              <div class="session-actions">
                <button
                  class="switch-btn"
                  :disabled="currentSession?.id === session.id"
                  @click="handleSwitchSession(session.id)"
                >
                  切换
                </button>
                <button class="delete-btn" @click="handleDeleteSession(session.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-area">
          <div class="messages-list">
            <div
              v-for="message in messages"
              :key="message.id"
              class="chat-message"
              :class="message.role"
            >
              <div class="message-avatar" :class="message.role === 'user' ? 'user-avatar' : 'assistant-avatar'">
                <svg v-if="message.role === 'user'" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span v-else>👨‍⚕️</span>
              </div>
              <div class="message-content">
                <div v-html="message.content.replace(/\n/g, '<br>')"></div>
                <div class="message-actions">
                  <button class="msg-icon-btn copy" title="复制" @click="handleCopy(message.content)">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 12H8V7h11v12z"/>
                    </svg>
                  </button>
                  <button
                    v-if="message.role === 'assistant' && messages.indexOf(message) === messages.length - 1"
                    class="msg-icon-btn regen"
                    title="重新生成"
                    @click="handleRegenerate"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 .65-.13 1.27-.36 1.83l1.46 1.46C18.85 15.43 19 14.75 19 14c0-3.87-3.13-7-7-7zm-5 1.17l-1.46-1.46C5.15 8.57 5 9.25 5 10c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-.65.13-1.27.36-1.83z"/>
                    </svg>
                  </button>
                </div>
                <div class="message-time">
                  {{ new Date(message.timestamp).toLocaleTimeString() }}
                </div>
              </div>
            </div>

            <div v-if="loading" class="chat-message assistant">
              <div class="message-avatar assistant-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-1c0-2.33 4.67-3.5 7-3.5s7 1.17 7 3.5v1z"/>
                </svg>
              </div>
              <div class="message-content">
                <div class="loading-indicator">正在思考...</div>
              </div>
            </div>

            <div ref="messagesEndRef"></div>
          </div>

          <div class="chat-input-container">
            <div class="quick-templates">
              <button
                v-for="template in quickTemplates"
                :key="template.label"
                class="quick-btn"
                @click="applyTemplate(template)"
              >
                {{ template.label }}
              </button>
            </div>
            <textarea
              v-model="inputValue"
              class="chat-input"
              placeholder="请输入病人信息、症状描述或医疗问题..."
              @keypress="handleKeyPress"
            ></textarea>
            <div class="chat-actions">
              <button v-if="loading" class="cancel-btn" @click="handleCancelGeneration">取消</button>
              <button class="send-btn" :disabled="!inputValue.trim() || loading" @click="handleSendMessage">
                {{ loading ? '发送中...' : '发送' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEmergency" class="modal-overlay" @click.self="showEmergency = false">
      <div class="modal">
        <div class="modal-title">🚨 紧急医疗助手</div>
        <div class="modal-content">
          <p>请选择您遇到的症状，我们将为您提供紧急医疗建议：</p>

          <div class="group-tabs">
            <button
              v-for="(symptoms, group) in emergencyGroups"
              :key="group"
              class="group-tab"
              :class="{ active: selectedGroup === group }"
              @click="selectedGroup = group"
            >
              {{ group }}
            </button>
          </div>

          <div v-if="selectedGroup" class="group-sections">
            <div class="group-section">
              <div class="group-title">{{ selectedGroup }}症状</div>
              <div class="option-list">
                <button
                  v-for="symptom in emergencyGroups[selectedGroup]"
                  :key="symptom"
                  class="option-btn"
                  :class="{ active: selectedSymptoms[selectedGroup]?.includes(symptom) }"
                  @click="toggleSymptom(selectedGroup, symptom)"
                >
                  {{ symptom }}
                </button>
              </div>
            </div>
          </div>

          <div class="note-input">
            <textarea
              v-model="emergencyNote"
              placeholder="请补充其他症状或详细信息..."
            ></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showEmergency = false">取消</button>
          <button class="send-btn" @click="handleEmergencySubmit">获取建议</button>
        </div>
      </div>
    </div>

    <div v-if="showPatientQuery" class="modal-overlay" @click.self="showPatientQuery = false">
      <div class="modal">
        <div class="modal-title">👤 病人信息查询</div>
        <div class="modal-content">
          <p>请输入病人ID以查询病人信息：</p>
          <div class="patient-input">
            <input
              v-model="patientId"
              type="text"
              placeholder="请输入病人ID（如：P00123）"
              @keypress.enter="handlePatientQuerySubmit"
            />
          </div>
          <p class="hint">系统将查询病人的基本信息、既往病史、过敏史、用药记录、近期检查结果和家族史等信息。</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="showPatientQuery = false">取消</button>
          <button class="send-btn" @click="handlePatientQuerySubmit">查询</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  width: 100%;
  background: transparent;
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 48px);
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #1e293b;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background-color: #46c266;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.chat-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-query-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #ffffff;
  color: #46c266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.patient-query-btn:hover {
  background-color: #f0fdf4;
}

.emergency-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #ef4444;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.emergency-btn:hover {
  background-color: #dc2626;
}

.medical-banner {
  padding: 8px 16px;
  background-color: #fef3c7;
  color: #92400e;
  border-bottom: 1px solid #fcd34d;
  font-size: 12px;
  text-align: center;
  font-weight: 400;
}

.chat-main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sessions-list {
  width: 200px;
  background-color: #f9fafb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.sessions-header h3 {
  margin: 0;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.new-session-mini-btn {
  background-color: #46c266;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.new-session-mini-btn:hover {
  background-color: #2f9b52;
}

.sessions-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  background-color: #ffffff;
}

.session-item:hover {
  background-color: #f0fdf4;
  border-color: #46c266;
}

.session-name {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  background-color: transparent;
  color: #374151;
  transition: all 0.2s ease;
}

.session-name:hover,
.session-name:focus {
  background-color: #f0fdf4;
  border-color: #46c266;
}

.session-name.active {
  color: #46c266;
  font-weight: 600;
  background-color: #f0fdf4;
  border-color: #46c266;
}

.session-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.session-item:hover .session-actions {
  opacity: 1;
}

.switch-btn,
.delete-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background-color: #e8f4eb;
  color: #46c266;
  transition: all 0.2s ease;
  font-weight: 500;
}

.switch-btn:hover {
  background-color: #46c266;
  color: white;
}

.switch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.messages-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chat-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.user-avatar {
  background-color: #46c266;
  color: white;
  border: 1px solid #46c266;
}

.assistant-avatar {
  background-color: #f0fdf4;
  border: 1px solid #46c266;
}

.message-content {
  max-width: 90%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  position: relative;
  padding-bottom: 32px;
  padding-right: 40px;
}

.user .message-content {
  background-color: #46c266;
  color: white;
  border-top-right-radius: 2px;
  border: 1px solid #46c266;
}

.assistant .message-content {
  background-color: #f9fafb;
  color: #1e293b;
  border: 1px solid #e5e7eb;
  border-top-left-radius: 2px;
}

.message-time {
  font-size: 11px;
  color: #6b7280;
  margin-top: 6px;
  text-align: right;
  font-weight: 500;
}

.assistant .message-time {
  text-align: left;
}

.message-actions {
  position: absolute;
  bottom: 6px;
  right: 8px;
  display: flex;
  gap: 4px;
  align-items: center;
}

.msg-icon-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: #6b7280;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.msg-icon-btn.copy {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #3b82f6;
}

.msg-icon-btn.copy:hover {
  background-color: #dbeafe;
  border-color: #93c5fd;
}

.msg-icon-btn.regen {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
  color: #22c55e;
}

.msg-icon-btn.regen:hover {
  background-color: #dcfce7;
  border-color: #86efac;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.loading-indicator::after {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #46c266;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chat-input-container {
  padding: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
  border-top: 1px solid #d1fae5;
  box-shadow: 0 -4px 20px rgba(70, 194, 102, 0.1);
  flex-shrink: 0;
}

.quick-templates {
  max-width: 800px;
  margin: 0 auto 12px auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.quick-btn {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: #6b7280;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-btn:hover {
  background-color: #f0fdf4;
  color: #46c266;
  border-color: #46c266;
}

.chat-input {
  width: 100%;
  min-height: 80px;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  color: #1e293b;
  background-color: #ffffff;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  resize: vertical;
  font-family: inherit;
}

.chat-input:hover {
  border-color: #46c266;
}

.chat-input:focus {
  outline: none;
  border-color: #46c266;
  box-shadow: 0 0 0 2px rgba(70, 194, 102, 0.1);
}

.chat-input::placeholder {
  color: #9ca3af;
}

.chat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn,
.send-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  color: #6b7280;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.cancel-btn:hover {
  background-color: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
}

.send-btn {
  background-color: #46c266;
  color: white;
}

.send-btn:hover {
  background-color: #2f9b52;
}

.send-btn:active {
  background-color: #258a45;
}

.send-btn:disabled {
  background-color: #d1fae5;
  cursor: not-allowed;
  color: #9ca3af;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  width: 100%;
  max-width: 520px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.modal-title {
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.modal-content {
  padding: 16px 20px;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
}

.group-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.group-tab {
  padding: 6px 14px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: #6b7280;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-tab:hover {
  background-color: #f0fdf4;
  color: #46c266;
  border-color: #46c266;
}

.group-tab.active {
  background-color: #46c266;
  color: white;
  border-color: #46c266;
}

.group-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-top: 12px;
}

.group-section {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option-btn {
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: #6b7280;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-btn:hover {
  background-color: #f0fdf4;
  color: #46c266;
  border-color: #46c266;
}

.option-btn.active {
  background-color: #46c266;
  color: white;
  border-color: #46c266;
}

.note-input {
  margin-top: 12px;
}

.note-input textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  outline: none;
  transition: all 0.2s ease;
  resize: vertical;
  font-family: inherit;
}

.note-input textarea:focus {
  border-color: #46c266;
  box-shadow: 0 0 0 2px rgba(70, 194, 102, 0.1);
}

.patient-input {
  margin: 16px 0;
}

.patient-input input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #1e293b;
  background-color: #ffffff;
  outline: none;
  transition: all 0.2s ease;
}

.patient-input input:focus {
  border-color: #46c266;
  box-shadow: 0 0 0 2px rgba(70, 194, 102, 0.1);
}

.hint {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  margin-top: 8px;
  font-weight: 400;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 20px 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

@media (max-width: 1400px) {
  .ai-chat-container {
    width: 800px;
    height: 750px;
    max-height: 85vh;
  }
}

@media (max-width: 1200px) {
  .ai-chat-container {
    width: 700px;
    height: 700px;
    max-height: 85vh;
  }
}

@media (max-width: 1024px) {
  .ai-chat-container {
    width: 600px;
    height: 650px;
    max-height: 85vh;
  }
}

@media (max-width: 900px) {
  .ai-chat-container {
    width: 500px;
    height: 600px;
    max-height: 85vh;
  }
}

@media (max-width: 768px) {
  .ai-chat-container {
    width: 95vw;
    height: 80vh;
    max-height: 85vh;
    bottom: 10px;
    right: 2.5vw;
  }

  .chat-main-content {
    flex-direction: column;
  }

  .sessions-list {
    width: 100%;
    height: auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .chat-message {
    max-width: 100%;
  }

  .message-content {
    max-width: 85%;
  }

  .message-avatar {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .ai-chat-container {
    width: 98vw;
    height: 85vh;
    max-height: 90vh;
    bottom: 5px;
    right: 1vw;
  }

  .message-avatar {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}
</style>
