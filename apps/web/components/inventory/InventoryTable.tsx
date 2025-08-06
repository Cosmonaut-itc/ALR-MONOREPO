import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { DisposeItemDialog } from "./DisposeItemDialog";
import { useDisposalStore } from "@/stores/disposal-store";

export const InventoryTable = ({ items }) => {
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    showDisposeDialog({
                      id: item.id,
                      nombre: item.nombre,
                      codigoBarras: item.codigoBarras,
                      cantidad: item.cantidad,
                      categoria: item.categoria,
                      marca: item.marca,
                      precio: item.precio,
                    })
                  }
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <DisposeItemDialog />
    </div>
  );
};
