/**
 * DateSeparator 组件 - 日期分隔符
 * 使用 React.memo 优化性能
 */

import { memo } from "react";

interface DateSeparatorProps {
  dateString: string;
}

const DateSeparator = memo(({ dateString }: DateSeparatorProps) => {
  return (
    <div className="flex justify-center mb-3">
      <div className="bg-black/20 rounded-full px-2 py-0 flex items-center justify-center">
        <span className="font-['Source_Han_Sans_CN_VF:Light',sans-serif] text-[11px] text-white">
          {dateString}
        </span>
      </div>
    </div>
  );
});

DateSeparator.displayName = 'DateSeparator';

export default DateSeparator;
