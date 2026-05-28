import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomBestWorkEntity } from '../../../database/entities/room-best-work.entity';
import { DynamicQuestionEntity } from '../../../database/entities/dynamic-question.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { PresentationStatus } from '../../../database/entities/enums';
import { SubmitEvaluationDto } from '../dto/submit-evaluation.dto';
import { CloseRoomDto } from '../dto/close-room.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
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
    return this.rooms
      .createQueryBuilder('r')
      .innerJoin('r.banca', 'rp', 'rp.professorId = :pid', { pid: professorId })
      .leftJoinAndSelect('r.trabalho', 'w')
      .leftJoinAndSelect('w.aluno', 'a')
      .where('r.fechada = false')
      .orderBy('r.dataEvento', 'ASC')
      .getMany();
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

    if (room.trabalhoId !== trabalhoId) {
      throw new BadRequestException('Trabalho não pertence a esta sala.');
    }

    // Verificar se já avaliou
    const existing = await this.evaluations.findOne({
      where: { trabalhoId, professorId, perguntaId: null as unknown as number },
    });
    if (existing) throw new BadRequestException('Avaliação já enviada para este trabalho.');

    // Ausente/Indeferido: salvar apenas status sem notas
    if (dto.statusApresentacao !== PresentationStatus.PRESENTE) {
      // Usar plain object para evitar conflito de tipos com relações no .values()
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

    // Presente: salvar notas por pergunta
    if (!dto.respostas?.length) {
      throw new BadRequestException('Respostas são obrigatórias para status Presente.');
    }

    const rows = dto.respostas.map((r) => ({
      trabalhoId,
      professorId,
      perguntaId: r.perguntaId,
      nota: r.nota ?? null,
      comentario: r.comentario ?? null,
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

  async closeRoom(salaId: number, professorId: number, dto: CloseRoomDto) {
    const room = await this.rooms.findOne({
      where: { id: salaId, professorLiderId: professorId },
    });
    if (!room) throw new NotFoundException('Sala não encontrada ou você não é o líder.');
    if (room.fechada) throw new BadRequestException('Sala já foi fechada.');

    const professor = await this.users.findOne({ where: { id: professorId } });
    if (!professor) throw new NotFoundException('Professor não encontrado.');

    const passwordOk = await bcrypt.compare(dto.senha, professor.password);
    if (!passwordOk) throw new UnauthorizedException('Senha incorreta.');

    if (dto.melhorTrabalhoId) {
      const existing = await this.bestWorks.findOne({ where: { salaId } });
      if (!existing) {
        await this.bestWorks.save(
          this.bestWorks.create({ salaId, trabalhoId: dto.melhorTrabalhoId }),
        );
      }
    }

    room.fechada = true;
    await this.rooms
      .createQueryBuilder()
      .update(PresentationRoomEntity)
      .set({ fechada: true })
      .where('id = :id', { id: salaId })
      .execute();

    await this.reportQueue.add('send-report', {
      salaId,
      professorId,
      dataEvento: room.dataEvento,
    });

    return { fechada: true };
  }

  async getQuestions() {
    return this.questions.find({
      where: { ativo: true },
      order: { tipo: 'ASC', ordem: 'ASC' },
    });
  }
}
