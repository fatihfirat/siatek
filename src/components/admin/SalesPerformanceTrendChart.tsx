import { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Order, Product } from '../../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  Filter, 
  BarChart2, 
  Activity, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface SalesPerformanceTrendChartProps {
  orders: Order[];
  products?: Product[];
  onSelectDate?: (dateKey: string) => void;
  className?: string;
}

export interface DayVolumeStat {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayName: string; // e.g. "Pazartesi"
  dayShort: string; // e.g. "Pzt"
  formattedDate: string; // e.g. "25 Ağu"
  fullDateStr: string; // e.g. "25 Ağustos 2026"
  orderCount: number;
  revenue: number;
  itemCount: number;
  avgOrderValue: number;
  orders: Order[];
  isPeakDay?: boolean;
}

export default function SalesPerformanceTrendChart({
  orders,
  products = [],
  onSelectDate,
  className = ''
}: SalesPerformanceTrendChartProps) {
  // Chart Display Mode
  const [viewMode, setViewMode] = useState<'volume' | 'revenue' | 'combined'>('combined');
  const [includeCancelled, setIncludeCancelled] = useState<boolean>(false);
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 1. Prepare 7-Day Buckets (Last 7 consecutive days up to today)
  const last7DaysData = useMemo<DayVolumeStat[]>(() => {
    const result: DayVolumeStat[] = [];
    const now = new Date();

    const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const DAY_SHORTS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const dayName = DAY_NAMES[dayIndex];
      const dayShort = DAY_SHORTS[dayIndex];
      const formattedDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const fullDateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

      // Match orders (using delivery date for delivered orders, createdAt otherwise)
      const dayOrders = orders.filter(o => {
        const effectiveDate = (o.status === 'delivered' && o.deliveredAt) ? o.deliveredAt : o.createdAt;
        const oDateKey = new Date(effectiveDate).toISOString().split('T')[0];
        if (oDateKey !== dateKey) return false;
        if (!includeCancelled && o.status === 'cancelled') return false;
        return true;
      });

      const orderCount = dayOrders.length;
      const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const itemCount = dayOrders.reduce((sum, o) => {
        return sum + (o.items ? o.items.reduce((iSum, it) => iSum + it.quantity, 0) : 0);
      }, 0);
      const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

      result.push({
        date: d,
        dateKey,
        dayName,
        dayShort,
        formattedDate,
        fullDateStr,
        orderCount,
        revenue,
        itemCount,
        avgOrderValue,
        orders: dayOrders,
      });
    }

    // Find peak volume day
    const maxOrders = Math.max(...result.map(r => r.orderCount), 0);
    if (maxOrders > 0) {
      result.forEach(r => {
        if (r.orderCount === maxOrders) {
          r.isPeakDay = true;
        }
      });
    }

    return result;
  }, [orders, includeCancelled]);

  // 2. Summary KPIs for the 7-day period
  const totalVolume7Days = useMemo(() => {
    return last7DaysData.reduce((acc, d) => acc + d.orderCount, 0);
  }, [last7DaysData]);

  const totalRevenue7Days = useMemo(() => {
    return last7DaysData.reduce((acc, d) => acc + d.revenue, 0);
  }, [last7DaysData]);

  const totalItems7Days = useMemo(() => {
    return last7DaysData.reduce((acc, d) => acc + d.itemCount, 0);
  }, [last7DaysData]);

  const dailyAverageOrders = useMemo(() => {
    return (totalVolume7Days / 7).toFixed(1);
  }, [totalVolume7Days]);

  const peakDayInfo = useMemo(() => {
    return last7DaysData.find(d => d.isPeakDay) || last7DaysData[0];
  }, [last7DaysData]);

  // 3. Render D3 Graphic
  useEffect(() => {
    if (!svgRef.current || last7DaysData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current?.clientWidth || 700;
    const containerHeight = 320;

    const margin = { top: 32, right: 40, bottom: 52, left: 48 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Band for 7 days
    const xScale = d3
      .scaleBand<string>()
      .domain(last7DaysData.map(d => d.dateKey))
      .range([0, width])
      .padding(0.32);

    // X Scale: Point for connecting lines & splines (center of bands)
    const xPointScale = d3
      .scalePoint<string>()
      .domain(last7DaysData.map(d => d.dateKey))
      .range([xScale.bandwidth() / 2, width - xScale.bandwidth() / 2]);

    // Y Scale (Left): Order Volume (Adet)
    const maxOrders = Math.max(...last7DaysData.map(d => d.orderCount), 4);
    const yScaleVolume = d3
      .scaleLinear()
      .domain([0, maxOrders + 1])
      .nice()
      .range([height, 0]);

    // Y Scale (Right): Revenue (₺)
    const maxRevenue = Math.max(...last7DaysData.map(d => d.revenue), 1000);
    const yScaleRevenue = d3
      .scaleLinear()
      .domain([0, maxRevenue * 1.15])
      .nice()
      .range([height, 0]);

    // Defs & Gradients
    const defs = svg.append('defs');

    // Bar Gradient (Green Alpha)
    const barGradient = defs
      .append('linearGradient')
      .attr('id', 'alphaBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    barGradient.append('stop').attr('offset', '0%').attr('stop-color', '#2E5438').attr('stop-opacity', 0.95);
    barGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1E3B26').attr('stop-opacity', 0.85);

    // Peak Bar Gradient (Warm Amber / Gold)
    const peakBarGradient = defs
      .append('linearGradient')
      .attr('id', 'alphaPeakBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    peakBarGradient.append('stop').attr('offset', '0%').attr('stop-color', '#D97706').attr('stop-opacity', 1);
    peakBarGradient.append('stop').attr('offset', '100%').attr('stop-color', '#B45309').attr('stop-opacity', 0.9);

    // Area Gradient (Terra-cotta Revenue)
    const revenueAreaGradient = defs
      .append('linearGradient')
      .attr('id', 'revenueAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    revenueAreaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.35);
    revenueAreaGradient.append('stop').attr('offset', '70%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.08);
    revenueAreaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.0);

    // Horizontal Grid Lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3.axisLeft(yScaleVolume)
          .ticks(Math.min(5, maxOrders + 1))
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .call(axisG => {
        axisG.select('.domain').remove();
        axisG.selectAll('.tick line')
          .attr('stroke', '#EFE9DE')
          .attr('stroke-dasharray', '3,3');
      });

    // 1. Draw Revenue Area & Curve if 'revenue' or 'combined'
    if (viewMode === 'revenue' || viewMode === 'combined') {
      const revenueAreaGen = d3
        .area<DayVolumeStat>()
        .curve(d3.curveMonotoneX)
        .x(d => (xPointScale(d.dateKey) ?? 0))
        .y0(height)
        .y1(d => yScaleRevenue(d.revenue));

      const revenueLineGen = d3
        .line<DayVolumeStat>()
        .curve(d3.curveMonotoneX)
        .x(d => (xPointScale(d.dateKey) ?? 0))
        .y(d => yScaleRevenue(d.revenue));

      // Filled Area
      g.append('path')
        .datum(last7DaysData)
        .attr('fill', 'url(#revenueAreaGradient)')
        .attr('d', revenueAreaGen);

      // Stroke Line
      g.append('path')
        .datum(last7DaysData)
        .attr('fill', 'none')
        .attr('stroke', '#8C4A32')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', revenueLineGen);

      // Data Points for Revenue
      g.selectAll('.revenue-dot')
        .data(last7DaysData)
        .enter()
        .append('circle')
        .attr('class', 'revenue-dot')
        .attr('cx', (d: DayVolumeStat) => xPointScale(d.dateKey) ?? 0)
        .attr('cy', (d: DayVolumeStat) => yScaleRevenue(d.revenue))
        .attr('r', 4.5)
        .attr('fill', '#FFFFFF')
        .attr('stroke', '#8C4A32')
        .attr('stroke-width', 2);
    }

    // 2. Draw Order Volume Bars if 'volume' or 'combined'
    if (viewMode === 'volume' || viewMode === 'combined') {
      const barWidth = xScale.bandwidth();

      // Background column hover guides
      g.selectAll('.bar-bg')
        .data(last7DaysData)
        .enter()
        .append('rect')
        .attr('class', 'bar-bg')
        .attr('x', (d: DayVolumeStat) => xScale(d.dateKey) ?? 0)
        .attr('y', 0)
        .attr('width', barWidth)
        .attr('height', height)
        .attr('fill', (d: DayVolumeStat, i: number) => (activeHoverIndex === i ? 'rgba(46, 84, 56, 0.06)' : 'transparent'))
        .attr('rx', 6)
        .attr('ry', 6);

      // Volume Bars
      g.selectAll('.volume-bar')
        .data(last7DaysData)
        .enter()
        .append('rect')
        .attr('class', 'volume-bar')
        .attr('x', (d: DayVolumeStat) => xScale(d.dateKey) ?? 0)
        .attr('y', (d: DayVolumeStat) => yScaleVolume(d.orderCount))
        .attr('width', barWidth)
        .attr('height', (d: DayVolumeStat) => Math.max(0, height - yScaleVolume(d.orderCount)))
        .attr('fill', (d: DayVolumeStat) => (d.isPeakDay ? 'url(#alphaPeakBarGradient)' : 'url(#alphaBarGradient)'))
        .attr('opacity', (d: DayVolumeStat, i: number) => (activeHoverIndex === null || activeHoverIndex === i ? 1 : 0.65))
        .attr('rx', 6)
        .attr('ry', 6)
        .style('transition', 'all 0.2s ease');

      // Value Labels on Top of Bars
      g.selectAll('.bar-label')
        .data(last7DaysData)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d: DayVolumeStat) => (xScale(d.dateKey) ?? 0) + barWidth / 2)
        .attr('y', (d: DayVolumeStat) => Math.max(16, yScaleVolume(d.orderCount) - 8))
        .attr('text-anchor', 'middle')
        .attr('fill', (d: DayVolumeStat) => (d.isPeakDay ? '#B45309' : '#2E5438'))
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .style('paint-order', 'stroke fill')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', '3px')
        .attr('stroke-linejoin', 'round')
        .text((d: DayVolumeStat) => `${d.orderCount} ${d.orderCount === 1 ? 'sip.' : 'sip.'}`);
    }

    // 3. Average Trend Guideline
    if (totalVolume7Days > 0) {
      const avgY = yScaleVolume(Number(dailyAverageOrders));
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', avgY)
        .attr('y2', avgY)
        .attr('stroke', '#059669')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', width)
        .attr('y', avgY - 6)
        .attr('text-anchor', 'end')
        .attr('fill', '#059669')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .style('paint-order', 'stroke fill')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', '2px')
        .text(`Ortalama: ${dailyAverageOrders} sipariş/gün`);
    }

    // 4. X Axis (Day Labels) with Responsive Formatting
    const isNarrowViewport = containerWidth < 500;
    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => {
        const item = last7DaysData.find(x => x.dateKey === d);
        if (!item) return d;
        return isNarrowViewport ? item.dayShort : `${item.dayShort} (${item.formattedDate})`;
      }))
      .call(axisG => {
        axisG.select('.domain').attr('stroke', '#DCD3C4');
        axisG.selectAll('.tick line').attr('stroke', '#DCD3C4');
        axisG.selectAll('.tick text')
          .attr('fill', '#44403C')
          .attr('font-size', isNarrowViewport ? '11px' : '10.5px')
          .attr('font-weight', '600')
          .attr('dy', '12px');
      });

    // Highlight Peak Day Label on X Axis
    xAxis.selectAll('.tick text').each(function (d) {
      const item = last7DaysData.find(x => x.dateKey === d);
      if (item?.isPeakDay) {
        d3.select(this)
          .attr('fill', '#B45309')
          .attr('font-weight', 'bold');
      }
    });

    // 5. Y Axis (Left: Order Count)
    const yAxisLeft = g
      .append('g')
      .call(
        d3.axisLeft(yScaleVolume)
          .ticks(Math.min(5, maxOrders + 1))
          .tickFormat(d => `${d} sip`)
      )
      .call(axisG => {
        axisG.select('.domain').remove();
        axisG.selectAll('.tick line').remove();
        axisG.selectAll('.tick text')
          .attr('fill', '#2E5438')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace');
      });

    // 6. Y Axis (Right: Revenue ₺) if revenue/combined
    if (viewMode === 'revenue' || viewMode === 'combined') {
      g.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(
          d3.axisRight(yScaleRevenue)
            .ticks(4)
            .tickFormat(d => {
              const num = d as number;
              if (num >= 1000) return `${Math.round(num / 1000)}k ₺`;
              return `${num} ₺`;
            })
        )
        .call(axisG => {
          axisG.select('.domain').remove();
          axisG.selectAll('.tick line').remove();
          axisG.selectAll('.tick text')
            .attr('fill', '#8C4A32')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'ui-monospace, monospace');
        });
    }

    // 7. Interactive Invisible Overlay for Mouse / Touch Event Detection
    const overlay = g
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer');

    const findIndex = (mouseX: number) => {
      const step = width / 7;
      const index = Math.floor(mouseX / step);
      return Math.max(0, Math.min(6, index));
    };

    overlay
      .on('mousemove', function (event) {
        const [xPos] = d3.pointer(event, this);
        const idx = findIndex(xPos);
        setActiveHoverIndex(idx);
      })
      .on('mouseleave', function () {
        setActiveHoverIndex(null);
      })
      .on('click', function (event) {
        const [xPos] = d3.pointer(event, this);
        const idx = findIndex(xPos);
        const clickedDay = last7DaysData[idx];
        if (clickedDay && onSelectDate) {
          onSelectDate(clickedDay.dateKey);
        }
      });

  }, [last7DaysData, viewMode, activeHoverIndex, onSelectDate]);

  const activeHoverItem = activeHoverIndex !== null ? last7DaysData[activeHoverIndex] : null;

  return (
    <div 
      id="sales-performance-trend-container" 
      ref={containerRef}
      className={`bg-white rounded-3xl border border-[#E7E0D4] p-5 sm:p-6 shadow-xs space-y-5 ${className}`}
    >
      
      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EAE3D6]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2E5438] border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 flex items-center space-x-2">
                <span>Satış Performans Trendi (Son 7 Gün)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-mono font-bold">
                  Canlı Grafik
                </span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Son 7 günlük sipariş hacmi, günlük işlem adetleri ve ciro dinamikleri.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#F4EFE6] p-1 rounded-xl border border-[#DDD5C7] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('volume')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer touch-manipulation ${
                viewMode === 'volume'
                  ? 'bg-[#2E5438] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hacim (Sipariş Adeti)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('revenue')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer touch-manipulation ${
                viewMode === 'revenue'
                  ? 'bg-[#8C4A32] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ciro (₺)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('combined')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer touch-manipulation ${
                viewMode === 'combined'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Kombine Görünüm
            </button>
          </div>

          {/* Toggle Cancelled Orders */}
          <button
            type="button"
            onClick={() => setIncludeCancelled(prev => !prev)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer touch-manipulation ${
              includeCancelled
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-[#DDD5C7] text-stone-600 hover:bg-stone-50'
            }`}
            title="İptal edilen siparişleri de grafiğe dahil et veya hariç tut"
          >
            <Filter className="w-4 h-4" />
            <span>{includeCancelled ? 'Tüm Siparişler' : 'Geçerli Siparişler'}</span>
          </button>
        </div>
      </div>

      {/* 4-KPI Metric Highlights Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E7E0D4] space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">7 Günlük Sipariş Hacmi</span>
            <ShoppingBag className="w-3.5 h-3.5 text-[#2E5438]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#2E5438] font-mono">
            {totalVolume7Days} <span className="text-xs font-normal text-stone-600">Sipariş</span>
          </div>
          <div className="text-[11px] text-stone-500">
            Toplam {totalItems7Days} kalem ürün sevkiyatı
          </div>
        </div>

        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E7E0D4] space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">7 Günlük Toplam Ciro</span>
            <DollarSign className="w-3.5 h-3.5 text-[#8C4A32]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#8C4A32] font-mono">
            {totalRevenue7Days.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-stone-500">
            KDV ve B2B iskontoları dahil
          </div>
        </div>

        <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E7E0D4] space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Günlük Ortalama Hacim</span>
            <BarChart2 className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono">
            {dailyAverageOrders} <span className="text-xs font-normal text-stone-600">sipariş/gün</span>
          </div>
          <div className="text-[11px] text-stone-500">
            Ort. Sepet: {totalVolume7Days > 0 ? Math.round(totalRevenue7Days / totalVolume7Days).toLocaleString('tr-TR') : 0} ₺
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
            <span>En Yoğun Gün (Zirve)</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
            {peakDayInfo.dayName}
          </div>
          <div className="text-[11px] text-amber-900 font-medium">
            {peakDayInfo.orderCount} Sipariş ({peakDayInfo.revenue.toLocaleString('tr-TR')} ₺)
          </div>
        </div>

      </div>

      {/* D3 Graphic Canvas Container */}
      <div className="relative bg-[#FCFBF9] p-4 rounded-2xl border border-[#E7E0D4] overflow-hidden">
        
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center space-x-4">
            {(viewMode === 'volume' || viewMode === 'combined') && (
              <div className="flex items-center space-x-1.5 font-bold text-stone-800">
                <span className="w-3.5 h-3.5 rounded bg-[#2E5438] inline-block"></span>
                <span>Sipariş Adeti (Hacim Sütunu)</span>
              </div>
            )}
            {(viewMode === 'revenue' || viewMode === 'combined') && (
              <div className="flex items-center space-x-1.5 font-bold text-stone-800">
                <span className="w-3.5 h-0.5 bg-[#8C4A32] inline-block"></span>
                <span className="w-2 h-2 rounded-full border-2 border-[#8C4A32] bg-white inline-block -ml-2.5"></span>
                <span>Satış Cirosu (₺ Çizgisi)</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 text-stone-500 text-[11px]">
              <span className="w-4 h-0.5 border-b border-dashed border-emerald-600 inline-block"></span>
              <span>Haftalık Ortalama Çizgisi</span>
            </div>
          </div>

          <span className="text-[11px] text-stone-400">
            *Detaylar için günlerin üzerine gelin veya tıklayın.
          </span>
        </div>

        {/* SVG Render Element */}
        <div className="w-full">
          <svg ref={svgRef} className="w-full h-auto" />
        </div>

        {/* Dynamic Precision Hover Tooltip Overlay */}
        {activeHoverItem && (
          <div className="mt-3 p-3.5 bg-stone-900 text-white rounded-2xl border border-stone-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xs text-emerald-400 font-mono">
                {activeHoverItem.dayShort}
              </div>
              <div>
                <div className="font-bold text-sm text-stone-100 flex items-center space-x-2">
                  <span>{activeHoverItem.fullDateStr} ({activeHoverItem.dayName})</span>
                  {activeHoverItem.isPeakDay && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      ★ Haftanın Zirvesi
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-400">
                  {activeHoverItem.orderCount} sipariş kaydı • {activeHoverItem.itemCount} adet ürün
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs font-mono">
              <div>
                <span className="text-stone-400 block text-[10px]">Günlük Hacim</span>
                <span className="text-base font-bold text-emerald-400">
                  {activeHoverItem.orderCount} Sipariş
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Günlük Ciro</span>
                <span className="text-base font-bold text-amber-300">
                  {activeHoverItem.revenue.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Ort. Sepet (AOV)</span>
                <span className="text-base font-bold text-blue-300">
                  {activeHoverItem.avgOrderValue.toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 7-Day Quick Day Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
        {last7DaysData.map((day, idx) => {
          const isSelected = activeHoverIndex === idx;
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => {
                setActiveHoverIndex(idx);
                if (onSelectDate) onSelectDate(day.dateKey);
              }}
              onMouseEnter={() => setActiveHoverIndex(idx)}
              onMouseLeave={() => setActiveHoverIndex(null)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50 border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                  : day.isPeakDay
                  ? 'bg-amber-50/50 border-amber-300 hover:bg-amber-50'
                  : 'bg-white border-[#E7E0D4] hover:border-stone-400 hover:bg-stone-50/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-900">{day.dayShort}</span>
                <span className="text-stone-500 font-mono text-[10px]">{day.formattedDate}</span>
              </div>
              
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-[#2E5438]">
                  {day.orderCount}
                </span>
                <span className="text-[10px] text-stone-500 font-medium">sipariş</span>
              </div>

              <div className="text-[11px] font-mono text-stone-700 font-bold mt-0.5 truncate">
                {day.revenue > 0 ? `${day.revenue.toLocaleString('tr-TR')} ₺` : '0 ₺'}
              </div>

              {day.isPeakDay && (
                <div className="mt-1 text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded text-center">
                  Zirve Gün
                </div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
