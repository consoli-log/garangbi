import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderItemsDto } from '../assets/dto/reorder-items.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('ledgers/:ledgerId/categories')
  list(@Req() req, @Param('ledgerId') ledgerId: string) {
    return this.categoriesService.list(req.user.id, ledgerId);
  }

  @Post('ledgers/:ledgerId/categories')
  create(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(req.user.id, ledgerId, dto);
  }

  @Patch('categories/:id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(req.user.id, id, dto);
  }

  @Post('ledgers/:ledgerId/categories/reorder')
  reorder(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.categoriesService.reorder(req.user.id, ledgerId, dto);
  }

  @Delete('categories/:id')
  delete(@Req() req, @Param('id') id: string) {
    return this.categoriesService.delete(req.user.id, id);
  }
}
