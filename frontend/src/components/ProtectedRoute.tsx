import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requireVerified?: boolean }> = ({
  children,
  requireVerified = false,
}) => {
  const { user, loading, isVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading SkillMate...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && !isVerified) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border border-amber-200 text-center shadow-sm">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">College Verification Required</h2>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          To maintain trust and safety within our student community, you must verify your college status before posting requests, making offers, or joining collaboration tasks.
        </p>
        <Link
          to="/verification"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow transition"
        >
          Verify My Student ID
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
