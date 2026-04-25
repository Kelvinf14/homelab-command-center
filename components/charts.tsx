"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 8,
  color: "#f8fafc"
};

export function ResourceChart({ data }: { data: { time: string; cpu: number; ram: number; disk: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
        <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="cpu" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.18} />
        <Area type="monotone" dataKey="ram" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.12} />
        <Area type="monotone" dataKey="disk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpeedChart({ data }: { data: { time: string; download: number; upload: number; ping: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
        <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="download" stroke="#2dd4bf" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="upload" stroke="#38bdf8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="ping" stroke="#f97316" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PipelineChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
        <XAxis dataKey="stage" stroke="#94a3b8" tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#2dd4bf" />
      </BarChart>
    </ResponsiveContainer>
  );
}
