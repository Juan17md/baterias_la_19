import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground dark:bg-muted/60",
        primary: "bg-primary/10 text-primary dark:bg-primary/15",
        success: "bg-success/10 text-success-text dark:bg-success/15",
        warning: "bg-warning/10 text-warning-text dark:bg-warning/15",
        destructive:
          "bg-destructive/10 text-destructive-text dark:bg-destructive/15",
        info: "bg-info/10 text-info dark:bg-info/15",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
