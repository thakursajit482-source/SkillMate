import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsApi, skillsApi } from '../api/client';
import { RequestType, Skill } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  PlusCircle,
  IndianRupee,
  Repeat,
  Sparkles,
  MapPin,
  ArrowRight,
  Loader2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreateRequestPage: React.FC = () => {
  const { isVerified } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academics & Coding');
  const [type, setType] = useState<RequestType>('PAID');
  const [budget, setBudget] = useState<number>(350);
  const [skillId, setSkillId] = useState('');
  const [exchangeSkillId, setExchangeSkillId] = useState('');
  const [socialVibe, setSocialVibe] = useState('');
  const [approximateArea, setApproximateArea] = useState('');
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await skillsApi.getAll({ limit: 50 });
        const skills = res.items || [];
        setAvailableSkills(skills);
        if (skills.length > 0) {
          setSkillId((prev) => prev || skills[0].id);
          setExchangeSkillId((prev) => prev || (skills[1]?.id || skills[0].id));
        }
      } catch (err) {
        console.error('Failed to fetch skills taxonomy', err);
      }
    };
    fetchSkills();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      error('Please provide a title and detailed description.');
      return;
    }

    if (type === 'PAID') {
      if (!skillId) {
        error('Please select the skill or subject you need help with.');
        return;
      }
      if (!budget || budget <= 0) {
        error('Please enter a valid budget amount in ₹ INR.');
        return;
      }
    }

    if (type === 'SKILL_EXCHANGE') {
      if (!skillId) {
        error('Please select the skill you can teach / offer.');
        return;
      }
      if (!exchangeSkillId) {
        error('Please select the skill you want to learn in return.');
        return;
      }
    }

    setLoading(true);
    try {
      const created = await requestsApi.create({
        title,
        description,
        category,
        type,
        skillId: type !== 'SOCIAL' ? skillId : undefined,
        desiredSkillId: type === 'SKILL_EXCHANGE' ? exchangeSkillId : undefined,
        exchangeSkillId: type === 'SKILL_EXCHANGE' ? exchangeSkillId : undefined,
        budget: type === 'PAID' ? Number(budget) : undefined,
        socialVibe: type === 'SOCIAL' ? socialVibe : undefined,
        approximateArea: approximateArea || undefined,
      });

      success('Request created successfully.');
      navigate('/requests/mine');
    } catch (err: any) {
      error(err.message || 'Failed to post request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border border-amber-200 text-center shadow-sm">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Student Verification Required</h2>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Student verification is required to create a request. Please verify your student status with your college to continue.
        </p>
        <Link
          to="/verification"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow transition"
        >
          Complete Verification →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <PlusCircle className="w-7 h-7 text-indigo-600" />
          Create Collaboration Request
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Post an open request for tutoring, freelance task, skill swap, or study group.
        </p>
      </div>

      {/* Verified Student Confirmation Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-emerald-900">✓ Student Verified</h4>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your student verification is complete. You can create requests across all categories without any additional IDs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
            Interaction Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setType('PAID')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                type === 'PAID'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Paid Help</span>
              </div>
              <p className="text-slate-500 text-xs">Offer financial compensation for assistance</p>
            </button>

            <button
              type="button"
              onClick={() => setType('SKILL_EXCHANGE')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                type === 'SKILL_EXCHANGE'
                  ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                <Repeat className="w-4 h-4 text-indigo-600" />
                <span>Skill Swap</span>
              </div>
              <p className="text-slate-500 text-xs">Exchange knowledge 1:1 without money</p>
            </button>

            <button
              type="button"
              onClick={() => setType('SOCIAL')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                type === 'SOCIAL'
                  ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Study / Social</span>
              </div>
              <p className="text-slate-500 text-xs">Form study groups, hackathons, or sports</p>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Request Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Need help debugging React Redux project or DSA trees"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Dynamic Conditional Fields based on Type */}
        {type === 'PAID' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Skill / Subject Needed <span className="text-rose-500">*</span>
              </label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'Skill'})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Select the skill or subject you need assistance with</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Budget (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Fair peer compensation standard</span>
            </div>
          </div>
        )}

        {type === 'SKILL_EXCHANGE' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Skill You Can Teach / Offer <span className="text-rose-500">*</span>
              </label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'Skill'})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">The skill you will provide or teach to your peer</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Skill You Want to Learn / In Return <span className="text-rose-500">*</span>
              </label>
              <select
                value={exchangeSkillId}
                onChange={(e) => setExchangeSkillId(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'Skill'})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">The skill you expect in return from your peer</span>
            </div>
          </div>
        )}

        {type === 'SOCIAL' && (
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Activity / Vibe
            </label>
            <input
              type="text"
              placeholder="e.g. Smart India Hackathon Teammates, GATE Exam Study Group"
              value={socialVibe}
              onChange={(e) => setSocialVibe(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        )}

        {/* Category & Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="Academics & Coding">Academics & Coding</option>
              <option value="Design & Multimedia">Design & Multimedia</option>
              <option value="Exam Prep">Exam Prep (CAT, GATE, GRE)</option>
              <option value="Languages & Music">Languages & Music</option>
              <option value="Fitness & Sports">Fitness & Sports</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Approximate Area / Campus
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Powai, Vidyavihar, Dadar"
                value={approximateArea}
                onChange={(e) => setApproximateArea(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Full Description
          </label>
          <textarea
            required
            rows={4}
            placeholder="Describe what you are aiming to accomplish, expected duration, and whether you prefer in-person on campus or online session..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing request...</span>
            </>
          ) : (
            <>
              <span>Post Request to Campus Network</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
