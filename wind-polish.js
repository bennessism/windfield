// Visual polish and wind-response layer.
// The landscape is side-view: true compass direction is shown separately,
// while scene motion uses only left/right so visible speed stays comparable.

let visualFlowSign=1;

function visualWindAt(t){
  const base=Math.max(0,Number(wind)||0),peak=Math.max(base,Number(gust)||base);
  if(peak<=base)return base;
  const wave=(Math.sin(t*.00105)+1)*.5;
  const pulse=Math.pow(wave,4);
  return base+(peak-base)*pulse;
}

function visualFlowVector(){
  const toDeg=(Number(windDir)+180)%360;
  const horizontal=Math.sin(toDeg*Math.PI/180);
  if(Math.abs(horizontal)>=.18)visualFlowSign=horizontal>0?1:-1;
  return{x:visualFlowSign,y:0};
}

function seedScene(w,h){
  const pad=10;
  stars=Array.from({length:95},()=>({x:pad+Math.random()*Math.max(1,w-pad*2),y:pad+Math.random()*Math.max(1,h*.46-pad*2),r:.35+Math.random()*1.15,a:.30+Math.random()*.62,p:Math.random()*Math.PI*2,tw:.0008+Math.random()*.0014}));
  clouds=Array.from({length:7},(_,i)=>({x:(i/7)*w+Math.random()*230,y:36+Math.random()*Math.max(85,h*.15),s:.62+Math.random()*1.2,p:Math.random()*6.28}));
  kites=[{x:.56,y:.27,c1:'#ef4d5b',c2:'#ff9b68',p:0},{x:.71,y:.20,c1:'#f2c84b',c2:'#f58d3d',p:2.1},{x:.84,y:.29,c1:'#36bfc1',c2:'#4b86dd',p:4.2}];
  particles=[];leafParticles=[];
}

