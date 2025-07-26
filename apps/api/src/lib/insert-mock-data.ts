/** biome-ignore-all lint/suspicious/noConsole: false positive */
import { db } from '../db/index';
import { productStock, withdrawOrder, withdrawOrderDetails } from '../db/schema'; // Adjust path as needed

const EMPLOYEE_ID = '2210874d-f761-43de-9080-acd75cb9225c';

// Updated product stock data with proper UUID references
const productStockData = [
	{
		id: '550e8400-e29b-41d4-a716-446655440001',
		barcode: 12_345,
		lastUsed: '2024-12-15',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 5,
		currentWarehouse: 1,
		isBeingUsed: false,
		firstUsed: '2024-01-10',
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440002',
		barcode: 12_345,
		lastUsed: '2024-12-18',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 3,
		currentWarehouse: 2,
		isBeingUsed: true,
		firstUsed: '2024-02-05',
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
	{
		id: '550e8400-e29b-41d4-a716-446655440004',
		barcode: 67_890,
		lastUsed: '2024-11-20',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 12,
		currentWarehouse: 3,
		isBeingUsed: false,
		firstUsed: '2023-08-15',
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440005',
		barcode: 67_890,
		lastUsed: '2024-12-10',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 8,
		currentWarehouse: 2,
		isBeingUsed: true,
		firstUsed: '2023-09-22',
	},
	{
		id: '550e8400-e29b-41d4-a716-446655440006',
		barcode: 11_111,
		lastUsed: '2024-12-19',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 1,
		currentWarehouse: 1,
		isBeingUsed: false,
		firstUsed: '2024-12-19',
	},
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
		lastUsed: '2024-07-30',
		lastUsedBy: EMPLOYEE_ID,
		numberOfUses: 25,
		currentWarehouse: 3,
		isBeingUsed: false,
		firstUsed: '2023-01-15',
	},
];

const withdrawOrderData = [
	{
		id: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: '2024-12-15',
		dateReturn: '2024-12-22',
		userId: EMPLOYEE_ID, // Using the employee ID UUID
		numItems: 2,
		isComplete: true,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: '2024-12-18',
		dateReturn: null,
		userId: EMPLOYEE_ID,
		numItems: 3,
		isComplete: false,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440003',
		dateWithdraw: '2024-12-19',
		dateReturn: '2024-12-20',
		userId: EMPLOYEE_ID,
		numItems: 1,
		isComplete: true,
	},
	{
		id: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: '2024-12-20',
		dateReturn: null,
		userId: EMPLOYEE_ID,
		numItems: 2,
		isComplete: false,
	},
];

const withdrawOrderDetailsData = [
	{
		id: '750e8400-e29b-41d4-a716-446655440001',
		productId: '550e8400-e29b-41d4-a716-446655440001',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: '2024-12-15',
		dateReturn: '2024-12-22',
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440002',
		productId: '550e8400-e29b-41d4-a716-446655440004',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440001',
		dateWithdraw: '2024-12-15',
		dateReturn: '2024-12-22',
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440003',
		productId: '550e8400-e29b-41d4-a716-446655440002',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: '2024-12-18',
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440004',
		productId: '550e8400-e29b-41d4-a716-446655440005',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: '2024-12-18',
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440005',
		productId: '550e8400-e29b-41d4-a716-446655440008',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440002',
		dateWithdraw: '2024-12-18',
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440006',
		productId: '550e8400-e29b-41d4-a716-446655440006',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440003',
		dateWithdraw: '2024-12-19',
		dateReturn: '2024-12-20',
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440007',
		productId: '550e8400-e29b-41d4-a716-446655440003',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: '2024-12-20',
		dateReturn: null,
	},
	{
		id: '750e8400-e29b-41d4-a716-446655440008',
		productId: '550e8400-e29b-41d4-a716-446655440007',
		withdrawOrderId: '650e8400-e29b-41d4-a716-446655440004',
		dateWithdraw: '2024-12-20',
		dateReturn: null,
	},
];

async function insertMockData() {
	try {
		console.log('Starting data insertion...');

		// Insert product stock data first (no dependencies)
		console.log('Inserting product stock data...');
		await db.insert(productStock).values(productStockData);
		console.log('✓ Product stock data inserted');

		// Insert withdraw orders
		console.log('Inserting withdraw order data...');
		await db.insert(withdrawOrder).values(withdrawOrderData);
		console.log('✓ Withdraw order data inserted');

		// Insert withdraw order details (depends on both productStock and withdrawOrder)
		console.log('Inserting withdraw order details data...');
		await db.insert(withdrawOrderDetails).values(withdrawOrderDetailsData);
		console.log('✓ Withdraw order details data inserted');

		console.log('All mock data inserted successfully!');
	} catch (error) {
		console.error('Error inserting mock data:', error);
		throw error;
	}
}

// Export the function for use
export { insertMockData };
