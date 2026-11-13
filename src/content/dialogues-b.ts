import type { Dialogue } from './types';

/** Conversaciones de las paradas 9–15. {P}/{PQ}/{I} se adaptan a quien aprende. */
export const DIALOGUES_B: Dialogue[] = [
  {
    id: 'd8',
    title: 'Mae al teléfono',
    scene: 'Tu pareja te llama desde la casa de teca y, antes de que digas nada, le pasa el móvil a su madre. En la montaña, la cobertura va y viene.',
    place: 'telefono',
    lines: [
      {
        who: 'Mae',
        th: 'ฮัลโหล ได้ยินไหมลูก',
        rom: 'han-lǒo, dâi-yin mǎi lûuk',
        es: '¿Diga? ¿Me oyes, cariño?',
        options: [
          { th: 'ได้ยิน{P} สวัสดี{P}แม่', rom: 'dâi-yin {P}, sà-wàt-dii {P} mɛ̂ɛ', es: 'Te oigo. ¡Hola, mamá!', ok: true, reply: { th: 'สวัสดีจ้ะ ถึงไหนแล้วจ๊ะ', rom: 'sà-wàt-dii jâ, thʉ̌ng nǎi lɛ́ɛo já', es: 'Hola, cariño. ¿Por dónde vais?' } },
          { th: 'เสียงไม่ชัด{P} พูดอีกทีได้ไหม{PQ}', rom: 'sǐang mâi chát {P}, phûut ìik-thii dâi mǎi {PQ}', es: 'No se oye bien. ¿Puedes repetirlo?', ok: true, reply: { th: 'ได้ยินไหม… ถึงไหนแล้วจ๊ะ', rom: 'dâi-yin mǎi… thʉ̌ng nǎi lɛ́ɛo já', es: '¿Me oyes ahora…? ¿Por dónde vais?' } },
          { th: 'ถอดรองเท้า{P}', rom: 'thɔ̀ɔt rɔɔng-tháao {P}', es: 'Quitarse los zapatos', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'ถึงไหนแล้วจ๊ะ',
        rom: 'thʉ̌ng nǎi lɛ́ɛo já',
        es: '¿Por dónde vais, cariño?',
        options: [
          { th: 'ถึงแม่ฮ่องสอนแล้ว{P}', rom: 'thʉ̌ng mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn lɛ́ɛo {P}', es: 'Ya hemos llegado a Mae Hong Son', ok: true, reply: { th: 'ดีจ้ะ ใกล้ถึงบ้านแล้วนะ', rom: 'dii jâ, glâi thʉ̌ng bâan lɛ́ɛo ná', es: '¡Qué bien! Ya casi estáis en casa.' } },
          { th: 'อยู่ที่วัดจองคำ{P}', rom: 'yùu thîi wát jɔɔng-kham {P}', es: 'Estamos en el templo de Chong Kham', ok: true, reply: { th: 'ดีมากจ้ะ ไหว้พระแล้วใช่ไหม', rom: 'dii mâak jâ, wâi phrá lɛ́ɛo châi mǎi', es: '¡Muy bien! Ya habéis presentado vuestros respetos, ¿verdad?' } },
          { th: 'ตีห้า{P}', rom: 'tii hâa {P}', es: 'Las cinco de la madrugada', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'กินข้าวหรือยังลูก',
        rom: 'gin khâao rʉ̌ʉ yang lûuk',
        es: '¿Has comido ya, cariño?',
        options: [
          { th: 'กินแล้ว{P}', rom: 'gin lɛ́ɛo {P}', es: 'Sí, ya he comido', ok: true, reply: { th: 'ดีแล้วจ้ะ', rom: 'dii lɛ́ɛo jâ', es: 'Así me gusta.' } },
          { th: 'ยังไม่ได้กิน{P}', rom: 'yang mâi dâi gin {P}', es: 'Todavía no he comido', ok: true, reply: { th: 'ไปกินข้าวก่อนนะลูก', rom: 'pai gin khâao gɔ̀ɔn ná lûuk', es: 'Pues ve a comer primero, cariño.' } },
          { th: 'ไม่กิน{P}', rom: 'mâi gin {P}', es: 'No pienso comer', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'จะถึงบ้านเมื่อไหร่จ๊ะ',
        rom: 'jà thʉ̌ng bâan mʉ̂a-rài já',
        es: '¿Cuándo llegáis a casa?',
        options: [
          { th: 'พรุ่งนี้ตอนเย็น{P}', rom: 'phrûng-níi tɔɔn-yen {P}', es: 'Mañana por la tarde', ok: true, reply: { th: 'ได้จ้ะ แม่จะทำข้าวซอยรอนะ', rom: 'dâi jâ, mɛ̂ɛ jà tham khâao-sɔɔi rɔɔ ná', es: 'Muy bien. Mamá os espera con khao soi.' } },
          { th: 'ยังไม่รู้{P} {I}จะโทรไป{P}', rom: 'yang mâi rúu {P}, {I} jà thoo pai {P}', es: 'Aún no lo sé. Ya te llamo yo.', ok: true, reply: { th: 'ได้จ้ะ ส่งไลน์มานะ', rom: 'dâi jâ, sòng lai maa ná', es: 'Vale. Mándame un LINE.' } },
          { th: 'เมื่อวาน{P}', rom: 'mʉ̂a-waan {P}', es: 'Ayer', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'ขับรถช้าๆ นะลูก แม่รออยู่',
        rom: 'khàp-rót cháa-cháa ná lûuk, mɛ̂ɛ rɔɔ yùu',
        es: 'Conducid despacito, cariño. Mamá os espera.',
        options: [
          { th: '{P}แม่ แล้วเจอกัน{P}', rom: '{P} mɛ̂ɛ, lɛ́ɛo jəə gan {P}', es: 'Sí, mamá. ¡Hasta pronto!', ok: true, reply: { th: 'จ้ะ แล้วเจอกันนะ', rom: 'jâ, lɛ́ɛo jəə gan ná', es: 'Hasta pronto, cariño.' } },
          { th: 'ขอบคุณ{P}แม่ พรุ่งนี้เจอกัน{P}', rom: 'khɔ̀ɔp-khun {P} mɛ̂ɛ, phrûng-níi jəə gan {P}', es: 'Gracias, mamá. ¡Nos vemos mañana!', ok: true, reply: { th: 'จ้ะลูก', rom: 'jâ lûuk', es: 'Sí, cariño.' } },
          { th: 'ฮัลโหล ได้ยินไหม{PQ}', rom: 'han-lǒo, dâi-yin mǎi {PQ}', es: '¿Diga? ¿Me oyes?', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd9',
    title: 'Té con Nong',
    scene: 'Una casa de té de adobe frente al lago de Ban Rak Thai. Antes de comprar el encargo de Mae, Nong quiere que pruebes el té… y que le hagas una foto.',
    place: 'cafe',
    lines: [
      {
        who: 'Nong',
        th: 'พี่ชอบชาหรือกาแฟมากกว่ากันคะ',
        rom: 'phîi chɔ̂ɔp chaa rʉ̌ʉ gaa-fɛɛ mâak gwàa gan khá',
        es: '¿Qué te gusta más, el té o el café?',
        options: [
          { th: 'ชอบชามากกว่า{P}', rom: 'chɔ̂ɔp chaa mâak gwàa {P}', es: 'Me gusta más el té', ok: true, reply: { th: 'ดีเลยค่ะ ชาที่นี่หอมที่สุด', rom: 'dii ləəi khâ, chaa thîi-nîi hɔ̌ɔm thîi-sùt', es: '¡Perfecto! El té de aquí es el más aromático.' } },
          { th: 'ชอบกาแฟมากกว่า{P}', rom: 'chɔ̂ɔp gaa-fɛɛ mâak gwàa {P}', es: 'Me gusta más el café', ok: true, reply: { th: 'แต่ชาที่นี่หอมกว่ากาแฟนะคะ', rom: 'tɛ̀ɛ chaa thîi-nîi hɔ̌ɔm gwàa gaa-fɛɛ ná khá', es: 'Pues el té de aquí huele mejor que el café, ¿eh?' } },
          { th: 'ร่มสองคัน{P}', rom: 'rôm sɔ̌ɔng khan {P}', es: 'Dos paraguas', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'เอาชาร้อนกี่แก้วดีคะ',
        rom: 'ao chaa rɔ́ɔn gìi gɛ̂ɛo dii khá',
        es: '¿Cuántos tés calientes pedimos?',
        options: [
          { th: 'สองแก้ว{P}', rom: 'sɔ̌ɔng gɛ̂ɛo {P}', es: 'Dos vasos', ok: true, reply: { th: 'ได้ค่ะ ขอชาร้อนสองแก้วค่ะ', rom: 'dâi khâ, khɔ̌ɔ chaa rɔ́ɔn sɔ̌ɔng gɛ̂ɛo khâ', es: 'Vale. (A la camarera:) Dos tés calientes, por favor.' } },
          { th: 'สามแก้ว{P} ให้น้อยด้วย', rom: 'sǎam gɛ̂ɛo {P}, hâi nɔ́ɔi dûay', es: 'Tres: uno para Noi también', ok: true, reply: { th: 'ได้ค่ะ น้อยชอบชาเหมือนกัน', rom: 'dâi khâ, nɔ́ɔi chɔ̂ɔp chaa mʉ̌an-gan', es: 'Vale. A Noi también le gusta el té.' } },
          { th: 'สองเล่ม{P}', rom: 'sɔ̌ɔng lêm {P}', es: 'Dos… libros (clasificador equivocado)', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ช่วยถ่ายรูปให้หนูหน่อยได้ไหมคะ',
        rom: 'chûay thàai-rûup hâi nǔu nɔ̀i dâi mǎi khá',
        es: '¿Me haces una foto, porfa?',
        options: [
          { th: 'ได้{P} สวยมาก', rom: 'dâi {P}, sǔay mâak', es: 'Claro. ¡Qué bonita!', ok: true, reply: { th: 'ขอบคุณค่ะ ส่งไลน์ให้หนูด้วยนะคะ', rom: 'khɔ̀ɔp-khun khâ, sòng lai hâi nǔu dûay ná khá', es: '¡Gracias! Mándamela por LINE, ¿vale?' } },
          { th: 'ได้{P} ขออีกรูปนะ', rom: 'dâi {P}, khɔ̌ɔ ìik rûup ná', es: 'Claro. ¡Otra más!', ok: true, reply: { th: 'ได้ค่ะ รูปนี้ต้องสวยกว่านะคะ', rom: 'dâi khâ, rûup níi tɔ̂ng sǔay gwàa ná khá', es: 'Vale, pero esta tiene que salir mejor, ¿eh?' } },
          { th: 'ห้ามถ่ายรูป{P}', rom: 'hâam thàai-rûup {P}', es: 'Prohibido hacer fotos', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'แม่ฝากซื้อใบชา ซื้อกี่ถุงดีคะ',
        rom: 'mɛ̂ɛ fàak sʉ́ʉ bai-chaa, sʉ́ʉ gìi thǔng dii khá',
        es: 'Mamá ha encargado hojas de té. ¿Cuántas bolsas compramos?',
        options: [
          { th: 'สองถุง{P} ไปฝากแม่กับยาย', rom: 'sɔ̌ɔng thǔng {P}, pai fàak mɛ̂ɛ gàp yaai', es: 'Dos: una para mamá y otra para Yai', ok: true, reply: { th: 'ดีค่ะ ยายชอบชามาก', rom: 'dii khâ, yaai chɔ̂ɔp chaa mâak', es: '¡Bien! A Yai le encanta el té.' } },
          { th: 'ซื้อถุงใหญ่ที่สุดเลย{P}', rom: 'sʉ́ʉ thǔng yài thîi-sùt ləəi {P}', es: '¡La bolsa más grande que haya!', ok: true, reply: { th: 'พี่ใจดีจัง แม่จะดีใจมากค่ะ', rom: 'phîi jai-dii jang, mɛ̂ɛ jà dii-jai mâak khâ', es: '¡Qué detalle! Mamá se va a poner muy contenta.' } },
          { th: 'ตีสอง{P}', rom: 'tii sɔ̌ɔng {P}', es: 'Las dos de la madrugada', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd3',
    title: 'Llegada a la casa de teca',
    scene: 'Tras 1.864 curvas, la casa de teca. Antes de que sueltes la mochila ya estás en la mesa: Mae sirve, Yai te mira y Pho quiere enseñarte tu cuarto. Toda la familia a la vez.',
    place: 'mesa',
    lines: [
      {
        who: 'Mae',
        th: 'มาถึงแล้ว เหนื่อยไหมลูก',
        rom: 'maa thʉ̌ng lɛ́ɛo, nʉ̀ay mǎi lûuk',
        es: '¡Ya estás aquí! ¿Mucho cansancio, cariño?',
        options: [
          { th: 'นิดหน่อย{P} แต่ดีใจมาก', rom: 'nít-nɔ̀i {P}, tɛ̀ɛ dii-jai mâak', es: 'Un poco, ¡pero qué alegría!', ok: true, reply: { th: 'เข้ามาสิ ยายรออยู่', rom: 'khâo maa sì, yaai rɔɔ yùu', es: '¡Pasa, pasa, que Yai te está esperando!' } },
          { th: 'ไม่เหนื่อย{P} สบายดี', rom: 'mâi nʉ̀ay {P}, sà-baai-dii', es: 'Nada, estoy bien', ok: true, reply: { th: 'ดีจ้ะ มากินข้าวกันก่อนนะ', rom: 'dii jâ, maa gin khâao gan gɔ̀ɔn ná', es: 'Me alegro. Ven, que lo primero es comer.' } },
          { th: 'ตีห้า{P}', rom: 'tii hâa {P}', es: 'Las cinco de la madrugada', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'สวัสดีจ้ะหลาน',
        rom: 'sà-wàt-dii jâ lǎan',
        es: 'Hola, cariño.',
        options: [
          { th: 'สวัสดี{P}ยาย', rom: 'sà-wàt-dii {P} yaai', es: 'Hola, abuela (con un wai)', ok: true, reply: { th: 'ยายดีใจมากที่หลานมาหา', rom: 'yaai dii-jai mâak thîi lǎan maa hǎa', es: 'La abuela está muy contenta de que hayas venido a verla.' } },
          { th: 'ยายสบายดีไหม{PQ}', rom: 'yaai sà-baai-dii mǎi {PQ}', es: '¿Qué tal estás, abuela?', ok: true, reply: { th: 'สบายดีจ้ะ ขอบใจนะ', rom: 'sà-baai-dii jâ, khɔ̀ɔp-jai ná', es: 'Muy bien, cariño, gracias.' } },
          { th: 'ขอตั๋วสองใบ{P}', rom: 'khɔ̌ɔ tǔa sɔ̌ɔng bai {P}', es: 'Dos billetes, por favor', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'กินเยอะๆ นะลูก เอาข้าวอีกไหม',
        rom: 'gin yə́-yə́ ná lûuk, ao khâao ìik mǎi',
        es: 'Come mucho, cariño. ¿Te pongo más arroz?',
        options: [
          { th: 'เอา{P} อร่อยมาก', rom: 'ao {P}, à-rɔ̀i mâak', es: 'Sí, ¡está buenísimo!', ok: true, reply: { th: 'ดีใจจัง กินเยอะๆ นะ', rom: 'dii-jai jang, gin yə́-yə́ ná', es: '¡Qué alegría! Come, come.' } },
          { th: 'ไม่ไหวแล้ว{P} อิ่มมาก', rom: 'mâi wǎi lɛ́ɛo {P}, ìm mâak', es: 'Ya no puedo más. ¡Qué bien he comido!', ok: true, reply: { th: 'กินน้อยจัง พรุ่งนี้กินอีกนะ', rom: 'gin nɔ́ɔi jang, phrûng-níi gin ìik ná', es: '¡Qué poco comes! Mañana, más.' } },
          { th: 'ราคาสองล้านบาท', rom: 'raa-khaa sɔ̌ɔng láan bàat', es: 'Cuesta dos millones de baht', ok: false },
        ],
      },
      {
        who: 'Pho',
        th: 'นี่ห้องของลูกนะ',
        rom: 'nîi hɔ̂ng khɔ̌ɔng lûuk ná',
        es: 'Esta es tu habitación.',
        options: [
          { th: 'ขอบคุณ{P}พ่อ ห้องสวยมาก', rom: 'khɔ̀ɔp-khun {P} phɔ̂ɔ, hɔ̂ng sǔay mâak', es: 'Gracias, papá. ¡Qué habitación tan bonita!', ok: true, reply: { th: 'บ้านไม้สักหลังนี้อายุร้อยปีแล้วนะ', rom: 'bâan máai-sàk lǎng níi aa-yú rɔ́ɔi pii lɛ́ɛo ná', es: 'Esta casa de teca ya tiene cien años, ¿sabes?' } },
          { th: 'ห้องน้ำอยู่ที่ไหน{PQ}', rom: 'hɔ̂ng-náam yùu thîi-nǎi {PQ}', es: '¿Dónde está el baño?', ok: true, reply: { th: 'อยู่ใกล้ครัว ตรงไปแล้วเลี้ยวซ้าย', rom: 'yùu glâi khrua, trong pai lɛ́ɛo líao sáai', es: 'Cerca de la cocina: todo recto y luego a la izquierda.' } },
          { th: 'วันจันทร์{P}', rom: 'wan-jan {P}', es: 'El lunes', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd4',
    title: 'Cocinando con Mae',
    scene: 'Huele a jengibre y a leña. Mae te llama a la cocina: hoy toca khao soi.',
    place: 'cocina',
    lines: [
      {
        who: 'Mae',
        th: 'มาช่วยแม่ทำข้าวซอยไหมจ๊ะ',
        rom: 'maa chûay mɛ̂ɛ tham khâao-sɔɔi mǎi já',
        es: '¿Vienes a ayudar a mamá a hacer khao soi?',
        options: [
          { th: 'ได้{P} ช่วยอะไรดี{PQ}', rom: 'dâi {P}, chûay à-rai dii {PQ}', es: '¡Claro! ¿En qué te ayudo?', ok: true, reply: { th: 'หั่นหอมแดงกับกระเทียมให้แม่หน่อยนะ', rom: 'hàn hɔ̌ɔm-dɛɛng gàp grà-thiam hâi mɛ̂ɛ nɔ̀i ná', es: 'Córtame unas chalotas y un poco de ajo, por favor.' } },
          { th: 'อยากเรียนทำ{P}', rom: 'yàak rian tham {P}', es: '¡Quiero aprender a hacerlo!', ok: true, reply: { th: 'ดีจ้ะ ดูแม่ทำก่อนนะ', rom: 'dii jâ, duu mɛ̂ɛ tham gɔ̀ɔn ná', es: '¡Muy bien! Primero mira cómo lo hago yo.' } },
          { th: 'ข้าวซอยสองชาม{P}', rom: 'khâao-sɔɔi sɔ̌ɔng chaam {P}', es: 'Dos de khao soi, por favor', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'กินเผ็ดได้ไหมลูก',
        rom: 'gin phèt dâi mǎi lûuk',
        es: '¿Aguantas el picante, cariño?',
        options: [
          { th: 'ได้{P} ชอบมาก ใส่พริกเยอะๆ เลย', rom: 'dâi {P}, chɔ̂ɔp mâak, sài phrík yə́-yə́ ləəi', es: '¡Sí, me encanta! Échale muchas guindillas.', ok: true, reply: { th: 'เก่งจัง เหมือนคนเหนือเลย', rom: 'gèng jang, mʉ̌an khon nʉ̌a ləəi', es: '¡Qué valiente! Pareces del norte.' } },
          { th: 'ได้นิดหน่อย{P}', rom: 'dâi nít-nɔ̀i {P}', es: 'Un poquito', ok: true, reply: { th: 'ได้จ้ะ แม่ใส่พริกนิดหน่อยนะ', rom: 'dâi jâ, mɛ̂ɛ sài phrík nít-nɔ̀i ná', es: 'Vale, mamá le pone solo un poquito.' } },
          { th: 'ทอดไข่{P}', rom: 'thɔ̂ɔt khài {P}', es: 'Freír un huevo', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'ชิมหน่อยสิ รสชาติเป็นยังไง',
        rom: 'chim nɔ̀i sì, rót-châat pen yang-ngai',
        es: 'Pruébalo. ¿Qué tal sabe?',
        options: [
          { th: 'อร่อยมาก{P}', rom: 'à-rɔ̀i mâak {P}', es: '¡Buenísimo!', ok: true, reply: { th: 'ดีใจจัง กินเยอะๆ นะลูก', rom: 'dii-jai jang, gin yə́-yə́ ná lûuk', es: '¡Qué alegría! Come mucho, cariño.' } },
          { th: 'เค็มไปหน่อย{P}', rom: 'khem pai nɔ̀i {P}', es: 'Está un poco salado', ok: true, reply: { th: 'ขอบใจจ้ะ ใส่มะนาวอีกหน่อยนะ', rom: 'khɔ̀ɔp-jai jâ, sài má-naao ìik nɔ̀i ná', es: 'Gracias, cariño. Le pongo un poco más de lima.' } },
          { th: 'ต้มสามชั่วโมง{P}', rom: 'tôm sǎam chûa-moong {P}', es: 'Hervir tres horas', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'เอากาแฟร้อนไหมจ๊ะ',
        rom: 'ao gaa-fɛɛ rɔ́ɔn mǎi já',
        es: '¿Te apetece un café caliente?',
        options: [
          { th: 'เอา{P} ขอบคุณ{P}', rom: 'ao {P}, khɔ̀ɔp-khun {P}', es: 'Sí, gracias', ok: true, reply: { th: 'รอแป๊บนึงนะจ๊ะ', rom: 'rɔɔ pɛ́p nʉng ná já', es: 'Espera un momentito, cariño.' } },
          { th: 'อิ่มแล้ว{P} ขอบคุณ{P}', rom: 'ìm lɛ́ɛo {P}, khɔ̀ɔp-khun {P}', es: 'Ya no me cabe nada, gracias', ok: true, reply: { th: 'ไม่เป็นไรจ้ะ', rom: 'mâi-pen-rai jâ', es: 'No pasa nada, cariño.' } },
          { th: 'ฝนตก{P}', rom: 'fǒn tòk {P}', es: 'Llueve', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd5',
    title: 'Junto al fuego',
    scene: 'Es de noche y hace frío. La familia se sienta alrededor del fuego y Yai empieza a contar.',
    place: 'fuego',
    lines: [
      {
        who: 'Yai',
        th: 'อยากฟังเรื่องตอนยายเด็กๆ ไหมจ๊ะ',
        rom: 'yàak fang rʉ̂ang tɔɔn yaai dèk-dèk mǎi já',
        es: '¿Quieres oír una historia de cuando la abuela era pequeña?',
        options: [
          { th: 'อยากฟังมาก{P}', rom: 'yàak fang mâak {P}', es: '¡Me encantaría!', ok: true, reply: { th: 'เมื่อก่อนหมู่บ้านนี้ไม่มีถนนนะ', rom: 'mʉ̂a-gɔ̀ɔn mùu-bâan níi mâi mii thà-nǒn ná', es: 'Antes, este pueblo no tenía carretera, ¿sabes?' } },
          { th: 'ยายง่วงไหม{PQ}', rom: 'yaai ngûang mǎi {PQ}', es: '¿No tienes sueño, abuela?', ok: true, reply: { th: 'ยังไม่ง่วงจ้ะ ฟังนะ', rom: 'yang mâi ngûang jâ, fang ná', es: 'Todavía no, cariño. Escucha.' } },
          { th: 'ห้าร้อยบาท{P}', rom: 'hâa rɔ́ɔi bàat {P}', es: 'Quinientos baht', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ตอนเด็กๆ ยายเดินไปโรงเรียนสองชั่วโมง',
        rom: 'tɔɔn dèk-dèk yaai dəən pai roong-rian sɔ̌ɔng chûa-moong',
        es: 'De pequeña, la abuela iba andando a la escuela: ¡dos horas!',
        options: [
          { th: 'จริงเหรอ{PQ} ไกลมากเลย', rom: 'jing rə̌ə {PQ}, glai mâak ləəi', es: '¿De verdad? ¡Qué lejos!', ok: true, reply: { th: 'จริงจ้ะ แต่สนุกนะ มีเพื่อนเยอะ', rom: 'jing jâ, tɛ̀ɛ sà-nùk ná, mii phʉ̂an yə́', es: 'De verdad. Pero era divertido: tenía muchos amigos.' } },
          { th: 'ยายเก่งมาก{P}', rom: 'yaai gèng mâak {P}', es: '¡Eres una campeona, abuela!', ok: true, reply: { th: 'ขอบใจจ้ะหลาน', rom: 'khɔ̀ɔp-jai jâ lǎan', es: 'Gracias, cariño.' } },
          { th: 'ถอดรองเท้า{P}', rom: 'thɔ̀ɔt rɔɔng-tháao {P}', es: 'Quitarse los zapatos', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'วันหนึ่งฝนตกหนัก ยายเลยไม่ได้ไปโรงเรียน',
        rom: 'wan nʉ̀ng fǒn tòk nàk, yaai ləəi mâi dâi pai roong-rian',
        es: 'Un día llovió muchísimo, así que la abuela no pudo ir a la escuela.',
        options: [
          { th: 'แล้วยายทำอะไร{PQ}', rom: 'lɛ́ɛo yaai tham à-rai {PQ}', es: '¿Y qué hiciste?', ok: true, reply: { th: 'ยายช่วยแม่ทำข้าวซอยทั้งวันเลย', rom: 'yaai chûay mɛ̂ɛ tham khâao-sɔɔi tháng wan ləəi', es: 'Ayudé a mi madre a hacer khao soi todo el día.' } },
          { th: 'ยายกลัวไหม{PQ}', rom: 'yaai glua mǎi {PQ}', es: '¿Pasaste miedo?', ok: true, reply: { th: 'ไม่กลัวจ้ะ ยายชอบฝน', rom: 'mâi glua jâ, yaai chɔ̂ɔp fǒn', es: 'No, cariño. A la abuela le encanta la lluvia.' } },
          { th: 'อร่อยมาก{P}', rom: 'à-rɔ̀i mâak {P}', es: '¡Buenísimo!', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ช้าๆ ได้พร้าเล่มงามนะหลาน เรียนภาษาไทยก็เหมือนกัน',
        rom: 'cháa-cháa dâi phráa lêm ngaam ná lǎan, rian phaa-sǎa thai gɔ̂ɔ mʉ̌an-gan',
        es: '«Despacito se consigue un buen machete», cariño. Con el thai pasa lo mismo.',
        options: [
          { th: 'จริง{P} {I}จะเรียนทุกวัน', rom: 'jing {P}, {I} jà rian thúk wan', es: 'Es verdad. Estudiaré cada día.', ok: true, reply: { th: 'เก่งมากจ้ะ ยายภูมิใจ', rom: 'gèng mâak jâ, yaai phuum-jai', es: '¡Muy bien, cariño! La abuela está orgullosa.' } },
          { th: 'ไม่มีใครแก่เกินเรียน{P}', rom: 'mâi mii khrai gɛ̀ɛ gəən rian {P}', es: 'Nadie es demasiado mayor para aprender', ok: true, reply: { th: 'ใช่จ้ะ ยายก็ยังเรียนอยู่', rom: 'châi jâ, yaai gɔ̂ɔ yang rian yùu', es: 'Así es. La abuela también sigue aprendiendo.' } },
          { th: 'น้ำขึ้นให้รีบตัก{P}', rom: 'náam khʉ̂n hâi rîip tàk {P}', es: '«Cuando sube el agua, date prisa en sacarla»', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd6',
    title: 'La ceremonia del hilo blanco',
    scene: 'En la sala hay un baisi de hojas de plátano del que cuelgan hilos blancos. La familia se sienta en el suelo y Yai te llama a su lado.',
    place: 'sala',
    lines: [
      {
        who: 'Yai',
        th: 'มานั่งใกล้ๆ ยายสิจ๊ะ',
        rom: 'maa nâng glâi-glâi yaai sì já',
        es: 'Ven, siéntate cerca de la abuela.',
        options: [
          { th: 'ได้{P}ยาย', rom: 'dâi {P} yaai', es: 'Sí, abuela', ok: true, reply: { th: 'ยื่นมือมาจ้ะ', rom: 'yʉ̂ʉn mʉʉ maa jâ', es: 'Dame la mano, cariño.' } },
          { th: 'ขออนุญาต{P}', rom: 'khɔ̌ɔ à-nú-yâat {P}', es: 'Con permiso', ok: true, reply: { th: 'พูดเพราะจัง ยื่นมือมาจ้ะ', rom: 'phûut phrɔ́ jang, yʉ̂ʉn mʉʉ maa jâ', es: '¡Qué bien hablas! Dame la mano.' } },
          { th: 'ไม่ได้{P}', rom: 'mâi dâi {P}', es: 'No se puede', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ขวัญเอ๋ยขวัญมา ขอให้หลานมีความสุข',
        rom: 'khwǎn ə̌əi khwǎn maa, khɔ̌ɔ-hâi lǎan mii khwaam-sùk',
        es: '¡Khwan, oh khwan, vuelve! Que seas muy feliz, cariño.',
        options: [
          { th: 'สาธุ', rom: 'sǎa-thú', es: 'Así sea (con las manos en wai)', ok: true, reply: { th: 'ขอให้สุขภาพแข็งแรง อายุยืนนะจ๊ะ', rom: 'khɔ̌ɔ-hâi sùk-khà-phâap khɛ̌ng-rɛɛng, aa-yú-yʉʉn ná já', es: 'Que tengas buena salud y una vida muy larga.' } },
          { th: 'ขอบพระคุณ{P}ยาย', rom: 'khɔ̀ɔp-phrá-khun {P} yaai', es: 'Muchísimas gracias, abuela', ok: true, reply: { th: 'ไม่ต้องขอบคุณจ้ะ ยายรักหลาน', rom: 'mâi tɔ̂ng khɔ̀ɔp-khun jâ, yaai rák lǎan', es: 'No hace falta, cariño. La abuela te quiere.' } },
          { th: 'ใส่พริกเยอะๆ', rom: 'sài phrík yə́-yə́', es: 'Échale muchas guindillas', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'ใส่สายสิญจน์ไว้สามวันนะ อย่าตัดนะลูก',
        rom: 'sài sǎai-sǐn wái sǎam wan ná, yàa tàt ná lûuk',
        es: 'Lleva el hilo tres días y no lo cortes, cariño.',
        options: [
          { th: 'ได้{P} {I}จะไม่ตัด', rom: 'dâi {P}, {I} jà mâi tàt', es: 'Vale, no lo cortaré', ok: true, reply: { th: 'ดีมาก ถ้าจะเอาออก ให้แก้นะ', rom: 'dii mâak, thâa jà ao ɔ̀ɔk, hâi gɛ̂ɛ ná', es: 'Muy bien. Cuando te lo quieras quitar, desátalo.' } },
          { th: 'ทำไมห้ามตัด{PQ}', rom: 'tham-mai hâam tàt {PQ}', es: '¿Por qué no se puede cortar?', ok: true, reply: { th: 'เพราะไม่เป็นมงคลจ้ะ', rom: 'phrɔ́ mâi pen mong-khon jâ', es: 'Porque trae mala suerte, cariño.' } },
          { th: 'ตัดเลย{P}', rom: 'tàt ləəi {P}', es: '¡Lo corto ya!', ok: false },
        ],
      },
      {
        who: 'Pho',
        th: 'ตอนนี้ลูกเป็นคนในครอบครัวเราแล้วนะ',
        rom: 'tɔɔn-níi lûuk pen khon nai khrɔ̂ɔp-khrua rao lɛ́ɛo ná',
        es: 'Ahora ya eres de nuestra familia.',
        options: [
          { th: '{I}ซาบซึ้งใจมาก{P}', rom: '{I} sâap-sʉ́ng jai mâak {P}', es: 'Me llega al alma', ok: true, reply: { th: 'พ่อกับแม่ก็รักลูกนะ', rom: 'phɔ̂ɔ gàp mɛ̂ɛ gɔ̂ɔ rák lûuk ná', es: 'Papá y mamá también te quieren.' } },
          { th: 'ขอบคุณที่ต้อนรับ{I}{P}', rom: 'khɔ̀ɔp-khun thîi tɔ̂ɔn-ráp {I} {P}', es: 'Gracias por acogerme', ok: true, reply: { th: 'ยินดีต้อนรับนะลูก', rom: 'yin-dii tɔ̂ɔn-ráp ná lûuk', es: 'Te damos la bienvenida, cariño.' } },
          { th: 'ห้องน้ำอยู่ที่ไหน{PQ}', rom: 'hɔ̂ng-náam yùu thîi-nǎi {PQ}', es: '¿Dónde está el baño?', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd7',
    title: 'Yai habla kham mueang',
    scene: 'Última mañana en el pueblo. En la sala donde ayer te ató el hilo, Yai se despide de ti en kham mueang, el habla del norte.',
    place: 'sala',
    lines: [
      {
        who: 'Yai',
        th: 'หลาน กิ๋นข้าวเน้อ ลำแต๊ๆ',
        rom: 'lǎan, gǐn khâao nə́ə, lam tɛ́ɛ-tɛ́ɛ',
        es: 'Come, cariño, ¡que está riquísimo!',
        options: [
          { th: 'ลำแต๊ๆ{P}', rom: 'lam tɛ́ɛ-tɛ́ɛ {P}', es: '¡Riquísimo de verdad!', ok: true, reply: { th: 'อู้กำเมืองเก่งแต๊', rom: 'ûu gam-mʉang gèng tɛ́ɛ', es: '¡Qué bien hablas kham mueang!' } },
          { th: 'ยินดี{P}', rom: 'yin-dii {P}', es: 'Gracias (en el norte)', ok: true, reply: { th: 'บ่เป๋นหยังเน้อ', rom: 'bɔ̀ɔ pěn yǎng nə́ə', es: 'No hay de qué, cariño.' } },
          { th: 'บ่ลำ', rom: 'bɔ̀ɔ lam', es: 'No está rico', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ยายดีใจแต๊ๆ ที่หลานมาแอ่ว',
        rom: 'yaai dii-jai tɛ́ɛ-tɛ́ɛ thîi lǎan maa ɛ̀ɛo',
        es: 'La abuela está contentísima de que hayas venido a vernos.',
        options: [
          { th: 'ม่วนแต๊ๆ{P}', rom: 'mûan tɛ́ɛ-tɛ́ɛ {P}', es: '¡Me lo he pasado genial!', ok: true, reply: { th: 'ปิ๊กมาแอ่วบ้านเฮาเน้อ', rom: 'pík maa ɛ̀ɛo bâan hao nə́ə', es: 'Vuelve a visitarnos, ¿eh?' } },
          { th: '{I}ก็ดีใจ{P}', rom: '{I} gɔ̂ɔ dii-jai {P}', es: '¡Y yo también me alegro!', ok: true, reply: { th: 'ยายฮักหลานเน้อ', rom: 'yaai hák lǎan nə́ə', es: 'La abuela te quiere, ¿eh?' } },
          { th: 'บ่ม่วน', rom: 'bɔ̀ɔ mûan', es: 'No ha sido divertido', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ยายกึ๊ดเติงหาหลานเน้อ',
        rom: 'yaai gʉ́t-təəng-hǎa lǎan nə́ə',
        es: 'La abuela te va a echar de menos, cariño.',
        options: [
          { th: 'กึ๊ดเติงหายายเหมือนกัน{P}', rom: 'gʉ́t-təəng-hǎa yaai mʉ̌an-gan {P}', es: 'Yo también te echaré de menos, abuela', ok: true, reply: { th: 'ยายจะรอเน้อ', rom: 'yaai jà rɔɔ nə́ə', es: 'La abuela te esperará, ¿eh?' } },
          { th: 'ปีหน้า{I}จะปิ๊กมาแอ่ว{P}', rom: 'pii nâa {I} jà pík maa ɛ̀ɛo {P}', es: 'El año que viene volveré a veros', ok: true, reply: { th: 'สัญญาเน้อ', rom: 'sǎn-yaa nə́ə', es: '¡Prometido, eh!' } },
          { th: 'บ่ปิ๊ก', rom: 'bɔ̀ɔ pík', es: 'No vuelvo', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ปิ๊กบ้านดีๆ เน้อ',
        rom: 'pík bâan dii-dii nə́ə',
        es: 'Buen viaje de vuelta, ¿eh?',
        options: [
          { th: '{I}รักยาย{P}', rom: '{I} rák yaai {P}', es: 'Te quiero, abuela', ok: true, reply: { th: 'ยายก็ฮักหลานเน้อ', rom: 'yaai gɔ̂ɔ hák lǎan nə́ə', es: 'La abuela también te quiere, ¿eh?' } },
          { th: '{I}จะกลับมาหายายอีก{P}', rom: '{I} jà glàp maa hǎa yaai ìik {P}', es: 'Volveré a verte, abuela', ok: true, reply: { th: 'ไปดีมาดีเน้อ', rom: 'pai dii maa dii nə́ə', es: '¡Ve con bien y vuelve con bien!' } },
          { th: 'บ่เป๋นหยัง', rom: 'bɔ̀ɔ pěn yǎng', es: 'No pasa nada', ok: false },
        ],
      },
    ],
  },
];
