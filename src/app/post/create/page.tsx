'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  orderIndex: number;
}

interface Caption {
  id: string;
  text: string;
  orderIndex: number;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
}

const API_BASE_URL = 'http://localhost:4000/api';
const MAX_IMAGES = 9;

export default function CreatePostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([
    { id: crypto.randomUUID(), text: '', orderIndex: 0, isBold: false, isItalic: false, fontSize: 14 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // 인증 확인
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      router.push('/');
    }
  }, [router]);

  // Access Token 갱신 함수
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setError(`최대 ${MAX_IMAGES}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    const newImages: ImageFile[] = [];
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      newImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        orderIndex: images.length + index,
      });
    });

    setImages((prev) => [...prev, ...newImages]);
    setError(null);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images.length]);

  // 이미지 삭제
  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // 순서 재정렬
      return filtered.map((img, idx) => ({ ...img, orderIndex: idx }));
    });
  }, []);

  // 이미지 순서 이동
  const moveImage = useCallback((id: string, direction: 'up' | 'down') => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newImages = [...prev];
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];

      return newImages.map((img, idx) => ({ ...img, orderIndex: idx }));
    });
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedImageId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedImageId || draggedImageId === targetId) {
      setDraggedImageId(null);
      return;
    }

    setImages((prev) => {
      const draggedIndex = prev.findIndex((img) => img.id === draggedImageId);
      const targetIndex = prev.findIndex((img) => img.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newImages = [...prev];
      const [dragged] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, dragged);

      return newImages.map((img, idx) => ({ ...img, orderIndex: idx }));
    });

    setDraggedImageId(null);
  };

  // 캡션 업데이트
  const updateCaption = (updates: Partial<Caption>) => {
    setCaptions((prev) => [{ ...prev[0], ...updates }]);
  };

  // 피드 제출
  const handleSubmit = async () => {
    if (images.length === 0) {
      setError('최소 1개의 이미지가 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();

      // 이미지 추가 (순서대로)
      images
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach((img) => {
          formData.append('images', img.file);
        });

      // 캡션 추가 (텍스트가 있는 것만)
      const validCaptions = captions
        .filter((cap) => cap.text.trim())
        .map((cap, idx) => ({
          text: cap.text.trim(),
          orderIndex: idx,
          isBold: cap.isBold,
          isItalic: cap.isItalic,
          fontSize: cap.fontSize,
        }));

      formData.append('captions', JSON.stringify(validCaptions));

      // API 요청
      let response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      // 401 에러시 토큰 갱신 후 재시도
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
        } else {
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tokenExpiresAt');
          router.push('/');
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '피드 생성에 실패했습니다.');
      }

      // 성공 - 메인 페이지로 이동
      router.push('/main');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/main" className="text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">새 피드</h1>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || images.length === 0}
            className="text-instagram-blue font-semibold disabled:opacity-50"
          >
            {isSubmitting ? '게시 중...' : '공유'}
          </button>
        </div>
      </header>

      {/* 헤더 높이만큼 여백 */}
      <div className="pt-14">
        {/* 탭 메뉴 */}
        <div className="max-w-lg mx-auto bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'text-instagram-blue border-b-2 border-instagram-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              작성
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'text-instagram-blue border-b-2 border-instagram-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              미리보기
            </button>
          </div>
        </div>

        {/* 작성 탭 */}
        {activeTab === 'edit' && (
          <div className="max-w-lg mx-auto p-4 space-y-6">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 이미지 섹션 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold mb-3">
                이미지 ({images.length}/{MAX_IMAGES})
              </h2>

              {/* 이미지 그리드 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, img.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, img.id)}
                    className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-move ${
                      draggedImageId === img.id ? 'opacity-50' : ''
                    }`}
                  >
                    <img
                      src={img.preview}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* 순서 번호 */}
                    <span className="absolute top-1 right-1 w-6 h-6 bg-instagram-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1 left-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {/* 순서 조정 버튼 */}
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button
                        onClick={() => moveImage(img.id, 'up')}
                        disabled={index === 0}
                        className="w-6 h-6 bg-white/80 rounded flex items-center justify-center disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveImage(img.id, 'down')}
                        disabled={index === images.length - 1}
                        className="w-6 h-6 bg-white/80 rounded flex items-center justify-center disabled:opacity-30"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* 이미지 추가 버튼 */}
                {images.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-instagram-blue hover:text-instagram-blue transition-colors"
                  >
                    <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs">사진 추가</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              <p className="text-xs text-gray-400">
                드래그 앤 드롭 또는 화살표로 순서를 변경할 수 있습니다.
              </p>
            </section>

            {/* 캡션 섹션 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold mb-3">캡션</h2>

              <div className="space-y-2">
                {/* 텍스트 입력 */}
                <textarea
                  value={captions[0].text}
                  onChange={(e) => updateCaption({ text: e.target.value })}
                  placeholder="캡션을 입력하세요..."
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-instagram-blue"
                  rows={3}
                  maxLength={2000}
                  style={{
                    fontWeight: captions[0].isBold ? 'bold' : 'normal',
                    fontStyle: captions[0].isItalic ? 'italic' : 'normal',
                    fontSize: `${captions[0].fontSize}px`,
                  }}
                />

                {/* 스타일 옵션 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => updateCaption({ isBold: !captions[0].isBold })}
                    className={`px-3 py-1 text-sm rounded border ${
                      captions[0].isBold
                        ? 'bg-instagram-blue text-white border-instagram-blue'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => updateCaption({ isItalic: !captions[0].isItalic })}
                    className={`px-3 py-1 text-sm rounded border ${
                      captions[0].isItalic
                        ? 'bg-instagram-blue text-white border-instagram-blue'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <em>I</em>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">크기:</span>
                    <select
                      value={captions[0].fontSize}
                      onChange={(e) => updateCaption({ fontSize: parseInt(e.target.value) })}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-instagram-blue"
                    >
                      {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 미리보기 탭 */}
        {activeTab === 'preview' && (
          <div className="max-w-lg mx-auto">
            {images.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">미리보기할 이미지가 없습니다.</p>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="text-instagram-blue font-medium"
                >
                  이미지 추가하기
                </button>
              </div>
            ) : (
              <PreviewCard
                images={images}
                caption={captions[0].text.trim() ? captions[0] : null}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// 미리보기 카드 컴포넌트
function PreviewCard({
  images,
  caption,
}: {
  images: ImageFile[];
  caption: Caption | null;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < images.length - 1 ? prev + 1 : prev
    );
  };

  // 정렬된 이미지
  const sortedImages = [...images].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <article className="bg-white border-b border-gray-200">
      {/* 작성자 정보 (예시) */}
      <div className="flex items-center px-4 py-3">
        <div className="w-8 h-8 bg-gradient-to-r from-instagram-purple to-instagram-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
          나
        </div>
        <span className="ml-3 font-semibold text-sm">내 피드 미리보기</span>
      </div>

      {/* 이미지 캐러셀 */}
      <div className="relative bg-black aspect-square">
        <img
          src={sortedImages[currentImageIndex]?.preview}
          alt={`미리보기 이미지 ${currentImageIndex + 1}`}
          className="w-full h-full object-contain"
        />

        {/* 이미지 네비게이션 */}
        {sortedImages.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentImageIndex < sortedImages.length - 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* 이미지 인디케이터 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
              {sortedImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    idx === currentImageIndex ? 'bg-instagram-blue' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 캡션 */}
      <div className="px-4 py-3">
        {caption ? (
          <p
            style={{
              fontWeight: caption.isBold ? 'bold' : 'normal',
              fontStyle: caption.isItalic ? 'italic' : 'normal',
              fontSize: `${caption.fontSize}px`,
            }}
            className="text-gray-800"
          >
            <span className="font-semibold mr-2">나</span>
            {caption.text}
          </p>
        ) : (
          <p className="text-gray-400 text-sm">캡션이 없습니다.</p>
        )}
        <p className="text-xs text-gray-400 mt-2">방금 전</p>
      </div>

      {/* 미리보기 안내 */}
      <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
        <p className="text-xs text-blue-600 text-center">
          이것은 미리보기입니다. 실제 게시 후에는 프로필 사진과 사용자명이 표시됩니다.
        </p>
      </div>
    </article>
  );
}
