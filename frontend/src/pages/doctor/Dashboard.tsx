import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, LogOut, Clock, CheckCircle, Search, User, Settings, X } from 'lucide-react';
import { doctorApi, patientsApi } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// Temporary types until backend sync if missing
interface Doctor {
  doctor_id: number;
  first_name: string;
  last_name: string | null;
  specialization: string | null;
  phone: string | null;
}

interface DoctorAppointment {
  appointment_id: number;
  slot_time: string;
  status: string;
  patient: {
    patient_id: number;
    first_name: string;
    last_name: string | null;
    phone: string | null;
  };
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const stored = localStorage.getItem('currentUser');
  const doctor: Doctor | null = stored ? JSON.parse(stored) : null;

  const [activeTab, setActiveTab] = useState<'today' | 'patientSearch' | 'dateSearch'>('today');

  const [todayAppointments, setTodayAppointments] = useState<DoctorAppointment[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  const [searchPatientId, setSearchPatientId] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<any | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [patientError, setPatientError] = useState('');

  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateAppointments, setDateAppointments] = useState<DoctorAppointment[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);

  const [publishing, setPublishing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    day_of_week: 0,
    start_time: '09:00:00',
    end_time: '17:00:00',
    slot_duration: 30
  });
  const [modalLoading, setModalLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  useEffect(() => {
    if (!doctor || !doctor.doctor_id) {
      navigate('/');
      return;
    }
    // Fetch today's appointments
    if (activeTab === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setLoadingToday(true);
      doctorApi.searchAppointments(doctor.doctor_id, todayStr)
        .then(data => {
          setTodayAppointments(data.appointments || []);
        })
        .catch(() => setTodayAppointments([]))
        .finally(() => setLoadingToday(false));
    }
  }, [activeTab]);

  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPatientId) return;
    setLoadingPatient(true);
    setPatientError('');
    setSearchedPatient(null);
    try {
      const patient = await patientsApi.searchById(Number(searchPatientId));
      if (patient) {
        setSearchedPatient(patient);
      } else {
        setPatientError('No patient found with this ID.');
      }
    } catch {
      setPatientError('Error searching for patient.');
    } finally {
      setLoadingPatient(false);
    }
  };

  const handleSearchDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDate || !doctor) return;
    setLoadingDate(true);
    try {
      const data = await doctorApi.searchAppointments(doctor.doctor_id, searchDate);
      setDateAppointments(data.appointments || []);
    } catch {
      setDateAppointments([]);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!doctor) return;
    setModalLoading(true);
    try {
      // 1. Upsert config
      await doctorApi.createSchedule(doctor.doctor_id, scheduleConfig);
      // 2. Rebuild slots
      await doctorApi.updateSchedule(doctor.doctor_id, scheduleConfig);
      
      alert('Schedule configured and slots generated successfully!');
      setIsModalOpen(false);
      
      // Refresh today
      if (activeTab === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        setLoadingToday(true);
        const data = await doctorApi.searchAppointments(doctor.doctor_id, todayStr);
        setTodayAppointments(data.appointments || []);
        setLoadingToday(false);
      }
    } catch {
      alert('Failed to update schedule. Check your inputs.');
    } finally {
      setModalLoading(false);
    }
  };

  const renderAppointmentCard = (appt: any, type: 'doctor' | 'patient' = 'doctor') => {
    const isCompleted = appt.status === 'completed';
    return (
      <div key={appt.appointment_id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isCompleted ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {isCompleted ? <CheckCircle size={12} /> : <Clock size={12} />}
          {appt.status.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {type === 'doctor' && appt.patient ? (
              `${appt.patient.first_name} ${appt.patient.last_name || ''}`
            ) : type === 'patient' && appt.doctor ? (
              `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name || ''}`
            ) : 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {type === 'doctor' && appt.patient?.phone ? `📞 ${appt.patient.phone}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {appt.slot_time ? new Date(appt.slot_time).toLocaleString('en-IN') : `Appt #${appt.appointment_id}`}
          </p>
        </div>
      </div>
    );
  };

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
      <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center shadow">
            <span className="text-white text-sm font-bold">
              {doctor.first_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Dr. {doctor.first_name} {doctor.last_name ?? ''}
            </p>
            <p className="text-xs text-gray-500">{doctor.specialization || 'Doctor'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your schedule and patients.</p>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 text-[#2563eb] border-[#2563eb] hover:bg-blue-50" 
            onClick={() => setIsModalOpen(true)}
          >
            <Settings size={16} /> Manage Schedule
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'today' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Today's Schedule
          </button>
          <button
            onClick={() => setActiveTab('patientSearch')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'patientSearch' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Search Patient
          </button>
          <button
            onClick={() => setActiveTab('dateSearch')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'dateSearch' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Search by Date
          </button>
        </div>

        {/* Tab Content */}
        <Card className="p-6 border-0 shadow-md bg-white">
          
          {/* TODAY TAB */}
          {activeTab === 'today' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-[#2563eb]" size={20} /> Today's Appointments
              </h2>
              {loadingToday ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading your schedule...</div>
              ) : todayAppointments.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <CalendarIcon size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No appointments scheduled for today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayAppointments.map(appt => renderAppointmentCard(appt, 'doctor'))}
                </div>
              )}
            </div>
          )}

          {/* PATIENT SEARCH TAB */}
          {activeTab === 'patientSearch' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="text-[#2563eb]" size={20} /> Search Patient by ID
              </h2>
              <form onSubmit={handleSearchPatient} className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Enter Patient ID"
                  value={searchPatientId}
                  onChange={(e) => setSearchPatientId(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" disabled={loadingPatient || !searchPatientId}>
                  <Search size={16} className="mr-2" /> Search
                </Button>
              </form>

              {patientError && <p className="text-sm text-red-500">{patientError}</p>}
              
              {searchedPatient && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {searchedPatient.first_name} {searchedPatient.last_name || ''}
                    </h3>
                    <p className="text-sm text-gray-500">Phone: {searchedPatient.phone} | Gender: {searchedPatient.gender || 'N/A'}</p>
                  </div>
                  
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Appointment History</h4>
                  {searchedPatient.appointments?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchedPatient.appointments.map((appt: any) => renderAppointmentCard(appt, 'patient'))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No appointments found for this patient.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DATE SEARCH TAB */}
          {activeTab === 'dateSearch' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="text-[#2563eb]" size={20} /> Search Appointments by Date
              </h2>
              <form onSubmit={handleSearchDate} className="flex gap-3">
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" disabled={loadingDate || !searchDate}>
                  <Search size={16} className="mr-2" /> Fetch Schedule
                </Button>
              </form>

              {loadingDate ? (
                <div className="py-10 text-center text-sm text-gray-400">Loading schedule...</div>
              ) : dateAppointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {dateAppointments.map(appt => renderAppointmentCard(appt, 'doctor'))}
                </div>
              ) : (
                searchDate && !loadingDate && (
                  <p className="text-sm text-gray-500 mt-6 italic">No appointments scheduled for {searchDate}.</p>
                )
              )}
            </div>
          )}
        </Card>
      </main>

      {/* Schedule Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Manage Schedule</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Day of the Week</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none"
                  value={scheduleConfig.day_of_week}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, day_of_week: Number(e.target.value)})}
                >
                  <option value={0}>Monday</option>
                  <option value={1}>Tuesday</option>
                  <option value={2}>Wednesday</option>
                  <option value={3}>Thursday</option>
                  <option value={4}>Friday</option>
                  <option value={5}>Saturday</option>
                  <option value={6}>Sunday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Start Time</label>
                  <Input 
                    type="time" 
                    step="1"
                    value={scheduleConfig.start_time} 
                    onChange={(e) => setScheduleConfig({...scheduleConfig, start_time: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">End Time</label>
                  <Input 
                    type="time" 
                    step="1"
                    value={scheduleConfig.end_time} 
                    onChange={(e) => setScheduleConfig({...scheduleConfig, end_time: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Slot Duration (mins)</label>
                <Input 
                  type="number" 
                  min="5" 
                  step="5"
                  value={scheduleConfig.slot_duration} 
                  onChange={(e) => setScheduleConfig({...scheduleConfig, slot_duration: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSchedule} disabled={modalLoading}>
                {modalLoading ? 'Saving...' : 'Save & Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
