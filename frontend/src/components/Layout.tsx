import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { GuideBot } from './GuideBot';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {user && <Sidebar />}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <GuideBot />
    </div>
  );
};
