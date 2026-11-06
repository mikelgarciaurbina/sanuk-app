import type { Dialogue } from './types';

/** Conversaciones de las paradas 11–15. {P}/{PQ}/{I} se adaptan a quien aprende. */
export const DIALOGUES_B: Dialogue[] = [
  {
    id: 'd3',
    title: 'Llegada a la casa de teca',
    scene: 'Tras 1.864 curvas, la casa de teca aparece entre la niebla. Mae sale a la terraza a recibirte.',
    lines: [
      {
        who: 'Mae',
        th: 'มาถึงแล้ว เหนื่อยไหมลูก',
        rom: 'maa thʉ̌ng lɛ́ɛo, nʉ̀ay mǎi lûuk',
        es: '¡Ya estás aquí! ¿Mucho cansancio, cariño?',
        options: [
          { th: 'นิดหน่อย{P} แต่ดีใจมาก', rom: 'nít-nɔ̀i {P}, tɛ̀ɛ dii-jai mâak', es: 'Un poco, ¡pero qué alegría!', ok: true, reply: { th: 'เข้ามาสิ ยายรออยู่', rom: 'khâo maa sì, yaai rɔɔ yùu', es: '¡Pasa, pasa, que Yai te está esperando!' } },
          { th: 'ไม่เหนื่อย{P} สบายดี', rom: 'mâi nʉ̀ay {P}, sà-baai-dii', es: 'Nada, estoy bien', ok: true, reply: { th: 'ดีจ้ะ อาบน้ำก่อนนะ แล้วกินข้าวกัน', rom: 'dii jâ, àap-náam gɔ̀ɔn ná, lɛ́ɛo gin khâao gan', es: 'Me alegro. Dúchate primero y luego comemos todos juntos.' } },
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
        who: 'Pho',
        th: 'นี่ห้องของลูกนะ',
        rom: 'nîi hɔ̂ng khɔ̌ɔng lûuk ná',
        es: 'Esta es tu habitación.',
        options: [
          { th: 'ขอบคุณ{P} ห้องสวยมาก', rom: 'khɔ̀ɔp-khun {P}, hɔ̂ng sǔay mâak', es: 'Gracias, ¡qué habitación tan bonita!', ok: true, reply: { th: 'บ้านไม้สักหลังนี้อายุร้อยปีแล้วนะ', rom: 'bâan máai-sàk lǎng níi aa-yú rɔ́ɔi pii lɛ́ɛo ná', es: 'Esta casa de teca ya tiene cien años, ¿sabes?' } },
          { th: 'ห้องน้ำอยู่ที่ไหน{PQ}', rom: 'hɔ̂ng-náam yùu thîi-nǎi {PQ}', es: '¿Dónde está el baño?', ok: true, reply: { th: 'อยู่ใกล้ครัว ตรงไปแล้วเลี้ยวซ้าย', rom: 'yùu glâi khrua, trong pai lɛ́ɛo líao sáai', es: 'Cerca de la cocina: todo recto y luego a la izquierda.' } },
          { th: 'ราคาสองล้านบาท', rom: 'raa-khaa sɔ̌ɔng láan bàat', es: 'Cuesta dos millones de baht', ok: false },
        ],
      },
      {
        who: 'Mae',
        th: 'พรุ่งนี้ตื่นกี่โมงจ๊ะ',
        rom: 'phrûng-níi tʉ̀ʉn gìi moong já',
        es: '¿A qué hora te levantas mañana?',
        options: [
          { th: 'หกโมงเช้า{P}', rom: 'hòk moong cháao {P}', es: 'A las seis de la mañana', ok: true, reply: { th: 'ดีจ้ะ ตอนเช้ามีทะเลหมอกสวยมาก', rom: 'dii jâ, tɔɔn-cháao mii thá-lee-mɔ̀ɔk sǔay mâak', es: '¡Muy bien! Por la mañana hay un mar de niebla precioso.' } },
          { th: 'แปดโมง{P} ตื่นสายหน่อย', rom: 'pɛ̀ɛt moong {P}, tʉ̀ʉn sǎai nɔ̀i', es: 'A las ocho; me gusta dormir un poco más', ok: true, reply: { th: 'ได้จ้ะ นอนหลับฝันดีนะ', rom: 'dâi jâ, nɔɔn làp fǎn dii ná', es: 'Vale, cariño. ¡Que duermas bien!' } },
          { th: 'วันจันทร์{P}', rom: 'wan-jan {P}', es: 'El lunes', ok: false },
        ],
      },
    ],
  },
  {
    id: 'd4',
    title: 'Cocinando con Mae',
    scene: 'Huele a jengibre y a leña. Mae te llama a la cocina: hoy toca khao soi.',
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
        th: 'ชอบเผ็ดไหม',
        rom: 'chɔ̂ɔp phèt mǎi',
        es: '¿Te gusta el picante?',
        options: [
          { th: 'ชอบมาก{P} ใส่พริกเยอะๆ เลย', rom: 'chɔ̂ɔp mâak {P}, sài phrík yə́-yə́ ləəi', es: '¡Me encanta! Échale muchas guindillas.', ok: true, reply: { th: 'เก่งจัง เหมือนคนเหนือเลย', rom: 'gèng jang, mʉ̌an khon nʉ̌a ləəi', es: '¡Qué valiente! Pareces del norte.' } },
          { th: 'เผ็ดนิดหน่อยพอ{P}', rom: 'phèt nít-nɔ̀i phɔɔ {P}', es: 'Solo un poquito picante', ok: true, reply: { th: 'ได้จ้ะ แม่ใส่พริกเม็ดเดียว', rom: 'dâi jâ, mɛ̂ɛ sài phrík mét diao', es: 'Vale, le pongo una sola guindilla.' } },
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
        th: 'ดื่มกาแฟร้อนไหมจ๊ะ',
        rom: 'dʉ̀ʉm gaa-fɛɛ rɔ́ɔn mǎi já',
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
    scene: 'Última mañana en el pueblo. Yai se despide de ti en kham mueang, el habla del norte.',
    lines: [
      {
        who: 'Yai',
        th: 'หลาน กิ๋นข้าวเน้อ ลำแต้ๆ',
        rom: 'lǎan, gǐn khâao nə́ə, lam tɛ̂ɛ-tɛ̂ɛ',
        es: 'Come, cariño, ¡que está riquísimo!',
        options: [
          { th: 'ลำแต้ๆ{P}', rom: 'lam tɛ̂ɛ-tɛ̂ɛ {P}', es: '¡Riquísimo de verdad!', ok: true, reply: { th: 'อู้กำเมืองเก่งแต้', rom: 'ûu gam-mʉang gèng tɛ̂ɛ', es: '¡Qué bien hablas kham mueang!' } },
          { th: 'ยินดี{P}', rom: 'yin-dii {P}', es: 'Gracias (en el norte)', ok: true, reply: { th: 'บ่เป็นหยังเน้อ', rom: 'bɔ̀ɔ pen yǎng nə́ə', es: 'No hay de qué, cariño.' } },
          { th: 'บ่ลำ', rom: 'bɔ̀ɔ lam', es: 'No está rico', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'ยายดีใจแต้ๆ ที่หลานมาแอ่ว',
        rom: 'yaai dii-jai tɛ̂ɛ-tɛ̂ɛ thîi lǎan maa ɛ̀ɛo',
        es: 'La abuela está contentísima de que hayas venido a vernos.',
        options: [
          { th: 'ม่วนแต้ๆ{P}', rom: 'mûan tɛ̂ɛ-tɛ̂ɛ {P}', es: '¡Me lo he pasado genial!', ok: true, reply: { th: 'ปิ๊กมาแอ่วบ้านเฮาเน้อ', rom: 'pík maa ɛ̀ɛo bâan hao nə́ə', es: 'Vuelve a visitarnos, ¿eh?' } },
          { th: '{I}ก็ดีใจ{P}', rom: '{I} gɔ̂ɔ dii-jai {P}', es: '¡Y yo también me alegro!', ok: true, reply: { th: 'ยายฮักหลานเน้อ', rom: 'yaai hák lǎan nə́ə', es: 'La abuela te quiere, ¿eh?' } },
          { th: 'บ่ม่วน', rom: 'bɔ̀ɔ mûan', es: 'No ha sido divertido', ok: false },
        ],
      },
      {
        who: 'Yai',
        th: 'กึ๊ดเติงหลานเน้อ',
        rom: 'gʉ́t-təəng lǎan nə́ə',
        es: 'Te voy a echar de menos, cariño.',
        options: [
          { th: 'กึ๊ดเติงยายเหมือนกัน{P}', rom: 'gʉ́t-təəng yaai mʉ̌an-gan {P}', es: 'Yo también te echaré de menos, abuela', ok: true, reply: { th: 'ยายจะรอเน้อ', rom: 'yaai jà rɔɔ nə́ə', es: 'La abuela te esperará, ¿eh?' } },
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
          { th: 'ขอบคุณสำหรับทุกอย่าง{P}', rom: 'khɔ̀ɔp-khun sǎm-ràp thúk-yàang {P}', es: 'Gracias por todo', ok: true, reply: { th: 'ไปดีมาดีเน้อ', rom: 'pai dii maa dii nə́ə', es: '¡Ve con bien y vuelve con bien!' } },
          { th: 'บ่เป็นหยัง', rom: 'bɔ̀ɔ pen yǎng', es: 'No pasa nada', ok: false },
        ],
      },
    ],
  },
];
