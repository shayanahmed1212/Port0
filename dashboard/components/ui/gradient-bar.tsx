"use client"

import { useEffect, useState } from "react"

export function GradientBar() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className="bottom-gradient-bar"
      aria-hidden="true"
      role="presentation"
    />
  )
}
