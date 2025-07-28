import {
  X,
  Edit,
  Trash2,
  TrendingUp,
  Copy,
  ChevronDown,
  Save,
  CircleDollarSign,
  Home,
  PieChart,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Info,
  Globe,
  MessageCircle,
  Send,
  Users,
  Check,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'

// Centralized icon exports with consistent interface
export const Icons = {
  // Portfolio icons
  close: X,
  edit: Edit,
  trash: Trash2,
  trending: TrendingUp,
  copy: Copy,
  chevronDown: ChevronDown,
  save: Save,
  check: Check,
  
  // UI icons
  dollarSign: CircleDollarSign,
  home: Home,
  portfolio: PieChart,
  search: Search,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  calendar: CalendarIcon,
  
  // Validator icons
  info: Info,
  globe: Globe,
  message: MessageCircle,
  send: Send,
  users: Users,
  externalLink: ExternalLink,
} as const

// Type for icon names
export type IconName = keyof typeof Icons

// Icon component with caching
export interface IconProps {
  name: IconName
  className?: string
  size?: number
  color?: string
  strokeWidth?: number
}

// Memoized icon component to prevent re-renders
import { memo } from 'react'

export const Icon = memo<IconProps>(({ name, ...props }) => {
  const IconComponent = Icons[name]
  return <IconComponent {...props} />
})

Icon.displayName = 'Icon'

// Export individual icons for direct usage (tree-shaking friendly)
export {
  X,
  Edit,
  Trash2,
  TrendingUp,
  Copy,
  ChevronDown,
  Save,
  CircleDollarSign,
  Home,
  PieChart,
  Search,
  ChevronRight,
  ChevronLeft,
  CalendarIcon,
  Info,
  Globe,
  MessageCircle,
  Send,
  Users,
  Check,
  ExternalLink,
  type LucideIcon,
} 