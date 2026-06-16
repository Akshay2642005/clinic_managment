import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { detectSpecialty } from './matchingService';
import { appointmentsApi, patientsApi } from '../../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, any> | null;
  buttons?: { label: string; action: () => void; disabled?: boolean; primary?: boolean }[];
}

interface FlowData {
  department?: string;
  doctorId?: number;
  doctorName?: string;
  date?: string;
  slotId?: number;
  time?: string;
  appointmentId?: number;
  appointmentDetails?: any;
}

type ChatState = 
  | 'IDLE'
  | 'BOOK_HOW'
  | 'BOOK_SYMPTOMS'
  | 'BOOK_SEARCH_DOCTOR'
  | 'BOOK_DEPT'
  | 'BOOK_DOCTOR'
  | 'BOOK_DATE'
  | 'BOOK_TIME'
  | 'BOOK_CONFIRM'
  | 'RESCHEDULE_SELECT'
  | 'RESCHEDULE_DATE'
  | 'RESCHEDULE_TIME'
  | 'RESCHEDULE_CONFIRM'
  | 'CANCEL_SELECT'
  | 'CANCEL_CONFIRM';

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 15);
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('IDLE');
  const [flowData, setFlowDataState] = useState<FlowData>({});
  const flowDataRef = useRef<FlowData>({});

  const setFlowData = (updater: (prev: FlowData) => FlowData) => {
    setFlowDataState(prev => {
      const next = updater(prev);
      flowDataRef.current = next;
      return next;
    });
  };
  
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

  // Initial message
  useEffect(() => {
    if (messages.length === 0) {
      showInitialMenu();
    }
  }, [messages.length]);

  const showInitialMenu = () => {
    setChatState('IDLE');
    setFlowData(() => ({}));
    setMessages(prev => {
      // Remove any trailing buttons from previous messages
      const updatedPrev = prev.map(m => ({ ...m, buttons: undefined }));
      return [...updatedPrev, {
        role: 'assistant',
        content: 'Hello! I\'m your clinic AI assistant. How can I help you today?',
        buttons: [
          { label: '📅 Book Appointment', action: startBookFlow, primary: true },
          { label: '🔄 Reschedule Appointment', action: startRescheduleFlow },
          { label: '❌ Cancel Appointment', action: startCancelFlow }
        ]
      }];
    });
  };

  const removeButtonsFromLastMessage = () => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          buttons: undefined
        };
      }
      return newMessages;
    });
  };

  const appendUserMessage = (text: string) => {
    removeButtonsFromLastMessage();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
  };

  const appendBotMessage = (content: string, buttons?: Message['buttons'], data?: any) => {
    setMessages(prev => [...prev, { role: 'assistant', content, buttons, data }]);
  };

  // --- Flow Actions ---

  // 1. Book Appointment Flow
  const startBookFlow = () => {
    appendUserMessage('📅 Book Appointment');
    setChatState('BOOK_HOW');
    appendBotMessage('How would you like to book your appointment?', [
      { label: 'Describe Symptoms', action: startSymptomsFlow },
      { label: 'Search by Doctor', action: startDoctorSearchFlow }
    ]);
  };

  const startSymptomsFlow = () => {
    appendUserMessage('Describe Symptoms');
    setChatState('BOOK_SYMPTOMS');
    appendBotMessage('Please describe your symptoms.');
  };

  const startDoctorSearchFlow = () => {
    appendUserMessage('Search by Doctor');
    setChatState('BOOK_SEARCH_DOCTOR');
    appendBotMessage('Enter the doctor\'s name.');
  };

  const handleSymptoms = async (text: string) => {
    appendUserMessage(text);
    setInput('');
    setLoading(true);

    try {
      const match = await detectSpecialty(text);

      if (!match.specialty) {
        appendBotMessage("I couldn't determine the appropriate specialist. Please provide more details about your symptoms.");
        return;
      }

      const specialty = match.specialty;
      const docs = await appointmentsApi.getDoctors();
      
      const specialtyLower = specialty.toLowerCase().trim();
      const deptDocs = docs.filter((d: any) => {
        if (!d.specialization) return false;
        const specLower = d.specialization.toLowerCase().trim();
        return specLower.includes(specialtyLower) || 
               specialtyLower.includes(specLower) ||
               (specialtyLower.includes('cardio') && specLower.includes('cardio')) ||
               (specialtyLower.includes('derma') && specLower.includes('derma')) ||
               (specialtyLower.includes('ortho') && specLower.includes('ortho')) ||
               (specialtyLower.includes('physician') && specLower.includes('general')) ||
               (specialtyLower.includes('general') && specLower.includes('physician')) ||
               (specialtyLower.includes('ent') && specLower.includes('ent'));
      });

      if (deptDocs.length === 0) {
        appendBotMessage(`I recommend the ${specialty} department, but no doctors are currently available for this specialty.`);
        setChatState('IDLE');
      } else {
        setFlowData(prev => ({ ...prev, department: specialty }));
        setChatState('BOOK_DOCTOR');
        const reason = match.reason ? ` — ${match.reason}` : '';
        appendBotMessage(`I recommend the **${specialty}** department${reason}. Please select a doctor.`, deptDocs.map((doc: any) => ({
          label: `Dr. ${doc.first_name} ${doc.last_name}${doc.is_active === false ? ' (Unavailable)' : ''}`,
          action: () => selectDoctor(doc.doctor_id, `Dr. ${doc.first_name} ${doc.last_name}`),
          disabled: doc.is_active === false
        })));
      }
    } catch (error: any) {
      console.error('Symptom matching error:', error);
      appendBotMessage("I couldn't determine the appropriate specialist. Please try again or use 'Search by Doctor'.");
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSearch = async (name: string) => {
    appendUserMessage(name);
    setInput('');
    setLoading(true);

    try {
      const docs = await appointmentsApi.getDoctors();
      const searchLower = name.toLowerCase();
      const matchingDocs = docs.filter((d: any) => {
        const fullName = `dr. ${d.first_name} ${d.last_name}`.toLowerCase();
        return fullName.includes(searchLower) || d.first_name.toLowerCase().includes(searchLower) || d.last_name.toLowerCase().includes(searchLower);
      });

      if (matchingDocs.length === 0) {
        appendBotMessage('No doctor found matching your search.');
      } else if (matchingDocs.length === 1) {
        const doc = matchingDocs[0];
        const docName = `Dr. ${doc.first_name} ${doc.last_name}`;
        selectDoctor(doc.doctor_id, docName);
      } else {
        setChatState('BOOK_DOCTOR');
        appendBotMessage('Please select a doctor.', matchingDocs.map((doc: any) => ({
          label: `Dr. ${doc.first_name} ${doc.last_name}`,
          action: () => selectDoctor(doc.doctor_id, `Dr. ${doc.first_name} ${doc.last_name}`)
        })));
      }
    } catch {
      appendBotMessage('Failed to search doctors. Please try again.');
      showInitialMenu();
    } finally {
      setLoading(false);
    }
  };

  const selectDoctor = (doctorId: number, doctorName: string) => {
    appendUserMessage(doctorName);
    setFlowData(prev => ({ ...prev, doctorId, doctorName }));
    setChatState('BOOK_DATE');
    
    // Generate next 7 days for selection
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    appendBotMessage('Please select a date.', dates.map(date => ({
      label: date,
      action: () => selectDate(date, doctorId)
    })));
  };

  const selectDate = async (date: string, doctorId: number) => {
    appendUserMessage(date);
    setFlowData(prev => ({ ...prev, date }));
    setChatState('BOOK_TIME');
    setLoading(true);
    
    try {
      console.log("Loading slots for:", {
        doctorId,
        selectedDate: date
      });
      const slotsResponse = await appointmentsApi.getAvailableSlots(doctorId, date);
      console.log("Time slot response:", slotsResponse);
      
      const slots = Array.isArray(slotsResponse) ? slotsResponse : (slotsResponse as any).slots || [];

      if (slots.length === 0) {
        appendBotMessage('No time slots available for the selected date.', [
          { label: 'Try another date', action: () => selectDoctor(doctorId, flowDataRef.current.doctorName!) },
          { label: 'Cancel', action: showInitialMenu }
        ]);
        return;
      }
      
      appendBotMessage('Please select a time slot.', slots.map((s: any) => ({
        label: s.slot_time.slice(11, 16),
        action: () => selectTime(s.slot_id, s.slot_time.slice(11, 16))
      })));
    } catch (error: any) {
      console.error("Time slot loading error:", error);
      if (error?.response?.status === 404) {
        appendBotMessage('No time slots available for the selected date.', [
          { label: 'Try another date', action: () => selectDoctor(doctorId, flowDataRef.current.doctorName!) },
          { label: 'Cancel', action: showInitialMenu }
        ]);
      } else {
        appendBotMessage('Unable to load time slots. Please try again later.');
        showInitialMenu();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectTime = (slotId: number, time: string) => {
    appendUserMessage(time);
    setFlowData(prev => ({ ...prev, slotId, time }));
    setChatState('BOOK_CONFIRM');
    
    const selectedDoctor = flowDataRef.current.doctorName;
    const selectedDate = flowDataRef.current.date;
    const selectedTime = time;

    if (!selectedDoctor || !selectedDate || !selectedTime) {
      appendBotMessage("Some appointment details are missing. Please start the booking process again.");
      return;
    }

    appendBotMessage(`Confirm appointment with ${selectedDoctor} on ${selectedDate} at ${selectedTime}?`, [
      { label: '✅ Confirm', action: confirmBooking, primary: true },
      { label: '❌ Cancel', action: showInitialMenu }
    ]);
  };

  const confirmBooking = async () => {
    appendUserMessage('✅ Confirm');
    const user = getCurrentUser();
    if (!user?.patient_id) {
      appendBotMessage('You must be logged in as a patient to book an appointment.');
      showInitialMenu();
      return;
    }
    
    setLoading(true);
    try {
      const payload = { patient_id: user.patient_id, slot_id: flowDataRef.current.slotId };
      console.log("Booking payload:", payload);
      
      await appointmentsApi.bookAppointment(user.patient_id, flowDataRef.current.slotId!);
      appendBotMessage(`Appointment confirmed for ${flowDataRef.current.date} at ${flowDataRef.current.time}.`);
      window.dispatchEvent(new CustomEvent('appointment-changed'));
    } catch (error: any) {
      console.error("Booking error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unknown error occurred";
      appendBotMessage(`Failed to book appointment: ${errorMessage}`);
    } finally {
      setLoading(false);
      setTimeout(showInitialMenu, 2000);
    }
  };

  // 2. Reschedule Flow
  const startRescheduleFlow = async () => {
    appendUserMessage('🔄 Reschedule Appointment');
    const user = getCurrentUser();
    if (!user?.patient_id) {
      appendBotMessage('You must be logged in as a patient to manage appointments.');
      showInitialMenu();
      return;
    }
    
    setChatState('RESCHEDULE_SELECT');
    setLoading(true);
    try {
      const patient = await patientsApi.searchById(user.patient_id);
      const upcoming = patient?.appointments?.filter(a => ['scheduled', 'confirmed'].includes(a.status.toLowerCase())) || [];
      
      if (upcoming.length === 0) {
        appendBotMessage('You have no upcoming appointments to reschedule.');
        setTimeout(showInitialMenu, 2000);
        return;
      }
      
      appendBotMessage('Please select the appointment you want to reschedule.', upcoming.map(app => {
        // @ts-ignore
        const doctorName = app.doctor ? `Dr. ${app.doctor.first_name} ${app.doctor.last_name}` : app.doctor_name || 'Doctor';
        return {
          label: `${doctorName} on ${app.slot_time.slice(0, 16).replace('T', ' ')}`,
          action: () => selectAppointmentToReschedule(app)
        };
      }));
    } catch {
      appendBotMessage('Failed to load appointments.');
      showInitialMenu();
    } finally {
      setLoading(false);
    }
  };

  const selectAppointmentToReschedule = (app: any) => {
    console.log("Appointment selected:", app);
    console.log("Doctor ID:", app.doctor?.doctor_id || app.doctor_id);
    
    const doctorName = app.doctor ? `Dr. ${app.doctor.first_name} ${app.doctor.last_name}` : app.doctor_name || 'Doctor';
    const doctorId = app.doctor?.doctor_id || app.doctor_id;

    appendUserMessage(`Reschedule: ${app.slot_time?.slice(0, 16).replace('T', ' ') || app.appointment_date || 'Appointment'}`);
    setFlowData(prev => ({ ...prev, appointmentId: app.appointment_id, doctorId, doctorName }));
    setChatState('RESCHEDULE_DATE');
    
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    appendBotMessage('Please select a new date.', dates.map(date => ({
      label: date,
      action: () => selectRescheduleDate(date, doctorId)
    })));
  };

  const selectRescheduleDate = async (date: string, doctorId: number) => {
    appendUserMessage(date);
    setFlowData(prev => ({ ...prev, date }));
    setChatState('RESCHEDULE_TIME');
    
    if (!doctorId) {
      console.error("Missing doctorId during reschedule");
      appendBotMessage("Unable to load available time slots. Missing doctor information.");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Loading slots with:", {
        doctorId,
        selectedDate: date
      });
      const slotsResponse = await appointmentsApi.getAvailableSlots(doctorId, date);
      console.log("Time slot response:", slotsResponse);
      
      const slots = Array.isArray(slotsResponse) ? slotsResponse : (slotsResponse as any).slots || [];

      if (slots.length === 0) {
        appendBotMessage('No time slots available for the selected date.', [
          { label: 'Try another date', action: () => selectAppointmentToReschedule({ doctor_id: doctorId, doctor_name: flowDataRef.current.doctorName, appointment_id: flowDataRef.current.appointmentId }) },
          { label: 'Cancel', action: showInitialMenu }
        ]);
        return;
      }
      
      appendBotMessage('Please select a new time slot.', slots.map((s: any) => ({
        label: s.slot_time.slice(11, 16),
        action: () => selectRescheduleTime(s.slot_id, s.slot_time.slice(11, 16))
      })));
    } catch (error: any) {
      console.error("Time slot loading error:", error);
      if (error?.response?.status === 404) {
        appendBotMessage('No time slots available for the selected date.', [
          { label: 'Try another date', action: () => selectAppointmentToReschedule({ doctor_id: doctorId, doctor_name: flowDataRef.current.doctorName, appointment_id: flowDataRef.current.appointmentId }) },
          { label: 'Cancel', action: showInitialMenu }
        ]);
      } else {
        appendBotMessage('Unable to load time slots. Please try again later.');
        showInitialMenu();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectRescheduleTime = (slotId: number, time: string) => {
    appendUserMessage(time);
    setFlowData(prev => ({ ...prev, slotId, time }));
    setChatState('RESCHEDULE_CONFIRM');
    
    appendBotMessage(`Confirm rescheduling to ${flowData.date} at ${time}?`, [
      { label: '✅ Confirm', action: confirmReschedule, primary: true },
      { label: '❌ Cancel', action: showInitialMenu }
    ]);
  };

  const confirmReschedule = async () => {
    appendUserMessage('✅ Confirm');
    setLoading(true);
    try {
      const payload = { appointment_id: flowDataRef.current.appointmentId, new_slot_id: flowDataRef.current.slotId };
      console.log("Reschedule payload:", payload);
      
      await appointmentsApi.rescheduleAppointment(flowDataRef.current.appointmentId!, flowDataRef.current.slotId!);
      appendBotMessage(`Appointment successfully rescheduled to ${flowDataRef.current.date} at ${flowDataRef.current.time}.`);
      window.dispatchEvent(new CustomEvent('appointment-changed'));
    } catch (error: any) {
      console.error("Rescheduling error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unknown error occurred";
      appendBotMessage(`Failed to reschedule: ${errorMessage}`);
    } finally {
      setLoading(false);
      setTimeout(showInitialMenu, 2000);
    }
  };

  // 3. Cancel Flow
  const startCancelFlow = async () => {
    appendUserMessage('❌ Cancel Appointment');
    const user = getCurrentUser();
    if (!user?.patient_id) {
      appendBotMessage('You must be logged in as a patient to manage appointments.');
      showInitialMenu();
      return;
    }
    
    setChatState('CANCEL_SELECT');
    setLoading(true);
    try {
      const patient = await patientsApi.searchById(user.patient_id);
      const upcoming = patient?.appointments?.filter(a => ['scheduled', 'confirmed'].includes(a.status.toLowerCase())) || [];
      
      if (upcoming.length === 0) {
        appendBotMessage('You have no upcoming appointments to cancel.');
        setTimeout(showInitialMenu, 2000);
        return;
      }
      
      appendBotMessage('Please select the appointment you want to cancel.', upcoming.map(app => {
        // @ts-ignore
        const doctorName = app.doctor ? `Dr. ${app.doctor.first_name} ${app.doctor.last_name}` : app.doctor_name || 'Doctor';
        return {
          label: `${doctorName} on ${app.slot_time.slice(0, 16).replace('T', ' ')}`,
          action: () => selectAppointmentToCancel(app)
        };
      }));
    } catch {
      appendBotMessage('Failed to load appointments.');
      showInitialMenu();
    } finally {
      setLoading(false);
    }
  };

  const selectAppointmentToCancel = (app: any) => {
    appendUserMessage(`Cancel: ${app.slot_time.slice(0, 16).replace('T', ' ')}`);
    setFlowData(prev => ({ ...prev, appointmentId: app.appointment_id }));
    setChatState('CANCEL_CONFIRM');
    
    appendBotMessage('Are you sure you want to cancel this appointment?', [
      { label: 'Yes, Cancel Appointment', action: confirmCancel, primary: true },
      { label: 'No, Keep Appointment', action: showInitialMenu }
    ]);
  };

  const confirmCancel = async () => {
    appendUserMessage('Yes, Cancel Appointment');
    setLoading(true);
    try {
      const payload = { appointment_id: flowDataRef.current.appointmentId };
      console.log("Cancel payload:", payload);
      
      await appointmentsApi.cancelAppointment(flowDataRef.current.appointmentId!);
      appendBotMessage('Appointment has been cancelled.');
      window.dispatchEvent(new CustomEvent('appointment-changed'));
    } catch (error: any) {
      console.error("Cancellation error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unknown error occurred";
      appendBotMessage(`Failed to cancel: ${errorMessage}`);
    } finally {
      setLoading(false);
      setTimeout(showInitialMenu, 2000);
    }
  };

  // Free text fallback
  const sendFreeTextMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    if (chatState === 'BOOK_SYMPTOMS') {
      handleSymptoms(text);
      return;
    }
    if (chatState === 'BOOK_SEARCH_DOCTOR') {
      handleDoctorSearch(text);
      return;
    }

    // Reset state if they type manually
    setChatState('IDLE');
    setFlowData(() => ({}));
    
    appendUserMessage(text);
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
      appendBotMessage(content, undefined, data.data || null);

      if (/✅|confirmed|cancelled|rescheduled/i.test(content)) {
        window.dispatchEvent(new CustomEvent('appointment-changed'));
      }
      
      // If we are back to idle, maybe show menu again if context is empty? 
      // We will let the user explicitly ask or we can re-show menu if we want.
      // For now, let the bot's free text response stand.
    } catch {
      appendBotMessage('Sorry, I\'m having trouble connecting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFreeTextMessage(input);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isOpen && (
        <div className="fixed top-0 right-0 z-40 w-96 h-full bg-white shadow-2xl flex flex-col border-l border-gray-200">
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

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} data={msg.data} buttons={msg.buttons} />
            ))}

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
                onClick={() => sendFreeTextMessage(input)}
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
