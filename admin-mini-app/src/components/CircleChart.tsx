import { useState } from "react";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

interface CircleChartProps {
  title: string;
  subtitle?: string;
  segments: ChartSegment[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
}

export function CircleChart({
  title,
  subtitle,
  segments,
  centerValue,
  centerLabel,
  size = 190,
  strokeWidth = 22,
}: CircleChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;
  const renderedSlices = segments
    .filter((s) => s.value > 0)
    .map((s, idx) => {
      const percent = total > 0 ? s.value / total : 0;
      const strokeLength = circumference * percent;
      const strokeOffset = circumference * (1 - accumulatedPercent);
      accumulatedPercent += percent;

      return {
        ...s,
        index: idx,
        percent: Math.round(percent * 100),
        strokeLength,
        strokeOffset,
      };
    });

  const activeSegment = hoveredIdx !== null ? segments[hoveredIdx] : null;

  return (
    <div className="circle-chart-card">
      <div className="circle-chart-header">
        <h3 className="circle-chart-title">{title}</h3>
        {subtitle && <p className="circle-chart-subtitle">{subtitle}</p>}
      </div>

      <div className="circle-chart-body">
        <div className="circle-chart-graphic-wrap" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="circle-chart-svg"
          >
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />

            {/* Empty state dotted ring */}
            {total === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            ) : (
              renderedSlices.map((slice) => {
                const isHovered = hoveredIdx === slice.index;
                return (
                  <circle
                    key={slice.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                    strokeDashoffset={slice.strokeOffset}
                    transform={`rotate(-90 ${center} ${center})`}
                    style={{
                      transition: "stroke-width 0.2s ease, filter 0.2s ease",
                      cursor: "pointer",
                      filter: isHovered
                        ? `drop-shadow(0 0 10px ${slice.color})`
                        : "none",
                    }}
                    onMouseEnter={() => setHoveredIdx(slice.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Info Label */}
          <div className="circle-chart-center-info">
            {activeSegment ? (
              <>
                <span className="circle-chart-center-val" style={{ color: activeSegment.color }}>
                  {activeSegment.value.toLocaleString()}
                </span>
                <span className="circle-chart-center-lbl">
                  {total > 0 ? `${Math.round((activeSegment.value / total) * 100)}%` : ""} {activeSegment.label}
                </span>
              </>
            ) : (
              <>
                <span className="circle-chart-center-val">
                  {centerValue !== undefined ? centerValue.toLocaleString() : total.toLocaleString()}
                </span>
                <span className="circle-chart-center-lbl">{centerLabel || "Total"}</span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="circle-chart-legend">
          {segments.map((seg, idx) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={seg.label}
                className={`circle-chart-legend-item ${isHovered ? "active" : ""}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="circle-chart-legend-left">
                  <span
                    className="circle-chart-legend-dot"
                    style={{
                      backgroundColor: seg.color,
                      boxShadow: isHovered ? `0 0 10px ${seg.color}` : "none",
                    }}
                  />
                  <span className="circle-chart-legend-name">
                    {seg.icon && <span style={{ marginRight: 4 }}>{seg.icon}</span>}
                    {seg.label}
                  </span>
                </div>
                <div className="circle-chart-legend-right">
                  <span className="circle-chart-legend-val">{seg.value.toLocaleString()}</span>
                  <span className="circle-chart-legend-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
