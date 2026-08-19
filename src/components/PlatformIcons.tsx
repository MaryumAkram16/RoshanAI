import React from 'react';

export type PlatformId = 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer';

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  brandColor: string;
  bgColor: string;
  borderColor: string;
  tag: string;
  subtitle: string;
  charLimit: string;
  highlights: string[];
  icon: React.FC<{ size?: number; color?: string }>;
}

export const UpworkIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#14A800' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.47 6.07c-2.3 0-3.9 1.54-4.46 3.69-.93-1.46-1.63-3.15-2.01-4.76H8.25v5.82c0 1.58-1.28 2.87-2.86 2.87-1.58 0-2.86-1.29-2.86-2.87V5H0v5.82c0 3.09 2.5 5.6 5.58 5.6 3.08 0 5.58-2.51 5.58-5.6v-1.1c.32.96.84 2.22 1.63 3.39l-1.49 6.89h2.8l1.09-5.07c.75.48 1.6.76 2.48.76 2.38 0 4.33-1.95 4.33-4.34 0-2.39-1.95-4.28-4.33-4.28zm.05 6.08c-.97 0-1.76-.79-1.76-1.76 0-.98.79-1.77 1.76-1.77.98 0 1.77.79 1.77 1.77 0 .97-.79 1.76-1.77 1.76z"
      fill={color}
    />
  </svg>
);

export const LinkedInIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#0A66C2' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export const FiverrIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#1DBF73' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.003 14.777c-.504 2.164-2.185 3.633-4.485 3.633-3.125 0-5.184-2.316-5.184-5.59 0-3.232 2.103-5.578 5.228-5.578 3.01 0 4.908 2.052 4.908 5.093 0 .42-.036.87-.107 1.34h-7.051c.143 1.621 1.157 2.656 2.478 2.656 1.05 0 1.75-.465 2.086-1.32l2.127-.234zm-2.898-3.076c-.072-1.258-.87-2.115-2.023-2.115-1.127 0-1.97.834-2.133 2.115h4.156zM8.34 7.553H11v10.66H8.34V7.553zm.18-4.223c.875 0 1.547.66 1.547 1.512 0 .864-.672 1.512-1.547 1.512-.863 0-1.535-.648-1.535-1.512 0-.852.672-1.512 1.535-1.512zM3.447 7.553h2.66v10.66H3.447V7.553zM3.627 3.33c.875 0 1.547.66 1.547 1.512 0 .864-.672 1.512-1.547 1.512-.863 0-1.535-.648-1.535-1.512 0-.852.672-1.512 1.535-1.512z" />
  </svg>
);

export const FreelancerIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#29B2FE' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M14.095 2.766l-3.328 3.754 4.544.838zM24 10.428l-8.082-1.512-2.164 2.441 5.922 1.096zm-17.708 7.39l7.075-8.006-8.917-1.666zm-4.708-8.797l1.782 2.016 3.662-.684-2.825-3.19zM19.78 13.91l-4.148-.77-2.316 2.612 2.213.411z" />
  </svg>
);

export const PLATFORM_CONFIGS: Record<'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer', PlatformMeta> = {
  Upwork: {
    id: 'Upwork',
    name: 'Upwork',
    brandColor: '#14A800',
    bgColor: 'rgba(20, 168, 0, 0.05)',
    borderColor: 'rgba(20, 168, 0, 0.3)',
    tag: 'Top-Rated Algorithm',
    subtitle: 'Hourly & Fixed contracts with keyword-optimized overview',
    charLimit: '5,000 chars limit',
    highlights: ['Client Search SEO', 'Hook Headline', 'Skills Match'],
    icon: UpworkIcon,
  },
  LinkedIn: {
    id: 'LinkedIn',
    name: 'LinkedIn',
    brandColor: '#0A66C2',
    bgColor: 'rgba(10, 102, 194, 0.05)',
    borderColor: 'rgba(10, 102, 194, 0.3)',
    tag: 'All-Star B2B Profile',
    subtitle: 'Headline, About section & inbound recruiter visibility',
    charLimit: '2,600 chars limit',
    highlights: ['Executive Tone', 'Recruiter Keywords', 'Social Proof'],
    icon: LinkedInIcon,
  },
  Fiverr: {
    id: 'Fiverr',
    name: 'Fiverr',
    brandColor: '#1DBF73',
    bgColor: 'rgba(29, 191, 115, 0.05)',
    borderColor: 'rgba(29, 191, 115, 0.3)',
    tag: 'Pro & Gig Conversion',
    subtitle: 'High-converting bio designed for direct orders & buyers',
    charLimit: '600 chars limit',
    highlights: ['Direct CTA', 'Gig Highlights', 'Buyer Clarity'],
    icon: FiverrIcon,
  },
  Freelancer: {
    id: 'Freelancer',
    name: 'Freelancer',
    brandColor: '#0082CD',
    bgColor: 'rgba(0, 130, 205, 0.05)',
    borderColor: 'rgba(0, 130, 205, 0.3)',
    tag: 'Bid & Contest Rank',
    subtitle: 'Milestone-focused summary and competitive skill matrix',
    charLimit: '1,500 chars limit',
    highlights: ['Bid Win-Rate', 'Portfolio Focus', 'Milestone Trust'],
    icon: FreelancerIcon,
  },
};
