import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from 'src/common/dto/upload-file.dto/upload-file.dto';
import { FileUploadJobPayload } from './upload.processor';
import { FILE_UPLOAD_QUEUE } from './upload.constants';

@Injectable()
export class UploadService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
    @InjectQueue(FILE_UPLOAD_QUEUE) private readonly uploadQueue: Queue,
  ) { }

  //   uploadSingleFile
  async uploadSingleFile(file: Express.Multer.File, dto: UploadFileDto) {
    const folder = dto.folder || 'file-uploads';
    const uploadResult: any = await this.cloudinaryService.uploadFile(file, folder);

    // Save metadata to PostgreSQL
    const savedMetadata = await this.prisma.fileMetadata.create({
      data: {
        originalName: file.originalname,
        filename: uploadResult.public_id,
        mimetype: file.mimetype,
        size: file.size,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        folderPath: folder,
        batchId: dto.batchId || null,
      },
    });

    return {
      message: 'File uploaded successfully',
      data: savedMetadata,
    };
  }

  //   uploadMultipleFiles
  async uploadMultipleFiles(files: Express.Multer.File[], dto: UploadFileDto) {
    const batchId = dto.batchId || randomUUID();
    const folder = dto.folder || 'file-uploads';

    const jobs = await Promise.all(
      files.map((file, index) => {
        const payload: FileUploadJobPayload = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          bufferBase64: file.buffer.toString('base64'),
          folder,
          batchId,
        };

        return this.uploadQueue.add(`upload-file-${index + 1}`, payload);
      }),
    );

    return {
      message: `${files.length} files queued for background processing`,
      batchId,
      queuedJobs: jobs.map((job) => ({
        jobId: job.id,
        name: job.name,
      })),
    };
  }

  //   getAllFiles
  async getAllFiles() {
    return await this.prisma.fileMetadata.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  //   getFileById
  async getFileById(id: string) {
    const file = await this.prisma.fileMetadata.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException (`File with ID ${id} not found`);
    }

    return {
      message: 'File retrieved successfully',
      data: file,
    };
  }

}