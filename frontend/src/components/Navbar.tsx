import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './Badges';
import { Sparkles, LogOut, User as UserIcon, PlusCircle, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isVerified } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Skill<span className="text-indigo-600">Mate</span>
              </span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/discover/requests"
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Explore Requests
                </Link>
                <Link
                  to="/discover/students"
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Find Students
                </Link>
                <Link
                  to="/ai-match"
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Match</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/requests/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Post Request</span>
                </Link>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
                    title="Your Profile"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                        {user.name}
                        <VerifiedBadge status={user.verification?.status || (isVerified ? 'VERIFIED' : user.verificationStatus || 'UNVERIFIED')} showText={false} />
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                        {user.email}
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition"
                >
                  Join SkillMate
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {user && !isVerified && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {user.verification?.status === 'PENDING' || user.verificationStatus === 'PENDING'
                  ? 'Your student verification is currently under review.'
                  : 'College verification unlocks full collaboration, requests, offers, and chat.'}
              </span>
            </div>
            <Link
              to="/verification"
              className="font-bold underline text-amber-950 hover:text-amber-800 ml-3 shrink-0"
            >
              {user.verification?.status === 'PENDING' || user.verificationStatus === 'PENDING' ? 'Check Status' : 'Verify Student ID →'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
