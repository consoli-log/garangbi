import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  async list(@Query('ledgerId') ledgerId: string) {
    return this.service.listByLedger(ledgerId);
  }

  // 그룹
  @Post('groups')
  async createGroup(@Body() body: CreateGroupDto) {
    return this.service.createGroup(body.ledgerId, body.name, body.type ?? 'ASSET');
  }

  @Patch('groups/:id')
  async updateGroup(@Param('id') id: string, @Body() body: UpdateGroupDto) {
    return this.service.updateGroup(id, { name: body.name, type: body.type });
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.service.deleteGroup(id);
  }

  @Patch('groups/reorder')
  async reorderGroups(@Body() body: ReorderDto) {
    return this.service.reorderGroups(body.ledgerId, body.items);
  }

  // 자산
  @Post()
  async create(@Body() body: CreateAssetDto) {
    return this.service.createAsset(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.service.updateAsset(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.deleteAsset(id);
  }

  @Patch('reorder')
  async reorder(@Body() body: ReorderDto) {
    return this.service.reorderAssets(body.ledgerId, body.items);
  }
}
