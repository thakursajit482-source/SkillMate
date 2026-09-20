import React, { useState, useEffect, useMemo } from 'react';
import { profilesApi } from '../api/client';
import { Availability } from '../types';
import { useToast } from '../context/ToastContext';
import {
  CalendarCheck,
  Plus,
  Clock,
  Calendar,
  Save,
  Trash2,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  FileText,
  Tag,
} from 'lucide-react';

const COMMON_ACTIVITIES = [
  'Study Session',
  'Project Collaboration',
  'Peer Tutoring',
  'Exam Preparation',
  'Assignment & Homework',
  'Coding & Development',
  'Lab Work',
  'Discussion & Review',
  'Other / Custom Activity',
];

export const SkillsAvailabilityPage: React.FC = () => {
  const { success, error } = useToast();

  // Selected date (defaults to Today in YYYY-MM-DD local format)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for adding a new activity
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:30');
  const [newActivity, setNewActivity] = useState('Study Session');
  const [newCustomActivity, setNewCustomActivity] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Edit state (activityId -> draft values)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editActivity, setEditActivity] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load all user's daily availability records
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await profilesApi.getMyAvailability();
      setAvailabilities(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load availability:', err);
      error(err.message || 'Failed to load daily schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter activities for the selected date, sorted chronologically by startTime
  const dailyActivities = useMemo(() => {
    const targetDateStr = selectedDate;
    return availabilities
      .filter((a) => {
        if (a.specificDate) {
          const slotDateStr = a.specificDate.split('T')[0];
          return slotDateStr === targetDateStr;
        }
        // If entry was saved without specificDate, check day of week match
        if (a.dayOfWeek !== null && a.dayOfWeek !== undefined) {
          const selectedDayOfWeek = new Date(targetDateStr).getDay();
          return a.dayOfWeek === selectedDayOfWeek;
        }
        return false;
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [availabilities, selectedDate]);

  // Handle adding a new daily activity
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStartTime || !newEndTime) {
      error('Please specify both start and end time');
      return;
    }

    if (newStartTime >= newEndTime) {
      error('Start time must be strictly before end time');
      return;
    }

    const activityName =
      newActivity === 'Other / Custom Activity'
        ? newCustomActivity.trim() || 'Custom Activity'
        : newActivity;

    setSavingNew(true);
    try {
      const selectedDayOfWeek = new Date(selectedDate).getDay();

      await profilesApi.addAvailability({
        specificDate: selectedDate,
        dayOfWeek: selectedDayOfWeek,
        startTime: newStartTime,
        endTime: newEndTime,
        activity: activityName,
        details: newDetails.trim() || undefined,
      });

      success('Activity added to daily schedule!');
      setShowAddForm(false);
      setNewDetails('');
      setNewCustomActivity('');

      // Refresh schedule
      const refreshed = await profilesApi.getMyAvailability();
      setAvailabilities(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      error(err.message || 'Failed to save daily activity');
    } finally {
      setSavingNew(false);
    }
  };

  // Start editing an activity
  const handleStartEdit = (item: Availability) => {
    setEditingId(item.id);
    setEditStartTime(item.startTime);
    setEditEndTime(item.endTime);
    setEditActivity(item.activity || 'Study Session');
    setEditDetails(item.details || '');
  };

  // Save edited activity
  const handleSaveEdit = async (id: string) => {
    if (!editStartTime || !editEndTime) {
      error('Please specify both start and end time');
      return;
    }

    if (editStartTime >= editEndTime) {
      error('Start time must be strictly before end time');
      return;
    }

    setSavingEdit(true);
    try {
      await profilesApi.updateAvailability(id, {
        startTime: editStartTime,
        endTime: editEndTime,
        activity: editActivity.trim() || 'Activity',
        details: editDetails.trim() || undefined,
      });

      success('Activity updated successfully!');
      setEditingId(null);

      // Refresh schedule
      const refreshed = await profilesApi.getMyAvailability();
      setAvailabilities(Array.isArray(refreshed) ? refreshed : []);
    } catch (err: any) {
      error(err.message || 'Failed to update activity');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete an activity
  const handleDeleteActivity = async (id: string) => {
    setDeletingId(id);
    try {
      await profilesApi.removeAvailability(id);
      success('Activity removed from schedule');
      setAvailabilities((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete activity');
    } finally {
      setDeletingId(null);
    }
  };

  // Format display date
  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const isToday = selectedDate === getTodayString();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      const formatted = d.toLocaleDateString('en-US', options);
      return isToday ? `Today (${formatted})` : formatted;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading daily schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <CalendarCheck className="w-7 h-7 text-indigo-600" />
          Daily Schedule
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Plan your daily activities, set exact hours, and configure specific details for each task.
        </p>
      </div>

      {/* Date Selector Card */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Date
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setShowAddForm(false);
                    setEditingId(null);
                  }
                }}
                className="font-bold text-slate-900 text-sm bg-transparent border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayString())}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                  selectedDate === getTodayString()
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Add Activity Button */}
        <div>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2"
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Add Activity</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Add Activity Form */}
      {showAddForm && (
        <section className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Activity for {formattedSelectedDate}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddActivity} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Start Time</span>
                </label>
                <input
                  type="time"
                  required
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>End Time</span>
                </label>
                <input
                  type="time"
                  required
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Activity Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Activity / Task</span>
              </label>
              <select
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {COMMON_ACTIVITIES.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>

              {newActivity === 'Other / Custom Activity' && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom activity or task title..."
                  value={newCustomActivity}
                  onChange={(e) => setNewCustomActivity(e.target.value)}
                  className="w-full mt-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              )}
            </div>

            {/* Specific Options / Details */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Specific Options / Details</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Chapter 4 review, algorithm problem sets, or project meeting notes..."
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNew}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {savingNew ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Daily Schedule List (Ordered by Start Time) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Schedule for {formattedSelectedDate}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {dailyActivities.length} {dailyActivities.length === 1 ? 'Activity' : 'Activities'}
            </span>
          </div>
        </div>

        {dailyActivities.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm text-center text-slate-400 space-y-3">
            <CalendarCheck className="w-12 h-12 mx-auto text-indigo-200" />
            <div>
              <p className="text-sm font-bold text-slate-700">No activities scheduled for this date</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "+ Add Activity" above to configure your start time, end time, and task details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Activity</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyActivities.map((activityItem, idx) => {
              const isEditing = editingId === activityItem.id;
              const isDeleting = deletingId === activityItem.id;

              return (
                <div
                  key={activityItem.id}
                  className={`bg-white rounded-2xl p-5 border transition shadow-sm space-y-4 ${
                    isEditing ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Activity Header Bar */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider">
                        Activity {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {activityItem.startTime} → {activityItem.endTime}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(activityItem)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteActivity(activityItem.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Activity"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Activity Content or Edit Form */}
                  {isEditing ? (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                          Activity
                        </label>
                        <input
                          type="text"
                          required
                          value={editActivity}
                          onChange={(e) => setEditActivity(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                          Details
                        </label>
                        <textarea
                          rows={2}
                          value={editDetails}
                          onChange={(e) => setEditDetails(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(activityItem.id)}
                          className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-xs"
                        >
                          {savingEdit ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Activity:
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">
                          {activityItem.activity || 'Scheduled Study Activity'}
                        </h4>
                      </div>

                      {activityItem.details && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Details:
                          </span>
                          <p className="text-sm text-slate-600 mt-0.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                            {activityItem.details}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
