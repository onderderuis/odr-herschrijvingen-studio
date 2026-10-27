(()=>{'use strict';
const $=id=>document.getElementById(id),c=$('canvas'),g=c.getContext('2d'),W=c.width,kind=document.body.dataset.kind;let H=c.height;
let photo=null,photoURL=null,playing=false,recording=false,frame=0,start=0,raf=0;
const pi=Math.PI;

// De Lichtval: elke carrouselslide heeft een eigen lichtval, vlak, tekst en animatiekeuze.
const isLichtval=kind==='lichtval';
const slideControlIds=['duration','amount','speed','intensity','message','lightOverPlane','planeOn','effectPlaneOrder','planeSide','planeShape','planeCover','planeTop','planeBottom','planeCurve','planeWave','planeSpeed','planeOpacity','photoOn','photoOrder','photoHalf','photoBlend','photoOpacity','photoZoom','photoX','photoY','signature'];
let slideIndex=0,slideData=[],slideFormat='carousel';
const slideStore='odr-lichtval-slides-v1';
function readSlide(){const o={mode:$('slideMode')?.value||'image'};for(const id of slideControlIds){const e=$(id);if(e)o[id]=e.type==='checkbox'?e.checked:e.value}return o}
function writeSlide(o){if(!o)return;for(const id of slideControlIds){const e=$(id);if(e&&o[id]!==undefined){if(e.type==='checkbox')e.checked=!!o[id];else e.value=o[id]}}if($('slideMode'))$('slideMode').value=o.mode||'image'}
function saveSlides(){if(!isLichtval)return;try{localStorage.setItem(slideStore,JSON.stringify({slides:slideData,format:slideFormat,index:slideIndex}))}catch(e){}}
function captureSlide(){if(!isLichtval||!slideData.length)return;slideData[slideIndex]=readSlide();saveSlides()}
function selectSlide(i){if(!isLichtval)return;slideIndex=Math.max(0,Math.min(slideData.length-1,i));writeSlide(slideData[slideIndex]);refreshSlideUI();saveSlides();render(0)}
function refreshSlideUI(){
 if(!isLichtval)return;
 const box=$('slideButtons');if(box){box.replaceChildren();slideData.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1).padStart(2,'0');b.className=i===slideIndex?'primary':'';b.setAttribute('aria-label','Slide '+(i+1));b.onclick=()=>{stop();captureSlide();selectSlide(i)};box.appendChild(b)})}
 $('slidePosition').textContent='Slide '+(slideIndex+1)+' van '+slideData.length;
 $('removeSlide').disabled=slideData.length===1;
 $('previousSlide').disabled=slideIndex===0;
 $('nextSlide').disabled=slideIndex===slideData.length-1;
 const reel=slideFormat==='reel';$('outputLabel').textContent=reel?'REEL · 1080 × 1920':'CARROUSEL · 1080 × 1350';$('carouselControls').hidden=reel;
 $('slideModeField').hidden=reel;
 const video=reel||$('slideMode').value==='video';
 $('exportImage').hidden=reel||video;
 $('exportAllImages').hidden=reel;
 $('export').hidden=!video;
 $('play').disabled=!video;
 $('stop').disabled=!video;
 $('message').previousElementSibling.textContent=video?'Tekst aan het einde van de animatie (mag leeg blijven)':'Tekst op deze slide (mag leeg blijven)';
 $('exportAllImages').textContent='↓ Exporteer alle '+slideData.length+' slides als PNG';
}
function setFormat(format){slideFormat=format==='reel'?'reel':'carousel';c.height=slideFormat==='reel'?1920:1350;H=c.height;refreshSlideUI();saveSlides();render(0)}
function exportPng(i){const original=slideIndex;if(i!==undefined){writeSlide(slideData[i]);slideIndex=i}render(0);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='ODR-De-Lichtval-slide-'+String(slideIndex+1).padStart(2,'0')+'.png';document.body.appendChild(a);a.click();a.remove();if(i!==undefined){slideIndex=original;writeSlide(slideData[original]);render(0)}}
function initSlides(){
 if(!isLichtval)return;
 const base=readSlide();let saved=null;try{saved=JSON.parse(localStorage.getItem(slideStore))}catch(e){}
 if(saved&&Array.isArray(saved.slides)&&saved.slides.length)slideData=saved.slides.slice(0,20).map(o=>({...base,...o}));
 else slideData=Array.from({length:5},(_,i)=>({...base,mode:'image',message:i===0?base.message:''}));
 slideIndex=Math.max(0,Math.min(slideData.length-1,Number(saved?.index)||0));
 slideFormat=saved?.format==='reel'?'reel':'carousel';
 $('outputFormat').value=slideFormat;writeSlide(slideData[slideIndex]);
 $('outputFormat').addEventListener('change',e=>{stop();captureSlide();setFormat(e.target.value)});
 $('slideMode').addEventListener('change',()=>{stop();captureSlide();refreshSlideUI();render(0)});
 $('previousSlide').onclick=()=>{stop();captureSlide();selectSlide(slideIndex-1)};
 $('nextSlide').onclick=()=>{stop();captureSlide();selectSlide(slideIndex+1)};
 $('addSlide').onclick=()=>{stop();captureSlide();if(slideData.length>=20){$('status').textContent='Maximaal 20 slides.';return}slideData.splice(slideIndex+1,0,{...slideData[slideIndex],message:''});selectSlide(slideIndex+1)};
 $('removeSlide').onclick=()=>{stop();if(slideData.length<=1)return;slideData.splice(slideIndex,1);selectSlide(Math.min(slideIndex,slideData.length-1))};
 $('exportImage').onclick=()=>{captureSlide();exportPng()};
 $('exportAllImages').onclick=()=>{captureSlide();for(let i=0;i<slideData.length;i++)setTimeout(()=>exportPng(i),i*350);$('status').textContent='De PNG-bestanden worden afzonderlijk gedownload. Sta meerdere downloads toe als je browser daarom vraagt.'};
 setFormat(slideFormat);
}

