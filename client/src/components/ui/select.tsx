import React, { useState, useRef, useEffect } from "react";

interface SelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  renderOption: (option: T) => React.ReactNode;
}

export function Select<T>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  renderOption,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-60">
      {/* Trigger */}
      <button
        type="button"
        className="flex justify-between items-center w-full px-3 py-2 border rounded-md bg-white text-sm hover:ring-1 hover:ring-blue-500 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value ? renderOption(value) : placeholder}</span>
        {/* Ícone de seta */}
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
          {options.map((option, idx) => (
            <li
              key={idx}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${
                value === option ? "bg-blue-200 font-semibold" : ""
              }`}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {renderOption(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
