import React, { useState, useEffect, useRef, useMemo } from 'react';
import { College } from '../types';
import { Building, Search, Check, ChevronDown, X, Loader2, MapPin } from 'lucide-react';

interface SearchableCollegeSelectProps {
  colleges: College[];
  selectedCollegeId: string;
  onChange: (collegeId: string) => void;
  loading?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

const COMMON_ACRONYMS: Record<string, string[]> = {
  tcet: ['thakur college of engineering and technology'],
  tcsc: ['thakur college of science and commerce'],
  viva: ['viva institute of technology'],
  slrtce: ['shree l. r. tiwari college of engineering', 'tiwari'],
  spit: ['sardar patel institute of technology'],
  spce: ['sardar patel college of engineering'],
  vjti: ['veermata jijabai technological institute'],
  kjsce: ['k. j. somaiya college of engineering'],
  kjsit: ['k. j. somaiya institute of technology'],
  somaiya: ['somaiya'],
  mithibai: ['mithibai college'],
  nm: ['n. m. college'],
  iitb: ['indian institute of technology bombay'],
  iit: ['indian institute of technology bombay'],
  sfit: ['st. francis institute of technology'],
  tsec: ['thadomal shahani engineering college'],
  crce: ['fr. conceicao rodrigues college of engineering'],
  fcrit: ['fr. c. rodrigues institute of technology'],
  vesit: ["vivekanand education society's institute of technology"],
  dbit: ['don bosco institute of technology'],
  sakec: ['shah & anchor kutchhi engineering college'],
  apsit: ['a. p. shah institute of technology'],
  rait: ['ramrao adik institute of technology'],
  pce: ['pillai college of engineering'],
  ict: ['institute of chemical technology'],
  xie: ['xavier institute of engineering'],
  kes: ["kandivli education society's shroff college"],
  nmims: ['mukesh patel', 'nmims'],
};

export const SearchableCollegeSelect: React.FC<SearchableCollegeSelectProps> = ({
  colleges,
  selectedCollegeId,
  onChange,
  loading = false,
  placeholder = 'Select College / University...',
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected college object
  const selectedCollege = useMemo(
    () => colleges.find((c) => c.id === selectedCollegeId),
    [colleges, selectedCollegeId],
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter colleges based on user query
  const filteredColleges = useMemo(() => {
    if (!searchTerm.trim()) {
      return colleges;
    }
    const clean = searchTerm.trim().toLowerCase();
    const acronymTargets = COMMON_ACRONYMS[clean] || [];

    return colleges.filter((c) => {
      const name = c.name.toLowerCase();
      const area = (c.area || '').toLowerCase();
      const city = (c.city || '').toLowerCase();

      // Direct substring match
      if (name.includes(clean) || area.includes(clean) || city.includes(clean)) {
        return true;
      }

      // Acronym alias match
      if (acronymTargets.some((target) => name.includes(target))) {
        return true;
      }

      return false;
    });
  }, [colleges, searchTerm]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && !loading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm transition cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-200'
            : isOpen
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
              : error
                ? 'border-red-400 bg-red-50/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-white'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden pr-2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
          ) : (
            <Building
              className={`w-4 h-4 shrink-0 ${
                selectedCollege ? 'text-indigo-600' : 'text-slate-400'
              }`}
            />
          )}

          {selectedCollege ? (
            <div className="truncate text-left leading-tight">
              <span className="font-semibold text-slate-900 block truncate">
                {selectedCollege.name}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                {selectedCollege.area ? `${selectedCollege.area}, ` : ''}
                {selectedCollege.city || 'Mumbai'}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 truncate">
              {loading ? 'Loading colleges directory...' : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCollege && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search college, area, or acronym (e.g. Thakur, VJTI, SPIT)..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-slate-500">
              <span>Mumbai Metropolitan Region Colleges</span>
              <span className="font-semibold text-indigo-600">
                {filteredColleges.length} {filteredColleges.length === 1 ? 'result' : 'colleges'}
              </span>
            </div>
          </div>

          {/* College Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 py-1">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((c) => {
                const isSelected = c.id === selectedCollegeId;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(c.id);
                      }
                    }}
                    className={`px-3.5 py-2.5 flex items-start justify-between gap-3 text-left transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold leading-tight text-slate-900">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {c.area ? `${c.area}, ` : ''}
                          {c.city || 'Mumbai'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center space-y-1.5">
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  No colleges found matching "{searchTerm}"
                </p>
                <p className="text-[11px] text-slate-400">
                  Try searching by area (e.g. Kandivali, Andheri, Borivali) or acronym.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
