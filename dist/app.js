'use strict';
const $ = s=>document.querySelector(s);
const ICONS={practice:'▦',layout:'⌨',random:'⤨',mistakes:'▤',articles:'▧'};
const PAGES={practice:'进阶练习',layout:'键位速查',random:'随机练习',mistakes:'错题本',articles:'文章练习'};
const STORAGE='hexi-flypy-v1';
const fresh=()=>({attempts:0,correct:0,completed:[],mistakes:{},days:{},sessions:0});
let progress=fresh(),canSave=true;
try{const p=JSON.parse(localStorage.getItem(STORAGE));if(p&&p.days&&p.mistakes&&Array.isArray(p.completed)&&typeof p.attempts==='number')progress={...fresh(),...p};}catch{}
// Keep historical records while the new grouped course starts with its own mastery marks.
if(progress.courseVersion!==2){progress.legacyCompleted=progress.completed.slice();progress.completed=progress.completed.filter(t=>t==='zero');progress.courseVersion=2;}
let page='practice',groupId='top-qwert',focusKey='',practiceType='syllable',hints=false,selectedKey='q',session=null,toastTimer;
let listenOnly=false,autoRead=false,speechRate=0.8,audioUnlocked=false,lastSpeechSession=null,lastSpeechIndex=-1;
try{const settings=JSON.parse(localStorage.getItem('hexi-audio-v1'));if(settings){autoRead=!!settings.autoRead;if([0.65,0.8,1].includes(settings.rate))speechRate=settings.rate;}}catch{}
const today=()=>new Date().toLocaleDateString('en-CA');
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(progress));}catch{if(canSave){canSave=false;toast('当前浏览器无法保存进度，本次仍可继续练习。');}}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function buildPool(group,type,key){
 if(group.id==='zero')return ZERO.map(x=>({...x,kind:'syllable',id:'s:'+x.py}));
 if(group.id==='initial')return Object.values(EXAMPLES).flat().filter(x=>Object.keys(INITIALS).includes(x.answer[0])).map(x=>({...x,kind:'syllable',id:'s:'+x.py}));
 const keys=key?[key]:[...group.keys];
 if(type==='mapping')return keys.flatMap(k=>KEYMAP[k].map(final=>({prompt:final,answer:k,key:k,kind:'mapping',id:'m:'+final})));
 return keys.flatMap(k=>EXAMPLES[k].map(x=>({...x,kind:'syllable',id:'s:'+x.py})));
}
function makeSession(pool,count=18,meta={}){
 const items=[];while(items.length<count&&pool.length)items.push(...shuffle(pool));
 session={items:items.slice(0,count),index:0,attempts:0,correct:0,input:'',error:false,errorMessage:'',startedAt:0,lastAction:0,activeMs:0,paused:false,done:false,failed:false,working:false,...meta};
}
function groupedItems(pool,count){
 const keys=[...new Set(pool.map(x=>x.key))];const buckets=Object.fromEntries(keys.map(k=>[k,shuffle(pool.filter(x=>x.key===k))]));const items=[];
 while(items.length<count){for(const k of shuffle(keys)){if(!buckets[k].length)buckets[k]=shuffle(pool.filter(x=>x.key===k));items.push(buckets[k].pop());if(items.length===count)break;}}
 return items;
}
function resetPractice(){SpeechCoach.stop();const g=GROUPS.find(x=>x.id===groupId);const pool=buildPool(g,practiceType);makeSession(pool,20,{mode:'practice',group:g.id,focus:'',type:practiceType});if(!['initial','zero'].includes(g.id))session.items=groupedItems(pool,20);}
function navigate(next){SpeechCoach.stop();page=next;session=null;location.hash=next;if(next==='practice')resetPractice();render();}
function mastered(){return GROUPS.filter(isGroupDone).length;}
function navHTML(){return Object.entries(PAGES).map(([id,label])=>`<button class="nav-item ${page===id?'active':''}" data-nav="${id}"><span class="nav-icon">${ICONS[id]}</span>${label}${id==='mistakes'?`<span class="nav-count">${Object.keys(progress.mistakes).length}</span>`:id==='practice'?'<span class="nav-small">开始</span>':''}</button>`).join('');}
function heading(eyebrow,title,description,extra=''){return `<section class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${extra}</section>`;}
function render(){
 $('#navigation').innerHTML=navHTML();$('#breadcrumb-current').textContent=PAGES[page];
 if(page==='practice')renderPractice();if(page==='layout')renderLayout();if(page==='random')renderRandom();if(page==='mistakes')renderMistakes();if(page==='articles')renderArticles();
 bind();
}
function renderPractice(){
 if(!session)resetPractice();const group=GROUPS.find(g=>g.id===groupId);
 $('#main').innerHTML=heading('一点一点，练成习惯','每一次敲击，都更熟悉一点。','按键位分组，随机拼写汉字；在声母与韵母的组合里记住每个键。',`<div class="heading-label"><span>当前方案</span><strong>小鹤双拼 <small>FLYPY</small></strong></div>`)+`
 <div class="learning-path">${GROUPS.map((g,i)=>`<button data-group="${g.id}" class="path-step ${g.id===groupId?'selected':''} ${isGroupDone(g)?'mastered':''}"><span class="step-number">${isGroupDone(g)?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${g.label}</strong><small>${g.id==='initial'?'SH / CH / ZH':g.id==='zero'?'A / O / E':[...g.keys].join(' ').toUpperCase()}</small></span></button>`).join('')}</div>
 <div class="practice-grid"><div class="practice-main"><section class="panel lesson-panel"><div class="lesson-top"><div><span class="lesson-badge">专项练习</span><h2>${group.label}<span> / ${group.id==='initial'?'复合声母':group.id==='zero'?'特殊音节':'分组拼字'}</span></h2></div><button class="text-button" data-action="restart">重新开始</button></div>
 ${!['initial','zero'].includes(groupId)?`<div class="lesson-controls"><div class="segmented"><button data-type="syllable" class="${practiceType==='syllable'?'selected':''}">随机汉字拼写</button><button data-type="mapping" class="${practiceType==='mapping'?'selected':''}">韵母热身</button></div><label class="switch-label"><input id="hints" type="checkbox" ${hints?'checked':''}><span class="switch"></span>答案提示</label></div><p class="group-description">${group.description}</p><div class="group-keys">${[...group.keys].map(k=>`<span class="group-key"><kbd>${k.toUpperCase()}</kbd><span>${KEYMAP[k].join(' / ')}</span></span>`).join('')}</div><p class="group-scope">每轮 20 题，混合覆盖组内各键；分组限定韵母键，声母不限。</p>`:`<p class="lesson-description">${group.description}</p><label class="switch-label special-switch"><input id="hints" type="checkbox" ${hints?'checked':''}><span class="switch"></span>答案提示</label>`}
 <div id="session-area"></div></section><section class="panel keyboard-panel"><div class="section-title"><h3>让手指记住位置</h3><div class="legend"><span><i class="legend-final"></i>韵母</span><span><i class="legend-initial"></i>复合声母</span><span><i class="legend-current"></i>当前提示</span></div></div><div id="live-keyboard"></div><div class="keyboard-caption"><span>标准 QWERTY 键盘</span><span>第一键声母 · 第二键韵母</span></div></section></div>${asideHTML()}</div><div class="below-note"><span>✧</span> 先读拼音、拆出韵母，再回想键位。每组都可以反复随机练习。<button class="text-button" data-nav="layout">查看完整规则</button></div>`;
 renderSession();
}
function isGroupDone(g){return progress.completed.includes(['initial','zero'].includes(g.id)?g.id:g.id+':syllable');}
function asideHTML(){const day=progress.days[today()]||0;const percentage=Math.min(100,Math.round(day/50*100));return `<aside class="right-rail"><section class="panel daily-panel"><div class="section-title"><h3>今天，也进步一点</h3><span class="sun-icon">☼</span></div><div class="daily-ring" style="--pct:${percentage}%"><div><strong id="daily-number">${day}</strong><span>/ 50 题</span></div></div><p class="daily-caption">每日小目标</p><div class="daily-facts"><div><span>累计练习</span><strong>${progress.attempts} <small>次</small></strong></div><div><span>总正确率</span><strong>${progress.attempts?Math.round(progress.correct/progress.attempts*100):'—'}<small>${progress.attempts?' %':''}</small></strong></div></div></section><section class="tip-card"><div class="tip-icon">✧</div><h3>双拼，其实就两步</h3><p>一个键打声母，<br>一个键打韵母。</p><div class="tip-example"><strong>秋 <small>qiu</small></strong><div><kbd>Q</kbd><span>+</span><kbd>Q</kbd></div></div><div class="tip-breakdown"><span>q · 声母</span><span>iu · 韵母</span></div><p class="tip-bottom">遇到不熟悉的键位，<br>多重复几次就好。</p></section><div class="course-count"><span>学习旅程</span><strong>${mastered()} / ${GROUPS.length} <small>组已掌握</small></strong><div class="thin-track"><i style="width:${mastered()/GROUPS.length*100}%"></i></div></div></aside>`;}
function keyboardHTML(highlight='',layout=false){return `<div class="keyboard ${layout?'layout-keyboard':''}">${['qwertyuiop','asdfghjkl','zxcvbnm'].map(row=>`<div class="keyboard-row">${[...row].map(k=>`<button class="keycap ${highlight===k?'highlight':''} ${layout&&selectedKey===k?'selected-key':''}" ${layout?'data-inspect':'data-press'}="${k}" aria-label="${k.toUpperCase()}，${INITIALS[k]?'声母 '+INITIALS[k]+'，':''}韵母 ${KEYMAP[k].join('、')}"><span class="key-letter">${k.toUpperCase()}</span>${INITIALS[k]?`<span class="key-initial">${INITIALS[k]}</span>`:''}<span class="key-final">${KEYMAP[k].join(' · ')}</span></button>`).join('')}</div>`).join('')}<div class="spacebar" aria-hidden="true">小鹤双拼 · 两键一音</div></div>`;}
function current(){return session?.items[session.index];}
function soundParts(item){if(/^[aoe]/.test(item.py))return {initial:'',final:item.py};const initial=INITIALS[item.answer[0]]||item.py[0];return {initial,final:item.py.slice(initial.length)};}
function soundLabel(item){const parts=soundParts(item);return parts.initial?`声母 ${parts.initial} · 韵母 ${parts.final}`:`零声母音节 ${parts.final}`;}
function answerReview(item){return `<span>上一题</span><strong>${item.han}</strong><span>${item.py}</span><kbd>${item.answer.toUpperCase().split('').join(' + ')}</kbd><small>${soundLabel(item)}</small>`;}
function saveAudioSettings(){try{localStorage.setItem('hexi-audio-v1',JSON.stringify({autoRead,rate:speechRate}));}catch{}}
function audioItem(item=current()){if(!item)return null;if(item.kind==='syllable')return item;return (EXAMPLES[item.key]||[]).find(x=>soundParts(x).final===item.prompt)||null;}
function hideQuestion(){return listenOnly&&current()?.kind==='syllable'&&!session.revealed;}
function playCurrent(){
 if(!session||session.done||session.paused)return false;const item=audioItem();if(!item)return false;
 audioUnlocked=true;lastSpeechSession=session;lastSpeechIndex=session.index;
 const ok=SpeechCoach.speak(item,speechRate);if(!ok)toast(SpeechCoach.snapshot().message);return ok;
}
function maybeSpeak(){if(autoRead&&audioUnlocked&&!session.paused&&!session.done&&(lastSpeechSession!==session||lastSpeechIndex!==session.index))playCurrent();}
function audioControls(item){const state=SpeechCoach.snapshot();const syllable=item.kind==='syllable';const sample=audioItem(item);return `<section class="audio-coach" aria-label="发音与听音练习"><div class="audio-top"><div class="listening-modes"><button data-presentation="read" class="${!listenOnly||!syllable?'selected':''}" aria-pressed="${!listenOnly||!syllable}">看字拼写</button>${syllable?`<button data-presentation="listen" class="${listenOnly?'selected':''}" aria-pressed="${listenOnly}" ${!state.available?'disabled':''}>听音拼写</button>`:''}</div><button class="speech-button" data-speech="play" ${!state.supported||session.paused?'disabled':''}><span aria-hidden="true">◖))</span> ${listenOnly&&syllable?'重听题目':'听发音'}<kbd>空格</kbd></button></div><div class="audio-options"><label class="switch-label"><input id="auto-read" type="checkbox" ${autoRead?'checked':''} ${!state.supported?'disabled':''}><span class="switch"></span>自动朗读下一题</label><label class="rate-label">语速<select id="speech-rate" aria-label="朗读语速"><option value="0.65" ${speechRate===0.65?'selected':''}>慢速</option><option value="0.8" ${speechRate===0.8?'selected':''}>舒缓</option><option value="1" ${speechRate===1?'selected':''}>正常</option></select></label></div><div class="audio-status-row"><span id="speech-status" role="status" aria-live="polite">${escapeHTML(state.message)}</span><button class="text-button" data-speech="refresh">重新检测</button></div><p class="audio-note">${syllable?listenOnly?'先听读音，输入两位双拼；答对后揭晓。多音字用词语和字序提示。':'听汉字读音，再把声母、韵母与按键联系起来。多音字用词语和字序提示。':sample?`朗读例字「${sample.han} ${sample.py}」，听其中的韵母 ${item.prompt}。`:'这个韵母暂没有可朗读的例字。'}${!audioUnlocked&&(autoRead||listenOnly)?' 点击「听发音」或「重听题目」启用声音。':''}</p></section>`;}
function updateAudioStatus(state){const label=$('#speech-status');if(label)label.textContent=state.message;document.querySelectorAll('[data-presentation="listen"]').forEach(b=>b.disabled=!state.available);document.querySelectorAll('[data-speech="play"]').forEach(b=>{b.setAttribute?.('aria-busy',state.status==='loading'||state.status==='speaking'?'true':'false');});}
function bindAudioControls(){
 document.querySelectorAll('[data-presentation]').forEach(b=>b.onclick=()=>{const listen=b.dataset.presentation==='listen';if(listen&&!SpeechCoach.refresh().available){toast(SpeechCoach.snapshot().message);return;}SpeechCoach.stop();listenOnly=listen;session.revealed=false;session.input='';session.error=false;lastSpeechSession=null;if(listen){audioUnlocked=true;autoRead=true;saveAudioSettings();}renderSession();});
 document.querySelectorAll('[data-speech]').forEach(b=>b.onclick=()=>{const action=b.dataset.speech;if(action==='play')playCurrent();if(action==='refresh'){const state=SpeechCoach.refresh();toast(state.message);}if(action==='reveal'){session.revealed=true;session.assisted=(session.assisted||0)+1;renderSession();}});
 const auto=$('#auto-read');if(auto)auto.onchange=()=>{autoRead=auto.checked;saveAudioSettings();if(autoRead)playCurrent();else SpeechCoach.stop();};
 const rate=$('#speech-rate');if(rate)rate.onchange=()=>{speechRate=Number(rate.value);saveAudioSettings();if(audioUnlocked)playCurrent();};
}
function renderSession(){if(!session)return;const wasFocused=document.activeElement?.id==='typing-input';const area=$('#session-area');if(!area)return;
 if(session.done){SpeechCoach.stop();renderResult();return;}
 const item=current(),syllable=item.kind==='syllable',elapsed=Math.floor(session.activeMs/1000),hidden=hideQuestion();
 area.innerHTML=`${audioControls(item)}<div class="exercise-meta"><span>${hidden?'听音后输入双拼编码':session.mode==='article'?'连贯练习':syllable?'输入这个字的双拼编码':item.kind==='initial'?'这个声母对应哪个键？':'这个韵母对应哪个键？'}</span><span><strong>${session.index+1}</strong> / ${session.items.length}</span></div><div class="exercise-progress"><i style="width:${session.index/session.items.length*100}%"></i></div>
 ${session.lastAnswer?`<div class="last-answer" aria-live="polite">${answerReview(session.lastAnswer)}</div>`:''}
 ${session.mode==='article'?`<div class="article-stream">${session.items.map((x,i)=>`<span class="${i<session.index?'typed':i===session.index?'current-char':''}">${listenOnly&&i>=session.index?(i===session.index?'?':'·'):x.han}</span>`).join('')}</div>`:''}
 <div class="question-zone ${session.paused?'paused':''}"><span class="prompt-label">${hidden?'听音辨韵 · 两键拼写':syllable?'汉字 · '+item.py:item.kind==='initial'?'声母 INITIAL':'韵母 FINAL'}</span><div class="question ${hidden?'listening-question':syllable?'hanzi':''}">${hidden?'<span class="sound-wave" aria-label="题目已隐藏，请听发音"><i></i><i></i><i></i><i></i><i></i></span>':syllable?item.han:item.prompt}</div><div class="question-helper">${hidden?'听读音，想声母，再找韵母键':hints?syllable?`${item.py} <span class="helper-divider">/</span> ${item.answer.split('').join(' + ').toUpperCase()}`:`记住它的位置 <span class="helper-divider">/</span> ${item.answer.toUpperCase()}`:syllable?soundLabel(item):'回想它在键盘上的位置'}</div>${hidden?'<button class="reveal-button" data-speech="reveal">看一下汉字和拼音</button>':''}
 <div class="input-area ${session.error?'is-error':''}"><input id="typing-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="输入双拼字母" placeholder="${syllable?'输入两个字母':'输入对应字母'}" value="${session.input}" ${session.paused?'disabled':''} maxlength="2"><span class="input-caret-icon">⌨</span></div><div class="answer-feedback ${session.error?'error-text':''}" aria-live="polite">${session.error?escapeHTML(session.errorMessage):session.paused?'练习已暂停，点击继续即可返回。':'切换到英文输入法，直接敲击键盘开始'}</div></div>
 <div class="exercise-bottom"><div class="exercise-stats"><span><strong>${session.attempts?Math.round(session.correct/session.attempts*100)+'%':'—'}</strong>正确率</span><span><strong id="session-speed">${speed()}</strong>题 / 分钟</span><span><strong id="session-time">${timeLabel(elapsed)}</strong>练习用时</span></div><button class="pause-button" data-action="pause">${session.paused?'▷ 继续练习':'Ⅱ 暂停'}<kbd>Esc</kbd></button></div>`;
 const keyboard=$('#live-keyboard');if(keyboard)keyboard.innerHTML=keyboardHTML(hints&&!hidden&&!session.paused?item.answer[session.input.length]||'':'');
 bindSession();bindAudioControls();if(wasFocused&&!session.paused)$('#typing-input')?.focus({preventScroll:true});maybeSpeak();
}
function speed(){return session?.activeMs>1000?Math.round(session.index/(session.activeMs/60000)):'—';}
function timeLabel(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function bindSession(){const input=$('#typing-input');if(input){input.addEventListener('input',e=>{if(e.isComposing)return;const raw=e.target.value;if(/[^a-zA-Z]/.test(raw)){e.target.value='';toast('请切换到英文输入法，输入字母。');return;}session.input='';for(const ch of raw)accept(ch);});input.addEventListener('compositionend',()=>{input.value='';toast('请切换到英文输入法后练习。');});}document.querySelectorAll('[data-press]').forEach(b=>b.onclick=()=>accept(b.dataset.press));document.querySelectorAll('#session-area [data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));}
function accept(letter){
 if(!session||session.done||session.paused||session.working||!current()||!/^\w$/.test(letter)||!/[a-z]/i.test(letter))return;
 const now=Date.now();if(!session.startedAt)session.startedAt=now;session.lastAction=now;
 session.input+=letter.toLowerCase();const item=current();
 if(!item.answer.startsWith(session.input)){
 session.attempts++;progress.attempts++;session.failed=true;session.error=true;
 session.errorMessage=`再试一次${hints&&!hideQuestion()?'，正确按键是 '+item.answer.toUpperCase():''}。已加入错题本。`;
 const prev=progress.mistakes[item.id];progress.mistakes[item.id]={...item,misses:(prev?.misses||0)+1,streak:0};session.input='';save();renderSession();updateNav();return;
 }
 session.error=false;
 if(session.input===item.answer){
 session.attempts++;session.correct++;progress.attempts++;progress.correct++;progress.days[today()]=(progress.days[today()]||0)+1;
 if(progress.mistakes[item.id]&&!session.failed){progress.mistakes[item.id].streak++;if(progress.mistakes[item.id].streak>=3)delete progress.mistakes[item.id];}
 session.lastAnswer=item.kind==='syllable'?item:null;session.index++;session.input='';session.failed=false;session.revealed=false;
 if(session.index>=session.items.length){session.done=true;progress.sessions++;const accuracy=session.correct/session.attempts;
 if(session.mode==='practice'&&accuracy>=.9&&!session.focus&&!session.assisted){const tag=['initial','zero'].includes(session.group)?session.group:session.group+':'+session.type;if(!progress.completed.includes(tag))progress.completed.push(tag);}}
 save();renderSession();updateNav();updateDaily();
 }else renderSession();
}
function updateNav(){$('#navigation').innerHTML=navHTML();document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));}
function updateDaily(){const day=progress.days[today()]||0;if($('#daily-number')){$('#daily-number').textContent=day;$('.daily-ring').style.setProperty('--pct',Math.min(100,day/50*100)+'%');$('.daily-facts').innerHTML=`<div><span>累计练习</span><strong>${progress.attempts} <small>次</small></strong></div><div><span>总正确率</span><strong>${Math.round(progress.correct/progress.attempts*100)}<small> %</small></strong></div>`;$('.course-count').innerHTML=`<span>学习旅程</span><strong>${mastered()} / ${GROUPS.length} <small>组已掌握</small></strong><div class="thin-track"><i style="width:${mastered()/GROUPS.length*100}%"></i></div>`;}}
function renderResult(){const rate=Math.round(session.correct/session.attempts*100)||0;$('#session-area').innerHTML=`<div class="result"><span class="result-check">${rate>=90?'✓':'✧'}</span><span class="eyebrow">本轮练习完成</span><h2>${rate>=90?'又熟悉了一点。':'每一次重复，都是进步。'}</h2><p>完成 ${session.items.length} 题，正确率 ${rate}%，用时 ${timeLabel(Math.floor(session.activeMs/1000))}。</p>${session.lastAnswer?`<div class="last-answer result-last-answer">${answerReview(session.lastAnswer)}</div>`:''}<div class="result-numbers"><div><strong>${session.correct}</strong><span>正确作答</span></div><div><strong>${session.attempts-session.correct}</strong><span>错误尝试</span></div><div><strong>${speed()}</strong><span>题 / 分钟</span></div></div><div class="result-actions"><button class="secondary" data-action="restart">再练一轮</button><button class="primary" data-action="next">${session.mode==='practice'?'继续下一步':'返回练习列表'}</button></div><small>${session.mode==='practice'?session.assisted?`本轮查看了 ${session.assisted} 次题目提示；不查看提示且正确率达到 90% 可点亮分组。`:session.focus?'单键已完成，可以回到整组检验记忆。':rate>=90?'这一阶段已经点亮，随时可以回来复习。':'整组正确率达到 90% 即可点亮本阶段。':'错题会自动收集到错题本，连续答对三次即可移出。'}</small></div>`;const kb=$('#live-keyboard');if(kb)kb.innerHTML=keyboardHTML();bindSession();}
function action(act){
 if(act==='pause'&&session&&!session.done){session.paused=!session.paused;session.lastAction=0;SpeechCoach.stop();lastSpeechSession=null;renderSession();return;}
 if(act==='restart'){SpeechCoach.stop();if(page==='practice')resetPractice();else if(session){const previous=session;makeSession(previous.items,previous.items.length,{mode:previous.mode,articleId:previous.articleId});if(previous.mode==='article')session.items=previous.items;}render();return;}
 if(act==='next'){SpeechCoach.stop();if(page!=='practice'){session=null;render();return;}if(focusKey){focusKey='';}else if(practiceType==='mapping'&&!['initial','zero'].includes(groupId)){practiceType='syllable';}else{const i=GROUPS.findIndex(g=>g.id===groupId);groupId=GROUPS[(i+1)%GROUPS.length].id;practiceType='syllable';}resetPractice();render();}
}
function renderLayout(){
 const k=selectedKey;$('#main').innerHTML=heading('先认识，再记住','把每一个音，放回键盘。','单字母声母基本沿用原键位；复合声母和韵母，记住它们的新位置。')+`<section class="panel layout-panel"><div class="section-title"><h2>小鹤双拼键位图</h2><div class="legend"><span><i class="legend-final"></i>韵母</span><span><i class="legend-initial"></i>复合声母</span></div></div>${keyboardHTML('',true)}<p class="center muted">点击任意键位，查看映射和例字。</p></section><div class="layout-bottom"><section class="panel inspect-panel"><span class="inspect-letter">${k.toUpperCase()}</span><div><span class="eyebrow">当前键位</span><h2>${KEYMAP[k].join(' / ')}${INITIALS[k]?` <small>· 声母 ${INITIALS[k]}</small>`:''}</h2><div class="example-list">${EXAMPLES[k].slice(0,4).map(x=>`<span>${x.han}<small>${x.py} · ${x.answer}</small></span>`).join('')}</div></div><button class="primary" data-key-practice="${k}">练习所在分组</button></section><section class="panel rule-panel"><h3>零声母，记住三个规则</h3><div><kbd>aa</kbd><p>单字母重复打 <span>a · o · e</span></p></div><div><kbd>ai</kbd><p>双字母保持全拼 <span>ai · an · er · ou…</span></p></div><div><kbd>ah</kbd><p>三字母：首字母 + 韵母键 <span>ang → ah · eng → eg</span></p></div><a href="https://flypy.cc/" target="_blank" rel="noopener">规则来源：小鹤官方网站</a></section></div>`;
}
function compactSessionShell(title,subtitle){return `<section class="panel standalone-session"><div class="lesson-top"><div><span class="lesson-badge">${PAGES[page]}</span><h2>${title}</h2></div><button class="text-button" data-back>返回列表</button></div><p class="lesson-description">${subtitle}</p><label class="switch-label"><input id="hints" type="checkbox" ${hints?'checked':''}><span class="switch"></span>答案提示</label><div id="session-area"></div></section><section class="panel keyboard-panel standalone-keyboard"><div class="section-title"><h3>键位参考</h3></div><div id="live-keyboard"></div></section>`;}
function renderRandom(){
 $('#main').innerHTML=heading('打乱顺序，检验记忆','让熟悉的键，自然出现。','从完整键位中随机出题，在变化里练出稳定的手感。');
 if(session){$('#main').insertAdjacentHTML('beforeend',compactSessionShell('随机练习','每轮 30 题；可随时暂停，完成后查看本轮表现。'));renderSession();return;}
 $('#main').insertAdjacentHTML('beforeend',`<div class="mode-cards"><section class="panel mode-card"><span class="mode-illustration">iu <kbd>Q</kbd></span><span class="eyebrow">巩固映射</span><h2>随机韵母</h2><p>打乱所有韵母，找到对应的按键。<br>适合刚刚记完键位的你。</p><button class="primary" data-random="mapping">开始练习 · 30 题</button></section><section class="panel mode-card"><span class="mode-illustration">鹤 <kbd>H E</kbd></span><span class="eyebrow">组合输入</span><h2>随机拼字</h2><p>把声母和韵母连起来，两键一字。<br>包含复合声母与零声母。</p><button class="primary" data-random="syllable">开始练习 · 30 题</button></section></div><section class="soft-banner"><span>✧</span><div><h3>准备好挑战自己了吗？</h3><p>练习中关闭「答案提示」，看看双手能记住多少。</p></div></section>`);
}
function renderMistakes(){const mistakes=Object.values(progress.mistakes);
 $('#main').innerHTML=heading('错过的，再熟悉一次','把不熟悉，练成熟悉。','每次错误都会留在这里；连续答对 3 次，这道题就会自动移出。',`<span class="count-badge">${mistakes.length} 道待复习</span>`);
 if(session){$('#main').insertAdjacentHTML('beforeend',compactSessionShell('错题复习','根据现有错题生成练习，同一道题重复答对 3 次即可掌握。'));renderSession();return;}
 if(!mistakes.length){$('#main').insertAdjacentHTML('beforeend',`<section class="panel empty-state"><div class="empty-illustration"><span>✓</span><div class="empty-lines"></div></div><h2>这里还是一张白纸。</h2><p>练习时遇到不熟悉的键位，会自动收集在这里。<br>错题不是退步，是下一次进步的起点。</p><button class="primary" data-nav="practice">去练习，慢慢熟悉</button></section>`);return;}
 $('#main').insertAdjacentHTML('beforeend',`<div class="mistake-toolbar"><p>先记住正确映射，再用练习加深印象。</p><button class="primary" data-review>开始复习 · ${mistakes.length} 题</button></div><div class="mistake-grid">${mistakes.sort((a,b)=>b.misses-a.misses).map(x=>`<section class="panel mistake-card"><span class="mistake-prompt">${escapeHTML(x.han||x.prompt)}</span><span class="mistake-answer">${x.py||x.prompt} <span>/</span> <kbd>${x.answer.toUpperCase()}</kbd></span><div><small>错过 ${x.misses} 次</small><small>已巩固 ${x.streak} / 3</small></div></section>`).join('')}</div>`);
}
function renderArticles(){
 $('#main').innerHTML=heading('从一个音，到一句话','在文字之间，找到节奏。','练习真实语句的双拼输入。标点自动跳过，多音字按当前语境标注。');
 if(session){const a=ARTICLES.find(a=>a.id===session.articleId);$('#main').insertAdjacentHTML('beforeend',compactSessionShell(a.title,'逐字输入双拼编码即可继续；无需输入标点和空格。'));renderSession();return;}
 $('#main').insertAdjacentHTML('beforeend',`<div class="article-cards">${ARTICLES.map((a,i)=>`<section class="panel article-card"><div class="article-art art-${i}"><span>${i===0?'日常':i===1?'春':'月'}</span><i></i><b></b></div><div class="article-info"><span class="eyebrow">${a.tag} · ${articleItems(a).length} 字</span><h2>${a.title}</h2><p>${a.description}</p><blockquote>${a.text}</blockquote><button class="primary" data-article="${a.id}">开始文章练习</button></div></section>`).join('')}</div>`);
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.nav));
 document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{groupId=b.dataset.group;focusKey='';practiceType='syllable';resetPractice();render();});
 document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{practiceType=b.dataset.type;resetPractice();render();});
 document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{focusKey=b.dataset.focus;resetPractice();render();});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
 const h=$('#hints');if(h)h.onchange=()=>{hints=h.checked;renderSession();};
 document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{selectedKey=b.dataset.inspect;render();});
 document.querySelectorAll('[data-key-practice]').forEach(b=>b.onclick=()=>{const k=b.dataset.keyPractice;groupId=GROUPS.find(g=>g.keys.includes(k)).id;focusKey='';practiceType='syllable';page='practice';location.hash=page;resetPractice();render();});
 document.querySelectorAll('[data-random]').forEach(b=>b.onclick=()=>{const type=b.dataset.random;const pool=GROUPS.filter(g=>!['initial','zero'].includes(g.id)).flatMap(g=>buildPool(g,type));if(type==='syllable')pool.push(...ZERO.map(x=>({...x,kind:'syllable',id:'s:'+x.py})));makeSession(pool,30,{mode:'random'});render();});
 const review=$('[data-review]');if(review)review.onclick=()=>{const pool=Object.values(progress.mistakes);makeSession(pool,pool.length*3,{mode:'mistakes'});render();};
 document.querySelectorAll('[data-article]').forEach(b=>b.onclick=()=>{const a=ARTICLES.find(a=>a.id===b.dataset.article);const items=articleItems(a).map(x=>({...x,kind:'syllable',id:'s:'+x.py}));session={items,index:0,attempts:0,correct:0,input:'',error:false,startedAt:0,lastAction:0,activeMs:0,paused:false,done:false,failed:false,mode:'article',articleId:a.id};render();});
 const back=$('[data-back]');if(back)back.onclick=()=>{SpeechCoach.stop();session=null;render();};
}
document.addEventListener('keydown',e=>{
 if($('#help-dialog').open||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
 if(e.key==='Escape'&&session&&!session.done){e.preventDefault();action('pause');return;}
 if(!session||session.done||session.paused)return;
 if(e.target?.tagName==='SELECT'||e.target?.type==='checkbox')return;
 if(e.code==='Space'||e.key===' '){if(e.target?.tagName!=='BUTTON'){e.preventDefault();playCurrent();}return;}
 if(e.key==='Backspace'){e.preventDefault();session.input=session.input.slice(0,-1);renderSession();return;}
 if(/^[a-z]$/i.test(e.key)){e.preventDefault();accept(e.key);}
});
setInterval(()=>{if(!session||session.done||session.paused||!session.startedAt||Date.now()-session.lastAction>15000)return;session.activeMs+=1000;if($('#session-time'))$('#session-time').textContent=timeLabel(Math.floor(session.activeMs/1000));if($('#session-speed'))$('#session-speed').textContent=speed();},1000);
function showHelp(){SpeechCoach.stop();$('#help-dialog').showModal();}
$('#help-button').onclick=showHelp;$('#help-top').onclick=showHelp;$('.dialog-close').onclick=()=>$('#help-dialog').close();$('#help-dismiss').onclick=()=>$('#help-dialog').close();
$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(PAGES[p]&&p!==page){SpeechCoach.stop();page=p;session=null;render();}});
SpeechCoach.subscribe(updateAudioStatus);
const startPage=location.hash.slice(1);if(PAGES[startPage])page=startPage;render();
