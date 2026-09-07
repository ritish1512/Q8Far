import React from 'react';

// Square Indicator Action Block (e.g., Pencil / Edit tool)
export const SquareActionButton: React.FC<{ icon: React.ReactNode; color?: string; onClick?: () => void }> = ({ icon, color = 'bg-[#DC2626]', onClick }) => {
  return (
    <button onClick={onClick} className={`w-10 h-10 ${color} rounded-sm flex items-center justify-center text-white shadow-sm hover:brightness-90 transition-all`}>
      {icon}
    </button>
  );
};

// Rectangular Badged Indicator Label Button
export const LabelBadge: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => {
  return (
    <div className="bg-agri-primary text-white px-4 py-2 rounded-sm flex items-center gap-2 font-label text-xs tracking-wider font-medium w-fit">
      {icon}
      <span>{label}</span>
    </div>
  );
};
