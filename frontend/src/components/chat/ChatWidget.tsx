import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, any> | null;
}

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 15);
}

const SUGGESTIONS = [
  'I need to book an appointment',
  'What are my appointments?',
  'Cancel my appointment',
  'I have a fever and cough',
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your clinic AI assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getCurrentUser = useCallback(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  const getUserRole = useCallback((): string => {
    const user = getCurrentUser();
    if (!user) return 'patient';
    if (user.role === 'staff') return 'staff';
    if (user.doctor_id) return 'doctor';
    return 'patient';
  }, [getCurrentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const currentUser = getCurrentUser();

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId.current,
          user_context: {
            role: getUserRole(),
            user_id: currentUser?.patient_id || currentUser?.doctor_id || null,
            name: currentUser?.first_name || currentUser?.staff_name || '',
            phone: currentUser?.phone || '',
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const content = data.response || 'Sorry, I couldn\'t process that.';
      const assistantMsg: Message = {
        role: 'assistant',
        content,
        data: data.data || null,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Signal dashboards to refresh after appointment changes
      if (/✅|confirmed|cancelled|rescheduled/i.test(content)) {
        window.dispatchEvent(new CustomEvent('appointment-changed'));
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Side panel */}
      {isOpen && (
        <div className="fixed top-0 right-0 z-40 w-96 h-full bg-white shadow-2xl flex flex-col border-l border-gray-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <Bot size={24} />
            <div>
              <h3 className="font-bold text-sm">AI Assistant</h3>
              <p className="text-xs text-blue-100 capitalize">{getUserRole()} portal</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-auto text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} data={msg.data} />
            ))}

            {messages.length === 1 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">Quick actions</p>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl px-4 py-2.5 transition-colors border border-gray-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
