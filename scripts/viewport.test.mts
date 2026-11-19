import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contentWidth, foregroundWidth, gridColumns } from '../src/lib/viewport.ts';

test('al plegar o desplegar se aprovecha el ancho nativo y en la web se limita a 520', () => {
  assert.deepEqual([466, 951, 466].map((width) => contentWidth(width, false)), [466, 951, 466]);
  assert.deepEqual([320, 520, 521, 1440].map((width) => contentWidth(width, true)), [320, 520, 520, 520]);
});

test('la cámara y el menú reservan espacio en cualquiera de los lados, sin reducir dos veces el contenido', () => {
  assert.equal(foregroundWidth(466, 0, 88), 378);
  assert.equal(foregroundWidth(466, 88, 0), 378);
  assert.equal(foregroundWidth(393, 0, 0), 393);
  assert.equal(foregroundWidth(378, 0, 0), 378);
  assert.equal(foregroundWidth(951, 0, 88), 863);
  assert.equal(foregroundWidth(0, 0, 88), 0);
});

test('las rejillas mantienen dos columnas en iPhone y aprovechan las ventanas anchas', () => {
  assert.deepEqual([320, 393, 466, 669, 719, 720, 951, 1000, 1366].map(gridColumns), [2, 2, 2, 2, 2, 3, 3, 4, 4]);
});
