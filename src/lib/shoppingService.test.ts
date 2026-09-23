import {afterEach,describe,expect,it,vi} from 'vitest';
const transactionMock = vi.hoisted(() => vi.fn());
const firebaseMock = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'uid-1', email: 'buyer@example.com' } as { uid: string; email: string } | null }
}));
vi.mock('./firebase', () => firebaseMock);
vi.mock('./transactionService',()=>({createTransactionalOrder:transactionMock}));
vi.mock('./firestoreService',()=>({saveQuoteToFirestore:vi.fn().mockResolvedValue(undefined)}));
import {shoppingService} from './shoppingService';
import {saveQuoteToFirestore} from './firestoreService';
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();firebaseMock.auth.currentUser={uid:'uid-1',email:'buyer@example.com'};});
describe('shopping save confirmation',()=>{
 it('rejects when atomic order transaction fails',async()=>{transactionMock.mockRejectedValueOnce(new Error('write failed'));await expect(shoppingService.createOrder({})).rejects.toThrow('write failed');expect(transactionMock).toHaveBeenCalledTimes(1);});
 it('returns confirmed pending order request',async()=>{const confirmed={id:'order-request',orderNumber:'TALEP-2026-ABC',customerUid:'uid-1',customerEmail:'buyer@example.com',total:24,pricingVerified:false,stockState:'unreserved'};transactionMock.mockResolvedValueOnce(confirmed);const order=await shoppingService.createOrder({customerName:'Alıcı',items:[{productId:'p1',productName:'Ürün',quantity:2,unitPrice:10}]});expect(order).toEqual(confirmed);expect(transactionMock).toHaveBeenCalledWith(expect.any(Object),'customer');});
 it('writes quote with session owner fields',async()=>{await expect(shoppingService.requestQuote({customerName:'Alıcı',items:[{productName:'Ürün'}]})).resolves.toBeUndefined();expect(saveQuoteToFirestore).toHaveBeenCalledTimes(1);expect(vi.mocked(saveQuoteToFirestore).mock.calls[0][0].customerUid).toBe('uid-1');});
});
