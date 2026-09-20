import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Skill } from '../types';
import { Search, Check, ChevronDown, X, Loader2, Sparkles, Tag } from 'lucide-react';

interface SearchableSkillSelectProps {
  skills: Skill[];
  selectedSkillId: string;
  onSelectSkill: (skill: Skill) => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSkillSelect: React.FC<SearchableSkillSelectProps> = ({
  skills,
  selectedSkillId,
  onSelectSkill,
  loading = false,
  placeholder = 'Select a skill from directory...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected skill
  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId),
    [skills, selectedSkillId],
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter skills by name and category
  const filteredSkills = useMemo(() => {
    if (!searchTerm.trim()) {
      return skills;
    }
    const clean = searchTerm.trim().toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(clean) ||
        (s.category && s.category.toLowerCase().includes(clean)),
    );
  }, [skills, searchTerm]);

  const handleSelect = (skill: Skill) => {
    onSelectSkill(skill);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2 bg-slate-50 border rounded-xl text-left flex items-center justify-between gap-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isOpen ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white' : 'border-slate-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'hover:border-slate-300'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          {selectedSkill ? (
            <div className="truncate flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 truncate">
                {selectedSkill.name}
              </span>
              {selectedSkill.category && (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full shrink-0">
                  {selectedSkill.category}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
            />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills (e.g. Python, React, Math, Figma)..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Skill Items List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredSkills.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">No matching skills found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Try searching for a different keyword or category
                </p>
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const isSelected = skill.id === selectedSkillId;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSelect(skill)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition ${
                      isSelected
                        ? 'bg-indigo-50/70 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{skill.name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            Selected
                          </span>
                        )}
                      </div>
                      {skill.category && (
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{skill.category}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
