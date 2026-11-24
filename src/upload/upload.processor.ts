import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_UPLOAD_QUEUE } from './upload.constants';

export interface FileUploadJobPayload {
  originalname: string;
  mimetype: string;
  size: number;
  bufferBase64: string;
  folder: string;
  batchId: string;
}

@Processor(FILE_UPLOAD_QUEUE)
export class UploadProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadProcessor.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<FileUploadJobPayload>) {
    const { originalname, mimetype, size, bufferBase64, folder, batchId } = job.data;
    const buffer = Buffer.from(bufferBase64, 'base64');

    const uploadResult: any = await this.cloudinaryService.uploadFile(
      { originalname, mimetype, size, buffer } as Express.Multer.File,
      folder,
    );

    const savedMetadata = await this.prisma.fileMetadata.create({
      data: {
        originalName: originalname,
        filename: uploadResult.public_id,
        mimetype,
        size,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        folderPath: folder,
        batchId,
      },
    });

    this.logger.log(`Processed batch ${batchId} file: ${originalname} (${savedMetadata.id})`);
    return savedMetadata;
  }
}