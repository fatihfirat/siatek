import {describe,it,expect} from 'vitest';
import {customerOrders,trackingStatus,orderDate} from './orderTracking';
import type {Order,User} from '../types';
describe('Order tracking',()=>{
 it('fails closed for guests, blank emails and unrelated customers',()=>{
 const orders=[{customerEmail:'OWNER@example.com',customerName:'Same name'},{customerEmail:'other@example.com',customerName:'Same name'},{customerEmail:''}] as Order[];
 expect(customerOrders(orders,null)).toEqual([]);
 expect(customerOrders(orders,{email:''} as User)).toEqual([]);
 expect(customerOrders(orders,{email:'owner@example.com'} as User)).toEqual([orders[0]]);
 });
 it('preserves the legacy stored status while displaying the delivery meaning',()=>{const status='shipped';expect(trackingStatus(status)?.label).toBe('Teslimata Çıktı');expect(status).toBe('shipped');});
 it('keeps cancellation terminal and does not pretend unknown states are pending',()=>{expect(trackingStatus('cancelled')?.nextStatus).toBeUndefined();expect(trackingStatus('unknown')).toBeNull();expect(trackingStatus('constructor')).toBeNull();});
 it('handles missing dates without fabricating a date',()=>expect(orderDate('')).toBe('Tarih belirtilmemiş'));
});
