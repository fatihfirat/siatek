import {describe,it,expect} from 'vitest';
import {addShoppingItems,setShoppingQuantity} from './shoppingCart';
import type {Product} from '../types';
const product={id:'p',stock:5,minOrderQuantity:2} as Product;
describe('shopping cart inventory constraints',()=>{
 it('merges repeated and bulk additions without exceeding stock',()=>{const cart=addShoppingItems([],[{product,quantity:2},{product,quantity:2},{product,quantity:9}]);expect(cart).toHaveLength(1);expect(cart[0].quantity).toBe(4);});
 it('rejects non-finite amounts and unavailable stock',()=>{expect(addShoppingItems([],[{product,quantity:NaN},{product:{...product,stock:0},quantity:2}])).toEqual([]);});
 it('keeps minimum order and clamps updates to available stock',()=>{const cart=addShoppingItems([],[{product,quantity:2}]);expect(setShoppingQuantity(cart,'p',1)[0].quantity).toBe(2);expect(setShoppingQuantity(cart,'p',99)[0].quantity).toBe(5);expect(setShoppingQuantity(cart,'p',0)).toEqual([]);});
 it('does not mutate the previous cart and preserves item notes',()=>{const cart=[{product,quantity:2,customerNote:'test'}];const updated=addShoppingItems(cart,[{product,quantity:2}]);expect(cart[0].quantity).toBe(2);expect(updated[0].customerNote).toBe('test');});
});
