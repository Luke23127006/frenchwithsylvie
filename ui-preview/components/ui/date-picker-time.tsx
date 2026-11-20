"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerTimeProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function DatePickerTime({ value, onChange, disabled }: DatePickerTimeProps) {
  const [open, setOpen] = React.useState(false)

  // Parse initial value
  const initialDate = value ? new Date(value) : undefined;
  // Handle case where value might be YYYY-MM-DDTHH:mm or just YYYY-MM-DD
  const initialTimeStr = value && value.includes('T') ? value.split('T')[1].slice(0, 5) : "10:30";

  const [date, setDate] = React.useState<Date | undefined>(initialDate)
  const [time, setTime] = React.useState(initialTimeStr)

  React.useEffect(() => {
    if (date && onChange) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      
      // Ensure time string has at least HH:mm format
      const finalTime = time || "00:00";
      onChange(`${dateStr}T${finalTime}`);
    }
  }, [date, time, onChange])

  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="date-picker-optional">Date</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker-optional"
              className="w-48 justify-between font-normal"
              disabled={disabled}
            >
              {date ? format(date, "PPP") : "Select date"}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate)
                  setOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 w-32">
        <Label htmlFor="time-picker-optional">Time</Label>
        <Input
          type="time"
          id="time-picker-optional"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
