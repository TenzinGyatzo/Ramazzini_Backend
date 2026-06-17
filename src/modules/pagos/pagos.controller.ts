import crypto from 'crypto';
import { Body, Controller, Get, Param, Post, Put, Query, Headers, Delete } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Public } from 'src/utils/decorators/public.decorator';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('crear-suscripcion')
  async crearSuscripcion(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return await this.pagosService.crearSuscripcion(createSubscriptionDto);
  }

  @Put('actualizar-suscripcion/:id')
  async actualizarSuscripcion(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return await this.pagosService.actualizarSuscripcion(id, updateSubscriptionDto);
  }

  @Get('obtener-suscripcion-api/:id')
  async obtenerSuscripcionDeAPI(@Param('id') id: string) {
    return await this.pagosService.obtenerSuscripcionDeAPI(id);
  }

  @Get('obtener-suscripcion-db/:id')
  async obtenerSuscripcionDeBaseDatos(@Param('id') id: string) {
    return await this.pagosService.obtenerSuscripcionDeBaseDatos(id);
  }

  @Put('cancelar-suscripcion/:id')
  async cancelarSuscripcion(@Param('id') id: string) {
    return await this.pagosService.cancelarSuscripcion(id);
  }

  /* @Post('webhook-mercadopago')
  async recibirInformacionPago(@Body() body: any) {
    console.log('Webhook de Mercado Pago:', body);

    const eventType = body.type; // subscription_preapproval or authorized_payment
    const eventId = body.data.id; // ID del recurso asociado al evento

    try {
      if (eventType === 'subscription_preapproval') {
        // Crear una suscripción en la base de datos
        await this.pagosService.procesarPreapproval(eventId);
      } else if (eventType === 'subscription_authorized_payment') {
        // Procesar un pago autorizado
        await this.pagosService.procesarAuthorizedPayment(eventId);
      } else {
        console.log('Tipo de evento no manejado:', eventType);
      }
      
    } catch (error) {
      console.error('Error al procesar el webhook:', error);
    }

    return { message: 'Webhook recibido correctamente.' };
  } */
 

    @Public()
    @Post('webhook-mercadopago')
    async recibirInformacionPago(
      @Body() body: any,
      @Headers('x-signature') xSignature: string,
      @Headers('x-request-id') xRequestId: string,
      @Query('data.id') dataId: string
    ) {
      console.log('Webhook de Mercado Pago:', body);
    
      // Validar el origen de la notificación
      const isValid = await this.validarNotificacion(xSignature, xRequestId, dataId);
      if (!isValid) {
        console.error('Validación de notificación fallida');
        throw new Error('Notificación no válida');
      }
    
      const eventType = body.type; // subscription_preapproval or authorized_payment
      const eventId = body.data.id; // ID del recurso asociado al evento
    
      try {
        if (eventType === 'subscription_preapproval') {
          await this.pagosService.procesarPreapproval(eventId);
        } else if (eventType === 'subscription_authorized_payment') {
          await this.pagosService.procesarAuthorizedPayment(eventId);
        } else {
          console.log('Tipo de evento no manejado:', eventType);
        }
      } catch (error) {
        console.error('Error al procesar el webhook:', error);
      }
    
      return { message: 'Webhook recibido correctamente.' };
    }
    
    private async validarNotificacion(
      xSignature: string,
      xRequestId: string,
      dataId: string
    ): Promise<boolean> {
      // Parsear el header x-signature
      const parts = xSignature.split(',');
      let ts: string;
      let hash: string;
    
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key.trim() === 'ts') {
          ts = value.trim();
        } else if (key.trim() === 'v1') {
          hash = value.trim();
        }
      });
    
      // Obtener la clave secreta (deberías almacenarla de forma segura, por ejemplo, en variables de entorno)
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    
      // Generar el manifest string
      const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    
      // Generar el HMAC
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const sha = hmac.digest('hex');
    
      // Comparar los hashes
      return sha === hash;
    }
}
