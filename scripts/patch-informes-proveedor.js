#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '../src/modules/informes/informes.service.ts',
);
let content = fs.readFileSync(filePath, 'utf8');

const blockWithSemaforizacion =
  /    const usuario = await this\.usersService\.findById\(userId\);\s*const datosUsuario = \{\s*idProveedorSalud: usuario\.idProveedorSalud,\s*\};\s*const proveedorSalud = await this\.proveedoresSaludService\.findOne\(\s*datosUsuario\.idProveedorSalud,\s*\);\s*const datosProveedorSalud = proveedorSalud\s*\? \{[\s\S]*?semaforizacionActivada:\s*proveedorSalud\.semaforizacionActivada \|\| false,\s*\}\s*: \{[\s\S]*?semaforizacionActivada: false,\s*\};/g;

const blockWithoutSemaforizacion =
  /    const usuario = await this\.usersService\.findById\(userId\);\s*const datosUsuario = \{\s*idProveedorSalud: usuario\.idProveedorSalud,\s*\};\s*const proveedorSalud = await this\.proveedoresSaludService\.findOne\(\s*datosUsuario\.idProveedorSalud,\s*\);\s*const datosProveedorSalud = proveedorSalud\s*\? \{[\s\S]*?colorInforme: proveedorSalud\.colorInforme \|\| '#343A40',\s*\}\s*: \{[\s\S]*?colorInforme: '#343A40',\s*\};/g;

const replacementWithSemaforizacion = `    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
        includeSemaforizacion: true,
      });
    const datosProveedorSalud = proveedorInforme.datos;`;

const replacementWithoutSemaforizacion = `    const proveedorInforme =
      await this.proveedorInformeResolver.resolveDatosProveedorSaludParaInforme({
        userId,
        trabajadorId: String(trabajadorId),
      });
    const datosProveedorSalud = proveedorInforme.datos;`;

const before = content;
content = content.replace(blockWithSemaforizacion, replacementWithSemaforizacion);
content = content.replace(
  blockWithoutSemaforizacion,
  replacementWithoutSemaforizacion,
);

if (content === before) {
  console.error('No replacements made — pattern may have changed');
  process.exit(1);
}

const remaining = (content.match(/const datosUsuario = \{/g) || []).length;
console.log(`Remaining datosUsuario blocks: ${remaining}`);

fs.writeFileSync(filePath, content);
console.log('Patched informes.service.ts');
