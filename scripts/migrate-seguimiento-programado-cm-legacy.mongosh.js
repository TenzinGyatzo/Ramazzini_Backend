/**
 * Migración datos legacy: seguimiento programado cardiometabólico.
 *
 * Ajusta documentos creados antes de simplificar enums / quitar `origen`.
 * Ejecutar en mongosh contra la misma base que usa la app:
 *
 *   mongosh "mongodb://..." nombreDeLaDb migrate-seguimiento-programado-cm-legacy.mongosh.js
 *
 * Si la colección tiene otro nombre, edita COLLECTION abajo (comprobar con
 * db.getCollectionNames().filter(s => s.toLowerCase().includes('programado'))).
 */
const COLLECTION = 'seguimientoprogramadocardiometabolicos';

const coll = db.getCollection(COLLECTION);

const rEstado = coll.updateMany(
  { estado: 'Reprogramada' },
  { $set: { estado: 'Programada' } },
);
print(
  `Estado Reprogramada -> Programada: matched=${rEstado.matchedCount} modified=${rEstado.modifiedCount}`,
);

const motivoMap = {
  'Revisión de laboratorios': 'Otro',
  'Revaloración clínica': 'Otro',
  Reprogramación: 'Otro',
};

for (const [from, to] of Object.entries(motivoMap)) {
  const r = coll.updateMany({ motivo: from }, { $set: { motivo: to } });
  print(`Motivo "${from}" -> "${to}": matched=${r.matchedCount} modified=${r.modifiedCount}`);
}

const rUnset = coll.updateMany({ origen: { $exists: true } }, { $unset: { origen: '' } });
print(`Unset origen: matched=${rUnset.matchedCount} modified=${rUnset.modifiedCount}`);

print('Listo. Realiza backup antes en producción y verifica el nombre de la colección.');
