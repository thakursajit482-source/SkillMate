import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { profilesApi } from '../api/client';
import { Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VerifiedBadge } from '../components/Badges';
import {
  User as UserIcon,
  MapPin,
  GraduationCap,
  Calendar,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, isVerified } = useAuth();
  const { success, error } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState<number>(2026);
  const [approximateArea, setApproximateArea] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profilesApi.getMyProfile();
        setProfile(data);
        setBio(data.bio || '');
        setMajor(data.major || '');
        setGradYear(data.gradYear || 2026);
        setApproximateArea(data.approximateArea || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (err: any) {
        console.error('Error loading profile', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profilesApi.updateProfile({
        bio,
        major,
        gradYear: Number(gradYear),
        approximateArea,
        avatarUrl: avatarUrl || undefined,
      });
      success('Profile updated successfully!');
      await refreshUser();
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserIcon className="w-7 h-7 text-indigo-600" />
            My Student Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your personal bio, degree details, and privacy-safe coarse location.
          </p>
        </div>

        {user?.id && (
          <Link
            to={`/profile/${user.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
          >
            <span>Preview Public View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-2xl shadow-inner">
            {user?.name?.charAt(0) || 'S'}
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <VerifiedBadge status={user?.verification?.status || (isVerified ? 'VERIFIED' : user?.verificationStatus || 'UNVERIFIED')} />
            </div>
            <p className="text-slate-500 text-xs">
              {user?.verification?.college?.name || 'Mumbai Metropolitan Region College'}
            </p>
            <div className="text-xs text-slate-400">
              Account: {user?.email} • {user?.phone}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Bio & Introduction
            </label>
            <textarea
              rows={3}
              placeholder="Tell other students about your interests, projects, or what you enjoy learning..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Major / Field of Study
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Computer Engineering, Commerce, Design..."
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Graduation Year
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="2020"
                  max="2032"
                  value={gradYear}
                  onChange={(e) => setGradYear(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Approximate Area / Campus Suburb
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Bandra West, Powai, Vile Parle, Thane"
                value={approximateArea}
                onChange={(e) => setApproximateArea(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Privacy rule: exact GPS is never shown to peers. Only coarse area names and banded distance indicators are visible.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
