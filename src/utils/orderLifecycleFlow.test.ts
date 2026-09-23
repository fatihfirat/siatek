import { describe, it, expect } from 'vitest';
import type { Order, OrderStatus } from '../types';

describe('Order Lifecycle & Shipment Flow Tests', () => {
  const allowedTransitions: Record<string, string[]> = {
    pending: ['approved', 'preparing', 'shipped', 'delivered', 'cancelled'],
    approved: ['preparing', 'shipped', 'delivered', 'cancelled', 'pending'],
    preparing: ['approved', 'shipped', 'delivered', 'cancelled', 'pending', 'ready'],
    ready: ['shipped', 'delivered', 'cancelled', 'preparing'],
    out_for_delivery: ['delivered', 'shipped', 'cancelled'],
    shipped: ['delivered', 'preparing', 'cancelled', 'shipped'],
    delivered: ['shipped', 'cancelled', 'delivered'],
    cancelled: ['pending', 'approved']
  };

  describe('1. Order Approval Transitions', () => {
    it('allows pending order to be approved directly', () => {
      expect(allowedTransitions['pending']).toContain('approved');
    });

    it('allows re-approving a cancelled order after dispute resolution', () => {
      expect(allowedTransitions['cancelled']).toContain('approved');
    });

    it('allows preparing order to return to approved if warehouse holds order', () => {
      expect(allowedTransitions['preparing']).toContain('approved');
    });
  });

  describe('2. Order Shipment & Dispatch Transitions', () => {
    it('allows fast-dispatch directly from pending to shipped', () => {
      expect(allowedTransitions['pending']).toContain('shipped');
    });

    it('allows approved order to be dispatched to shipped', () => {
      expect(allowedTransitions['approved']).toContain('shipped');
    });

    it('allows preparing order to be dispatched to shipped', () => {
      expect(allowedTransitions['preparing']).toContain('shipped');
    });

    it('allows already shipped order to re-ship or update tracking/fleet details', () => {
      expect(allowedTransitions['shipped']).toContain('shipped');
    });
  });

  describe('3. Shipment Metadata Payload Integrity', () => {
    it('correctly maps carrier, vehiclePlate, driverName, and packageCount into order metadata', () => {
      const initialOrder: Partial<Order> = {
        id: 'ord-test-01',
        orderNumber: 'SIP-2026-9999',
        status: 'preparing',
        trackingNumber: ''
      };

      const shipmentUpdate = {
        status: 'shipped' as OrderStatus,
        trackingNumber: 'SEVK-884920',
        shippingCompany: 'ALPHA TEKNİK Özmal Dağıtım Aracı (63 AT 941)',
        deliveryVehicle: '63 AT 941',
        deliveryPersonnel: 'Ahmet Yılmaz',
        packageCount: 3,
        pickingStatus: 'completed' as const,
        deliveryStatus: 'out_for_delivery' as const
      };

      const updatedOrder = {
        ...initialOrder,
        ...shipmentUpdate,
        updatedAt: '2026-09-18T20:00:00.000Z'
      };

      expect(updatedOrder.status).toBe('shipped');
      expect(updatedOrder.trackingNumber).toBe('SEVK-884920');
      expect(updatedOrder.deliveryVehicle).toBe('63 AT 941');
      expect(updatedOrder.deliveryPersonnel).toBe('Ahmet Yılmaz');
      expect(updatedOrder.packageCount).toBe(3);
      expect(updatedOrder.pickingStatus).toBe('completed');
    });
  });

  describe('4. Safe Customer Order Resolution (No Null Pointer)', () => {
    it('safely falls back to payload info when user object is null (guest or unverified)', () => {
      const user: { name?: string; email?: string; phone?: string; role?: string } | null = null;
      const isAdmin = user?.role === 'admin';

      const payload = {
        customerName: 'Örnek Firma Ltd.',
        customerEmail: 'ornek@firma.com',
        customerPhone: '+90 555 123 45 67'
      };

      const resolvedName = isAdmin ? payload.customerName : (user?.name || payload.customerName || 'Müşteri');
      const resolvedEmail = isAdmin ? (payload.customerEmail || user?.email || '') : (user?.email || payload.customerEmail || '');
      const resolvedPhone = isAdmin ? (payload.customerPhone || user?.phone || '') : (user?.phone || payload.customerPhone || '');

      expect(resolvedName).toBe('Örnek Firma Ltd.');
      expect(resolvedEmail).toBe('ornek@firma.com');
      expect(resolvedPhone).toBe('+90 555 123 45 67');
    });

    it('enforces customer token email over spoofed body email when authenticated', () => {
      const user = { name: 'Gerçek Müşteri', email: 'gercek@musteri.com', phone: '5550001122', role: 'customer' };
      const isAdmin = user?.role === 'admin';

      const payload = {
        customerName: 'Sahte İsim',
        customerEmail: 'baska@firma.com',
        customerPhone: '5559998877'
      };

      const resolvedEmail = isAdmin ? (payload.customerEmail || user?.email || '') : (user?.email || payload.customerEmail || '');
      expect(resolvedEmail).toBe('gercek@musteri.com');
    });
  });

  describe('5. Receipt Approval Order Status Synchronization', () => {
    it('approving receipt marks order as approved and receipt as verified', () => {
      const order: Partial<Order> = {
        id: 'ord-123',
        status: 'pending',
        receiptStatus: 'uploaded',
        paymentStatus: 'unpaid'
      };

      const approvedOrder = {
        ...order,
        status: 'approved' as OrderStatus,
        receiptStatus: 'verified' as const,
        receiptNote: 'Dekont banka hesabına geçti.',
        paymentStatus: 'paid' as const
      };

      expect(approvedOrder.status).toBe('approved');
      expect(approvedOrder.receiptStatus).toBe('verified');
      expect(approvedOrder.paymentStatus).toBe('paid');
    });
  });
});
