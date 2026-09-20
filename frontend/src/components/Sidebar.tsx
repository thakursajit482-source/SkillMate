import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Compass,
  PlusCircle,
  FileText,
  Handshake,
  CheckSquare,
  MessageSquare,
  UserCheck,
  CalendarCheck,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/match', label: 'Find with AI', icon: Sparkles },
    { to: '/discover/students', label: 'Find Students', icon: Users },
    { to: '/discover/requests', label: 'Explore Requests', icon: Compass },
    { to: '/requests/new', label: 'Post a Request', icon: PlusCircle },
    { to: '/requests/mine', label: 'My Requests', icon: FileText },
    { to: '/offers', label: 'My Offers', icon: Handshake },
    { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
    { to: '/chat', label: 'Messages', icon: MessageSquare },
    { to: '/profile', label: 'My Profile', icon: UserCheck },
    { to: '/profile/skills', label: 'Daily Schedule', icon: CalendarCheck },
    { to: '/verification', label: 'College Verification', icon: ShieldCheck },
    { to: '/settings', label: 'Safety & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 hidden md:block">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};
