import React, { useState, useEffect, useMemo } from "react";

// ─── Color system ─────────────────────────────────────────────────────────────
const QUAD_BG={monotonous:[12,20,72],chaotic:[80,14,16],calm:[10,72,36],vibrant:[90,68,8]};
const QUAD_ACCENT={monotonous:[74,122,195],chaotic:[220,80,75],calm:[52,185,110],vibrant:[240,175,40]};
function lerpArr(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}
function toCSS(arr){return `rgb(${arr[0]},${arr[1]},${arr[2]})`;}
function quadColor(v,e,palette){
  const tv=(v+1)/2,te=(e+1)/2;
  return toCSS(lerpArr(lerpArr(palette.monotonous,palette.chaotic,te),lerpArr(palette.calm,palette.vibrant,te),tv));
}
function quadAccentArr(v,e){
  const tv=(v+1)/2,te=(e+1)/2;
  return lerpArr(lerpArr(QUAD_ACCENT.monotonous,QUAD_ACCENT.chaotic,te),lerpArr(QUAD_ACCENT.calm,QUAD_ACCENT.vibrant,te),tv);
}

const VALENCE_LABEL=v=>v<=-0.7?"Very unpleasant":v<=-0.3?"Unpleasant":v<=0.3?"Neutral":v<=0.7?"Pleasant":"Very pleasant";
const EVENT_LABEL=e=>e<=-0.7?"Very uneventful":e<=-0.3?"Uneventful":e<=0.3?"Neutral":e<=0.7?"Eventful":"Very eventful";
const QUAD_LABEL=(v,e)=>{
  if(v>0.25&&e>0.25)return"Vibrant";if(v>0.25&&e<-0.25)return"Calm";
  if(v<-0.25&&e>0.25)return"Chaotic";if(v<-0.25&&e<-0.25)return"Monotonous";
  if(v>0.25)return"Pleasant";if(v<-0.25)return"Annoying";
  if(e>0.25)return"Eventful";if(e<-0.25)return"Uneventful";
  return"Neutral";
};

// ─── Word pool with coordinates ───────────────────────────────────────────────
const WORD_POOL=[
  {word:"Serene",v:0.92,e:-0.65},{word:"Peaceful",v:0.88,e:-0.70},{word:"Tranquil",v:0.85,e:-0.75},
  {word:"Pleasant",v:0.88,e:0.00},{word:"Agreeable",v:0.82,e:0.05},{word:"Relaxing",v:0.80,e:-0.60},
  {word:"Restful",v:0.80,e:-0.55},{word:"Appealing",v:0.78,e:-0.05},{word:"Calm",v:0.76,e:-0.75},
  {word:"Soothing",v:0.75,e:-0.65},{word:"Inviting",v:0.75,e:0.10},{word:"Harmonious",v:0.74,e:-0.50},
  {word:"Comfortable",v:0.72,e:-0.45},{word:"Welcoming",v:0.70,e:0.05},{word:"Gentle",v:0.70,e:-0.55},
  {word:"Refreshing",v:0.70,e:0.20},{word:"Natural",v:0.66,e:-0.50},{word:"Quiet",v:0.65,e:-0.80},
  {word:"Soft",v:0.62,e:-0.60},{word:"Still",v:0.55,e:-0.75},{word:"Exciting",v:0.80,e:0.70},
  {word:"Vibrant",v:0.76,e:0.75},{word:"Lively",v:0.70,e:0.80},{word:"Stimulating",v:0.70,e:0.65},
  {word:"Full of life",v:0.66,e:0.85},{word:"Dynamic",v:0.62,e:0.75},{word:"Animated",v:0.65,e:0.70},
  {word:"Varied",v:0.52,e:0.70},{word:"Steady",v:0.15,e:-0.65},{word:"Constant",v:0.05,e:-0.75},
  {word:"Eventful",v:0.00,e:0.90},{word:"Uneventful",v:0.00,e:-0.90},{word:"Mobile",v:0.10,e:0.80},
  {word:"Active",v:0.40,e:0.85},{word:"Busy",v:0.32,e:0.90},{word:"Bustling",v:0.46,e:0.80},
  {word:"Energetic",v:0.56,e:0.85},{word:"Ever-changing",v:0.10,e:0.75},
  {word:"Uncomfortable",v:-0.70,e:0.05},{word:"Disagreeable",v:-0.74,e:-0.05},
  {word:"Irritating",v:-0.80,e:0.20},{word:"Annoying",v:-0.84,e:0.10},{word:"Unpleasant",v:-0.90,e:0.00},
  {word:"Bland",v:-0.60,e:-0.70},{word:"Tedious",v:-0.65,e:-0.65},{word:"Empty",v:-0.60,e:-0.80},
  {word:"Flat",v:-0.65,e:-0.80},{word:"Dull",v:-0.70,e:-0.70},{word:"Boring",v:-0.65,e:-0.75},
  {word:"Monotonous",v:-0.74,e:-0.75},{word:"Dreary",v:-0.74,e:-0.65},{word:"Stagnant",v:-0.70,e:-0.80},
  {word:"Sterile",v:-0.70,e:-0.55},{word:"Lifeless",v:-0.80,e:-0.70},{word:"Dead",v:-0.85,e:-0.75},
  {word:"Depressing",v:-0.85,e:-0.60},{word:"Tense",v:-0.65,e:0.60},{word:"Restless",v:-0.55,e:0.80},
  {word:"Intrusive",v:-0.70,e:0.70},{word:"Disruptive",v:-0.70,e:0.65},{word:"Hectic",v:-0.60,e:0.85},
  {word:"Loud",v:-0.50,e:0.90},{word:"Jarring",v:-0.80,e:0.55},{word:"Harsh",v:-0.74,e:0.50},
  {word:"Stressful",v:-0.76,e:0.60},{word:"Disturbing",v:-0.80,e:0.65},
  {word:"Overwhelming",v:-0.80,e:0.70},{word:"Oppressive",v:-0.85,e:0.55},
  {word:"Chaotic",v:-0.74,e:0.75},{word:"Noisy",v:-0.70,e:0.80},
];
function selectWords(v,e,n=12){
  return WORD_POOL.map(w=>({...w,dist:Math.sqrt((w.v-v)**2+(w.e-e)**2)}))
    .sort((a,b)=>a.dist-b.dist).slice(0,n).map(w=>w.word);
}

