import * as React from 'react';

export const GoogleMeetIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Yellow/Amber flap */}
    <path
      d="M37 24L43.8 28.5C44.5 29 45 28.5 45 27.6V16.4C45 15.5 44.5 15 43.8 15.5L37 20V24Z"
      fill="#FBBC04"
    />
    {/* Green bottom/right */}
    <path
      d="M37 14V34C37 36.2 35.2 38 33 38H11C8.8 38 7 36.2 7 34V14C7 11.8 8.8 10 11 10H33C35.2 10 37 11.8 37 14Z"
      fill="#00AC47"
    />
    {/* Blue top left */}
    <path
      d="M11 10C8.8 10 7 11.8 7 14V26L21 21L37 14V14C37 11.8 35.2 10 33 10H11Z"
      fill="#00832D"
      opacity="0.3"
    />
    {/* Red bottom left */}
    <path
      d="M7 26V34C7 36.2 8.8 38 11 38H23L17 26H7Z"
      fill="#EA4335"
    />
    {/* Blue camera body */}
    <path
      d="M33 10H15L23 24L37 20V14C37 11.8 35.2 10 33 10Z"
      fill="#2684FC"
    />
    <path
      d="M23 24L15 38H33C35.2 38 37 36.2 37 34V20L23 24Z"
      fill="#00AC47"
    />
  </svg>
);

export const MicrosoftTeamsIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background violet rounded base */}
    <rect width="48" height="48" rx="12" fill="#464EB8" />
    {/* Back small person */}
    <circle cx="31" cy="18" r="4" fill="#7B83EB" />
    <path
      d="M26 31C26 27.7 28.7 25 32 25H34C37.3 25 40 27.7 40 31V33H26V31Z"
      fill="#7B83EB"
    />
    {/* Front larger person */}
    <circle cx="20" cy="19" r="5" fill="#FFFFFF" />
    <path
      d="M13 33C13 28.6 16.6 25 21 25H23C27.4 25 31 28.6 31 33V35H13V33Z"
      fill="#FFFFFF"
    />
    {/* T Badge on left */}
    <rect x="7" y="15" width="16" height="18" rx="4" fill="#505AC9" stroke="#3D45A4" strokeWidth="1" />
    <path
      d="M11 20H19M15 20V29"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
