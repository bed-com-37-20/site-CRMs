import { ApiProperty } from '@nestjs/swagger';

export class GetCurrentUserDto {
  @ApiProperty({
    description: 'JWT token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
