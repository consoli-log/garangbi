import React, { useState } from 'react';
import {
  Transaction,
  TransactionComment,
  TransactionType,
} from '@garangbi/types';
import { cn } from '../../lib/cn';
import { formatCurrency } from './utils';

interface TransactionDetailModalProps {
  transaction: Transaction;
  currentUserId: string | null;
  onClose: () => void;
  onAddComment: (transactionId: string, content: string) => void;
  onUpdateComment: (transactionId: string, comment: TransactionComment) => void;
  onDeleteComment: (transactionId: string, commentId: string) => void;
}

export function TransactionDetailModal({
  transaction,
  currentUserId,
  onClose,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: TransactionDetailModalProps) {
  const [commentValue, setCommentValue] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm font-semibold uppercase text-pixel-ink"
          onClick={onClose}
        >
          닫기
        </button>
        <header className="flex flex-col gap-2">
          <h3 className="pixel-heading text-xl">거래 상세</h3>
          <div className="text-sm text-pixel-ink/70">
            {new Date(transaction.transactionDate).toLocaleString('ko-KR')}
          </div>
          <div
            className={cn('text-lg font-bold', {
              'text-pixel-green': transaction.type === TransactionType.INCOME,
              'text-pixel-red': transaction.type === TransactionType.EXPENSE,
              'text-pixel-ink': transaction.type === TransactionType.TRANSFER,
            })}
          >
            {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
            {formatCurrency(transaction.amount)}원
          </div>
          <div className="flex flex-wrap gap-2">
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

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase text-pixel-ink">댓글</h4>
          <div className="flex flex-col gap-2">
            {transaction.comments?.map((comment) => {
              const isMine = currentUserId ? comment.userId === currentUserId : false;
              const displayName = comment.user?.nickname ?? comment.user?.email ?? '사용자';
              const avatarLabel = displayName.trim().charAt(0).toUpperCase() || '유';
              const renderAsEditing = isMine && editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-black bg-white px-3 py-2 text-sm shadow-pixel-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-pixel-ink/70">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black bg-pixel-purple/15 text-[11px] font-semibold text-pixel-purple">
                        {avatarLabel}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-pixel-ink">{displayName}</span>
                        <span className="text-[10px] text-pixel-ink/60">
                          {new Date(comment.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    {isMine ? (
                      <div className="flex gap-2 text-[10px] text-pixel-ink/60">
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
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {renderAsEditing ? (
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
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-pixel-ink">{comment.content}</p>
                  )}
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
            />
            <button
              type="button"
              className="rounded-full border border-black bg-white px-3 py-2 text-xs font-semibold"
              onClick={() => {
                onAddComment(transaction.id, commentValue);
                setCommentValue('');
              }}
            >
              등록
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
