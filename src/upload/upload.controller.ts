import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UsePipes,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { UploadFileDto } from 'src/common/dto/upload-file.dto/upload-file.dto';


@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  //   uploadSingleFile
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    return await this.uploadService.uploadSingleFile(file, dto);
  }

  //   uploadMultipleFiles
  @Post('multiple')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files per batch
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
  ) {
    return await this.uploadService.uploadMultipleFiles(files, dto);
  }

  //   getAllFiles
  @Get('files')
  async listFiles() {
    return await this.uploadService.getAllFiles();
  }

  // getFileById
  @Get('files/:id')
  async getFile(@Param('id') id: string) {
    return await this.uploadService.getFileById(id);
  }

  // getFilesByBatchId
  @Get('batch/:batchId')
  async getBatchFiles(@Param('batchId') batchId: string) {
    return await this.uploadService.getFilesByBatchId(batchId);
  }

}