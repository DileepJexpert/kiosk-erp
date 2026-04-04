"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  disabled?: boolean
}

function Select({ value, defaultValue, onValueChange, children, disabled }: SelectProps) {
  // Extract placeholder from SelectTrigger > SelectValue
  let placeholder = ""
  let options: React.ReactNode[] = []
  let className = ""

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const childType = child.type as any
    const displayName = childType?.displayName || childType?.name || ""

    if (displayName === "SelectTrigger") {
      className = (child.props as any).className || ""
      React.Children.forEach((child.props as any).children, (triggerChild: any) => {
        if (React.isValidElement(triggerChild)) {
          const triggerChildType = triggerChild.type as any
          const name = triggerChildType?.displayName || triggerChildType?.name || ""
          if (name === "SelectValue" && (triggerChild.props as any).placeholder) {
            placeholder = (triggerChild.props as any).placeholder
          }
        }
      })
    } else if (displayName === "SelectContent") {
      options = React.Children.toArray((child.props as any).children).filter(React.isValidElement)
    }
  })

  return (
    <select
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {placeholder && (
        <option value="" disabled={!value && !defaultValue}>
          {placeholder}
        </option>
      )}
      {options}
    </select>
  )
}

function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <>{children}</>
}
SelectTrigger.displayName = "SelectTrigger"

function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
SelectContent.displayName = "SelectContent"

function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
SelectItem.displayName = "SelectItem"

function SelectValue({ placeholder }: { placeholder?: string }) {
  return null
}
SelectValue.displayName = "SelectValue"

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
