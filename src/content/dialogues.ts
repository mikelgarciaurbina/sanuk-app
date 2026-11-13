import type { Dialogue } from './types';

/** Conversaciones para «Cena familiar». {P}/{PQ}/{I} se adaptan a quien aprende. */
export const DIALOGUES_A: Dialogue[] = [
  {
    id: 'd0',
    title: 'Noi te saluda',
    scene: 'Amanece en la puerta Tha Phae, en Chiang Mai. Noi, tu guía, quiere oír tu primer saludo.',
    place: 'calle',
    lines: [
      {
        who: 'Noi',
        th: 'สวัสดีค่ะ',
        rom: 'sà-wàt-dii khâ',
        es: '¡Hola!',
        options: [
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: true, reply: { th: 'เก่งมากค่ะ', rom: 'gèng mâak khâ', es: '¡Muy bien!' } },
          { th: 'ขอบคุณ{P}', rom: 'khɔ̀ɔp-khun {P}', es: 'Gracias', ok: false },
          { th: 'ขอบคุณ ขอบคุณ', rom: 'khɔ̀ɔp-khun khɔ̀ɔp-khun', es: 'Gracias, gracias', ok: false },
        ],
      },
      {
        who: 'Noi',
        th: 'นี่ค่ะ กล้วย',
        rom: 'nîi khâ glûay',
        es: 'Toma, un plátano para ti.',
        options: [
          { th: 'ขอบคุณ{P}', rom: 'khɔ̀ɔp-khun {P}', es: 'Gracias', ok: true, reply: { th: 'ไม่เป็นไรค่ะ', rom: 'mâi-pen-rai khâ', es: 'De nada.' } },
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: false },
          { th: 'สวัสดี สวัสดี', rom: 'sà-wàt-dii sà-wàt-dii', es: 'Hola, hola', ok: false },
        ],
      },
      { who: 'Noi', th: 'ไปกันเถอะ', rom: 'pai gan thə̀', es: '¡Venga, vamos allá!' },
    ],
  },
  {
    id: 'd1',
    title: 'En la puerta Tha Phae',
    scene: 'Nong, la hermana pequeña de tu pareja, estudia en Chiang Mai. Ha venido a buscarte a la puerta Tha Phae: sube contigo y con Noi hasta Mae Hong Son.',
    place: 'calle',
    lines: [
      {
        who: 'Nong',
        th: 'สวัสดีค่ะ พี่',
        rom: 'sà-wàt-dii khâ phîi',
        es: '¡Hola! (Te llama พี่: para ella ya eres de la familia.)',
        options: [
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: true, reply: { th: 'หนูชื่อน้องค่ะ', rom: 'nǔu chʉ̂ʉ nɔ́ɔng khâ', es: 'Soy Nong. (หนู es su manera de decir «yo».)' } },
          { th: 'ขอโทษ{P}', rom: 'khɔ̌ɔ-thôot {P}', es: 'Perdón', ok: false },
          { th: 'ไม่ได้{P}', rom: 'mâi dâi {P}', es: 'No se puede', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ยินดีที่ได้รู้จักค่ะ',
        rom: 'yin-dii thîi dâi rúu-jàk khâ',
        es: '¡Encantada de conocerte!',
        options: [
          { th: 'ยินดีที่ได้รู้จัก{P}', rom: 'yin-dii thîi dâi rúu-jàk {P}', es: 'Igualmente, un placer', ok: true, reply: { th: 'พี่พูดไทยเก่งมากค่ะ', rom: 'phîi phûut thai gèng mâak khâ', es: '¡Qué bien hablas thai!' } },
          { th: 'ไม่เป็นไร{P}', rom: 'mâi-pen-rai {P}', es: 'No pasa nada', ok: false },
          { th: 'ไม่ใช่{P}', rom: 'mâi châi {P}', es: 'No es eso', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'พี่สบายดีไหมคะ',
        rom: 'phîi sà-baai-dii mǎi khá',
        es: '¿Qué tal estás?',
        options: [
          { th: 'สบายดี{P} แล้วน้องล่ะ{PQ}', rom: 'sà-baai-dii {P}, lɛ́ɛo nɔ́ɔng lâ {PQ}', es: 'Bien, ¿y tú?', ok: true, reply: { th: 'สบายดีค่ะ', rom: 'sà-baai-dii khâ', es: '¡Muy bien!' } },
          { th: 'ใช่{P}', rom: 'châi {P}', es: 'Sí, correcto', ok: false },
          { th: 'แล้วเจอกัน{P}', rom: 'lɛ́ɛo jəə gan {P}', es: '¡Hasta luego!', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'พี่มาจากสเปนใช่ไหมคะ',
        rom: 'phîi maa jàak sà-peen châi mǎi khá',
        es: 'Vienes de España, ¿verdad?',
        options: [
          { th: 'ใช่{P} {I}มาจากสเปน{P}', rom: 'châi {P}, {I} maa jàak sà-peen {P}', es: 'Sí, soy de España', ok: true, reply: { th: 'ไกลมากเลยค่ะ', rom: 'glai mâak ləəi khâ', es: '¡Eso está lejísimos!' } },
          { th: 'ไม่ใช่{P} {I}ชื่อน้อย', rom: 'mâi châi {P}, {I} chʉ̂ʉ nɔ́ɔi', es: 'No, me llamo Noi', ok: false },
          { th: 'ขอบคุณ{P}', rom: 'khɔ̀ɔp-khun {P}', es: 'Gracias', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'พรุ่งนี้เช้าเราไปแม่ฮ่องสอนกันนะคะ',
        rom: 'phrûng-níi cháao rao pai mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn gan ná khá',
        es: 'Mañana por la mañana nos vamos a Mae Hong Son, ¿vale? (¡muy deprisa!)',
        options: [
          { th: 'ไม่เข้าใจ{P} พูดช้าๆ หน่อย{P}', rom: 'mâi khâo-jai {P}, phûut cháa-cháa nɔ̀i {P}', es: 'No entiendo, más despacio, por favor', ok: true, reply: { th: 'พรุ่งนี้… ไป… แม่ฮ่องสอน… นะคะ', rom: 'phrûng-níi… pai… mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn… ná khá', es: 'Mañana… vamos… a Mae Hong Son… ¿vale?' } },
          { th: 'พูดอีกทีได้ไหม{PQ}', rom: 'phûut ìik-thii dâi mǎi {PQ}', es: '¿Puedes repetirlo?', ok: true, reply: { th: 'พรุ่งนี้… ไป… แม่ฮ่องสอน… นะคะ', rom: 'phrûng-níi… pai… mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn… ná khá', es: 'Mañana… vamos… a Mae Hong Son… ¿vale?' } },
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ไปกันเถอะ!',
        rom: 'pai gan thə̀!',
        es: '¡Venga, vámonos! (Hoy toca mercado.)',
      },
    ],
  },
  {
    id: 'd1b',
    title: 'De compras en Warorot',
    scene: 'Mercado de Warorot. Nong te lleva de puesto en puesto: hay que subir fruta para Mae y, de paso, probarlo todo.',
    place: 'mercado',
    lines: [
      {
        who: 'Nong',
        th: 'พี่กินเผ็ดได้ไหมคะ',
        rom: 'phîi gin phèt dâi mǎi khá',
        es: '¿Puedes comer picante?',
        options: [
          { th: 'กินเผ็ดได้นิดหน่อย{P}', rom: 'gin phèt dâi nít-nɔ̀i {P}', es: 'Un poco sí', ok: true, reply: { th: 'เก่งมากค่ะ', rom: 'gèng mâak khâ', es: '¡Así me gusta!' } },
          { th: 'กินเผ็ดไม่ได้{P}', rom: 'gin phèt mâi dâi {P}', es: 'No, no puedo con el picante', ok: true, reply: { th: 'ไม่เป็นไรค่ะ', rom: 'mâi-pen-rai khâ', es: 'No pasa nada.' } },
          { th: 'สามสิบบาท{P}', rom: 'sǎam sìp bàat {P}', es: 'Treinta baht', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'พี่เอามะม่วงไหมคะ',
        rom: 'phîi ao má-mûang mǎi khá',
        es: '¿Quieres mango?',
        options: [
          { th: 'เอา{P} มะม่วงเท่าไหร่{PQ}', rom: 'ao {P}, má-mûang thâo-rài {PQ}', es: 'Sí. ¿A cuánto está?', ok: true, reply: { th: 'ยี่สิบบาทค่ะ', rom: 'yîi-sìp bàat khâ', es: 'A veinte baht.' } },
          { th: 'ไม่เอา{P} ขอบคุณ{P}', rom: 'mâi ao {P}, khɔ̀ɔp-khun {P}', es: 'No, gracias', ok: true, reply: { th: 'ได้ค่ะ', rom: 'dâi khâ', es: 'Vale.' } },
          { th: 'ใช่{P}', rom: 'châi {P}', es: 'Sí, correcto', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'อันนี้ห้าสิบบาทค่ะ',
        rom: 'an-níi hâa sìp bàat khâ',
        es: 'Esto cuesta cincuenta baht.',
        options: [
          { th: 'แพงมาก ลดได้ไหม{PQ}', rom: 'phɛɛng mâak, lót dâi mǎi {PQ}', es: '¡Qué caro! ¿Me lo rebajas?', ok: true, reply: { th: 'สี่สิบบาทค่ะ', rom: 'sìi sìp bàat khâ', es: 'Cuarenta baht.' } },
          { th: 'ไม่แพง{P} เอาอันนี้{P}', rom: 'mâi phɛɛng {P}, ao an-níi {P}', es: 'No es caro. Me lo llevo', ok: true, reply: { th: 'ได้ค่ะ ขอบคุณค่ะ', rom: 'dâi khâ, khɔ̀ɔp-khun khâ', es: 'Hecho. ¡Gracias!' } },
          { th: 'ขอโทษ{P}', rom: 'khɔ̌ɔ-thôot {P}', es: 'Perdón', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'อร่อยไหมคะ',
        rom: 'à-rɔ̀i mǎi khá',
        es: '¿Está rico? (Te ha dado a probar algo.)',
        options: [
          { th: 'อร่อยมาก{P}', rom: 'à-rɔ̀i mâak {P}', es: '¡Riquísimo!', ok: true, reply: { th: 'เอาอีกไหมคะ', rom: 'ao ìik mǎi khá', es: '¿Quieres más?' } },
          { th: 'อร่อย{P} เผ็ดนิดหน่อย', rom: 'à-rɔ̀i {P}, phèt nít-nɔ̀i', es: 'Rico… y pica un poco', ok: true, reply: { th: 'เอาน้ำไหมคะ', rom: 'ao náam mǎi khá', es: '¿Quieres agua?' } },
          { th: 'ลดได้ไหม{PQ}', rom: 'lót dâi mǎi {PQ}', es: '¿Me lo rebajas?', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd2',
    title: 'Un café en Pai',
    scene: 'Un café con vistas al valle de Pai. Nong, que sueña con abrir el suyo en el pueblo, pide para los dos.',
    place: 'cafe',
    lines: [
      {
        who: 'Nong',
        th: 'พี่ชอบกาแฟไหมคะ',
        rom: 'phîi chɔ̂ɔp gaa-fɛɛ mǎi khá',
        es: '¿Te gusta el café?',
        options: [
          { th: 'ชอบมาก{P}', rom: 'chɔ̂ɔp mâak {P}', es: '¡Me encanta!', ok: true, reply: { th: 'เอากาแฟร้อนไหมคะ', rom: 'ao gaa-fɛɛ rɔ́ɔn mǎi khá', es: '¿Quieres un café caliente?' } },
          { th: 'ไม่ชอบ{P} ชอบชา', rom: 'mâi chɔ̂ɔp {P} chɔ̂ɔp chaa', es: 'No, me gusta el té', ok: true, reply: { th: 'โอเค เอาชานะคะ', rom: 'oo-khee ao chaa ná khá', es: 'Vale, pido té entonces.' } },
          { th: 'ไกลไหม{PQ}', rom: 'glai mǎi {PQ}', es: '¿Está lejos?', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'หิวไหมคะ',
        rom: 'hǐu mǎi khá',
        es: '¿Tienes hambre?',
        options: [
          { th: 'หิวมาก{P}', rom: 'hǐu mâak {P}', es: 'Mucha hambre', ok: true, reply: { th: 'กินข้าวกันเถอะ', rom: 'gin khâao gan thə̀', es: '¡Pues a comer!' } },
          { th: 'ไม่หิว{P} อิ่มแล้ว', rom: 'mâi hǐu {P} ìm lɛ́ɛo', es: 'No, ya no me cabe más', ok: true, reply: { th: 'ไม่เป็นไรค่ะ', rom: 'mâi-pen-rai khâ', es: 'No pasa nada.' } },
          { th: 'สีแดง{P}', rom: 'sǐi dɛɛng {P}', es: 'Color rojo', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ที่ปายสนุกไหมคะ',
        rom: 'thîi paai sà-nùk mǎi khá',
        es: '¿Te lo pasas bien en Pai?',
        options: [
          { th: 'สนุกมาก{P}', rom: 'sà-nùk mâak {P}', es: '¡Muchísimo!', ok: true, reply: { th: 'ดีใจจังเลย', rom: 'dii-jai jang ləəi', es: '¡Qué alegría!' } },
          { th: 'ขับรถช้าๆ นะ', rom: 'khàp-rót cháa-cháa ná', es: 'Conduce despacio', ok: false },
          { th: 'ทำไม{PQ}', rom: 'tham-mai {PQ}', es: '¿Por qué?', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'หนูอยากมีร้านกาแฟที่บ้านค่ะ',
        rom: 'nǔu yàak mii ráan gaa-fɛɛ thîi bâan khâ',
        es: 'Yo quiero tener un café en el pueblo. (Es su sueño.)',
        options: [
          { th: '{I}อยากไป{P}', rom: '{I} yàak pai {P}', es: '¡Yo quiero ir!', ok: true, reply: { th: 'สัญญานะคะ', rom: 'sǎn-yaa ná khá', es: '¿Prometido?' } },
          { th: 'น้องเก่งมาก{P}', rom: 'nɔ́ɔng gèng mâak {P}', es: '¡Qué crack eres!', ok: true, reply: { th: 'ขอบคุณค่ะ พี่', rom: 'khɔ̀ɔp-khun khâ phîi', es: '¡Gracias!' } },
          { th: '{I}ไม่รู้จักน้อง{P}', rom: '{I} mâi rúu-jàk nɔ́ɔng {P}', es: 'No te conozco', ok: false },
        ],
      },
    ],
  },
];
