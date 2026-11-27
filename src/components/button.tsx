import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Button({ asChild, className, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn("button", className)} {...props}/>;
}
