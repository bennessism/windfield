const weatherFx=document.createElement('canvas');
weatherFx.id='weatherFx';
weatherFx.setAttribute('aria-hidden','true');
stage.append(weatherFx);

const weatherLight=document.createElement('div');
weatherLight.id='weatherLight';
weatherLight.setAttribute('aria-hidden','true');
stage.append(weatherLight);

const weatherFxCtx=weatherFx.getContext('2d');
let weatherFxDpr=1;
let weatherFxState={kind:'clear',cloud:20,rain:0,temp:27,humidity:65,code:0,timezone:null};
let weatherRainDrops=[];
let weatherFlashAt=0;
let weatherNextFlash=0;

function weatherEffectKind(code=0,rain=0){
  if([95,96,99].includes(code))return'storm';
  if([45,48].includes(code))return'fog';
  if([51,53,55,56,57].includes(code))return'drizzle';
  if([61,63,65,66,67,80,81,82].includes(code))return rain>=4||[65,67,82].includes(code)?'heavy-rain':'rain';
  if(code===3)return'cloudy';
  if([1,2].includes(code))return'partly-cloudy';
  return'clear';
}

function weatherEffectName(kind){
  return({clear:'Clear','partly-cloudy':'Partly cloudy',cloudy:'Cloudy',drizzle:'Drizzle',rain:'Rain','heavy-rain':'Heavy rain',storm:'Thunderstorm',fog:'Mist / fog'})[kind]||'Weather';
}

function weatherLocalHour(timezone){
  try{
    if(timezone){
      const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
      if(Number.isFinite(hour))return hour;
    }
  }catch(e){}
  return new Date().getHours();
}

function weatherTimeBand(hour){
  if(hour>=6&&hour<11)return'morning';
  if(hour>=11&&hour<14)return'midday';
  if(hour>=14&&hour<17.5)return'afternoon';
  if(hour>=17.5&&hour<19)return'evening';
  return'night';
}

function resizeWeatherFx(){
  const r=stage.getBoundingClientRect();
  weatherFxDpr=Math.min(devicePixelRatio||1,2);
  weatherFx.width=Math.max(1,Math.round(r.width*weatherFxDpr));
  weatherFx.height=Math.max(1,Math.round(r.height*weatherFxDpr));
  weatherFx.style.width=r.width+'px';
  weatherFx.style.height=r.height+'px';
  weatherFxCtx.setTransform(weatherFxDpr,0,0,weatherFxDpr,0,0);
  seedWeatherRain();
}

function seedWeatherRain(){
  const r=stage.getBoundingClientRect();
  const intensity=weatherFxState.kind==='drizzle'?42:weatherFxState.kind==='rain'?78:weatherFxState.kind==='heavy-rain'?118:weatherFxState.kind==='storm'?138:0;
  const count=Math.min(160,intensity+Math.round(weatherFxState.rain*6));
  weatherRainDrops=Array.from({length:count},()=>({
    x:Math.random()*r.width,
    y:Math.random()*r.height,
    speed:5.5+Math.random()*6.5+(weatherFxState.kind==='heavy-rain'||weatherFxState.kind==='storm'?3.5:0),
    len:9+Math.random()*15,
    alpha:.10+Math.random()*.18
  }));
}

function applyWeatherEffects(data={}){
  const rain=Math.max(0,Number(data.precipitation_mm||0),Number(data.rain_mm||0)+Number(data.showers_mm||0));
  const code=Number(data.weather_code||0);
  const kind=weatherEffectKind(code,rain);
  weatherFxState={
    kind,
    cloud:Math.max(0,Math.min(100,Number(data.cloud_cover_pct||0))),
    rain,
    temp:Number(data.temperature_c||0),
    humidity:Number(data.relative_humidity_pct||0),
    code,
    timezone:data.timezone||currentTimezone||null
  };
  const hour=weatherLocalHour(weatherFxState.timezone);
  stage.dataset.weather=kind;
  stage.dataset.time=weatherTimeBand(hour);
  weatherLight.dataset.weather=kind;
  weatherLight.dataset.time=weatherTimeBand(hour);
  weatherLight.style.setProperty('--weather-cloud',String(weatherFxState.cloud/100));
  weatherLight.style.setProperty('--weather-humidity',String(weatherFxState.humidity/100));
  seedWeatherRain();
  if(kind==='storm')weatherNextFlash=performance.now()+3500+Math.random()*7000;
  else weatherNextFlash=0;
}

function refreshWeatherTime(){
  const band=weatherTimeBand(weatherLocalHour(weatherFxState.timezone));
  stage.dataset.time=band;
  weatherLight.dataset.time=band;
}

function drawWeatherFx(t){
  const r=stage.getBoundingClientRect(),w=r.width,h=r.height;
  weatherFxCtx.clearRect(0,0,w,h);
  const kind=weatherFxState.kind;

  if(kind==='fog'){
    const strength=.10+Math.min(.10,Math.max(0,weatherFxState.humidity-80)/200);
    const g=weatherFxCtx.createLinearGradient(0,h*.14,0,h);
    g.addColorStop(0,'rgba(229,237,239,.03)');
    g.addColorStop(.55,`rgba(229,237,239,${strength})`);
    g.addColorStop(1,'rgba(220,232,234,.08)');
    weatherFxCtx.fillStyle=g;
    weatherFxCtx.fillRect(0,0,w,h);
  }

  if(weatherRainDrops.length){
    const d=typeof downwindVector==='function'?downwindVector():{x:.2,y:1};
    const side=d.x*(2+Math.min(7,Math.max(0,wind)*.11));
    weatherFxCtx.lineCap='round';
    for(const drop of weatherRainDrops){
      weatherFxCtx.beginPath();
      weatherFxCtx.strokeStyle=`rgba(220,236,246,${drop.alpha})`;
      weatherFxCtx.lineWidth=kind==='drizzle'?.75:1;
      weatherFxCtx.moveTo(drop.x,drop.y);
      weatherFxCtx.lineTo(drop.x+side*drop.len*.24,drop.y+drop.len);
      weatherFxCtx.stroke();
      drop.y+=drop.speed;
      drop.x+=side*.62;
      if(drop.y>h+28||drop.x>w+45||drop.x<-45){drop.y=-20-Math.random()*140;drop.x=Math.random()*w}
    }
  }

  if(kind==='storm'){
    if(weatherNextFlash&&t>=weatherNextFlash){weatherFlashAt=t;weatherNextFlash=t+6500+Math.random()*12000}
    const age=t-weatherFlashAt;
    if(age>=0&&age<280){
      const a=age<75?.16*(1-age/75):.055*(1-(age-75)/205);
      weatherFxCtx.fillStyle=`rgba(225,238,255,${Math.max(0,a)})`;
      weatherFxCtx.fillRect(0,0,w,h);
    }
  }
  requestAnimationFrame(drawWeatherFx);
}

addEventListener('resize',resizeWeatherFx);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWeatherTime()});
setInterval(refreshWeatherTime,60*1000);
resizeWeatherFx();
requestAnimationFrame(drawWeatherFx);
