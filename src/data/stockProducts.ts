import { Product } from '../types';
import { generateAll1800Products } from './productCatalogGenerator';

// Generate complete ~1835 products list with ST00001 - ST01835 SKU codes & categories
export const STOCK_PDF_PRODUCTS: Product[] = generateAll1800Products();
