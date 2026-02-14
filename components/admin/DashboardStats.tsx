'use client';

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { Users, Calendar, CheckCircle, Clock } from 'lucide-react';
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
  draftShifts: number;
  publishedShifts: number;
  totalHours: number;
}

const StatHeader = ({ icon, gradient, value }: { icon: React.ReactNode; gradient: string; value: string | number }) => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
    <div className="flex items-center justify-between w-full p-4">
      <motion.div 
        className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className="text-white">
          {icon}
        </div>
      </motion.div>
      <motion.div 
        className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {value}
      </motion.div>
    </div>
  </div>
);

export function DashboardStats({ totalWorkers, draftShifts, publishedShifts, totalHours }: DashboardStatsProps) {
  const stats: StatCard[] = [
    {
      title: 'Total Workers',
      value: totalWorkers,
      icon: <Users className="w-8 h-8" />,
      gradient: 'from-blue-500 to-cyan-500',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Draft Shifts',
      value: draftShifts,
      icon: <Clock className="w-8 h-8" />,
      gradient: 'from-amber-500 to-orange-500',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Published Shifts',
      value: publishedShifts,
      icon: <CheckCircle className="w-8 h-8" />,
      gradient: 'from-green-500 to-emerald-500',
      iconColor: 'text-green-600',
    },
    {
      title: 'Total Hours',
      value: totalHours.toFixed(1),
      icon: <Calendar className="w-8 h-8" />,
      gradient: 'from-purple-500 to-pink-500',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <BentoGridItem
            title={stat.title}
            description={`${stat.title === 'Total Hours' ? 'hours scheduled this week' : 'in the system'}`}
            header={<StatHeader icon={stat.icon} gradient={stat.gradient} value={stat.value} />}
            className="hover:scale-105 transition-transform duration-200"
          />
        </motion.div>
      ))}
    </div>
  );
}
