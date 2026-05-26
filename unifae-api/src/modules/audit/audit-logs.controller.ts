import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { AuditService, type AuditLogListParams } from './audit.service';

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(private readonly audit: AuditService) {}

  /** Valores distintos de ação e de rota (`entity`) para sugestões nos filtros. */
  @Get('facets')
  facets() {
    return this.audit.facets();
  }

  @Get()
  list(@Query() query: AuditLogListParams) {
    return this.audit.list(query);
  }
}
