import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, LogOut, Clock, CheckCircle, XCircle, Calendar, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { patientsApi, appointmentsApi } from '../../api/client';
import type { PatientOut, AppointmentOut } from '../../types/api';
import { ChatWidget } from '../../components/chat';

function AppointmentCard({ appt, onCancel }: { appt: AppointmentOut, onCancel?: (id: number) => void }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-green-50 text-green-700 border-green-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
  };
  const StatusIcon = appt.status === 'completed' ? CheckCircle : appt.status === 'cancelled' ? XCircle : Clock;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor[appt.status] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}>
          <StatusIcon size={12} />
          {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {appt.doctor
              ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}`
              : 'Doctor not assigned'}
          </p>
          {appt.doctor?.specialization && (
            <p className="text-xs text-gray-500 mt-0.5">{appt.doctor.specialization}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Appointment #{appt.appointment_id} · Slot #{appt.slot_id}
          </p>
        </div>

        {appt.status === 'scheduled' && (
          <div className="flex flex-col gap-2 shrink-0 ml-4 mr-2">
            <button
              onClick={() => navigate('/patient/book', { state: { rescheduleApptId: appt.appointment_id } })}
              className="flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-semibold transition-colors"
            >
              <Edit2 size={12} /> Reschedule
            </button>
            <button
              onClick={() => onCancel && onCancel(appt.appointment_id)}
              className="flex items-center justify-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md font-semibold transition-colors"
            >
              <Trash2 size={12} /> Cancel
            </button>
          </div>
        )}

        <div className="text-right flex flex-col justify-center items-end gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {new Date(appt.slot_time || appt.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {new Date(appt.slot_time || appt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
          {appt.message && (
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 transition-colors border border-blue-100 shadow-sm"
              title="View Pre-Visit Preparation"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && appt.message && (
        <div className="border-t border-gray-100 bg-blue-50/40 p-5 animate-fade-in space-y-3">
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Reason for visit:</span> "{appt.message}"
          </div>
          
          {appt.previsit_tips && (
            <div>
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Pre-Visit Preparation</h3>
              <div className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                {appt.previsit_tips.replace("Pre-Visit Preparation\n", "")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const stored = localStorage.getItem('currentUser');
  const patient: PatientOut | null = stored ? JSON.parse(stored) : null;

  const [appointments, setAppointments] = useState<AppointmentOut[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAppointments = () => {
    if (!patient) return;
    setLoadingAppts(true);
    setFetchError(null);
    patientsApi.searchByPhone(patient.phone)
      .then((data) => {
        setAppointments(data?.appointments ?? []);
        setLoadingAppts(false);
      })
      .catch((err) => {
        console.error("Failed to fetch appointments:", err);
        setFetchError("Unable to load your appointments. Please try again later.");
        setLoadingAppts(false);
      });
  };

  useEffect(() => {
    if (!patient) {
      navigate('/');
      return;
    }
    fetchAppointments();

    const onChanged = () => fetchAppointments();
    window.addEventListener('appointment-changed', onChanged);
    return () => window.removeEventListener('appointment-changed', onChanged);
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentsApi.cancelAppointment(id);
      fetchAppointments();
    } catch {
      alert('Failed to cancel appointment.');
    }
  };

  const upcoming = appointments.filter((a) => a.status === 'scheduled');
  const history = appointments.filter((a) => a.status !== 'scheduled');

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">

      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow">
            <span className="text-white text-sm font-bold">
              {patient.first_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {patient.first_name} {patient.last_name ?? ''}
            </p>
            <p className="text-xs text-gray-500">{patient.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Welcome + Book Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, {patient.first_name}! 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">Here are your appointments.</p>
          </div>
          <button
            onClick={() => navigate('/patient/book')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-200 transition-all hover:scale-105 active:scale-95"
          >
            <CalendarPlus size={18} />
            Book Appointment
          </button>
        </div>

        {/* Upcoming Appointments */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-500" />
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Upcoming</h2>
            {upcoming.length > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                {upcoming.length}
              </span>
            )}
          </div>

          {loadingAppts ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 text-sm">
              <span className="w-8 h-8 mb-3 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
              Loading appointments…
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm font-semibold text-red-600">{fetchError}</p>
              <button onClick={fetchAppointments} className="mt-3 text-xs bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-4 py-2 rounded-lg transition-colors">Try Again</button>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
              <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No upcoming appointments.</p>
              <p className="text-xs text-gray-400 mt-1">Use the button above to book one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => <AppointmentCard key={a.appointment_id} appt={a} onCancel={handleCancel} />)}
            </div>
          )}
        </section>

        {/* Appointment History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-green-500" />
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">History</h2>
            {history.length > 0 && (
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>

          {loadingAppts ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 text-sm">
              <span className="w-8 h-8 mb-3 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin"></span>
              Loading history…
            </div>
          ) : fetchError ? null : history.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
              <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No appointment history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((a) => <AppointmentCard key={a.appointment_id} appt={a} />)}
            </div>
          )}
        </section>

      </main>
      <ChatWidget />
    </div>
  );
}
