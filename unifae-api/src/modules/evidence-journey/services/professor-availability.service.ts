import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProfessorAvailabilityEntity } from '../../../database/entities/professor-availability.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { UserRole } from '../../../database/entities/enums';

@Injectable()
export class ProfessorAvailabilityService {
  constructor(
    @InjectRepository(ProfessorAvailabilityEntity)
    private readonly availabilities: Repository<ProfessorAvailabilityEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async listProfessors() {
    return this.users.find({
      where: { role: UserRole.PROFESSOR, deletedAt: IsNull() },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'registroFuncional', 'cursoBase', 'diasSemana'],
    });
  }

  async setSchedule(professorId: number, diasSemana: string[] | null) {
    const professor = await this.users.findOne({
      where: { id: professorId, role: UserRole.PROFESSOR },
    });
    if (!professor) throw new Error('Professor não encontrado.');
    professor.diasSemana = diasSemana?.length ? diasSemana : null;
    await this.users.save(professor);
    return { id: professorId, diasSemana: professor.diasSemana };
  }

  async getAvailabilities(dataEvento?: string) {
    const qb = this.availabilities
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.professor', 'p')
      .orderBy('a.dataEvento', 'ASC');
    if (dataEvento) qb.where('a.dataEvento = :dataEvento', { dataEvento });
    return qb.getMany();
  }

  /**
   * Retorna professores NÃO cadastrados para a data que têm disponibilidade semanal
   * compatível com o dia da semana da data.
   */
  async getEligibleForDate(dataEvento: string) {
    const dayStr = this.weekdayStr(dataEvento);
    const all = await this.users.find({
      where: { role: UserRole.PROFESSOR, deletedAt: IsNull() },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'registroFuncional', 'cursoBase', 'diasSemana'],
    });
    const registered = await this.availabilities.find({ where: { dataEvento } });
    const registeredIds = new Set(registered.map((a) => a.professorId));

    return all.filter((p) => {
      if (registeredIds.has(p.id)) return false;
      if (!dayStr) return false; // fim de semana
      if (!p.diasSemana?.length) return true; // sem restrição → sempre disponível
      return p.diasSemana.includes(dayStr);
    });
  }

  /**
   * Registra automaticamente todos os professores elegíveis para a data.
   */
  async autoRegister(dataEvento: string) {
    const dayStr = this.weekdayStr(dataEvento);
    if (!dayStr) throw new BadRequestException('A data selecionada é um fim de semana.');

    const all = await this.users.find({
      where: { role: UserRole.PROFESSOR, deletedAt: IsNull() },
    });
    const registered = await this.availabilities.find({ where: { dataEvento } });
    const registeredIds = new Set(registered.map((a) => a.professorId));

    const eligible = all.filter((p) => {
      if (registeredIds.has(p.id)) return false;
      if (!p.diasSemana?.length) return true;
      return p.diasSemana.includes(dayStr);
    });

    for (const prof of eligible) {
      await this.availabilities.save(
        this.availabilities.create({ professorId: prof.id, dataEvento }),
      );
    }

    return {
      registered:   eligible.length,
      jaRegistrados: registeredIds.size,
      total:         registered.length + eligible.length,
    };
  }

  async addAvailability(professorId: number, dataEvento: string) {
    const professor = await this.users.findOne({
      where: { id: professorId, role: UserRole.PROFESSOR },
    });
    if (!professor) throw new NotFoundException('Professor não encontrado.');

    const existing = await this.availabilities.findOne({ where: { professorId, dataEvento } });
    if (existing) throw new BadRequestException('Disponibilidade já cadastrada.');

    const avail = this.availabilities.create({ professorId, dataEvento });
    return this.availabilities.save(avail);
  }

  async removeAvailability(id: number) {
    const avail = await this.availabilities.findOne({ where: { id } });
    if (!avail) throw new NotFoundException('Disponibilidade não encontrada.');
    await this.availabilities.remove(avail);
  }

  private weekdayStr(dataEvento: string): string | null {
    const jsDay = new Date(dataEvento + 'T12:00:00').getDay();
    return jsDay === 0 || jsDay === 6 ? null : String(jsDay);
  }
}