function val(id){return Number($(id).value)}
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function wrap(text,max,font){g.font=font+'px "DM Sans",sans-serif';let out=[],line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(g.measureText(next).width>max&&line){out.push(line);line=word}else line=next}if(line)out.push(line);return out}
function imageLayer(){
 if(!photo||!$('photoOn').checked)return;
 const scale=Math.max(W/photo.width,H/photo.height)*val('photoZoom')/100;
 const w=photo.width*scale,h=photo.height*scale;
 const x=(W-w)*val('photoX')/100,y=(H-h)*val('photoY')/100;
 g.save();g.globalAlpha=val('photoOpacity')/100;g.globalCompositeOperation=$('photoBlend').value;
 const half=$('photoHalf').value;
 if(half!=='all'&&!$('planeOn').checked){g.beginPath();g.rect(half==='left'?0:W/2,0,W/2,H);g.clip()}
 g.drawImage(photo,x,y,w,h);g.restore()
}
function drawLines(t){
 const count=val('amount'),speed=val('speed')/100,intensity=val('intensity')/100;
 g.save();g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<count;i++){
  const band=i-(count-1)/2,phase=t*speed*.55;
  g.beginPath();
  for(let x=-35;x<=W+35;x+=5){
   const a=x/W;
   const y=H*.49+band*28+(105+intensity*80)*Math.sin(a*7.8-phase+band*.095)+
     (35+intensity*45)*Math.sin(a*15.7-phase*.62+band*.21)+
     band*8*Math.sin(a*3.4+phase*.4);
   if(x===-35)g.moveTo(x,y);else g.lineTo(x,y)
  }
  g.strokeStyle=i%4===0?'#edcbb0':'#a88a75';g.globalAlpha=i%4===0?.84:.48;
  g.lineWidth=i%4===0?3.3:2.1;g.stroke()
 }
 g.restore()
}
function drawPoints(t){
 const count=val('amount'),speed=val('speed')/100,intensity=val('intensity')/100;
 g.save();
 for(let i=0;i<count;i++){
  const seed=i*2.399963,rad=Math.sqrt((i+.5)/count);
  const x=W*(.5+.41*rad*Math.cos(seed+t*.13*speed*(i%2?1:-1)))+
    65*Math.sin(t*.25*speed+i*1.7);
  const y=H*(.49+.43*rad*Math.sin(seed+t*.10*speed))+
    50*Math.cos(t*.21*speed+i);
  const pulse=.5+.5*Math.sin(t*(.4+.04*(i%5))*speed+i*1.4);
  const radius=2.4+intensity*5+pulse*4;
  const glow=g.createRadialGradient(x,y,0,x,y,radius*11);
  glow.addColorStop(0,'rgba(255,223,181,'+(.58+.38*pulse)+')');
  glow.addColorStop(.12,'rgba(226,174,113,'+(.21+.28*pulse)+')');
  glow.addColorStop(1,'rgba(226,174,113,0)');
  g.fillStyle=glow;g.beginPath();g.arc(x,y,radius*11,0,pi*2);g.fill();
  g.fillStyle='rgba(255,230,193,'+(.3+.65*pulse)+')';
  g.beginPath();g.arc(x,y,Math.max(1.5,radius*.28),0,pi*2);g.fill()
 }
 g.restore()
}
function drawLight(t){
 const count=val('amount'),speed=val('speed')/100,intensity=val('intensity')/100;
 g.save();g.globalCompositeOperation='screen';
 for(let i=0;i<count;i++){
  const a=t*.19*speed*(i%2?1:-1)+i*2.35;
  const cx=W*(.5+.27*Math.sin(a*.61+i)),cy=H*(.5+.25*Math.cos(a*.48+i));
  g.save();g.translate(cx,cy);g.rotate(a);
  const wide=170+intensity*290,high=H*.86;
  const grd=g.createRadialGradient(0,0,3,0,0,high*.75);
  grd.addColorStop(0,'rgba(218,152,93,'+(.14+.23*intensity)+')');
  grd.addColorStop(.45,'rgba(165,97,54,'+(.06+.10*intensity)+')');
  grd.addColorStop(1,'rgba(130,65,33,0)');
  g.scale(wide/high,1);g.fillStyle=grd;g.beginPath();g.arc(0,0,high*.75,0,pi*2);g.fill();
  g.restore()
 }
 g.restore();
 // Hetzelfde vlak blijft aanwezig, maar de belichting maakt een zachte textuur zichtbaar.
 const a=t*.18*speed;
 const x=W*(.5+.35*Math.sin(a)),y=H*(.5+.31*Math.cos(a*.7));
 const glow=g.createRadialGradient(x,y,0,x,y,W*.6);
 glow.addColorStop(0,'rgba(239,188,132,'+(.08+.13*intensity)+')');
 glow.addColorStop(1,'rgba(239,188,132,0)');
 g.fillStyle=glow;g.fillRect(0,0,W,H)
}

