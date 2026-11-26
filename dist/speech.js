'use strict';
// Speak Chinese text rather than asking a voice to interpret Latin pinyin.
const SpeechCoach = (()=>{
 const supported=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
 const engine=supported?window.speechSynthesis:null;
 let voice=null,status='idle',message='',serial=0,active=null;
 const listeners=new Set();
 const contexts={'长:chang':'长短，第一个字。','行:hang':'银行，第二个字。','地:di':'大地，第二个字。','和:he':'和平，第一个字。','给:gei':'给你，第一个字。','单:dan':'名单，第二个字。','落:luo':'落叶，第一个字。','数:shu':'数学，第一个字。','约:yue':'约定，第一个字。','中:zhong':'中国，第一个字。','种:zhong':'种子，第一个字。','还:hai':'还有，第一个字。'};
 function snapshot(){return {supported,available:!!voice,voiceName:voice?.name||'',status,message:!supported?'当前浏览器不支持朗读，请使用看字练习。':message||(!voice?'未检测到普通话语音，可点击重新检测。':'普通话语音已就绪')};}
 function emit(){for(const listener of listeners)listener(snapshot());}
 function refresh(){
  if(!engine)return snapshot();
  const voices=engine.getVoices().filter(v=>/^(zh|cmn)([-_]|$)/i.test(v.lang)&&!/(HK|MO|yue)/i.test(v.lang));
  voice=voices.find(v=>/^zh[-_]CN$/i.test(v.lang))||voices.find(v=>/Hans|cmn/i.test(v.lang))||voices[0]||null;
  if(voice&&status!=='error')message='';emit();return snapshot();
 }
 function stop(){serial++;if(engine)engine.cancel();active=null;status='idle';message='';emit();}
 function textFor(item){return contexts[item.han+':'+item.py]||item.han;}
 function speak(item,rate=0.8){
  if(!supported||!item?.han)return false;
  refresh();if(!voice){message='当前设备没有可用的普通话语音。请启用系统中文语音，或换用提供中文语音的浏览器。';emit();return false;}
  stop();const token=serial;const utterance=new window.SpeechSynthesisUtterance(textFor(item));
  active=utterance;utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=rate;utterance.pitch=1;utterance.volume=1;
  status='loading';message='正在准备朗读…';emit();
  utterance.onstart=()=>{if(token!==serial)return;status='speaking';message='正在朗读';emit();};
  utterance.onend=()=>{if(token!==serial)return;active=null;status='idle';message='朗读结束，可以重听';emit();};
  utterance.onerror=e=>{if(token!==serial||e.error==='canceled'||e.error==='interrupted')return;active=null;status='error';message=e.error==='not-allowed'?'请点击「重听」启动声音，自动朗读被浏览器拦截了。':'朗读失败，请检查设备语音与音量，然后点击重听。';emit();};
  try{engine.speak(utterance);return true;}catch{active=null;status='error';message='无法启动朗读，请点击重听或使用看字练习。';emit();return false;}
 }
 if(engine){refresh();engine.addEventListener?.('voiceschanged',refresh);window.addEventListener('pagehide',stop);}
 return {snapshot,refresh,stop,speak,textFor,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
})();
