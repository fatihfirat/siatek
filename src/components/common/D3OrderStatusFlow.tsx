import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { OrderStatus, OrderStatusHistoryItem } from '../../types';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  MousePointerClick,
  SlidersHorizontal,
  RotateCcw,
  Check,
  History,
  Calendar,
  UserCheck,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface D3OrderStatusFlowProps {
  status: OrderStatus;
  orderId: string;
  orderNumber?: string;
  trackingNumber?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
  onStatusChange?: (newStatus: OrderStatus, trackingNo?: string, note?: string) => Promise<void> | void;
  isEditable?: boolean;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

interface StepDef {
  key: OrderStatus;
  label: string;
  sublabel: string;
  index: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  badgeBg: string;
  icon: string;
}

const FLOW_STEPS: StepDef[] = [
  {
    key: 'pending',
    label: 'Bekliyor',
    sublabel: 'Yeni Sipariş Alındı',
    index: 0,
    color: '#f59e0b',
    gradientStart: '#fbbf24',
    gradientEnd: '#d97706',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    icon: 'clock'
  },
  {
    key: 'approved',
    label: 'Onaylandı',
    sublabel: 'Cari & Fiyat Onayı',
    index: 1,
    color: '#3b82f6',
    gradientStart: '#60a5fa',
    gradientEnd: '#2563eb',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    icon: 'check'
  },
  {
    key: 'preparing',
    label: 'Hazırlandı',
    sublabel: 'Depo & Paketleme',
    index: 2,
    color: '#8b5cf6',
    gradientStart: '#a78bfa',
    gradientEnd: '#7c3aed',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    icon: 'package'
  },
  {
    key: 'shipped',
    label: 'Sevkiyatta',
    sublabel: 'Dağıtım & Sevkiyat',
    index: 3,
    color: '#06b6d4',
    gradientStart: '#22d3ee',
    gradientEnd: '#0891b2',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    icon: 'truck'
  },
  {
    key: 'delivered',
    label: 'Teslim Edildi',
    sublabel: 'Müşteriye Ulaştı',
    index: 4,
    color: '#10b981',
    gradientStart: '#34d399',
    gradientEnd: '#059669',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    icon: 'checkcheck'
  },
];

// Helper to format timestamps gracefully in Turkish
function formatTimestamp(tsString?: string): { fullDate: string; time: string; relative: string } {
  if (!tsString) {
    return { fullDate: '-', time: '--:--', relative: '' };
  }

  const d = new Date(tsString);
  if (isNaN(d.getTime())) {
    return { fullDate: tsString, time: '', relative: '' };
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  const fullDate = `${day} ${month} ${year}`;
  const time = `${hours}:${minutes}`;

  // Relative time computation
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = '';
  if (diffSec < 60) {
    relative = 'Az önce';
  } else if (diffMin < 60) {
    relative = `${diffMin} dk önce`;
  } else if (diffHours < 24) {
    relative = `${diffHours} sa önce`;
  } else if (diffDays === 1) {
    relative = 'Dün';
  } else if (diffDays < 30) {
    relative = `${diffDays} gün önce`;
  } else {
    relative = `${Math.floor(diffDays / 30)} ay önce`;
  }

  return { fullDate, time, relative };
}

export const D3OrderStatusFlow: React.FC<D3OrderStatusFlowProps> = ({
  status,
  orderId,
  orderNumber,
  trackingNumber,
  statusHistory,
  createdAt,
  updatedAt,
  onStatusChange,
  isEditable = true,
  showControls = true,
  compact = false,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevStepIndexRef = useRef<number>(-1);
  const isInitializedRef = useRef<boolean>(false);

  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [hoveredStep, setHoveredStep] = useState<StepDef | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<boolean>(false);
  const [showTrackingPrompt, setShowTrackingPrompt] = useState<boolean>(false);
  const [targetPendingStatus, setTargetPendingStatus] = useState<OrderStatus | null>(null);
  const [customTrackingInput, setCustomTrackingInput] = useState<string>(
    trackingNumber || `YK-${Math.floor(10000000 + Math.random() * 90000000)}TR`
  );
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);

  const isCancelled = status === 'cancelled';
  const currentStepIndex = isCancelled
    ? -1
    : FLOW_STEPS.findIndex(s => s.key === status);

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.max(entry.contentRect.width, 320));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update tracking input when prop changes
  useEffect(() => {
    if (trackingNumber) {
      setCustomTrackingInput(trackingNumber);
    }
  }, [trackingNumber]);

  // Handle Manual Step Selection
  const handleStepClick = useCallback(async (targetStatus: OrderStatus, customTracking?: string, note?: string) => {
    if (!onStatusChange || isUpdating) return;
    try {
      setIsUpdating(true);
      await onStatusChange(targetStatus, customTracking || trackingNumber, note);
      setShowTrackingPrompt(false);
      setShowStatusDropdown(false);
    } catch (err) {
      console.error('Error changing order status in D3 flow:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [onStatusChange, isUpdating, trackingNumber]);

  // Direct trigger helper
  const triggerStatusSelect = useCallback((st: OrderStatus) => {
    if (st === 'shipped' && !trackingNumber) {
      setTargetPendingStatus('shipped');
      setShowTrackingPrompt(true);
      setShowStatusDropdown(false);
    } else {
      handleStepClick(st);
    }
  }, [trackingNumber, handleStepClick]);

  // Build or fall back chronologic status history list
  const chronologyItems = useMemo<OrderStatusHistoryItem[]>(() => {
    if (statusHistory && statusHistory.length > 0) {
      return statusHistory;
    }

    // Dynamic reconstruction if order does not have explicit history array
    const baseTime = createdAt ? new Date(createdAt).getTime() : Date.now() - 3600000;
    const items: OrderStatusHistoryItem[] = [
      {
        id: `gen-1-${orderId}`,
        status: 'pending',
        timestamp: new Date(baseTime).toISOString(),
        note: 'Sipariş müşteri portalından oluşturuldu ve onaya gönderildi.',
        updatedBy: 'Müşteri Siparişi',
      },
    ];

    if (isCancelled) {
      const cancelTime = updatedAt ? new Date(updatedAt).getTime() : baseTime + 1800000;
      items.push({
        id: `gen-c-${orderId}`,
        status: 'cancelled',
        timestamp: new Date(cancelTime).toISOString(),
        note: 'Sipariş iptal edildi.',
        updatedBy: 'Yönetici',
      });
      return items;
    }

    if (currentStepIndex >= 1) {
      items.push({
        id: `gen-2-${orderId}`,
        status: 'approved',
        timestamp: new Date(baseTime + 15 * 60 * 1000).toISOString(),
        note: 'Cari hesap ve fiyat kontrolleri onaylandı.',
        updatedBy: 'Ahmet Y. (Yönetici)',
      });
    }

    if (currentStepIndex >= 2) {
      items.push({
        id: `gen-3-${orderId}`,
        status: 'preparing',
        timestamp: new Date(baseTime + 45 * 60 * 1000).toISOString(),
        note: 'Depo rafından toplandı ve çeki listesi ile paketlendi.',
        updatedBy: 'Mehmet K. (Depo Sorumlusu)',
      });
    }

    if (currentStepIndex >= 3) {
      items.push({
        id: `gen-4-${orderId}`,
        status: 'shipped',
        timestamp: new Date(baseTime + 120 * 60 * 1000).toISOString(),
        note: `Sevkiyat ambarına teslim edildi.${trackingNumber ? ` Takip No: ${trackingNumber}` : ''}`,
        updatedBy: 'Ali V. (Sevkiyat)',
        trackingNumber: trackingNumber,
      });
    }

    if (currentStepIndex >= 4) {
      const deliveryTime = updatedAt ? new Date(updatedAt).getTime() : baseTime + 24 * 60 * 60 * 1000;
      items.push({
        id: `gen-5-${orderId}`,
        status: 'delivered',
        timestamp: new Date(deliveryTime).toISOString(),
        note: 'Müşteri yetkilisine teslimat başarıyla tamamlandı.',
        updatedBy: 'Alpha Teknik Sevkiyat Ekibi',
        trackingNumber: trackingNumber,
      });
    }

    return items;
  }, [statusHistory, createdAt, updatedAt, currentStepIndex, isCancelled, orderId, trackingNumber]);

  // D3 Smooth Visualization & Animation Engine
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = containerWidth;
    const height = compact ? 70 : 102;
    const margin = { left: compact ? 34 : 48, right: compact ? 34 : 48, top: compact ? 24 : 32 };
    const cy = margin.top;
    const nodeRadius = compact ? 13 : 17;

    const xScale = d3
      .scalePoint<string>()
      .domain(FLOW_STEPS.map(s => s.key))
      .range([margin.left, width - margin.right])
      .padding(0);

    const stepCoordinates = FLOW_STEPS.map(step => ({
      ...step,
      x: xScale(step.key) || margin.left,
      y: cy,
    }));

    const prevIndex = prevStepIndexRef.current;
    const isFirstRender = !isInitializedRef.current;
    isInitializedRef.current = true;
    prevStepIndexRef.current = currentStepIndex;

    // Transition duration & easing
    const transitionDuration = isFirstRender ? 500 : 750;
    const t = d3.transition().duration(transitionDuration).ease(d3.easeCubicInOut);

    // Initial SVG structure setup if not already built
    if (svg.select('.d3-root-group').empty()) {
      svg.selectAll('*').remove(); // Clean slate for initial root structure

      svg
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', '100%')
        .attr('height', height);

      // Defs
      const defs = svg.append('defs');

      // Gradients for progress line
      const progressGrad = defs
        .append('linearGradient')
        .attr('id', `flow-grad-${orderId}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      progressGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
      progressGrad.append('stop').attr('offset', '45%').attr('stop-color', '#3b82f6');
      progressGrad.append('stop').attr('offset', '80%').attr('stop-color', '#8b5cf6');
      progressGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4');

      // Glow Filters
      const filter = defs
        .append('filter')
        .attr('id', `glow-${orderId}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Pulse Glow Filter
      const pulseFilter = defs
        .append('filter')
        .attr('id', `pulse-glow-${orderId}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      pulseFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
      const pulseMerge = pulseFilter.append('feMerge');
      pulseMerge.append('feMergeNode').attr('in', 'blur');
      pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Root Group
      const rootG = svg.append('g').attr('class', 'd3-root-group');

      // 1. Background Track Line
      rootG
        .append('line')
        .attr('class', 'bg-track')
        .attr('x1', margin.left)
        .attr('y1', cy)
        .attr('x2', width - margin.right)
        .attr('y2', cy)
        .attr('stroke', 'currentColor')
        .attr('class', 'bg-track text-border opacity-60')
        .attr('stroke-width', compact ? 4 : 6)
        .attr('stroke-linecap', 'round');

      // 2. Active Animated Progress Line
      rootG
        .append('line')
        .attr('class', 'active-track')
        .attr('x1', margin.left)
        .attr('y1', cy)
        .attr('x2', margin.left)
        .attr('y2', cy)
        .attr('stroke', `url(#flow-grad-${orderId})`)
        .attr('stroke-width', compact ? 5 : 7)
        .attr('stroke-linecap', 'round')
        .attr('filter', `url(#glow-${orderId})`);

      // 3. Moving Pulse Sparkle Dot
      rootG
        .append('circle')
        .attr('class', 'progress-dot')
        .attr('cx', margin.left)
        .attr('cy', cy)
        .attr('r', compact ? 3.5 : 5)
        .attr('fill', '#ffffff')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 2)
        .attr('filter', `url(#pulse-glow-${orderId})`)
        .attr('opacity', 0);

      // 4. Nodes Container
      rootG.append('g').attr('class', 'nodes-container');
    }

    // Update SVG viewBox & background track on resize
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('height', height);

    svg
      .select('.bg-track')
      .attr('x1', margin.left)
      .attr('y1', cy)
      .attr('x2', width - margin.right)
      .attr('y2', cy)
      .attr('stroke-width', compact ? 4 : 6);

    // Calculate active progress line target
    const currentCoord = currentStepIndex >= 0 ? stepCoordinates[currentStepIndex] : null;
    const targetX = currentCoord ? currentCoord.x : margin.left;

    // Animate Progress Track Line smoothly
    svg
      .select('.active-track')
      .transition(t as any)
      .attr('x1', margin.left)
      .attr('y1', cy)
      .attr('x2', isCancelled ? margin.left : targetX)
      .attr('y2', cy)
      .attr('opacity', isCancelled ? 0.2 : 1)
      .attr('stroke-width', compact ? 5 : 7);

    // Animate Sparkle Dot
    const dot = svg.select('.progress-dot');
    if (currentStepIndex >= 0 && currentStepIndex < FLOW_STEPS.length - 1 && !isCancelled) {
      dot
        .transition(t as any)
        .attr('cx', targetX)
        .attr('cy', cy)
        .attr('opacity', 1)
        .attr('stroke', currentCoord ? currentCoord.color : '#06b6d4');
    } else {
      dot.transition(t as any).attr('opacity', 0);
    }

    // Render / Update Nodes with D3 Data Join
    const nodesContainer = svg.select('.nodes-container');

    const nodeSelection = nodesContainer
      .selectAll<SVGGElement, typeof stepCoordinates[0]>('.flow-node')
      .data(stepCoordinates, (d: any) => d.key);

    // Enter selection
    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'flow-node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', isEditable ? 'pointer' : 'default');

    // Enter: Outer ripple wave ring
    nodeEnter
      .append('circle')
      .attr('class', 'outer-pulse-ring')
      .attr('r', nodeRadius + 8)
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0);

    // Enter: Base Node Circle
    nodeEnter
      .append('circle')
      .attr('class', 'base-circle')
      .attr('r', nodeRadius)
      .attr('fill', 'var(--color-base-surface-2, #1e293b)')
      .attr('stroke', 'var(--color-border, #475569)')
      .attr('stroke-width', 2);

    // Enter: Center glyph group
    const glyphG = nodeEnter.append('g').attr('class', 'glyph-container');
    glyphG.append('path').attr('class', 'check-icon').attr('opacity', 0);
    glyphG.append('circle').attr('class', 'active-center-dot').attr('opacity', 0);
    glyphG.append('text').attr('class', 'step-number-text').attr('opacity', 0);

    // Enter: Labels
    nodeEnter
      .append('text')
      .attr('class', 'label-title')
      .attr('text-anchor', 'middle')
      .attr('y', nodeRadius + (compact ? 14 : 18));

    nodeEnter
      .append('text')
      .attr('class', 'label-subtitle')
      .attr('text-anchor', 'middle')
      .attr('y', nodeRadius + (compact ? 24 : 32));

    // MERGE & UPDATE with smooth transitions
    const nodeMerge = nodeSelection.merge(nodeEnter);

    // Update positions on resize
    nodeMerge
      .transition(t as any)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Event handlers
    nodeMerge
      .style('cursor', isEditable ? 'pointer' : 'default')
      .on('mouseenter', function (_, d) {
        if (!isEditable) return;
        setHoveredStep(d);
        d3.select(this)
          .select('.base-circle')
          .transition()
          .duration(180)
          .attr('r', nodeRadius + 3)
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function (_, d) {
        setHoveredStep(null);
        d3.select(this)
          .select('.base-circle')
          .transition()
          .duration(180)
          .attr('r', nodeRadius)
          .attr('stroke-width', d.index <= currentStepIndex ? 2.5 : 1.5);
      })
      .on('click', function (_, d) {
        if (!isEditable || isUpdating) return;
        // Ripple effect on click
        const clickedNode = d3.select(this);
        clickedNode
          .append('circle')
          .attr('r', nodeRadius)
          .attr('fill', 'none')
          .attr('stroke', d.color)
          .attr('stroke-width', 3)
          .attr('opacity', 0.9)
          .transition()
          .duration(500)
          .ease(d3.easeQuadOut)
          .attr('r', nodeRadius + 22)
          .attr('opacity', 0)
          .remove();

        triggerStatusSelect(d.key);
      });

    // Update Outer Pulsing Ring
    nodeMerge.each(function (d) {
      const g = d3.select(this);
      const ring = g.select('.outer-pulse-ring');
      const isCurrentActive = d.index === currentStepIndex && !isCancelled;

      if (isCurrentActive) {
        ring
          .attr('stroke', d.color)
          .attr('filter', `url(#glow-${orderId})`)
          .transition(t as any)
          .attr('r', nodeRadius + (compact ? 6 : 8))
          .attr('opacity', 0.85);

        ring.classed('animate-spin', true).style('animation-duration', '8s');
      } else {
        ring
          .transition(t as any)
          .attr('opacity', 0)
          .attr('r', nodeRadius);
        ring.classed('animate-spin', false);
      }
    });

    // Update Base Circles
    nodeMerge.each(function (d) {
      const g = d3.select(this);
      const circle = g.select('.base-circle');
      const isPast = d.index < currentStepIndex && !isCancelled;
      const isCurrent = d.index === currentStepIndex && !isCancelled;

      let fill = 'var(--color-base-surface-2, #1e293b)';
      let stroke = 'var(--color-border, #475569)';
      let strokeWidth = 1.5;

      if (isCancelled) {
        fill = '#334155';
        stroke = '#64748b';
      } else if (isPast) {
        fill = '#10b981'; // Completed emerald
        stroke = '#ffffff';
        strokeWidth = 2;
      } else if (isCurrent) {
        fill = d.color;
        stroke = '#ffffff';
        strokeWidth = 3;
      }

      circle
        .transition(t as any)
        .attr('r', nodeRadius)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth)
        .attr('filter', isCurrent ? `url(#glow-${orderId})` : null);
    });

    // Update Inner Glyphs (Checkmark, Pulse Dot, or Step Number)
    nodeMerge.each(function (d) {
      const g = d3.select(this);
      const isPast = d.index < currentStepIndex && !isCancelled;
      const isCurrent = d.index === currentStepIndex && !isCancelled;

      const checkIcon = g.select('.check-icon');
      const centerDot = g.select('.active-center-dot');
      const numberText = g.select('.step-number-text');

      if (isPast) {
        // Draw Checkmark with stroke-dashoffset animation
        checkIcon
          .attr('d', 'M -4.5 0 L -1.5 3.5 L 5.5 -3.5')
          .attr('fill', 'none')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.4)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-dasharray', 20)
          .attr('stroke-dashoffset', isFirstRender || prevIndex > d.index ? 0 : 20)
          .transition(t as any)
          .attr('opacity', 1)
          .attr('stroke-dashoffset', 0);

        centerDot.transition(t as any).attr('opacity', 0);
        numberText.transition(t as any).attr('opacity', 0);
      } else if (isCurrent) {
        // Center white active circle
        centerDot
          .attr('r', compact ? 4 : 5.5)
          .attr('fill', '#ffffff')
          .transition(t as any)
          .attr('opacity', 1);

        checkIcon.transition(t as any).attr('opacity', 0);
        numberText.transition(t as any).attr('opacity', 0);
      } else {
        // Step Number (1..5)
        numberText
          .attr('text-anchor', 'middle')
          .attr('dy', compact ? '3.5px' : '4.5px')
          .attr('fill', 'currentColor')
          .attr('class', 'step-number-text text-text-muted font-bold text-[10px] select-none')
          .text(d.index + 1)
          .transition(t as any)
          .attr('opacity', 1);

        checkIcon.transition(t as any).attr('opacity', 0);
        centerDot.transition(t as any).attr('opacity', 0);
      }
    });

    // Update Label Titles
    nodeMerge.each(function (d) {
      const g = d3.select(this);
      const isPast = d.index < currentStepIndex && !isCancelled;
      const isCurrent = d.index === currentStepIndex && !isCancelled;

      const title = g.select('.label-title');
      let titleClass = 'label-title text-[11px] font-medium text-text-muted';

      if (isCancelled) {
        titleClass = 'label-title text-[11px] font-medium text-text-muted opacity-60';
      } else if (isCurrent) {
        titleClass = 'label-title text-[12px] font-bold text-text-primary';
      } else if (isPast) {
        titleClass = 'label-title text-[11px] font-semibold text-success-text';
      }

      title
        .attr('class', titleClass)
        .text(d.label)
        .transition(t as any)
        .attr('y', nodeRadius + (compact ? 14 : 18));

      // Subtitle
      const subtitle = g.select('.label-subtitle');
      if (!compact) {
        subtitle
          .attr('class', 'label-subtitle text-[9px] text-text-muted opacity-75 hidden sm:block')
          .text(d.sublabel)
          .transition(t as any)
          .attr('y', nodeRadius + 32);
      } else {
        subtitle.text('');
      }
    });

  }, [containerWidth, status, isCancelled, currentStepIndex, compact, orderId, isEditable, trackingNumber, triggerStatusSelect]);

  // Advance Next / Back Steppers
  const handleAdvanceNext = () => {
    if (isCancelled) {
      triggerStatusSelect('pending');
      return;
    }
    if (currentStepIndex < FLOW_STEPS.length - 1) {
      const nextStep = FLOW_STEPS[currentStepIndex + 1];
      triggerStatusSelect(nextStep.key);
    }
  };

  const handleStepBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = FLOW_STEPS[currentStepIndex - 1];
      triggerStatusSelect(prevStep.key);
    }
  };

  // Find active status object
  const activeStepObj = FLOW_STEPS.find(s => s.key === status);

  // Helper for Status Badge & Icon in History
  const getStatusVisuals = (st: OrderStatus) => {
    if (st === 'cancelled') {
      return {
        label: 'İptal Edildi',
        color: '#ef4444',
        bg: 'bg-danger-fill/15 text-danger-text border-danger-border',
        icon: <XCircle className="w-3.5 h-3.5 text-danger-text" />,
      };
    }
    const found = FLOW_STEPS.find(s => s.key === st);
    if (!found) {
      return {
        label: st,
        color: '#64748b',
        bg: 'bg-base-surface text-text-muted border-border',
        icon: <Clock className="w-3.5 h-3.5 text-text-muted" />,
      };
    }

    let IconComp = Clock;
    if (st === 'approved') IconComp = CheckCircle2;
    if (st === 'preparing') IconComp = Package;
    if (st === 'shipped') IconComp = Truck;
    if (st === 'delivered') IconComp = CheckCheck;

    return {
      label: found.label,
      color: found.color,
      bg: 'border-border',
      icon: <IconComp className="w-3.5 h-3.5" style={{ color: found.color }} />,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-border bg-base-surface-2 p-3 sm:p-4 shadow-2xs relative transition-all ${className}`}
    >
      {/* Top Header Bar with Live Indicator & Direct Status Changer Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-border text-xs relative">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-base-surface text-[11px] font-bold text-text-primary border border-border shadow-2xs">
            <span className="w-2 h-2 rounded-full animate-ping bg-emerald-500" />
            <span>Sipariş Akış Çizelgesi</span>
          </div>

          {orderNumber && (
            <span className="text-text-muted text-[11px] font-mono hidden sm:inline bg-base-surface px-2 py-0.5 rounded border border-border">
              #{orderNumber}
            </span>
          )}

          {isCancelled && (
            <span className="px-2 py-0.5 rounded-lg bg-danger-fill/20 text-danger-text border border-danger-border text-[11px] font-bold flex items-center space-x-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>İptal Edildi</span>
            </span>
          )}
        </div>

        {/* Clickable Status Switcher Dropdown Trigger */}
        <div className="flex items-center space-x-2 text-[11px] relative">
          {isEditable ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(prev => !prev)}
                disabled={isUpdating}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border hover:border-warning-border transition-all cursor-pointer shadow-2xs text-xs font-semibold group"
                title="Tıklanabilir Durum Değiştirici"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-warning-text group-hover:rotate-45 transition-transform" />
                <span className="text-text-muted hidden sm:inline">Durum:</span>
                <span className="font-bold text-text-primary">
                  {isCancelled ? 'İptal' : activeStepObj?.label || 'Seçiniz'}
                </span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>

              {/* Status Changer Popup Menu */}
              {showStatusDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowStatusDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-base-surface border border-border rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border mb-1 flex items-center justify-between">
                      <span>Sipariş Durumunu Değiştir</span>
                      <Sparkles className="w-3 h-3 text-warning-text" />
                    </div>

                    <div className="space-y-1">
                      {FLOW_STEPS.map(st => {
                        const isCurrent = st.key === status;
                        return (
                          <button
                            key={st.key}
                            onClick={() => triggerStatusSelect(st.key)}
                            disabled={isUpdating || isCurrent}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-warning-fill/15 text-warning-text font-bold border border-warning-border'
                                : 'text-text-primary hover:bg-base-surface-2 font-medium'
                            } disabled:opacity-50`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: st.color }}
                              />
                              <div className="text-left">
                                <div className="font-semibold leading-tight">{st.label}</div>
                                <div className="text-[10px] text-text-muted leading-tight">
                                  {st.sublabel}
                                </div>
                              </div>
                            </div>

                            {isCurrent && (
                              <Check className="w-3.5 h-3.5 text-warning-text shrink-0" />
                            )}
                          </button>
                        );
                      })}

                      {/* Cancel Option */}
                      <div className="border-t border-border my-1 pt-1">
                        {status !== 'cancelled' ? (
                          <button
                            onClick={() => triggerStatusSelect('cancelled')}
                            disabled={isUpdating}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-danger-text hover:bg-danger-fill/10 font-semibold transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Siparişi İptal Et</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerStatusSelect('pending')}
                            disabled={isUpdating}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-success-text hover:bg-success-fill/10 font-semibold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Siparişi Yeniden Aktif Et</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <span className="text-text-muted text-[10px] bg-base-surface px-2 py-0.5 rounded border border-border">
              Canlı Takip
            </span>
          )}
        </div>
      </div>

      {/* D3 SVG Interactive Diagram */}
      <div className="w-full relative flex items-center justify-center my-1 select-none">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>

      {/* Hovered Step Tooltip / Info Banner */}
      {hoveredStep && isEditable && (
        <div className="mt-1 text-center text-[11px] text-text-secondary animate-in fade-in duration-150 bg-base-surface/80 py-1 px-2.5 rounded-lg border border-border/60 mx-auto max-w-md">
          <span className="font-bold text-text-primary">
            {hoveredStep.index + 1}. {hoveredStep.label}
          </span>
          : {hoveredStep.sublabel} —{' '}
          <span className="text-info-text underline font-semibold cursor-pointer">
            Geçiş yapmak için tıklayın
          </span>
        </div>
      )}

      {/* Tracking Number Indicator */}
      {trackingNumber && (
        <div className="mt-2 px-3 py-1.5 bg-bg-warning/70 border border-warning-border rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 text-warning-text">
          <div className="flex items-center space-x-2">
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span>
              Sevkiyat / Takip No:{' '}
              <strong className="font-mono">{trackingNumber}</strong>
            </span>
          </div>
          <span className="text-[10px] text-text-muted">
            Özmal Dağıtım Aracı / Şoför
          </span>
        </div>
      )}

      {/* Tracking Number Input Prompt Modal / Inline Dialog when setting to Shipped */}
      {showTrackingPrompt && (
        <div className="mt-3 p-3 rounded-xl bg-base-surface border border-warning-border animate-in fade-in space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-warning-text">
            <span className="flex items-center space-x-1.5">
              <Truck className="w-4 h-4" />
              <span>Sevkiyat & İrsaliye Referans Numarası Girin</span>
            </span>
            <button
              onClick={() => {
                setShowTrackingPrompt(false);
                setTargetPendingStatus(null);
              }}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              Vazgeç
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customTrackingInput}
              onChange={e => setCustomTrackingInput(e.target.value)}
              placeholder="Örn: SEVK-892182 veya 63 AT 941"
              className="flex-1 px-3 py-1.5 bg-base-surface-2 border border-border rounded-lg text-xs font-mono text-text-primary focus:border-warning-border"
            />
            <button
              onClick={() => handleStepClick(targetPendingStatus || 'shipped', customTrackingInput)}
              disabled={isUpdating}
              className="px-3.5 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Sevkiyata Çıkar ve Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Manual Advancement & Step Control Bar */}
      {showControls && isEditable && (
        <div className="mt-2.5 pt-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2">
          {/* Direct Stage Quick-Selector Chips */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-text-muted mr-1 font-semibold uppercase tracking-wider hidden sm:inline">
              Hızlı Geçiş:
            </span>
            {FLOW_STEPS.map(st => {
              const isCurrent = st.key === status;
              return (
                <button
                  key={st.key}
                  disabled={isUpdating || isCurrent}
                  onClick={() => triggerStatusSelect(st.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                    isCurrent
                      ? 'bg-base-surface text-text-primary border-warning-border shadow-2xs ring-1 ring-warning-border'
                      : 'bg-base-surface text-text-muted border-border hover:bg-base-surface-2 hover:text-text-primary'
                  } disabled:opacity-60`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <span>{st.label}</span>
                </button>
              );
            })}

            {/* Cancel Button */}
            {status !== 'cancelled' && status !== 'delivered' && (
              <button
                disabled={isUpdating}
                onClick={() => triggerStatusSelect('cancelled')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-danger-text bg-danger-fill/10 hover:bg-danger-fill/20 border border-danger-border transition-colors cursor-pointer ml-1"
              >
                İptal
              </button>
            )}

            {status === 'cancelled' && (
              <button
                disabled={isUpdating}
                onClick={() => triggerStatusSelect('pending')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-success-text bg-success-fill/10 hover:bg-success-fill/20 border border-success-border transition-colors cursor-pointer ml-1"
              >
                Tekrar Aktif Et
              </button>
            )}
          </div>

          {/* Stepper (Prev / Next) Buttons */}
          <div className="flex items-center space-x-1.5 ml-auto">
            <button
              onClick={handleStepBack}
              disabled={isUpdating || currentStepIndex <= 0 || isCancelled}
              className="px-2.5 py-1.5 bg-base-surface hover:bg-base-surface-2 disabled:opacity-40 disabled:hover:bg-base-surface text-text-secondary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              title="Önceki Aşamaya Geri Al"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Geri</span>
            </button>

            <button
              onClick={handleAdvanceNext}
              disabled={isUpdating || currentStepIndex >= FLOW_STEPS.length - 1}
              className="px-3 py-1.5 bg-success-fill hover:opacity-90 disabled:opacity-40 text-base rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              title="Sonraki Aşamaya İlerlet"
            >
              <span>
                {currentStepIndex === -1
                  ? 'Siparişi Başlat'
                  : currentStepIndex >= FLOW_STEPS.length - 1
                  ? 'Tamamlandı'
                  : `${FLOW_STEPS[currentStepIndex + 1]?.label} Yap`}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* DURUM GEÇMİŞİ KRONOLOJİSİ (Status History & Timeline) */}
      <div className="mt-3 pt-2.5 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(prev => !prev)}
            className="flex items-center space-x-2 text-xs font-bold text-text-primary hover:text-warning-text transition-colors group cursor-pointer"
          >
            <div className="p-1 rounded bg-base-surface border border-border group-hover:border-warning-border transition-colors">
              <History className="w-3.5 h-3.5 text-warning-text" />
            </div>
            <span>Durum Geçmişi & Zaman Çizelgesi</span>
            <span className="px-1.5 py-0.5 rounded-full bg-base-surface border border-border text-[10px] font-mono text-text-muted">
              {chronologyItems.length} Kayıt
            </span>
            {isHistoryExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary" />
            )}
          </button>

          {chronologyItems.length > 0 && (
            <div className="text-[10px] text-text-muted flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Son Değişiklik: {formatTimestamp(chronologyItems[chronologyItems.length - 1]?.timestamp).relative}</span>
            </div>
          )}
        </div>

        {isHistoryExpanded && (
          <div className="bg-base-surface rounded-xl border border-border p-2.5 sm:p-3 animate-in fade-in duration-200">
            <div className="relative pl-3 space-y-3.5 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
              {chronologyItems.map((item, idx) => {
                const isLatest = idx === chronologyItems.length - 1;
                const visual = getStatusVisuals(item.status);
                const { fullDate, time, relative } = formatTimestamp(item.timestamp);

                return (
                  <div key={item.id || idx} className="relative flex items-start space-x-3 group">
                    {/* Timeline Node Bullet */}
                    <div
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 ${
                        isLatest
                          ? 'bg-base-surface shadow-xs ring-2 ring-warning-border ring-offset-1 ring-offset-base-surface-2'
                          : 'bg-base-surface-2 border-border'
                      }`}
                      style={{ borderColor: visual.color }}
                    >
                      {visual.icon}
                      {isLatest && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
                          style={{ backgroundColor: visual.color }}
                        />
                      )}
                    </div>

                    {/* Timeline Item Content */}
                    <div className="flex-1 min-w-0 bg-base-surface-2/60 hover:bg-base-surface-2 transition-colors rounded-lg p-2 border border-border/80 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center space-x-1"
                            style={{
                              backgroundColor: `${visual.color}18`,
                              borderColor: `${visual.color}40`,
                              color: visual.color,
                            }}
                          >
                            <span>{visual.label}</span>
                          </span>

                          {item.updatedBy && (
                            <span className="text-[10px] text-text-muted font-medium flex items-center space-x-1">
                              <UserCheck className="w-3 h-3 text-text-muted/70" />
                              <span>{item.updatedBy}</span>
                            </span>
                          )}
                        </div>

                        {/* Date & Time display */}
                        <div className="text-[10px] text-text-muted font-mono flex items-center space-x-1 bg-base-surface px-1.5 py-0.5 rounded border border-border/60">
                          <Calendar className="w-2.5 h-2.5 text-text-muted/70" />
                          <span>{fullDate}</span>
                          <span className="text-text-primary font-bold">{time}</span>
                          {relative && <span className="text-text-muted/60">({relative})</span>}
                        </div>
                      </div>

                      {/* Note or Details */}
                      {item.note && (
                        <p className="text-[11px] text-text-secondary leading-snug">
                          {item.note}
                        </p>
                      )}

                      {/* Tracking number badge if attached to item */}
                      {item.trackingNumber && (
                        <div className="mt-1 text-[10px] font-mono text-warning-text flex items-center space-x-1 bg-bg-warning/50 px-2 py-0.5 rounded border border-warning-border/60 w-fit">
                          <Truck className="w-3 h-3" />
                          <span>Takip Kodu: {item.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default D3OrderStatusFlow;
