"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfYear, isAfter, isBefore, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [range, setRange] = useState("all_time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filteredData = useMemo(() => {
    let filtered = [...data];
    const now = new Date();

    if (range === "last_7_days") {
      const threshold = subDays(now, 7);
      filtered = filtered.filter(d => isAfter(new Date(d.submitted_at), threshold));
    } else if (range === "last_30_days") {
      const threshold = subDays(now, 30);
      filtered = filtered.filter(d => isAfter(new Date(d.submitted_at), threshold));
    } else if (range === "this_year") {
      const threshold = startOfYear(now);
      filtered = filtered.filter(d => isAfter(new Date(d.submitted_at), threshold));
    } else if (range === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      // set end of day for the end date
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => {
        const date = new Date(d.submitted_at);
        return isAfter(date, start) && isBefore(date, end);
      });
    }

    return filtered.map(sub => ({
      ...sub,
      dateFormatted: format(new Date(sub.submitted_at), "MMM dd, yyyy"),
    }));
  }, [data, range, customStart, customEnd]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end print:hidden">
        <div className="space-y-1.5 w-[200px]">
          <Label>Time Range</Label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} >
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {range === "custom" && (
          <div className="flex gap-2 items-center">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={customStart} 
                onChange={e => setCustomStart(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={customEnd} 
                onChange={e => setCustomEnd(e.target.value)} 
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-[300px] mt-4 print:h-[250px] print:mt-0">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
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
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground border rounded-md border-dashed">
            No submissions found in this time range.
          </div>
        )}
      </div>
    </div>
  );
}
