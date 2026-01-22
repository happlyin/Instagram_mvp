import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StoredFile {
  url: string;
  key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(private configService: ConfigService) {
    this.uploadDir =
      configService.get<string>('UPLOAD_DIR') || './uploads/images';
    this.baseUrl =
      configService.get<string>('UPLOAD_BASE_URL') ||
      'http://localhost:4000/uploads/images';

    // 업로드 디렉토리 생성
    this.ensureDirectoryExists(this.uploadDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  validateFile(file: UploadedFile): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `허용되지 않는 파일 형식입니다. 허용 형식: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `파일 크기가 너무 큽니다. 최대 크기: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  async uploadFile(file: UploadedFile, userId: string): Promise<StoredFile> {
    this.validateFile(file);

    // 파일명 생성: userId/timestamp-uuid.ext
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID();
    const fileName = `${timestamp}-${uniqueId}${ext}`;

    // 사용자별 디렉토리 생성
    const userDir = path.join(this.uploadDir, userId);
    this.ensureDirectoryExists(userDir);

    const filePath = path.join(userDir, fileName);
    const key = `${userId}/${fileName}`;

    // 파일 저장
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async uploadFiles(
    files: UploadedFile[],
    userId: string,
  ): Promise<StoredFile[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, userId));
    return Promise.all(uploadPromises);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }

  fileExists(key: string): boolean {
    return fs.existsSync(this.getFilePath(key));
  }
}
