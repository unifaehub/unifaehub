import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../identity-access/decorators/current-user.decorator';
import type { UserEntity } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { AppHomeService } from './app-home.service';
import { SubmitExerciseFeedbackDto } from './dto/submit-exercise-feedback.dto';
import { SubmitPainDto } from './dto/submit-pain.dto';

type UploadedMulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('app/home')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('App do paciente')
@ApiBearerAuth()
export class AppHomeController {
  constructor(private readonly home: AppHomeService) {}

  @Roles(UserRole.PATIENT)
  @Get()
  @ApiOperation({ summary: 'Carrega a home do app do paciente.' })
  @ApiOkResponse({
    description: 'Snapshot da home.',
    schema: {
      example: {
        painToday: { recorded: true, level: 'MILD', recordedAt: '2026-05-12T12:45:00.000Z' },
        plan: { totalExercises: 2, completedExercises: 1, percentCompleted: 50 },
        nextExercise: {
          prescriptionId: 2,
          prescriptionItemId: 4,
          exerciseId: 2,
          exerciseName: 'Prancha isométrica',
          axis: 'Ortopedia',
          problem: 'Lombalgia',
          objective: 'Ganho de amplitude',
        },
        motivation: { id: 3, message: 'Respire. Ajuste a postura. Continue.' },
      },
    },
  })
  snapshot(@CurrentUser() actor: UserEntity) {
    return this.home.getHomeSnapshot(actor);
  }

  /** Lista exercícios da prescrição ativa (árvore/eixo, título, status no dia). */
  @Roles(UserRole.PATIENT)
  @Get('plan/exercises')
  @ApiOperation({ summary: 'Lista exercícios da prescrição aprovada ativa.' })
  @ApiOkResponse({
    description: 'Lista de exercícios do plano, sem chips/tags auxiliares.',
    schema: {
      example: {
        prescriptionId: 2,
        items: [
          {
            prescriptionItemId: 3,
            exerciseId: 3,
            title: 'Alongamento posterior de coxa',
            taxonomy: { axis: 'Ortopedia', problem: 'Lombalgia', objective: 'Ganho de amplitude' },
            completedToday: false,
          },
        ],
      },
    },
  })
  listPlanExercises(@CurrentUser() actor: UserEntity) {
    return this.home.listPlanExercises(actor);
  }

  @Roles(UserRole.PATIENT)
  @Get('plan/today')
  @ApiOperation({ summary: 'Plano de hoje com detalhes, execução e feedback por exercício.' })
  getPlanToday(@CurrentUser() actor: UserEntity) {
    return this.home.getPlanToday(actor);
  }

  @Roles(UserRole.PATIENT)
  @Get('plan/week')
  @ApiOperation({
    summary:
      'Plano semanal da semana corrente (segunda a domingo), calculado a partir da data de hoje.',
  })
  @ApiOkResponse({
    description: 'Plano da semana corrente com exercícios e agendas por dia.',
    schema: {
      example: {
        today: '2026-05-26',
        weekStart: '2026-05-25',
        weekEnd: '2026-05-31',
        prescriptionId: 2,
        days: [
          {
            date: '2026-05-26',
            label: 'Terça-feira',
            isToday: true,
            summary: { total: 3, completed: 1, pendingFeedback: 0, percentCompleted: 33 },
            exercises: [],
            appointments: [
              {
                id: 1,
                scheduledAt: '2026-05-26T14:00:00.000Z',
                modality: 'IN_PERSON',
                location: {
                  mode: 'IN_PERSON',
                  name: 'Clínica UNIFAE',
                  address: 'Av. Exemplo, 100 — Sala 12, São José dos Campos/SP',
                  url: null,
                },
              },
              {
                id: 2,
                scheduledAt: '2026-05-28T10:00:00.000Z',
                modality: 'ONLINE',
                location: {
                  mode: 'REMOTE',
                  name: null,
                  address: null,
                  url: 'https://meet.google.com/abc-defg-hij',
                },
              },
            ],
          },
        ],
      },
    },
  })
  getPlanWeek(@CurrentUser() actor: UserEntity) {
    return this.home.getPlanWeek(actor);
  }

