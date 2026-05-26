import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import type { UserEntity } from '../../database/entities/user.entity';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import { PatientTimelineService } from './patient-timeline.service';
import { ReportsService, type ReportListParams } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.PROFESSOR, UserRole.STUDENT)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly patientTimelineService: PatientTimelineService,
  ) {}

  @Get('apps')
  apps(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.apps(actor, query);
  }

  @Get('courses')
  courses(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.courses(actor, query);
  }

  @Get('users')
  users(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.users(actor, query);
  }

  @Get('patients')
  patients(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.patients(actor, query);
  }

  /**
   * Linha do tempo narrativa: cadastro, vínculos, episódios, prescrições, decisões e práticas por dia.
   * Query: `patientId` (obrigatório), `from` / `to` opcionais (AAAA-MM-DD, UTC).
   */
  @Get('patient-timeline')
  patientTimeline(
    @CurrentUser() actor: UserEntity,
    @Query('patientId') patientIdRaw: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const patientId = Number(patientIdRaw);
    if (!Number.isFinite(patientId) || patientId < 1) {
      throw new BadRequestException('Informe patientId válido.');
    }
    this.reports.ensurePatientTimelineAccess(actor);
    return this.patientTimelineService.build(actor, { patientId, from, to });
  }

  /** Prescrições (todos os status); use filtros `status`, datas, app, curso. */
  @Get('prescriptions')
  prescriptions(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.prescriptions(actor, query);
  }

  /** Fila de aprovação: por padrão apenas pendentes (equivalente a prescrições com status PENDING). */
  @Get('approvals')
  approvals(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    const status = query.status?.trim();
    return this.reports.prescriptions(actor, {
      ...query,
      status: status || 'PENDING',
    });
  }

  @Get('categories')
  categories(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.categories(actor, query);
  }

  @Get('exercises')
  exercises(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.exercises(actor, query);
  }

  /** Vínculos exercício ↔ categoria (tabela exercise_categories). */
  @Get('exercise-categories')
  exerciseCategories(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.exerciseCategories(actor, query);
  }

  /** Catálogo global de nós de menu (hub). */
  @Get('menu-nodes')
  menuNodes(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.menuNodes(actor, query);
  }

  /** Nós de menu habilitados por curso (course_menu_nodes). */
  @Get('course-menus')
  courseMenus(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.courseMenus(actor, query);
  }

  @Get('clinical-cases')
  clinicalCases(@CurrentUser() actor: UserEntity, @Query() query: ReportListParams) {
    return this.reports.clinicalCases(actor, query);
  }
}
