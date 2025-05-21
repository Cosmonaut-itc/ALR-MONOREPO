//types.ts
import { type } from "arktype";

//Form Schema and types

// Login form schema and types
export const LoginFormSchema = type({
	email: "string.email",
	password: "string >= 8",
});
export type LoginForm = typeof LoginFormSchema.infer;
