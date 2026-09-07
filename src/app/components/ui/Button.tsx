import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'inverted' | 'outlined';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyle = "px-6 py-2 rounded-sm font-body text-sm font-semibold tracking-wide transition-colors duration-150 text-center min-w-[120px]";
  
  const variants = {
    primary: "bg-[#134E34] text-white hover:bg-[#0d3624]",
    secondary: "bg-[#B45309] text-white hover:bg-[#92400e]",
    inverted: "bg-[#334155] text-white hover:bg-[#1e293b]",
    outlined: "border border-[#334155] text-[#334155] bg-transparent hover:bg-[#334155]/5"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
