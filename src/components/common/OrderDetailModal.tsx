import React, { useState, useEffect } from 'react';
import { Order, User } from '../../types';
import { getOrderStatusConfig } from '../../utils/statusConfig';
import {
  X,
  Printer,
  Share2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  MoreVertical,
  Trash2,
  Edit3,
  Check,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '../../lib/audio';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface OrderDetailModalProps {
  order: Order | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: Order['status'], note?: string) => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
  onPrintPDF?: (order: Order) => void;
  onWhatsAppShare?: (order: Order) => void;
}

export default function OrderDetailModal({
  order,
  currentUser,
  isOpen,
  onClose,
  onStatusChange,
  onCancelOrder,
  onPrintPDF,
  onWhatsAppShare,
}: OrderDetailModalProps) {
  const isAdmin = currentUser?.role === 'admin';
  const statusCfg = order ? getOrderStatusConfig(order.status) : getOrderStatusConfig('pending');

  const [showCustomerAccordion, setShowCustomerAccordion] = useState(false);
  const [showHistoryAccordion, setShowHistoryAccordion] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useModalBehavior(isOpen, onClose);
  useModalBehavior(showCancelModal, () => setShowCancelModal(false));

  if (!isOpen || !order) return null;

  const handleAdvanceStatus = async () => {
    if (!statusCfg.nextStatus || !onStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(order.id, statusCfg.nextStatus, `Durum güncellendi: ${statusCfg.nextStatus}`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      playNotificationSound('success');
    } catch (err: any) {
      alert('Durum güncellenirken hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Lütfen iptal nedeni belirtiniz.');
      return;
    }
    if (onCancelOrder) {
      try {
        await onCancelOrder(order.id, cancelReason);
        setShowCancelModal(false);
        setCancelReason('');
        playNotificationSound('status');
      } catch (err: any) {
        alert('İptal işlemi başarısız: ' + err.message);
      }
    }
  };

  // Financial calculations check & robust fallback
  const calculatedSubtotal = Math.round(order.items.reduce((sum, item) => sum + Math.round(((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)) * 100) / 100, 0) * 100) / 100;
  const orderSubtotal = order.subtotal !== undefined && !isNaN(order.subtotal) ? order.subtotal : calculatedSubtotal;
  const orderDiscount = order.discount || 0;
  const orderTax = order.tax !== undefined && !isNaN(order.tax) ? order.tax : Math.round(Math.max(0, orderSubtotal - orderDiscount) * 0.20 * 100) / 100;
  const orderTotal = order.total !== undefined && !isNaN(order.total) ? order.total : Math.round((Math.max(0, orderSubtotal - orderDiscount) + orderTax) * 100) / 100;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-4xl max-h-[92vh] bg-base-surface border border-base-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >

        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-base-border bg-base-surface-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-base-content tracking-tight">{order.orderNumber}</h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-base-content/60 flex items-center space-x-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Secondary Actions 3-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 hover:bg-base-surface rounded-xl border border-base-border text-base-content/70 hover:text-base-content transition"
                title="İkincil İşlemler"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-base-surface border border-base-border rounded-xl shadow-xl py-2 z-50 text-sm">
                  <button
                    onClick={() => { setShowMoreMenu(false); onPrintPDF && onPrintPDF(order); }}
                    className="w-full px-4 py-2 text-left flex items-center space-x-2.5 hover:bg-base-surface-2 text-base-content transition"
                  >
                    <Printer className="w-4 h-4 text-primary" />
                    <span>Yazdır / PDF İndir</span>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); onWhatsAppShare && onWhatsAppShare(order); }}
                    className="w-full px-4 py-2 text-left flex items-center space-x-2.5 hover:bg-base-surface-2 text-base-content transition"
                  >
                    <Share2 className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp ile Gönder</span>
                  </button>
                  <a
                    href={`mailto:${order.customerEmail}?subject=Sipariş Detayı: ${order.orderNumber}`}
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full px-4 py-2 text-left flex items-center space-x-2.5 hover:bg-base-surface-2 text-base-content transition"
                  >
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>E-posta Gönder</span>
                  </a>
                  {isAdmin && order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <button
                      onClick={() => { setShowMoreMenu(false); setShowCancelModal(true); }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2.5 hover:bg-rose-500/10 text-rose-500 transition border-t border-base-border mt-1 pt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Siparişi İptal Et</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-base-surface rounded-xl border border-base-border text-base-content/70 hover:text-base-content transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Primary Action Section (Admin Only / Role specific) */}
          {isAdmin && statusCfg.nextStatus && order.status !== 'cancelled' && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-base-content">Sipariş Operasyon Durumu</h4>
                <p className="text-xs text-base-content/70">Mevcut durum: <span className="font-semibold text-primary">{statusCfg.label}</span>. Bir sonraki aşamaya geçirmek için tıklayın.</p>
              </div>
              <button
                disabled={isUpdatingStatus}
                onClick={handleAdvanceStatus}
                className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{statusCfg.adminActionText}</span>
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Grid Layout for Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 Cols: Products & Financial Breakdown */}
            <div className="lg:col-span-2 space-y-6">

              {/* Products List */}
              <div className="bg-base-surface-2 border border-base-border rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-base-border pb-3">
                  <h3 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center space-x-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span>Sipariş Kalemleri ({order.items.length})</span>
                  </h3>
                  <span className="text-xs text-base-content/60 font-medium">{order.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} Toplam Adet</span>
                </div>

                <div className="divide-y divide-base-border">
                  {order.items.map((item, idx) => {
                    const unitPrice = Number(item.unitPrice) || 0;
                    const qty = Number(item.quantity) || 1;
                    const lineTotal = item.totalPrice !== undefined && !isNaN(item.totalPrice) ? item.totalPrice : (unitPrice * qty);
                    return (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-base-content">{item.productName}</h4>
                          <p className="text-xs text-base-content/60">
                            {qty} {item.unit || 'Adet'} × {formatCurrency(unitPrice)}
                          </p>
                          {item.note && (
                            <p className="text-xs text-amber-500 italic">Not: {item.note}</p>
                          )}
                        </div>
                        <div className="text-right font-bold text-sm text-base-content">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal, Tax, Total */}
                <div className="border-t border-base-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-base-content/70">
                    <span>Ara Toplam</span>
                    <span>{formatCurrency(orderSubtotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between text-emerald-500 font-medium">
                      <span>İndirim</span>
                      <span>-{formatCurrency(orderDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base-content/70">
                    <span>KDV (%20)</span>
                    <span>{formatCurrency(orderTax)}</span>
                  </div>
                  <div className="flex justify-between text-base-content font-bold text-base pt-2 border-t border-base-border">
                    <span>Genel Toplam</span>
                    <span className="text-primary">{formatCurrency(orderTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment & Invoice Info */}
              <div className="bg-base-surface-2 border border-base-border rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Ödeme ve Fatura Bilgileri</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-base-surface rounded-xl border border-base-border space-y-1">
                    <span className="text-xs text-base-content/60 block">Ödeme Yöntemi</span>
                    <span className="font-semibold text-base-content">{order.paymentMethod || 'Banka Havalesi / EFT'}</span>
                  </div>
                  <div className="p-3 bg-base-surface rounded-xl border border-base-border space-y-1">
                    <span className="text-xs text-base-content/60 block">Ödeme Durumu</span>
                    <span className="font-semibold text-emerald-500">Ödendi / Onaylandı</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right 1 Col: Customer, Delivery & Mobile Timeline */}
            <div className="space-y-6">

              {/* Customer Info (Accordion on mobile) */}
              <div className="bg-base-surface-2 border border-base-border rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowCustomerAccordion(!showCustomerAccordion)}>
                  <h3 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Müşteri ve Sevkiyat</span>
                  </h3>
                  <button className="text-base-content/60 sm:hidden">
                    {showCustomerAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className={`space-y-3 text-sm pt-2 border-t border-base-border ${showCustomerAccordion ? 'block' : 'hidden sm:block'}`}>
                  <div>
                    <span className="text-xs text-base-content/60 block">Müşteri / Kurum Adı</span>
                    <span className="font-semibold text-base-content">{order.customerName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/60 block">Telefon</span>
                    <a href={`tel:${order.customerPhone}`} className="font-semibold text-primary hover:underline flex items-center space-x-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{order.customerPhone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/60 block">E-Posta</span>
                    <span className="font-medium text-base-content">{order.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-xs text-base-content/60 block">Teslimat Adresi</span>
                    <p className="font-medium text-base-content mt-0.5 flex items-start space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{order.customerAddress}</span>
                    </p>
                  </div>
                  {order.notes && (
                    <div className="p-2.5 bg-base-surface rounded-xl border border-base-border">
                      <span className="text-xs text-base-content/60 block font-medium">Sipariş / Müşteri Notu</span>
                      <p className="text-xs text-base-content mt-1 italic">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Vertical Status Timeline */}
              <div className="bg-base-surface-2 border border-base-border rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Durum Zaman Çizelgesi</span>
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-base-border">
                  {order.statusHistory && order.statusHistory.length > 0 ? (
                    order.statusHistory.map((hist, i) => {
                      const cfg = getOrderStatusConfig(hist.status);
                      const isLatest = i === order.statusHistory!.length - 1;
                      return (
                        <div key={i} className="relative space-y-1">
                          <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-base-surface ${isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-base-border'}`} />
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isLatest ? 'text-primary' : 'text-base-content'}`}>{cfg.label}</span>
                            <span className="text-[10px] text-base-content/50">{new Date(hist.timestamp).toLocaleDateString('tr-TR')} • {new Date(hist.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {hist.note && <p className="text-xs text-base-content/70">{hist.note}</p>}
                          {hist.updatedBy && <p className="text-[10px] text-base-content/50 italic">İşlemi Yapan: {hist.updatedBy}</p>}
                        </div>
                      );
                    })
                  ) : (
                    <div className="relative space-y-1">
                      <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/20 border-2 border-base-surface" />
                      <span className="text-xs font-bold text-primary">{statusCfg.label}</span>
                      <p className="text-xs text-base-content/70">{statusCfg.customerBehaviorText}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div 
          className="fixed inset-0 z-60 overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:p-4 md:p-6"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="w-full max-w-md bg-base-surface border border-base-border rounded-2xl p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-base-content flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Siparişi İptal Et ({order.orderNumber})</span>
              </h3>
              <p className="text-sm text-base-content/70">Bu siparişi iptal etmek istediğinize emin misiniz? Lütfen aşağıya iptal gerekçesini yazınız.</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="İptal gerekçesi (Örn: Müşteri talebiyle vazgeçildi)..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-base-surface-2 border border-base-border rounded-xl text-base-content text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 hover:bg-base-surface-2 text-base-content/70 font-semibold rounded-xl text-sm transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-500/25 transition"
                >
                  İptali Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
