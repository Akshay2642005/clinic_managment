import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { authApi } from '../../api/client';
import axios from 'axios';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneFromLogin = location.state?.phone || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    dob: '',
    phone: phoneFromLogin,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const patient = await authApi.signup({
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        gender: formData.gender || null,
        dob: formData.dob || null,
        phone: formData.phone,
      });

      // Save patient and navigate to dashboard
      localStorage.setItem('currentUser', JSON.stringify(patient));
      navigate('/patient', { replace: true });

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 font-sans">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Your Account</h1>
          <p className="mt-2 text-gray-500 text-sm">You're new here! Let's get your details set up.</p>
        </div>

        <Card className="p-8 shadow-xl shadow-blue-900/5 border-0 bg-white/90 backdrop-blur">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Jane"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Name
                </label>
                <Input
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="tel"
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Select gender (optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date of Birth
              </label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/3"
                onClick={() => navigate('/')}
              >
                Back
              </Button>
              <Button type="submit" className="w-2/3" disabled={loading}>
                {loading ? 'Creating Account...' : 'Complete Registration →'}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </div>
  );
}
