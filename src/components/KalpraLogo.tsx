import React from "react"
import kalpraLogoImg from "../assets/Kalpra-logo.png"

export function KalpraLogo({
  className = "h-10",
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <img
      src={kalpraLogoImg}
      alt="Kalpra Tech"
      className={`object-contain ${className}`}
    />
  )
}

export default KalpraLogo
