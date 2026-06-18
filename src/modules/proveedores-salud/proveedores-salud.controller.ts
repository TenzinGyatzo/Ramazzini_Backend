import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Res,
  StreamableFile,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ProveedoresSaludService } from './proveedores-salud.service';
import { CreateProveedoresSaludDto } from './dto/create-proveedores-salud.dto';
import { UpdateProveedoresSaludDto } from './dto/update-proveedores-salud.dto';
import { ChangeRegimenRegulatorioDto } from './dto/change-regimen-regulatorio.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'path';
import { BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { isAfter, addDays } from 'date-fns';
import * as fs from 'fs';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { Public } from 'src/utils/decorators/public.decorator';

@Controller('proveedores-salud')
export class ProveedoresSaludController {
  constructor(
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  @Public()
  @Post('crear-proveedor-salud')
  @UseInterceptors(
    FileInterceptor('logotipoEmpresa', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.PROVIDERS_UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          // Genera un nombre de archivo único basado en el nombre del proveedor.
          const sanitizedCompanyName = req.body.nombre
            .replace(/\s+/g, '-') // Reemplaza espacios por guiones
            .replace(/[^a-zA-Z0-9\-]/g, '') // Elimina caracteres especiales para evitar problemas en el nombre de archivo
            .toLowerCase(); // Convierte el nombre a minúsculas

          // Forma el nombre del archivo con el nombre y la extensión original del archivo
          const uniqueFilename = `${sanitizedCompanyName}-logo${path.extname(file.originalname)}`;

          callback(null, uniqueFilename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Validar mimetypes permitidos
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Solo se permiten archivos de imagen JPG, JPEG o PNG',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
      },
    }),
  )
  async create(
    @Body() createProveedoresSaludDto: CreateProveedoresSaludDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (file) {
        createProveedoresSaludDto.logotipoEmpresa = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const proveedorSalud = await this.proveedoresSaludService.create(
        createProveedoresSaludDto,
      );
      return {
        message: 'Proveedor de salud creado exitosamente',
        data: proveedorSalud,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Ya existe una empresa con este RFC');
      }
      throw new BadRequestException('Error al crear la empresa');
    }
  }

  @Get('obtener-proveedores-salud')
  async findAll() {
    const proveedoresSalud = await this.proveedoresSaludService.findAll();

    if (!proveedoresSalud || proveedoresSalud.length === 0) {
      return { message: 'No se encontraron proveedores de salud' };
    }

    return proveedoresSalud;
  }

  @Get('obtener-proveedor-salud/:id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const proveedorSalud = await this.proveedoresSaludService.findOne(id);

    if (!proveedorSalud) {
      throw new NotFoundException('No se encontró el proveedor de salud');
    }

    // Obtener política regulatoria basada en régimen
    const regulatoryPolicy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(id);

    // Convertir Document de Mongoose a objeto plano si es necesario
    const proveedorSaludObj = proveedorSalud.toObject
      ? proveedorSalud.toObject()
      : proveedorSalud;

    // Incluir policy en la respuesta
    return {
      ...proveedorSaludObj,
      regulatoryPolicy,
    };
  }

  @Post('actualizar-proveedor-salud/:id')
  @UseInterceptors(
    FileInterceptor('logotipoEmpresa', {
      storage: diskStorage({
        destination: path.resolve(
          __dirname,
          `../../../../${process.env.PROVIDERS_UPLOADS_DIR}`,
        ),
        filename: (req, file, callback) => {
          // Genera un nombre de archivo único basado en el nombre comercial de la empresa.
          const sanitizedCompanyName = req.body.nombre
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
    @Body() updateProveedoresSaludDto: UpdateProveedoresSaludDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Si se sube un archivo, se añade al DTO para actualizar el logotipo
    if (file) {
      updateProveedoresSaludDto.logotipoEmpresa = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const proveedorSalud = await this.proveedoresSaludService.update(
      id,
      updateProveedoresSaludDto,
    );

    if (!proveedorSalud) {
      return {
        message: `No se pudo actualizar el proveedor de salud con id ${id}`,
      };
    }

    return {
      message: 'Actualizado exitosamente',
      data: proveedorSalud,
    };
  }

  @Delete('eliminar-proveedor-salud/:id')
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const deletedProveedorSalud = await this.proveedoresSaludService.remove(id);

    if (!deletedProveedorSalud) {
      return {
        message: `El proveedor de salud con ID ${id} no existe o ya ha sido eliminado.`,
      };
    }

    return {
      message: 'Proveedor de salud eliminado exitosamente',
    };
  }

  @Get('verificar-periodo-prueba/:id')
  async verificarPeriodoDePrueba(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const proveedorSalud = await this.proveedoresSaludService.findOne(id);

    if (!proveedorSalud) {
      throw new NotFoundException('No se encontró el proveedor de salud');
    }

    const fechaLimite = addDays(new Date(proveedorSalud.fechaInicioTrial), 15); // Quince días después de la fecha de inicio del periodo de prueba

    // Verificar si la fecha actual es posterior a la fecha límite
    if (isAfter(new Date(), fechaLimite)) {
      console.log(
        `El periodo de prueba de ${proveedorSalud.nombre} ha finalizado el ${fechaLimite}`,
      );
      // Si el periodo ha finalizado y no está marcado, actualizarlo
      if (!proveedorSalud.periodoDePruebaFinalizado) {
        const updatedProveedorSalud = await this.proveedoresSaludService.update(
          id,
          {
            periodoDePruebaFinalizado: true,
            fechaInicioTrial: proveedorSalud.fechaInicioTrial,
          },
        );

        if (!updatedProveedorSalud) {
          return {
            message: 'No se pudo actualizar el proveedor de salud',
          };
        }

        return {
          message: 'El proveedor de salud ha finalizado su periodo de prueba',
          data: updatedProveedorSalud,
        };
      }
    } else {
      // console.log('El periodo de prueba sigue activo');
    }

    return {
      message: 'El proveedor de salud no se encuentra en periodo de prueba',
      data: proveedorSalud,
    };
  }

  @Get('verificar-fin-suscripcion/:id')
  async verificarFinSuscripcion(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const proveedorSalud = await this.proveedoresSaludService.findOne(id);

    if (!proveedorSalud) {
      throw new NotFoundException('No se encontró el proveedor de salud');
    }

    const finDeSuscripcion = proveedorSalud.finDeSuscripcion; // Quince días después de la fecha de inicio del periodo de prueba

    // Verificar si la fecha actual es posterior a la fecha límite
    if (isAfter(new Date(), finDeSuscripcion)) {
      console.log(`La suscripción ha finalizado el ${finDeSuscripcion}`);
      // Si el periodo ha finalizado hay que actualizar los límites
      if (proveedorSalud.finDeSuscripcion) {
        const updatedProveedorSalud = await this.proveedoresSaludService.update(
          id,
          {
            // maxUsuariosPermitidos: 1,
            // maxEmpresasPermitidas: 0,
            // maxTrabajadoresPermitidos: 0,
            maxHistoriasPermitidasAlMes: 0,
            addOns: [],
          },
        );

        if (!updatedProveedorSalud) {
          return {
            message: 'No se pudo actualizar el proveedor de salud',
          };
        }

        return {
          message: 'El proveedor de salud ha finalizado su periodo de prueba',
          data: updatedProveedorSalud,
        };
      }
    } else {
      console.log('La suscripción sigue activa');
    }

    return {
      message: 'La suscripción sigue activa',
      data: proveedorSalud,
    };
  }

  @Get('/top-empresas-por-trabajadores/:idProveedorSalud')
  async getTopEmpresas(@Param('idProveedorSalud') idProveedorSalud: string) {
    return this.proveedoresSaludService.getTopEmpresasByWorkers(
      idProveedorSalud,
    );
  }

  @Get('/historias-clinicas-del-mes/:idProveedorSalud')
  async getHistoriasClinicasDelMes(
    @Param('idProveedorSalud') idProveedorSalud: string,
  ) {
    return this.proveedoresSaludService.getHistoriasClinicasDelMes(
      idProveedorSalud,
    );
  }

  @Get('/notas-medicas-del-mes/:idProveedorSalud')
  async getNotasMedicasDelMes(
    @Param('idProveedorSalud') idProveedorSalud: string,
  ) {
    return this.proveedoresSaludService.getNotasMedicasDelMes(idProveedorSalud);
  }

  @Get('/cantidad-historias-clinicas/:idProveedorSalud')
  async getTodasHistoriasClinicas(
    @Param('idProveedorSalud') idProveedorSalud: string,
  ) {
    return this.proveedoresSaludService.getTodasHistoriasClinicas(
      idProveedorSalud,
    );
  }

  @Get('/cantidad-notas-medicas/:idProveedorSalud')
  async getTodasNotasMedicas(
    @Param('idProveedorSalud') idProveedorSalud: string,
  ) {
    return this.proveedoresSaludService.getTodasNotasMedicas(idProveedorSalud);
  }

  // **Endpoints para reglas de puntaje**
  @Get('/reglas-puntaje/:idProveedorSalud')
  async getReglasPuntaje(@Param('idProveedorSalud') idProveedorSalud: string) {
    if (!isValidObjectId(idProveedorSalud)) {
      throw new BadRequestException('ID de proveedor de salud inválido');
    }
    return this.proveedoresSaludService.getReglasPuntaje(idProveedorSalud);
  }

  @Get('/logo/:filename')
  async getLogo(@Param('filename') filename: string, @Res() res: any) {
    try {
      const logoPath = path.resolve(
        __dirname,
        `../../../../${process.env.PROVIDERS_UPLOADS_DIR}`,
        filename,
      );

      // Verificar que el archivo existe
      if (!fs.existsSync(logoPath)) {
        throw new NotFoundException('Logo no encontrado');
      }

      // Leer el archivo
      const file = fs.createReadStream(logoPath);

      // Determinar el tipo de contenido basado en la extensión
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      }

      // Configurar headers CORS
      res.set({
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 año
      });

      // Enviar el archivo
      file.pipe(res);
    } catch (error) {
      throw new NotFoundException('Logo no encontrado');
    }
  }

  @Patch('/reglas-puntaje/:idProveedorSalud')
  async updateReglasPuntaje(
    @Param('idProveedorSalud') idProveedorSalud: string,
    @Body()
    reglasPuntaje: {
      aptitudes: number;
      historias: number;
      exploraciones: number;
      examenesVista: number;
      audiometrias: number;
      antidopings: number;
      notas: number;
      externos: number;
    },
  ) {
    if (!isValidObjectId(idProveedorSalud)) {
      throw new BadRequestException('ID de proveedor de salud inválido');
    }
    return this.proveedoresSaludService.updateReglasPuntaje(
      idProveedorSalud,
      reglasPuntaje,
    );
  }

  @Patch(':id/regimen-regulatorio')
  async changeRegimenRegulatorio(
    @Param('id') id: string,
    @Body() dto: ChangeRegimenRegulatorioDto,
    @Req() req: Request,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Extraer userId del JWT token
    const userId = getUserIdFromRequest(req);

    // Cambiar régimen regulatorio
    const result = await this.proveedoresSaludService.changeRegimenRegulatorio(
      id,
      userId,
      dto,
    );

    // Convertir Document de Mongoose a objeto plano si es necesario
    const proveedorSaludObj = result.proveedorSalud.toObject
      ? result.proveedorSalud.toObject()
      : result.proveedorSalud;

    return {
      message: 'Régimen regulatorio actualizado exitosamente',
      data: {
        ...proveedorSaludObj,
        regulatoryPolicy: result.regulatoryPolicy,
      },
    };
  }
}
