interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, any> | null;
  buttons?: { label: string; action: () => void; disabled?: boolean; primary?: boolean }[];
}

export default function ChatMessage({ role, content, data, buttons }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {data?.appointments && (
          <div className="mt-3 space-y-2 border-t border-inherit pt-3 opacity-90">
            {data.appointments.map((a: any, i: number) => (
              <div key={i} className="text-xs bg-white/20 rounded-lg p-2">
                <div className="font-semibold">{a.patient_name || a.doctor_name || 'Appointment'}</div>
                <div>{a.slot_time?.slice(0, 16).replace('T', ' ') || ''}</div>
                <div className="opacity-75">{a.status}</div>
              </div>
            ))}
          </div>
        )}

        {data?.checklist && (
          <div className="mt-3 border-t border-inherit pt-3">
            {Object.values(data.checklist.checklist || {}).map((item: any, i: number) => (
              <div key={i} className="text-xs mb-2">
                <div className="font-semibold">{item.label}</div>
                <div className="opacity-90 whitespace-pre-wrap">{item.content}</div>
              </div>
            ))}
            {data.checklist.disclaimer && (
              <div className="text-xs italic opacity-70 mt-2">{data.checklist.disclaimer}</div>
            )}
          </div>
        )}

        {data?.doctors && (
          <div className="mt-3 space-y-1 border-t border-inherit pt-3">
            {data.doctors.map((d: any, i: number) => (
              <div key={i} className="text-xs">Dr. {d.first_name} {d.last_name} — {d.specialization}</div>
            ))}
          </div>
        )}

        {data?.slots && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-inherit pt-3">
            {data.slots.map((s: any, i: number) => (
              <span key={i} className="text-xs bg-white/20 rounded px-2 py-1">
                {s.slot_time?.slice(11, 16)}
              </span>
            ))}
          </div>
        )}

        {data?.appointment && (
          <div className="mt-3 text-xs border-t border-inherit pt-3">
            <div className="font-semibold">Appointment #{data.appointment.appointment_id}</div>
            <div>Status: {data.appointment.status}</div>
          </div>
        )}

        {buttons && buttons.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-inherit">
            {buttons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                disabled={btn.disabled}
                className={`text-sm px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center ${
                  btn.disabled 
                    ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-500 border border-gray-200' 
                    : btn.primary
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md border border-blue-600'
                      : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
