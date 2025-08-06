import React from 'react';
import { Package } from 'lucide-react';

const AppSidebar: React.FC = () => {
  const navigationItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "DashboardIcon",
      items: []
    },
    {
      title: "Inventario",
      url: "/inventario",
      icon: "InventoryIcon",
      items: []
    },
    {
      title: "Kits Diarios",
      url: "/kits",
      icon: Package,
      items: []
    },
    // ** rest of code here **
  ];

  return (
    <div>
      {/* Sidebar content */}
    </div>
  );
};

export default AppSidebar;
