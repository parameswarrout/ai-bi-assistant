"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface RegionSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

export default function RegionSelect({ value, onChange, options }: RegionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input px-4 py-1.5 text-xs text-zinc-200 outline-none w-36 cursor-pointer flex items-center justify-between transition-all"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-violet-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`} />
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-2 z-50 p-1.5 w-44 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 shadow-[0_10px_45px_-10px_rgba(0,0,0,0.85)] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ transformOrigin: "top left" }}
        >
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-all duration-150 select-none
                    ${isSelected 
                      ? "bg-violet-600 text-white font-semibold shadow-md shadow-violet-600/25" 
                      : "text-zinc-300 hover:bg-zinc-850 hover:text-white"
                    }
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
