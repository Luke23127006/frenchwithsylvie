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
import { DatePicker } from "@/components/ui/date-picker";

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
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

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
      // Create copies to avoid mutating state
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999); // Include the whole end day

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

  const gradedData = filteredData.filter(d => d.numeric_grade !== null);
  const averageScore = gradedData.length > 0 
    ? gradedData.reduce((acc, curr) => acc + curr.numeric_grade!, 0) / gradedData.length 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1.5 w-[200px]">
            <Label>Time Range</Label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4}>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {range === "custom" && (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="p-2 border rounded-md bg-muted/10 relative">
                <span className="absolute -top-2.5 left-2 bg-card px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Start</span>
                <DatePicker 
                  date={customStart} 
                  setDate={setCustomStart} 
                />
              </div>
              <div className="p-2 border rounded-md bg-muted/10 relative">
                <span className="absolute -top-2.5 left-2 bg-card px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">End</span>
                <DatePicker 
                  date={customEnd} 
                  setDate={setCustomEnd} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-right pb-1">
          <p className="text-sm text-muted-foreground">Range Average</p>
          <p className="text-2xl font-bold text-primary">
            {gradedData.length > 0 ? averageScore.toFixed(2) : 'N/A'}
          </p>
        </div>
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
