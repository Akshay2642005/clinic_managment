import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { authApi } from '../../api/client';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'Patient' | 'Doctor' | 'Staff'>('Patient');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length > 5) {
      setOtpSent(true);
      setError('');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;

    setLoading(true);
    setError('');

    try {
      if (role === 'Patient') {
        const response = await authApi.login({ phone });
        // Existing patient → save to localStorage and go to dashboard
        localStorage.setItem('currentUser', JSON.stringify(response.patient));
        navigate('/patient');
      } else if (role === 'Doctor') {
        navigate('/doctor');
      } else {
        navigate('/staff');
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // New patient → go to register page, pass phone number along
        navigate('/patient/register', { state: { phone } });
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent"></div>
      <div className="absolute -left-48 -top-48 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      <div className="absolute -right-48 top-48 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-4xl font-serif font-extrabold text-gray-900 tracking-tight">
          Alexandria
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 font-medium tracking-wide uppercase">
          Health Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="py-8 px-4 sm:px-10 border-0 shadow-xl shadow-blue-900/5 bg-white/80 backdrop-blur-xl">

          {/* Role Selector Tabs */}
          <div className="flex p-1 bg-gray-100/80 rounded-lg mb-8">
            {(['Patient', 'Doctor', 'Staff'] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setOtpSent(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  role === r
                    ? 'bg-white text-[#2563eb] shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
              {error}
            </div>
          )}

          {!otpSent ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h3>
                <p className="text-sm text-gray-500 mb-6">Enter your phone number to access your portal.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  icon={<Phone className="w-5 h-5 text-gray-400" />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full flex items-center justify-between group" size="lg">
                <span className="font-semibold tracking-wide">SEND OTP</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <div className="flex items-center text-[#2563eb] mb-4">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-wider">Secure Verification</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Enter Security Code</h3>
                <p className="text-sm text-gray-500 mb-6">
                  We've sent a code to <span className="font-bold text-gray-900">{phone}</span>.
                </p>
              </div>

              <div className="space-y-2 mb-8">
                <Input
                  type="text"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center tracking-[0.5em] text-lg"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-center text-gray-400 mt-2">
                  (Demo: enter any 4+ digits to continue)
                </p>
              </div>

              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={() => setOtpSent(false)} className="w-1/3" disabled={loading}>
                  Back
                </Button>
                <Button type="submit" className="w-2/3 font-semibold tracking-wide" size="lg" disabled={loading}>
                  {loading ? 'VERIFYING...' : 'VERIFY & LOGIN'}
                </Button>
              </div>
            </form>
          )}

        </Card>
      </div>
    </div>
  );
}
