import React from "react"

export function KalpraLogo({
  className = "h-10",
  dark = true,
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 160 120"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Red upper circuits */}
        <g stroke="#C02633" strokeWidth="2.5" strokeLinecap="round">
          <path d="M 40 46 C 60 15, 100 15, 120 46" />
          <circle
            cx="40"
            cy="46"
            r="3.5"
            fill="#FFFFFF"
            stroke="#C02633"
            strokeWidth="2"
          />
          <path d="M 50 51 C 66 25, 96 25, 114 49" />
          <circle
            cx="50"
            cy="51"
            r="3"
            fill="#FFFFFF"
            stroke="#C02633"
            strokeWidth="2"
          />
          <path d="M 62 57 C 74 34, 94 34, 106 52" />
          <circle
            cx="62"
            cy="57"
            r="2.5"
            fill="#FFFFFF"
            stroke="#C02633"
            strokeWidth="1.8"
          />
          <path d="M 74 61 C 82 43, 92 43, 98 56" />
          <circle
            cx="74"
            cy="61"
            r="2"
            fill="#FFFFFF"
            stroke="#C02633"
            strokeWidth="1.8"
          />
          <path d="M 42 34 C 65 10, 105 10, 124 39" strokeWidth="3" />
          <circle
            cx="42"
            cy="34"
            r="3.8"
            fill="#FFFFFF"
            stroke="#C02633"
            strokeWidth="2"
          />
        </g>

        {/* Navy/Blue lower circuits */}
        <g
          stroke={dark ? "#60A5FA" : "#1E2B58"}
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M 120 64 C 100 95, 60 95, 40 64" />
          <circle
            cx="120"
            cy="64"
            r="3.5"
            fill="#FFFFFF"
            stroke={dark ? "#60A5FA" : "#1E2B58"}
            strokeWidth="2"
          />
          <path d="M 110 59 C 94 85, 64 85, 46 61" />
          <circle
            cx="110"
            cy="59"
            r="3"
            fill="#FFFFFF"
            stroke={dark ? "#60A5FA" : "#1E2B58"}
            strokeWidth="2"
          />
          <path d="M 98 53 C 86 76, 66 76, 54 58" />
          <circle
            cx="98"
            cy="53"
            r="2.5"
            fill="#FFFFFF"
            stroke={dark ? "#60A5FA" : "#1E2B58"}
            strokeWidth="1.8"
          />
          <path d="M 86 49 C 78 67, 68 67, 62 54" />
          <circle
            cx="86"
            cy="49"
            r="2"
            fill="#FFFFFF"
            stroke={dark ? "#60A5FA" : "#1E2B58"}
            strokeWidth="1.8"
          />
          <path d="M 118 76 C 95 100, 55 100, 36 71" strokeWidth="3" />
          <circle
            cx="118"
            cy="76"
            r="3.8"
            fill="#FFFFFF"
            stroke={dark ? "#60A5FA" : "#1E2B58"}
            strokeWidth="2"
          />
        </g>
      </svg>

      <div className="flex flex-col leading-none select-none">
        <span className="text-[#C02633] font-black text-[13px] tracking-wider">
          KALPRA TECH
        </span>
        <span
          className={`${
            dark ? "text-[#94A3B8]" : "text-[#1E2B58]"
          } font-bold text-[6.5px] tracking-[0.2em] mt-0.5 uppercase`}
        >
          YOUR AI &amp; GEN AI PARTNER
        </span>
      </div>
    </div>
  )
}

export default KalpraLogo
