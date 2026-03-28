import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

  const categoriasIMC = [
    '',
    'Bajo peso',
    'Normal',
    'Sobrepeso',
    'Obesidad clase I',
    'Obesidad clase II',
    'Obesidad clase III',
  ];
  
  const categoriasCircunferenciaCintura = [
    '',
    'Bajo Riesgo',
    'Riesgo Aumentado',
    'Alto Riesgo',
  ];
  
  const categoriasTensionArterial = [
    '',
    'Óptima',
    'Normal',
    'Alta',
    'Hipertensión grado 1',
    'Hipertensión grado 2',
    'Crisis hipertensiva',
  ];
  
  const categoriasFrecuenciaCardiaca = [
    '',
    'Excelente',
    'Buena',
    'Normal',
    'Elevada',
    'Alta',
    'Muy alta',
  ];
  
  const categoriasFrecuenciaRespiratoria = [
    '',
    'Bradipnea',
    'Normal',
    'Taquipnea',
    'Hiperventilación',
  ];
  
  const categoriaSaturacionOxigeno = [
    '',
    'Normal',
    'Aceptable',
    'Moderadamente baja',
    'Hipoxemia leve',
    'Hipoxemia grave',
  ];

export class CreateExploracionFisicaDto {

    @ApiProperty({
        description: 'Fecha de la exploracion fisica',
        example: '2024-10-25T07:00:00.000+00:00'
    })
    @IsDate({ message: 'La fecha de la exploración fisica debe ser una fecha' })
    @Type(() => Date)
    @IsNotEmpty({ message: 'La fecha de la exploración fisica no puede estar vacía' })
    fechaExploracionFisica: Date;

    // Somatometría
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(45)
    @Max(200)
    peso: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(1.40)
    @Max(2.20)
    altura: number;
    
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    indiceMasaCorporal: number;
    
