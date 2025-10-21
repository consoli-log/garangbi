import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const transactionInclude = {
  splits: true,
  attachments: true,
  tags: {
    include: {
      tag: true,
    },
  },
  comments: {
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          email: true,
        },
      },
    },
  },
} as const;

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private get commentClient() {
    return (this.prisma as any).transactionComment;
  }

  private pushAndCondition(
    where: Prisma.TransactionWhereInput,
    condition: Prisma.TransactionWhereInput,
  ) {
    if (!where.AND) {
      where.AND = [condition];
    } else if (Array.isArray(where.AND)) {
      where.AND = [...where.AND, condition];
    } else {
      where.AND = [where.AND, condition];
    }
  }

  private async ensureLedgerMember(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('해당 가계부에 접근 권한이 없습니다.');
    }

    return membership;
  }

  private async ensureLedgerEditor(userId: string, ledgerId: string) {
    const membership = await this.ensureLedgerMember(userId, ledgerId);
    if (membership.role === 'VIEWER') {
      throw new ForbiddenException('권한이 부족합니다.');
    }
    return membership;
  }

  async listTransactions(userId: string, ledgerId: string, filter: TransactionFilterDto) {
    await this.ensureLedgerMember(userId, ledgerId);

    const {
      startDate,
      endDate,
      assetIds,
      categoryIds,
      tagIds,
      types,
      search,
      page = 1,
      pageSize = 20,
      sort,
    } = filter;

    const where: Prisma.TransactionWhereInput = {
      ledgerId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    if (assetIds?.length) {
      where.assetId = { in: assetIds };
    }

    if (categoryIds?.length) {
      this.pushAndCondition(where, {
        OR: [
          { categoryId: { in: categoryIds } },
          {
            splits: {
              some: {
                categoryId: { in: categoryIds },
              },
            },
          },
        ],
      });
    }

    if (types?.length) {
      where.type = { in: types };
    }

    if (tagIds?.length) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    if (search?.trim()) {
      const keyword = search.trim();
      this.pushAndCondition(where, {
        OR: [
          { memo: { contains: keyword, mode: 'insensitive' } },
          { note: { contains: keyword, mode: 'insensitive' } },
        ],
      });
      this.pushAndCondition(
        where,
        {
          comments: {
            some: {
              content: {
                contains: keyword,
                mode: 'insensitive',
              },
            },
          },
        } as any,
      );
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [];
    if (sort === 'dateAsc') {
      orderBy.push({ transactionDate: 'asc' });
    } else {
      orderBy.push({ transactionDate: 'desc' });
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: transactionInclude,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapTransaction(item)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async createTransaction(userId: string, ledgerId: string, dto: CreateTransactionDto) {
    await this.ensureLedgerEditor(userId, ledgerId);

    if (dto.type === TransactionType.TRANSFER && !dto.relatedAssetId) {
      throw new BadRequestException('이체 거래에는 상대 자산을 선택해야 합니다.');
    }

    if (dto.splits?.length) {
      const splitTotal = dto.splits.reduce((sum, split) => sum + split.amount, 0);
      if (splitTotal !== dto.amount) {
        throw new BadRequestException('거래 금액과 분할 금액의 합이 일치하지 않습니다.');
      }
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          ledgerId,
          assetId: dto.assetId,
          relatedAssetId: dto.relatedAssetId ?? null,
          categoryId: dto.categoryId ?? null,
          recurringRuleId: dto.recurringRuleId ?? null,
          createdById: userId,
          type: dto.type,
          status: dto.status ?? TransactionStatus.ACTIVE,
          transactionDate: new Date(dto.transactionDate),
          amount: dto.amount,
          memo: dto.memo ?? null,
          note: dto.note ?? null,
        },
      });

      if (dto.splits?.length) {
        await tx.transactionSplit.createMany({
          data: dto.splits.map((split) => ({
            transactionId: created.id,
            categoryId: split.categoryId,
            amount: split.amount,
            memo: split.memo ?? null,
          })),
        });
      }

      if (dto.attachments?.length) {
        await tx.transactionAttachment.createMany({
          data: dto.attachments.map((attachment) => ({
            transactionId: created.id,
            fileUrl: attachment.fileUrl,
            thumbnailUrl: attachment.thumbnailUrl ?? null,
            mimeType: attachment.mimeType,
            size: attachment.size,
          })),
        });
      }

      if (dto.tags?.length) {
        await this.syncTags(tx, ledgerId, created.id, dto.tags);
      }

      return tx.transaction.findUnique({
        where: { id: created.id },
        include: transactionInclude,
      });
    });

    if (!transaction) {
      throw new NotFoundException('거래를 생성할 수 없습니다.');
    }

    return this.mapTransaction(transaction);
  }

  async getTransaction(userId: string, ledgerId: string, transactionId: string) {
    await this.ensureLedgerMember(userId, ledgerId);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, ledgerId },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    return this.mapTransaction(transaction);
  }

  async updateTransaction(
    userId: string,
    ledgerId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    await this.ensureLedgerEditor(userId, ledgerId);

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, ledgerId },
    });

    if (!existing) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    if (dto.splits?.length) {
      const splitTotal = dto.splits.reduce((sum, split) => sum + split.amount, 0);
      const targetAmount = dto.amount ?? existing.amount;
      if (splitTotal !== targetAmount) {
        throw new BadRequestException('거래 금액과 분할 금액의 합이 일치하지 않습니다.');
      }
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          type: dto.type ?? existing.type,
          amount: dto.amount ?? existing.amount,
          transactionDate: dto.transactionDate
            ? new Date(dto.transactionDate)
            : existing.transactionDate,
          assetId: dto.assetId ?? existing.assetId,
          relatedAssetId:
            dto.relatedAssetId !== undefined ? dto.relatedAssetId : existing.relatedAssetId,
          categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
          recurringRuleId:
            dto.recurringRuleId !== undefined
              ? dto.recurringRuleId
              : existing.recurringRuleId,
          status: dto.status ?? existing.status,
          memo: dto.memo !== undefined ? dto.memo : existing.memo,
          note: dto.note !== undefined ? dto.note : existing.note,
        },
      });

      if (dto.splits) {
        await tx.transactionSplit.deleteMany({ where: { transactionId } });
        if (dto.splits.length) {
          await tx.transactionSplit.createMany({
            data: dto.splits.map((split) => ({
              transactionId,
              categoryId: split.categoryId,
              amount: split.amount,
              memo: split.memo ?? null,
            })),
          });
        }
      }

      if (dto.attachments) {
        await tx.transactionAttachment.deleteMany({ where: { transactionId } });
        if (dto.attachments.length) {
          await tx.transactionAttachment.createMany({
            data: dto.attachments.map((attachment) => ({
              transactionId,
              fileUrl: attachment.fileUrl,
              thumbnailUrl: attachment.thumbnailUrl ?? null,
              mimeType: attachment.mimeType,
              size: attachment.size,
            })),
          });
        }
      }

      if (dto.tags) {
        await tx.transactionTag.deleteMany({ where: { transactionId } });
        if (dto.tags.length) {
          await this.syncTags(tx, ledgerId, transactionId, dto.tags);
        }
      }

      return tx.transaction.findUnique({
        where: { id: transactionId },
        include: transactionInclude,
      });
    });

    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    return this.mapTransaction(transaction);
  }

  async deleteTransaction(userId: string, ledgerId: string, transactionId: string) {
    await this.ensureLedgerEditor(userId, ledgerId);

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, ledgerId },
    });

    if (!existing) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    await this.prisma.transaction.delete({ where: { id: transactionId } });

    return { success: true };
  }

  async createComment(
    userId: string,
    ledgerId: string,
    transactionId: string,
    dto: CreateCommentDto,
  ) {
    await this.ensureLedgerMember(userId, ledgerId);

    const transactionExists = await this.prisma.transaction.findFirst({
      where: { id: transactionId, ledgerId },
    });

    if (!transactionExists) {
      throw new NotFoundException('거래를 찾을 수 없습니다.');
    }

    const comment = await this.commentClient.create({
      data: {
        transactionId,
        userId,
        content: dto.content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    return comment;
  }

  async updateComment(
    userId: string,
    ledgerId: string,
    transactionId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ) {
    await this.ensureLedgerMember(userId, ledgerId);

    const comment = await this.commentClient.findFirst({
      where: {
        id: commentId,
        transactionId,
        transaction: { ledgerId },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 댓글만 수정할 수 있습니다.');
    }

    return this.commentClient.update({
      where: { id: commentId },
      data: {
        content: dto.content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteComment(
    userId: string,
    ledgerId: string,
    transactionId: string,
    commentId: string,
  ) {
    await this.ensureLedgerMember(userId, ledgerId);

    const comment = await this.commentClient.findFirst({
      where: {
        id: commentId,
        transactionId,
        transaction: { ledgerId },
      },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 댓글만 삭제할 수 있습니다.');
    }

    await this.commentClient.delete({ where: { id: commentId } });

    return { success: true };
  }

  private async syncTags(
    tx: any,
    ledgerId: string,
    transactionId: string,
    tags: string[],
  ) {
    if (!tags.length) {
      return;
    }

    const normalized = tags
      .map((tag) => tag.trim())
      .filter((tag) => Boolean(tag));

    const unique = Array.from(new Set(normalized));

    const tagRecords = await Promise.all(
      unique.map((name) =>
        tx.tag.upsert({
          where: {
            ledgerId_name: {
              ledgerId,
              name,
            },
          },
          update: {},
          create: {
            ledgerId,
            name,
          },
        }),
      ),
    );

    await tx.transactionTag.createMany({
      data: tagRecords.map((tag) => ({
        transactionId,
        tagId: tag.id,
      })),
    });
  }

  private mapTransaction(transaction: TransactionWithRelations) {
    const { tags, comments, ...rest } = transaction as any;

    return {
      ...rest,
      tags: Array.isArray(tags) ? tags.map((tag: any) => tag.tag) : [],
      comments: Array.isArray(comments)
        ? comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            userId: comment.userId,
            user: comment.user,
          }))
        : [],
    };
  }
}
