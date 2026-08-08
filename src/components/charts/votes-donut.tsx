"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { buildDonutSegments } from "./chart-data";
import type { ChartItem } from "./chart-data";

interface Props {
  items: ChartItem[];
}

export function VotesDonut({ items }: Props) {
  const data = buildDonutSegments(items, 6);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart width={500} height={260} accessibilityLayer={false}>
        <Pie
          data={data}
          dataKey="votos"
          nameKey="nombre"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          isAnimationActive={false}
          rootTabIndex={-1}
        >
          {data.map((s) => (
            <Cell key={s.nombre} fill={s.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
