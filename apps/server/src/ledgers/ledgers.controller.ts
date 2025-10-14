import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgersService } from './ledgers.service';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  @Get('ledgers')
  async listLedgers(@Req() req) {
    return this.ledgersService.listForUser(req.user.id);
  }

  @Post('ledgers')
  async createLedger(@Req() req, @Body() dto: CreateLedgerDto) {
    return this.ledgersService.createLedger(req.user.id, dto);
  }

  @Patch('ledgers/:id')
  async updateLedger(
    @Req() req,
    @Param('id') ledgerId: string,
    @Body() dto: UpdateLedgerDto,
  ) {
    return this.ledgersService.updateLedger(req.user.id, ledgerId, dto);
  }

  @Delete('ledgers/:id')
  async deleteLedger(
    @Req() req,
    @Param('id') ledgerId: string,
    @Query('confirmName') confirmName: string,
  ) {
    return this.ledgersService.deleteLedger(req.user.id, ledgerId, confirmName);
  }

  @Post('ledgers/:id/set-main')
  async setMainLedger(@Req() req, @Param('id') ledgerId: string) {
    await this.ledgersService.setMainLedger(req.user.id, ledgerId);
    return { success: true };
  }

  @Post('ledgers/:id/invitations')
  async inviteMember(
    @Req() req,
    @Param('id') ledgerId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.ledgersService.inviteMember(req.user.id, ledgerId, dto);
  }

  @Get('invitations')
  async listInvitations(@Req() req) {
    return this.ledgersService.listInvitationsForUser(req.user.email);
  }

  @Post('invitations/respond')
  async respondInvitation(@Req() req, @Body() dto: RespondInvitationDto) {
    await this.ledgersService.respondToInvitation(
      req.user.id,
      dto.token,
      dto.accept,
    );
    return { success: true };
  }

  @Delete('invitations/:id')
  async revokeInvitation(@Req() req, @Param('id') invitationId: string) {
    return this.ledgersService.revokeInvitation(req.user.id, invitationId);
  }
}
