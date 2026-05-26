import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalCaseEntity } from '../../database/entities/clinical-case.entity';
import { PatientEntity } from '../../database/entities/patient.entity';
import { PatientCareEpisodeEntity } from '../../database/entities/patient-care-episode.entity';
import { PrescriptionEntity } from '../../database/entities/prescription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CareEpisodeStatus } from '../../database/entities/enums';
import {
  mapCareEpisodeEntity,
  toDateOnly,
  utcDateFromYmd,
  type CareEpisodeResponse,
} from './care-episode.types';
import { CreateCareEpisodeDto } from './dto/create-care-episode.dto';
import { PatchCareEpisodeDto } from './dto/patch-care-episode.dto';
import { PatientsService } from './patients.service';

@Injectable()
export class PatientCareEpisodesService {
  constructor(
    @InjectRepository(PatientCareEpisodeEntity)
    private readonly episodes: Repository<PatientCareEpisodeEntity>,
    @InjectRepository(ClinicalCaseEntity)
    private readonly clinicalCases: Repository<ClinicalCaseEntity>,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptions: Repository<PrescriptionEntity>,
    private readonly patients: PatientsService,
  ) {}

  private async assertClinicalCaseForPatient(
    patient: PatientEntity,
    clinicalCaseId: number | null | undefined,
  ): Promise<void> {
    if (clinicalCaseId == null) return;
    const cc = await this.clinicalCases.findOne({ where: { id: clinicalCaseId } });
    if (!cc || cc.courseId !== patient.courseId || cc.appId !== patient.appId) {
      throw new BadRequestException('Caso clínico inválido para o curso/app do paciente.');
    }
  }

  private async prescriptionCountsByEpisode(
    patientId: number,
    episodeIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (episodeIds.length === 0) return map;
    const raw = await this.prescriptions
      .createQueryBuilder('rx')
      .select('rx.careEpisodeId', 'eid')
      .addSelect('COUNT(*)', 'cnt')
      .where('rx.patientId = :pid', { pid: patientId })
      .andWhere('rx.careEpisodeId IN (:...ids)', { ids: episodeIds })
      .groupBy('rx.careEpisodeId')
      .getRawMany<{ eid: number | null; cnt: string }>();
    for (const r of raw) {
      if (r.eid != null) map.set(Number(r.eid), Number(r.cnt));
    }
    return map;
  }

  async list(actor: UserEntity, patientId: number): Promise<CareEpisodeResponse[]> {
    const patient = await this.patients.loadPatientWithAccess(actor, patientId);
    const rows = await this.episodes.find({
      where: { patientId: patient.id },
      relations: { clinicalCase: true },
      order: { startedAt: 'DESC', id: 'DESC' },
    });
    const ids = rows.map((r) => r.id);
    const counts = await this.prescriptionCountsByEpisode(patient.id, ids);
    return rows.map((e) => mapCareEpisodeEntity(e, counts.get(e.id) ?? 0));
  }

  async create(
    actor: UserEntity,
    patientId: number,
    dto: CreateCareEpisodeDto,
  ): Promise<CareEpisodeResponse> {
    const patient = await this.patients.loadPatientWithAccess(actor, patientId);
    await this.assertClinicalCaseForPatient(patient, dto.clinicalCaseId ?? null);

    const status = dto.status ?? CareEpisodeStatus.ACTIVE;
    let startedStr =
      dto.startedAt && dto.startedAt.trim()
        ? dto.startedAt.trim().slice(0, 10)
        : toDateOnly(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startedStr)) {
      throw new BadRequestException('Data de início inválida.');
    }
    let endedStr: string | null =
      dto.endedAt && dto.endedAt.trim() ? dto.endedAt.trim().slice(0, 10) : null;
    if (endedStr && !/^\d{4}-\d{2}-\d{2}$/.test(endedStr)) {
      throw new BadRequestException('Data de término inválida.');
    }
    if (status === CareEpisodeStatus.RESOLVED && !endedStr) {
      endedStr = toDateOnly(new Date());
    }

    const row = this.episodes.create({
      patientId: patient.id,
      clinicalCaseId: dto.clinicalCaseId ?? null,
      title: dto.title.trim(),
      description: dto.description?.trim() ? dto.description.trim() : null,
      status,
      startedAt: utcDateFromYmd(startedStr),
      endedAt: endedStr ? utcDateFromYmd(endedStr) : null,
    });
    const saved = await this.episodes.save(row);
    const full = await this.episodes.findOne({
      where: { id: saved.id },
      relations: { clinicalCase: true },
    });
    if (!full) throw new NotFoundException('Episódio não encontrado.');
    return mapCareEpisodeEntity(full, 0);
  }

  async patch(
    actor: UserEntity,
    patientId: number,
    episodeId: number,
    dto: PatchCareEpisodeDto,
  ): Promise<CareEpisodeResponse> {
    const patient = await this.patients.loadPatientWithAccess(actor, patientId);
    const row = await this.episodes.findOne({
      where: { id: episodeId, patientId },
      relations: { clinicalCase: true },
    });
    if (!row) throw new NotFoundException('Episódio não encontrado.');

    if (dto.clinicalCaseId !== undefined) {
      await this.assertClinicalCaseForPatient(patient, dto.clinicalCaseId);
      row.clinicalCaseId = dto.clinicalCaseId;
    }
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ? dto.description.trim() : null;
    }
    if (dto.startedAt !== undefined) {
      const s = dto.startedAt.trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        throw new BadRequestException('Data de início inválida.');
      }
      row.startedAt = utcDateFromYmd(s);
    }
    if (dto.endedAt !== undefined) {
      if (dto.endedAt == null || !dto.endedAt.trim()) {
        row.endedAt = null;
      } else {
        const s = dto.endedAt.trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          throw new BadRequestException('Data de término inválida.');
        }
        row.endedAt = utcDateFromYmd(s);
      }
    }
    if (dto.status !== undefined) {
      row.status = dto.status;
      if (dto.status === CareEpisodeStatus.RESOLVED && row.endedAt == null && dto.endedAt === undefined) {
        row.endedAt = utcDateFromYmd(toDateOnly(new Date()));
      }
      if (dto.status === CareEpisodeStatus.ACTIVE && dto.endedAt === undefined) {
        row.endedAt = null;
      }
    }

    await this.episodes.save(row);
    const full = await this.episodes.findOne({
      where: { id: row.id },
      relations: { clinicalCase: true },
    });
    if (!full) throw new NotFoundException('Episódio não encontrado.');
    const counts = await this.prescriptionCountsByEpisode(patientId, [full.id]);
    return mapCareEpisodeEntity(full, counts.get(full.id) ?? 0);
  }
}
