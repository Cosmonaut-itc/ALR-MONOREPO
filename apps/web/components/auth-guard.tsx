import type { ReactNode } from 'react';
import type { UserRole } from '@/types';

interface RoleGuardProps {
	/** The current user's role */
	userRole: UserRole | null;

	/** The roles that are allowed to access the content */
	allowedRoles: UserRole[];

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
	// If no role is provided, don't render the protected content
	if (!userRole) {
		return <>{fallback}</>;
	}

	// Admin role has access to everything
	if (userRole.role === 'admin') {
		return <>{children}</>;
	}

	// Check if the user's role is in the list of allowed roles
	const hasPermission = allowedRoles.some((role) => role.role === userRole.role);

	// Render children or fallback based on permission
	return <>{hasPermission ? children : fallback}</>;
};
