/* Reviewed everyday vocabulary shared by instant translation and Swap. */
export const commonWordGroups = [
  ['family people social', [['妈妈','mā ma','mother'],['爸爸','bà ba','father'],['宝宝','bǎo bao','baby'],['朋友','péng you','friend'],['老师','lǎo shī','teacher'],['姐姐','jiě jie','older sister']]],
  ['body self', [['手','shǒu','hand'],['脚','jiǎo','foot'],['眼睛','yǎn jing','eye'],['耳朵','ěr duo','ear'],['鼻子','bí zi','nose'],['嘴巴','zuǐ ba','mouth']]],
  ['home house environment play', [['门','mén','door'],['窗户','chuāng hu','window'],['床','chuáng','bed'],['椅子','yǐ zi','chair'],['桌子','zhuō zi','table'],['球','qiú','ball'],['书','shū','book'],['玩具','wán jù','toy']]],
  ['food mealtime fruit drink', [['水','shuǐ','water'],['牛奶','niú nǎi','milk'],['苹果','píng guǒ','apple'],['香蕉','xiāng jiāo','banana'],['米饭','mǐ fàn','rice'],['鸡蛋','jī dàn','egg'],['杯子','bēi zi','cup'],['汤匙','tāng chí','spoon']]],
  ['farm nature animals', [['兔子','tù zi','rabbit'],['猫','māo','cat'],['狗','gǒu','dog'],['牛','niú','cow'],['羊','yáng','sheep'],['鸭子','yā zi','duck'],['鸡','jī','chicken'],['马','mǎ','horse'],['猪','zhū','pig'],['鸟','niǎo','bird']]],
  ['vehicles transport machinery', [['汽车','qì chē','car'],['巴士','bā shì','bus'],['火车','huǒ chē','train'],['飞机','fēi jī','aeroplane'],['船','chuán','boat'],['脚踏车','jiǎo tà chē','bicycle']]],
  ['actions routines', [['吃','chī','eat'],['喝','hē','drink'],['走','zǒu','walk'],['跑','pǎo','run'],['睡觉','shuì jiào','sleep'],['洗手','xǐ shǒu','wash hands']]],
];

const aliases = { mom: 'mother', mum: 'mother', mummy: 'mother', mommy: 'mother', dad: 'father', daddy: 'father', airplane: 'aeroplane' };
export function lookupCommonTranslation(word, direction = 'zh-to-en') {
  const key = String(word || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const match = commonWordGroups.flatMap(([, words]) => words).find(([chinese,,english]) =>
    direction === 'en-to-zh' ? english === (aliases[key] || key) : chinese === key);
  return match ? { chinese: match[0], pinyin: match[1], english: match[2] } : null;
}
