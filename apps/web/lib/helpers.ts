export function createQueryKey(baseKey: readonly string[], params: string[]) {
	return [...baseKey, ...params] as const;
}
