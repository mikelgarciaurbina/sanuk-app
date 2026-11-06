import type { Dialogue } from './types';

/** Conversaciones para «Cena familiar». {P}/{PQ}/{I} se adaptan a quien aprende. */
export const DIALOGUES_A: Dialogue[] = [
  {
    id: 'd1',
    title: 'En la puerta Tha Phae',
    scene: 'Nong, la hermana pequeña de la familia, ha bajado a Chiang Mai a recogerte.',
    lines: [
      {
        who: 'Nong',
        th: 'สวัสดีค่ะ',
        rom: 'sà-wàt-dii khâ',
        es: 'Hola',
        options: [
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: true, reply: { th: 'สบายดีไหมคะ', rom: 'sà-baai-dii mǎi khá', es: '¿Qué tal estás?' } },
          { th: 'ขอโทษ{P}', rom: 'khɔ̌ɔ-thôot {P}', es: 'Perdón', ok: false },
          { th: 'ไม่ได้{P}', rom: 'mâi dâi {P}', es: 'No se puede', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'สบายดีไหมคะ',
        rom: 'sà-baai-dii mǎi khá',
        es: '¿Qué tal estás?',
        options: [
          { th: 'สบายดี{P} แล้วคุณล่ะ{PQ}', rom: 'sà-baai-dii {P}, lɛ́ɛo khun lâ {PQ}', es: 'Bien, ¿y tú?', ok: true, reply: { th: 'สบายดีค่ะ', rom: 'sà-baai-dii khâ', es: '¡Muy bien!' } },
          { th: 'ไม่ใช่{P}', rom: 'mâi châi {P}', es: 'No es eso', ok: false },
          { th: 'แล้วเจอกัน{P}', rom: 'lɛ́ɛo jəə gan {P}', es: '¡Hasta luego!', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ชื่ออะไรคะ',
        rom: 'chʉ̂ʉ à-rai khá',
        es: '¿Cómo te llamas?',
        options: [
          { th: '{I}ชื่อ…{P}', rom: '{I} chʉ̂ʉ … {P}', es: 'Me llamo…', ok: true, reply: { th: 'ยินดีที่ได้รู้จักค่ะ', rom: 'yin-dii thîi dâi rúu-jàk khâ', es: '¡Encantada de conocerte!' } },
          { th: 'อะไร{PQ}', rom: 'à-rai {PQ}', es: '¿Qué?', ok: false },
          { th: 'สวัสดี{P}', rom: 'sà-wàt-dii {P}', es: 'Hola', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'ยินดีที่ได้รู้จักค่ะ',
        rom: 'yin-dii thîi dâi rúu-jàk khâ',
        es: '¡Encantada de conocerte!',
        options: [
          { th: 'ยินดีที่ได้รู้จัก{P}', rom: 'yin-dii thîi dâi rúu-jàk {P}', es: 'Encantado igualmente', ok: true, reply: { th: 'มาจากไหนคะ', rom: 'maa jàak nǎi khá', es: '¿De dónde eres?' } },
          { th: 'ไม่เป็นไร{P}', rom: 'mâi-pen-rai {P}', es: 'No pasa nada', ok: false },
          { th: 'ไม่ใช่{P}', rom: 'mâi châi {P}', es: 'No es eso', ok: false },
        ],
      },
      {
        who: 'Nong',
        th: 'มาจากไหนคะ',
        rom: 'maa jàak nǎi khá',
        es: '¿De dónde eres?',
        options: [
          { th: '{I}มาจากสเปน{P}', rom: '{I} maa jàak sà-peen {P}', es: 'Soy de España', ok: true, reply: { th: 'พรุ่งนี้เช้าเราไปแม่ฮ่องสอนกันนะคะ', rom: 'phrûng-níi cháao rao pai mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn gan ná khá', es: 'Mañana por la mañana nos vamos a Mae Hong Son, ¿vale?' } },
          { th: '{I}เป็นคนสเปน{P}', rom: '{I} pen khon sà-peen {P}', es: 'Soy español', ok: true, reply: { th: 'พรุ่งนี้เช้าเราไปแม่ฮ่องสอนกันนะคะ', rom: 'phrûng-níi cháao rao pai mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn gan ná khá', es: 'Mañana por la mañana nos vamos a Mae Hong Son, ¿vale?' } },
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
        es: '¡Vámonos!',
      },
    ],
  },
  {
    id: 'd2',
    title: 'Un café en Pai',
    scene: 'Paráis en un café del valle de Pai. Nong pide para los dos.',
    lines: [
      {
        who: 'Nong',
        th: 'พี่ชอบกาแฟไหมคะ',
        rom: 'phîi chɔ̂ɔp gaa-fɛɛ mǎi khá',
        es: '¿Te gusta el café?',
        options: [
          { th: 'ชอบมาก{P}', rom: 'chɔ̂ɔp mâak {P}', es: '¡Me encanta!', ok: true, reply: { th: 'อยากดื่มกาแฟร้อนไหมคะ', rom: 'yàak dʉ̀ʉm gaa-fɛɛ rɔ́ɔn mǎi khá', es: '¿Quieres un café caliente?' } },
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
          { th: 'ไม่หิว{P} อิ่มแล้ว', rom: 'mâi hǐu {P} ìm lɛ́ɛo', es: 'No, ya estoy lleno', ok: true, reply: { th: 'ไม่เป็นไรค่ะ', rom: 'mâi-pen-rai khâ', es: 'No pasa nada.' } },
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
    ],
  },
];
