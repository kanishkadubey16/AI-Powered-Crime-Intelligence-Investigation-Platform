import { cn } from "../../utils/cn";
import { capitalize } from "../../utils/formatters";

const Badge = ({ label, className }) => (
  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>
    {capitalize(label)}
  </span>
);

export default Badge;
