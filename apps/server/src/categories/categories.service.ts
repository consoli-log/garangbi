import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, LedgerMemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderItemsDto } from '../assets/dto/reorder-items.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, ledgerId: string) {
    await this.ensureMember(userId, ledgerId);

    const categories = await this.prisma.category.findMany({
      where: { ledgerId },
      orderBy: [
        { type: 'asc' },
        { parentId: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    const buildTree = (type: CategoryType) => {
      const filtered = categories.filter((c) => c.type === type);
      const map = new Map<string, any>();

      filtered.forEach((category) => {
        map.set(category.id, { ...category, children: [] });
      });

      const roots: any[] = [];

      filtered.forEach((category) => {
        const node = map.get(category.id);
        if (category.parentId) {
          const parent = map.get(category.parentId);
          if (parent) {
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        } else {
          roots.push(node);
        }
      });

      return roots;
    };

    return {
      income: buildTree(CategoryType.INCOME),
      expense: buildTree(CategoryType.EXPENSE),
    };
  }

  async create(userId: string, ledgerId: string, dto: CreateCategoryDto) {
    await this.ensureEditor(userId, ledgerId);

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.ledgerId !== ledgerId || parent.type !== dto.type) {
        throw new BadRequestException('유효하지 않은 상위 카테고리입니다.');
      }
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        ledgerId,
        type: dto.type,
        name: dto.name,
        parentId: dto.parentId ?? null,
      },
    });

    if (existing) {
      throw new BadRequestException('이미 존재하는 카테고리입니다.');
    }

    const maxOrder = await this.prisma.category.aggregate({
      where: {
        ledgerId,
        type: dto.type,
        parentId: dto.parentId ?? null,
      },
      _max: { sortOrder: true },
    });

    return this.prisma.category.create({
      data: {
        ledgerId,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async update(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    await this.ensureEditor(userId, category.ledgerId);

    if (dto.parentId) {
      if (dto.parentId === category.id) {
        throw new BadRequestException('자기 자신을 상위 카테고리로 설정할 수 없습니다.');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.ledgerId !== category.ledgerId || parent.type !== category.type) {
        throw new BadRequestException('유효하지 않은 상위 카테고리입니다.');
      }
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        parentId:
          dto.parentId !== undefined ? dto.parentId : category.parentId,
        sortOrder: dto.sortOrder ?? category.sortOrder,
      },
    });
  }

  async reorder(userId: string, ledgerId: string, dto: ReorderItemsDto) {
    await this.ensureEditor(userId, ledgerId);

    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async delete(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    await this.ensureEditor(userId, category.ledgerId);

    if (category.children.length > 0) {
      throw new BadRequestException('하위 카테고리가 있는 경우 먼저 삭제해야 합니다.');
    }

    return this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  private async ensureMember(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('가계부 접근 권한이 없습니다.');
    }
  }

  private async ensureEditor(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('가계부 접근 권한이 없습니다.');
    }

    if (
      membership.role !== LedgerMemberRole.OWNER &&
      membership.role !== LedgerMemberRole.EDITOR
    ) {
      throw new ForbiddenException('편집 권한이 없습니다.');
    }
  }
}
