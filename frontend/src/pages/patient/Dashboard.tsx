import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, LogOut, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { patientsApi } from '../../api/client';
import type { PatientOut, AppointmentOut } from '../../types/api';

function AppointmentCard({ appt }: { appt: AppointmentOut }) {
  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-green-50 text-green-700 border-green-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
  };
  const StatusIcon = appt.status === 'completed' ? CheckCircle : appt.status === 'cancelled' ? XCircle : Clock;

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
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
      <p className="text-xs text-gray-400 whitespace-nowrap">
        {new Date(appt.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const stored = localStorage.getItem('currentUser');
  const patient: PatientOut | null = stored ? JSON.parse(stored) : null;

  const [appointments, setAppointments] = useState<AppointmentOut[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  useEffect(() => {
    if (!patient) {
      navigate('/');
      return;
    }
    // Fetch this patient's appointments using their phone
    patientsApi.searchByPhone(patient.phone).then((data) => {
      setAppointments(data?.appointments ?? []);
      setLoadingAppts(false);
    });
  }, []);

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
            <div className="py-10 text-center text-gray-400 text-sm">Loading appointments…</div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
              <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No upcoming appointments.</p>
              <p className="text-xs text-gray-400 mt-1">Use the button above to book one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => <AppointmentCard key={a.appointment_id} appt={a} />)}
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

          {loadingAppts ? null : history.length === 0 ? (
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
    </div>
  );
}
