"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sun, Moon } from "lucide-react"
import { motion } from "framer-motion"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />
        <div className="w-8 h-4 rounded-full bg-gray-300 animate-pulse" />
        <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />
      </div>
    )
  }

  const isDark = theme === "dark"

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center space-x-3"
    >
      <motion.div
        animate={{ 
          scale: isDark ? 0.8 : 1,
          opacity: isDark ? 0.5 : 1 
        }}
        transition={{ duration: 0.2 }}
      >
        <Sun className="w-4 h-4 text-yellow-500" />
      </motion.div>
      
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        className="data-[state=checked]:bg-blue-600"
      />
      
      <motion.div
        animate={{ 
          scale: isDark ? 1 : 0.8,
          opacity: isDark ? 1 : 0.5 
        }}
        transition={{ duration: 0.2 }}
      >
        <Moon className="w-4 h-4 text-blue-400" />
      </motion.div>
    </motion.div>
  )
}

export function ThemeToggleWithLabel() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-between">
        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
        <div className="w-12 h-6 bg-gray-300 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="theme-toggle" className="text-sm font-medium">
        Theme
      </Label>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-muted-foreground">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
        <ThemeToggle />
      </div>
    </div>
  )
} 