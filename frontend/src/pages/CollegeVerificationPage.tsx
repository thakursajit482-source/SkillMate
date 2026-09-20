import React, { useState, useEffect } from 'react';
import { verificationApi, collegesApi } from '../api/client';
import { College, CollegeVerification } from '../types';
import { VerifiedBadge } from '../components/Badges';
import { SearchableCollegeSelect } from '../components/SearchableCollegeSelect';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Building,
  Mail,
  FileCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  CreditCard,
  Hash,
  GraduationCap,
  Calendar,
} from 'lucide-react';

export const CollegeVerificationPage: React.FC = () => {
  const { user, refreshUser, isVerified } = useAuth();
  const { success, error } = useToast();

  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [idType, setIdType] = useState('College ID');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<CollegeVerification | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [cList, myStatus] = await Promise.all([
          collegesApi.list().catch(() => []),
          verificationApi.getMyStatus().catch(() => null),
        ]);
        if (mounted) {
          setColleges(cList || []);
          if (myStatus) {
            setVerification(myStatus);
            if (myStatus.collegeId) setSelectedCollegeId(myStatus.collegeId);
            if (myStatus.department) setDepartment(myStatus.department);
            if (myStatus.yearOfStudy) setYearOfStudy(myStatus.yearOfStudy);
            if (myStatus.enrollmentId) setEnrollmentId(myStatus.enrollmentId);
            if (myStatus.collegeEmail) setCollegeEmail(myStatus.collegeEmail);
            if (myStatus.idDocumentRef) setDocumentUrl(myStatus.idDocumentRef);
          } else if (cList?.length > 0) {
            setSelectedCollegeId(cList[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching verification data', err);
      } finally {
        if (mounted) {
          setLoadingColleges(false);
        }
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeId) {
      error('Please select your college/university from the directory.');
      return;
    }
    if (!department.trim()) {
      error('Please enter your department / field of study.');
      return;
    }
    if (!enrollmentId.trim()) {
      error('Please enter your student ID or enrollment number.');
      return;
    }
    if (!collegeEmail.trim() && !documentUrl.trim()) {
      error('Please provide either your institutional college email or a student ID document URL.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verificationApi.submit({
        collegeId: selectedCollegeId,
        department: department.trim(),
        yearOfStudy: Number(yearOfStudy),
        enrollmentId: enrollmentId.trim(),
        idType,
        collegeEmail: collegeEmail.trim() || undefined,
        idDocumentRef: documentUrl.trim() || undefined,
      });

      setVerification(res);
      await refreshUser();

      if (res.status === 'VERIFIED') {
        success('Instant verification successful! Welcome to the verified student network.');
      } else {
        success('Verification submitted! Our moderation team will review your student credentials.');
      }
    } catch (err: any) {
      error(err.message || 'Verification submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = verification?.status || user?.verification?.status || (isVerified ? 'VERIFIED' : user?.verificationStatus || 'UNVERIFIED');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          College Student Verification
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Verify your active enrollment in a Mumbai Metropolitan Region college to unlock full peer collaboration.
        </p>
      </div>

      {/* Current Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <span className="text-xs font-bold uppercase text-slate-400">Current Verification State</span>
          <VerifiedBadge status={status} />
        </div>

        {status === 'VERIFIED' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-slate-900">You Are a Verified Student!</h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              Your college enrollment is confirmed. You have full access to discover students, post requests, make offers, and message peers across MMR campuses.
            </p>
            {(verification?.college || user?.verification?.college) && (
              <div className="inline-block mt-2 px-4 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                {verification?.college?.name || user?.verification?.college?.name}
              </div>
            )}
          </div>
        ) : status === 'PENDING' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Verification Under Review</h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              We received your student ID submission. Campus moderators review documents within a few hours. You will receive an instant notification once approved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Instant Domain Verification</span>
              </div>
              <p className="leading-relaxed">
                Using an institutional `.edu` or registered college email instantly verifies your student account without waiting for manual document review!
              </p>
            </div>

            {/* College Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Select Your College / University
              </label>
              <SearchableCollegeSelect
                colleges={colleges}
                selectedCollegeId={selectedCollegeId}
                onChange={(id) => setSelectedCollegeId(id)}
                loading={loadingColleges}
                placeholder="Search & select your College / University..."
              />
            </div>

            {/* Department and Year of Study */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Department / Branch
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Year of Study
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1st Year (Freshman)</option>
                    <option value={2}>2nd Year (Sophomore)</option>
                    <option value={3}>3rd Year (Junior)</option>
                    <option value={4}>4th Year (Senior)</option>
                    <option value={5}>5th Year / Postgrad</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ID Type & Student ID / Enrollment Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  ID Type
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="College ID">College ID</option>
                    <option value="Student ID">Student ID</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Student ID / Roll Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TCET202301"
                    value={enrollmentId}
                    onChange={(e) => setEnrollmentId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Institutional College Email */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                College Email (Instant Verification)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="name@tcetmumbai.in or rollno@vjti.ac.in"
                  value={collegeEmail}
                  onChange={(e) => setCollegeEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase">OR</span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Student ID Document URL */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Student ID Document URL / Photo Reference
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FileCheck className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://imgur.com/student-id.jpg"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Upload a link to your campus ID card or fee receipt if you do not have an official college email.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingColleges}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting verification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Student Verification</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
