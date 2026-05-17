import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * M10 fix: Validates that a route param matches CUID format.
 * CUID format: starts with 'c' followed by 20-30 lowercase alphanumeric characters.
 *
 * Usage: @Param('id', CuidValidationPipe) id: string
 */
@Injectable()
export class CuidValidationPipe implements PipeTransform<string, string> {
  private static readonly CUID_REGEX = /^c[a-z0-9]{20,30}$/;

  transform(value: string): string {
    if (!CuidValidationPipe.CUID_REGEX.test(value)) {
      throw new BadRequestException(`Invalid ID format: "${value}" is not a valid CUID`);
    }
    return value;
  }
}
