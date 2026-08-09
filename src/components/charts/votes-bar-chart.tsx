"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import type { ChartItem } from "./chart-data";

interface Props {
  items: ChartItem[];
}

export function VotesBarChart({ items }: Props) {
  const data = [...items].sort((a, b) => b.votos - a.votos);
  const height = Math.max(260, data.length * 30);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        width={600}
        height={height}
        layout="vertical"
        data={data}
        accessibilityLayer={false}
        margin={{ top: 0, right: 52, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nombre"
          width={0}
          tick={false}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="votos" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.nombre} fill={d.color} />
          ))}
          <LabelList
            dataKey="votos"
            position="right"
            fill="#161a22"
            formatter={(value) => formatNumber(Number(value))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
