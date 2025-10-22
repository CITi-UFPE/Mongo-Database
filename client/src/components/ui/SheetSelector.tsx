import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SheetSelector() {
  const [selectedSheet, setSelectedSheet] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Opções de planilhas disponíveis
  const sheets = [
    { id: "sheet1", name: "Planilha 1" },
    { id: "sheet2", name: "Planilha 2" },
    { id: "sheet3", name: "Planilha 3" },
  ];

  const handleSelectSheet = (sheetId: string) => {
    setSelectedSheet(sheetId);
    setIsOpen(false); // Fecha o painel após selecionar
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Select Sheet</Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Select a Sheet</SheetTitle>
            <SheetDescription>
              Choose a sheet from the list below to view its data.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4">
            <div className="grid gap-4">
                <Label htmlFor="sheet-select">Select a Sheet</Label>
                <Select value={selectedSheet} onValueChange={handleSelectSheet}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>

          <SheetFooter>
            <Button
              type="button"
              onClick={() => {
                if (!selectedSheet) {
                  alert("Please select a sheet.");
                  return;
                }
                console.log("Selected Sheet:", selectedSheet);
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

export {SheetSelector};