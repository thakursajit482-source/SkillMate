import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi, skillsApi, collegesApi, requestsApi } from '../api/client';
import { PublicProfile, Skill, College, RequestType } from '../types';
import { VerifiedBadge, DistanceBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  Star,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  Loader2,
  ChevronRight,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export const DiscoverStudentsPage: React.FC = () => {
  const { user, isVerified } = useAuth();
  const { success, error } = useToast();

  const [students, setStudents] = useState<PublicProfile[]>([]);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [collegesList, setCollegesList] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');

  // Direct Request Modal
  const [targetStudent, setTargetStudent] = useState<PublicProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('PAID');
  const [budget, setBudget] = useState<number>(300);
  const [socialVibe, setSocialVibe] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          skillsApi.getAll({ limit: 50 }).catch(() => ({ items: [], total: 0 })),
          collegesApi.list().catch(() => []),
        ]);
        setSkillsList(sRes.items || []);
        setCollegesList(cRes || []);
      } catch (err) {
        console.error('Error fetching metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await discoveryApi.discoverStudents({
        skillId: selectedSkill || undefined,
        collegeId: selectedCollege || undefined,
        area: areaQuery || undefined,
        dayOfWeek: dayOfWeek !== '' ? parseInt(dayOfWeek, 10) : undefined,
      });
      setStudents(res.items || []);
    } catch (err: any) {
      console.error('Failed to discover students', err);
      error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedSkill, selectedCollege, dayOfWeek]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const openDirectRequestModal = (student: PublicProfile) => {
    if (!isVerified) {
      error('You must verify your student ID before sending direct requests.');
      return;
    }
    setTargetStudent(student);
    setRequestTitle(`Collaboration with ${student.name}`);
    setModalOpen(true);
  };

  const handleSendDirectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;
    setSubmitting(true);
    try {
      await requestsApi.create({
        title: requestTitle,
        description: requestDesc,
        type: requestType,
        skillId: targetStudent.skills?.[0]?.id || undefined,
        budget: requestType === 'PAID' ? Number(budget) : undefined,
        socialVibe: requestType === 'SOCIAL' ? socialVibe : undefined,
        targetUserId: targetStudent.id,
      });
      success(`Direct request sent to ${targetStudent.name}!`);
      setModalOpen(false);
      setRequestDesc('');
    } catch (err: any) {
      error(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Users className="w-7 h-7 text-indigo-600" />
          Find Students & Mentors
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Discover verified peers across MMR colleges based on skills, schedule availability, and proximity.
        </p>
      </div>

      {/* AI Matching Callout */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Try AI Smart Matching</h4>
            <p className="text-xs text-slate-500">Describe what you need in everyday language and get ranked recommendations.</p>
          </div>
        </div>
        <Link
          to="/match"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
        >
          <span>Try AI Match</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Skill Filter */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Skill</label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Skills</option>
              {skillsList.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} {skill.category ? `(${skill.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* College Filter */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">College</label>
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Mumbai Colleges</option>
              {collegesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.city ? `• ${c.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week Filter */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Available Day</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any Day</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
              <option value="0">Sunday</option>
            </select>
          </div>

          {/* Area Search */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Area / Suburb</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Bandra, Powai..."
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium">Matching students nearby...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No students match your filter criteria</h3>
          <p className="text-slate-500 text-sm mt-1">Try expanding your search area or selecting another skill category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug flex items-center gap-1.5">
                        {student.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">
                        {student.college?.name || 'Mumbai Student'}
                      </p>
                    </div>
                  </div>
                  <VerifiedBadge status={student.verificationStatus} showText={false} />
                </div>

                {/* Location Band */}
                <div className="mb-3">
                  <DistanceBadge
                    distanceBand={student.distanceBand}
                    approximateArea={student.approximateArea}
                  />
                </div>

                {/* Bio snippet */}
                {student.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {student.bio}
                  </p>
                )}

                {/* Skills Chips */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {student.skills?.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                      >
                        <span>{s.name}</span>
                        {s.endorsementCount > 0 && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 rounded-full font-bold">
                            +{s.endorsementCount}
                          </span>
                        )}
                      </span>
                    ))}
                    {(student.skills?.length || 0) > 4 && (
                      <span className="text-[11px] text-slate-400 self-center">
                        +{(student.skills?.length || 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Reputation Stats */}
                <div className="flex items-center gap-4 py-2 px-3 bg-slate-50 rounded-xl text-xs mb-4">
                  <div className="flex items-center gap-1 font-bold text-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{student.reputation?.averageRating ? student.reputation.averageRating.toFixed(1) : '5.0'}</span>
                    <span className="text-slate-400 font-normal">({student.reputation?.totalRatings || 0})</span>
                  </div>
                  <div className="text-slate-400">•</div>
                  <div className="text-slate-600">
                    <span className="font-bold text-slate-800">{student.reputation?.completedTasksCount || 0}</span> tasks
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Link
                  to={`/profile/${student.id}`}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs text-center transition"
                >
                  View Profile
                </Link>
                {student.id !== user?.id && (
                  <button
                    onClick={() => openDirectRequestModal(student)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center shadow-sm transition"
                  >
                    Direct Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Direct Request Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Request Collaboration with ${targetStudent?.name}`}
      >
        <form onSubmit={handleSendDirectRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Request Title
            </label>
            <input
              type="text"
              required
              value={requestTitle}
              onChange={(e) => setRequestTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Interaction Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as RequestType)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PAID">Paid Help / Freelance</option>
              <option value="SKILL_EXCHANGE">Skill Exchange</option>
              <option value="SOCIAL">Study Group / Social</option>
            </select>
          </div>

          {requestType === 'PAID' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Proposed Budget (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {requestType === 'SOCIAL' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Vibe / Focus
              </label>
              <input
                type="text"
                placeholder="e.g. Hackathon Prep, Exam Revision..."
                value={socialVibe}
                onChange={(e) => setSocialVibe(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Description & Details
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain what you need help with, deliverables, timeline..."
              value={requestDesc}
              onChange={(e) => setRequestDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
