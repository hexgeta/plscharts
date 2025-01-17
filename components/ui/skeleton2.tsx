import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'chart' | 'table';
  children?: React.ReactNode;
}

export function Skeleton({ className, variant = 'text', children, ...props }: SkeletonProps) {
  if (variant === 'chart') {
    return (
      <div
        className={cn(
          "skeleton absolute inset-0 rounded-[15px]",
          className
        )}
        {...props}
      />
    )
  }

  if (variant === 'table') {
    return (
      <div
        className={cn(
          "skeleton w-full h-[600px] rounded-lg border border-[#333]",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div className="relative inline-block">
      <span className="invisible">{children}</span>
      <div
        className={cn(
          "skeleton absolute inset-0 rounded-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}
