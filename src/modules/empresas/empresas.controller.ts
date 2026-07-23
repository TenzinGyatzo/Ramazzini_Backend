import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Query,
  UseGuards,
  Req,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { isValidObjectId } from 'mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Request } from 'express';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { DeletionPasswordGuard } from 'src/utils/guards/deletion-password.guard';
import { DeletionCascadeCheck } from 'src/utils/decorators/deletion-cascade-check.decorator';

dotenv.config();

type AuthenticatedRequest = Request & { userId?: string };

@Controller('api')
@ApiTags('Empresas')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly trabajadoresService: TrabajadoresService,
  ) {}

  @Post('crear-empresa')
  @ApiOperation({ summary: 'Crea una nueva empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*',
  })
  @UseInterceptors(
    FileInterceptor('logotipoEmpresa', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          // Genera un nombre de archivo único basado en el nombre comercial de la empresa.
          const sanitizedCompanyName = req.body.nombreComercial
            .replace(/\s+/g, '-') // Reemplaza espacios por guiones
            .replace(/[^a-zA-Z0-9\-]/g, '') // Elimina caracteres especiales para evitar problemas en el nombre de archivo
            .toLowerCase(); // Convierte el nombre a minúsculas

          // Forma el nombre del archivo con el nombre comercial y la extensión original del archivo
          const uniqueFilename = `${sanitizedCompanyName}-logo${path.extname(file.originalname)}`;

          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async create(
    @Body() createEmpresaDto: CreateEmpresaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // console.log('Archivo recibido:', file);
    // console.log('Datos de la empresa:', createEmpresaDto);

    try {
      if (file) {
        createEmpresaDto.logotipoEmpresa = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const empresa = await this.empresasService.create(createEmpresaDto);
      return { message: 'Empresa creada exitosamente', data: empresa };
    } catch (error) {
      if (error.code === 11000) {
        // No se está aplicando el unique porque ya había registros duplicados desde el uso de Ramazzini-V1
        throw new BadRequestException('Ya existe una empresa con este RFC');
      }
      throw new BadRequestException('Error al crear la empresa');
    }
  }

  @Get('empresas/:idProveedorSalud')
  @ApiOperation({ summary: 'Obtiene todas las empresas' })
  @ApiResponse({ status: 200, description: 'Empresas obtenidas exitosamente' })
  async findAll(
    @Param('idProveedorSalud') idProveedorSalud: string,
    @Query('userId') userId?: string,
  ) {
    const empresas = await this.empresasService.findAll(
      idProveedorSalud,
      userId,
    );
    return empresas || [];
  }

  @Get(':empresaId/riesgos-trabajo')
  @ApiOperation({ summary: 'Obtiene riesgos de trabajo por empresa' })
  @ApiResponse({
    status: 200,
    description: 'Riesgos de trabajo encontrados exitosamente',
  })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  async findRiesgosTrabajoPorEmpresa(@Param('empresaId') empresaId: string) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    const trabajadoresConHistoria =
      await this.trabajadoresService.findRiesgosTrabajoPorEmpresa(empresaId);

    return trabajadoresConHistoria || [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una empresa por su ID' })
  @ApiResponse({ status: 200, description: 'Empresa obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 404, description: 'No se encontró la empresa' })
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const empresa = await this.empresasService.findOne(id);

    if (!empresa) {
      throw new NotFoundException('No se encontró la empresa');
    }

    return empresa;
  }

  @Patch('/actualizar-empresa/:id')
  @ApiOperation({ summary: 'Actualiza una empresa por su ID' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'El ID proporcionado no es válido | Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*',
  })
  @UseInterceptors(
    FileInterceptor('logotipoEmpresa', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          // Genera un nombre de archivo único basado en el nombre comercial de la empresa.
          const sanitizedCompanyName = req.body.nombreComercial
            .replace(/\s+/g, '-') // Reemplaza espacios por guiones
            .replace(/[^a-zA-Z0-9\-]/g, '') // Elimina caracteres especiales para evitar problemas en el nombre de archivo
            .toLowerCase(); // Convierte el nombre a minúsculas

          // Forma el nombre del archivo con el nombre comercial y la extensión original del archivo
          const uniqueFilename = `${sanitizedCompanyName}-logo${path.extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    if (file) {
      updateEmpresaDto.logotipoEmpresa = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const updatedEmpresa = await this.empresasService.update(
      id,
      updateEmpresaDto,
      req.userId ?? null,
    );

    if (!updatedEmpresa) {
      return { message: `No se pudo actualizar la empresa con id ${id}` };
    }

    return {
      message: 'Empresa actualizada exitosamente',
      data: updatedEmpresa,
    };
  }

  @Delete('/eliminar-empresa/:id')
  @UseGuards(DeletionPasswordGuard)
  @DeletionCascadeCheck('empresa')
  @ApiOperation({ summary: 'Elimina una empresa por su ID' })
  @ApiResponse({
    status: 200,
    description:
      'Empresa eliminada exitosamente | La empresa del ID proporcionado no existe o ya ha sido eliminada',
  })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({
    status: 403,
    description: 'Eliminación bloqueada por documentos resguardados (SIRES)',
  })
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    try {
      await this.empresasService.remove(id, req.userId ?? null);
      return { message: 'Empresa eliminada exitosamente' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        'No se pudo eliminar la empresa. Algunos documentos o dependencias no se pudieron eliminar.',
      );
    }
  }
}
