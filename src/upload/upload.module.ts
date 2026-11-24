import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadProcessor } from './upload.processor';
import { FILE_UPLOAD_QUEUE } from './upload.constants';


@Module({
  imports: [CloudinaryModule, PrismaModule,
    BullModule.registerQueue({
      name: FILE_UPLOAD_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, UploadProcessor],
})
export class UploadModule { }