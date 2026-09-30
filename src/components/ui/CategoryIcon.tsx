import React from 'react';
import {
  Briefcase,
  Bike,
  Wallet,
  Home,
  ShoppingBag,
  Coffee,
  Fuel,
  Zap,
  Flame,
  Wifi,
  HeartPulse,
  Utensils,
  ShoppingCart,
  Film,
  Wrench,
  MoreHorizontal,
  Percent,
  AlertCircle,
  CreditCard,
  Layers,
  ArrowRightLeft,
  CircleDollarSign,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Bike,
  Wallet,
  Home,
  ShoppingBag,
  Coffee,
  Fuel,
  Zap,
  Flame,
  Wifi,
  HeartPulse,
  Utensils,
  ShoppingCart,
  Film,
  Wrench,
  MoreHorizontal,
  Percent,
  AlertCircle,
  CreditCard,
  Layers,
  ArrowRightLeft,
  CircleDollarSign,
};

export const CategoryIcon: React.FC<{
  name?: string;
  className?: string;
}> = ({ name = 'CircleDollarSign', className = 'w-4 h-4' }) => {
  const IconComponent = iconMap[name] || CircleDollarSign;
  return <IconComponent className={className} />;
};
