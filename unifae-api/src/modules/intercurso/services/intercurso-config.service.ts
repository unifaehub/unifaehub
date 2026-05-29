import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntercursoConfigEntity } from '../../../database/entities/intercurso-config.entity';
import { UpdateIntercursoConfigDto } from '../dto/update-intercurso-config.dto';

@Injectable()
export class IntercursoConfigService {
  constructor(
    @InjectRepository(IntercursoConfigEntity)
    private readonly configs: Repository<IntercursoConfigEntity>,
  ) {}

  async get(): Promise<IntercursoConfigEntity> {
    let cfg = await this.configs.findOne({ where: { id: 1 } });
    if (!cfg) {
      cfg = this.configs.create({ id: 1 });
      cfg = await this.configs.save(cfg);
    }
    return cfg;
  }

  async update(dto: UpdateIntercursoConfigDto): Promise<IntercursoConfigEntity> {
    let cfg = await this.configs.findOne({ where: { id: 1 } });
    if (!cfg) {
      cfg = this.configs.create({ id: 1 });
    }
    Object.assign(cfg, dto);
    return this.configs.save(cfg);
  }
}
