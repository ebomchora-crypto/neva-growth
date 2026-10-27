import{a}from"./chunks/chunk-JMSEHRFU.js";import{c as b,i as D,j as g,l as R,m as A}from"./chunks/chunk-6IYH4WPJ.js";var s=b(D(),1);var t=b(g(),1),G=[{label:"home",href:"#",ariaLabel:"Home",rotation:-8,hoverStyles:{bgColor:"#3b82f6",textColor:"#ffffff"}},{label:"about",href:"#",ariaLabel:"About",rotation:8,hoverStyles:{bgColor:"#10b981",textColor:"#ffffff"}},{label:"projects",href:"#",ariaLabel:"Documentation",rotation:8,hoverStyles:{bgColor:"#f59e0b",textColor:"#ffffff"}},{label:"blog",href:"#",ariaLabel:"Blog",rotation:8,hoverStyles:{bgColor:"#ef4444",textColor:"#ffffff"}},{label:"contact",href:"#",ariaLabel:"Contact",rotation:-8,hoverStyles:{bgColor:"#8b5cf6",textColor:"#ffffff"}}];function C({logo:n,onMenuClick:r,className:v,style:B,menuAriaLabel:E="Toggle menu",menuBg:w="#fff",menuContentColor:m="#111",useFixedPosition:N=!1,items:j,animationEase:L="back.out(1.5)",animationDuration:p=.5,staggerDelay:_=.12}){let[i,I]=(0,s.useState)(!1),[y,T]=(0,s.useState)(!1),z=(0,s.useRef)(null),k=(0,s.useRef)([]),M=(0,s.useRef)([]),S=j?.length?j:G,O=["bubble-menu",N?"fixed":"absolute","left-0 right-0 top-8","flex items-center justify-between","gap-4 px-8","pointer-events-none","z-[1001]",v].filter(Boolean).join(" "),H=()=>{let e=!i;e&&T(!0),I(e),r?.(e)};return(0,s.useEffect)(()=>{let e=z.current,o=k.current.filter(Boolean),l=M.current.filter(Boolean);!e||!o.length||(i?(a.set(e,{display:"flex"}),a.killTweensOf([...o,...l]),a.set(o,{scale:0,transformOrigin:"50% 50%"}),a.set(l,{y:24,autoAlpha:0}),o.forEach((u,f)=>{let d=f*_+a.utils.random(-.05,.05),h=a.timeline({delay:d});h.to(u,{scale:1,duration:p,ease:L}),l[f]&&h.to(l[f],{y:0,autoAlpha:1,duration:p,ease:"power3.out"},"-="+p*.9)})):y&&(a.killTweensOf([...o,...l]),a.to(l,{y:24,autoAlpha:0,duration:.2,ease:"power3.in"}),a.to(o,{scale:0,duration:.2,ease:"power3.in",onComplete:()=>{a.set(e,{display:"none"}),T(!1)}})))},[i,y,L,p,_]),(0,s.useEffect)(()=>{let e=()=>{if(i){let o=k.current.filter(Boolean),l=window.innerWidth>=900;o.forEach((u,f)=>{let d=S[f];if(u&&d){let h=l?d.rotation??0:0;a.set(u,{rotation:h})}})}};return window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[i,S]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("style",{children:`
        .bubble-menu .menu-line {
          transition: transform 0.3s ease, opacity 0.3s ease;
          transform-origin: center;
        }
        .bubble-menu-items .pill-list .pill-col:nth-child(4):nth-last-child(2) {
          margin-left: calc(100% / 6);
        }
        .bubble-menu-items .pill-list .pill-col:nth-child(4):last-child {
          margin-left: calc(100% / 3);
        }
        @media (min-width: 900px) {
          .bubble-menu-items .pill-link {
            transform: rotate(var(--item-rot));
          }
          .bubble-menu-items .pill-link:hover {
            transform: rotate(var(--item-rot)) scale(1.06);
            background: var(--hover-bg) !important;
            color: var(--hover-color) !important;
          }
          .bubble-menu-items .pill-link:active {
            transform: rotate(var(--item-rot)) scale(.94);
          }
        }
        @media (max-width: 899px) {
          .bubble-menu-items {
            padding-top: 120px;
            align-items: flex-start;
          }
          .bubble-menu-items .pill-list {
            row-gap: 16px;
          }
          .bubble-menu-items .pill-list .pill-col {
            flex: 0 0 100% !important;
            margin-left: 0 !important;
            overflow: visible;
          }
          .bubble-menu-items .pill-link {
            font-size: clamp(1.2rem, 3vw, 4rem);
            padding: clamp(1rem, 2vw, 2rem) 0;
            min-height: 80px !important;
          }
          .bubble-menu-items .pill-link:hover {
            transform: scale(1.06);
            background: var(--hover-bg);
            color: var(--hover-color);
          }
          .bubble-menu-items .pill-link:active {
            transform: scale(.94);
          }
        }
      `}),(0,t.jsxs)("nav",{className:O,style:B,"aria-label":"Main navigation",children:[(0,t.jsx)("div",{className:["bubble logo-bubble","inline-flex items-center justify-center","rounded-full","bg-white","shadow-[0_4px_16px_rgba(0,0,0,0.12)]","pointer-events-auto","h-12 md:h-14","px-4 md:px-8","gap-2","will-change-transform"].join(" "),"aria-label":"Logo",style:{background:w,minHeight:"48px",borderRadius:"9999px"},children:(0,t.jsx)("span",{className:["logo-content","inline-flex items-center justify-center","w-[120px] h-full"].join(" "),style:{"--logo-max-height":"60%","--logo-max-width":"100%"},children:typeof n=="string"?(0,t.jsx)("img",{src:n,alt:"Logo",className:"bubble-logo max-h-[60%] max-w-full object-contain block"}):n})}),(0,t.jsxs)("button",{type:"button",className:["bubble toggle-bubble menu-btn",i?"open":"","inline-flex flex-col items-center justify-center","rounded-full","bg-white","shadow-[0_4px_16px_rgba(0,0,0,0.12)]","pointer-events-auto","w-12 h-12 md:w-14 md:h-14","border-0 cursor-pointer p-0","will-change-transform"].join(" "),onClick:H,"aria-label":E,"aria-pressed":i,style:{background:w},children:[(0,t.jsx)("span",{className:"menu-line block mx-auto rounded-[2px]",style:{width:26,height:2,background:m,transform:i?"translateY(4px) rotate(45deg)":"none"}}),(0,t.jsx)("span",{className:"menu-line short block mx-auto rounded-[2px]",style:{marginTop:"6px",width:26,height:2,background:m,transform:i?"translateY(-4px) rotate(-45deg)":"none"}})]})]}),y&&(0,t.jsx)("div",{ref:z,className:["bubble-menu-items",N?"fixed":"absolute","inset-0","flex items-center justify-center","pointer-events-none","z-[1000]"].join(" "),"aria-hidden":!i,children:(0,t.jsx)("ul",{className:["pill-list","list-none m-0 px-6","w-full max-w-[1600px] mx-auto","flex flex-wrap","gap-x-0 gap-y-1","pointer-events-auto"].join(" "),role:"menu","aria-label":"Menu links",children:S.map((e,o)=>(0,t.jsx)("li",{role:"none",className:["pill-col","flex justify-center items-stretch","[flex:0_0_calc(100%/3)]","box-border"].join(" "),children:(0,t.jsx)("a",{role:"menuitem",href:e.href,"aria-label":e.ariaLabel||e.label,className:["pill-link","w-full","rounded-[999px]","no-underline","bg-white","text-inherit","shadow-[0_4px_14px_rgba(0,0,0,0.10)]","flex items-center justify-center","relative","transition-[background,color] duration-300 ease-in-out","box-border","whitespace-nowrap overflow-hidden"].join(" "),style:{"--item-rot":`${e.rotation??0}deg`,"--pill-bg":w,"--pill-color":m,"--hover-bg":e.hoverStyles?.bgColor||"#f3f4f6","--hover-color":e.hoverStyles?.textColor||m,background:"var(--pill-bg)",color:"var(--pill-color)",minHeight:"var(--pill-min-h, 160px)",padding:"clamp(1.5rem, 3vw, 8rem) 0",fontSize:"clamp(1.5rem, 4vw, 4rem)",fontWeight:400,lineHeight:0,willChange:"transform",height:10},ref:l=>{l&&(k.current[o]=l)},children:(0,t.jsx)("span",{className:"pill-label inline-block",style:{willChange:"transform, opacity",height:"1.2em",lineHeight:1.2},ref:l=>{l&&(M.current[o]=l)},children:e.label})})},o))})})]})}var x=b(g(),1),W=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],c=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],J=W.map((n,r)=>({id:r+1,image:n,src:n,img:n,url:n,title:c[r],text:c[r],label:c[r],alt:c[r],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][r],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function Y({big:n}){return(0,x.jsx)(A,{big:n,dark:!0,center:!0,zoom:1,drive:!1,children:(0,x.jsx)(C,{logo:(0,x.jsx)("b",{className:"text-lg",children:"Neva"}),items:c.slice(0,4).map((r,v)=>({label:r,href:"#",ariaLabel:r,rotation:[-6,4,-3,6][v],hoverStyles:{bgColor:"#48c8f5",textColor:"#091629"}}))})})}var K=R(Y);export{K as default};
