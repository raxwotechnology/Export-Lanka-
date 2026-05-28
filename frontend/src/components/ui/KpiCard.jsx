import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

export default function KpiCard({
    label, value, icon: Icon, iconColor = 'text-primary-600', iconBg = 'bg-primary-50',
    trend = null, subtext = null, onClick = null,
}) {
    const hasTrend = trend !== null && trend !== undefined;
    const trendUp = hasTrend && trend >= 0;

    return (
        <Card
            className={`p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                    {hasTrend && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(trend)}% {trendUp ? 'up' : 'down'} vs last period
                        </p>
                    )}
                    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
                </div>
                {Icon && (
                    <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} />
                    </div>
                )}
            </div>
        </Card>
    );
}