import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminNoteEntity } from '../../database/entities/admin-note.entity';
import { AdminNotesController } from './admin-notes.controller';
import { AdminNotesService } from './admin-notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminNoteEntity])],
  controllers: [AdminNotesController],
  providers: [AdminNotesService],
})
export class AdminNotesModule {}

