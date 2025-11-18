import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { extractNameFromEmail } from "@/lib/nameUtils";

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // referência ao container
  const { user, logout } = useAuth();

  const email: string | undefined = user?.email;
  const { fullName, initials } = extractNameFromEmail(email);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const handleLogout = () => logout();

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
        className="flex items-center justify-center w-10 h-10 font-semibold text-white transition-transform rounded-full shadow-md bg-gradient-to-r from-blue-500 to-teal-500 hover:scale-105"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 z-50 w-56 mt-2 overflow-hidden border shadow-lg rounded-xl backdrop-blur-md bg-slate-800/70 border-slate-700/50"
        >
          {/* Cabeçalho */}
          <div className="p-4 border-b border-slate-700/50">
            <p className="font-semibold text-slate-100">{fullName}</p>
            <p className="text-sm text-slate-400">Usuário</p>
          </div>

          {/* Ações */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-left transition-colors text-slate-200 hover:bg-slate-700/50"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}


export const UserProfile = {
  name: "Dados TopSecret",
  role: "Analista de Dados",
  department: "Dados",
  initials: "D",
};