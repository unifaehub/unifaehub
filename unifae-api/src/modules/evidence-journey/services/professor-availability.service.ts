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

  async addAvailability(professorId: number, dataEvento: string) {
    const professor = await this.users.findOne({
      where: { id: professorId, role: UserRole.PROFESSOR },
    });
    if (!professor) throw new NotFoundException('Professor não encontrado.');

    const existing = await this.availabilities.findOne({
      where: { professorId, dataEvento },
    });
    if (existing) throw new BadRequestException('Disponibilidade já cadastrada.');

    const avail = this.availabilities.create({ professorId, dataEvento });
    return this.availabilities.save(avail);
  }

  async removeAvailability(id: number) {
    const avail = await this.availabilities.findOne({ where: { id } });
    if (!avail) throw new NotFoundException('Disponibilidade não encontrada.');
    await this.availabilities.remove(avail);
  }
}