const ALL_WORDS_SORTED=[
  "Serene","Heavenly","Idyllic","Peaceful","Blissful","Paradisiac",
  "Tranquil","Harmonious","Restorative","Pastoral","Pure","Pristine",
  "Agreeable","Pleasant","Inviting","Appealing","Refreshing","Welcoming",
  "Restful","Relaxing","Soothing","Comfortable","Calming","Reassuring",
  "Calm","Gentle","Soft","Natural","Quiet","Still","Hushed","Muted",
  "Steady","Balanced","Clear","Familiar","Ordinary","Neutral","Domestic",
  "Full of atmosphere","Inspiring","Interesting","Stimulating","Exciting",
  "Full of life","Vibrant","Lively","Animated","Dynamic","Energetic",
  "Active","Bustling","Busy","Mobile","Varied","Ever-changing","Eventful",
  "Uneventful","Unchanging","Constant","Repetitive","Predictable",
  "Uncomfortable","Unpleasant","Disagreeable","Unsuitable","Unwelcoming",
  "Irritating","Intrusive","Distracting","Disturbing","Bothersome",
  "Annoying","Aggravating","Maddening",
  "Bland","Flat","Empty","Dull","Tedious","Boring","Monotonous",
  "Dreary","Lifeless","Stagnant","Sterile","Dead","Bleak","Desolate",
  "Depressing","Oppressive",
  "Restless","Tense","Unsettling","Discomforting","Hectic","Loud",
  "Disruptive","Jarring","Harsh","Abrasive","Grating",
  "Stressful","Overwhelming","Threatening","Alarming","Frantic",
  "Turbulent","Chaotic","Noisy","Deafening",
];

// ─── Sources (no emojis) ──────────────────────────────────────────────────────
const SOURCES=[
  {id:"voices",label:"Voices"},{id:"hvac",label:"HVAC / ventilation"},
  {id:"medical",label:"Medical equipment"},{id:"alarms",label:"Alarms & alerts"},
  {id:"footsteps",label:"Footsteps"},{id:"traffic",label:"Traffic"},
  {id:"nature",label:"Nature sounds"},{id:"music",label:"Music / audio"},
  {id:"water",label:"Water"},{id:"construction",label:"Construction"},
];
const INFO_OPTIONS=[
  {value:0,label:"None",sub:"Purely background noise"},
  {value:0.5,label:"Some",sub:"Occasionally useful"},
  {value:1,label:"High",sub:"Clinically relevant"},
];

