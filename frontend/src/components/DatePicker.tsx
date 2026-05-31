"use client";
import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ selectedDate, onChange, placeholder }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set internal calendar navigation focus
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Initialize navigation month to selected date if provided
  useEffect(() => {
    if (selectedDate) {
      const [year, month] = selectedDate.split("-").map(Number);
      if (!isNaN(year) && !isNaN(month)) {
        setCurrentYear(year);
        setCurrentMonth(month - 1);
      }
    }
  }, [selectedDate, isOpen]);

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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const selectDay = (day: number, month: number, year: number) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(dateString);
    setIsOpen(false);
  };

  // Generate grid cells
  const getDaysGrid = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const cells = [];
    
    // Padding from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthTotalDays - i,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false,
      });
    }
    
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }
    
    // Padding from next month
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false,
      });
    }
    
    return cells;
  };

  const daysGrid = getDaysGrid();
  const today = new Date();

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Date Field Button wrapper */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input px-4 py-1.5 text-xs text-zinc-200 outline-none w-[150px] cursor-pointer flex items-center justify-between transition-all"
      >
        <span className={selectedDate ? "text-zinc-200" : "text-zinc-500"}>
          {selectedDate ? formatDateDisplay(selectedDate) : placeholder}
        </span>
        <CalendarIcon className="w-3.5 h-3.5 text-violet-400 shrink-0 ml-2" />
      </button>

      {/* Glassmorphic Dropdown Custom Calendar */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-2 z-50 p-4 w-[280px] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 shadow-[0_10px_45px_-10px_rgba(0,0,0,0.85)] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ transformOrigin: "top left" }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-zinc-900">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-zinc-100 tracking-wide">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_SHORT.map((day) => (
              <span key={day} className="text-[10px] font-bold text-violet-400/80 uppercase select-none">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((cell, idx) => {
              const formattedMonth = String(cell.month + 1).padStart(2, "0");
              const formattedDay = String(cell.day).padStart(2, "0");
              const dateString = `${cell.year}-${formattedMonth}-${formattedDay}`;
              const isSelected = selectedDate === dateString;
              const isToday = 
                today.getDate() === cell.day && 
                today.getMonth() === cell.month && 
                today.getFullYear() === cell.year;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDay(cell.day, cell.month, cell.year)}
                  className={`
                    w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all select-none
                    ${cell.isCurrentMonth ? "text-zinc-200" : "text-zinc-650"}
                    ${isSelected 
                      ? "bg-violet-600 text-white font-bold shadow-lg shadow-violet-600/35 scale-105" 
                      : "hover:bg-zinc-850 hover:text-white"
                    }
                    ${isToday && !isSelected ? "border border-violet-500/50 text-violet-300" : ""}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Optional: Clear action inside calendar */}
          {selectedDate && (
            <div className="mt-3 pt-2.5 border-t border-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-violet-400 transition"
              >
                <X className="w-3 h-3" /> Clear Date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
