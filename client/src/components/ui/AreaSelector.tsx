import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"; // Importando o componente Sheet do ShadCN


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button"; // Importando botão
import { Label } from "@/components/ui/label"; // Importando o componente Label

export default function AreaSelector() {
  const [selectedArea, setSelectedArea] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Opções de áreas disponíveis
  const areas = [
    { id: "area1", name: "Área 1" },
    { id: "area2", name: "Área 2" },
    { id: "area3", name: "Área 3" },
  ];

  const handleSelectArea = (areaId: string) => {
    setSelectedArea(areaId);
    setIsOpen(false); // Fecha o painel após selecionar a área
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Select Area</Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Select an Area</SheetTitle>
            <SheetDescription>
              Choose an area from the list below to view its data.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4">
            <div className="grid gap-4">
              <Label htmlFor="area-select">Select an Area</Label>
              <Select value={selectedArea} onValueChange={handleSelectArea}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>

          <SheetFooter>
            <Button
              type="button"
              onClick={() => {
                if (!selectedArea) {
                  alert("Please select an area.");
                  return;
                }
                console.log("Selected Area:", selectedArea);
                setIsOpen(false); // Fecha a janela quando a seleção é feita
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export {AreaSelector};