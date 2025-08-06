import React from 'react';
import { Package } from 'lucide-react';

const AppSidebar = () => {
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "DashboardIcon",
    },
    {
      title: "Users",
      url: "/users",
      icon: "UsersIcon",
    },
    {
      title: "Settings",
      url: "/settings",
      icon: "SettingsIcon",
    },
    {
      title: "Kits Diarios",
      url: "/kits",
      icon: Package,
      items: [
        {
          title: "Asignaciones",
          url: "/kits",
        },
      ],
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
