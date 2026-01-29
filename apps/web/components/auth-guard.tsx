"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types";

type RoleName = UserRole["role"];

interface RoleGuardProps {
	/** Explicit role override; if omitted, derives from auth store */
	userRole?: RoleName | null;

	/** The roles that are allowed to access the content */
	allowedRoles: RoleName[];

	/** The content to render if the user has permission */
	children: ReactNode;

	/** Optional content to render if the user lacks permission */
	fallback?: ReactNode;
}

/**
 * A component that conditionally renders its children based on user role permissions
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
	userRole,
	allowedRoles,
	children,
	fallback = null,
}) => {
	const storeUser = useAuthStore((s) => s.user);
	const isRoleName = (value: unknown): value is RoleName =>
		value === "employee" || value === "encargado" || value === "admin";

	const derivedRole: RoleName | null = isRoleName(storeUser?.role)
		? storeUser?.role ?? null
		: null;

	const effectiveRole: RoleName | null = userRole ?? derivedRole ?? null;

	if (!effectiveRole) {
		return <>{fallback}</>;
	}

	if (effectiveRole === "admin") {
		return <>{children}</>;
	}

	const hasPermission = allowedRoles.includes(effectiveRole);

	return <>{hasPermission ? children : fallback}</>;
};
