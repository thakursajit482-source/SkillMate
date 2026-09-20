import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collegesApi } from '../api/client';
import { College } from '../types';
import { SearchableCollegeSelect } from '../components/SearchableCollegeSelect';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Building,
  CreditCard,
  Hash,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [idType, setIdType] = useState('College ID');
  const [enrollmentId, setEnrollmentId] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [loadingColleges, setLoadingColleges] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchColleges = async () => {
      try {
        const list = await collegesApi.list();
        if (mounted) {
          setColleges(list || []);
        }
      } catch (err) {
        console.error('Failed to load college directory', err);
      } finally {
        if (mounted) {
          setLoadingColleges(false);
        }
      }
    };
    fetchColleges();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (val && !/^[A-Za-z\s]+$/.test(val)) {
      setNameError('Full name must contain alphabetic characters and spaces only');
    } else {
      setNameError('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, prevent non-digits from being entered
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (digits && digits.length < 10) {
      setPhoneError('Phone number must be exactly 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val && val.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Name validation
    if (!trimmedName) {
      setNameError('Name is required');
      error('Full name is required');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      setNameError('Full name must contain alphabetic characters and spaces only');
      error('Full name cannot contain numbers or special characters');
      return;
    }

    // 2. Email validation
    if (!trimmedEmail) {
      setEmailError('Email is required');
      error('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      error('Please provide a valid email format (e.g. student@college.edu)');
      return;
    }

    // 3. Phone validation
    if (!phone) {
      setPhoneError('Phone number is required');
      error('Phone number is required');
      return;
    }
    if (phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      error('Phone number must be 10 digits');
      return;
    }

    // 4. Password validation
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(trimmedName, trimmedEmail, phone, password, {
        collegeId: selectedCollegeId || undefined,
        idType: idType || undefined,
        enrollmentId: enrollmentId.trim() || undefined,
      });
      success('Registration successful! Welcome to SkillMate.');
      navigate('/verification');
    } catch (err: any) {
      error(err.message || 'Registration failed. Check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Join SkillMate</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create your verified student account to trade skills across colleges
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="Aarav Sharma"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                  nameError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
            </div>
            {nameError && <p className="text-xs text-red-500 mt-1 font-medium">{nameError}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="aarav@somaiya.edu or aarav@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                  emailError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
            </div>
            {emailError && <p className="text-xs text-red-500 mt-1 font-medium">{emailError}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number (10 digits)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                maxLength={10}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                  phoneError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
            </div>
            {phoneError && <p className="text-xs text-red-500 mt-1 font-medium">{phoneError}</p>}
          </div>

          {/* College / University Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              College / University
            </label>
            <SearchableCollegeSelect
              colleges={colleges}
              selectedCollegeId={selectedCollegeId}
              onChange={(id) => setSelectedCollegeId(id)}
              loading={loadingColleges}
              placeholder="Search & select your College / University..."
            />
          </div>

          {/* ID Type & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ID Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                >
                  <option value="College ID">College ID</option>
                  <option value="Student ID">Student ID</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Student / Roll No (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  placeholder="e.g. TCET202301"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min 8 chars)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition ${
                  passwordError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
            </div>
            {passwordError && <p className="text-xs text-red-500 mt-1 font-medium">{passwordError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Student Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
