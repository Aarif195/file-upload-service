import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from 'src/common/dto/upload-file.dto/upload-file.dto';

@Injectable()
export class UploadService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

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
    const uploadPromises = files.map((file) => this.uploadSingleFile(file, dto));
    const results = await Promise.all(uploadPromises);

    return {
      message: `${files.length} files uploaded successfully`,
      data: results.map((r) => r.data),
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
      throw new Error(`File with ID ${id} not found`);
    }

    return {
      message: 'File retrieved successfully',
      data: file,
    };
  }

}