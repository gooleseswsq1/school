'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/shared/Footer';

/* ─── Features ───────────────────────────────────────────── */
const FEATURES = [
  {
    id: 0, label: 'Bài giảng', sub: 'theo lớp & trường', accent: '#60C8FF',
    title: 'Bài giảng theo lớp & trường',
    desc: 'Học sinh xem bài học với video, tài liệu, quiz nhúng trực tiếp. Bình luận và trao đổi với giáo viên ngay trong từng bài. Nội dung gắn đúng lớp — học sinh chỉ thấy bài học phù hợp.',
    tags: ['Video tương tác', 'Bình luận & trao đổi', 'Quiz nhúng', 'Phân theo lớp'],
  },
  {
    id: 1, label: 'Tạo & chấm bài', sub: 'tự động hoàn toàn', accent: '#7EFFB2',
    title: 'Tạo đề & chấm điểm tự động',
    desc: 'Upload file Word → hệ thống tự đọc câu hỏi, trộn nhiều mã đề ngẫu nhiên. Học sinh làm bài ngay trên web, chấm điểm tức thì — tiết kiệm hoàn toàn thời gian chấm trên lớp.',
    tags: ['Parse Word / PDF', 'Trộn mã đề', 'Chấm tự động', 'Kết quả tức thì'],
  },
  {
    id: 2, label: 'Canvas', sub: 'thiết kế bài giảng', accent: '#FFB86C',
    title: 'Canvas — soạn bài giảng tương tác',
    desc: 'Thiết kế slide bài giảng trực tiếp trong Penta School. Nhúng quiz, hình ảnh, công thức LaTeX vào từng slide. Học sinh tương tác ngay mà không cần rời trang.',
    tags: ['Slide tương tác', 'Quiz trong slide', 'Công thức LaTeX', 'Export PDF'],
  },
  {
    id: 3, label: 'Ngân hàng đề', sub: 'kho câu hỏi khổng lồ', accent: '#C678FF',
    title: 'Ngân hàng đề thi thông minh',
    desc: 'Câu hỏi phân loại theo môn, chương, 5 cấp độ khó. Chọn cấu trúc đề — dễ/trung/khó — hệ thống tự tạo trong vài giây. Chia sẻ ngân hàng trong cùng trường.',
    tags: ['5 cấp độ khó', 'Tạo đề 1-click', 'Tái sử dụng', 'Chia sẻ nội bộ'],
  },
  {
    id: 4, label: 'AI hỗ trợ', sub: 'thao tác thông minh', accent: '#FF7EB6',
    title: 'AI hỗ trợ giáo viên trong web',
    desc: 'Nhập lệnh: "Tạo 10 câu Vật lý chương 3 trung bình" → AI sinh ngay. Tóm tắt bài giảng, gợi ý đề thi, hướng dẫn tính năng — tất cả ngay trong giao diện web.',
    tags: ['Sinh câu hỏi AI', 'Tóm tắt bài', 'Hướng dẫn trong web', 'Chat AI'],
  },
];

/* ─── Pentagon geometry ──────────────────────────────────── */
const CX = 210, CY = 210, R = 165;
const toRad = (d: number) => d * Math.PI / 180;

const VERTS = Array.from({ length: 5 }, (_, i) => {
  const a = toRad(i * 72 - 90);
  return [+(CX + R * Math.cos(a)).toFixed(1), +(CY + R * Math.sin(a)).toFixed(1)] as [number, number];
});

function segPts(i: number) {
  const [ax, ay] = VERTS[i];
  const [bx, by] = VERTS[(i + 1) % 5];
  return `${CX},${CY} ${ax},${ay} ${bx},${by}`;
}

function labelXY(i: number): [number, number] {
  const a = toRad(i * 72 - 90 + 36);
  const r = R * 0.60;
  return [+(CX + r * Math.cos(a)).toFixed(1), +(CY + r * Math.sin(a)).toFixed(1)];
}