function brownPlane(t){
 if(!$('planeOn')?.checked)return;
 const side=$('planeSide').value,shape=$('planeShape').value;
 const coverage=val('planeCover')/100,amplitude=val('planeWave')/100;
 const velocity=val('planeSpeed')/100;
 const alpha=val('planeOpacity')/100;
 const vertical=side==='left'||side==='right',extent=vertical?W:H,along=vertical?H:W;
 const center=extent*(side==='right'||side==='bottom'?1-coverage:coverage);
 const topWidth=val('planeTop')/100,bottomWidth=val('planeBottom')/100;
 const tilt=val('planeCurve')/100;
 function boundary(u){
  const blend=u*u*(3-2*u);
  const taper=(topWidth*(1-blend)+bottomWidth*blend)-.5;
  const slope=taper*extent*.85+tilt*extent*.3*(u-.5);
  if(shape==='straight')return Math.max(0,Math.min(extent,center+slope));
  const phase=t*velocity*.85;
  const wave1=Math.sin(u*pi*2.1-phase);
  const wave2=Math.sin(u*pi*4.3+phase*.71+.6);
  const wave3=Math.sin(u*pi*1.1+phase*.33+1.7);
  const raw=shape==='flow'?wave1*.65+wave2*.20+wave3*.15:
     Math.sin(u*pi*1.4-phase)*.45+Math.sin(u*pi*3.3+phase*.6)*.35+
     Math.sin(u*pi*6.2-phase*.4)*.20;
  return Math.max(0,Math.min(extent,center+slope+amplitude*extent*.22*raw));
 }
 g.save();g.globalAlpha=alpha;g.fillStyle='#291b15';g.beginPath();
 if(side==='left')g.moveTo(0,0);
 else if(side==='right')g.moveTo(W,0);
 else if(side==='top')g.moveTo(0,0);
 else g.moveTo(0,H);
 if(vertical){
  if(side==='left'){g.lineTo(boundary(0),0);for(let y=8;y<=H;y+=8)g.lineTo(boundary(y/H),y);g.lineTo(0,H)}
  else {g.lineTo(boundary(0),0);for(let y=8;y<=H;y+=8)g.lineTo(boundary(y/H),y);g.lineTo(W,H)}
 }else{
  if(side==='top'){g.lineTo(0,boundary(0));for(let x=8;x<=W;x+=8)g.lineTo(x,boundary(x/W));g.lineTo(W,0)}
  else {g.lineTo(0,boundary(0));for(let x=8;x<=W;x+=8)g.lineTo(x,boundary(x/W));g.lineTo(W,H)}
 }
 g.closePath();g.fill();g.restore()
}
function drawText(t){
 const content=$('message').value.trim();if(!content)return;
 const dur=val('duration'),still=isLichtval&&slideFormat==='carousel'&&$('slideMode').value==='image',on=Math.max(0,dur-4.1),alpha=still?1:ease((t-on)/1.1);
 if(alpha<=0)return;
 g.save();g.globalAlpha=alpha;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f2e1cf';
 let font=49,rows=wrap(content,850,font);
 while(rows.length*font*1.43>350&&font>30){font-=2;rows=wrap(content,850,font)}
 rows.forEach((line,i)=>g.fillText(line,W/2,H*.81+(i-(rows.length-1)/2)*font*1.48));
 g.restore()
}
function render(t){
 g.fillStyle=$('planeOn')?.checked?'#70513e':'#291b15';g.fillRect(0,0,W,H);
 const effectsOverPlane=$('lightOverPlane')?.checked || $('effectPlaneOrder')?.value==='over';
 if($('photoOrder').value==='back')imageLayer();
 if(effectsOverPlane)brownPlane(t);
 if(kind==='beweging')drawLines(t);
 if(kind==='punten')drawPoints(t);
 if(kind==='lichtval')drawLight(t);
 if(!effectsOverPlane)brownPlane(t);
 if($('photoOrder').value==='front')imageLayer();
 drawText(t);
 if($('signature').checked){g.fillStyle='#c7ad97';g.font='26px "DM Sans",sans-serif';g.textAlign='left';g.fillText('onder de ruis.',94,H-105)}
 $('counter').textContent=isLichtval&&slideFormat==='carousel'?'SLIDE '+(slideIndex+1)+' / '+slideData.length+' · '+($('slideMode').value==='image'?'PNG':'VIDEO'):Math.min(val('duration'),t).toFixed(1)+' / '+val('duration')+' sec'
}
function stop(){playing=false;cancelAnimationFrame(raf);$('play').disabled=false}
function preview(){
 stop();playing=true;$('play').disabled=true;start=performance.now();
 const tick=now=>{if(!playing)return;const t=Math.min(val('duration'),(now-start)/1000);render(t);if(t<val('duration'))raf=requestAnimationFrame(tick);else stop()};
 raf=requestAnimationFrame(tick)
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),45000)}
async function exportVideo(){
 if(recording)return;stop();if(isLichtval)captureSlide();
 if(!c.captureStream||!window.MediaRecorder){$('status').textContent='Video-export wordt niet ondersteund in deze browser.';return}
 const types=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'];
 const mime=types.find(x=>MediaRecorder.isTypeSupported(x));if(!mime){$('status').textContent='Geen ondersteund videoformaat.';return}
 recording=true;$('export').disabled=true;
 const stream=c.captureStream(30),chunks=[];let recorder;
 try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000})}
 catch(e){stream.getTracks().forEach(t=>t.stop());recording=false;$('export').disabled=false;$('status').textContent=e.message;return}
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const ext=mime.includes('mp4')?'mp4':'webm';
 if(chunks.length)download(new Blob(chunks,{type:mime}),'ODR-'+kind+(isLichtval&&slideFormat==='carousel'?'-slide-'+String(slideIndex+1).padStart(2,'0'):'')+'.'+ext);
 recording=false;$('export').disabled=false;$('status').textContent='Video opgeslagen.';render(0)};
 recorder.start(1000);const t0=performance.now();
 const tick=now=>{if(!recording)return;const t=Math.min(val('duration'),(now-t0)/1000);render(t);
 $('status').textContent='Video opnemen: '+Math.round(100*t/val('duration'))+'%';
 if(t<val('duration'))raf=requestAnimationFrame(tick);else setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop()},300)};
 raf=requestAnimationFrame(tick)
}
$('photoFile').addEventListener('change',()=>{
 const f=$('photoFile').files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return;
 const url=URL.createObjectURL(f),img=new Image();
 img.onload=()=>{if(photoURL)URL.revokeObjectURL(photoURL);photoURL=url;photo=img;$('photoOn').checked=true;render(0);$('status').textContent='Foto lokaal toegevoegd.'};
 img.onerror=()=>{URL.revokeObjectURL(url);$('status').textContent='Foto kon niet worden geladen.'};img.src=url
});
$('photoClear').onclick=()=>{photo=null;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;$('photoFile').value='';$('photoOn').checked=false;render(0)};
$('play').onclick=preview;$('stop').onclick=()=>{stop();render(0)};
$('export').onclick=exportVideo;
for(const el of document.querySelectorAll('input,select,textarea')){const update=()=>{if(isLichtval&&slideControlIds.includes(el.id))captureSlide();if(!recording)render(playing?(performance.now()-start)/1000:0)};el.addEventListener('input',update);el.addEventListener('change',update)}
initSlides();document.fonts.ready.then(()=>render(0));render(0);
})();