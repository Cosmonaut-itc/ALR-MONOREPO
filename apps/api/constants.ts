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

export const withdrawOrderData = [
	{
		id: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: new Date('2024-12-15'),
		dateReturn: new Date('2024-12-22'),
		userId: 101,
		numItems: 2,
		isComplete: true,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: new Date('2024-12-18'),
		dateReturn: null,
		userId: 102,
		numItems: 3,
		isComplete: false,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440003',
		dateWithdraw: new Date('2024-12-19'),
		dateReturn: new Date('2024-12-20'),
		userId: 103,
		numItems: 1,
		isComplete: true,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: new Date('2024-12-20'),
		dateReturn: null,
		userId: 104,
		numItems: 2,
		isComplete: false,
	},
];

export const withdrawOrderDetailsData = [
	// Order 1 - 2 items (completed) - Nail technician finished client services
	{
		id: '750e8400-e29b-41d4-a716-446655440001',
		productId: '550e8400-e29b-41d4-a716-446655440001', // Red Gelish #1
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: new Date('2024-12-15'),
		dateReturn: new Date('2024-12-22'),
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440002',
		productId: '550e8400-e29b-41d4-a716-446655440004', // Blue Gelish #1
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: new Date('2024-12-15'),
		dateReturn: new Date('2024-12-22'),
	},

	// Order 2 - 3 items (ongoing) - Currently being used by nail technician
	{
		id: '750e8400-e29b-41d4-a716-446655440003',
		productId: '550e8400-e29b-41d4-a716-446655440002', // Red Gelish #2
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: new Date('2024-12-18'),
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440004',
		productId: '550e8400-e29b-41d4-a716-446655440005', // Blue Gelish #2
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: new Date('2024-12-18'),
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440005',
		productId: '550e8400-e29b-41d4-a716-446655440008', // Yellow Gelish #2
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: new Date('2024-12-18'),
		dateReturn: null,
	},

	// Order 3 - 1 item (completed) - Quick touch-up service
	{
		id: '750e8400-e29b-41d4-a716-446655440006',
		productId: '550e8400-e29b-41d4-a716-446655440006', // Green Gelish
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440003',
		dateWithdraw: new Date('2024-12-19'),
		dateReturn: new Date('2024-12-20'),
	},

	// Order 4 - 2 items (ongoing) - Active nail service session
	{
		id: '750e8400-e29b-41d4-a716-446655440007',
		productId: '550e8400-e29b-41d4-a716-446655440003', // Red Gelish #3
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: new Date('2024-12-20'),
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440008',
		productId: '550e8400-e29b-41d4-a716-446655440007', // Yellow Gelish #1 (new bottle)
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: new Date('2024-12-20'),
		dateReturn: null,
	},
];
