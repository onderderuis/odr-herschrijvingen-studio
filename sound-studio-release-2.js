(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('visual'),g=canvas.getContext('2d');
const instruments=[
{id:'gong',name:'Grote gong',desc:'Diep · lange resonantie',duration:12},
{id:'bowl',name:'Metalen klankschaal',desc:'Warm · zingende boventonen',duration:10},
{id:'crystal',name:'Kristallen schaal',desc:'Helder · aanhoudend',duration:9},
{id:'tingsha',name:'Tingsha',desc:'Sprankelend · helder',duration:6},
{id:'chime',name:'Windgong',desc:'Licht · meerdere tonen',duration:9},
{id:'ocean',name:'Oceaanruis',desc:'Zacht · golvende ruis',duration:11}
];
let clips=[],selected=-1,files=new Map(),audioCtx=null,activeSources=[],timer=null,raf=0,playStart=0,analyser=null,frequency=null,smoothed=0,lastT=0,recording=false,playToken=0;
const cache=new Map(),sr=44100,pi=Math.PI;
const duration=()=>Number($('duration').value);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const fmt=n=>Number(n).toFixed(1).replace('.',',');
const status=s=>$('status').textContent=s;
function random(seed){let x=seed|0;return()=>{x=(Math.imul(1664525,x)+1013904223)|0;return (x>>>0)/4294967296}}
function createSound(id){
 const spec=instruments.find(x=>x.id===id);if(!spec)return null;
 if(cache.has(id))return cache.get(id);
 const N=Math.ceil(spec.duration*sr),buffer=new AudioBuffer({length:N,numberOfChannels:1,sampleRate:sr}),out=buffer.getChannelData(0);
 const rnd=random(13579+id.length*971);
 let noiseState=0;
 const notes=id==='gong'?[[62,1],[93,.5],[143,.43],[198,.3],[269,.22],[337,.15]]:
 id==='bowl'?[[228,1],[455,.35],[685,.16],[917,.12]]:
 id==='crystal'?[[432,1],[864,.12],[1296,.05]]:
 id==='tingsha'?[[1110,.9],[1675,.6],[2200,.35],[2940,.2]]:
 id==='chime'?[[620,.6],[784,.5],[990,.4],[1175,.3],[1480,.2]]:[];
 for(let i=0;i<N;i++){
  const t=i/sr,fadeIn=1-Math.exp(-t*(id==='gong'?16:80));
  let v=0;
  if(id==='ocean'){
   const white=rnd()*2-1;noiseState=.995*noiseState+.005*white;
   const swell=.25+.55*(.5+.5*Math.sin(t*.72));
   v=noiseState*7*swell*Math.min(1,t*2)*Math.min(1,(spec.duration-t)*.8);
  }else{
   for(let k=0;k<notes.length;k++){
    const [freq,amp]=notes[k],phase=t*2*pi*freq*(1+.0019*Math.sin(t*.31+k*1.7))+(id==='gong'?Math.sin(t*.24+k)*.55:0);
    const env=Math.exp(-t*(id==='gong'?.17+k*.045:id==='tingsha'?.42+k*.08:id==='chime'?.25+k*.04:.19+k*.06));
    const onset=id==='chime'?Math.max(0,t-k*.48):t;
    const chimeGate=id==='chime'?(t>=k*.48?1:0):1;
    v+=(Math.sin(phase)+.17*Math.sin(phase*1.004+k*1.8))*amp*env*chimeGate*(id==='chime'?1-Math.exp(-onset*35):1);
   }
   if(id==='gong'){const rumble=(rnd()*2-1)*Math.exp(-t*2.1)*.12;v+=rumble;v*=.65+.35*Math.sin(Math.min(1,t/3)*Math.PI/2)}
   if(id==='tingsha')v+=(rnd()*2-1)*Math.exp(-t*9)*.07;if(id==='bowl'||id==='crystal')v+=(rnd()*2-1)*Math.exp(-t*14)*.035;
   v*=fadeIn*.48;
  }
  out[i]=clamp(v,-.94,.94);
 }
 cache.set(id,buffer);return buffer;
}
function getBuffer(clip){return clip.type==='silence'?null:clip.type==='file'?files.get(clip.id)?.buffer:createSound(clip.id)}
function label(clip){return clip.type==='silence'?'Stilte':clip.type==='file'?(files.get(clip.id)?.name||'Eigen opname'):(instruments.find(x=>x.id===clip.id)?.name||clip.id)}
function addClip(id,type='synth'){
 const start=clips.length?Math.min(duration()-.2,Math.max(0,clips[clips.length-1].start+3)):0;
 const b=type==='silence'?null:type==='file'?files.get(id)?.buffer:createSound(id);clips.push({id,type,start:Math.max(0,start),gain:.85,length:type==='silence'?3:Math.min(b?.duration||6,Math.max(.2,duration()-start))});selected=clips.length-1;stop();refresh();
}
function refresh(){
 $('durationLabel').textContent=duration()+' sec';
 const area=$('clips');area.replaceChildren();
 clips.forEach((clip,i)=>{
  const length=clip.length||2;
  const b=document.createElement('button');b.type='button';b.className='clip'+(selected===i?' active':'');
  b.style.left=clamp(clip.start/duration()*100,0,100)+'%';
  b.style.width=clamp(Math.min(length,duration()-clip.start)/duration()*100,1,100)+'%';
  b.style.top=(7+(i%2)*42)+'px';if(clip.type==='silence')b.classList.add('silence');b.textContent=label(clip);const del=document.createElement('span');del.className='delete';del.textContent='✕';del.title='Alleen dit fragment verwijderen';del.onclick=e=>{e.stopPropagation();removeClip(i)};b.appendChild(del);
  b.title=label(clip)+' · start '+fmt(clip.start)+' sec';b.onclick=()=>{selected=i;refresh()};area.appendChild(b);
 });
 const edit=$('editor');edit.hidden=selected<0||!clips[selected];
 if(!edit.hidden){const clip=clips[selected];$('selectedName').textContent=label(clip);$('clipStart').max=duration();$('clipStart').value=clip.start;$('clipGain').value=clip.gain*100;$('startValue').textContent=fmt(clip.start)+' sec';$('gainValue').textContent=Math.round(clip.gain*100)+'%';$('clipLength').max=Math.max(.2,duration()-clip.start);$('clipLength').value=Math.min(clip.length,duration()-clip.start);$('lengthValue').textContent=fmt(clip.length)+' sec';$('clipGain').disabled=clip.type==='silence'}
}
function removeClip(i){if(i<0||i>=clips.length)return;clips.splice(i,1);selected=clips.length?Math.min(i,clips.length-1):-1;stop();refresh();status('Alleen het geselecteerde fragment is verwijderd.')}
function stop(){
 playToken++;if(timer){clearTimeout(timer);timer=null}
 for(const src of activeSources){try{src.stop()}catch(e){}}
 activeSources=[];
 if(audioCtx){const c=audioCtx;audioCtx=null;c.close().catch(()=>{})}
 cancelAnimationFrame(raf);raf=0;analyser=null;frequency=null;smoothed=0;
 $('play').disabled=false;$('head').style.left='0%';draw(0,0);
}
function setup(ctx,dest){
 const master=ctx.createGain();master.gain.value=Number($('master').value)/100;
 master.connect(dest);return master;
}
function schedule(ctx,dest,offset=0){
 const master=setup(ctx,dest),sources=[];
 for(const clip of clips){
  const buffer=getBuffer(clip);if(!buffer)continue;
  const remaining=duration()-clip.start;if(remaining<=0)continue;
  const src=ctx.createBufferSource();src.buffer=buffer;
  const gain=ctx.createGain();gain.gain.value=clip.gain;
  src.connect(gain);gain.connect(master);
  const length=Math.min(remaining,clip.length||buffer.duration,buffer.duration),fade=Math.min(.15,length*.2);gain.gain.setValueAtTime(0,offset+clip.start);gain.gain.linearRampToValueAtTime(clip.gain,offset+clip.start+Math.min(.025,length*.12));gain.gain.setValueAtTime(clip.gain,offset+clip.start+Math.max(.025,length-fade));gain.gain.linearRampToValueAtTime(0,offset+clip.start+length);src.start(offset+clip.start,0,length);
  sources.push(src);
 }
 for(const c of clips.filter(x=>x.type==='silence').sort((a,b)=>a.start-b.start)){const st=offset+c.start,en=offset+Math.min(duration(),c.start+c.length);if(en<=st)continue;const vol=Number($('master').value)/100;master.gain.setValueAtTime(vol,Math.max(0,st-.03));master.gain.linearRampToValueAtTime(0,st);master.gain.setValueAtTime(0,Math.max(st,en-.03));master.gain.linearRampToValueAtTime(vol,en)}
 return sources;
}
function level(){
 if(!analyser||!frequency)return 0;
 analyser.getByteFrequencyData(frequency);
 const mode=$('reactivity').value;
 const from=mode==='high'?Math.floor(frequency.length*.12):0;
 const to=mode==='bass'?Math.max(5,Math.floor(frequency.length*.05)):mode==='high'?Math.floor(frequency.length*.7):Math.floor(frequency.length*.3);
 let sum=0;for(let i=from;i<to;i++)sum+=frequency[i];
 return clamp(sum/Math.max(1,to-from)/150,0,1);
}
function draw(t,raw){
 const W=canvas.width,H=canvas.height,n=Number($('lines').value),power=Number($('response').value)/100,free=Number($('motion').value)/100,shape=$('shape').value,palette=$('palette').value,opacity=Number($('lineOpacity').value)/100,centerY=Number($('lineY').value)/100,centerX=Number($('lineX').value)/100,spread=Number($('lineSpread').value)/100,thickness=Number($('lineWidth').value)/100;
 smoothed=Math.max(raw,smoothed*.92);
 const energy=smoothed*power;
 g.fillStyle=palette==='beige'?'#e6d7c5':'#291b15';g.fillRect(0,0,W,H);
 g.save();g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<n;i++){
  const band=i-(n-1)/2,offset=band*28*spread,phase=t*.55*free;
  g.beginPath();
  for(let x=-25;x<=W+25;x+=6){
   const a=(x+(centerX-.5)*W)/W;
   let y=H*centerY+offset+Math.sin(a*8-phase+band*.13)*(35+free*70);
   if(shape==='resonance')y+=Math.sin(a*18-t*3.1+band*.25)*energy*100+Math.sin(a*5+t*.7)*energy*26;
   if(shape==='waves')y+=Math.sin(a*10-t*(1.5+energy*4)+band*.22)*energy*175;
   if(shape==='spread')y+=Math.sin(a*7-phase+band*.18)*energy*55+band*energy*22;
   if(x===-25)g.moveTo(x,y);else g.lineTo(x,y);
  }
  g.strokeStyle=palette==='beige'?(i%4===0?'#291b15':'#6b4c3b'):(i%4===0?'#edcbb0':'#aa8a75');g.globalAlpha=opacity*(i%4===0?1:.68);g.lineWidth=((i%4===0?3.3:2.1)+energy*2.5)*thickness;
  g.stroke();
 }
 g.restore();
 g.fillStyle=palette==='beige'?'#291b15':'#d5bda7';g.font='28px "DM Sans",sans-serif';g.textAlign='center';g.fillText('onder de ruis.',W/2,H-75);
}
function animate(token){
 if(token!==playToken)return;
 const t=clamp((performance.now()-playStart)/1000,0,duration());
 $('head').style.left=t/duration()*100+'%';
 draw(t,level());
 if(t>=duration()){stop();status('Afspelen afgerond.');return}
 raf=requestAnimationFrame(()=>animate(token));
}
async function play(exportDest=null){
 if(!clips.length){status('Voeg eerst een klank toe.');return null}
 stop();
 const token=playToken;
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();audioCtx=ctx;
  if(ctx.state==='suspended')await ctx.resume();
  if(token!==playToken){await ctx.close();return null}
  analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.82;frequency=new Uint8Array(analyser.frequencyBinCount);
  analyser.connect(ctx.destination);
  let output=analyser;
  let audioStream=null;
  if(exportDest){const md=ctx.createMediaStreamDestination();analyser.connect(md);audioStream=md.stream;recording=true}
  activeSources=schedule(ctx,output,ctx.currentTime+.12);
  playStart=performance.now()+120;
  $('play').disabled=true;
  raf=requestAnimationFrame(()=>animate(token));
  status('Compositie speelt af.');
  return {ctx,audioStream};
 }catch(err){status('Afspelen niet gelukt: '+err.message);stop();return null}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function wavBlob(buffer){
 const channels=buffer.numberOfChannels,len=buffer.length,bytes=44+len*channels*2,ab=new ArrayBuffer(bytes),dv=new DataView(ab);
 const str=(pos,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(pos+i,s.charCodeAt(i))};
 str(0,'RIFF');dv.setUint32(4,bytes-8,true);str(8,'WAVE');str(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,channels,true);dv.setUint32(24,buffer.sampleRate,true);dv.setUint32(28,buffer.sampleRate*channels*2,true);dv.setUint16(32,channels*2,true);dv.setUint16(34,16,true);str(36,'data');dv.setUint32(40,len*channels*2,true);
 let pos=44;for(let i=0;i<len;i++)for(let ch=0;ch<channels;ch++){const v=clamp(buffer.getChannelData(ch)[i],-1,1);dv.setInt16(pos,v<0?v*32768:v*32767,true);pos+=2}
 return new Blob([ab],{type:'audio/wav'});
}
async function exportWav(){
 if(!clips.length){status('Voeg eerst een klank toe.');return}
 stop();$('wav').disabled=true;status('Audio wordt samengesteld...');
 try{
  const ctx=new OfflineAudioContext(2,Math.ceil(duration()*sr),sr);
  schedule(ctx,ctx.destination);
  const buffer=await ctx.startRendering();
  download(wavBlob(buffer),'ODR-Sound-Studio-'+duration()+'s.wav');
  status('WAV-audio gedownload.');
 }catch(e){status('Audio-export mislukt: '+e.message)}
 finally{$('wav').disabled=false}
}
async function exportVideo(){
 if(!clips.length){status('Voeg eerst een klank toe.');return}
 if(!window.MediaRecorder||!canvas.captureStream){status('Video-export wordt niet ondersteund door deze browser. Download eventueel WAV.');return}
 $('video').disabled=true;
 try{
  stop();const media=await play(true);if(!media)return;
  const videoStream=canvas.captureStream(30);
  const tracks=[...videoStream.getVideoTracks(),...media.audioStream.getAudioTracks()];
  const stream=new MediaStream(tracks);
  const options=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  if(!options)throw Error('Geen ondersteund videoformaat.');
  const rec=new MediaRecorder(stream,{mimeType:options,videoBitsPerSecond:6500000}),chunks=[];
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(new Error('Opname mislukt'))});
  rec.start(200);status('Video met geluid wordt opgenomen. Houd dit tabblad open.');
  await new Promise(resolve=>setTimeout(resolve,duration()*1000+250));
  if(rec.state!=='inactive')rec.stop();
  await done;stop();
  if(chunks.length)download(new Blob(chunks,{type:options}),'ODR-Sound-Studio-'+duration()+'s.'+(options.includes('mp4')?'mp4':'webm'));
  status('Video met geluid gedownload.');
  videoStream.getTracks().forEach(t=>t.stop());
 }catch(e){stop();status('Video-export mislukt: '+e.message)}
 finally{recording=false;$('video').disabled=false}
}
function init(){
 const lib=$('library');
 for(const item of instruments){const b=document.createElement('button');b.type='button';b.innerHTML=item.name+'<small>'+item.desc+'</small>';b.onclick=()=>addClip(item.id);lib.appendChild(b)}
 $('upload').addEventListener('change',async e=>{
  const list=Array.from(e.target.files||[]);if(!list.length)return;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  for(const file of list){try{const buffer=await ctx.decodeAudioData(await file.arrayBuffer());const id='file-'+Date.now()+'-'+Math.random().toString(36).slice(2);files.set(id,{buffer,name:file.name});addClip(id,'file')}catch(err){status('Kon '+file.name+' niet openen. Gebruik WAV, MP3 of een ander ondersteund audioformaat.')}}
  await ctx.close();e.target.value='';
 });
 $('clipStart').addEventListener('input',e=>{if(selected<0)return;clips[selected].start=+e.target.value;refresh()});
 $('clipGain').addEventListener('input',e=>{if(selected<0)return;clips[selected].gain=+e.target.value/100;refresh()});$('clipLength').addEventListener('input',e=>{if(selected<0)return;clips[selected].length=+e.target.value;refresh()});
 $('duplicate').onclick=()=>{if(selected<0)return;const c={...clips[selected],start:clamp(clips[selected].start+2,0,duration())};clips.push(c);selected=clips.length-1;stop();refresh()};
 $('remove').onclick=()=>removeClip(selected);$('addSilence').onclick=()=>addClip('silence','silence');
 $('clear').onclick=()=>{if(!clips.length)return;if(confirm('Alle klanken uit deze compositie verwijderen?')){clips=[];selected=-1;stop();refresh()}};
 $('duration').onchange=()=>{stop();refresh()};
 $('master').oninput=()=>{$('masterValue').textContent=$('master').value+'%'};
 $('play').onclick=()=>play();
 $('stop').onclick=()=>{stop();status('Gestopt.')};
 $('wav').onclick=exportWav;$('video').onclick=exportVideo;
 for(const id of ['lines','response','motion','lineOpacity','lineY','lineX','lineWidth','lineSpread'])$(id).oninput=()=>{$(id+'Value').textContent=$(id).value+(id==='lines'?'':'%');if(!audioCtx)draw(0,0)};
 $('shape').onchange=()=>{if(!audioCtx)draw(0,0)};$('palette').onchange=()=>{if(!audioCtx)draw(0,0)};let dragging=false;canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);moveLines(e)});canvas.addEventListener('pointermove',e=>{if(dragging)moveLines(e)});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);function moveLines(e){const r=canvas.getBoundingClientRect();$('lineX').value=Math.round(clamp((e.clientX-r.left)/r.width*100,0,100));$('lineY').value=Math.round(clamp((e.clientY-r.top)/r.height*100,5,95));$('lineXValue').textContent=$('lineX').value+'%';$('lineYValue').textContent=$('lineY').value+'%';if(!audioCtx)draw(0,0)}
 $('format').onchange=()=>{canvas.height=$('format').value==='portrait'?1920:1350;draw(0,0)};
 $('reactivity').onchange=()=>{};
 refresh();draw(0,0);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&audioCtx&&!recording)status('Laat dit tabblad zichtbaar voor een vloeiende animatie.')});
}
init();
})();