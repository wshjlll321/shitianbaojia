"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatusBarPoint, WeeklyQuotePoint } from "@/lib/salesDashboardChartData";

const CHART_H = 280;

const tooltipStyle = {
  backgroundColor: "var(--color-bg-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-text-primary)",
  fontSize: "12px",
};

export type DashboardChartsProps = {
  weeklyTrend: WeeklyQuotePoint[];
  statusBars: StatusBarPoint[];
};

export default function DashboardCharts({ weeklyTrend, statusBars }: DashboardChartsProps) {
  const totalQuotes = statusBars.reduce((s, b) => s + b.count, 0);

  if (totalQuotes === 0) {
    return (
      <div className="card" style={{ padding: "24px" }}>
        <div className="card-title" style={{ marginBottom: "8px" }}>
          报价趋势与状态
        </div>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          暂无报价数据。创建第一份报价并发送给客户后，这里会显示<strong>近 8 周新建节奏</strong>与<strong>当前状态分布</strong>。
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "24px",
      }}
    >
      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-header">
          <div className="card-title">近 8 周 · 新建报价数</div>
        </div>
        <p
          style={{
            margin: "0 0 12px",
            padding: "0 20px",
            fontSize: "0.78rem",
            color: "var(--color-text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          按创建时间统计每周新建单量，便于看业务节奏。
        </p>
        <div style={{ width: "100%", height: CHART_H, minHeight: CHART_H, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart data={weeklyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                width={36}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-bg-elevated)", opacity: 0.35 }}
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v ?? 0} 单`, "新建"]}
                labelFormatter={(l) => `周起 ${l}`}
              />
              <Bar dataKey="count" name="新建" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {weeklyTrend.map((_, i) => (
                  <Cell key={`w-${i}`} fill="var(--color-primary-400)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-header">
          <div className="card-title">当前状态分布</div>
        </div>
        <p
          style={{
            margin: "0 0 12px",
            padding: "0 20px",
            fontSize: "0.78rem",
            color: "var(--color-text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          库内当前快照（未过期的「已发送 / 已查看」与客户打开记录一致；过期后会归入已过期）。
        </p>
        <div style={{ width: "100%", height: CHART_H, minHeight: CHART_H, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart
              layout="vertical"
              data={statusBars}
              margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-bg-elevated)", opacity: 0.35 }}
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v ?? 0} 单`, "数量"]}
              />
              <Bar dataKey="count" name="报价单数" radius={[0, 4, 4, 0]} barSize={22}>
                {statusBars.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
