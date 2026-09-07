import React from 'react';

export const SearchBar: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <div className="relative w-full max-w-md font-body">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-sm font-body text-sm focus:outline-none focus:border-agri-primary focus:bg-white transition-all text-agri-neutral"
        placeholder="Search tokens, centers or transactions..."
        {...props}
      />
    </div>
  );
};
