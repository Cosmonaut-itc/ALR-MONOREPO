// src/hooks/form-context.ts
import { createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts();
