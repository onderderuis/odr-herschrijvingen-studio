(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('cv'),ctx=cv.getContext('2d'),W=1080,H=cv.height,mode=window.ODR_MODE;
const palette={beige:{bg:'#e6d7c5',ink:'#4b352a',sub:'#765b48',faint:'#b9a18e'},brown:{bg:'#291b15',ink:'#e9d7c5',sub:'#c7ad97',faint:'#7e6659'}};
const key='odr-'+mode+'-v1';let slides=window.ODR_DEFAULT.slice(),index=0,raf=0,playing=false,exporting=false;
try{let saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.slides)&&saved.slides.length&&mode!=='laag')slides=saved.slides; if(saved&&mode==='laag')for(let id of ['upper','lower','question','duration','fadeAt'])if($(id)&&typeof saved[id]==='string')$(id).value=saved[id];if(saved)for(let id of ['palette','size','signature'])if($(id)&&saved[id]!==undefined){if($(id).type==='checkbox')$(id).checked=!!saved[id];else $(id).value=saved[id]}}catch(e){}
function save(){let o={slides};for(let id of ['palette','size','signature','upper','lower','question','duration','fadeAt'])if($(id))o[id]=$(id).type==='checkbox'?$(id).checked:$(id).value;try{localStorage.setItem(key,JSON.stringify(o))}catch(e){}}
function wrap(text,max,font){ctx.font='400 '+font+'px "DM Sans",sans-serif';let out=[],row='';for(let word of text.split(/\s+/)){let next=row?row+' '+word:word;if(ctx.measureText(next).width>max&&row){out.push(row);row=word}else row=next}if(row)out.push(row);return out}
function label(text,y,p,opacity=1){if(!text)return;let font=+($('size').value||50),rows=wrap(text,850,font);while(rows.length*font*1.48>340&&font>28){font-=2;rows=wrap(text,850,font)}ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=p.ink;ctx.font='400 '+font+'px "DM Sans",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';rows.forEach((row,j)=>ctx.fillText(row,115,y+(j-(rows.length-1)/2)*font*1.48));ctx.restore()}
function signature(p){if($('signature').checked){ctx.fillStyle=p.sub;ctx.font='400 23px "DM Sans",sans-serif';ctx.textAlign='left';ctx.fillText('onder de ruis.',112,H-95)}}
function linePath(seed,phase=0){let points=[];for(let j=0;j<=140;j++){let t=j/140*Math.PI*2.8;let x=540+Math.sin(t*1.7+seed*1.19)*200+Math.cos(t*3.3+seed)*65;let y=470+Math.cos(t*1.23+seed*.67)*155+Math.sin(t*2.6+seed)*65;points.push([x,y])}return points}
const lines=Array.from({length:8},(_,i)=>linePath(i+1));
function drawWirwar(i,p,n){ctx.save();ctx.lineWidth=3.1;ctx.lineCap='round';ctx.lineJoin='round';const focus=Math.floor(i/Math.max(1,n-1)*5);
lines.forEach((pts,k)=>{let highlighted=k===2||k===5;ctx.strokeStyle=highlighted?p.ink:p.sub;ctx.globalAlpha=highlighted?.25+(.72*i/Math.max(1,n-1)):.46-.36*i/Math.max(1,n-1);ctx.beginPath();pts.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()});ctx.restore()}
function drawPunt(i,p,n){
 const phase=i/Math.max(1,n-1),stage=Math.min(4,Math.round(phase*4));
 const x=520,y=440;
 // Vaste oorsprong, maar iedere slide onthult nieuwe geometrische verbindingen.
 const nodes=[[520,440],[295,270],[765,265],[235,550],[770,600],[420,155],[600,730],[350,755],[855,420],[175,390],[620,135]];
 const edges=[
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,5],[2,10],[3,7],[4,8],[6,7],[2,8],[1,9],
  [5,10],[7,4],[3,9],[6,8],[1,3]
 ];
 const steps=[0,4,8,13,edges.length],visible=steps[stage];
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let k=0;k<visible;k++){
  const [a,b]=edges[k],u=nodes[a],v=nodes[b],focus=[1,4,7,10,13,16].includes(k);
  ctx.beginPath();ctx.moveTo(...u);
  // Kleine hoek in plaats van een kaarsrechte verbinding.
  const bend=k%2===0?.12:-.12,mx=(u[0]+v[0])/2+(v[1]-u[1])*bend,my=(u[1]+v[1])/2-(v[0]-u[0])*bend;
  ctx.lineTo(mx,my);ctx.lineTo(...v);
  ctx.strokeStyle=focus?p.ink:p.sub;ctx.globalAlpha=focus?.7:.28+.06*stage;ctx.lineWidth=focus?3.5:2.2;ctx.stroke();
 }
 // Nieuwe knooppunten worden per slide zichtbaar.
 let active=new Set([0]);for(let k=0;k<visible;k++){active.add(edges[k][0]);active.add(edges[k][1])}
 for(let j of active){let [px,py]=nodes[j];ctx.globalAlpha=j===0?1:.36+.1*stage;ctx.fillStyle=p.ink;ctx.beginPath();ctx.arc(px,py,j===0?10:4,0,Math.PI*2);ctx.fill()}
 ctx.restore()
}
function drawSlide(i){const p=palette[$('palette').value];ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);if(mode==='wirwar')drawWirwar(i,p,slides.length);else drawPunt(i,p,slides.length);label(slides[i]||'',1005,p);signature(p);$('counter').textContent=(i+1)+' / '+slides.length}
function chips(){const box=$('slides');box.replaceChildren();slides.forEach((_,i)=>{let b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.className=i===index?'activeButton':'';b.onclick=()=>select(i);box.appendChild(b)})}
function select(i){index=Math.max(0,Math.min(slides.length-1,i));$('slideText').value=slides[index];chips();$('prev').disabled=index===0;$('next').disabled=index===slides.length-1;$('remove').disabled=slides.length===1;drawSlide(index);save()}
function words(id){return $(id).value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,14)}
function smooth(t){return Math.max(0,Math.min(1,t))**2*(3-2*Math.max(0,Math.min(1,t)))}
function drawLayer(t){
 const p=palette[$('palette').value],dur=+$('duration').value,at=+$('fadeAt').value;
 // Drie duidelijke fasen: de eerste laag, een korte overgang, en voldoende rust voor de tweede laag.
 const transition=Math.min(2.2,Math.max(1.2,(dur-at-4.5)*.35));
 const secondStart=at+transition,questionStart=Math.max(secondStart+3.2,dur-2.3);
 const progress=smooth((t-at)/transition),top=words('upper'),bottom=words('lower');
 ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
 const topPositions=[[180,350],[580,410],[300,560],[660,650],[140,780],[500,900],[250,1030],[690,1100],[180,1230],[540,1320],[370,1450],[650,1540],[160,1630],[580,250]];
 const bottomPositions=[[220,460],[510,570],[170,760],[580,880],[240,1100],[570,1280],[250,1460],[590,350],[130,1250],[610,1530],[350,950],[650,730],[160,310],[580,1630]];
 ctx.textBaseline='middle';ctx.textAlign='left';ctx.font='400 '+Math.max(38,+$('size').value+8)+'px "DM Sans",sans-serif';
 // Geen twee woordlagen over elkaar tijdens de overgang: de oude laag verdwijnt eerst.
 const oldOpacity=t<at?1:1-smooth((t-at)/(transition*.58));
 const newOpacity=smooth((t-(at+transition*.48))/(transition*.52));
 top.forEach((w,i)=>{let [x,y]=topPositions[i];ctx.globalAlpha=.9*oldOpacity;ctx.fillStyle=p.ink;ctx.fillText(w,x,y)});
 bottom.forEach((w,i)=>{let [x,y]=bottomPositions[i];ctx.globalAlpha=.96*newOpacity;ctx.fillStyle=p.ink;ctx.fillText(w,x,y)});
 ctx.globalAlpha=1;
 let question=$('question').value.trim();
 if(t>=questionStart&&question){
  let q=smooth((t-questionStart)/.6);
  ctx.fillStyle=p.bg;ctx.globalAlpha=q;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  label(question,900,p,q)
 }
 signature(p);$('counter').textContent='00:'+String(Math.floor(t)).padStart(2,'0')+' / 00:'+String(dur).padStart(2,'0')
}
function render(){if(mode==='laag')drawLayer(0);else drawSlide(index)}
function download(blob,name){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
const blob=()=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(Error('PNG kon niet worden gemaakt')),'image/png'));
function crc32(a){let c=0xffffffff;for(let b of a){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function zip(files){let chunks=[],central=[],offset=0,enc=new TextEncoder();for(let f of files){let name=enc.encode(f.name),data=f.data,crc=crc32(data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,data);let c=new Uint8Array(46+name.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=local.length+data.length}let start=offset;for(let c of central){chunks.push(c);offset+=c.length}let end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,offset-start,true);e.setUint32(16,start,true);chunks.push(end);return new Blob(chunks,{type:'application/zip'})}
if(mode!=='laag'){
$('slideText').oninput=()=>{slides[index]=$('slideText').value;drawSlide(index);save()};
$('prev').onclick=()=>select(index-1);$('next').onclick=()=>select(index+1);
$('add').onclick=()=>{if(slides.length>=20)return;$('status').textContent='Slide toegevoegd.';slides.splice(index+1,0,'');select(index+1)};
$('remove').onclick=()=>{if(slides.length<=1)return;slides.splice(index,1);select(Math.min(index,slides.length-1))};
$('one').onclick=async()=>{drawSlide(index);download(await blob(),'ODR-'+mode+'-'+String(index+1).padStart(2,'0')+'.png')};
$('all').onclick=async()=>{let b=$('all');b.disabled=true;try{let files=[];for(let i=0;i<slides.length;i++){drawSlide(i);files.push({name:'ODR-'+mode+'-'+String(i+1).padStart(2,'0')+'.png',data:new Uint8Array(await(await blob()).arrayBuffer())});$('status').textContent='Export '+(i+1)+' / '+slides.length}download(zip(files),'ODR-'+mode+'-carrousel.zip');$('status').textContent='ZIP gedownload.'}catch(e){$('status').textContent=e.message}finally{b.disabled=false;drawSlide(index)}};select(0);
}else{
function stop(){playing=false;cancelAnimationFrame(raf);$('play').disabled=false}
$('stop').onclick=stop;
$('play').onclick=()=>{stop();if(exporting)return;playing=true;$('play').disabled=true;let start=performance.now(),dur=+$('duration').value;function tick(now){if(!playing)return;let t=Math.min(dur,(now-start)/1000);drawLayer(t);if(t<dur)raf=requestAnimationFrame(tick);else stop()}raf=requestAnimationFrame(tick)};
$('export').onclick=async()=>{if(exporting)return;stop();if(!cv.captureStream||!window.MediaRecorder){$('status').textContent='Deze browser ondersteunt geen video-export.';return}let choices=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'],mime=choices.find(x=>MediaRecorder.isTypeSupported(x));if(!mime){$('status').textContent='Geen ondersteund videoformaat.';return}exporting=true;$('export').disabled=true;let dur=+$('duration').value,stream=cv.captureStream(0),track=stream.getVideoTracks()[0],parts=[],recorder;try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7000000})}catch(e){$('status').textContent=e.message;exporting=false;$('export').disabled=false;return}
recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());let ext=mime.includes('mp4')?'mp4':'webm';if(parts.length)download(new Blob(parts,{type:mime}),'ODR-De-Zichtbare-Laag.'+ext);$('status').textContent='Video-export klaar.';exporting=false;$('export').disabled=false;drawLayer(0)};
recorder.start();let frame=0,frames=dur*30;function next(){if(frame>frames){if(recorder.state!=='inactive')recorder.stop();return}drawLayer(frame/30);track.requestFrame?.();frame++;if(frame%30===0)$('status').textContent='Export '+Math.round(frame/frames*100)+'%';setTimeout(next,1000/30)}next()};
}
for(let el of document.querySelectorAll('input,select,textarea'))el.addEventListener('input',()=>{save();if(!playing&&!exporting)render()});
document.fonts.ready.then(render);render();
})();