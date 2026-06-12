import axios from 'axios';
import type {
  PatientLogin,
  PatientCreate,
  PatientOut,
  PatientWithAppointments,
} from '../types/api';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  // Returns patient if found, throws 404 if new patient
  login: async (data: PatientLogin): Promise<{ message: string; patient: PatientOut }> => {
    const response = await api.post<{ message: string; patient: PatientOut }>('/auth/login', data);
    return response.data;
  },
  // Creates a new patient, returns their record
  signup: async (data: PatientCreate): Promise<PatientOut> => {
    const response = await api.post<PatientOut>('/auth/signup', data);
    return response.data;
  },
  // Doctor login
  doctorLogin: async (data: { phone: string }): Promise<{ message: string; doctor: any }> => {
    const response = await api.post<{ message: string; doctor: any }>('/auth/doctor/login', data);
    return response.data;
  },
};

export const patientsApi = {
  // Fetch a patient + their appointments by phone number
  searchByPhone: async (phone: string): Promise<PatientWithAppointments | null> => {
    try {
      const response = await api.post<PatientWithAppointments[]>('/patients/search', { phone });
      return response.data[0] ?? null;
    } catch {
      return null;
    }
  },
  // Fetch a patient + their appointments by ID
  searchById: async (patientId: number): Promise<PatientWithAppointments | null> => {
    try {
      const response = await api.post<PatientWithAppointments[]>('/patients/search', { patient_id: patientId });
      return response.data[0] ?? null;
    } catch {
      return null;
    }
  },
};

export const appointmentsApi = {
  getDoctors: async (): Promise<any[]> => {
    const response = await api.get('/appointments/doctors');
    return response.data;
  },
  getAvailableSlots: async (doctorId: number, dateStr: string): Promise<any[]> => {
    const response = await api.get('/appointments/slots/available', {
      params: { doctor_id: doctorId, date: dateStr }
    });
    return response.data;
  },
  bookAppointment: async (patientId: number, slotId: number): Promise<any> => {
    const response = await api.post('/appointments/book', {
      patient_id: patientId,
      slot_id: slotId
    });
    return response.data;
  },
  getAppointments: async (dateStr?: string): Promise<any[]> => {
    const params: any = {};
    if (dateStr) params.date = dateStr;
    const response = await api.get('/appointments/', { params });
    return response.data;
  },
  searchAppointments: async (doctorName?: string, patientName?: string): Promise<any[]> => {
    const params: any = {};
    if (doctorName) params.doctor_name = doctorName;
    if (patientName) params.patient_name = patientName;
    const response = await api.get('/appointments/', { params });
    return response.data;
  },
  cancelAppointment: async (appointmentId: number): Promise<any> => {
    const response = await api.put(`/appointments/cancel/${appointmentId}`);
    return response.data;
  },
  rescheduleAppointment: async (appointmentId: number, newSlotId: number): Promise<any> => {
    const response = await api.put(`/appointments/reschedule/${appointmentId}`, {
      new_slot_id: newSlotId
    });
    return response.data;
  },
  completeAppointment: async (appointmentId: number): Promise<any> => {
    const response = await api.put(`/appointments/complete/${appointmentId}`);
    return response.data;
  },
};

export const doctorApi = {
  searchAppointments: async (doctorId: number, dateStr: string): Promise<any> => {
    const response = await api.get('/doctor/appointments/search', {
      params: { doctor_id: doctorId, search_date: dateStr }
    });
    return response.data;
  },
  publishSchedule: async (doctorId: number): Promise<any> => {
    const response = await api.post(`/publish_schedule/${doctorId}`);
    return response.data;
  },
  createSchedule: async (doctorId: number, data: { day_of_week: number, start_time: string, end_time: string, slot_duration: number }): Promise<any> => {
    const response = await api.post(`/create_schedule/${doctorId}`, null, { params: data });
    return response.data;
  },
  updateSchedule: async (doctorId: number, data: { day_of_week: number, start_time: string, end_time: string, slot_duration: number }): Promise<any> => {
    const response = await api.put(`/update_schedule/${doctorId}`, null, { params: data });
    return response.data;
  }
};

