import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CentroTrabajo } from './entities/centros-trabajo.entity';
import { CreateCentrosTrabajoDto } from './dto/create-centros-trabajo.dto';
import { UpdateCentrosTrabajoDto } from './dto/update-centros-trabajo.dto';
import { normalizeCentroTrabajoData } from 'src/utils/normalization'
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { Antidoping } from '../expedientes/schemas/antidoping.schema';
import { AptitudPuesto } from '../expedientes/schemas/aptitud-puesto.schema';
import { Certificado } from '../expedientes/schemas/certificado.schema';
import { DocumentoExterno } from '../expedientes/schemas/documento-externo.schema';
import { ExamenVista } from '../expedientes/schemas/examen-vista.schema';
import { ExploracionFisica } from '../expedientes/schemas/exploracion-fisica.schema';
import { HistoriaClinica } from '../expedientes/schemas/historia-clinica.schema';
import { NotaMedica } from '../expedientes/schemas/nota-medica.schema';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class CentrosTrabajoService {
  constructor(
    @InjectModel(CentroTrabajo.name) private centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Trabajador.name) private trabajadorModel: Model<Trabajador>,
    @InjectModel(Antidoping.name) private antidopingModel: Model<Antidoping>,
    @InjectModel(AptitudPuesto.name) private aptitudModel: Model<AptitudPuesto>,
    @InjectModel(Certificado.name) private certificadoModel: Model<Certificado>,
    @InjectModel(DocumentoExterno.name) private documentoExternoModel: Model<DocumentoExterno>,
    @InjectModel(ExamenVista.name) private examenVistaModel: Model<ExamenVista>,
    @InjectModel(ExploracionFisica.name) private exploracionFisicaModel: Model<ExploracionFisica>,
    @InjectModel(HistoriaClinica.name) private historiaClinicaModel: Model<HistoriaClinica>,
    @InjectModel(NotaMedica.name) private notaMedicaModel: Model<NotaMedica>,
    @InjectModel('User') private userModel: Model<User>,
    private trabajadoresService: TrabajadoresService
  ) {}

  async create(createCentrosTrabajoDto: CreateCentrosTrabajoDto): Promise<CentroTrabajo> {
    const normalizedDto = normalizeCentroTrabajoData(createCentrosTrabajoDto);
    const createdCentroTrabajo = new this.centroTrabajoModel(normalizedDto);
    return await createdCentroTrabajo.save();
  }

  async findCentersByCompany(id: string): Promise<CentroTrabajo[]> {
    return await this.centroTrabajoModel.find({ idEmpresa: id }).exec();
  }

  async findByUserAssignments(userId: string): Promise<CentroTrabajo[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return [];
    }

    if (user.role === 'Principal') {
      // Usuario Principal ve todos los centros de trabajo
      return await this.centroTrabajoModel.find({}).exec();
    }

    // Verificar si tiene permiso de acceso completo
    if (user.permisos?.accesoCompletoEmpresasCentros) {
      // Usuario con permiso completo ve todos los centros de trabajo
      return await this.centroTrabajoModel.find({}).exec();
    }

    // Otros usuarios solo ven centros asignados
    return await this.centroTrabajoModel.find({ 
      _id: { $in: user.centrosTrabajoAsignados || [] }
    }).exec();
  }

  async findOne(id: string): Promise<CentroTrabajo> {
    return this.centroTrabajoModel.findById(id).exec();
  }

  async countCentrosByEmpresa(empresaId: string): Promise<number> {
    return this.centroTrabajoModel.countDocuments({ idEmpresa: empresaId }).exec();
  }

  async countTrabajadoresByCentro(centroId: string): Promise<number> {
    return this.trabajadorModel.countDocuments({ idCentroTrabajo: centroId }).exec();
  }

  async update(id: string, updateCentrosTrabajoDto: UpdateCentrosTrabajoDto): Promise<CentroTrabajo> {
    const normalizedDto = normalizeCentroTrabajoData(updateCentrosTrabajoDto);
    return await this.centroTrabajoModel.findByIdAndUpdate(id, normalizedDto, { new: true }).exec();
  }

  async remove(id: string): Promise<boolean> {
    const session = await this.centroTrabajoModel.db.startSession();
  
    try {
      await session.withTransaction(async () => {
        console.log(`[DEBUG] Iniciando eliminación de Centro de Trabajo con ID: ${id}`);
  
        // 1. Buscar todos los trabajadores asociados al Centro de Trabajo
        const trabajadores = await this.trabajadorModel.find({ idCentroTrabajo: id }).session(session).exec();
  
        if (trabajadores.length === 0) {
          console.log(`[DEBUG] No hay trabajadores asociados, eliminando directamente el Centro de Trabajo.`);
        } else {
          console.log(`[DEBUG] Eliminando ${trabajadores.length} trabajadores...`);
  
          // 2. Eliminar trabajadores en paralelo
          const resultadosEliminacion = await Promise.all(
            trabajadores.map((trabajador) => this.trabajadoresService.remove(trabajador._id.toString()))
          );
  
          // 3. Verificar si todos los trabajadores se eliminaron correctamente
          if (resultadosEliminacion.includes(false)) {
            throw new Error('Error en la eliminación de uno o más trabajadores, abortando transacción.');
          }
        }
  
        // 4. Eliminar el Centro de Trabajo
        // console.log(`[DEBUG] Eliminando Centro de Trabajo de la base de datos...`);
        const result = await this.centroTrabajoModel.findByIdAndDelete(id).session(session);
  
        if (!result) {
          throw new Error('No se pudo eliminar el Centro de Trabajo, abortando transacción.');
        }
  
        console.log(`[DEBUG] Eliminación del Centro de Trabajo completada con éxito.`);
      });
  
      session.endSession();
      return true;
    } catch (error) {
      console.error(`[ERROR] ${error.message}`);
      session.endSession();
      return false;
    }
  }
  
  
}
