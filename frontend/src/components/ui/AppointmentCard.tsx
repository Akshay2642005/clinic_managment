import { useState, useEffect } from 'react';
import { User, X, AlertTriangle, CalendarDays } from 'lucide-react';
import { appointmentsApi } from '../../api/client';

interface AppointmentCardProps {
  appointmentId: number;
  doctorId: number;
  rawDate: string;
  date: string;
  time: string;
  patient: string;
  doctor: string;
  onRefresh: () => void;
}

export default function AppointmentCard({ appointmentId, doctorId, rawDate, date, time, patient, doctor, onRefresh }: AppointmentCardProps) {
  const [month, day] = date.split(' ');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [realSlots, setRealSlots] = useState<any[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState(rawDate);

  useEffect(() => {
    if (showRescheduleModal) {
      appointmentsApi.getAvailableSlots(doctorId, rescheduleDate)
        .then(data => setRealSlots(data))
        .catch(console.error);
    }
  }, [showRescheduleModal, doctorId, rescheduleDate]);

  const handleCancel = async () => {
    try {
      await appointmentsApi.cancelAppointment(appointmentId);
      setShowCancelModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;
    try {
      await appointmentsApi.rescheduleAppointment(appointmentId, selectedSlot);
      setShowRescheduleModal(false);
      setSelectedSlot(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-50 flex items-center justify-between relative">
        <div className="flex items-center gap-6">
          <div className="bg-[#EBF1FF] text-[#1A56DB] rounded-lg p-2 w-14 h-14 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider">{month}</span>
            <span className="text-lg font-bold leading-none">{day}</span>
          </div>

          <div className="flex flex-col">
            <div className="text-xs font-bold text-yellow-600 tracking-wider mb-1">
              {time}
            </div>
            <div className="text-lg font-bold font-serif mb-1" style={{ color: '#111827' }}>
              {patient}
            </div>
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <User size={12} className="text-gray-400" />
              Assigned: {doctor}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold tracking-wider">
          <button
            onClick={() => {
              setRescheduleDate(rawDate);
              setShowRescheduleModal(true);
            }}
            className="text-[#1A56DB] hover:bg-blue-50 hover:text-blue-800 px-3 py-2 rounded-lg transition-all uppercase cursor-pointer"
          >
            Reschedule
          </button>
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-red-500 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded-lg transition-all uppercase cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-50 p-2 rounded-full">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Appointment</h3>
            </div>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Are you sure you want to cancel the appointment for <span className="font-semibold text-gray-900">{patient}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold tracking-wide uppercase transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold tracking-wide uppercase transition-colors shadow-sm"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 font-serif">Reschedule</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Patient</p>
              <p className="font-semibold text-gray-900">{patient}</p>
              <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                Current slot: <span className="font-bold text-gray-900">{time}</span> on {month} {day}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700 tracking-wide uppercase">Available Slots</p>

              <div className="flex items-center text-xs font-bold tracking-wider text-[#1A56DB] bg-blue-50 px-3 py-1.5 rounded-lg relative hover:bg-blue-100 transition-colors cursor-pointer">
                {new Date(rescheduleDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }).toUpperCase()}
                <CalendarDays size={14} className="ml-2 mb-[1px]" />
                <input
                  type="date"
                  value={rescheduleDate}
                  onClick={(e) => {
                    try {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setRescheduleDate(e.target.value);
                      setSelectedSlot(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-8">
              {realSlots.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500 py-4 text-sm">No available slots for this date.</div>
              ) : (
                realSlots.map(slot => {
                  const slotDate = new Date(slot.slot_time);
                  const formattedSlotTime = slotDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <button
                      key={slot.slot_id}
                      onClick={() => setSelectedSlot(slot.slot_id)}
                      className={`py-2.5 px-2 text-sm rounded-xl border font-bold transition-all ${selectedSlot === slot.slot_id
                          ? 'bg-[#1A56DB] text-white border-[#1A56DB] shadow-md scale-105'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A56DB] hover:text-[#1A56DB] hover:bg-blue-50'
                        }`}
                    >
                      {formattedSlotTime}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedSlot(null);
                }}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold tracking-wide uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedSlot}
                onClick={handleReschedule}
                className="px-5 py-2.5 bg-[#1A56DB] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
