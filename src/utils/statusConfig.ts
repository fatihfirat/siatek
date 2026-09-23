import { OrderStatus } from '../types';

export interface StatusConfigItem {
  label: string;
  color: string; // Tailwind classes for badge background & text
  textColor: string;
  borderColor: string;
  dotColor: string;
  iconName: string;
  nextStatus?: OrderStatus;
  adminActionText?: string;
  customerBehaviorText: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfigItem> = {
  pending: {
    label: 'Onay Bekliyor',
    color: 'bg-bg-warning text-warning-text border-warning-border',
    textColor: 'text-warning-text',
    borderColor: 'border-warning-border',
    dotColor: 'bg-warning-fill',
    iconName: 'Clock',
    nextStatus: 'approved',
    adminActionText: 'Siparişi Onayla',
    customerBehaviorText: 'Siparişiniz alındı, yönetici onayına sunuldu.',
  },
  approved: {
    label: 'Onaylandı',
    color: 'bg-bg-info text-info-text border-info-border',
    textColor: 'text-info-text',
    borderColor: 'border-info-border',
    dotColor: 'bg-info-fill',
    iconName: 'CheckCircle2',
    nextStatus: 'preparing',
    adminActionText: 'Hazırlamaya Başla',
    customerBehaviorText: 'Siparişiniz onaylandı, depo sevkiyat sırasına eklendi.',
  },
  preparing: {
    label: 'Hazırlanıyor',
    color: 'bg-bg-info text-info-text border-info-border',
    textColor: 'text-info-text',
    borderColor: 'border-info-border',
    dotColor: 'bg-info-fill',
    iconName: 'Package',
    nextStatus: 'ready',
    adminActionText: 'Hazır Olarak İşaretle',
    customerBehaviorText: 'Ürünleriniz depoda toplanıyor ve paketleniyor.',
  },
  ready: {
    label: 'Hazırlandı',
    color: 'bg-category-inventory-bg text-category-inventory-text border-category-inventory-border',
    textColor: 'text-category-inventory-text',
    borderColor: 'border-category-inventory-border',
    dotColor: 'bg-brand-green',
    iconName: 'CheckSquare',
    nextStatus: 'out_for_delivery',
    adminActionText: 'Teslimata Çıkar',
    customerBehaviorText: 'Siparişiniz hazırlandı, teslimat planlaması yapılıyor.',
  },
  out_for_delivery: {
    label: 'Teslimata Çıktı',
    color: 'bg-category-logistics-bg text-category-logistics-text border-category-logistics-border',
    textColor: 'text-category-logistics-text',
    borderColor: 'border-category-logistics-border',
    dotColor: 'bg-brand-amber',
    iconName: 'Truck',
    nextStatus: 'delivered',
    adminActionText: 'Teslim Edildi Yap',
    customerBehaviorText: 'Siparişiniz teslimat personeline verildi ve yolda.',
  },
  shipped: {
    label: 'Sevk Edildi',
    color: 'bg-category-logistics-bg text-category-logistics-text border-category-logistics-border',
    textColor: 'text-category-logistics-text',
    borderColor: 'border-category-logistics-border',
    dotColor: 'bg-brand-amber',
    iconName: 'Truck',
    nextStatus: 'delivered',
    adminActionText: 'Teslim Edildi Yap',
    customerBehaviorText: 'Siparişiniz sevk edildi; takip numarasını sipariş detayında kontrol edin.',
  },
  delivered: {
    label: 'Teslim Edildi',
    color: 'bg-bg-success text-success-text border-success-border',
    textColor: 'text-success-text',
    borderColor: 'border-success-border',
    dotColor: 'bg-success-fill',
    iconName: 'ShieldCheck',
    adminActionText: undefined,
    customerBehaviorText: 'Siparişiniz başarıyla teslim edildi.',
  },
  cancelled: {
    label: 'İptal Edildi',
    color: 'bg-bg-danger text-danger-text border-danger-border',
    textColor: 'text-danger-text',
    borderColor: 'border-danger-border',
    dotColor: 'bg-danger-fill',
    iconName: 'X',
    adminActionText: undefined,
    customerBehaviorText: 'Bu sipariş iptal edilmiştir.',
  },
};

export function getOrderStatusConfig(status: OrderStatus | string): StatusConfigItem {
  // Geriye uyumluluk: eski 'shipped' durumunu out_for_delivery'ye normalize et
  const normalizedStatus = status === 'shipped' ? 'out_for_delivery' : (status as OrderStatus);
  return ORDER_STATUS_CONFIG[normalizedStatus] || ORDER_STATUS_CONFIG.pending;
}