function drawSky(w,h){
  const now=performance.now();
  const c=isDay?['#6fb4e8','#d9efff','#f3d6a4']:['#06101d','#132640','#263a53'],g=ctx.createLinearGradient(0,0,0,h*.72);
  g.addColorStop(0,c[0]);g.addColorStop(.66,c[1]);g.addColorStop(1,c[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  if(!isDay){
    ctx.fillStyle='#fff';for(const s of stars){const twinkle=.78+.22*Math.sin(now*s.tw+s.p);ctx.globalAlpha=Math.max(.12,s.a*twinkle);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
    ctx.globalAlpha=1;ctx.fillStyle='#f5efcf';ctx.beginPath();ctx.arc(w*.82,h*.145,27,0,Math.PI*2);ctx.fill();
  }else{
    const sg=ctx.createRadialGradient(w*.84,h*.13,4,w*.84,h*.13,38);sg.addColorStop(0,'#ffd36a');sg.addColorStop(.72,'#f5a33b');sg.addColorStop(1,'rgba(242,139,44,.15)');ctx.fillStyle=sg;ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(w*.84,h*.13,38,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
}

function cloudPos(c,w,h,t){
  const d=visualFlowVector();
  const transport=Math.max(2,Math.max(0,wind)+Math.max(0,gust-wind)*.22);
  const dx=t*transport*.0042*d.x,band=Math.max(85,h*.15);
  return{x:((c.x+dx)%(w+360)+w+360)%(w+360)-180,y:36+((c.y-36+Math.sin(t*.0003+c.p)*6)%band+band)%band}
}

function drawMailbox(x,y,scale,t){
  const vw=visualWindAt(t),d=visualFlowVector(),idle=Math.sin(t*.0032)*.055,flagWiggle=idle+d.x*Math.min(.18,.025+vw*.0028);
  window.mailboxHitbox={x:x-30*scale,y:y-118*scale,w:62*scale,h:150*scale};
  ctx.save();ctx.strokeStyle=isDay?'#5c4530':'#342a21';ctx.lineWidth=7*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y+24*scale);ctx.lineTo(x,y-78*scale);ctx.stroke();ctx.fillStyle=isDay?'#9e4e42':'#64382f';ctx.fillRect(x-18*scale,y-106*scale,38*scale,24*scale);ctx.beginPath();ctx.arc(x-18*scale,y-94*scale,12*scale,-Math.PI/2,Math.PI/2,true);ctx.fill();
  ctx.save();ctx.fillStyle='rgba(255,248,232,.95)';ctx.font=`700 ${Math.max(7,9*scale)}px system-ui,-apple-system,"Segoe UI",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Mail',x+2*scale,y-94*scale);ctx.restore();
  ctx.fillStyle=isDay?'#cbbaa8':'#8c7a68';ctx.save();ctx.translate(x+12*scale,y-104*scale);ctx.rotate(flagWiggle);ctx.fillRect(0,-2*scale,3*scale,20*scale);ctx.fillRect(3*scale,-1*scale,13*scale,4*scale);ctx.restore();ctx.fillStyle=isDay?'#47653b':'#263828';ctx.beginPath();ctx.ellipse(x,y+24*scale,22*scale,9*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawTree(w,h,t){
  const vw=visualWindAt(t),ground=h*.79,x=w*.76,scale=Math.max(.78,Math.min(1.32,w/1100)),d=visualFlowVector();
  const windLean=d.x*Math.min(17,Math.max(2.5,vw*.34));
  const idle=Math.sin(t*.00135)*4.2+Math.sin(t*.00052+1.2)*1.7,sway=windLean+idle;
  ctx.save();ctx.translate(x,ground);ctx.fillStyle=isDay?'#5a3f2b':'#2b241d';ctx.beginPath();ctx.moveTo(-25*scale,5);ctx.bezierCurveTo(-19*scale,-70*scale,-18*scale,-135*scale,sway*scale,-210*scale);ctx.bezierCurveTo(18*scale,-140*scale,24*scale,-62*scale,31*scale,5);ctx.closePath();ctx.fill();ctx.strokeStyle=isDay?'#65462f':'#31271f';ctx.lineCap='round';ctx.lineWidth=13*scale;
  for(const b of[[0,-155,-70,-215],[4,-145,76,-198],[-3,-178,-40,-245],[8,-170,55,-240]]){ctx.beginPath();ctx.moveTo((b[0]+sway*.3)*scale,b[1]*scale);ctx.lineTo((b[2]+sway)*scale,b[3]*scale);ctx.stroke()}
  const canopyY=-238*scale,lean=sway*1.7*scale;ctx.fillStyle=isDay?'#477f3e':'#25462e';for(const c of[[-68,-2,76,54],[-8,-34,92,67],[72,-6,72,55],[-26,30,90,58]]){ctx.beginPath();ctx.ellipse(c[0]*scale+lean,canopyY+c[1]*scale,c[2]*scale,c[3]*scale,0,0,Math.PI*2);ctx.fill()}ctx.fillStyle=isDay?'#5f9851':'#31583a';for(const c of[[-88,-20,43,31],[-20,-66,50,36],[54,-48,48,34],[92,-10,39,30],[-4,12,52,34]]){ctx.beginPath();ctx.ellipse(c[0]*scale+lean*.8,canopyY+c[1]*scale,c[2]*scale,c[3]*scale,0,0,Math.PI*2);ctx.fill()}ctx.restore();drawTreeLeaves(w,h,t,x,ground-238*scale,scale);
}

function drawTreeLeaves(w,h,t,treeX,treeY,scale){
  const vw=visualWindAt(t),d=visualFlowVector(),target=Math.min(36,Math.max(7,Math.floor(vw*.72)+5));
  if(leafParticles.length<target&&Math.random()<Math.min(.62,.22+vw*.008))leafParticles.push({x:treeX+(Math.random()-.5)*150*scale,y:treeY+(Math.random()-.5)*80*scale,v:.5+Math.random(),rot:Math.random()*6.28,life:0,sz:(3+Math.random()*4)*scale});
  for(const p of leafParticles){p.x+=d.x*(.70+Math.max(2,vw)*.052)*p.v+Math.sin(t*.0022+p.rot)*.14;p.y+=(.16+.14*p.v)+Math.cos(t*.0019+p.rot)*.04;p.rot+=(.045+Math.min(.08,vw*.0015))*p.v;p.life++;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=isDay?'#6f9148':'#405234';ctx.beginPath();ctx.ellipse(0,0,p.sz,p.sz*.45,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  leafParticles=leafParticles.filter(p=>p.x>-80&&p.x<w+80&&p.y>-80&&p.y<h+80&&p.life<900);
}

function drawKites(w,h,t){
  const vw=visualWindAt(t),count=kiteCount(),d=visualFlowVector(),gustRatio=wind>0?Math.max(1,vw/wind):1,heading=d.x>0?Math.PI/2:-Math.PI/2;
  for(let i=0;i<count;i++){
    const k=kites[i],anchorX=w*(k.x-.07*d.x),anchorY=h*.84,baseX=w*k.x,baseY=h*k.y-vw*.78,bob=Math.sin(t*(.00155+Math.min(.0014,vw*.000018))+k.p)*(6+vw*.12),swayX=d.x*(16+vw*.95)+Math.sin(t*.0011+k.p)*6*gustRatio,x=baseX+swayX,y=baseY+bob,size=23+Math.min(7,vw*.16),rot=heading+Math.sin(t*.0019+k.p)*(.05+Math.min(.06,vw*.001));
    ctx.strokeStyle=isDay?'rgba(255,255,255,.72)':'rgba(220,225,235,.4)';ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(anchorX,anchorY);ctx.quadraticCurveTo((anchorX+x)*.5+d.x*(12+Math.min(18,vw*.25)),anchorY-95-vw*1.1,x,y+size*.72);ctx.stroke();
    const bx=Math.sin(rot)*(-size),by=Math.cos(rot)*size,tailStartX=x+bx,tailStartY=y+by,tailLen=92+Math.min(45,vw*1.25);ctx.strokeStyle=k.c1;ctx.lineWidth=1.8;ctx.beginPath();const pts=[];
    for(let j=0;j<12;j++){const q=j/11,side=Math.sin(t*(.003+Math.min(.002,vw*.00002))+j*.85+k.p)*(5+q*3),tx=tailStartX+d.x*tailLen*q,ty=tailStartY+q*36+side;pts.push([tx,ty]);if(j===0)ctx.moveTo(tx,ty);else ctx.lineTo(tx,ty)}ctx.stroke();const tailAngle=Math.atan2(36,d.x*tailLen);for(const j of[3,6,9]){const p=pts[j];drawKiteBow(p[0],p[1],tailAngle,5.5,k.c2)}
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=4;ctx.strokeStyle='rgba(55,48,43,.72)';ctx.lineWidth=1.4;ctx.fillStyle=k.c1;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.78,0);ctx.lineTo(0,size*1.02);ctx.lineTo(-size*.78,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=k.c2;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.78,0);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,size*1.02);ctx.lineTo(-size*.78,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-size*.92);ctx.lineTo(0,size*.94);ctx.moveTo(-size*.68,0);ctx.lineTo(size*.68,0);ctx.stroke();ctx.restore();
  }
}

function drawNightParticles(w,h,t){
  if(isDay)return;
  const strength=Math.max(2,visualWindAt(t)),d=visualFlowVector(),target=Math.min(46,16+Math.floor(strength*.82));
  if(particles.length<target&&Math.random()<Math.min(.55,.24+strength*.006))particles.push({x:Math.random()*w,y:h*.28+Math.random()*h*.54,v:.45+Math.random()*1.2,a:Math.random()*6.28,fire:Math.random()>.18,sz:3+Math.random()*4});
  particles=particles.filter(p=>p.x>-90&&p.x<w+90&&p.y>-90&&p.y<h+90);
  for(const p of particles){p.x+=d.x*strength*.024*p.v+Math.sin(t*.002+p.a)*.22;p.y+=Math.sin(t*.0026+p.a)*.12;p.a+=(.032+Math.min(.05,strength*.001))*p.v;if(p.fire){ctx.fillStyle='#eaff91';ctx.globalAlpha=.48+.42*Math.sin(t*.005+p.a);ctx.beginPath();ctx.arc(p.x,p.y,1.7+Math.sin(p.a)*.35,0,Math.PI*2);ctx.fill()}else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate((d.x>0?0:Math.PI)+p.a*.12);ctx.fillStyle='#8a6a42bb';ctx.globalAlpha=.62;ctx.beginPath();ctx.ellipse(0,0,p.sz,2,0,0,Math.PI*2);ctx.fill();ctx.restore()}}
  ctx.globalAlpha=1;
}
