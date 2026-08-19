import React from 'react';
import { cn } from './Card';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function Button({ className, variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E87C2E] disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

  const variants = {
    primary: 'bg-[#E87C2E] text-white hover:bg-[#d06d26] shadow-sm hover:shadow-orange-200/60 hover:shadow-md active:scale-[0.98]',
    secondary: 'bg-[#F0EBE1] text-[#1A1410] hover:bg-[#e0d9cc]',
    outline: 'border border-[#E8E0D4] bg-white hover:bg-[#FDFAF5] hover:border-[#1A1410]/20 text-[#1A1410]',
    ghost: 'text-[#8B7355] hover:bg-[#F0EBE1] hover:text-[#1A1410]',
  };

  const sizes = {
    sm: 'h-8 px-3.5 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}