// src/types/api.ts

// --- Auth ---
export interface PatientLogin {
  phone: string;
}

// --- Patient ---
export interface PatientCreate {
  first_name: string;
  last_name?: string | null;
  gender?: string | null;
  dob?: string | null; // YYYY-MM-DD
  phone: string;
}

export interface PatientOut {
  patient_id: number;
  first_name: string;
  last_name?: string | null;
  gender?: string | null;
  dob?: string | null;
  phone: string;
  created_at?: string | null;
}

// --- Appointments (from /patients/search) ---
export interface DoctorSearchOut {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization?: string | null;
  phone?: string | null;
  is_active: boolean;
}

export interface AppointmentOut {
  appointment_id: number;
  slot_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  doctor?: DoctorSearchOut | null;
}

export interface PatientWithAppointments {
  patient_id: number;
  first_name: string;
  last_name: string;
  gender?: string | null;
  dob?: string | null;
  phone?: string | null;
  created_at: string;
  appointments: AppointmentOut[];
}