// ─── Mini quadrant badge shown above descriptor/source/info pages ─────────────
function QuadrantBadge({valence,eventfulness,accent}){
  const label=QUAD_LABEL(valence,eventfulness);
  const cx=40,cy=40,r=30;
  const px=cx+valence*r;
  const py=cy-eventfulness*r;
  const TL="rgba(220,80,75,0.25)";
  const TR="rgba(240,175,40,0.25)";
  const BL="rgba(74,122,195,0.25)";
  const BR="rgba(52,185,110,0.25)";
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"20px"}}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <defs><clipPath id="qc"><circle cx={cx} cy={cy} r={r}/></clipPath></defs>
        <g clipPath="url(#qc)">
          <rect x={cx-r} y={cy-r} width={r} height={r} fill={TL}/>
          <rect x={cx}   y={cy-r} width={r} height={r} fill={TR}/>
          <rect x={cx-r} y={cy}   width={r} height={r} fill={BL}/>
          <rect x={cx}   y={cy}   width={r} height={r} fill={BR}/>
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
        <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
        <circle cx={px} cy={py} r={8} fill="rgba(255,255,255,0.08)"/>
        <circle cx={px} cy={py} r={4} fill={accent} opacity={0.9}/>
      </svg>
      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",letterSpacing:"0.06em",marginTop:"-4px"}}>
        {label}
      </div>
    </div>
  );
}