  @Roles(UserRole.PATIENT)
  @Get('appointments')
  @ApiOperation({ summary: 'Agendas futuras do paciente (online ou presencial).' })
  listAppointments(@CurrentUser() actor: UserEntity) {
    return this.home.listAppointments(actor);
  }

  /** Detalhe para a tela do exercício: vídeo, instruções, dicas, métricas. */
  @Roles(UserRole.PATIENT)
  @Get('plan/exercises/:prescriptionItemId')
  @ApiOperation({ summary: 'Detalha um exercício da prescrição ativa.' })
  @ApiParam({ name: 'prescriptionItemId', example: 3 })
  @ApiOkResponse({
    description: 'Detalhe do exercício para a tela do app.',
    schema: {
      example: {
        prescriptionId: 2,
        prescriptionItemId: 3,
        exerciseId: 3,
        title: 'Alongamento posterior de coxa',
        videoUrl: 'https://www.youtube.com/watch?v=...',
        description: 'Descrição do exercício.',
        taxonomy: { axis: 'Ortopedia', problem: 'Lombalgia', objective: 'Ganho de amplitude' },
        metrics: { repetitionsRaw: '3x15', series: '3', volume: '15' },
        steps: [
          { order: 1, text: 'Posicione-se conforme o vídeo.' },
          { order: 2, text: 'Execute o movimento com controle.' },
          { order: 3, text: 'Mantenha a respiração ritmada.' },
        ],
        instructions: '1. Posicione-se conforme o vídeo.\n2. Execute o movimento com controle.\n3. Mantenha a respiração ritmada.',
        physiotherapistNotes: 'Dica do fisioterapeuta.',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Prescrição aprovada ou exercício não encontrado neste plano.' })
  getPlanExerciseDetail(
    @CurrentUser() actor: UserEntity,
    @Param('prescriptionItemId', ParseIntPipe) prescriptionItemId: number,
  ) {
    return this.home.getPlanExerciseDetail(actor, prescriptionItemId);
  }

  /** Confirma que o paciente concluiu o exercício; devolve `executionId` para o feedback. */
  @Roles(UserRole.PATIENT)
  @Post('plan/exercises/:prescriptionItemId/complete')
  @ApiOperation({ summary: 'Registra conclusão de exercício e devolve executionId.' })
  @ApiParam({ name: 'prescriptionItemId', example: 3 })
  @ApiOkResponse({
    description: 'Execução criada.',
    schema: {
      example: {
        executionId: 901,
        prescriptionId: 2,
        prescriptionItemId: 3,
        exerciseId: 3,
        performedAt: '2026-05-12T14:30:00.000Z',
        message: 'Execução registrada. Envie o feedback desta sessão em seguida.',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Prescrição aprovada ou exercício não encontrado neste plano.' })
  completePlanExercise(
    @CurrentUser() actor: UserEntity,
    @Param('prescriptionItemId', ParseIntPipe) prescriptionItemId: number,
  ) {
    return this.home.completePlanExercise(actor, prescriptionItemId);
  }

  /** Feedback pós-exercício (dor/esforço + observações), ligado ao registro retornado em complete. */
  @Roles(UserRole.PATIENT)
  @Post('plan/executions/:executionId/feedback')
  @ApiOperation({ summary: 'Registra feedback pós-exercício para uma execução.' })
  @ApiParam({ name: 'executionId', example: 901 })
  @ApiBody({ type: SubmitExerciseFeedbackDto })
  @ApiOkResponse({
    description: 'Feedback registrado.',
    schema: {
      example: {
        executionId: 901,
        prescriptionItemId: 3,
        score: 5,
        notes: 'Leve desconforto ao final do exercício.',
        feedbackRecordedAt: '2026-05-12T14:31:05.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Payload inválido. Score aceito: 0, 2, 5, 8 ou 10.' })
  @ApiNotFoundResponse({ description: 'Execução não encontrada para o paciente ou plano ativo.' })
  @ApiConflictResponse({ description: 'Feedback já registrado para esta execução.' })
  submitExecutionFeedback(
    @CurrentUser() actor: UserEntity,
    @Param('executionId', ParseIntPipe) executionId: number,
    @Body() dto: SubmitExerciseFeedbackDto,
  ) {
    return this.home.submitExecutionFeedback(actor, executionId, dto);
  }

  @Roles(UserRole.PATIENT)
  @Post('pain')
  @ApiOperation({ summary: 'Registra a dor diária do paciente.' })
  @ApiBody({ type: SubmitPainDto })
  @ApiOkResponse({
    description: 'Registro criado ou já existente no dia.',
    schema: {
      example: {
        recorded: true,
        message: 'Registro de dor do dia salvo.',
        painToday: { recorded: true, level: 'NONE', recordedAt: '2026-05-12T13:00:00.000Z' },
      },
    },
  })
  submitPain(@CurrentUser() actor: UserEntity, @Body() dto: SubmitPainDto) {
    return this.home.submitPain(actor, dto.level);
  }

  @Roles(UserRole.PATIENT)
  @Get('motivation')
  @ApiOperation({ summary: 'Retorna mensagem motivacional aleatória ativa.' })
  @ApiOkResponse({
    description: 'Mensagem motivacional ativa.',
    schema: {
      example: { id: 3, message: 'Respire. Ajuste a postura. Continue.' },
    },
  })
  motivation() {
    return this.home.getMotivation();
  }

  @Roles(UserRole.PATIENT)
  @Get('profile')
  @ApiOperation({ summary: 'Retorna perfil do paciente e contatos responsáveis.' })
  @ApiOkResponse({
    description: 'Perfil com coordenadora, especialidade principal e progresso semanal.',
    schema: {
      example: {
        profile: {
          id: 5,
          name: 'Maria Aparecida Souza',
          email: 'paciente1@unifae.local',
          role: 'PATIENT',
          photoUrl: null,
        },
        coordinator: {
          id: 2,
          name: 'Coord. Vanessa',
          email: 'coordenador@unifae.local',
          photoUrl: null,
          primarySpecialty: 'Ortopedia',
          specialties: [{ id: 1, name: 'Ortopedia', isPrimary: true }],
        },
      },
    },
  })
  profile(@CurrentUser() actor: UserEntity) {
    return this.home.getProfile(actor);
  }

  @Roles(UserRole.PATIENT)
  @Post('profile/photo')
  @ApiOperation({ summary: 'Atualiza foto do perfil do paciente logado.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'Foto atualizada.',
    schema: {
      example: { message: 'Foto de perfil atualizada com sucesso.', photoUrl: '/api/v1/app/home/profile/photo/5' },
    },
  })
  @ApiBadRequestResponse({ description: 'Arquivo ausente, formato inválido ou imagem maior que 8MB.' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadPhoto(@CurrentUser() actor: UserEntity, @UploadedFile() file: UploadedMulterFile) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');
    return this.home.uploadProfilePhoto(actor, file);
  }

  @Roles(UserRole.PATIENT)
  @Get('profile/photo/:userId')
  @ApiOperation({ summary: 'Lê foto autorizada para o contexto do paciente.' })
  @ApiParam({ name: 'userId', example: 5 })
  @ApiOkResponse({ description: 'Stream de imagem JPEG, PNG ou WEBP.' })
  @ApiBadRequestResponse({ description: 'Foto não encontrada ou sem permissão.' })
  async readPhoto(
    @CurrentUser() actor: UserEntity,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<StreamableFile> {
    const { stream, mimeType, filename } = await this.home.readProfilePhoto(actor, userId);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `inline; filename="${filename}"`,
    });
  }
}

