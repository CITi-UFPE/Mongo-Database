import { useState, useRef, useEffect } from "react";

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // referência ao container

  const user = {
    name: "Dados TopSecret",
    role: "Visualizador",
    department: "TI",
    initials: "J",
  };

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const handleLogout = () => console.log("Saindo...");

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de perfil */}
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold shadow-md hover:scale-105 transition-transform"
      >
        {user.initials}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg z-50
                     backdrop-blur-md bg-slate-800/70 border border-slate-700/50 overflow-hidden"
        >
          {/* Cabeçalho */}
          <div className="p-4 border-b border-slate-700/50">
            <p className="font-semibold text-slate-100">{user.name}</p>
            <p className="text-sm text-slate-400">
              {user.role} — {user.department}
            </p>
          </div>

          {/* Ações */}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-200 px-4 py-2 hover:bg-slate-700/50 transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
