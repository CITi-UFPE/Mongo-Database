import * as React from "react"

import { cn } from "@/lib/utils"


export default function IndicatorRow({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
                className
            )}
            {...props}
        />
    )
}