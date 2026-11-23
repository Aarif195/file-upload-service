import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PrismaModule } from './prisma/prisma.module';
import { UploadController } from './upload/upload.controller';
import { UploadService } from './upload/upload.service';
import { UploadModule } from './upload/upload.module';
import { BullModule } from '@nestjs/bullmq';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          },
        };
      },
    }),
    CloudinaryModule,
    PrismaModule,
    UploadModule],
  controllers: [AppController, UploadController],
  providers: [AppService, UploadService],
})
export class AppModule { }
