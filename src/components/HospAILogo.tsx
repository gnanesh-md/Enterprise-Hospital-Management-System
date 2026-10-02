import React from "react"
import hospaiLogoImg from "../assets/hospai-logo.png"

interface HospAILogoProps {
  className?: string
  variant?: "full" | "icon" | "horizontal"
  theme?: "dark" | "light"
  size?: number | string
}

export function HospAILogo({
  className = "h-12",
  variant = "horizontal",
  size,
}: HospAILogoProps) {
  const containerStyle = size
    ? { width: size, height: size }
    : undefined

  if (variant === "icon") {
    return (
      <div
        style={containerStyle}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src={hospaiLogoImg}
          alt="HospAI"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>
    )
  }

  if (variant === "horizontal") {
    return (
      <div
        style={containerStyle}
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      >
        <img
          src={hospaiLogoImg}
          alt="HospAI"
          className="h-full w-auto max-h-full object-contain mx-auto drop-shadow-sm"
        />
      </div>
    )
  }

  // Full / Stacked Variant
  return (
    <div
      style={containerStyle}
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
    >
      <img
        src={hospaiLogoImg}
        alt="HospAI"
        className="w-full h-auto max-h-48 object-contain drop-shadow-md"
      />
    </div>
  )
}

export default HospAILogo
