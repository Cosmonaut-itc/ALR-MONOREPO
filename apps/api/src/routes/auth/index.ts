import { Hono } from 'hono';
import type { ApiEnv } from '../../context';
import { cabinetWarehouseRoutes } from './cabinet-warehouse';
import { employeeRoutes } from './employee';
import { inventoryRoutes } from './inventory';
import { kitsRoutes } from './kits';
import { mermaRoutes } from './merma';
import { permissionsRoutes } from './permissions';
import { productsRoutes } from './products';
import { productStockRoutes } from './product-stock';
import { replenishmentOrdersRoutes } from './replenishment-orders';
import { stockLimitsRoutes } from './stock-limits';
import { usersRoutes } from './users';
import { warehouseTransfersRoutes } from './warehouse-transfers';
import { warehousesRoutes } from './warehouses';
import { withdrawOrdersRoutes } from './withdraw-orders';

const authRoutes = new Hono<ApiEnv>()
	.route('/', productsRoutes)
	.route('/inventory', inventoryRoutes)
	.route('/product-stock', productStockRoutes)
	.route('/stock-limits', stockLimitsRoutes)
	.route('/cabinet-warehouse', cabinetWarehouseRoutes)
	.route('/employee', employeeRoutes)
	.route('/permissions', permissionsRoutes)
	.route('/withdraw-orders', withdrawOrdersRoutes)
	.route('/warehouse', warehousesRoutes)
	.route('/warehouse-transfers', warehouseTransfersRoutes)
	.route('/kits', kitsRoutes)
	.route('/merma', mermaRoutes)
	.route('/users', usersRoutes)
	.route('/replenishment-orders', replenishmentOrdersRoutes);

export { authRoutes };
