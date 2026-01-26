'use client';

interface MetricCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  color?: 'blue' | 'green' | 'purple';
}

export default function MetricCard({
  title,
  value,
  subValue,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <div
      className={`p-6 rounded-lg border ${colorClasses[color]} transition-transform hover:scale-105`}
    >
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${textColorClasses[color]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}
