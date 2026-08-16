import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  NOTA_MEDICA_CEX_MESSAGES,
  NotaMedicaCexField,
  validateNotaMedicaCexField,
} from '../constants/nota-medica-cex.ranges';

/**
 * CEX NOM-024: sistólica >= diastólica cuando ambas > 0;
 * si una es 0 (desconoce), ambas deben ser 0.
 * Usar a nivel de clase: @Validate(SistolicaMayorIgualDiastolicaConstraint)
 */
@ValidatorConstraint({ name: 'sistolicaMayorIgualDiastolica', async: false })
export class SistolicaMayorIgualDiastolicaConstraint
  implements ValidatorConstraintInterface
{
  private lastMessage: string = NOTA_MEDICA_CEX_MESSAGES.taRelacion;

  validate(value: unknown, args: ValidationArguments): boolean {
    const obj = (args.object ?? value) as {
      tensionArterialSistolica?: number | null;
      tensionArterialDiastolica?: number | null;
    };
    if (
      obj?.tensionArterialSistolica == null ||
      obj?.tensionArterialDiastolica == null
    ) {
      return true;
    }
    const sistolica = Number(obj.tensionArterialSistolica);
    const diastolica = Number(obj.tensionArterialDiastolica);
    if (Number.isNaN(sistolica) || Number.isNaN(diastolica)) return true;

    const sUnknown = sistolica === 0;
    const dUnknown = diastolica === 0;
    if (sUnknown !== dUnknown) {
      this.lastMessage = NOTA_MEDICA_CEX_MESSAGES.taPareja;
      return false;
    }
    if (!sUnknown && !dUnknown && sistolica < diastolica) {
      this.lastMessage = NOTA_MEDICA_CEX_MESSAGES.taRelacion;
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return this.lastMessage;
  }
}

/**
 * Valida rango + formato CEX de un campo (skipea sentinels vía shouldValidate).
 * Uso: @Validate(NotaMedicaCexFieldConstraint, ['peso'])
 */
@ValidatorConstraint({ name: 'notaMedicaCexField', async: false })
export class NotaMedicaCexFieldConstraint
  implements ValidatorConstraintInterface
{
  private lastMessage = 'CEX: valor inválido';

  validate(value: unknown, args: ValidationArguments): boolean {
    const field = args.constraints[0] as NotaMedicaCexField;
    const err = validateNotaMedicaCexField(field, value);
    if (err) {
      this.lastMessage = err;
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return this.lastMessage;
  }
}
