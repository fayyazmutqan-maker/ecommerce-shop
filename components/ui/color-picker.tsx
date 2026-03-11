"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pipette } from "lucide-react";

const PRESET_COLORS = [
  // Row 1: Reds
  "#ef4444", "#dc2626", "#b91c1c", "#991b1b",
  // Row 2: Oranges / Yellows
  "#f97316", "#f59e0b", "#eab308", "#facc15",
  // Row 3: Greens
  "#22c55e", "#16a34a", "#15803d", "#166534",
  // Row 4: Blues
  "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af",
  // Row 5: Purples / Pinks
  "#8b5cf6", "#7c3aed", "#ec4899", "#db2777",
  // Row 6: Neutrals
  "#ffffff", "#f5f5f4", "#a8a29e", "#78716c",
  "#525252", "#262626", "#171717", "#000000",
];

interface ColorPickerProps {
  value: string;
  defaultValue: string;
  onChange: (color: string) => void;
  onClear?: () => void;
}

export function ColorPicker({ value, defaultValue, onChange, onClear }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value || defaultValue);
  const displayColor = value || defaultValue;
  const isCustom = !!value && value !== defaultValue;

  function handleHexChange(raw: string) {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
      setHexInput(v);
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        onChange(v);
      }
    }
  }

  function handleSwatchClick(color: string) {
    onChange(color);
    setHexInput(color);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setHexInput(displayColor);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 w-9 rounded-md border-2 cursor-pointer shrink-0 transition-shadow",
            "hover:ring-2 hover:ring-ring hover:ring-offset-1",
            isCustom ? "border-primary" : "border-border"
          )}
          style={{ backgroundColor: displayColor }}
          title={displayColor}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Hex input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Pipette className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                className="h-8 pl-8 text-xs font-mono uppercase"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
            <div
              className="h-8 w-8 rounded-md border shrink-0"
              style={{ backgroundColor: displayColor }}
            />
          </div>

          {/* Swatches */}
          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-6 w-6 rounded-sm border cursor-pointer transition-transform hover:scale-110",
                  displayColor.toLowerCase() === color.toLowerCase()
                    ? "ring-2 ring-ring ring-offset-1"
                    : "border-border/50"
                )}
                style={{ backgroundColor: color }}
                onClick={() => handleSwatchClick(color)}
                title={color}
              />
            ))}
          </div>

          {/* Reset */}
          {isCustom && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                onClear();
                setHexInput(defaultValue);
              }}
            >
              Reset to Default ({defaultValue})
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
