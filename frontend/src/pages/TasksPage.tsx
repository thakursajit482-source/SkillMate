import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksApi } from '../api/client';
import { TaskItem, TaskStatus } from '../types';
import { StatusBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Clock,
  IndianRupee,
  Repeat,
  ChevronRight,
  Loader2,
  Calendar,
  User,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await tasksApi.findMine({
        status: statusFilter || undefined,
      });
      setTasks(res.items || []);
    } catch (err: any) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <CheckSquare className="w-7 h-7 text-indigo-600" />
          Collaboration Tasks
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage active peer tasks, term confirmations, completions, and ratings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { label: 'All Tasks', value: '' },
          { label: 'Active', value: 'IN_PROGRESS' },
          { label: 'Pending Start', value: 'PENDING' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium">Loading collaboration tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No tasks in this view</h3>
          <p className="text-slate-500 text-sm mt-1">
            Accept an offer on your request, or have a peer accept your offer to start a task.
          </p>
          <Link
            to="/discover/requests"
            className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline"
          >
            Explore requests to collaborate →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isRequester = user?.id === task.requesterId;
            const counterpartName = isRequester
              ? task.helper?.name || 'Helper'
              : task.requester?.name || 'Requester';

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-xs text-slate-400">
                      Created {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {task.request?.title || 'Collaboration Task'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isRequester ? `Helper: ${counterpartName}` : `Requester: ${counterpartName}`}</span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-indigo-600">
                      {task.agreedPrice ? (
                        <>
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>₹{task.agreedPrice}</span>
                        </>
                      ) : (
                        <>
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Skill Swap</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/tasks/${task.id}`}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition shrink-0"
                >
                  <span>Open Task Details</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
