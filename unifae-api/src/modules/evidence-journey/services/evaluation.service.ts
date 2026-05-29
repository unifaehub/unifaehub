import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomWorkEntity } from '../../../database/entities/room-work.entity';
import { RoomBestWorkEntity } from '../../../database/entities/room-best-work.entity';
import { DynamicQuestionEntity } from '../../../database/entities/dynamic-question.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { PresentationStatus } from '../../../database/entities/enums';
import { SubmitEvaluationDto } from '../dto/submit-evaluation.dto';
import { CloseRoomDto } from '../dto/close-room.dto';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    @InjectRepository(RoomWorkEntity)
    private readonly roomWorks: Repository<RoomWorkEntity>,
    @InjectRepository(RoomBestWorkEntity)
    private readonly bestWorks: Repository<RoomBestWorkEntity>,
    @InjectRepository(DynamicQuestionEntity)
    private readonly questions: Repository<DynamicQuestionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectQueue('evidence-report')
    private readonly reportQueue: Queue,
  ) {}

  async getMyRooms(professorId: number) {
    const rooms = await this.rooms
      .createQueryBuilder('r')
      .andWhere(
        'r.id IN (SELECT rp.sala_id FROM room_professors rp WHERE rp.professor_id = :pid)',
        { pid: professorId },
      )
      .leftJoinAndSelect('r.works', 'rw')
      .leftJoinAndSelect('rw.trabalho', 'w')
      .leftJoinAndSelect('w.aluno', 'a')
      .leftJoinAndSelect('r.banca', 'banca')
      .leftJoinAndSelect('banca.professor', 'bancaProf')
      .leftJoinAndSelect('r.professorLider', 'lider')
      .where('r.fechada = false')
      .orderBy('r.dataEvento', 'ASC')
      .addOrderBy('rw.ordem', 'ASC')
      .getMany();

    return rooms;
  }

  async submitEvaluation(
    salaId: number,
    trabalhoId: number,
    professorId: number,
    dto: SubmitEvaluationDto,
  ) {
    const room = await this.rooms.findOne({
      where: { id: salaId },
      relations: ['banca'],
    });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    if (room.fechada) throw new ForbiddenException('Sala já foi fechada.');

    const isProfessorInRoom = room.banca.some((rp) => rp.professorId === professorId);
    if (!isProfessorInRoom) throw new ForbiddenException('Você não pertence a esta sala.');

    // Validar que o trabalho pertence a esta sala
    const rw = await this.roomWorks.findOne({ where: { salaId, trabalhoId } });
    if (!rw) throw new BadRequestException('Trabalho não pertence a esta sala.');

    const statusRecord = await this.evaluations.findOne({
      where: { trabalhoId, professorId, perguntaId: IsNull() },
    });
    if (statusRecord) {
      throw new BadRequestException(
        `Este trabalho já foi marcado como ${statusRecord.statusApresentacao} e não pode ser alterado.`,
      );
    }

    if (dto.statusApresentacao !== PresentationStatus.PRESENTE) {
      await this.evaluations
        .createQueryBuilder()
        .insert()
        .into(EvaluationEntity)
        .values({
          trabalhoId,
          professorId,
          perguntaId: null as unknown as number,
          nota: null as unknown as number,
          statusApresentacao: dto.statusApresentacao,
        } as any)
        .execute();
      return { saved: 1 };
    }

    if (!dto.respostas?.length) {
      throw new BadRequestException('Respostas são obrigatórias para status Presente.');
    }

    const incomingIds = dto.respostas.map((r) => r.perguntaId);
    const alreadyAnswered = await this.evaluations.find({
      where: { trabalhoId, professorId, perguntaId: In(incomingIds) },
    });
    if (alreadyAnswered.length > 0) {
      throw new BadRequestException(
        'Você já enviou avaliação para este conjunto de perguntas. ' +
        'Resumo e Apresentação podem ser enviados separadamente, mas não em duplicata.',
      );
    }

    const rows = dto.respostas.map((r) => ({
      trabalhoId,
      professorId,
      perguntaId: r.perguntaId,
      nota: r.nota ?? null,
      comentario: (dto as any).comentario ?? null,
      statusApresentacao: PresentationStatus.PRESENTE,
    }));

    await this.evaluations
      .createQueryBuilder()
      .insert()
      .into(EvaluationEntity)
      .values(rows as any)
      .execute();

    return { saved: rows.length };
  }

  /**
   * Retorna status de avaliação do professor para TODOS os trabalhos da sala.
   */
  async getMyEvalStatus(salaId: number, professorId: number) {
    const room = await this.rooms.findOne({
      where: { id: salaId },
      select: ['id', 'fechada'],
    });
    if (!room) throw new NotFoundException('Sala não encontrada.');

    const rws = await this.roomWorks.find({
      where: { salaId },
      relations: ['trabalho', 'trabalho.aluno'],
      order: { ordem: 'ASC' },
    });

    const trabIds = rws.map((rw) => rw.trabalhoId);
    const evals   = trabIds.length
      ? await this.evaluations.find({ where: { trabalhoId: In(trabIds), professorId } })
      : [];

    const works = rws.map((rw) => {
      const profEvals       = evals.filter((e) => e.trabalhoId === rw.trabalhoId);
      const statusRecord    = profEvals.find((e) => e.perguntaId == null);
      const submittedPergIds = profEvals.filter((e) => e.perguntaId != null).map((e) => e.perguntaId!);

      return {
        trabalhoId:          rw.trabalhoId,
        titulo:              rw.trabalho?.titulo ?? '',
        cursoTrabalho:       rw.trabalho?.cursoTrabalho ?? '',
        alunoNome:           rw.trabalho?.aluno?.name ?? null,
        statusApresentacao:  statusRecord?.statusApresentacao ?? null,
        submittedPerguntaIds: submittedPergIds,
        ordem:               rw.ordem,
      };
    });

    return { salaId, fechada: room.fechada, works };
  }

  async closeRoom(salaId: number, professorId: number, dto: CloseRoomDto) {
    const room = await this.rooms.findOne({
      where: { id: salaId, professorLiderId: professorId },
      relations: ['banca'],
    });
    if (!room) throw new NotFoundException('Sala não encontrada ou você não é o líder da sala.');
    if (room.fechada) throw new BadRequestException('Sala já foi fechada.');

    const professor = await this.users.findOne({ where: { id: professorId } });
    if (!professor) throw new NotFoundException('Professor não encontrado.');

    const passwordOk = await bcrypt.compare(dto.senha, professor.password);
    if (!passwordOk) throw new UnauthorizedException('Senha incorreta.');

    // Verificar se todos da banca avaliaram todos os trabalhos da sala
    const activeQuestions = await this.questions.find({ where: { ativo: true } });
    const bancaProfIds    = (room.banca ?? []).map((rp) => rp.professorId);
    const rws             = await this.roomWorks.find({ where: { salaId } });
    const trabIds         = rws.map((rw) => rw.trabalhoId);

    const evals = await this.evaluations.find({
      where: { trabalhoId: In(trabIds), professorId: In(bancaProfIds) },
    });

    const missing: string[] = [];
    for (const pid of bancaProfIds) {
      for (const tid of trabIds) {
        const profEvals   = evals.filter((e) => e.professorId === pid && e.trabalhoId === tid);
        const statusRec   = profEvals.find((e) => e.perguntaId == null);
        if (statusRec && statusRec.statusApresentacao !== PresentationStatus.PRESENTE) continue;

        const answeredIds   = new Set(profEvals.filter((e) => e.perguntaId != null).map((e) => e.perguntaId));
        const missingResumo = activeQuestions.filter((q) => q.tipo === 'Resumo' && !answeredIds.has(q.id));
        const missingApres  = activeQuestions.filter((q) => q.tipo === 'Apresentação' && !answeredIds.has(q.id));

        const bancaEntry = room.banca.find((b) => b.professorId === pid);
        const profName   = (bancaEntry as any)?.professor?.name ?? `Prof. #${pid}`;
        const rw         = rws.find((r) => r.trabalhoId === tid);
        const trabLabel  = rw?.trabalho?.titulo ? `"${rw.trabalho.titulo}"` : `#${tid}`;

        if (missingResumo.length) missing.push(`${profName} · ${trabLabel}: faltam ${missingResumo.length} avaliação(ões) de Resumo`);
        if (missingApres.length)  missing.push(`${profName} · ${trabLabel}: faltam ${missingApres.length} avaliação(ões) de Apresentação`);
      }
    }

    if (missing.length) {
      throw new BadRequestException(
        `Não é possível fechar a sala. Avaliações pendentes:\n${missing.join('\n')}`,
      );
    }

    if (dto.melhorTrabalhoId) {
      const existing = await this.bestWorks.findOne({ where: { salaId } });
      if (!existing) {
        await this.bestWorks.save(this.bestWorks.create({ salaId, trabalhoId: dto.melhorTrabalhoId }));
      }
    }

    await this.rooms
      .createQueryBuilder()
      .update(PresentationRoomEntity)
      .set({ fechada: true })
      .where('id = :id', { id: salaId })
      .execute();

    try {
      await this.reportQueue.add('send-report', { salaId, professorId, dataEvento: room.dataEvento });
    } catch (e) {
      console.warn('[closeRoom] Fila de relatório indisponível:', (e as Error).message);
    }

    return { fechada: true };
  }

  async getQuestions() {
    return this.questions.find({
      where: { ativo: true },
      order: { tipo: 'ASC', ordem: 'ASC' },
    });
  }
}