const TEXT_ROT = [36, -72, 0, 72, -36];
const FILLS    = ['#0C2D52','#0E3460','#0A2745','#11376C','#0B2F56'];
const FILLS_HI = ['#1B4E90','#1E5CA2','#164174','#1F5BAD','#17456E'];

/* ─── Icons ─────────────────────────────────────────────── */
function Icon({ id, color }: { id: number; color: string }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.4,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 0: return (
      <g {...s}>
        <path d="M0,-7 L-7,-4.5 L-7,6 L0,8 L7,6 L7,-4.5 Z"/>
        <line x1="0" y1="-7" x2="0" y2="8"/>
        <line x1="-5" y1="0" x2="-1.5" y2="0"/>
        <line x1="-5" y1="3" x2="-1.5" y2="3"/>
        <line x1="1.5" y1="0" x2="5" y2="0"/>
        <line x1="1.5" y1="3" x2="5" y2="3"/>
      </g>
    );
    case 1: return (
      <g {...s}>
        <path d="M-5.5,-7 L3,-7 L6,-4 L6,7 L-5.5,7 Z"/>
        <path d="M3,-7 L3,-4 L6,-4"/>
        <path d="M-3,1.5 L-0.5,4 L4,-2.5" strokeWidth={1.7}/>
      </g>
    );
    case 2: return (
      <g {...s}>
        <path d="M4,-6.5 L6.5,-4 L-4,6.5 L-6.5,4 Z"/>
        <path d="M-6.5,4 L-8,8 L-4,6.5"/>
        <line x1="2" y1="-4.5" x2="4.5" y2="-2"/>
      </g>
    );
    case 3: return (
      <g {...s}>
        <path d="M-7,-5.5 L0,-9 L7,-5.5 L0,-2 Z"/>
        <path d="M-7,-0.5 L0,-4 L7,-0.5 L0,3 Z"/>
        <path d="M-7,4.5 L0,1 L7,4.5 L0,8 Z"/>
      </g>
    );
    case 4: {
      const pts = Array.from({ length: 5 }, (_, j) => {
        const a = toRad(j * 72 - 90);
        return `${(7.5 * Math.cos(a)).toFixed(1)},${(7.5 * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return (
        <g {...s}>
          <polygon points={pts} strokeWidth={1.5}/>
          <circle cx="0" cy="0" r="1.4" fill={color} stroke="none"/>
        </g>
      );
    }
    default: return null;
  }
}

/* ─── Component ───────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();

  // -1 = nothing; 0..4 = segment
  const [active, setActive]   = useState<number>(-1);
  const [isAuto, setIsAuto]   = useState(true);   // auto-cycle mode

  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleIndex  = useRef(0);

  /* ── Auto-cycle logic ── */
  const startCycle = useCallback(() => {
    if (cycleTimer.current) clearInterval(cycleTimer.current);
    // start from next segment
    cycleIndex.current = (cycleIndex.current + 1) % 5;
    setActive(cycleIndex.current);
    setIsAuto(true);

    cycleTimer.current = setInterval(() => {
      cycleIndex.current = (cycleIndex.current + 1) % 5;
      setActive(cycleIndex.current);
    }, 3000);
  }, []);

  const stopCycle = useCallback(() => {
    if (cycleTimer.current) { clearInterval(cycleTimer.current); cycleTimer.current = null; }
    setIsAuto(false);
  }, []);

  // Reset idle timer on user interaction
  const resetIdle = useCallback(() => {
    stopCycle();
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      startCycle();
    }, 3000);
  }, [stopCycle, startCycle]);

  // Boot: start cycle after 3s
  useEffect(() => {
    idleTimer.current = setTimeout(() => startCycle(), 3000);
    return () => {
      if (idleTimer.current)  clearTimeout(idleTimer.current);
      if (cycleTimer.current) clearInterval(cycleTimer.current);
    };
  }, [startCycle]);

  /* ── User interaction handlers ── */
  const handleHoverEnter = (i: number) => {
    resetIdle();
    setActive(i);
    cycleIndex.current = i;
  };
  const handleHoverLeave = () => {
    resetIdle();
    // keep active, idle timer will restart cycle
  };
  const handleClick = (i: number) => {
    resetIdle();
    setActive(a => a === i ? -1 : i);
    cycleIndex.current = i;
  };

  const feat = active >= 0 ? FEATURES[active] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#050D1A', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        @keyframes cardFade {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes tagPop {
          from { opacity:0; transform:scale(.92); }
          to   { opacity:1; transform:scale(1); }
        }
        .penta-seg { cursor:pointer; }
      `}</style>

      {/* Star-field */}
      <div aria-hidden style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:
          'radial-gradient(circle,rgba(80,150,255,.5) 1px,transparent 1px),' +
          'radial-gradient(circle,rgba(80,150,255,.2) 1px,transparent 1px)',
        backgroundSize:'44px 44px, 22px 22px',
        backgroundPosition:'0 0, 11px 11px',
        opacity:0.3,
      }}/>
      <div aria-hidden style={{
        position:'fixed', top:-160, left:'50%', transform:'translateX(-50%)',
        width:700, height:460, borderRadius:'50%',
        background:'radial-gradient(ellipse,#1A4A9C 0%,transparent 68%)',
        opacity:0.4, zIndex:0, pointerEvents:'none',
      }}/>

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', flex:1 }}>

        {/* ── Minimal top bar — no nav text ── */}
        <header style={{
          padding:'18px 32px',
          display:'flex', alignItems:'center', justifyContent:'flex-end',
        }}>
          {/* Only logo mark, no nav links */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="22" height="22" viewBox="0 0 44 44">
              {Array.from({length:5},(_,i)=>{
                const a1=toRad(i*72-90), a2=toRad((i+1)*72-90);
                return (
                  <polygon key={i}
                    points={`22,22 ${(22+19*Math.cos(a1)).toFixed(1)},${(22+19*Math.sin(a1)).toFixed(1)} ${(22+19*Math.cos(a2)).toFixed(1)},${(22+19*Math.sin(a2)).toFixed(1)}`}
                    fill={['#0C447C','#185FA5','#0C447C','#185FA5','#0C447C'][i]}
                    stroke="#050D1A" strokeWidth="0.8"
                  />
                );
              })}
            </svg>
            <span style={{ fontSize:14, fontWeight:700, color:'#D8EDFF', fontFamily:'Georgia, serif' }}>
              Penta School
            </span>
          </div>
        </header>

        {/* ── Main layout ── */}
        <main style={{
          flex:1,
          maxWidth:1080,
          margin:'0 auto',
          width:'100%',
          padding:'16px 28px 40px',
          minHeight:'calc(100vh - 70px)',
          display:'grid',
          gridTemplateColumns:'1fr 400px',
          gap:44,
          alignItems:'stretch',
        }}>

          {/* LEFT */}
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

            {/* Top group: brand + card */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Brand headline */}
            <div>
              <h1 style={{
                fontSize:'clamp(40px,5.5vw,64px)',
                fontWeight:800, margin:'0 0 12px',
                fontFamily:'Georgia, serif',
                letterSpacing:'-0.025em',
                color:'#D8EDFF',
                lineHeight:1.08,
              }}>
                Penta<br/>School
              </h1>
              <p style={{ fontSize:14, color:'#3A6FA8', margin:0, lineHeight:1.6 }}>
                Nền tảng dạy &amp; học thế hệ mới<br/>
                {isAuto
                  ? <span style={{color:'#2A5F9A',fontSize:12}}>Đang tự động khám phá — lướt chuột để tương tác</span>
                  : <span style={{color:'#2A5F9A',fontSize:12}}>Lướt chuột qua các ô để xem chi tiết</span>
                }
              </p>
            </div>

            {/* Feature card */}
            {feat ? (
              <div key={feat.id} style={{
                animation:'cardFade .38s ease both',
                background:'rgba(255,255,255,.05)',
                backdropFilter:'blur(14px)',
                border:`1px solid ${feat.accent}44`,
                borderRadius:20,
                padding:'22px 24px',
                boxShadow:`0 8px 40px rgba(0,20,60,.5), 0 0 0 1px ${feat.accent}18`,
              }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:`${feat.accent}18`,
                    border:`1px solid ${feat.accent}35`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <svg width="20" height="20" viewBox="-12 -12 24 24" overflow="visible">
                      <Icon id={feat.id} color={feat.accent}/>
                    </svg>
                  </div>
                  <span style={{
                    fontSize:15, fontWeight:700, color:'#D8EDFF',
                    fontFamily:'Georgia, serif',
                  }}>{feat.title}</span>
                </div>

                {/* Description */}
                <p style={{ fontSize:13.5, color:'#7BA8D4', lineHeight:1.72, margin:'0 0 14px' }}>
                  {feat.desc}
                </p>

                {/* Tags */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {feat.tags.map((t,ti) => (
                    <span key={t} style={{
                      animation:`tagPop .3s ease ${ti*60}ms both`,
                      fontSize:11.5, fontWeight:600,
                      padding:'4px 12px', borderRadius:99,
                      background:`${feat.accent}14`,
                      color:feat.accent,
                      border:`1px solid ${feat.accent}35`,
                    }}>{t}</span>
                  ))}
                </div>

                {/* Auto indicator */}
                {isAuto && (
                  <div style={{
                    marginTop:14, display:'flex', alignItems:'center', gap:6,
                    fontSize:11, color:'rgba(100,160,255,.4)',
                  }}>
                    <span style={{
                      width:6, height:6, borderRadius:'50%',
                      background:feat.accent, opacity:.6,
                      animation:'pulse 1.8s ease-in-out infinite',
                    }}/>
                    Tự động — bấm để ghim
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                borderRadius:20, padding:'22px 24px',
                background:'rgba(255,255,255,.025)',
                border:'1px solid rgba(74,159,255,.08)',
                fontSize:13, color:'#243D60', fontStyle:'italic',
              }}>
                Khởi động trong giây lát...
              </div>
            )}
            </div>{/* end top group */}
          </div>

          {/* RIGHT: Pentagon — top-aligned, sized to match left panel */}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-start', alignItems:'center', paddingTop:4 }}>
            <svg width="100%" viewBox="0 0 420 415"
              style={{ display:'block', maxWidth:400, overflow:'visible' }}>

              {/* Deco rings */}
              <circle cx={CX} cy={CY} r={R+18}
                fill="none" stroke="#2B6CB0" strokeWidth="0.7"
                opacity="0.14" strokeDasharray="5 9"/>
              <circle cx={CX} cy={CY} r={R+34}
                fill="none" stroke="#2B6CB0" strokeWidth="0.4"
                opacity="0.07" strokeDasharray="3 13"/>
              <circle cx={CX} cy={CY} r={R+6} fill="#1A4A9C" opacity="0.06"/>

              {/* ClipPaths — icons stay inside each triangle */}
              <defs>
                {FEATURES.map((_,i) => (
                  <clipPath key={i} id={`cp${i}`}>
                    <polygon points={segPts(i)}/>
                  </clipPath>
                ))}
              </defs>

              {/* 5 Segments */}
              {FEATURES.map((f,i) => {
                const [lx,ly] = labelXY(i);
                const rot = TEXT_ROT[i];
                const isHi  = active === i;
                const isDim = active >= 0 && !isHi;

                return (
                  <g key={i} className="penta-seg"
                    onMouseEnter={() => handleHoverEnter(i)}
                    onMouseLeave={handleHoverLeave}
                    onClick={() => handleClick(i)}
                  >
                    {/* Background fill */}
                    <polygon points={segPts(i)}
                      fill={isHi ? FILLS_HI[i] : FILLS[i]}
                      stroke="#050D1A" strokeWidth="2.5" strokeLinejoin="round"
                      style={{
                        opacity: isDim ? 0.22 : 1,
                        filter: isHi ? `drop-shadow(0 0 18px ${f.accent}55)` : 'none',
                        transition:'opacity .35s, filter .35s, fill .25s',
                      }}
                    />

                    {/* Accent edge highlight */}
                    <polygon points={segPts(i)}
                      fill="none"
                      stroke={f.accent}
                      strokeWidth={isHi ? 1.5 : 0}
                      strokeLinejoin="round"
                      style={{
                        opacity: isHi ? 0.65 : 0,
                        transition:'opacity .3s, stroke-width .3s',
                        pointerEvents:'none',
                      }}
                    />

                    {/* Wide invisible hit area */}
                    <polygon points={segPts(i)} fill="transparent" stroke="transparent" strokeWidth="22"/>

                    {/* Label — rotated parallel to base, clipped inside */}
                    <g transform={`rotate(${rot},${lx},${ly})`}
                      clipPath={`url(#cp${i})`}
                      style={{
                        opacity: isDim ? 0.2 : 1,
                        transition:'opacity .35s',
                        pointerEvents:'none', userSelect:'none',
                      }}>
                      <g transform={`translate(${lx},${ly-19})`}>
                        <Icon id={i} color={isHi ? f.accent : 'rgba(175,210,255,.68)'}/>
                      </g>
                      <text x={lx} y={ly+3} textAnchor="middle"
                        fontFamily="Georgia, serif" fontSize="10.5" fontWeight="700"
                        fill={isHi ? f.accent : '#D8EDFF'}
                        style={{transition:'fill .25s'}}>
                        {f.label}
                      </text>
                      <text x={lx} y={ly+15} textAnchor="middle"
                        fontFamily="system-ui, sans-serif" fontSize="7.5"
                        fill="rgba(130,185,255,.5)">
                        {f.sub}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Center disc */}
              <circle cx={CX} cy={CY} r={66} fill="#050D1A"/>
              <circle cx={CX} cy={CY} r={66} fill="none"
                stroke={feat ? feat.accent : '#3B82C4'} strokeWidth="1.5"
                opacity={feat ? 0.55 : 0.18}
                style={{transition:'stroke .4s, opacity .4s'}}/>
              <circle cx={CX} cy={CY} r={56} fill="none"
                stroke="#2B5E9E" strokeWidth="0.5" opacity=".12"/>

              <text x={CX} y={CY-7} textAnchor="middle"
                fontFamily="Georgia, serif" fontSize="14" fontWeight="800" fill="#D8EDFF"
                style={{userSelect:'none'}}>Penta</text>
              <text x={CX} y={CY+11} textAnchor="middle"
                fontFamily="Georgia, serif" fontSize="14" fontWeight="800" fill="#D8EDFF"
                style={{userSelect:'none'}}>School</text>

            </svg>

            {/* Login / Register — below pentagon */}
            <div style={{ display:'flex', gap:10, width:'100%', maxWidth:400, marginTop:14 }}>
              <button
                onClick={() => router.push('/auth/login')}
                style={{
                  flex:1, padding:'12px 0', borderRadius:12,
                  background:'#1A4FA8', color:'#D8EDFF',
                  fontWeight:700, fontSize:14,
                  fontFamily:'Georgia, serif',
                  border:'1px solid rgba(100,168,255,.3)',
                  cursor:'pointer',
                  boxShadow:'0 4px 20px rgba(26,79,168,.45)',
                  transition:'opacity .18s, transform .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity='.85'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity='1';   e.currentTarget.style.transform=''; }}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                style={{
                  flex:1, padding:'12px 0', borderRadius:12,
                  background:'rgba(255,255,255,.05)', color:'#9DD0FF',
                  fontWeight:700, fontSize:14,
                  fontFamily:'Georgia, serif',
                  border:'1px solid rgba(100,168,255,.28)',
                  cursor:'pointer',
                  transition:'background .18s, transform .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(74,159,255,.12)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.transform=''; }}
              >
                Đăng ký
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform:scale(1); opacity:.6; }
          50%      { transform:scale(1.6); opacity:1; }
        }
        @media (max-width: 700px) {
          main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}