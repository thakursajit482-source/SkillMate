import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  MapPin,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Users,
  Repeat,
  HeartHandshake,
  Star,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-slate-900 text-white min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-College Student Marketplace & Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight mb-6">
            Exchange Skills. <br />
            Collaborate Across <span className="text-indigo-400">Mumbai Campuses.</span>
          </h1>

          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            SkillMate connects verified college students across the Mumbai Metropolitan Region for peer-to-peer tutoring, technical skill swaps, paid tasks, and campus collaboration.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition"
                >
                  <span>Join with Student ID</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 transition"
                >
                  Student Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Value Props Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">100% Verified Students</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every participant verifies their enrollment via institutional email or campus ID. No fake accounts or external commercial spammers.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <Repeat className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Paid, Swap or Social</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Support for paid freelance tutoring, 1-to-1 skill swaps (Python for Design), and informal hackathon / study sessions.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Privacy-First Discovery</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find peers near your campus or neighborhood. Exact coordinates are never exposed—only privacy-preserving banded distance metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Walkthrough */}
      <section className="bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black mb-4">How SkillMate Works</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              From discovering peers to dual-confirmed task completion and verified reputation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h4 className="font-bold text-lg mb-2">Build Profile & Verify</h4>
              <p className="text-slate-400 text-xs sm:text-sm">
                Add your technical and creative skills, weekly free hours, and verify college identity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h4 className="font-bold text-lg mb-2">Post or Discover</h4>
              <p className="text-slate-400 text-xs sm:text-sm">
                Browse nearby peers with explainable match scores, or post a request with your desired terms.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h4 className="font-bold text-lg mb-2">Agree & Collaborate</h4>
              <p className="text-slate-400 text-xs sm:text-sm">
                Review counter-offers, accept terms to launch an active Task, and chat in real-time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                4
              </div>
              <h4 className="font-bold text-lg mb-2">Dual Completion & Endorse</h4>
              <p className="text-slate-400 text-xs sm:text-sm">
                Both confirm work completion, exchange 5-star ratings, and grant peer skill endorsements.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
