import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from 'lucide-react';
import { DisposeItemDialog } from "./DisposeItemDialog";
import { useDisposalStore } from "@/stores/disposal-store";

const InventoryTable = ({ items }) => {
  const { show: showDisposeDialog } = useDisposalStore();

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Código de Barras</th>
            <th>Cantidad</th>
            <th>Categoría</th>
            <th>Marca</th>
            <th>Precio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.nombre}</td>
              <td>{item.codigoBarras}</td>
              <td>{item.cantidad}</td>
              <td>{item.categoria}</td>
              <td>{item.marca}</td>
              <td>{item.precio}</td>
              <td>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-[#E5E7EB] dark:hover:bg-[#2D3033]"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Ver detalles</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showDisposeDialog({
                      ...item,
                      productInfo: item.productInfo
                    })}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Dar de baja</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <DisposeItemDialog />
    </div>
  );
};

export default InventoryTable;
