"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { format } from "date-fns";

interface SubmissionData {
  id: string;
  assignment_title: string;
  submitted_at: string;
  numeric_grade: number | null;
}

interface GradeTrendChartProps {
  data: SubmissionData[];
}

export default function GradeTrendChart({ data }: GradeTrendChartProps) {
  // Format data for chart
  const chartData = data.map(sub => ({
    ...sub,
    dateFormatted: format(new Date(sub.submitted_at), "MMM dd, yyyy"),
  }));

  return (
    <div className="w-full h-[300px] mt-4 print:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="dateFormatted" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
            formatter={(value: any, name: any, props: any) => [
              value === null ? 'Not Graded' : `${value}/100`, 
              props.payload.assignment_title
            ]}
          />
          {/* Edge Case Fix: connectNulls={true} ensures continuity over ungraded assignments */}
          <Line
            type="monotone"
            dataKey="numeric_grade"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6 }}
            connectNulls={true} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
