import { useState } from "react";
//import { Dropdown } from "lucide-react"; // Supondo que você tenha algum ícone de dropdown, como o do Lucide

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  // Simulando os dados do usuário
  const user = {
    name: "aaaaa",
    role: "Visualizador",
    department: "TI",
    initials: "A", // Inicial do nome
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev); // Alterna o estado do dropdown
  };

  const handleLogout = () => {
    console.log("Saindo...");
    // Lógica de logout
  };

  return (
    <div className="relative">
      {/* Ícone de usuário */}
      <button
        className="flex items-center justify-center w-10 h-10 bg-teal-500 text-white rounded-full cursor-pointer"
        onClick={toggleDropdown}
      >
        {user.initials}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-lg z-10 backdrop-blur-md">
          <div className="p-4">
            <p className="font-bold">{user.name}</p>
            <p className="text-sm text-gray-400">{user.role} - {user.department}</p>
          </div>
          <div className="border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm p-2 hover:bg-gray-700"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
