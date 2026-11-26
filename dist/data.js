'use strict';
const KEYMAP = {
 q:['iu'],w:['ei'],e:['e'],r:['uan'],t:['ue','üe'],y:['un'],u:['u'],i:['i'],o:['o','uo'],p:['ie'],
 a:['a'],s:['ong','iong'],d:['ai'],f:['en'],g:['eng'],h:['ang'],j:['an'],k:['ing','uai'],l:['iang','uang'],
 z:['ou'],x:['ia','ua'],c:['ao'],v:['ui','ü'],b:['in'],n:['iao'],m:['ian']
};
const INITIALS = {u:'sh',i:'ch',v:'zh'};
const EXAMPLE_SOURCE = {
 q:'秋:qiu 球:qiu 求:qiu 九:jiu 久:jiu 牛:niu 流:liu 留:liu 休:xiu 秀:xiu',
 w:'北:bei 杯:bei 飞:fei 非:fei 美:mei 每:mei 黑:hei 给:gei 雷:lei 类:lei',
 e:'河:he 和:he 喝:he 歌:ge 可:ke 课:ke 车:che 热:re 这:zhe 色:se 舍:she',
 r:'船:chuan 穿:chuan 川:chuan 团:tuan 暖:nuan 乱:luan 软:ruan 酸:suan 关:guan 宽:kuan 选:xuan 全:quan',
 t:'月:yue 越:yue 约:yue 雪:xue 学:xue 穴:xue 略:lüe 掠:lüe 缺:que 却:que 虐:nüe',
 y:'春:chun 纯:chun 云:yun 运:yun 迅:xun 寻:xun 轮:lun 村:cun 存:cun 准:zhun 顺:shun 群:qun',
 u:'书:shu 树:shu 数:shu 路:lu 湖:hu 胡:hu 古:gu 不:bu 土:tu 出:chu 如:ru 木:mu',
 i:'你:ni 泥:ni 时:shi 十:shi 吃:chi 迟:chi 日:ri 字:zi 四:si 米:mi 地:di 笔:bi',
 o:'多:duo 朵:duo 国:guo 果:guo 过:guo 波:bo 破:po 摸:mo 火:huo 说:shuo 落:luo 错:cuo',
 p:'写:xie 鞋:xie 谢:xie 别:bie 节:jie 街:jie 贴:tie 铁:tie 且:qie 切:qie 灭:mie 列:lie',
 a:'大:da 打:da 他:ta 她:ta 马:ma 妈:ma 拿:na 那:na 发:fa 沙:sha 茶:cha 卡:ka',
 s:'中:zhong 钟:zhong 种:zhong 冲:chong 虫:chong 东:dong 冬:dong 同:tong 通:tong 红:hong 空:kong 松:song 穷:qiong 兄:xiong 炯:jiong',
 d:'来:lai 海:hai 白:bai 百:bai 开:kai 台:tai 太:tai 在:zai 菜:cai 买:mai 奶:nai 该:gai',
 f:'人:ren 门:men 真:zhen 枕:zhen 深:shen 神:shen 分:fen 粉:fen 本:ben 根:gen 很:hen 肯:ken',
 g:'风:feng 生:sheng 灯:deng 等:deng 能:neng 冷:leng 更:geng 城:cheng 成:cheng 声:sheng 正:zheng 梦:meng',
 h:'上:shang 伤:shang 长:chang 常:chang 方:fang 房:fang 当:dang 忙:mang 旁:pang 让:rang 汤:tang 行:hang',
 j:'山:shan 三:san 看:kan 蓝:lan 南:nan 难:nan 班:ban 半:ban 单:dan 但:dan 站:zhan 产:chan',
 k:'明:ming 名:ming 青:qing 清:qing 星:xing 听:ting 冰:bing 平:ping 快:kuai 块:kuai 怪:guai 乖:guai 怀:huai',
 l:'想:xiang 香:xiang 乡:xiang 双:shuang 光:guang 广:guang 黄:huang 窗:chuang 床:chuang 两:liang 亮:liang 江:jiang',
 z:'走:zou 手:shou 收:shou 口:kou 头:tou 后:hou 有:you 友:you 楼:lou 豆:dou 狗:gou 周:zhou',
 x:'家:jia 加:jia 花:hua 画:hua 夏:xia 下:xia 话:hua 瓜:gua 刮:gua 霞:xia 夹:jia 佳:jia',
 c:'好:hao 早:zao 高:gao 到:dao 刀:dao 跑:pao 包:bao 草:cao 老:lao 少:shao 找:zhao 号:hao',
 v:'水:shui 退:tui 睡:shui 对:dui 队:dui 回:hui 灰:hui 追:zhui 吹:chui 女:nü 绿:lü 旅:lü',
 b:'心:xin 新:xin 林:lin 金:jin 今:jin 近:jin 音:yin 因:yin 民:min 您:nin 品:pin 信:xin',
 n:'小:xiao 笑:xiao 鸟:niao 桥:qiao 巧:qiao 条:tiao 跳:tiao 秒:miao 苗:miao 表:biao 票:piao 叫:jiao',
 m:'天:tian 年:nian 见:jian 件:jian 面:mian 片:pian 先:xian 前:qian 千:qian 电:dian 连:lian 点:dian'
};
function encode(pinyin) {
 const p = pinyin.toLowerCase().replace(/v/g,'ü');
 if (/^[aoe]/.test(p)) {if(p.length===1)return p+p;if(p.length===2)return p;}
 const initial = p.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/);
 if (!initial) {const k=Object.keys(KEYMAP).find(k=>KEYMAP[k].includes(p));return k?p[0]+k:null;}
 const first = {zh:'v',ch:'i',sh:'u'}[initial[0]] || initial[0];
 const final = p.slice(initial[0].length);
 const key = Object.keys(KEYMAP).find(k=>KEYMAP[k].includes(final));
 return key?first+key:null;
}
const EXAMPLES = Object.fromEntries(Object.entries(EXAMPLE_SOURCE).map(([k,s])=>[k,s.split(' ').map(t=>{const [han,py]=t.split(':');return {han,py,answer:encode(py),key:k};}).filter(t=>t.answer?.[1]===k)]));
const GROUPS = [
 {id:'top-qwert',label:'上排 · 前五键',keys:'qwert',description:'用汉字拼写，记住 iu、ei、e、uan、ue / üe 的韵母键'},
 {id:'top-yuiop',label:'上排 · 后五键',keys:'yuiop',description:'随机拼字，熟悉 un、u、i、o / uo、ie 的位置'},
 {id:'home-asdfg',label:'中排 · 前五键',keys:'asdfg',description:'在汉字中区分 a、ong / iong、ai、en、eng'},
 {id:'home-hjkl',label:'中排 · 后四键',keys:'hjkl',description:'对比 ang、an、ing / uai、iang / uang'},
 {id:'bottom-zxcv',label:'下排 · 前四键',keys:'zxcv',description:'通过不同例字，巩固 ou、ia / ua、ao、ui / ü'},
 {id:'bottom-bnm',label:'下排 · 后三键',keys:'bnm',description:'随机练习 in、iao、ian，补全韵母记忆'},
 {id:'initial',label:'复合声母',keys:'uiv',description:'记住 sh → U、ch → I、zh → V'},
 {id:'zero',label:'零声母',keys:'aoe',description:'啊 aa · 爱 ai · 昂 ah，掌握特殊规则'}
];
const ZERO = '啊:a 哦:o 额:e 爱:ai 安:an 昂:ang 恩:en 欧:ou 耳:er'.split(' ').map(t=>{const [han,py]=t.split(':');return {han,py,answer:encode(py)};});
const ARTICLES = [
 {id:'daily',title:'慢慢来，也很好',tag:'日常短句',description:'从熟悉的字词开始，找到连贯输入的节奏。',text:'每天练习一点，让双手慢慢记住。',syllables:'mei tian lian xi yi dian rang shuang shou man man ji zhu'},
 {id:'spring',title:'春日小记',tag:'轻松散文',description:'在春风与花开之间，练习双拼。',text:'春天来了，花开了。风吹过山间，也吹过我的心。',syllables:'chun tian lai le hua kai le feng chui guo shan jian ye chui guo wo de xin'},
 {id:'moon',title:'静夜思',tag:'古诗练习',description:'李白 · 从一句熟悉的诗开始。',text:'床前明月光，疑是地上霜。举头望明月，低头思故乡。',syllables:'chuang qian ming yue guang yi shi di shang shuang ju tou wang ming yue di tou si gu xiang'}
];
function articleItems(article) {const chars=[...article.text].filter(c=>/[\u3400-\u9fff]/.test(c));return article.syllables.split(' ').map((py,i)=>({han:chars[i],py,answer:encode(py)}));}
