import React from 'react';
import { X } from 'lucide-react';
import AppointmentCard from './AppointmentCard';

interface SearchAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchResults: any[];
  searchQuery: string;
  onRefresh: () => void;
}

export default function SearchAppointmentsModal({
  isOpen,
  onClose,
  searchResults,
  searchQuery,
  onRefresh
}: SearchAppointmentsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md font-sans">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 font-serif">
            Search Results for "{searchQuery}"
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {searchResults.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No appointments found matching your search.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {searchResults.map((apt) => {
                const dateObj = new Date(apt.slot_time);
                const formattedCardDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
                const formattedCardTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <AppointmentCard 
                    key={apt.appointment_id}
                    appointmentId={apt.appointment_id}
                    doctorId={apt.doctor_id}
                    rawDate={dateObj.toISOString().split('T')[0]}
                    date={formattedCardDate}
                    time={formattedCardTime}
                    patient={apt.patient_name}
                    doctor={`Dr. ${apt.doctor_name}`}
                    onRefresh={onRefresh}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
