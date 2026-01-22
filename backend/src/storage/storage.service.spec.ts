import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { StorageService, UploadedFile } from './storage.service';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageService', () => {
  let service: StorageService;
  const testUploadDir = './test-uploads';
  const testBaseUrl = 'http://localhost:4000/uploads/images';

  beforeAll(() => {
    // 테스트 디렉토리 생성
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 테스트 디렉토리 정리
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'UPLOAD_DIR') return testUploadDir;
              if (key === 'UPLOAD_BASE_URL') return testBaseUrl;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('validateFile', () => {
    it('should accept valid image files', () => {
      const validFile: UploadedFile = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
      };

      expect(() => service.validateFile(validFile)).not.toThrow();
    });

    it('should reject invalid mime types', () => {
      const invalidFile: UploadedFile = {
        fieldname: 'image',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1024,
      };

      expect(() => service.validateFile(invalidFile)).toThrow(
        BadRequestException,
      );
    });

    it('should reject files exceeding max size', () => {
      const largeFile: UploadedFile = {
        fieldname: 'image',
        originalname: 'large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 15 * 1024 * 1024, // 15MB
      };

      expect(() => service.validateFile(largeFile)).toThrow(BadRequestException);
    });

    it('should accept all allowed image formats', () => {
      const formats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      formats.forEach((mimetype) => {
        const file: UploadedFile = {
          fieldname: 'image',
          originalname: 'test.img',
          encoding: '7bit',
          mimetype,
          buffer: Buffer.from('test'),
          size: 1024,
        };

        expect(() => service.validateFile(file)).not.toThrow();
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload a file and return stored file info', async () => {
      const file: UploadedFile = {
        fieldname: 'image',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake image data'),
        size: 15,
      };

      const userId = 'test-user-123';
      const result = await service.uploadFile(file, userId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.originalFileName).toBe('test-image.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileSize).toBe(15);
      expect(result.url).toContain(testBaseUrl);
      expect(result.key).toContain(userId);

      // 파일이 실제로 저장되었는지 확인
      expect(service.fileExists(result.key)).toBe(true);
    });

    it('should create user directory if not exists', async () => {
      const file: UploadedFile = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 4,
      };

      const userId = 'new-user-456';
      const result = await service.uploadFile(file, userId);

      const userDir = path.join(testUploadDir, userId);
      expect(fs.existsSync(userDir)).toBe(true);

      // 정리
      await service.deleteFile(result.key);
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files', async () => {
      const files: UploadedFile[] = [
        {
          fieldname: 'images',
          originalname: 'image1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('image1'),
          size: 6,
        },
        {
          fieldname: 'images',
          originalname: 'image2.png',
          encoding: '7bit',
          mimetype: 'image/png',
          buffer: Buffer.from('image2'),
          size: 6,
        },
      ];

      const userId = 'multi-upload-user';
      const results = await service.uploadFiles(files, userId);

      expect(results).toHaveLength(2);
      expect(results[0].originalFileName).toBe('image1.jpg');
      expect(results[1].originalFileName).toBe('image2.png');

      // 정리
      await service.deleteFiles(results.map((r) => r.key));
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      const file: UploadedFile = {
        fieldname: 'image',
        originalname: 'to-delete.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('delete me'),
        size: 9,
      };

      const userId = 'delete-test-user';
      const result = await service.uploadFile(file, userId);

      expect(service.fileExists(result.key)).toBe(true);

      await service.deleteFile(result.key);

      expect(service.fileExists(result.key)).toBe(false);
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(
        service.deleteFile('non-existent/file.jpg'),
      ).resolves.not.toThrow();
    });
  });
});
