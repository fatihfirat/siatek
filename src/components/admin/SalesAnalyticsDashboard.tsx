import { useState, useMemo, useRef, useEffect } from 'react';
import { Order, Product } from '../../types';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  Download, 
  Award,
  Filter,
  RefreshCw
} from 'lucide-react';

interface SalesAnalyticsDashboardProps {
  orders: Order[];
  products: Product[];
  onRefresh?: () => void;
}

type TimeRangeOption = '30d' | '14d' | '7d';
type MetricViewOption = 'revenue' | 'orders' | 'items';

export interface DailyTrendItem {
  date: Date;
  dateKey: string;
  formattedDate: string;
  shortDate: string;
  revenue: number;
  orderCount: number;
  itemCount: number;
  avgOrderValue: number;
  movingAverageRevenue: number;
}

export interface CategoryAnalyticsItem {
  category: string;
  revenue: number;
  quantity: number;
  orderCount: number;
  color: string;
  percent: number;
}

export default function SalesAnalyticsDashboard({
  orders = [],
  products = [],
  onRefresh
}: SalesAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('30d');
  const [activeMetric, setActiveMetric] = useState<MetricViewOption>('revenue');
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid_only'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // SVG Chart Container Refs
  const trendChartRef = useRef<SVGSVGElement | null>(null);
  const donutChartRef = useRef<SVGSVGElement | null>(null);
  const barChartRef = useRef<SVGSVGElement | null>(null);

  // Tooltip State
  const [trendTooltip, setTrendTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    revenue: number;
    orderCount: number;
    itemCount: number;
    avgOrderValue: number;
  } | null>(null);

  const [donutHovered, setDonutHovered] = useState<{
    category: string;
    revenue: number;
    quantity: number;
    percent: number;
    orderCount: number;
  } | null>(null);

  // Product category lookup map
  const productCategoryMap = useMemo(() => {
    const map = new Map<string, { category: string; name: string }>();
    products.forEach(p => {
      map.set(p.id, { category: p.category || 'DİĞER', name: p.name });
    });
    return map;
  }, [products]);

  // Filter orders by status & time range (using delivery date for delivered orders)
  const filteredOrders = useMemo(() => {
    const daysLimit = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const cutoffTime = Date.now() - daysLimit * 24 * 60 * 60 * 1000;

    return orders.filter(o => {
      const effectiveDate = (o.status === 'delivered' && o.deliveredAt) ? o.deliveredAt : o.createdAt;
      const orderTime = new Date(effectiveDate).getTime();
      if (orderTime < cutoffTime) return false;
      if (statusFilter === 'valid_only' && o.status === 'cancelled') return false;
      return true;
    });
  }, [orders, timeRange, statusFilter]);

  // Daily Aggregation for Trend Chart (30, 14, or 7 days)
  const dailyTrendData = useMemo<DailyTrendItem[]>(() => {
    const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const result: DailyTrendItem[] = [];

    const now = new Date();
    // Generate buckets for each day
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const shortDate = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' });

      // Find orders on this day (effective date: deliveredAt when delivered, createdAt otherwise)
      const dayOrders = filteredOrders.filter(o => {
        const effectiveDate = (o.status === 'delivered' && o.deliveredAt) ? o.deliveredAt : o.createdAt;
        const oDateKey = new Date(effectiveDate).toISOString().split('T')[0];
        return oDateKey === dateKey;
      });

      const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = dayOrders.length;
      const itemCount = dayOrders.reduce((sum, o) => {
        return sum + (o.items ? o.items.reduce((iSum, it) => iSum + it.quantity, 0) : 0);
      }, 0);
      const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

      result.push({
        date: d,
        dateKey,
        formattedDate,
        shortDate,
        revenue,
        orderCount,
        itemCount,
        avgOrderValue,
        movingAverageRevenue: 0,
      });
    }

    // Calculate 7-day Moving Average for trend smoothing
    for (let i = 0; i < result.length; i++) {
      const windowStart = Math.max(0, i - 3);
      const windowEnd = Math.min(result.length - 1, i + 3);
      let windowSum = 0;
      let windowCount = 0;
      for (let j = windowStart; j <= windowEnd; j++) {
        windowSum += result[j].revenue;
        windowCount++;
      }
      result[i].movingAverageRevenue = Math.round(windowSum / windowCount);
    }

    return result;
  }, [filteredOrders, timeRange]);

  // Category Breakdown Aggregation
  const categoryAnalyticsData = useMemo(() => {
    const catMap = new Map<string, { category: string; revenue: number; quantity: number; orderCount: number; color: string }>();

    const CATEGORY_COLORS: Record<string, string> = {
      'VANALAR & ÇEKVALFLER': '#2E5438',
      'PPRC & PLASTİK BORU': '#8C4A32',
      'BATARYALAR & MUSLUKLAR': '#2563EB',
      'VİTRİFİYE & BANYO': '#0D9488',
      'KOMBİ & ISITMA SİSTEMLERİ': '#D97706',
      'PVC & ATIK SU BORULARI': '#4F46E5',
      'RADYATÖRLER & HAVLUPAN': '#DC2626',
      'DOĞALGAZ & FLEX GRUBU': '#059669',
      'SAYAÇLAR & ARMATÜRLER': '#9333EA',
      'DİĞER': '#6B7280',
    };

    let totalRevenueSum = 0;
    let totalItemsSum = 0;

    filteredOrders.forEach(order => {
      const seenCategoriesInOrder = new Set<string>();

      (order.items || []).forEach(item => {
        const prodInfo = productCategoryMap.get(item.productId);
        const categoryName = prodInfo?.category || 'DİĞER';
        const itemRevenue = item.totalPrice || (item.unitPrice * item.quantity);

        totalRevenueSum += itemRevenue;
        totalItemsSum += item.quantity;

        const current = catMap.get(categoryName) || {
          category: categoryName,
          revenue: 0,
          quantity: 0,
          orderCount: 0,
          color: CATEGORY_COLORS[categoryName] || '#64748B',
        };

        current.revenue += itemRevenue;
        current.quantity += item.quantity;

        if (!seenCategoriesInOrder.has(categoryName)) {
          seenCategoriesInOrder.add(categoryName);
          current.orderCount += 1;
        }

        catMap.set(categoryName, current);
      });
    });

    const list: CategoryAnalyticsItem[] = Array.from(catMap.values())
      .map(c => ({
        ...c,
        percent: totalRevenueSum > 0 ? (c.revenue / totalRevenueSum) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      categories: list,
      totalRevenue: totalRevenueSum,
      totalItems: totalItemsSum,
    };
  }, [filteredOrders, productCategoryMap]);

  // Top Selling Individual Products
  const topSellingProducts = useMemo(() => {
    const prodMap = new Map<string, { productId: string; name: string; category: string; quantity: number; revenue: number }>();

    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const prodInfo = productCategoryMap.get(item.productId);
        const name = item.productName || prodInfo?.name || item.productId;
        const category = prodInfo?.category || 'DİĞER';
        const revenue = item.totalPrice || (item.unitPrice * item.quantity);

        const current = prodMap.get(item.productId) || {
          productId: item.productId,
          name,
          category,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity;
        current.revenue += revenue;
        prodMap.set(item.productId, current);
      });
    });

    return Array.from(prodMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders, productCategoryMap]);

  // Top Level KPIs
  const totalRevenue = categoryAnalyticsData.totalRevenue;
  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  
  const peakDay = useMemo(() => {
    if (dailyTrendData.length === 0) return null;
    return dailyTrendData.reduce((max, d) => d.revenue > max.revenue ? d : max, dailyTrendData[0]);
  }, [dailyTrendData]);

  const topCategory = categoryAnalyticsData.categories[0];

  // ----------------------------------------------------
  // D3 RENDERING: 30-Day Sales Trend Area & Line Chart
  // ----------------------------------------------------
  useEffect(() => {
    if (!trendChartRef.current || dailyTrendData.length === 0) return;

    const svg = d3.select(trendChartRef.current);
    svg.selectAll('*').remove();

    const containerWidth = trendChartRef.current.parentElement?.clientWidth || 700;
    const containerHeight = 280;

    const margin = { top: 20, right: 30, bottom: 40, left: 55 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Dates array for extent
    const dates = dailyTrendData.map(d => d.date);
    const dateMin = dates[0] || new Date();
    const dateMax = dates[dates.length - 1] || new Date();

    const xScale = d3
      .scaleTime()
      .domain([dateMin, dateMax])
      .range([0, width]);

    // Metric values for max
    const metricValues = dailyTrendData.map(d => {
      if (activeMetric === 'revenue') return d.revenue;
      if (activeMetric === 'orders') return d.orderCount;
      return d.itemCount;
    });
    const maxVal = Math.max(...metricValues, 10);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.15])
      .nice()
      .range([height, 0]);

    // Gradients & Defs
    const defs = svg.append('defs');

    // Area fill gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'salesTrendGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    if (activeMetric === 'revenue') {
      areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#2E5438').attr('stop-opacity', 0.45);
      areaGradient.append('stop').attr('offset', '70%').attr('stop-color', '#2E5438').attr('stop-opacity', 0.08);
      areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#2E5438').attr('stop-opacity', 0.0);
    } else if (activeMetric === 'orders') {
      areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.45);
      areaGradient.append('stop').attr('offset', '70%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.08);
      areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#8C4A32').attr('stop-opacity', 0.0);
    } else {
      areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#2563EB').attr('stop-opacity', 0.45);
      areaGradient.append('stop').attr('offset', '70%').attr('stop-color', '#2563EB').attr('stop-opacity', 0.08);
      areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#2563EB').attr('stop-opacity', 0.0);
    }

    // Grid lines (horizontal)
    g.append('g')
      .attr('class', 'grid-lines')
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .call(axisG => {
        axisG.select('.domain').remove();
        axisG.selectAll('.tick line')
          .attr('stroke', '#E7E0D4')
          .attr('stroke-dasharray', '3,3');
      });

    // D3 Area Generator
    const areaGenerator = d3
      .area<DailyTrendItem>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => {
        const val = activeMetric === 'revenue' ? d.revenue : activeMetric === 'orders' ? d.orderCount : d.itemCount;
        return yScale(val);
      });

    // D3 Line Generator
    const lineGenerator = d3
      .line<DailyTrendItem>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.date))
      .y(d => {
        const val = activeMetric === 'revenue' ? d.revenue : activeMetric === 'orders' ? d.orderCount : d.itemCount;
        return yScale(val);
      });

    // Draw Filled Area
    g.append('path')
      .datum(dailyTrendData)
      .attr('fill', 'url(#salesTrendGradient)')
      .attr('d', areaGenerator);

    // Draw Primary Stroke Line
    const strokeColor = activeMetric === 'revenue' ? '#2E5438' : activeMetric === 'orders' ? '#8C4A32' : '#2563EB';

    g.append('path')
      .datum(dailyTrendData)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGenerator);

    // Optional 7-Day Moving Average Smoothed Trend
    if (showMovingAverage && activeMetric === 'revenue') {
      const maLineGenerator = d3
        .line<DailyTrendItem>()
        .curve(d3.curveBasis)
        .x(d => xScale(d.date))
        .y(d => yScale(d.movingAverageRevenue));

      g.append('path')
        .datum(dailyTrendData)
        .attr('fill', 'none')
        .attr('stroke', '#D97706')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.85)
        .attr('d', maLineGenerator);
    }

    // X Axis
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(timeRange === '7d' ? d3.timeDay.every(1) : timeRange === '14d' ? d3.timeDay.every(2) : d3.timeDay.every(4))
      .tickFormat(d => (d as Date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(axisG => {
        axisG.select('.domain').attr('stroke', '#DDD5C7');
        axisG.selectAll('.tick line').attr('stroke', '#DDD5C7');
        axisG.selectAll('.tick text')
          .attr('fill', '#78716C')
          .attr('font-size', '10px')
          .attr('font-family', 'ui-monospace, monospace');
      });

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => {
        const num = d as number;
        if (activeMetric === 'revenue') {
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M ₺`;
          if (num >= 1000) return `${Math.round(num / 1000)}k ₺`;
          return `${num} ₺`;
        }
        return `${num}`;
      });

    g.append('g')
      .call(yAxis)
      .call(axisG => {
        axisG.select('.domain').remove();
        axisG.selectAll('.tick line').remove();
        axisG.selectAll('.tick text')
          .attr('fill', '#78716C')
          .attr('font-size', '10px')
          .attr('font-family', 'ui-monospace, monospace');
      });

    // Interactive Hover Elements (Crosshair & Focus Points)
    const focusGroup = g.append('g').style('display', 'none');

    // Vertical cursor line
    const cursorLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.7);

    // Active circle marker
    const focusCircle = focusGroup
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#FFFFFF')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2.5);

    // Overlay rect to capture mouse movements
    const bisectDate = d3.bisector<DailyTrendItem, Date>(d => d.date).center;

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseenter', () => focusGroup.style('display', null))
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setTrendTooltip(null);
      })
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const x0 = xScale.invert(mx);
        const index = bisectDate(dailyTrendData, x0);
        const d = dailyTrendData[index];
        if (!d) return;

        const xPos = xScale(d.date);
        const metricVal = activeMetric === 'revenue' ? d.revenue : activeMetric === 'orders' ? d.orderCount : d.itemCount;
        const yPos = yScale(metricVal);

        cursorLine.attr('x1', xPos).attr('x2', xPos);
        focusCircle.attr('cx', xPos).attr('cy', yPos);

        const svgRect = trendChartRef.current?.getBoundingClientRect();
        if (svgRect) {
          setTrendTooltip({
            visible: true,
            x: svgRect.left + margin.left + xPos,
            y: svgRect.top + margin.top + yPos,
            date: d.formattedDate,
            revenue: d.revenue,
            orderCount: d.orderCount,
            itemCount: d.itemCount,
            avgOrderValue: d.avgOrderValue,
          });
        }
      });

  }, [dailyTrendData, activeMetric, showMovingAverage, timeRange]);

  // ----------------------------------------------------
  // D3 RENDERING: Top Selling Categories Donut Chart
  // ----------------------------------------------------
  useEffect(() => {
    if (!donutChartRef.current || categoryAnalyticsData.categories.length === 0) return;

    const svg = d3.select(donutChartRef.current);
    svg.selectAll('*').remove();

    const size = 260;
    const radius = size / 2;
    const innerRadius = radius * 0.62;

    const g = svg
      .attr('viewBox', `0 0 ${size} ${size}`)
      .append('g')
      .attr('transform', `translate(${radius},${radius})`);

    const pie = d3
      .pie<CategoryAnalyticsItem>()
      .value(d => d.revenue)
      .sort(null)
      .padAngle(0.02);

    const arc = d3
      .arc<d3.PieArcDatum<CategoryAnalyticsItem>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 8)
      .cornerRadius(4);

    const hoverArc = d3
      .arc<d3.PieArcDatum<CategoryAnalyticsItem>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius)
      .cornerRadius(4);

    const arcs = g
      .selectAll('.arc')
      .data(pie(categoryAnalyticsData.categories))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'transform 0.2s, opacity 0.2s')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', hoverArc as any)
          .attr('opacity', 1);

        setDonutHovered({
          category: d.data.category,
          revenue: d.data.revenue,
          quantity: d.data.quantity,
          percent: d.data.percent,
          orderCount: d.data.orderCount,
        });
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arc as any)
          .attr('opacity', 1);

        setDonutHovered(null);
      })
      .on('click', (event, d) => {
        setSelectedCategory(prev => prev === d.data.category ? null : d.data.category);
      });

  }, [categoryAnalyticsData]);

  // ----------------------------------------------------
  // D3 RENDERING: Ranked Horizontal Category Bar Chart
  // ----------------------------------------------------
  useEffect(() => {
    if (!barChartRef.current || categoryAnalyticsData.categories.length === 0) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove();

    const topCategories = categoryAnalyticsData.categories.slice(0, 6);
    const containerWidth = barChartRef.current.parentElement?.clientWidth || 450;
    const barHeight = 28;
    const gap = 12;
    const height = topCategories.length * (barHeight + gap) + 20;

    const margin = { top: 10, right: 75, bottom: 10, left: 160 };
    const width = containerWidth - margin.left - margin.right;

    const g = svg
      .attr('viewBox', `0 0 ${containerWidth} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = Math.max(...topCategories.map(d => d.revenue), 1);

    const xScale = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(topCategories.map(d => d.category))
      .range([0, height - 20])
      .padding(0.25);

    // Background Bar Track
    g.selectAll('.bar-bg')
      .data(topCategories)
      .enter()
      .append('rect')
      .attr('class', 'bar-bg')
      .attr('y', (d: CategoryAnalyticsItem) => yScale(d.category) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', width)
      .attr('fill', '#F2EDE4')
      .attr('rx', 4);

    // Foreground Animated Active Bar
    g.selectAll('.bar-fill')
      .data(topCategories)
      .enter()
      .append('rect')
      .attr('class', 'bar-fill')
      .attr('y', (d: CategoryAnalyticsItem) => yScale(d.category) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', (d: CategoryAnalyticsItem) => xScale(d.revenue))
      .attr('fill', (d: CategoryAnalyticsItem) => d.color)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('click', (e: any, d: CategoryAnalyticsItem) => {
        setSelectedCategory(prev => prev === d.category ? null : d.category);
      });

    // Category Label Text on Left
    g.selectAll('.bar-label')
      .data(topCategories)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('y', (d: CategoryAnalyticsItem) => (yScale(d.category) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('x', -10)
      .attr('text-anchor', 'end')
      .attr('fill', '#44403C')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text((d: CategoryAnalyticsItem) => {
        return d.category.length > 20 ? d.category.slice(0, 18) + '...' : d.category;
      });

    // Revenue value text on Right
    g.selectAll('.bar-value')
      .data(topCategories)
      .enter()
      .append('text')
      .attr('class', 'bar-value')
      .attr('y', (d: CategoryAnalyticsItem) => (yScale(d.category) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('x', (d: CategoryAnalyticsItem) => xScale(d.revenue) + 8)
      .attr('fill', '#1C1917')
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', 'bold')
      .text((d: CategoryAnalyticsItem) => `${d.revenue.toLocaleString('tr-TR')} ₺`);

  }, [categoryAnalyticsData]);

  // CSV Report Exporter
  const handleExportCSV = () => {
    const rows = [
      ['Tarih', 'Gunluk Ciro (TL)', 'Siparis Adedi', 'Satilan Urun Adedi', 'Ortalama Sepet Tutari (TL)'],
      ...dailyTrendData.map(d => [
        d.dateKey,
        d.revenue,
        d.orderCount,
        d.itemCount,
        d.avgOrderValue
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tesisat_satis_trendi_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Interactive Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E0D4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-[#2E5438]/10 text-[#2E5438] border border-[#2E5438]/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
                <span>Satış Trendi & Kategori Analiz Paneli</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                  Canlı Analiz
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Son 30 günlük ciro trendleri, sipariş hacmi ve en çok satılan ürün kategorilerinin interaktif analizi
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Time Range, Status, Export */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Time Range Selector */}
          <div className="flex items-center bg-[#F2EDE4] p-1 rounded-xl border border-[#DDD5C7] text-xs">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === '7d' ? 'bg-[#2E5438] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Son 7 Gün
            </button>
            <button
              onClick={() => setTimeRange('14d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === '14d' ? 'bg-[#2E5438] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Son 14 Gün
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === '30d' ? 'bg-[#2E5438] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Son 30 Gün
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#DDD5C7] text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-stone-800 cursor-pointer text-xs"
            >
              <option value="all">Tüm Siparişler</option>
              <option value="valid_only">Yalnızca Geçerli (İptaller Hariç)</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Trend verilerini CSV formatında indir"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>CSV Dışa Aktar</span>
          </button>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-white hover:bg-stone-50 text-stone-600 border border-stone-300 rounded-xl transition-colors cursor-pointer"
              title="Grafikleri Yenile"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="p-4 bg-white rounded-2xl border border-[#E7E0D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">
              {timeRange === '7d' ? 'Son 7 Günlük' : timeRange === '14d' ? 'Son 14 Günlük' : 'Son 30 Günlük'} Toplam Ciro
            </span>
            <div className="p-2 rounded-xl bg-[#2E5438]/10 text-[#2E5438] border border-[#2E5438]/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {totalRevenue.toLocaleString('tr-TR')} ₺
          </div>
          <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#2E5438] font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Günlük ortalama: {Math.round(totalRevenue / (timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30)).toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>

        {/* Total Orders & AOV */}
        <div className="p-4 bg-white rounded-2xl border border-[#E7E0D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">Toplam Sipariş & Hacim</span>
            <div className="p-2 rounded-xl bg-[#8C4A32]/10 text-[#8C4A32] border border-[#8C4A32]/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {totalOrdersCount} Sipariş
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Ortalama Sepet Tutarı (AOV): <strong className="text-stone-800 font-mono">{avgOrderValue.toLocaleString('tr-TR')} ₺</strong>
          </div>
        </div>

        {/* Top Category */}
        <div className="p-4 bg-white rounded-2xl border border-[#E7E0D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">Lider Ürün Kategorisi</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-extrabold text-stone-900 mt-2 truncate" title={topCategory?.category}>
            {topCategory?.category || 'Kategori Yok'}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {topCategory ? `${topCategory.revenue.toLocaleString('tr-TR')} ₺ ciro (%${topCategory.percent.toFixed(1)} pay)` : '-'}
          </div>
        </div>

        {/* Peak Sales Day */}
        <div className="p-4 bg-white rounded-2xl border border-[#E7E0D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">En Yüksek Satış Yapılan Gün</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-stone-900 mt-2 font-mono">
            {peakDay ? peakDay.formattedDate : '-'}
          </div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1 font-mono">
            {peakDay ? `${peakDay.revenue.toLocaleString('tr-TR')} ₺ (${peakDay.orderCount} sipariş)` : '-'}
          </div>
        </div>

      </div>

      {/* D3 SALES TREND AREA & LINE CHART */}
      <div className="bg-white p-5 rounded-2xl border border-[#E7E0D4] shadow-xs space-y-4">
        
        {/* Chart Header & Metric Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EBE1] pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
              <span>Günlük Satış & Gelir Trend Grafiği (D3)</span>
              <span className="text-[11px] text-stone-400 font-normal">| İnteraktif Alan Eğrisi</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              İmleci grafiğin üzerine getirerek gün bazında detaylı ciro, sipariş ve sepet verilerini inceleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Metric Switcher */}
            <div className="flex items-center bg-[#F2EDE4] p-1 rounded-xl border border-[#DDD5C7] text-xs">
              <button
                onClick={() => setActiveMetric('revenue')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeMetric === 'revenue' ? 'bg-[#2E5438] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ciro (₺)
              </button>
              <button
                onClick={() => setActiveMetric('orders')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeMetric === 'orders' ? 'bg-[#8C4A32] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Sipariş Sayısı
              </button>
              <button
                onClick={() => setActiveMetric('items')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeMetric === 'items' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ürün Miktarı
              </button>
            </div>

            {/* 7-Day Moving Average Toggle */}
            {activeMetric === 'revenue' && (
              <label className="flex items-center space-x-1.5 text-xs text-stone-600 font-medium cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={showMovingAverage}
                  onChange={e => setShowMovingAverage(e.target.checked)}
                  className="rounded border-[#DDD5C7] text-[#2E5438] focus:ring-[#2E5438]"
                />
                <span className="flex items-center space-x-1">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block border-b border-dashed" />
                  <span>7 Günlük Trend Ort.</span>
                </span>
              </label>
            )}

          </div>
        </div>

        {/* SVG Render Container */}
        <div className="relative w-full overflow-hidden">
          <svg 
            ref={trendChartRef} 
            className="w-full h-auto"
            style={{ maxHeight: '300px' }}
          />

          {/* Floating Tooltip */}
          {trendTooltip && trendTooltip.visible && (
            <div 
              className="absolute z-20 pointer-events-none bg-stone-900/95 text-white text-xs p-3 rounded-xl shadow-xl border border-stone-700 backdrop-blur-xs transform -translate-x-1/2 -translate-y-full mb-3"
              style={{
                left: trendTooltip.x - (trendChartRef.current?.getBoundingClientRect().left || 0),
                top: trendTooltip.y - (trendChartRef.current?.getBoundingClientRect().top || 0),
              }}
            >
              <div className="font-bold border-b border-stone-700 pb-1 text-amber-300">
                📅 {trendTooltip.date}
              </div>
              <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between gap-4">
                  <span className="text-stone-400">Toplam Ciro:</span>
                  <span className="font-bold text-emerald-400">{trendTooltip.revenue.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-stone-400">Sipariş Sayısı:</span>
                  <span className="font-bold text-stone-200">{trendTooltip.orderCount} Sipariş</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-stone-400">Satılan Ürün:</span>
                  <span className="font-bold text-stone-200">{trendTooltip.itemCount} Adet/Mt</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-stone-400">Ortalama Sepet:</span>
                  <span className="font-bold text-amber-300">{trendTooltip.avgOrderValue.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trend Legend / Footnote */}
        <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 pt-2 border-t border-[#F0EBE1]">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className={`w-3 h-3 rounded-full ${
                activeMetric === 'revenue' ? 'bg-[#2E5438]' : activeMetric === 'orders' ? 'bg-[#8C4A32]' : 'bg-[#2563EB]'
              }`} />
              <span className="font-semibold text-stone-700">
                {activeMetric === 'revenue' ? 'Günlük Net Ciro' : activeMetric === 'orders' ? 'Günlük Sipariş Adedi' : 'Satılan Ürün Miktarı'}
              </span>
            </span>
            {showMovingAverage && activeMetric === 'revenue' && (
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-amber-500 border-b border-dashed" />
                <span className="text-stone-600">7 Günlük Hareketli Ortalama</span>
              </span>
            )}
          </div>

          <span className="text-[11px] text-stone-400">
            * Siparişler ve kabul edilen teklifler otomatik dahil edilir
          </span>
        </div>

      </div>

      {/* TWO-COLUMN SECTION: D3 Category Donut Chart & Ranked Bar Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (5 cols): D3 Donut Chart with Hover Arc Interaction */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#E7E0D4] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                  <PieChartIcon className="w-4 h-4 text-[#8C4A32]" />
                  <span>Kategori Satış Dağılımı (D3 Donut)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ciro paylarına göre kategori oranları
                </p>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-rose-700 hover:underline font-bold cursor-pointer"
                >
                  Filtreyi Sıfırla ✕
                </button>
              )}
            </div>

            {/* Donut Render Area with Center Dynamic Stats */}
            <div className="relative flex items-center justify-center my-4">
              <svg ref={donutChartRef} className="w-[260px] h-[260px]" />
              
              {/* Dynamic Center Badge on Hover */}
              <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center px-4 max-w-[140px]">
                {donutHovered ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-stone-500 truncate w-full">
                      {donutHovered.category}
                    </span>
                    <span className="text-sm font-black text-stone-900 font-mono mt-0.5">
                      {donutHovered.revenue.toLocaleString('tr-TR')} ₺
                    </span>
                    <span className="text-[11px] font-bold text-[#2E5438]">
                      %{donutHovered.percent.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase font-bold text-stone-400">
                      Toplam Ciro
                    </span>
                    <span className="text-sm font-black text-stone-900 font-mono mt-0.5">
                      {totalRevenue.toLocaleString('tr-TR')} ₺
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {categoryAnalyticsData.categories.length} Kategori
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pt-2 border-t border-[#F0EBE1]">
            {categoryAnalyticsData.categories.map(cat => {
              const isSelected = selectedCategory === cat.category;
              return (
                <div
                  key={cat.category}
                  onClick={() => setSelectedCategory(prev => prev === cat.category ? null : cat.category)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-amber-100/70 border border-amber-300' : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-stone-800 truncate">{cat.category}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 font-mono text-[11px]">
                    <span className="text-stone-500">%{cat.percent.toFixed(1)}</span>
                    <strong className="text-stone-900">{cat.revenue.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (7 cols): D3 Ranked Category Bar Chart & Top Products Leaderboard */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Ranked Horizontal Bar Chart (D3) */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D4] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-[#2E5438]" />
                  <span>En Çok Ciro Getiren Kategoriler (D3 Sıralı Bar)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Kategori bazında toplam ciro karşılaştırması
                </p>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {timeRange.toUpperCase()}
              </span>
            </div>

            {/* SVG Horizontal Bar Chart */}
            <div className="w-full overflow-x-auto">
              <svg ref={barChartRef} className="w-full h-auto" />
            </div>
          </div>

          {/* Top 5 Best Selling Products Leaderboard */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E0D4] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    En Çok Satılan Ürünler Liderlik Tablosu
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Bu periyotta en yüksek adet ve ciroya ulaşan ilk 5 ürün
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#F0EBE1]">
              {topSellingProducts.map((prod, idx) => (
                <div key={prod.productId} className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#FAF8F5] px-2 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-amber-950 font-black' :
                      idx === 1 ? 'bg-stone-300 text-stone-800' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 truncate max-w-[280px]">
                        {prod.name}
                      </h4>
                      <span className="text-[10px] text-stone-500">
                        {prod.category} • {prod.productId}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-stone-900">
                      {prod.revenue.toLocaleString('tr-TR')} ₺
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {prod.quantity} Adet Satıldı
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
