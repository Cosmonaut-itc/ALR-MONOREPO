import { type as t } from 'arktype';

export const loginSchema = t({
	email: 'string',
	password: 'string',
});

export type LoginType = typeof loginSchema.infer;
