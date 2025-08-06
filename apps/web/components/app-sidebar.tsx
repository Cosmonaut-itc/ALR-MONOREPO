import { Package } from 'lucide-react';

const data = {
  navMain: [
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
        {
          title: "Historial",
          url: "/kits/historial",
        },
      ],
    },
    //** rest of code here **/
  ],
};

export default data;
