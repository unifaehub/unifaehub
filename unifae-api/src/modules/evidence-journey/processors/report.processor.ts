import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bull';
import { In, Repository } from 'typeorm';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { RoomWorkEntity } from '../../../database/entities/room-work.entity';
import { MailService } from '../../identity-access/mail.service';

@Processor('evidence-report')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    @InjectRepository(RoomWorkEntity)
    private readonly roomWorks: Repository<RoomWorkEntity>,
    private readonly mail: MailService,
  ) {}

  @Process('send-report')
  async handleSendReport(job: Job<{ salaId: number; professorId: number; dataEvento: string }>) {
    const { salaId, dataEvento } = job.data;

    const room = await this.rooms.findOne({
      where: { id: salaId },
      relations: ['professorLider', 'banca', 'banca.professor'],
    });
    if (!room) {
      this.logger.warn(`Report job: sala ${salaId} não encontrada.`);
      return;
    }

    const rws      = await this.roomWorks.find({
      where: { salaId },
      relations: ['trabalho', 'trabalho.aluno'],
      order: { ordem: 'ASC' },
    });
    const trabIds  = rws.map((rw) => rw.trabalhoId);
    const evaluations = trabIds.length
      ? await this.evaluations.find({
          where: { trabalhoId: In(trabIds) },
          relations: ['pergunta', 'professor'],
        })
      : [];

    const rows = evaluations.map((e) => ({
      professor:  e.professor?.name ?? '-',
      pergunta:   e.pergunta?.textoPergunta ?? '-',
      tipo:       e.pergunta?.tipo ?? '-',
      nota:       e.nota ?? 0,
      status:     e.statusApresentacao,
      comentario: e.comentario ?? '',
      trabalho:   rws.find((rw) => rw.trabalhoId === e.trabalhoId)?.trabalho?.titulo ?? '-',
    }));

    const professorEmail = room.professorLider?.email;
    if (!professorEmail) {
      this.logger.warn(`Report job: professor líder sem email — sala ${salaId}`);
      return;
    }

    const titulosSala = rws.map((rw) => rw.trabalho?.titulo ?? '-').join(', ');

    try {
      await this.mail.sendDayClosureReport({
        to:            professorEmail,
        recipientName: room.professorLider?.name,
        dataEvento,
        trabalhoTitulo: titulosSala,
        rows,
      });
      this.logger.log(`Relatório de fechamento enviado para ${professorEmail} — sala ${salaId}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar relatório de fechamento — sala ${salaId}`, err);
    }
  }
}
