-- Bounded repair of the 46 blank meanings identified on 15 November 2026.
-- Idempotent: only blank backs change. Existing fronts and parent edits remain.
with meanings(chinese, english, pronunciation) as (values
('风', 'wind', 'fēng'),
('乌龟', 'turtle', 'wū guī'),
('信号灯', 'signal light', 'xìn hào dēng'),
('兔子', 'rabbit', 'tù zi'),
('出发', 'depart', 'chū fā'),
('刹车', 'brake', 'shā chē'),
('卡车', 'truck', 'kǎ chē'),
('后备箱', 'car boot', 'hòu bèi xiāng'),
('喇叭', 'horn', 'lǎ ba'),
('大象', 'elephant', 'dà xiàng'),
('引擎', 'engine', 'yǐn qíng'),
('拖车', 'tow truck', 'tuō chē'),
('搅拌', 'mix', 'jiǎo bàn'),
('方向', 'direction', 'fāng xiàng'),
('月台', 'platform', 'yuè tái'),
('橘子', 'mandarin orange', 'jú zi'),
('水', 'water', 'shuǐ'),
('沙子', 'sand', 'shā zi'),
('油', 'oil', 'yóu'),
('火车', 'train', 'huǒ chē'),
('火车票', 'train ticket', 'huǒ chē piào'),
('熊', 'bear', 'xióng'),
('熊猫', 'panda', 'xióng māo'),
('狮子', 'lion', 'shī zi'),
('猴子', 'monkey', 'hóu zi'),
('站台', 'platform', 'zhàn tái'),
('老虎', 'tiger', 'lǎo hǔ'),
('苹果', 'apple', 'píng guǒ'),
('装载', 'load', 'zhuāng zài'),
('货车', 'goods truck', 'huò chē'),
('车灯', 'vehicle lights', 'chē dēng'),
('车窗', 'vehicle window', 'chē chuāng'),
('车门', 'vehicle door', 'chē mén'),
('运送', 'transport', 'yùn sòng'),
('铁轨', 'railway tracks', 'tiě guǐ'),
('长颈鹿', 'giraffe', 'cháng jǐng lù'),
('雨刮器', 'windscreen wiper', 'yǔ guā qì'),
('青蛙', 'frog', 'qīng wā'),
('飞机', 'aeroplane', 'fēi jī'),
('香蕉', 'banana', 'xiāng jiāo')), repaired as (
 update public.flashcards as card
 set back = meanings.english,
     pinyin = case when btrim(coalesce(card.pinyin, '')) = '' then meanings.pronunciation else card.pinyin end
 from meanings
 where btrim(coalesce(card.back, '')) = ''
   and regexp_replace(card.front, '[^一-鿿]', '', 'g') = meanings.chinese
 returning card.id
)
select count(*) as repaired_cards from repaired;
