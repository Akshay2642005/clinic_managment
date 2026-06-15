import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { appointmentsApi } from "../../api/client";
import type { PatientOut } from "../../types/api";

interface Doctor {
  doctor_id: number;
  first_name: string;
  last_name: string | null;
  specialization: string | null;
  phone: string | null;
}

interface Slot {
  slot_id: number;
  doctor_id: number;
  slot_time: string;
  status: string;
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const rescheduleApptId = location.state?.rescheduleApptId;

  // Get logged-in patient
  const stored = localStorage.getItem("currentUser");
  const patient: PatientOut | null = stored ? JSON.parse(stored) : null;

  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0], // default to today
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState("");

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch doctors on mount
  useEffect(() => {
    if (!patient) {
      navigate("/");
      return;
    }

    appointmentsApi
      .getDoctors()
      .then((data) => {
        setDoctors(data);
        setLoadingDoctors(false);
      })
      .catch(() => {
        setError("Failed to load doctors list. Please try again.");
        setLoadingDoctors(false);
      });
  }, [patient]);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setSlots([]);
      setSelectedSlotId(null);
      return;
    }

    setLoadingSlots(true);
    setSelectedSlotId(null);
    setError("");

    appointmentsApi
      .getAvailableSlots(selectedDoctorId, selectedDate)
      .then((data) => {
        setSlots(data);
        setLoadingSlots(false);
      })
      .catch(() => {
        setError("Failed to fetch available slots.");
        setLoadingSlots(false);
      });
  }, [selectedDoctorId, selectedDate]);

  const handleBook = async () => {
    if (!patient || !selectedSlotId) return;

    setSubmitting(true);
    setError("");

    try {
      if (rescheduleApptId) {
        await appointmentsApi.rescheduleAppointment(
          rescheduleApptId,
          selectedSlotId,
        );
      } else {
        await appointmentsApi.bookAppointment(
          patient.patient_id,
          selectedSlotId,
        );
      }
      setSuccess(true);
      setTimeout(() => {
        navigate("/patient");
      }, 2000);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Booking failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d.doctor_id === selectedDoctorId);
  const selectedSlot = slots.find((s) => s.slot_id === selectedSlotId);

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/patient")}
            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {rescheduleApptId
                ? "Reschedule Appointment"
                : "Book an Appointment"}
            </h1>
            <p className="text-sm text-gray-500">
              Select your preferred doctor, date, and slot time.
            </p>
          </div>
        </div>

        {success ? (
          <Card className="p-10 text-center border-0 shadow-xl bg-white/80 backdrop-blur flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4 text-green-500">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {rescheduleApptId
                ? "Reschedule Confirmed!"
                : "Booking Confirmed!"}
            </h2>
            <p className="text-gray-500">
              Your appointment has been successfully{" "}
              {rescheduleApptId ? "rescheduled" : "scheduled"}.
            </p>
            <p className="text-xs text-gray-400 mt-6">
              Redirecting you to dashboard...
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Middle Column - Steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* Doctor Selection */}
              <Card className="p-6 border-0 shadow-sm bg-white">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> 1. Select a
                  Doctor
                </h2>

                {loadingDoctors ? (
                  <div className="text-center py-6 text-sm text-gray-400">
                    Loading doctors...
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">
                    No active doctors found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {doctors.map((doc) => (
                      <button
                        key={doc.doctor_id}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.doctor_id)}
                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                          selectedDoctorId === doc.doctor_id
                            ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500"
                            : "border-gray-100 hover:border-gray-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">
                          Dr. {doc.first_name} {doc.last_name ?? ""}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                          {doc.specialization || "General Physician"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Reason for Visit */}
              <Card className="p-6 border-0 shadow-sm bg-white">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle size={16} className="text-blue-500" /> 2. Reason
                  for Visit
                </h2>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Please describe your reason for visit
                  </label>
                  <textarea
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    disabled={!selectedDoctorId}
                    placeholder="E.g., Regular checkup, Back pain, Fever, etc."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400 resize-none"
                  />
                </div>
              </Card>

              {/* Date & Slot Selection */}
              <Card className="p-6 border-0 shadow-sm bg-white">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" /> 3. Choose
                  Date & Time
                </h2>

                <div className="space-y-6">
                  {/* Date Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled={!selectedDoctorId}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>

                  {/* Slots Section */}
                  {selectedDoctorId && (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={12} /> Available Slots
                      </label>

                      {loadingSlots ? (
                        <div className="text-center py-6 text-sm text-gray-400">
                          Checking slot availability...
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <AlertCircle
                            size={24}
                            className="mx-auto text-gray-300 mb-2"
                          />
                          <p className="text-sm text-gray-500 font-medium">
                            No slots available
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Try selecting another date or doctor.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map((slot) => {
                            const timeStr = new Date(
                              slot.slot_time,
                            ).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });
                            return (
                              <button
                                key={slot.slot_id}
                                type="button"
                                onClick={() => setSelectedSlotId(slot.slot_id)}
                                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                                  selectedSlotId === slot.slot_id
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                                }`}
                              >
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Booking Summary */}
            <div className="space-y-6">
              <Card className="p-6 border-0 shadow-md bg-white flex flex-col justify-between h-full sticky top-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    Booking Summary
                  </h3>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Patient
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {patient.first_name} {patient.last_name ?? ""}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Doctor
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">
                        {selectedDoctor
                          ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name ?? ""}`
                          : "Not selected"}
                      </p>
                      {selectedDoctor?.specialization && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selectedDoctor.specialization}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Date & Time
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">
                        {selectedSlot
                          ? `${new Date(
                              selectedSlot.slot_time,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })} at ${new Date(
                              selectedSlot.slot_time,
                            ).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}`
                          : "Not selected"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-100">
                  <Button
                    onClick={handleBook}
                    disabled={!selectedSlotId || submitting}
                    className="w-full justify-center text-center font-bold tracking-wide"
                    size="lg"
                  >
                    {submitting
                      ? "CONFIRMING..."
                      : rescheduleApptId
                        ? "CONFIRM RESCHEDULE"
                        : "CONFIRM BOOKING"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
