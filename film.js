/* Gatelight film engine — shared by the app (index.html) and the test bench (tools/test.html). */
(() => {
const STOCKS = [
  { name:"Tungsten 500", d:"Night · interiors", m:[1.06,-0.04,-0.02, -0.03,1.05,-0.02, 0.00,-0.07,1.07],
    sat:0.9, con:0.38, black:0.022, white:0.965, sh:[-0.022,0.008,0.038], hi:[0.035,0.012,-0.028], halo:65, grain:45, vig:0.28 },
  { name:"Daylight 250", d:"Sun · skin tones", m:[1.04,-0.02,-0.02, -0.02,1.03,-0.01, -0.01,-0.04,1.05],
    sat:1.0, con:0.26, black:0.03, white:0.97, sh:[0.006,0.004,0.018], hi:[0.03,0.016,-0.02], halo:40, grain:30, vig:0.22 },
  { name:"Silver Retain", d:"Hard · muted", m:[1.02,-0.01,-0.01, -0.01,1.02,-0.01, -0.01,-0.02,1.03],
    sat:0.52, con:0.58, black:0.025, white:0.975, sh:[-0.01,0.004,0.016], hi:[0.012,0.008,-0.004], halo:25, grain:55, vig:0.32 },
  { name:"Studio 50", d:"Clean · fine grain", m:[1.03,-0.02,-0.01, -0.01,1.02,-0.01, 0,-0.02,1.02],
    sat:1.04, con:0.18, black:0.02, white:0.98, sh:[0,0.004,0.01], hi:[0.012,0.006,-0.008], halo:20, grain:12, vig:0.14 },
  { name:"Mono 400", d:"Black & white", mono:[0.42,0.46,0.12], m:[1,0,0, 0,1,0, 0,0,1],
    sat:0, con:0.46, black:0.035, white:0.97, sh:[0.004,0.002,-0.004], hi:[0.012,0.006,-0.006], halo:30, grain:60, vig:0.3 },
];
const ASPECTS = [["3:2",1.5],["1.85",1.85],["2.39",2.39],["1:1",1],["Full",0]];

const S2L = new Float32Array(256);
for (let i=0;i<256;i++){ const v=i/255; S2L[i] = v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
const L2S = new Float32Array(4096);
for (let i=0;i<4096;i++){ const v=i/4095; L2S[i] = v<=0.0031308 ? v*12.92 : 1.055*Math.pow(v,1/2.4)-0.055; }
function buildCurve(s){
  const c = new Float32Array(1024), g = 1 + s.con*1.6;
  for (let i=0;i<1024;i++){
    const v=i/1023;
    const base = v<0.5 ? 0.5*Math.pow(2*v,g) : 1-0.5*Math.pow(2*(1-v),g);
    c[i] = s.black + (s.white - s.black)*base;
  }
  return c;
}
const shoulder = x => x<=0.7 ? x : 0.7 + 0.3*(1-Math.exp(-(x-0.7)/0.3));

function mk(w,h){ const c=document.createElement("canvas"); c.width=w; c.height=h; return {c, x:c.getContext("2d",{willReadFrequently:true})}; }
function mulberry(a){ return () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function cropRect(sw, sh, aspect){
  const r0 = ASPECTS[aspect][1];
  if (!r0) return [0,0,sw,sh];
  const r = (sh>sw && r0!==1) ? 1/r0 : r0;
  let cw=sw, ch=sw/r;
  if (ch>sh){ ch=sh; cw=sh*r; }
  return [(sw-cw)/2,(sh-ch)/2,cw,ch];
}

function prepare(src, maxEdge, aspect){
  const sw = src.naturalWidth||src.width, sh = src.naturalHeight||src.height;
  const [sx,sy,cw,ch] = cropRect(sw,sh,aspect||0);
  const sc = Math.min(1, maxEdge/Math.max(cw,ch));
  const w = Math.max(1,Math.round(cw*sc)), h = Math.max(1,Math.round(ch*sc));
  const k = mk(w,h);
  k.x.imageSmoothingQuality = "high";
  k.x.drawImage(src,sx,sy,cw,ch,0,0,w,h);
  return { ...k, w, h, data:k.x.getImageData(0,0,w,h), halo:haloMap(k.c,w,h), noise:noiseMap(w,h) };
}

function haloMap(c,w,h){
  const sw=Math.max(8,Math.round(w/8)), sh=Math.max(8,Math.round(h/8));
  const a=mk(sw,sh); a.x.drawImage(c,0,0,sw,sh);
  const d=a.x.getImageData(0,0,sw,sh), p=d.data;
  for (let i=0;i<p.length;i+=4){
    const l=(0.2126*p[i]+0.7152*p[i+1]+0.0722*p[i+2])/255;
    let m=Math.max(0,(l-0.72)/0.28); m*=m;
    p[i]=p[i+1]=p[i+2]=m*255; p[i+3]=255;
  }
  a.x.putImageData(d,0,0);
  const b=mk(sw,sh);
  b.x.filter=`blur(${Math.max(1.5,sw/70)}px)`; b.x.drawImage(a.c,0,0);
  b.x.filter=`blur(${Math.max(3,sw/28)}px)`; b.x.globalAlpha=0.6; b.x.drawImage(a.c,0,0);
  const u=mk(w,h); u.x.imageSmoothingQuality="high"; u.x.drawImage(b.c,0,0,w,h);
  const ud=u.x.getImageData(0,0,w,h).data, out=new Float32Array(w*h);
  for (let j=0;j<out.length;j++) out[j]=ud[j*4]/255;
  return out;
}

/* Grain is generated on a fixed ~1400px "film plate" and scaled to the image,
   so the preview and the saved photo show the same grain size. Two octaves
   (soft clumps + finer crystals) read as film rather than sensor noise. */
const PLATE = 1400;
function noiseMap(w,h){
  const sc = Math.min(1, PLATE/Math.max(w,h));
  const gw = Math.max(8,Math.round(w*sc)), gh = Math.max(8,Math.round(h*sc)), rnd = mulberry(1873);
  const fine = mk(gw,gh), fd = fine.x.createImageData(gw,gh), fp = fd.data;
  for (let i=0;i<fp.length;i+=4){ const v=128+(rnd()+rnd()+rnd()+rnd()-2)*110; fp[i]=fp[i+1]=fp[i+2]=v; fp[i+3]=255; }
  fine.x.putImageData(fd,0,0);
  const cw = Math.max(4,gw>>1), ch = Math.max(4,gh>>1);
  const coarse = mk(cw,ch), cd = coarse.x.createImageData(cw,ch), cp = cd.data;
  for (let i=0;i<cp.length;i+=4){ const v=128+(rnd()+rnd()+rnd()+rnd()-2)*110; cp[i]=cp[i+1]=cp[i+2]=v; cp[i+3]=255; }
  coarse.x.putImageData(cd,0,0);
  const plate = mk(gw,gh);
  plate.x.filter = "blur(0.45px)"; plate.x.drawImage(fine.c,0,0);
  plate.x.filter = "none"; plate.x.globalAlpha = 0.55; plate.x.imageSmoothingQuality = "high"; plate.x.drawImage(coarse.c,0,0,gw,gh);
  const up = mk(w,h); up.x.imageSmoothingQuality = "high"; up.x.drawImage(plate.c,0,0,w,h);
  const d = up.x.getImageData(0,0,w,h).data, out = new Float32Array(w*h);
  let sum=0, sq=0;
  for (let j=0;j<out.length;j++){ const v=d[j*4]; out[j]=v; sum+=v; sq+=v*v; }
  const mean=sum/out.length, sd=Math.sqrt(Math.max(1e-6, sq/out.length-mean*mean));
  for (let j=0;j<out.length;j++) out[j]=(out[j]-mean)/sd;
  return out;
}

/* st = {stock, strength, grain, halo, warmth, ev} */
function develop(P, st){
  const s=STOCKS[st.stock], src=P.data.data, w=P.w, h=P.h;
  const out=new ImageData(w,h), o=out.data, curve=buildCurve(s), M=s.m;
  const ev=Math.pow(2,st.ev), halo=st.halo/100*1.4, grain=st.grain/100*0.042;
  const warm=st.warmth/100*0.07, k=st.strength/100, vig=s.vig, mono=s.mono;
  const hr=1, hg=0.3, hb=0.1;
  const cx=w/2, cy=h/2, inv=1/(cx*cx+cy*cy);
  for (let y=0;y<h;y++){
    const dy=(y-cy)*(y-cy);
    for (let x=0;x<w;x++){
      const j=y*w+x, i=j*4;
      let r=S2L[src[i]]*ev, g=S2L[src[i+1]]*ev, b=S2L[src[i+2]]*ev;
      const hv=P.halo[j]*halo; r+=hv*hr; g+=hv*hg; b+=hv*hb;
      let R=M[0]*r+M[1]*g+M[2]*b, G=M[3]*r+M[4]*g+M[5]*b, B=M[6]*r+M[7]*g+M[8]*b;
      R=shoulder(R<0?0:R); G=shoulder(G<0?0:G); B=shoulder(B<0?0:B);
      R=L2S[(R*4095)|0]; G=L2S[(G*4095)|0]; B=L2S[(B*4095)|0];
      if (mono){ const l=R*mono[0]+G*mono[1]+B*mono[2]; R=G=B=l; }
      else { const l=0.2126*R+0.7152*G+0.0722*B; R=l+(R-l)*s.sat; G=l+(G-l)*s.sat; B=l+(B-l)*s.sat; }
      R=curve[(R<0?0:R>1?1:R)*1023|0]; G=curve[(G<0?0:G>1?1:G)*1023|0]; B=curve[(B<0?0:B>1?1:B)*1023|0];
      const l=0.2126*R+0.7152*G+0.0722*B, ws=(1-l)*(1-l), wh=l*l;
      R+=ws*s.sh[0]+wh*s.hi[0]+warm; G+=ws*s.sh[1]+wh*s.hi[1]+warm*0.25; B+=ws*s.sh[2]+wh*s.hi[2]-warm;
      const n=P.noise[j]*grain*(0.25+3*l*(1-l)); R+=n; G+=n; B+=n;
      const d=(x-cx)*(x-cx)+dy, v=1-vig*Math.pow(d*inv,1.5);
      R*=v; G*=v; B*=v;
      o[i]  =(src[i]  /255+(R-src[i]  /255)*k)*255;
      o[i+1]=(src[i+1]/255+(G-src[i+1]/255)*k)*255;
      o[i+2]=(src[i+2]/255+(B-src[i+2]/255)*k)*255;
      o[i+3]=255;
    }
  }
  return out;
}

function sampleScene(){
  const W=1800,H=1200,{c,x}=mk(W,H), rnd=mulberry(42);
  const sky=x.createLinearGradient(0,0,0,H*0.72);
  sky.addColorStop(0,"#1b2747"); sky.addColorStop(0.45,"#6a4a6e"); sky.addColorStop(0.78,"#d9785a"); sky.addColorStop(1,"#f7c98a");
  x.fillStyle=sky; x.fillRect(0,0,W,H);
  const sun=x.createRadialGradient(1260,700,10,1260,700,260);
  sun.addColorStop(0,"rgba(255,250,235,1)"); sun.addColorStop(0.25,"rgba(255,226,170,.9)"); sun.addColorStop(1,"rgba(255,180,120,0)");
  x.fillStyle=sun; x.fillRect(0,0,W,H);
  x.fillStyle="#fffbf0"; x.beginPath(); x.arc(1260,700,58,0,7); x.fill();
  x.fillStyle="#4a3150"; x.beginPath(); x.moveTo(0,820);
  for (let px=0;px<=W;px+=20) x.lineTo(px,780+Math.sin(px/170)*30+Math.sin(px/53)*10);
  x.lineTo(W,H); x.lineTo(0,H); x.fill();
  let bx=0;
  while (bx<W){
    const bw=110+rnd()*170, bh=260+rnd()*380, top=H-bh;
    x.fillStyle=`rgb(${22+rnd()*12|0},${18+rnd()*10|0},${26+rnd()*12|0})`; x.fillRect(bx,top,bw,bh);
    for (let wy=top+24; wy<H-60; wy+=38) for (let wx=bx+14; wx<bx+bw-22; wx+=30)
      if (rnd()<0.32){ x.fillStyle=rnd()<0.7?"#ffd49a":"#bfe0ff"; x.fillRect(wx,wy,14,20); }
    bx+=bw+6;
  }
  x.fillStyle="#0c0a0d"; x.fillRect(430,640,10,H-640); x.fillRect(430,640,70,8);
  const bulb=x.createRadialGradient(500,660,2,500,660,90);
  bulb.addColorStop(0,"rgba(255,255,245,1)"); bulb.addColorStop(0.2,"rgba(255,220,160,.8)"); bulb.addColorStop(1,"rgba(255,200,140,0)");
  x.fillStyle=bulb; x.fillRect(380,560,240,220);
  const road=x.createLinearGradient(0,H-120,0,H); road.addColorStop(0,"#1a1418"); road.addColorStop(1,"#0a0809");
  x.fillStyle=road; x.fillRect(0,H-120,W,120);
  return c;
}

window.Film = { STOCKS, ASPECTS, prepare, develop, sampleScene, mk };
})();
