const fs = require('fs');
const path = 'src/modules/informes/informes.service.ts';
let c = fs.readFileSync(path, 'utf8');

const blockStart = '    const enfermeraFirmante';
let removed = 0;
let searchFrom = 0;

while (true) {
  const idx = c.indexOf(blockStart, searchFrom);
  if (idx === -1) break;

  const nextIdx = c.indexOf(blockStart, idx + blockStart.length);
  if (nextIdx === -1) break;

  const between = c.slice(idx, nextIdx);
  const secondBlockEnd = c.indexOf('        };', nextIdx);
  if (secondBlockEnd === -1) break;
  const secondBlock = c.slice(nextIdx, secondBlockEnd + 10);

  if (
    between.includes('primerApellido') &&
    !secondBlock.includes('primerApellido')
  ) {
    c = c.slice(0, nextIdx) + c.slice(secondBlockEnd + 10);
    removed++;
    searchFrom = idx;
  } else {
    searchFrom = nextIdx;
  }
}

fs.writeFileSync(path, c);
console.log('removed', removed, 'duplicate enfermera blocks');
