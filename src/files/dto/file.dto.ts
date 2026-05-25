// src/modules/file/dto/file.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum EntityType {
  USER = 'User',
  PRODUCT = 'Product',
  COMPANY_INFO = 'CompanyInfo',
  EVENT = 'Event',
  APPLICATION = 'Application',
}

export class UploadFileDto {
  @IsString()
  entityType: EntityType;

  @IsString()
  entityId: string;

  @IsString()
  fieldName: string;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  originalName?: string;
}

export class FileResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  createdAt: Date;
  updatedAt: Date;
}