import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { isValidObjectId } from 'mongoose';
import { CreateTecnicoFirmanteDto } from './dto/create-tecnico-firmante.dto';
import { UpdateTecnicoFirmanteDto } from './dto/update-tecnico-firmante.dto';
import { TecnicosFirmantesService } from './tecnicos-firmantes.service';
import { sanitizarNombreFirmanteParaArchivo } from 'src/utils/names';

@Controller('tecnicos-firmantes')
export class TecnicosFirmantesController {
  constructor(private readonly tecnicosService: TecnicosFirmantesService) {}

  @Post('registrar-tecnico')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.SIGNATORIES_UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          const sanitizedName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          const uniqueFilename = `${sanitizedName}-firma${path.extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async create(@Body() createTecnicoFirmanteDto: CreateTecnicoFirmanteDto, @UploadedFile() file: Express.Multer.File) {
    console.log('Archivo recibido:', file);
    console.log('Datos del técnico firmante:', createTecnicoFirmanteDto);

    try {
      if (file) {
        createTecnicoFirmanteDto.firma = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const tecnico = await this.tecnicosService.create(createTecnicoFirmanteDto);
      return { message: 'Creado exitosamente', data: tecnico };
    } catch (error) {
      throw new BadRequestException('Error al registrar datos del técnico firmante');
    }
  }

  @Get('obtener-tecnicos')
  async findAll() {
    const tecnicos = await this.tecnicosService.findAll();

    if (!tecnicos || tecnicos.length === 0) {
      return { message: 'No se encontraron técnicos firmantes' };
    }

    return tecnicos;
  }

  @Get('obtener-tecnico/:id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const tecnico = await this.tecnicosService.findOne(id);
    if (!tecnico) {
      throw new BadRequestException('No se encontró el técnico firmante');
    }
    return tecnico;
  }

  @Get('obtener-tecnico-por-usuario/:idUser')
  async findOneByUser(@Param('idUser') idUser: string) {
    if (!isValidObjectId(idUser)) {
      throw new BadRequestException('El ID de usuario proporcionado no es válido');
    }

    const tecnico = await this.tecnicosService.findOneByUserId(idUser);
    if (!tecnico) {
      return { message: 'No se encontró el técnico firmante', data: null };
    }
    return tecnico;
  }

  @Patch('actualizar-tecnico/:id')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.SIGNATORIES_UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          const sanitizedName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          const uniqueFilename = `${sanitizedName}-firma${path.extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async update(@Param('id') id: string, @Body() updateTecnicoFirmanteDto: UpdateTecnicoFirmanteDto, @UploadedFile() file: Express.Multer.File) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    if (file) {
      updateTecnicoFirmanteDto.firma = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const tecnico = await this.tecnicosService.update(id, updateTecnicoFirmanteDto);
    if (!tecnico) {
      return {
        message: `No se pudo actualizar el técnico firmante con id ${id}`,
      };
    }

    return {
      message: 'Actualizado exitosamente',
      data: tecnico,
    };
  }
}


