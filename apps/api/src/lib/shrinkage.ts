export const shrinkageSources = ['manual', 'transfer_missing'] as const;
export const shrinkageReasons = ['consumido', 'dañado', 'otro'] as const;

export type ShrinkageSource = (typeof shrinkageSources)[number];
export type ShrinkageReason = (typeof shrinkageReasons)[number];

/**
 * Escapes a CSV field preserving commas, quotes, and line breaks.
 */
export function escapeCsvValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}
	const asText = String(value);
	if (!(asText.includes(',') || asText.includes('"') || asText.includes('\n'))) {
		return asText;
	}
	return `"${asText.replaceAll('"', '""')}"`;
}

/**
 * Builds a default note for legacy write-off actions.
 */
export function buildLegacyShrinkageNote(action: 'delete' | 'empty'): string {
	if (action === 'delete') {
		return 'Registrado desde endpoint legacy product-stock/delete';
	}
	return 'Registrado desde endpoint legacy product-stock/update-is-empty';
}
