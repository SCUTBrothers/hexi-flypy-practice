const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const elements=new Map();
const node=()=>({innerHTML:'',textContent:'',classList:{add(){},remove(){}},style:{setProperty(){}},addEventListener(){},insertAdjacentHTML(){},focus(){},getBoundingClientRect(){return{};},showModal(){this.open=true},close(){this.open=false}});
const stored=new Map();
const context=vm.createContext({console,Date,Math,JSON,setTimeout:()=>0,clearTimeout(){},setInterval(){},location:{hash:''},window:{addEventListener(){}},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},document:{querySelector:s=>{if(!elements.has(s))elements.set(s,node());return elements.get(s);},querySelectorAll:()=>[],addEventListener(){}}});
vm.runInContext(fs.readFileSync('dist/data.js','utf8')+'\n'+fs.readFileSync('dist/speech.js','utf8')+'\n'+fs.readFileSync('dist/app.js','utf8'),context);
function check(code){vm.runInContext(code,context);}
context.assert=assert;
check(`
assert.equal(SpeechCoach.snapshot().supported,false);assert.ok(audioControls(current()).includes('当前浏览器不支持朗读'));assert.equal(groupId,'top-qwert');assert.equal(practiceType,'syllable');assert.equal(hints,false);
assert.equal(GROUPS[0].keys,'qwert');assert.equal(GROUPS[1].keys,'yuiop');
assert.equal(GROUPS.slice(0,6).map(g=>g.keys).join(''),'qwertyuiopasdfghjklzxcvbnm');
assert.equal(GROUPS.length,8);assert.equal(session.items.length,20);
for(const k of Object.keys(KEYMAP)){assert.ok(EXAMPLES[k].length>=10,'Varied bank for '+k);assert.equal(EXAMPLES[k].length,EXAMPLE_SOURCE[k].split(' ').length,'No silently excluded words for '+k);}
for(const g of GROUPS.slice(0,6)){
 for(let round=0;round<50;round++){
  const items=groupedItems(buildPool(g,'syllable'),20);
  assert.equal(items.length,20);assert.equal(new Set(items.map(x=>x.han)).size,20);
  for(const k of g.keys){const count=items.filter(x=>x.key===k).length;assert.ok(count>=Math.floor(20/g.keys.length));}
  for(const item of items){assert.equal(item.kind,'syllable');assert.ok(item.han);assert.equal(item.answer.length,2);assert.ok(g.keys.includes(item.answer[1]));}
 }
}
assert.ok(buildPool(GROUPS.find(g=>g.id==='initial'),'syllable').every(x=>x.kind==='syllable'&&['u','i','v'].includes(x.answer[0])));
for(const ch of session.items[0].answer)accept(ch);assert.ok(session.lastAnswer.han);assert.ok(answerReview(session.lastAnswer).includes('声母'));
progress=fresh();resetPractice();for(let n=0;n<20;n++){for(const ch of current().answer)accept(ch);}
assert.ok(session.done);assert.ok(isGroupDone(GROUPS[0]));assert.equal(mastered(),1);
action('next');assert.equal(groupId,'top-yuiop');assert.equal(practiceType,'syllable');assert.ok(session.items.every(x=>GROUPS[1].keys.includes(x.answer[1])));
progress=fresh();
const vectors={shuang:'ul',pin:'pb',qiu:'qq',zhong:'vs',chun:'iy',xuan:'xr',yue:'yt',nü:'nv',lüe:'lt',gui:'gv',a:'aa',o:'oo',e:'ee',ai:'ai',an:'an',ao:'ao',ang:'ah',en:'en',eng:'eg',er:'er',ou:'ou'};
for(const [py,answer] of Object.entries(vectors))assert.equal(encode(py),answer,py);
assert.equal(Object.keys(KEYMAP).length,26);
for(const k of Object.keys(KEYMAP)){assert.ok(EXAMPLES[k].length>0,'Examples for '+k);for(const x of EXAMPLES[k])assert.equal(x.answer[1],k);}
for(const a of ARTICLES){const items=articleItems(a);assert.equal(items.length,[...a.text].filter(c=>/[\\u3400-\\u9fff]/.test(c)).length);for(const x of items){assert.ok(x.han);assert.match(x.answer,/^[a-z]{2}$/);}}
for(const g of GROUPS){for(const type of ['mapping','syllable']){const pool=buildPool(g,type);assert.ok(pool.length);for(const x of pool)assert.ok(x.answer);}}
makeSession([{prompt:'iu',answer:'q',kind:'mapping',id:'m:iu'}],1,{mode:'practice',group:'top-a',type:'mapping'});
accept('z');assert.equal(progress.mistakes['m:iu'].misses,1);assert.equal(session.index,0);assert.equal(session.attempts,1);
accept('q');assert.ok(session.done);assert.equal(session.correct,1);assert.equal(session.attempts,2);assert.equal(progress.completed.length,0);
for(let i=0;i<3;i++){makeSession([{prompt:'iu',answer:'q',kind:'mapping',id:'m:iu'}],1,{mode:'mistakes'});accept('q');}
assert.equal(progress.mistakes['m:iu'],undefined);
makeSession([{prompt:'iu',answer:'q',kind:'mapping',id:'m:iu'}],1,{mode:'practice',group:'top-a',type:'mapping'});accept('q');assert.ok(progress.completed.includes('top-a:mapping'));
makeSession([{han:'双',py:'shuang',answer:'ul',kind:'syllable',id:'s:shuang'}],1,{mode:'random'});accept('u');assert.equal(session.index,0);assert.equal(session.input,'u');accept('l');assert.ok(session.done);
makeSession([{prompt:'iu',answer:'q',kind:'mapping',id:'m:iu'}],1);action('pause');accept('q');assert.equal(session.index,0);action('pause');accept('q');assert.ok(session.done);
page='articles';makeSession(articleItems(ARTICLES[0]).map(x=>({...x,kind:'syllable',id:'s:'+x.py})),13,{mode:'article',articleId:'daily'});session.items=articleItems(ARTICLES[0]).map(x=>({...x,kind:'syllable',id:'s:'+x.py}));const original=session.items.map(x=>x.han).join('');action('restart');assert.equal(session.items.map(x=>x.han).join(''),original);
assert.ok(JSON.parse(localStorage.getItem(STORAGE)).attempts>0);
`);
console.log('PASS: grouped character practice defaults; 26 keys in six row groups; 300 balanced, varied rounds; 26 word banks; initial-word practice; answer decomposition; group mastery and next group; encoding, articles, mistakes, pause and persistence regressions.');
