import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CatalogType } from './interfaces/catalog-entry.interface';

@Controller('api/catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('cie10/search')
  async searchCIE10(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('sexo') sexo?: number,
    @Query('edad') edad?: number,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;

    // If sexo or edad are provided, use filtered search
    if (sexo !== undefined || edad !== undefined) {
      const sexoNum =
        sexo !== undefined ? parseInt(sexo.toString()) : undefined;
      const edadNum =
        edad !== undefined ? parseInt(edad.toString()) : undefined;
      return this.catalogsService.searchCIE10WithFilters(
        query.trim(),
        searchLimit,
        sexoNum,
        edadNum,
      );
    }

    // Otherwise, use standard search
    return this.catalogsService.searchCatalog(
      CatalogType.CIE10,
      query.trim(),
      searchLimit,
    );
  }

  @Get('cie10-giis/search')
  async searchCIE10GIIS(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('sexo') sexo?: number,
    @Query('edad') edad?: number,
    @Query('solo4Caracteres') solo4Caracteres?: string,
    @Query('filterVariant') filterVariant?: string,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    const solo4 =
      solo4Caracteres === 'true' ||
      solo4Caracteres === '1' ||
      solo4Caracteres === 'yes';
    const sexoNum = sexo !== undefined ? parseInt(sexo.toString()) : undefined;
    const edadNum = edad !== undefined ? parseInt(edad.toString()) : undefined;
    const filter =
      filterVariant === 'afeccion' || filterVariant === 'causaExterna'
        ? filterVariant
        : undefined;
    return this.catalogsService.searchCIE10GIIS(
      query.trim(),
      searchLimit,
      sexoNum,
      edadNum,
      solo4,
      filter,
    );
  }

  @Get('cie10-giis/:code')
  async getCIE10GIISByCode(@Param('code') code: string) {
    const entry = await this.catalogsService.getCIE10GIISByCode(code);
    if (!entry) {
      throw new NotFoundException(
        `CIE-10 GIIS entry with code ${code} not found`,
      );
    }
    return entry;
  }

  @Get('cie10/:code')
  async getCIE10ByCode(@Param('code') code: string) {
    const entry = await this.catalogsService.getCatalogEntry(
      CatalogType.CIE10,
      code,
    );
    if (!entry) {
      throw new NotFoundException(`CIE-10 entry with code ${code} not found`);
    }
    return entry;
  }

  @Get('clues/search')
  async searchCLUES(@Query('q') query: string, @Query('limit') limit?: number) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 20;
    return this.catalogsService.searchCLUES(query.trim(), searchLimit);
  }

  @Get('clues/:code')
  async getCLUESByCode(@Param('code') code: string) {
    const entry = await this.catalogsService.getCLUESEntry(code);
    if (!entry) {
      throw new NotFoundException(`CLUES entry with code ${code} not found`);
    }
    return entry;
  }

  @Get('clues/validate/:code')
  async validateCLUES(@Param('code') code: string) {
    const isValid = await this.catalogsService.validateCLUESInOperation(code);
    return { isValid };
  }

  @Get('cp/search')
  async searchCP(@Query('q') query: string, @Query('limit') limit?: number) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 20;
    return this.catalogsService.searchCP(query.trim(), searchLimit);
  }

  @Get('cp/:code')
  async getCPByCode(@Param('code') code: string) {
    const entry = await this.catalogsService.getCatalogEntry(
      CatalogType.CODIGOS_POSTALES,
      code,
    );
    if (!entry) {
      throw new NotFoundException(
        `Postal code entry with code ${code} not found`,
      );
    }
    return entry;
  }

  @Get('geo/estados')
  getEstados() {
    return this.catalogsService.getEstados();
  }

  @Get('geo/municipios/:estadoCode')
  getMunicipios(@Param('estadoCode') estadoCode: string) {
    return this.catalogsService.getMunicipiosByEstado(estadoCode);
  }

  @Get('geo/localidades/:estadoCode/:municipioCode')
  getLocalidades(
    @Param('estadoCode') estadoCode: string,
    @Param('municipioCode') municipioCode: string,
    @Query('q') query?: string,
  ) {
    return this.catalogsService.getLocalidadesByMunicipio(
      estadoCode,
      municipioCode,
      query,
    );
  }

  @Get('geo/estados/search')
  async searchEstados(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    return this.catalogsService.searchEstados(query.trim(), searchLimit);
  }

  @Get('geo/estados/:code')
  async getEstadoByCode(@Param('code') code: string) {
    const entry = this.catalogsService.getEstadoByCode(code);
    if (!entry) {
      throw new NotFoundException(`Estado with code ${code} not found`);
    }
    return entry;
  }

  @Get('geo/municipios/:estadoCode/search')
  async searchMunicipios(
    @Param('estadoCode') estadoCode: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    return this.catalogsService.searchMunicipios(
      estadoCode,
      query.trim(),
      searchLimit,
    );
  }

  @Get('nacionalidades/search')
  async searchNacionalidades(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    return this.catalogsService.searchNacionalidades(query.trim(), searchLimit);
  }

  @Get('nacionalidades/:code')
  async getNacionalidadByCode(@Param('code') code: string) {
    const entry = this.catalogsService.getNacionalidadByCode(code);
    if (!entry) {
      throw new NotFoundException(`Nacionalidad with code ${code} not found`);
    }
    return entry;
  }

  @Get('paises/search')
  async searchPaises(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    return await this.catalogsService.searchCatalog(
      CatalogType.PAIS,
      query.trim(),
      searchLimit,
    );
  }

  @Get('paises/:catalogKey')
  async getPaisByCatalogKey(@Param('catalogKey') catalogKey: string) {
    const entry = await this.catalogsService.getCatalogEntry(
      CatalogType.PAIS,
      catalogKey,
    );
    if (!entry) {
      throw new NotFoundException(
        `País with catalog key ${catalogKey} not found`,
      );
    }
    return entry;
  }

  @Get('giis/:catalogType/list')
  async listGIISCatalog(
    @Param('catalogType') catalogType: string,
    @Query('limit') limit?: number,
  ) {
    const allowed = [
      CatalogType.SITIO_OCURRENCIA,
      CatalogType.AGENTE_LESION,
      CatalogType.AREA_ANATOMICA,
      CatalogType.CONSECUENCIA,
      CatalogType.TIPO_PERSONAL,
      CatalogType.TIPO_VIALIDAD,
      CatalogType.TIPO_ASENTAMIENTO,
      CatalogType.PAIS,
    ];
    const catalog = catalogType as CatalogType;
    if (!allowed.includes(catalog)) {
      throw new BadRequestException(
        `Invalid catalog type. Allowed: ${allowed.join(', ')}`,
      );
    }
    const listLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 500)
      : 500;
    return this.catalogsService.listCatalog(catalog, listLimit);
  }
}
