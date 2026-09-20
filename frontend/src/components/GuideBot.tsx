import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  Send,
  Sparkles,
  HelpCircle,
  FileText,
  Compass,
  Users,
  ShieldCheck,
  Calendar,
  MessageSquare,
  ChevronRight,
  Minimize2,
} from 'lucide-react';

interface GuideMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  quickLinks?: { label: string; path: string; icon?: React.ReactNode }[];
}

const FAQ_SUGGESTIONS = [
  'How do I post a request?',
  'How does payment / bounty work?',
  'How do I verify my college ID?',
  'How does Skill Exchange work?',
  'How do I set my daily schedule?',
  'Where are my active tasks?',
];

export const GuideBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<GuideMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm GuideBot, your SkillMate platform assistant. Ask me anything about how collaboration works, posting requests, college verification, or navigating the app!",
      quickLinks: [
        { label: 'Explore Requests', path: '/discover/requests' },
        { label: 'Find Students', path: '/discover/students' },
        { label: 'Post a Request', path: '/requests/new' },
        { label: 'Get Verified', path: '/verification' },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const getBotResponse = (query: string): { text: string; quickLinks?: { label: string; path: string }[] } => {
    const q = query.toLowerCase();

    if (q.includes('request') && (q.includes('post') || q.includes('create') || q.includes('make') || q.includes('new'))) {
      return {
        text: "To post a new request, navigate to 'Post Request' from the sidebar or click below. You can choose between Paid Bounty, Skill Exchange, or Social Collaboration, specify your topic, budget, and area!",
        quickLinks: [{ label: 'Post a Request', path: '/requests/new' }, { label: 'Explore Existing Requests', path: '/discover/requests' }],
      };
    }

    if (q.includes('pay') || q.includes('bounty') || q.includes('money') || q.includes('budget') || q.includes('rate') || q.includes('cost')) {
      return {
        text: "Paid Bounty requests let students offer monetary compensation for academic help or technical tutoring. When posting, set your budget in ₹ INR. When an offer is accepted, terms are locked into an agreed task.",
        quickLinks: [{ label: 'Browse Paid Requests', path: '/discover/requests' }],
      };
    }

    if (q.includes('verif') || q.includes('college') || q.includes('id card') || q.includes('student')) {
      return {
        text: "College verification ensures all SkillMate members are verified students. Upload your college ID card or enrollment details under the Verification tab to unlock full peer collaboration!",
        quickLinks: [{ label: 'Verify College ID', path: '/verification' }],
      };
    }

    if (q.includes('exchange') || q.includes('barter') || q.includes('swap') || q.includes('teach each')) {
      return {
        text: "Skill Exchange allows peer-to-peer knowledge swapping! You teach a skill you know (e.g. Python) in exchange for learning another skill (e.g. Graphic Design). No money needed.",
        quickLinks: [{ label: 'Create Skill Exchange', path: '/requests/new' }],
      };
    }

    if (q.includes('schedule') || q.includes('availab') || q.includes('daily') || q.includes('activity')) {
      return {
        text: "You can set your Daily Schedule under Skills & Availability. Choose your date, specify activities (e.g., Exam Prep, Coding, Project Help), and set exact start and end times to show when you're available for study sessions.",
        quickLinks: [{ label: 'Manage Daily Schedule', path: '/profile/skills' }],
      };
    }

    if (q.includes('task') || q.includes('active') || q.includes('status') || q.includes('accept')) {
      return {
        text: "When a request is accepted, an active Collaboration Task is initiated. Both students can coordinate, review milestones, and mark completion under Tasks.",
        quickLinks: [{ label: 'My Tasks', path: '/tasks' }, { label: 'My Offers', path: '/offers' }],
      };
    }

    if (q.includes('chat') || q.includes('message') || q.includes('talk') || q.includes('contact')) {
      return {
        text: "Direct messaging unlocks once you and another student share an open offer or collaboration task. You can chat in real-time under Messages.",
        quickLinks: [{ label: 'Go to Chat', path: '/chat' }],
      };
    }

    if (q.includes('find') || q.includes('search') || q.includes('peer') || q.includes('student')) {
      return {
        text: "You can discover students nearby filtered by skill, college, and availability under 'Find Students'.",
        quickLinks: [{ label: 'Find Students', path: '/discover/students' }],
      };
    }

    return {
      text: "I'm here to help you navigate SkillMate! You can discover open requests, find student peers nearby, post collaboration requests, or manage your daily schedule.",
      quickLinks: [
        { label: 'Explore Requests', path: '/discover/requests' },
        { label: 'Find Students', path: '/discover/students' },
        { label: 'My Requests', path: '/requests/mine' },
      ],
    };
  };

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg: GuideMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
    };

    const botAnswer = getBotResponse(q);
    const botMsg: GuideMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text: botAnswer.text,
      quickLinks: botAnswer.quickLinks,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 group"
          aria-label="Open SkillMate GuideBot"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600"></span>
          </div>
          <span className="font-bold text-xs pr-1">GuideBot</span>
        </button>
      )}

      {/* GuideBot Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-sm flex items-center gap-1.5">
                  SkillMate GuideBot
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                    Online
                  </span>
                </div>
                <div className="text-[11px] text-indigo-200">Platform Assistant & FAQs</div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition"
              aria-label="Close GuideBot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick FAQ Pills */}
          <div className="bg-slate-50 border-b border-slate-100 p-2.5 overflow-x-auto flex gap-1.5 no-scrollbar">
            {FAQ_SUGGESTIONS.map((faq, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(faq)}
                className="shrink-0 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition"
              >
                {faq}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Quick Action Navigation Links */}
                {msg.quickLinks && msg.quickLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                    {msg.quickLinks.map((link, idx) => (
                      <Link
                        key={idx}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100 border border-indigo-100 transition"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question about SkillMate..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
