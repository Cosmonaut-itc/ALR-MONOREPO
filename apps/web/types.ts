import { type as t } from 'arktype';

export const loginSchema = t({
	email: 'string',
	password: 'string',
});

export const userRoleSchema = t({
	role: "'encargado' | 'admin'",
});

export type LoginType = typeof loginSchema.infer;

export type UserRole = typeof userRoleSchema.infer;
