import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { Repository } from 'typeorm';
import { EvaluationEntity } from '../../../database/entities/evaluation.entity';
import { PresentationRoomEntity } from '../../../database/entities/presentation-room.entity';
import { MailService } from '../../identity-access/mail.service';

@Processor('evidence-report')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    @InjectRepository(EvaluationEntity)
    private readonly evaluations: Repository<EvaluationEntity>,
    @InjectRepository(PresentationRoomEntity)
    private readonly rooms: Repository<PresentationRoomEntity>,
    private readonly mail: MailService,
  ) {}

  @Process('send-report')
  async handleSendReport(job: Job<{ salaId: number; professorId: number; dataEvento: string }>) {
    const { salaId, professorId, dataEvento } = job.data;

    const room = await this.rooms.findOne({
      where: { id: salaId },
      relations: ['trabalho', 'trabalho.aluno', 'professorLider', 'banca', 'banca.professor'],
    });
    if (!room) {
      this.logger.warn(`Report job: sala ${salaId} não encontrada.`);
      return;
    }

    const evaluations = await this.evaluations.find({
      where: { trabalhoId: room.trabalhoId },
      relations: ['pergunta', 'professor'],
    });

    const rows = evaluations.map((e) => ({
      professor: e.professor?.name ?? '-',
      pergunta: e.pergunta?.textoPergunta ?? '-',
      tipo: e.pergunta?.tipo ?? '-',
      nota: e.nota ?? 0,
      status: e.statusApresentacao,
      comentario: e.comentario ?? '',
    }));

    const professorEmail = room.professorLider?.email;
    if (!professorEmail) {
      this.logger.warn(`Report job: professor líder sem email — sala ${salaId}`);
      return;
    }

    try {
      await this.mail.sendDayClosureReport({
        to: professorEmail,
        recipientName: room.professorLider?.name,
        dataEvento,
        trabalhoTitulo: room.trabalho?.titulo ?? '-',
        rows,
      });
      this.logger.log(`Relatório de fechamento enviado para ${professorEmail} — sala ${salaId}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar relatório de fechamento — sala ${salaId}`, err);
    }
  }
}
