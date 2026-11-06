import { Box } from '@mui/material';

export default function SupportIllustration({ sx = {} }) {
  return <Box component="svg" viewBox="0 0 360 245" aria-hidden="true" className="float-orb" sx={{ width: '100%', maxWidth: 360, ...sx }}>
    <defs>
      <linearGradient id="orb-gradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#3c829e" /><stop offset="1" stopColor="#124b67" /></linearGradient>
      <linearGradient id="bot-gradient" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#dceff5" /></linearGradient>
    </defs>
    <circle cx="188" cy="126" r="109" fill="none" stroke="#fff" strokeOpacity=".08" />
    <circle cx="188" cy="126" r="91" fill="none" stroke="#fff" strokeOpacity=".08" strokeDasharray="4 8" />
    <circle cx="188" cy="126" r="72" fill="url(#orb-gradient)" />
    <ellipse cx="188" cy="196" rx="63" ry="10" fill="#062b41" opacity=".4" />
    <rect x="132" y="88" width="112" height="89" rx="32" fill="url(#bot-gradient)" />
    <rect x="144" y="104" width="88" height="50" rx="20" fill="#0b3954" />
    <path d="M161 124q5-8 10 0M204 124q5-8 10 0" fill="none" stroke="#b6ede2" strokeWidth="4" strokeLinecap="round" />
    <path d="M181 138q7 7 14 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <rect x="124" y="116" width="9" height="29" rx="4" fill="#d8ecf3" /><rect x="243" y="116" width="9" height="29" rx="4" fill="#d8ecf3" />
    <path d="M188 88V74" stroke="#d8ecf3" strokeWidth="4" /><circle cx="188" cy="70" r="7" fill="#fb985b" />
    <rect x="37" y="57" width="112" height="42" rx="12" fill="#fff" transform="rotate(-8 37 57)" />
    <text x="54" y="78" fill="#0b3954" fontSize="12" fontFamily="Noto Sans Gujarati, sans-serif" transform="rotate(-8 37 57)">નમસ્તે! 👋</text>
    <rect x="225" y="173" width="118" height="41" rx="12" fill="#fff" transform="rotate(6 225 173)" />
    <text x="239" y="199" fill="#0b3954" fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif" transform="rotate(6 225 173)">Here to help.</text>
    <circle cx="299" cy="76" r="18" fill="#ee783c" /><path d="m292 77 5 5 9-11" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m84 161 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e9b670" />
    <path d="m268 30 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#adc8d7" />
    <circle cx="111" cy="218" r="4" fill="#70acb5" /><circle cx="317" cy="131" r="3" fill="#70acb5" /><circle cx="53" cy="133" r="3" fill="#70acb5" />
  </Box>;
}
