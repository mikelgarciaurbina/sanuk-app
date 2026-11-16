const { Platform, LogBox } = require('react-native');
if (__DEV__) LogBox.ignoreAllLogs(true);
const storage = require('@react-native-async-storage/async-storage').default;
const content = require('./src/content');
let config = { route: '/(tabs)', scene: 'camino' };
if (Platform.OS === 'ios') {
  try {
    const { File, Paths } = require('expo-file-system');
    const f = new File(Paths.document, 'store-capture.json');
    if (f.exists) config = JSON.parse(f.textSync());
  } catch {}
} else {
  config = require('./capture-config.json');
}
let rng = 94615;
Math.random = () => { rng = (rng * 48271) % 2147483647; return rng / 2147483647; };
const firstStops = config.scene === 'camino' || config.scene === 'diario' ? 3 : 15;
const completed = Object.fromEntries(content.LESSONS.filter(l => l.stop.n < firstStops).map(l => [l.id,{stars:3,best:8,at:'2026-11-16'}]));
const wordIds = firstStops === 3 ? [...new Set(content.LESSONS.filter(l => completed[l.id]).flatMap(l => l.words))] : Object.keys(content.WORDS);
const words = Object.fromEntries(wordIds.map((id,i)=>[id,{s:2+i%4,due:1999999999999,seen:5,ok:4,bad:1,intro:true}]));
const fixture = {
 v:2,onboarded:true,
 profile:{name:'',gender:'m',motive:'pareja',startStop:1,goal:60},
 bananas:340,curves:firstStops===3?384:1864,completed,words,
 stamps:content.STOPS.filter(s=>s.n<firstStops).map(s=>s.id),missions:[],
 games:{},streak:{count:7,last:'2026-11-16',umbrellas:2,days:['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16']},
 today:{date:'2026-11-16',bananas:24},
 settings:{sound:false,haptics:false,voiceRate:.85,romanization:true,reminder:{enabled:false,hour:19,minute:0}}
};
const get = storage.getItem.bind(storage);
storage.getItem = async (key,...args) => key === 'sanuk:progress:v1' ? JSON.stringify(fixture) : get(key,...args);
require('expo-router/entry');
function go(attempt=0) {
  try { require('expo-router').router.replace(config.route); }
  catch (error) { if (attempt<100) setTimeout(()=>go(attempt+1),400); }
}
setTimeout(go,1500);
