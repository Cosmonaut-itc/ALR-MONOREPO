import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Efficiency, EmployeeUse, ProductStat } from '@/lib/schemas';

interface StatisticsState {
	// Data
	productStats: ProductStat[];
	employeeUses: EmployeeUse[];
	efficiencyData: Efficiency[];

	// User info
	userName: string;
	branchName: string;

	// Loading states
	isLoadingProducts: boolean;
	isLoadingEmployees: boolean;
	isLoadingEfficiency: boolean;

	// Actions
	setProductStats: (stats: ProductStat[]) => void;
	setEmployeeUses: (uses: EmployeeUse[]) => void;
	setEfficiencyData: (data: Efficiency[]) => void;
	setUserInfo: (userName: string, branchName: string) => void;
	setLoadingProducts: (loading: boolean) => void;
	setLoadingEmployees: (loading: boolean) => void;
	setLoadingEfficiency: (loading: boolean) => void;
}

export const useStatisticsStore = create<StatisticsState>()(
	devtools(
		(set) => ({
			// Initial data
			productStats: [],
			employeeUses: [],
			efficiencyData: [],

			// Initial user info
			userName: 'Usuario',
			branchName: 'Sucursal Principal',

			// Initial loading states
			isLoadingProducts: true,
			isLoadingEmployees: true,
			isLoadingEfficiency: true,

			// Actions
			setProductStats: (stats) => set({ productStats: stats }),
			setEmployeeUses: (uses) => set({ employeeUses: uses }),
			setEfficiencyData: (data) => set({ efficiencyData: data }),
			setUserInfo: (userName, branchName) => set({ userName, branchName }),
			setLoadingProducts: (loading) => set({ isLoadingProducts: loading }),
			setLoadingEmployees: (loading) => set({ isLoadingEmployees: loading }),
			setLoadingEfficiency: (loading) => set({ isLoadingEfficiency: loading }),
		}),
		{ name: 'statistics-store' },
	),
);