// ─── Info bubble ──────────────────────────────────────────────────────────────
function InfoBubble({text}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(x=>!x)} style={{
        width:"22px",height:"22px",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.25)",
        background:"rgba(255,255,255,0.08)",cursor:"pointer",color:"rgba(255,255,255,0.5)",
        fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"Georgia,serif",fontStyle:"italic",padding:0,flexShrink:0,
      }}>i</button>
      {open&&(
        <div style={{
          position:"absolute",top:"30px",right:0,zIndex:10,
          background:"rgba(20,20,30,0.95)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:"10px",padding:"12px 14px",width:"220px",
          fontSize:"12px",color:"rgba(255,255,255,0.65)",lineHeight:1.55,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"ss-fade 0.15s ease both",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Circumplex ───────────────────────────────────────────────────────────────
// Orientation matches ISO 12913 / Axelsson (2010) reference:
// Eventful = top, Uneventful = bottom, Pleasant = right, Unpleasant = left
// TL=Chaotic(red) TR=Vibrant(yellow) BL=Monotonous(blue) BR=Calm(green)
function Circumplex({valence,eventfulness}){
  const cx=150,cy=150,r=112;
  const px=cx+valence*r;
  const py=cy-eventfulness*r;
  const accent=toCSS(quadAccentArr(valence,eventfulness));
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg viewBox="0 0 300 300" width="220" height="220">
        <defs><clipPath id="cc"><circle cx={cx} cy={cy} r={r}/></clipPath></defs>
        <g clipPath="url(#cc)">
          <rect x={cx-r} y={cy-r} width={r} height={r} fill="rgba(220,80,75,0.09)"/>
          <rect x={cx}   y={cy-r} width={r} height={r} fill="rgba(240,175,40,0.09)"/>
          <rect x={cx-r} y={cy}   width={r} height={r} fill="rgba(74,122,195,0.09)"/>
          <rect x={cx}   y={cy}   width={r} height={r} fill="rgba(52,185,110,0.09)"/>
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
        <circle cx={cx} cy={cy} r={r*.5} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="rgba(255,255,255,0.11)" strokeWidth="1"/>
        <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="rgba(255,255,255,0.11)" strokeWidth="1"/>
        <text x={cx-r*.62} y={cy-r*.62} fill="rgba(220,80,75,0.55)"  fontSize="8" fontFamily="DM Sans,sans-serif" textAnchor="middle">Chaotic</text>
        <text x={cx+r*.62} y={cy-r*.62} fill="rgba(240,175,40,0.55)" fontSize="8" fontFamily="DM Sans,sans-serif" textAnchor="middle">Vibrant</text>
        <text x={cx-r*.62} y={cy+r*.62} fill="rgba(74,122,195,0.55)"  fontSize="8" fontFamily="DM Sans,sans-serif" textAnchor="middle">Monotonous</text>
        <text x={cx+r*.62} y={cy+r*.62} fill="rgba(52,185,110,0.55)" fontSize="8" fontFamily="DM Sans,sans-serif" textAnchor="middle">Calm</text>
        <text x={cx+r+5} y={cy+4}    fill="rgba(255,255,255,0.28)" fontSize="8.5" fontFamily="DM Sans,sans-serif">Pleasant</text>
        <text x={cx-r-5} y={cy+4}    fill="rgba(255,255,255,0.28)" fontSize="8.5" fontFamily="DM Sans,sans-serif" textAnchor="end">Unpleasant</text>
        <text x={cx}     y={cy-r-6}  fill="rgba(255,255,255,0.28)" fontSize="8.5" fontFamily="DM Sans,sans-serif" textAnchor="middle">Eventful</text>
        <text x={cx}     y={cy+r+14} fill="rgba(255,255,255,0.28)" fontSize="8.5" fontFamily="DM Sans,sans-serif" textAnchor="middle">Uneventful</text>
        <circle cx={px} cy={py} r={22} fill="rgba(255,255,255,0.04)"/>
        <circle cx={px} cy={py} r={12} fill="rgba(255,255,255,0.10)"/>
        <circle cx={px} cy={py} r={6}  fill={accent} opacity={0.95}/>
      </svg>
      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.38)",marginTop:"-2px",letterSpacing:"0.07em"}}>
        <strong style={{color:"white",fontWeight:500}}>{QUAD_LABEL(valence,eventfulness)}</strong>
      </div>
    </div>
  );
}

// ─── Descriptor step ──────────────────────────────────────────────────────────
function DescriptorStep({valence,eventfulness,descriptors,setDescriptors,freeNote,setFreeNote,accent,accentArr,onBack,onNext}){
  const[expanded,setExpanded]=useState(false);
  const cloudWords=useMemo(()=>selectWords(valence,eventfulness,12),[valence,eventfulness]);
  const toggleD=d=>setDescriptors(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d]);
  const pill=active=>({
    padding:"7px 14px",borderRadius:"100px",fontSize:"13px",cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
    background:active?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.10)",
    border:active?"1px solid transparent":"1px solid rgba(255,255,255,0.18)",
    color:active?"#0b0f1a":"rgba(255,255,255,0.85)",
  });
  const sBtn={padding:"14px 20px",borderRadius:"12px",fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:"transparent",border:"1px solid rgba(255,255,255,0.22)",color:"rgba(255,255,255,0.65)"};
  const pBtn=(bg2,op=1)=>({width:"100%",padding:"14px 20px",borderRadius:"12px",fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:bg2,border:"none",color:"white",opacity:op});

  return(
    <div style={{width:"100%",maxWidth:"380px",animation:"ss-fade 0.3s ease both"}}>
      <QuadrantBadge valence={valence} eventfulness={eventfulness} accent={accent}/>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"16px",gap:"8px"}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:400,lineHeight:1.25,margin:0}}>
          What best describes this soundscape?
        </h2>
        <InfoBubble text="By identifying the acoustic qualities you notice, you can build a more precise picture of how this environment affects you over time."/>
      </div>
      <div style={{height:"1px",background:"rgba(255,255,255,0.10)",marginBottom:"18px"}}/>

      {/* Word cloud */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"16px"}}>
        {cloudWords.map((w,i)=>(
          <button key={w} onClick={()=>toggleD(w)}
            style={{...pill(descriptors.includes(w)),animation:`word-in 0.2s ease ${i*0.03}s both`}}>
            {w}
          </button>
        ))}
      </div>

      {/* Show more — subtle, Apple-style */}
      <button onClick={()=>setExpanded(x=>!x)} style={{
        background:"none",border:"none",cursor:"pointer",padding:"4px 0 4px 1px",
        color:"rgba(255,255,255,0.35)",fontSize:"13px",fontFamily:"'DM Sans',sans-serif",
        display:"flex",alignItems:"center",gap:"4px",
        marginBottom:expanded?"0":"24px",
      }}>
        {expanded?"Show less":"Show more"} <span style={{fontSize:"11px"}}>{expanded?"":"›"}</span>
      </button>

      {/* Scrollable full list */}
      {expanded&&(
        <div style={{marginBottom:"24px",marginTop:"10px",animation:"ss-fade 0.18s ease both"}}>
          <div className="ss-scroll" style={{
            maxHeight:"240px",overflowY:"auto",
            border:"1px solid rgba(255,255,255,0.10)",borderRadius:"12px",
          }}>
            {ALL_WORDS_SORTED.map((word,i)=>{
              const checked=descriptors.includes(word);
              const inCloud=cloudWords.includes(word);
              return(
                <div key={word} onClick={()=>toggleD(word)} style={{
                  display:"flex",alignItems:"center",gap:"12px",padding:"10px 16px",cursor:"pointer",
                  borderBottom:i<ALL_WORDS_SORTED.length-1?"1px solid rgba(255,255,255,0.05)":"none",
                  background:checked?"rgba(255,255,255,0.06)":"transparent",transition:"background 0.12s",
                }}>
                  <div style={{
                    width:"17px",height:"17px",borderRadius:"5px",flexShrink:0,
                    border:checked?`2px solid ${accent}`:"2px solid rgba(255,255,255,0.22)",
                    background:checked?accent:"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
                  }}>
                    {checked&&<span style={{color:"#0b0f1a",fontSize:"10px",fontWeight:700,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{
                    fontSize:"14px",transition:"color 0.15s",
                    color:checked?"white":inCloud?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.45)",
                    fontWeight:inCloud||checked?400:300,
                  }}>{word}</span>
                  {inCloud&&!checked&&<div style={{marginLeft:"auto",width:"5px",height:"5px",borderRadius:"50%",background:accent,opacity:0.55,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:"10px"}}>
        <button onClick={onBack} style={{...sBtn,flex:"0 0 72px"}}>←</button>
        <button onClick={onNext} style={{...pBtn("rgba(255,255,255,0.15)"),flex:1,border:"1px solid rgba(255,255,255,0.2)"}}>
          {descriptors.length>0?`${descriptors.length} selected · Next →`:"Skip →"}
        </button>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function SoundscapeApp(){
  const[step,setStep]=useState(0);
  const[assessType,setAssessType]=useState(null);
  const[valence,setValence]=useState(0);
  const[eventfulness,setEventfulness]=useState(0);
  const[descriptors,setDescriptors]=useState([]);
  const[freeNote,setFreeNote]=useState('');
  const[sources,setSources]=useState([]);
  const[infoValue,setInfoValue]=useState(null);
  const[saved,setSaved]=useState(false);
  const[entryCount,setEntryCount]=useState(0);

  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    document.head.appendChild(link);
    try{setEntryCount(JSON.parse(localStorage.getItem("ss_data")||"[]").length);}catch{}
  },[]);

  const toggleS=s=>setSources(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const saveEntry=()=>{
    const entry={id:Date.now(),timestamp:new Date().toISOString(),assessment_type:assessType,valence:+valence.toFixed(2),eventfulness:+eventfulness.toFixed(2),descriptors,sources,information_value:infoValue,quadrant:QUAD_LABEL(valence,eventfulness),free_note:freeNote};
    try{const ex=JSON.parse(localStorage.getItem("ss_data")||"[]");ex.push(entry);localStorage.setItem("ss_data",JSON.stringify(ex));setSaved(true);setEntryCount(ex.length);}catch{}
  };
  const reset=()=>{setStep(0);setAssessType(null);setValence(0);setEventfulness(0);setDescriptors([]);setFreeNote('');setSources([]);setInfoValue(null);setSaved(false);};

  // Background: locked to slider outcome from step 3 onwards
  const bg = step < 2 ? "#0b0f1a"
    : step === 2 ? quadColor(valence, 0, QUAD_BG)
    : quadColor(valence, eventfulness, QUAD_BG);

  const accentArr=step>=2?quadAccentArr(valence,step>=3?eventfulness:0):[180,180,180];
  const accent=toCSS(accentArr);

  const TOTAL=5;
  const progress=step<=1?0:Math.min(((step-2)/TOTAL)*100,100);
  const stripV=`linear-gradient(to right,${toCSS(QUAD_ACCENT.chaotic)},${toCSS(QUAD_ACCENT.monotonous)},${toCSS(QUAD_ACCENT.calm)},${toCSS(QUAD_ACCENT.vibrant)})`;
  const stripE=`linear-gradient(to right,${toCSS(QUAD_ACCENT.monotonous)},${toCSS(QUAD_ACCENT.calm)},${toCSS(QUAD_ACCENT.chaotic)},${toCSS(QUAD_ACCENT.vibrant)})`;

  const shellBg = step===0 ? "#f4f2ed" : bg;
  const shellColor = step===0 ? "#1a1a18" : "#eae8e2";
  const shell={minHeight:"100vh",background:shellBg,transition:"background 0.6s ease",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px 52px",fontFamily:"'DM Sans',sans-serif",color:shellColor,boxSizing:"border-box"};
  const card={width:"100%",maxWidth:"380px",animation:"ss-fade 0.3s ease both"};
  const lbl=t=><div style={{marginBottom:"10px",fontSize:"10px",letterSpacing:"0.14em",color:"rgba(255,255,255,0.33)",textTransform:"uppercase"}}>{t}</div>;
  const pBtn=(bg2,op=1)=>({width:"100%",padding:"14px 20px",borderRadius:"12px",fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:bg2,border:"none",color:"white",opacity:op,transition:"opacity 0.2s"});
  const sBtn={padding:"14px 20px",borderRadius:"12px",fontSize:"14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",background:"transparent",border:"1px solid rgba(255,255,255,0.22)",color:"rgba(255,255,255,0.65)"};
  const pill=active=>({padding:"7px 14px",borderRadius:"100px",fontSize:"13px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",background:active?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.10)",border:active?"1px solid transparent":"1px solid rgba(255,255,255,0.18)",color:active?"#0b0f1a":"rgba(255,255,255,0.85)"});

  return(
    <div style={shell}>
      <style>{`
        @keyframes ss-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes word-in{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:rgba(255,255,255,0.15)}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;border-radius:50%;background:white;box-shadow:0 2px 14px rgba(0,0,0,0.55);cursor:grab;transition:transform 0.1s}
        input[type=range]:active::-webkit-slider-thumb{cursor:grabbing;transform:scale(1.12)}
        .ss-scroll::-webkit-scrollbar{width:3px}
        .ss-scroll::-webkit-scrollbar-track{background:transparent}
        .ss-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
      `}</style>

      {step>=2&&step<7&&(
        <div style={{width:"100%",maxWidth:"380px",marginBottom:"28px"}}>
          <div style={{height:"2px",background:"rgba(255,255,255,0.10)",borderRadius:"1px"}}>
            <div style={{height:"100%",width:`${progress}%`,background:accent,borderRadius:"1px",transition:"width 0.4s ease,background 0.5s ease"}}/>
          </div>
          <div style={{marginTop:"6px",fontSize:"10px",color:"rgba(255,255,255,0.30)",letterSpacing:"0.1em",textTransform:"uppercase"}}>
            Step {step-1} of {TOTAL} · {assessType==="moment"?"Momentary":"Space"}
          </div>
        </div>
      )}

      {/* ── Welcome ── */}
      {step===0&&(
        <div style={{...card,maxWidth:"360px"}} key="s0">
          {/* Decorative wave mark */}
          <div style={{marginBottom:"36px"}}>
            <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
              <path d="M2 24 C8 8, 16 8, 24 16 S40 24, 46 8" stroke="#5a8a6a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M2 30 C8 14, 16 14, 24 22 S40 30, 46 14" stroke="#5a8a6a" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
          </div>
          <div style={{fontSize:"10px",letterSpacing:"0.16em",color:"#8a9a8a",textTransform:"uppercase",marginBottom:"14px",fontWeight:500}}>Soundscape Assessment</div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"46px",fontWeight:400,lineHeight:1.08,marginBottom:"20px",color:"#1a1a18"}}>
            How does<br/><em>this space</em><br/>sound?
          </h1>
          <p style={{color:"#6b7268",fontSize:"14px",lineHeight:1.75,marginBottom:"48px",maxWidth:"280px"}}>
            A perceptual assessment of the acoustic environment. Takes about 60 seconds.
          </p>
          {entryCount>0&&(
            <div style={{marginBottom:"20px",fontSize:"12px",color:"#9aaa9a",letterSpacing:"0.04em"}}>
              {entryCount} {entryCount===1?"entry":"entries"} saved
            </div>
          )}
          <button onClick={()=>setStep(1)} style={{
            width:"100%",padding:"16px 20px",borderRadius:"100px",fontSize:"14px",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.04em",
            background:"#2d4a38",border:"none",color:"white",transition:"opacity 0.2s",
            fontWeight:500,
          }}>Begin →</button>
        </div>
      )}

      {/* ── Type ── */}
      {step===1&&(
        <div style={card} key="s1">
          <div style={{fontSize:"10px",letterSpacing:"0.14em",color:"rgba(255,255,255,0.28)",textTransform:"uppercase",marginBottom:"10px"}}>Assessment type</div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"34px",fontWeight:400,lineHeight:1.15,marginBottom:"8px"}}>What are you<br/>assessing?</h1>
          <p style={{color:"rgba(255,255,255,0.38)",fontSize:"13px",lineHeight:1.65,marginBottom:"28px"}}>Choose what this assessment captures.</p>
          {[{id:"moment",icon:"◎",title:"Momentary",sub:"How this space sounds right now"},{id:"space",icon:"⊡",title:"Space",sub:"How this space generally sounds"}].map(t=>(
            <div key={t.id} onClick={()=>setAssessType(t.id)} style={{background:assessType===t.id?"rgba(255,255,255,0.11)":"rgba(255,255,255,0.04)",border:assessType===t.id?`1px solid ${accent}`:"1px solid rgba(255,255,255,0.1)",borderRadius:"14px",padding:"18px 20px",marginBottom:"12px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"16px"}}>
              <div style={{fontSize:"22px",opacity:0.65}}>{t.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"15px",fontWeight:500,marginBottom:"2px"}}>{t.title}</div>
                <div style={{fontSize:"12px",color:"rgba(255,255,255,0.42)"}}>{t.sub}</div>
              </div>
              {assessType===t.id&&<div style={{color:accent,fontSize:"16px"}}>✓</div>}
            </div>
          ))}
          <div style={{marginTop:"24px",display:"flex",gap:"10px"}}>
            <button onClick={()=>setStep(0)} style={{...sBtn,flex:"0 0 72px"}}>←</button>
            <button onClick={()=>{if(assessType)setStep(2);}} style={{...pBtn(assessType?`rgba(${accentArr.join(",")},0.3)`:"rgba(255,255,255,0.05)",assessType?1:0.4),flex:1}}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Valence ── */}
      {step===2&&(
        <div style={card} key="s2">
          {lbl("Valence · Pleasantness")}
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"30px",fontWeight:400,lineHeight:1.2,marginBottom:"10px"}}>How does this soundscape feel?</h2>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"38px",fontWeight:400,color:accent,transition:"color 0.45s",marginBottom:"4px",lineHeight:1.1}}>{VALENCE_LABEL(valence)}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.30)",marginBottom:"36px"}}>{valence>0?"+":""}{(valence*100).toFixed(0)} / 100</div>
          <input type="range" min="-100" max="100" value={Math.round(valence*100)} onChange={e=>setValence(e.target.value/100)} style={{marginBottom:"10px"}}/>
          <div style={{height:"3px",borderRadius:"2px",background:stripV,opacity:0.45,marginBottom:"8px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"rgba(255,255,255,0.30)",marginBottom:"44px",letterSpacing:"0.04em"}}><span>Very unpleasant</span><span>Very pleasant</span></div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setStep(1)} style={{...sBtn,flex:"0 0 72px"}}>←</button>
            <button onClick={()=>setStep(3)} style={{...pBtn(accent),flex:1}}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Eventfulness ── */}
      {step===3&&(
        <div style={card} key="s3">
          {lbl("Eventfulness · Activity")}
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"30px",fontWeight:400,lineHeight:1.2,marginBottom:"10px"}}>How active is this soundscape?</h2>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"38px",fontWeight:400,color:accent,transition:"color 0.45s",marginBottom:"4px",lineHeight:1.1}}>{EVENT_LABEL(eventfulness)}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.30)",marginBottom:"36px"}}>{eventfulness>0?"+":""}{(eventfulness*100).toFixed(0)} / 100</div>
          <input type="range" min="-100" max="100" value={Math.round(eventfulness*100)} onChange={e=>setEventfulness(e.target.value/100)} style={{marginBottom:"10px"}}/>
          <div style={{height:"3px",borderRadius:"2px",background:stripE,opacity:0.45,marginBottom:"8px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"rgba(255,255,255,0.30)",marginBottom:"24px",letterSpacing:"0.04em"}}><span>Very uneventful</span><span>Very eventful</span></div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"28px"}}>
            <Circumplex valence={valence} eventfulness={eventfulness}/>
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setStep(2)} style={{...sBtn,flex:"0 0 72px"}}>←</button>
            <button onClick={()=>setStep(4)} style={{...pBtn(accent),flex:1}}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Descriptors ── */}
      {step===4&&(
        <DescriptorStep key="s4"
          valence={valence} eventfulness={eventfulness}
          descriptors={descriptors} setDescriptors={setDescriptors}
          freeNote={freeNote} setFreeNote={setFreeNote}
          accent={accent} accentArr={accentArr}
          onBack={()=>setStep(3)} onNext={()=>setStep(5)}/>
      )}

      {/* ── Sources ── */}
      {step===5&&(
        <div style={card} key="s5">
          <QuadrantBadge valence={valence} eventfulness={eventfulness} accent={accent}/>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"6px",gap:"8px"}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:400,lineHeight:1.25,margin:0}}>
              What sounds stand out?
            </h2>
            <InfoBubble text="Which sounds are most prominent here? Linking sources to your rating helps reveal what's driving the experience."/>
          </div>
          {descriptors.length>0&&(
            <div style={{fontSize:"13px",color:"rgba(255,255,255,0.5)",marginBottom:"12px",lineHeight:1.4}}>
              {descriptors.join(", ")}
            </div>
          )}
          <div style={{height:"1px",background:"rgba(255,255,255,0.10)",marginBottom:"18px"}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"36px"}}>
            {SOURCES.map((s,i)=>(
              <button key={s.id} onClick={()=>toggleS(s.id)}
                style={{...pill(sources.includes(s.id)),animation:`word-in 0.15s ease ${i*0.03}s both`}}>
                {s.label}
              </button>
            ))}
          </div>
          {sources.length>0&&(
            <div style={{animation:"ss-fade 0.2s ease both",marginBottom:"14px"}}>
              <div style={{
                display:"flex",alignItems:"center",gap:"10px",
                background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:"100px",padding:"10px 16px",
              }}>
                <input
                  type="text"
                  value={freeNote}
                  onChange={e=>setFreeNote(e.target.value)}
                  placeholder="Add context…"
                  style={{
                    background:"transparent",border:"none",outline:"none",
                    color:"white",fontSize:"14px",fontFamily:"'DM Sans',sans-serif",
                    flex:1,minWidth:0,
                  }}
                />
                {freeNote&&(
                  <button onClick={()=>setFreeNote("")} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",fontSize:"18px",padding:"0",lineHeight:1}}>×</button>
                )}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setStep(4)} style={{...sBtn,flex:"0 0 72px"}}>←</button>
            <button onClick={()=>setStep(6)} style={{...pBtn("rgba(255,255,255,0.15)"),flex:1,border:"1px solid rgba(255,255,255,0.2)"}}>
              {sources.length>0?`${sources.length} selected · Next →`:"Skip →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Information value ── */}
      {step===6&&(
        <div style={card} key="s6">
          <QuadrantBadge valence={valence} eventfulness={eventfulness} accent={accent}/>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"16px",gap:"8px"}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:400,lineHeight:1.25,margin:0}}>
              Do these sounds carry useful information?
            </h2>
            <InfoBubble text="Some environments contain sounds that carry functional meaning — alarms, signals, voices — not just acoustic background. Consider whether the sounds you hear are purely atmospheric or also communicative."/>
          </div>
          <div style={{height:"1px",background:"rgba(255,255,255,0.10)",marginBottom:"18px"}}/>
          <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"36px"}}>
            {INFO_OPTIONS.map(opt=>(
              <div key={opt.value} onClick={()=>setInfoValue(opt.value)} style={{background:infoValue===opt.value?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.06)",border:infoValue===opt.value?`1px solid ${accent}`:"1px solid rgba(255,255,255,0.12)",borderRadius:"12px",padding:"16px 18px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{width:"10px",height:"10px",borderRadius:"50%",flexShrink:0,transition:"background 0.2s",background:infoValue===opt.value?accent:"rgba(255,255,255,0.22)"}}/>
                <div>
                  <div style={{fontSize:"15px",fontWeight:500,marginBottom:"2px"}}>{opt.label}</div>
                  <div style={{fontSize:"12px",color:"rgba(255,255,255,0.45)"}}>{opt.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>setStep(5)} style={{...sBtn,flex:"0 0 72px"}}>←</button>
            <button onClick={()=>{if(infoValue!==null)setStep(7);}} style={{...pBtn(accent,infoValue!==null?1:0.4),flex:1}}>See result →</button>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {step===7&&(
        <div style={{...card,maxWidth:"420px"}} key="s7">
          {lbl("Result")}
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:400,marginBottom:"20px"}}>Your assessment</h2>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"18px"}}>
            <Circumplex valence={valence} eventfulness={eventfulness}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
            {[{title:"Valence",value:VALENCE_LABEL(valence),score:valence},{title:"Eventfulness",value:EVENT_LABEL(eventfulness),score:eventfulness}].map(({title,value,score})=>(
              <div key={title} style={{background:"rgba(255,255,255,0.07)",borderRadius:"10px",padding:"13px"}}>
                <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.30)",marginBottom:"4px"}}>{title}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",lineHeight:1.2}}>{value}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",marginTop:"3px"}}>{score>0?"+":""}{(score*100).toFixed(0)}/100</div>
              </div>
            ))}
          </div>
          {infoValue!==null&&(
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:"10px",padding:"12px 14px",marginBottom:"10px",display:"flex",alignItems:"center"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.30)"}}>Information value</div>
              <div style={{marginLeft:"auto",fontSize:"13px",fontWeight:500,color:accent}}>{INFO_OPTIONS.find(o=>o.value===infoValue)?.label}</div>
            </div>
          )}
          {descriptors.length>0&&(
            <div style={{marginBottom:"10px"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.30)",marginBottom:"7px"}}>Descriptors</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {descriptors.map(d=><span key={d} style={{padding:"4px 11px",background:"rgba(255,255,255,0.10)",borderRadius:"100px",fontSize:"12px"}}>{d}</span>)}
              </div>
            </div>
          )}
          {freeNote&&(
            <div style={{marginBottom:"10px"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.30)",marginBottom:"7px"}}>Note</div>
              <div style={{fontSize:"13px",color:"rgba(255,255,255,0.7)",fontStyle:"italic",lineHeight:1.5}}>"{freeNote}"</div>
            </div>
          )}
          {sources.length>0&&(
            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.30)",marginBottom:"7px"}}>Sources</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {sources.map(sid=>{const s=SOURCES.find(x=>x.id===sid);return <span key={sid} style={{padding:"4px 11px",background:"rgba(255,255,255,0.10)",borderRadius:"100px",fontSize:"12px"}}>{s.label}</span>;})}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:"10px"}}>
            {!saved
              ?<button onClick={saveEntry} style={{...pBtn("rgba(52,185,110,0.7)"),flex:2}}>Save entry</button>
              :<div style={{flex:2,padding:"14px",background:"rgba(52,185,110,0.1)",border:"1px solid rgba(52,185,110,0.3)",borderRadius:"12px",color:"#34d399",fontSize:"13px",textAlign:"center"}}>✓ Saved · {entryCount} {entryCount===1?"entry":"entries"}</div>
            }
            <button onClick={reset} style={{...sBtn,flex:1}}>New</button>
          </div>
        </div>
      )}
    </div>
  );
}