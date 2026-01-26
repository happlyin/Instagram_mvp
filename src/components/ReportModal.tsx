'use client';

import { useState } from 'react';

const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate_content', label: '부적절한 콘텐츠' },
  { value: 'hate_speech', label: '혐오 발언' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ReportModal({
  isOpen,
  onClose,
  onReport,
  isLoading = false,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('신고 사유를 선택해주세요.');
      return;
    }

    setError('');
    try {
      await onReport(selectedReason);
      setSelectedReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || '신고에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          게시물 신고
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="space-y-3 mb-6">
          {REPORT_REASONS.map((reason) => (
            <label
              key={reason.value}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedReason === reason.value
                  ? 'border-instagram-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="reportReason"
                value={reason.value}
                checked={selectedReason === reason.value}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3 text-instagram-blue focus:ring-instagram-blue"
              />
              <span className="text-gray-700">{reason.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedReason}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '신고 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
