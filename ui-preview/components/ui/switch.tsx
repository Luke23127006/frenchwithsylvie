"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Đã xóa border-2 để giải phóng không gian bên trong, loại bỏ hoàn toàn cảm giác lệch/tràn viền
        "peer inline-flex shrink-0 items-center rounded-full outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        // Kích thước thu gọn (Width: 40px, Height: 24px)
        "h-6 w-10",
        
        // SỬ DỤNG MÀU CỦA THEME HIỆN TẠI
        "data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        "data-[state=checked]:bg-primary",
        
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform",
          
          // Kích thước cục Thumb (20x20) - đảm bảo luôn nhỏ hơn chiều cao khung 4px
          "h-5 w-5",
          
          // TOÁN HỌC CHUẨN XÁC: Tạo khoảng trống viền 2px đều ở mọi góc
          // Trạng thái Tắt: cách lề trái 2px
          "data-[state=unchecked]:translate-x-[2px]",
          
          // Trạng thái Bật: Chiều rộng tổng (40) - Thumb (20) - Lề phải (2) = 18px
          "data-[state=checked]:translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }