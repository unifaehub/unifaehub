import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import type { UserEntity } from '../../database/entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('overview')
  overview(@CurrentUser() user: UserEntity, @Query() query: DashboardQueryDto) {
    return this.dashboard.overview(user, query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('timeseries')
  timeseries(@CurrentUser() user: UserEntity, @Query() query: DashboardQueryDto) {
    return this.dashboard.timeseries(user, query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@CurrentUser() user: UserEntity, @Query() query: DashboardQueryDto, @Res() res: Response) {
    const csv = await this.dashboard.exportCsv(user, query);
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    res.setHeader('Content-Disposition', `attachment; filename=\"dashboard_${y}-${m}-${d}.csv\"`);
    return res.send(csv);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('export-detailed')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportDetailed(@CurrentUser() user: UserEntity, @Query() query: DashboardQueryDto, @Res() res: Response) {
    const csv = await this.dashboard.exportDetailedCsv(user, query);
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"dashboard_detailed_${y}-${m}-${d}.csv\"`,
    );
    return res.send(csv);
  }
}

