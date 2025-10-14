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
import { AssetsService } from './assets.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('ledgers/:ledgerId/asset-groups')
  listGroups(@Req() req, @Param('ledgerId') ledgerId: string) {
    return this.assetsService.listGroups(req.user.id, ledgerId);
  }

  @Post('ledgers/:ledgerId/asset-groups')
  createGroup(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateAssetGroupDto,
  ) {
    return this.assetsService.createGroup(req.user.id, ledgerId, dto);
  }

  @Patch('asset-groups/:id')
  updateGroup(@Req() req, @Param('id') id: string, @Body() dto: UpdateAssetGroupDto) {
    return this.assetsService.updateGroup(req.user.id, id, dto);
  }

  @Post('ledgers/:ledgerId/asset-groups/reorder')
  reorderGroups(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.assetsService.reorderGroups(req.user.id, ledgerId, dto);
  }

  @Delete('asset-groups/:id')
  deleteGroup(@Req() req, @Param('id') id: string) {
    return this.assetsService.deleteGroup(req.user.id, id);
  }

  @Post('ledgers/:ledgerId/assets')
  createAsset(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.createAsset(req.user.id, ledgerId, dto);
  }

  @Patch('assets/:id')
  updateAsset(@Req() req, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.updateAsset(req.user.id, id, dto);
  }

  @Post('ledgers/:ledgerId/assets/reorder')
  reorderAssets(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.assetsService.reorderAssets(req.user.id, ledgerId, dto);
  }

  @Delete('assets/:id')
  deleteAsset(@Req() req, @Param('id') id: string) {
    return this.assetsService.deleteAsset(req.user.id, id);
  }
}
