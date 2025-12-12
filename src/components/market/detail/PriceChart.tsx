"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, LineData, Time, LineSeries } from "lightweight-charts";

type TimeRange = "1H" | "6H" | "1D" | "1W" | "1M" | "ALL";

interface PricePoint {
  time: number;
  yesPrice: number;
  noPrice: number;
}

interface PriceChartProps {
  data: PricePoint[];
  yesLabel?: string;
  noLabel?: string;
  onTimeRangeChange?: (range: TimeRange) => void;
}

// Time range durations in milliseconds
const TIME_RANGES: Record<TimeRange, number> = {
  "1H": 60 * 60 * 1000,
  "6H": 6 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "ALL": Infinity,
};

export default function PriceChart({
  data,
  yesLabel = "Yes",
  noLabel = "No",
  onTimeRangeChange,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const noSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");
  const [currentPrices, setCurrentPrices] = useState({ yes: 50, no: 50 });

  const timeRanges: TimeRange[] = ["1H", "6H", "1D", "1W", "1M", "ALL"];

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const now = Date.now();
    const duration = TIME_RANGES[timeRange];

    if (duration === Infinity) {
      return data;
    }

    const cutoffTime = now - duration;
    return data.filter(point => point.time >= cutoffTime);
  }, [data, timeRange]);

  // Get current prices from data
  useEffect(() => {
    if (data && data.length > 0) {
      const lastPoint = data[data.length - 1];
      setCurrentPrices({
        yes: lastPoint.yesPrice,
        no: lastPoint.noPrice,
      });
    }
  }, [data]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#f3f4f6", style: 2 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: {
          width: 1,
          color: "#9ca3af",
          style: 2,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // Create YES series (green line)
    const yesSeries = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBackgroundColor: "#22c55e",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    yesSeriesRef.current = yesSeries;

    // Create NO series (red line)
    const noSeries = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBackgroundColor: "#ef4444",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    noSeriesRef.current = noSeries;

    // Handle crosshair move to update prices
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData) {
        const yesData = param.seriesData.get(yesSeries);
        const noData = param.seriesData.get(noSeries);
        if (yesData && "value" in yesData) {
          setCurrentPrices(prev => ({
            ...prev,
            yes: Math.round(yesData.value),
          }));
        }
        if (noData && "value" in noData) {
          setCurrentPrices(prev => ({
            ...prev,
            no: Math.round(noData.value),
          }));
        }
      } else if (data && data.length > 0) {
        const lastPoint = data[data.length - 1];
        setCurrentPrices({
          yes: lastPoint.yesPrice,
          no: lastPoint.noPrice,
        });
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      yesSeriesRef.current = null;
      noSeriesRef.current = null;
    };
  }, []);

  // Update data when filtered data changes
  useEffect(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current || !filteredData || filteredData.length === 0) return;

    // Sort and dedupe data
    const sortedData = [...filteredData]
      .sort((a, b) => a.time - b.time)
      .filter((point, index, arr) =>
        index === 0 || point.time > arr[index - 1].time
      );

    if (sortedData.length < 2) return;

    // Convert to TradingView format
    const yesData: LineData[] = sortedData.map((point) => ({
      time: Math.floor(point.time / 1000) as Time,
      value: point.yesPrice,
    }));

    const noData: LineData[] = sortedData.map((point) => ({
      time: Math.floor(point.time / 1000) as Time,
      value: point.noPrice,
    }));

    try {
      yesSeriesRef.current.setData(yesData);
      noSeriesRef.current.setData(noData);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
    }
  }, [filteredData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  };

  return (
    <div className="card p-3 md:p-5">
      {/* Price Labels - Polymarket style */}
      <div className="flex justify-end gap-4 md:gap-8 mb-2">
        <div className="text-right">
          <div className="text-xs md:text-sm text-[var(--gray-500)]">{yesLabel}</div>
          <div className="text-xl md:text-2xl font-bold text-[#22c55e]">{currentPrices.yes}%</div>
        </div>
        <div className="text-right">
          <div className="text-xs md:text-sm text-[var(--gray-500)]">{noLabel}</div>
          <div className="text-xl md:text-2xl font-bold text-[#ef4444]">{currentPrices.no}%</div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Time Range Tabs - Polymarket style */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex gap-0.5 md:gap-1 bg-[var(--gray-100)] p-0.5 md:p-1 rounded-lg overflow-x-auto scrollbar-hide">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-colors whitespace-nowrap ${
                timeRange === range
                  ? "bg-white text-[var(--foreground)] shadow-sm"
                  : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart Controls - Hidden on mobile */}
        <div className="hidden md:flex gap-1">
          <button className="p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--gray-400)]" title="Export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--gray-100)] text-[var(--gray-400)]" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
