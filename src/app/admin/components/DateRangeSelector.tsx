'use client';

// 로컬 타임존 기준 날짜 포맷 (KST)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DateRangeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateRangeSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeSelectorProps) {
  const today = formatLocalDate(new Date());

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
          시작일
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          max={endDate || today}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <span className="text-gray-500">~</span>
      <div className="flex items-center gap-2">
        <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
          종료일
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          min={startDate}
          max={today}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
