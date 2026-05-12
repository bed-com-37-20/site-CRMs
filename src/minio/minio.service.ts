import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>(
        'MINIO_ENDPOINT',
        'localhost',
      ),
      port: this.configService.get<number>('MINIO_PORT', 9000),
     useSSL: false,
      accessKey: this.configService.get<string>(
        'MINIO_ACCESS_KEY',
        'admin',
      ),
      secretKey: this.configService.get<string>(
        'MINIO_SECRET_KEY',
        'banda@123',
      ),
    });
  }

  /**
   * Upload a file to MinIO
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   * @param fileContent - File content as buffer or stream
   * @param mimetype - MIME type of the file
   * @returns Object metadata
   */
  async uploadFile(
    bucketName: string,
    fileName: string,
    fileContent: Buffer | Readable,
    mimetype: string,
  ): Promise<any> {
    // Create bucket if it doesn't exist
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await this.minioClient.makeBucket(bucketName, 'us-east-1');
    }

    return await this.minioClient.putObject(
      bucketName,
      fileName,
      fileContent,
      undefined,
      { 'Content-Type': mimetype },
    );
  }

  /**
   * Get a presigned URL for downloading a file
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   * @param expiresIn - Expiration time in seconds (default 7 days)
   * @returns Presigned URL
   */
  async getPresignedUrl(
    bucketName: string,
    fileName: string,
    expiresIn: number = 7 * 24 * 60 * 60, // 7 days default
  ): Promise<string> {
    return await this.minioClient.presignedGetObject(
      bucketName,
      fileName,
      expiresIn,
    );
  }

  /**
   * Delete a file from MinIO
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   */
  async deleteFile(bucketName: string, fileName: string): Promise<void> {
    await this.minioClient.removeObject(bucketName, fileName);
  }

  /**
   * Check if a file exists
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   */
  async fileExists(bucketName: string, fileName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucketName, fileName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   */
  async getFileMetadata(bucketName: string, fileName: string): Promise<any> {
    return await this.minioClient.statObject(bucketName, fileName);
  }

  /**
   * Get file as a stream
   * @param bucketName - Name of the bucket
   * @param fileName - Name of the file
   */
  async getFileStream(bucketName: string, fileName: string): Promise<Readable> {
    return await this.minioClient.getObject(bucketName, fileName);
  }

  /**
   * Get MinIO client instance
   */
  getClient(): Minio.Client {
    return this.minioClient;
  }
}
