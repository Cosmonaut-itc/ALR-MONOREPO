export const productStockData = [
	// Barcode 12345 - Multiple units
	{
		id: '550e8400-e29b-41d4-a716-446655440001',
		barcode: 12_345,
		lastUsed: new Date('2024-12-15'),
		lastUsedBy: 101,
		numberOfUses: 5,
		currentWarehouse: 1,
		isBeingUsed: false,
		firstUsed: new Date('2024-01-10'),
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440002',
		barcode: 12_345,
		lastUsed: new Date('2024-12-18'),
		lastUsedBy: 102,
		numberOfUses: 3,
		currentWarehouse: 2,
		isBeingUsed: true,
		firstUsed: new Date('2024-02-05'),
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440003',
		barcode: 12_345,
		lastUsed: null,
		lastUsedBy: null,
		numberOfUses: 0,
		currentWarehouse: 1,
		isBeingUsed: false,
		firstUsed: null,
	},

	// Barcode 67890 - Multiple units
	{
		id: '550e8400-e29b-41d4-a716-446655440004',
		barcode: 67_890,
		lastUsed: new Date('2024-11-20'),
		lastUsedBy: 103,
		numberOfUses: 12,
		currentWarehouse: 3,
		isBeingUsed: false,
		firstUsed: new Date('2023-08-15'),
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440005',
		barcode: 67_890,
		lastUsed: new Date('2024-12-10'),
		lastUsedBy: 104,
		numberOfUses: 8,
		currentWarehouse: 2,
		isBeingUsed: true,
		firstUsed: new Date('2023-09-22'),
	},

	// Barcode 11111 - Single unit
	{
		id: '550e8400-e29b-41d4-a716-446655440006',
		barcode: 11_111,
		lastUsed: new Date('2024-12-19'),
		lastUsedBy: 105,
		numberOfUses: 1,
		currentWarehouse: 1,
		isBeingUsed: false,
		firstUsed: new Date('2024-12-19'),
	},

	// Barcode 99999 - Multiple units with different usage patterns
	{
		id: '550e8400-e29b-41d4-a716-446655440007',
		barcode: 99_999,
		lastUsed: null,
		lastUsedBy: null,
		numberOfUses: 0,
		currentWarehouse: 4,
		isBeingUsed: false,
		firstUsed: null,
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440008',
		barcode: 99_999,
		lastUsed: new Date('2024-07-30'),
		lastUsedBy: 106,
		numberOfUses: 25,
		currentWarehouse: 3,
		isBeingUsed: false,
		firstUsed: new Date('2023-01-15'),
	},
];
