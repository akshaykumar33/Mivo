import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    if (metadata && metadata.type !== 'body') {
      return value;
    }
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Input validation failed',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            issue: e.message,
          })),
        });
      }
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Invalid input data',
      });
    }
  }
}
