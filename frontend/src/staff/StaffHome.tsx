import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarDays, Zap, User } from 'lucide-react';
import AppointmentCard from '../components/ui/AppointmentCard';
import SearchAppointmentsModal from '../components/ui/SearchAppointmentsModal';
import { appointmentsApi } from '../api/client';

export default function StaffHome() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchAppointments = () => {
    appointmentsApi.getAppointments(selectedDate)
      .then(data => setAppointments(data))
      .catch(err => console.error("Failed to load appointments:", err));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    let doctorName: string | undefined;
    let patientName: string | undefined;

    const lowerQuery = searchQuery.trim().toLowerCase();
    if (lowerQuery.startsWith('dr ') || lowerQuery.startsWith('dr. ')) {
      // It's a doctor search
      doctorName = searchQuery.trim().replace(/^dr\.?\s+/i, '');
    } else {
      // It's a patient search
      patientName = searchQuery.trim();
    }

    appointmentsApi.searchAppointments(doctorName, patientName)
      .then(data => {
        setSearchResults(data);
        setIsSearchModalOpen(true);
      })
      .catch(err => console.error("Failed to search appointments:", err));
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F9FAFB] w-full text-left flex flex-col font-sans" style={{ textAlign: 'left' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center w-full">
        <div className="text-[#1A56DB] text-xl font-bold font-serif">
          Alexandria Clinic
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold text-center mb-8 font-serif tracking-tight" style={{ margin: '0 0 2rem 0', color: '#111827' }}>
          Clinic Records Registry
        </h1>
        
        {/* Search Bar */}
        <div className="w-full max-w-3xl mx-auto mb-16">
          <div className="relative flex items-center w-full h-14 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden pr-2">
            <div className="grid place-items-center h-full w-14 text-blue-600">
              <Search size={20} />
            </div>
            <input
              className="peer h-full w-full outline-none text-gray-700 pr-2 bg-transparent text-lg"
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by Patient Name or 'Dr. [Name]' for Doctors..." />
            <button 
              onClick={handleSearch}
              className="bg-[#1A56DB] hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition-colors h-10 flex items-center whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 flex flex-col justify-center">
                <span className="text-xs font-semibold text-gray-400 tracking-wider mb-2 uppercase">Daily Patients</span>
                <span className="text-3xl font-bold text-[#1A56DB]">42</span>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 flex flex-col justify-center">
                <span className="text-xs font-semibold text-gray-400 tracking-wider mb-2 uppercase">Active Doctors</span>
                <span className="text-3xl font-bold text-[#1A56DB]">12</span>
              </div>
            </div>

            {/* Appointments Header */}
            <div className="flex justify-between items-end mt-4 border-b border-transparent">
              <h2 className="text-3xl font-bold font-serif" style={{ margin: 0, color: '#111827' }}>Daily Appointments</h2>
              <div className="flex items-center text-xs font-bold tracking-wider text-gray-400 uppercase pb-1 relative">
                {formattedDate}
                <label htmlFor="date-picker" className="cursor-pointer ml-2 mb-[1px]">
                  <CalendarDays size={14} />
                </label>
                <input 
                  type="date" 
                  id="date-picker"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute opacity-0 w-4 h-4 right-0 cursor-pointer top-0"
                />
              </div>
            </div>

            {/* Appointments List */}
            <div className="flex flex-col gap-4">
              {appointments.filter((apt) => apt.status !== 'cancelled').length === 0 ? (
                <div className="text-gray-500 text-center py-8">No appointments for this date.</div>
              ) : (
                appointments.filter((apt) => apt.status !== 'cancelled').map((apt) => {
                  const dateObj = new Date(apt.slot_time);
                  const formattedCardDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
                  const formattedCardTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <AppointmentCard 
                      key={apt.appointment_id}
                      appointmentId={apt.appointment_id}
                      doctorId={apt.doctor_id}
                      rawDate={selectedDate}
                      date={formattedCardDate}
                      time={formattedCardTime}
                      patient={apt.patient_name}
                      doctor={`Dr. ${apt.doctor_name}`}
                      onRefresh={fetchAppointments}
                    />
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-[#1A56DB] w-12 h-12 rounded-lg flex items-center justify-center shadow-md">
                  <Zap size={24} color="white" fill="white" />
                </div>
                <h3 className="text-2xl font-bold font-serif" style={{ margin: 0, color: '#111827' }}>Quick Admission</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Register a new walk-in patient and assign them to the next available practitioner immediately.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-[#1A56DB] hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Quick Admission
              </button>
            </div>
          </div>
        </div>
      </main>
      <SearchAppointmentsModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        searchResults={searchResults} 
        searchQuery={searchQuery}
        onRefresh={() => {
          handleSearch();
          fetchAppointments();
        }}
      />
    </div>
  );
}
