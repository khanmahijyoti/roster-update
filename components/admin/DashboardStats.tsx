'use client';

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { Users, Store } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
}

interface DashboardStatsProps {
  totalWorkers: number;
  totalRestaurants: number;
}

const StatHeader = ({ icon, gradient, value }: { icon: React.ReactNode; gradient: string; value: string | number }) => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
    <div className="flex items-center justify-between w-full p-4">
      <motion.div 
        className={`p-4 rounded-2xl ${gradient} shadow-lg`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className="text-primary-foreground">
          {icon}
        </div>
      </motion.div>
      <motion.div 
        className="text-5xl font-bold text-primary"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {value}
      </motion.div>
    </div>
  </div>
);

export function DashboardStats({ totalWorkers, totalRestaurants }: DashboardStatsProps) {
  const stats: StatCard[] = [
    {
      title: 'Total Workers',
      value: totalWorkers,
      icon: <Users className="w-8 h-8" />,
      gradient: 'bg-chart-1',
      iconColor: 'text-chart-1',
    },
    {
      title: 'Total Restaurants',
      value: totalRestaurants,
      icon: <Store className="w-8 h-8" />,
      gradient: 'bg-primary',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <BentoGridItem
            title={stat.title}
            description="in the system"
            header={<StatHeader icon={stat.icon} gradient={stat.gradient} value={stat.value} />}
            className="hover:scale-105 transition-transform duration-200"
          />
        </motion.div>
      ))}
    </div>
  );
}
