import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Escala da UI "Como você se sentiu?" (sessão finalizada): 0, 2, 5, 8 ou 10. */
export const POST_EXERCISE_SCORE_VALUES = [0, 2, 5, 8, 10] as const;

export class SubmitExerciseFeedbackDto {
  @ApiProperty({
    enum: POST_EXERCISE_SCORE_VALUES,
    example: 5,
    description: 'Escala de dor/esforço após a execução.',
  })
  @IsIn([0, 2, 5, 8, 10])
  score: number;

  @ApiPropertyOptional({
    example: 'Leve desconforto ao final do exercício.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
