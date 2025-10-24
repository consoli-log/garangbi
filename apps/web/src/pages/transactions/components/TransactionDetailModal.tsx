import React, { useState } from 'react';
import { Transaction, TransactionComment, TransactionType } from '@garangbi/types';
import { formatCurrency } from '../utils';
import { PREVIEW_FALLBACK_DATA_URI } from '../constants';

interface TransactionDetailModalProps {
  transaction: Transaction;
  currentUserId?: string | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onAddComment: (transactionId: string, content: string) => void;
  onUpdateComment: (transactionId: string, comment: TransactionComment) => void;
  onDeleteComment: (transactionId: string, commentId: string) => void;
}

export function TransactionDetailModal({
  transaction,
  currentUserId,
  onClose,
  onEdit,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: TransactionDetailModalProps) {
  const [commentValue, setCommentValue] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleSubmitComment = () => {
    if (!commentValue.trim()) return;
    onAddComment(transaction.id, commentValue);
    setCommentValue('');
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm"
            onClick={() => onEdit(transaction)}
          >
            수정
          </button>
          <button
            type="button"
            className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <header className="flex flex-col gap-2">
          <h3 className="pixel-heading text-xl">거래 상세</h3>
          <div className="text-sm text-pixel-ink/70">
            {new Date(transaction.transactionDate).toLocaleString('ko-KR')}
          </div>
          <div className="text-lg font-bold text-pixel-ink">
            {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
            {formatCurrency(transaction.amount)}원
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-pixel-ink/60">
            {transaction.tags?.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-pixel-purple/15 px-2 py-1 text-xs uppercase text-pixel-purple"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-dashed border-black/40 p-4 text-sm text-pixel-ink">
          <p>메모: {transaction.memo || '없음'}</p>
          <p>노트: {transaction.note || '없음'}</p>
        </section>

        {transaction.attachments?.length ? (
          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold uppercase text-pixel-ink">첨부 이미지</h4>
            <div className="flex flex-wrap gap-3">
              {transaction.attachments.map((attachment) => {
                const isHeic =
                  attachment.mimeType.toLowerCase().includes('heic') ||
                  attachment.mimeType.toLowerCase().includes('heif');
                return (
                  <div
                    key={attachment.id}
                    className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-black"
                  >
                    {isHeic ? (
                      <div className="flex h-full w-full items-center justify-center bg-pixel-dark/10 px-2 text-center text-[10px] text-pixel-ink/60">
                        HEIC 미리보기 미지원
                      </div>
                    ) : (
                      <img
                        src={attachment.thumbnailUrl ?? attachment.fileUrl}
                        alt="attachment"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = PREVIEW_FALLBACK_DATA_URI;
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase text-pixel-ink">댓글</h4>
          <div className="flex flex-col gap-2">
            {transaction.comments?.map((comment) => {
              const isMine = currentUserId ? comment.userId === currentUserId : false;
              const isEditing = isMine && editingCommentId === comment.id;
              return (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-black bg-white px-3 py-2 text-sm shadow-pixel-sm"
                >
                  <div className="flex items-center justify-between text-xs text-pixel-ink/60">
                    <span>{comment.user?.nickname ?? comment.user?.email ?? '사용자'}</span>
                    <span>{new Date(comment.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                  {isEditing ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        className="flex-1 rounded-2xl border border-black px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        className="rounded-full border border-black bg-white px-3 py-1 text-xs"
                        onClick={() => {
                          onUpdateComment(transaction.id, {
                            ...comment,
                            content: editingValue,
                          });
                          setEditingCommentId(null);
                        }}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-black bg-white px-3 py-1 text-xs text-pixel-red"
                        onClick={() => setEditingCommentId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-pixel-ink">{comment.content}</p>
                  )}
                  {isMine ? (
                    <div className="mt-2 flex gap-2 text-[10px] text-pixel-ink/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingValue(comment.content);
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(transaction.id, comment.id)}
                        className="text-pixel-red"
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
              placeholder="새 댓글"
              className="flex-1 rounded-2xl border border-black px-3 py-2 text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <button
              type="button"
              className="rounded-full border border-black bg-white px-3 py-2 text-xs font-semibold"
              onClick={handleSubmitComment}
            >
              등록
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
