import React from "react"

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const ArchivistIcon: React.FC<IconProps> = ({ size = 20, className = "", style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}>
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  )
}
