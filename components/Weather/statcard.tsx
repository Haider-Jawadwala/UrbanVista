import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ArrowUp, ArrowDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon }) => {
  const isPositive = change > 0;
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} flex items-center`}>
          {isPositive ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
          {Math.abs(change)}%
        </p>
      </CardContent>
    </Card>
  );
};

export default StatCard;