    @IsOptional()
    @IsEnum(categoriasIMC, { message: 'La categoria debe ser alguna de las siguientes: ' + categoriasIMC })
    categoriaIMC: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 0 })
    circunferenciaCintura: number;

    @IsOptional()
    @IsEnum(categoriasCircunferenciaCintura, { message: 'La categoria debe ser alguna de las siguientes: ' + categoriasCircunferenciaCintura })
    categoriaCircunferenciaCintura: string;

    // Signos Vitales
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 0 })
    @Min(60)
    @Max(300)
    tensionArterialSistolica: number;

    @IsOptional()
    @Min(40)
    @Max(200)
    @IsNumber({ maxDecimalPlaces: 0 })
    tensionArterialDiastolica: number;

    @IsOptional()
    @IsEnum(categoriasTensionArterial)
    categoriaTensionArterial: string;

    @IsOptional()
    @Min(40)
    @Max(150)
    @IsNumber({ maxDecimalPlaces: 0 })
    frecuenciaCardiaca: number;

    @IsOptional()
    @IsEnum(categoriasFrecuenciaCardiaca, { message: 'La categoria debe ser alguna de las siguientes: ' + categoriasFrecuenciaCardiaca })
    categoriaFrecuenciaCardiaca: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 0 })
    @Min(12)
    @Max(45)
    frecuenciaRespiratoria: number;

    @IsOptional()
    @IsEnum(categoriasFrecuenciaRespiratoria, { message: 'La categoria debe ser alguna de las siguientes: ' + categoriasFrecuenciaRespiratoria })
    categoriaFrecuenciaRespiratoria: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 0 })
    @Min(70)
    @Max(100)
    saturacionOxigeno: number;

    @IsOptional()
    @IsEnum(categoriaSaturacionOxigeno, { message: 'La categoria debe ser alguna de las siguientes: ' + categoriaSaturacionOxigeno })
    categoriaSaturacionOxigeno: string;

    // Cabeza y Cuello
    @IsOptional()
    @IsString( {message: 'craneoCara debe ser un string' })
    craneoCara: string;

    @IsOptional()
    @IsString( {message: 'ojos debe ser un string' })
    ojos: string;

    @IsOptional()
    @IsString( {message: 'oidos debe ser un string' })
    oidos: string;

    @IsOptional()
    @IsString( {message: 'nariz debe ser un string' })
    nariz: string;

    @IsOptional()
    @IsString( {message: 'boca debe ser un string' })
    boca: string;

    @IsOptional()
    @IsString( {message: 'cuello debe ser un string' })
    cuello: string;

    // Extremidades Superiores
    @IsOptional()
    @IsString( {message: 'hombros debe ser un string' })
    hombros: string;

    @IsOptional()
    @IsString( {message: 'codos debe ser un string' })
    codos: string;

    @IsOptional()
    @IsString( {message: 'manos debe ser un string' })
    manos: string;

    @IsOptional()
    @IsString( {message: 'reflejosOsteoTendinososSuperiores debe ser un string' })
    reflejosOsteoTendinososSuperiores: string;

    @IsOptional()
    @IsString( {message: 'vascularESuperiores debe ser un string' })
    vascularESuperiores: string;

    // Tórax
    @IsOptional()
    @IsString( {message: 'torax debe ser un string' })
    torax: string;

    // Abdomen
    @IsOptional()
    @IsString( {message: 'abdomen debe ser un string' })
    abdomen: string;

    // Extremidades Inferiores
    @IsOptional()
    @IsString( {message: 'cadera debe ser un string' })
    cadera: string;

    @IsOptional()
    @IsString( {message: 'rodillas debe ser un string' })
    rodillas: string;

    @IsOptional()
    @IsString( {message: 'tobillosPies debe ser un string' })
    tobillosPies: string;

    @IsOptional()
    @IsString( {message: 'reflejosOsteoTendinososInferiores debe ser un string' })
    reflejosOsteoTendinososInferiores: string;

    @IsOptional()
    @IsString( {message: 'vascularEInferiores debe ser un string' })
    vascularEInferiores: string;

    // Columna
    @IsOptional()
    @IsString( {message: 'inspeccionColumna debe ser un string' })
    inspeccionColumna: string;

    @IsOptional()
    @IsString( {message: 'movimientosColumna debe ser un string' })
    movimientosColumna: string;

    // Piel
    @IsOptional()
    @IsString( {message: 'lesionesPiel debe ser un string' })
    lesionesPiel: string;

    @IsOptional()
    @IsString( {message: 'cicatrices debe ser un string' })
    cicatrices: string;

    @IsOptional()
    @IsString( {message: 'nevos debe ser un string' })
    nevos: string;

    // Exploración Neurológica Complementaria
    @IsOptional()
    @IsString( {message: 'coordinacion debe ser un string' })
    coordinacion: string;

    @IsOptional()
    @IsString( {message: 'sensibilidad debe ser un string' })
    sensibilidad: string;

    @IsOptional()
    @IsString( {message: 'equilibrio debe ser un string' })
    equilibrio: string;

    @IsOptional()
    @IsString( {message: 'marcha debe ser un string' })
    marcha: string;

    // Resumen de la exploración física
    @IsOptional()
    @IsString( {message: 'resumenExploracionFisica debe ser un string' })
    resumenExploracionFisica: string;

    // Trabajador, ruta al archivo e info de creador y actualizador
    @ApiProperty({
        description: 'El ID del trabajador',
        example: '671fe9cc00fcb5611b10686e',
    })
    @IsMongoId({ message: 'El id del trabajador debe ser un ObjectId' })
    @IsNotEmpty({ message: 'El id del trabajador no puede estar vacío' })
    idTrabajador: string;

    @ApiProperty({
        description: 'Ruta hacía el PDF del informe',
        example: "expedientes-medicos/Expedientes Medicos/AGRICULTURE/Parcelas Del Este/Juan Pérez López.pdf"
    })
    @IsString({ message: 'La ruta del PDF del informe debe ser un string' })
    @IsNotEmpty({ message: 'La ruta del PDF del informe no puede estar vacía' })
    rutaPDF: string;

    @ApiProperty({
        description: 'El ID del usuario que creó este registro',
        example: '60d9f70fc39b3c1b8f0d6c0b',
    })
    @IsMongoId({ message: 'El ID de "createdBy" no es válido' })
    @IsNotEmpty({ message: 'El ID de "createdBy" no puede estar vacío' })
    createdBy: string;

    @ApiProperty({
        description: 'El ID del usuario que actualizó este registro',
        example: '60d9f70fc39b3c1b8f0d6c0c',
    })
    @IsMongoId({ message: 'El ID de "updatedBy" no es válido' })
    @IsNotEmpty({ message: 'El ID de "updatedBy" no puede estar vacío' })
    updatedBy: string;
}
