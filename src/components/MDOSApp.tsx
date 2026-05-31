'use client'

import { useState, useCallback } from 'react'
import { PROJECTS, NOTIFICATIONS, ACTIVITY, USERS, NOTIF_EVENTS, SCREENING_THRESHOLDS } from '@/data/mock'

type View = 'dashboard' | 'projects' | 'project-detail' | 'ifindy' | 'roles' | 'notifications'
type Role = 'admin' | 'team' | 'partner' | 'investor'
type TabRole = Role

const ROLE_NAV: Record<Role, View[]> = {
  admin:    ['dashboard','projects','ifindy','roles','notifications'],
  team:     ['dashboard','projects','ifindy','notifications'],
  partner:  ['dashboard','projects'],
  investor: ['dashboard'],
}

const STATUS_LABELS: Record<string,string> = {
  SCREENING:'Screening', BIM:'BIM', CONSTRUCTION:'Construction', MONITORING:'Monitoring', COMPLETE:'Complete'
}
const MODULE_NAMES = ['M01 iFindy','M02 VERTIKAAL','M03 Robotic','M04 Prefab','M05 Twin','M06 Deploy']
const MODULE_ACCESS: Record<Role, boolean[]> = {
  admin:    [true,true,true,true,true,true],
  team:     [true,true,true,true,true,false],
  partner:  [true,true,false,true,true,false],
  investor: [true,false,false,false,true,false],
}

function fmt(n: number | null | undefined, prefix='$') {
  if (n == null) return '—'
  if (n >= 1_000_000) return prefix + (n/1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return prefix + Math.round(n/1_000) + 'K'
  return prefix + n
}

export default function MDOSApp() {
  const [role, setRole] = useState<Role>('admin')
  const [view, setView] = useState<View>('dashboard')
  const [activeProject, setActiveProject] = useState(PROJECTS[0])
  const [projectTab, setProjectTab] = useState<'overview'|'bim'|'refax'|'twin'>('overview')
  const [notifToggles, setNotifToggles] = useState<Record<string,{teams:boolean,email:boolean}>>(() =>
    Object.fromEntries(NOTIF_EVENTS.map(e => [e.key, {teams:e.teams, email:e.email}]))
  )
  const [screeningResult, setScreeningResult] = useState<any>(null)
  const [screeningInput, setScreeningInput] = useState({
    address: '2421 S 5th St, Austin TX 78704',
    state: 'TX', market: 'austin', goal: 'RESIDENTIAL_SFH',
    method: 'THREEDCP', lot: '0.18', units: '4',
    bmin: '1.5', bmax: '4.5', zoning: 'SF-3',
  })
  const [uploadFlash, setUploadFlash] = useState(false)

  const nav = ROLE_NAV[role]
  const user = USERS[role]

  const switchRole = (r: Role) => {
    setRole(r)
    if (!ROLE_NAV[r].includes(view)) setView('dashboard')
    setScreeningResult(null)
  }

  const goProject = (p: typeof PROJECTS[0]) => {
    setActiveProject(p)
    setProjectTab('overview')
    setView('project-detail')
  }

  const runScreening = () => {
    const lot = parseFloat(screeningInput.lot) || 0
    const units = parseInt(screeningInput.units) || 0
    const bmin = parseFloat(screeningInput.bmin) * 1_000_000
    const bmax = parseFloat(screeningInput.bmax) * 1_000_000
    const zoning = screeningInput.zoning
    const method = screeningInput.method

    const costPerUnit: Record<string,number> = { THREEDCP:285000, SCIP:310000, MODULAR:295000, TUNNEL_FORM:340000, HYBRID:300000 }
    const totalEst = (costPerUnit[method] || 300000) * units
    const budgetMid = (bmin + bmax) / 2

    const validZones = SCREENING_THRESHOLDS.residentialZoning
    const zoningOk = zoning.length > 0 && validZones.some(z => zoning.toUpperCase().startsWith(z))

    const lotOk = lot >= SCREENING_THRESHOLDS.minLotAcres
    const budgetRatio = (totalEst - budgetMid) / budgetMid
    const tunnelIncompat = method === 'TUNNEL_FORM' && lot < 0.25
    const modularIncompat = method === 'MODULAR' && units < 8

    const dims = [
      { label:'Property Zoning', status: zoningOk ? 'PASS' : 'FAIL', autoReject: !zoningOk,
        detail: zoningOk ? `Zoning ${zoning} permits ${screeningInput.goal.toLowerCase()} use at target density` : `Zoning ${zoning||'unknown'} does not permit intended use — auto-reject` },
      { label:'Market Trends', status: 'PASS', autoReject: false,
        detail: 'Trailing 12-mo appreciation: +6.2% — above MDI minimum. Rental yield: 5.8% (min: 5.0%)' },
      { label:'Existing Infrastructure', status: lotOk ? 'PASS' : 'FLAG', autoReject: false,
        detail: lotOk ? `Lot ${lot.toFixed(2)} acres — road, water, sewer and power access compatible` : `Lot ${lot.toFixed(2)} acres below minimum ${SCREENING_THRESHOLDS.minLotAcres} acres — manual site verification required` },
      { label:'Market Comps', status: screeningInput.state === 'UK' ? 'FLAG' : 'PASS', autoReject: false,
        detail: screeningInput.state === 'UK' ? 'MLS feed not connected for UK — manual comp review required' : 'MLS comps: median $785/sqft — supports MDI target margin at 3DCP cost basis' },
      { label:'Developer Budget', status: budgetRatio <= 0 ? 'PASS' : budgetRatio <= 0.15 ? 'FLAG' : 'FAIL', autoReject: false,
        detail: `Est. cost (${method}): ${fmt(totalEst)} for ${units} units — budget midpoint ${fmt(budgetMid)}` },
      { label:'Robotic / Modular Match', status: (tunnelIncompat||modularIncompat) ? 'FAIL' : 'PASS', autoReject: tunnelIncompat||modularIncompat,
        detail: tunnelIncompat ? 'Tunnel-form requires 0.25+ acres — consider 3DCP or SCIP' : modularIncompat ? `Modular requires 8+ units — ${units} units may not pencil` : `${method} compatible with lot config and Phase 1 markets (TX/FL)` },
    ]

    const autoRej = dims.some(d => d.autoReject && d.status === 'FAIL')
    const fails = dims.filter(d=>d.status==='FAIL').length
    const flags = dims.filter(d=>d.status==='FLAG').length
    const passes = dims.filter(d=>d.status==='PASS').length
    const overall = autoRej ? 'FAIL' : fails > 0 || flags >= 3 ? 'FLAG' : flags > 0 ? 'FLAG' : 'PASS'
    const score = Math.min(100, Math.round((passes/6)*70 + (flags/6)*30 + (autoRej?0:10)))

    setScreeningResult({ dims, overall, score, autoRej, passes, flags, fails })
  }

  const simUpload = () => { setUploadFlash(true); setTimeout(()=>setUploadFlash(false),3500) }

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div className="sidebar flex flex-col" style={{width:220,flexShrink:0,minHeight:'100vh'}}>
      <div style={{padding:'18px 16px 14px',borderBottom:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{fontSize:16,fontWeight:500,color:'#fff'}}>MD<span style={{color:'var(--mdi-gold)'}}>OS</span></div>
        <div style={{fontSize:10,letterSpacing:'0.12em',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',marginTop:2}}>Moderne Development, Inc.</div>
      </div>
      <div style={{padding:'10px 12px',borderBottom:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>Viewing as</div>
        <select value={role} onChange={e=>switchRole(e.target.value as Role)}
          style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'0.5px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:7,padding:'5px 8px',fontSize:12}}>
          <option value="admin">MDI Admin</option>
          <option value="team">MDI Team Member</option>
          <option value="partner">Alpha JV Partner</option>
          <option value="investor">Investor / Observer</option>
        </select>
      </div>
      <div style={{flex:1,padding:'10px 0'}}>
        {nav.includes('dashboard') && <NavItem icon="⊞" label="Dashboard" id="dashboard" current={view} set={setView}/>}
        {nav.includes('projects') && <NavItem icon="🏗" label="Projects" id="projects" current={view} set={setView} badge={PROJECTS.length.toString()}/>}
        {nav.includes('ifindy') && <NavItem icon="🔍" label="iFindy Screening" id="ifindy" current={view} set={setView}/>}
        {nav.includes('roles') && <>
          <div style={{padding:'8px 14px 4px',fontSize:10,letterSpacing:'0.1em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>System</div>
          <NavItem icon="🔐" label="Roles & Access" id="roles" current={view} set={setView}/>
          <NavItem icon="🔔" label="Notifications" id="notifications" current={view} set={setView} badge="3"/>
        </>}
        {nav.includes('notifications') && !nav.includes('roles') && <NavItem icon="🔔" label="Notifications" id="notifications" current={view} set={setView} badge="3"/>}
      </div>
      <div style={{padding:'12px 14px',borderTop:'0.5px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',gap:9}}>
        <div style={{width:30,height:30,borderRadius:'50%',background:'var(--mdi-gold)',color:'var(--mdi-green)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,flexShrink:0}}>{user.initials}</div>
        <div>
          <div style={{fontSize:12,color:'#fff',fontWeight:500}}>{user.name}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{user.role}</div>
        </div>
      </div>
    </div>
  )

  // ── Nav item ─────────────────────────────────────────────────────────────────
  const NavItem = ({icon,label,id,current,set,badge}:{icon:string,label:string,id:View,current:View,set:(v:View)=>void,badge?:string}) => (
    <div className={`nav-item${current===id?' active':''}`} onClick={()=>set(id)}>
      <span style={{fontSize:14}}>{icon}</span>
      <span style={{flex:1}}>{label}</span>
      {badge && <span style={{background:'var(--mdi-gold)',color:'var(--mdi-green)',fontSize:10,fontWeight:500,borderRadius:10,padding:'1px 6px'}}>{badge}</span>}
    </div>
  )

  // ── Topbar ────────────────────────────────────────────────────────────────────
  const titles: Record<View,string> = { dashboard:'Dashboard', projects:'Projects', 'project-detail':activeProject.name, ifindy:'Module 01 — iFindy Land Screening', roles:'Roles & Access', notifications:'Notifications' }
  const Topbar = () => (
    <div style={{background:'#fff',borderBottom:'0.5px solid rgba(0,0,0,0.1)',padding:'10px 20px',display:'flex',alignItems:'center',gap:12}}>
      {view==='project-detail' && <button className="btn" onClick={()=>setView('projects')} style={{marginRight:4}}>← Projects</button>}
      <div style={{flex:1,fontSize:15,fontWeight:500}}>{titles[view]}</div>
      <div style={{display:'flex',alignItems:'center',gap:7,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:7,padding:'5px 10px',width:180}}>
        <span style={{color:'#aaa',fontSize:13}}>⌕</span>
        <input type="text" placeholder="Search projects…" style={{border:'none',background:'transparent',padding:0,width:'100%'}}/>
      </div>
      <div style={{position:'relative',cursor:'pointer',padding:5,borderRadius:7,border:'0.5px solid rgba(0,0,0,0.1)',background:'#f5f4f0'}} onClick={()=>setView('notifications')}>
        <span style={{fontSize:18}}>🔔</span>
        <span style={{position:'absolute',top:3,right:3,width:8,height:8,borderRadius:'50%',background:'var(--mdi-gold)',display:'block'}}/>
      </div>
    </div>
  )

  // ── Dashboard view ────────────────────────────────────────────────────────────
  const DashboardView = () => {
    const visibleProjects = role === 'partner' ? PROJECTS.slice(0,2) : PROJECTS.slice(0,4)
    return (
      <div style={{padding:20}}>
        <div className="section-label">Portfolio Overview</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
          {[
            {label:'Active Projects',value:'6',sub:'Domestic + International'},
            {label:'Units in Pipeline',value:'800+',sub:'6 markets'},
            {label:'Alpha JV Partners',value:'3',sub:'Modstone, MODSOD, Alatau'},
            {label:'BIM Packages Ready',value:'2',sub:'4 in progress'},
          ].map(s=>(
            <div key={s.label} className="metric"><div className="label">{s.label}</div><div className="value">{s.value}</div><div className="sub">{s.sub}</div></div>
          ))}
        </div>
        <div className="section-label">Active Projects</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          {visibleProjects.map(p=>(
            <div key={p.id} className="card" style={{padding:'14px 16px',cursor:'pointer'}} onClick={()=>goProject(p)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div><div style={{fontWeight:500,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:'#888',marginTop:1}}>{p.market}</div></div>
                <span className={`pill pill-${p.status.toLowerCase()}`}>{STATUS_LABELS[p.status]}</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
                <span style={{fontSize:10,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'2px 7px',color:'#666'}}>{p.method}</span>
                <span style={{fontSize:10,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'2px 7px',color:'#666'}}>{p.units} units</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="progress-bar" style={{flex:1}}><div className="progress-fill" style={{width:`${p.pct}%`}}/></div>
                <span style={{fontSize:11,color:'#888',minWidth:28,textAlign:'right'}}>{p.pct}%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>🔔 Recent Notifications</div>
            {NOTIFICATIONS.slice(0,4).map(n=>(
              <div key={n.id} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:n.type==='success'?'#EAF3DE':n.type==='warn'?'#FAEEDA':n.type==='email'?'#FAEEDA':'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>
                  {n.type==='success'?'✓':n.type==='warn'?'⚠':n.type==='email'?'✉':'💬'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:12}}>{n.title}</div>
                  <div style={{fontSize:11,color:'#888'}}>{n.sub}</div>
                </div>
                <div style={{fontSize:10,color:'#aaa',flexShrink:0}}>{n.time}</div>
              </div>
            ))}
          </div>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>📋 Activity Feed</div>
            {ACTIVITY.map((a,i)=>(
              <div key={i} style={{display:'flex',gap:9,padding:'6px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',alignItems:'flex-start'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'var(--mdi-gold)',flexShrink:0,marginTop:5}}/>
                <div style={{flex:1,fontSize:12,color:'#555',lineHeight:1.4}}>{a.text}</div>
                <div style={{fontSize:10,color:'#aaa',flexShrink:0}}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Projects list ─────────────────────────────────────────────────────────────
  const ProjectsView = () => {
    const visible = role==='partner' ? PROJECTS.slice(0,2) : PROJECTS
    return (
      <div style={{padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div className="section-label" style={{marginBottom:0}}>All Projects ({visible.length})</div>
          {(role==='admin'||role==='team') && <button className="btn btn-primary">+ New Project</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {visible.map(p=>(
            <div key={p.id} className="card" style={{padding:'14px 16px',cursor:'pointer'}} onClick={()=>goProject(p)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div><div style={{fontWeight:500,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:'#888',marginTop:1}}>{p.market}</div></div>
                <span className={`pill pill-${p.status.toLowerCase()}`}>{STATUS_LABELS[p.status]}</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
                <span style={{fontSize:10,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'2px 7px',color:'#666'}}>{p.method}</span>
                <span style={{fontSize:10,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'2px 7px',color:'#666'}}>{p.units} units</span>
                <span style={{fontSize:10,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'2px 7px',color:'#666'}}>{p.partner}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="progress-bar" style={{flex:1}}><div className="progress-fill" style={{width:`${p.pct}%`}}/></div>
                <span style={{fontSize:11,color:'#888',minWidth:28,textAlign:'right'}}>{p.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Project Detail ────────────────────────────────────────────────────────────
  const ProjectDetailView = () => {
    const p = activeProject
    return (
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Left sidebar */}
        <div style={{width:210,background:'#fff',borderRight:'0.5px solid rgba(0,0,0,0.1)',padding:14,flexShrink:0,overflowY:'auto'}}>
          <InfoBlock title="Project Record" rows={[
            {l:'Project ID',v:p.id.toUpperCase()},{l:'APN',v:p.apn},{l:'State',v:p.state},
            {l:'Method',v:p.method},{l:'Units',v:String(p.units)},{l:'Partner',v:p.partner},
            {l:'Alpha MSA',v:p.msaExecuted?'✓ Executed':'Pending',vc:p.msaExecuted?'#3B6D11':undefined},
          ]}/>
          {(role==='admin'||role==='team') && <InfoBlock title="Financials" rows={[
            {l:'Land cost',v:fmt(p.landCost)},{l:'Construction',v:fmt(p.constructionCost)},
            {l:'Proj. revenue',v:fmt(p.projectedRevenue)},{l:'Target margin',v:p.targetMargin?p.targetMargin+'%':'—'},
          ]}/>}
          <div style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888',marginBottom:8}}>Module Progress</div>
          {MODULE_NAMES.map((m,i)=>{
            const s = p.moduleStatus[i] as 'done'|'active'|'todo'
            return (
              <div key={m} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                <div style={{width:20,height:20,borderRadius:'50%',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  background:s==='done'?'#EAF3DE':s==='active'?'var(--mdi-green)':'#f0f0ec',
                  color:s==='done'?'#3B6D11':s==='active'?'#fff':'#aaa'}}>{i+1}</div>
                <div style={{fontSize:11,color:s==='todo'?'#aaa':'#1a1a1a',flex:1}}>{m.split(' ').slice(1).join(' ')}</div>
                <div style={{fontSize:10,color:s==='done'?'#3B6D11':s==='active'?'var(--mdi-gold-text)':'#ccc'}}>{s==='done'?'Done':s==='active'?'Active':''}</div>
              </div>
            )
          })}
        </div>
        {/* Main content */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{background:'#fff',borderBottom:'0.5px solid rgba(0,0,0,0.1)',display:'flex',padding:'0 16px'}}>
            {(['overview','bim','refax','twin'] as const).map(t=>(
              <div key={t} className={`tab${projectTab===t?' active':''}`} onClick={()=>setProjectTab(t)}>
                {t==='overview'?'⊞ Overview':t==='bim'?'📦 BIM & STL':t==='refax'?'🧠 REfax Report':'📡 Digital Twin'}
              </div>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:16,background:'#f5f4f0'}}>
            {projectTab==='overview' && <OverviewTab p={p}/>}
            {projectTab==='bim' && <BimTab p={p}/>}
            {projectTab==='refax' && <RefaxTab p={p}/>}
            {projectTab==='twin' && <TwinTab p={p}/>}
          </div>
        </div>
      </div>
    )
  }

  const InfoBlock = ({title,rows}:{title:string,rows:{l:string,v:string,vc?:string}[]}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888',marginBottom:8}}>{title}</div>
      {rows.map(r=>(
        <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'4px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
          <span style={{color:'#888'}}>{r.l}</span>
          <span style={{fontWeight:500,textAlign:'right',maxWidth:120,color:r.vc||'#1a1a1a'}}>{r.v}</span>
        </div>
      ))}
    </div>
  )

  const OverviewTab = ({p}:{p:typeof PROJECTS[0]}) => (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div className="panel" style={{marginBottom:0}}>
          <div style={{fontWeight:500,fontSize:12,marginBottom:10}}>⏱ Timeline</div>
          {[['Feasibility cleared',p.startDate],['BIM generated',p.bimDate||'—'],['Print started',p.printDate||'—'],['Est. completion',p.estCompletion]].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
              <span style={{color:'#888'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
        <div className="panel" style={{marginBottom:0}}>
          <div style={{fontWeight:500,fontSize:12,marginBottom:10}}>👥 Team</div>
          {[['MDI Lead','Edgar Munoz'],['CTO','Paul Cejas'],['GC / Partner',p.partner],['BIM (VERTIKAAL)','R. Mechielsen']].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
              <span style={{color:'#888'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div style={{fontWeight:500,fontSize:12,marginBottom:10}}>💬 Communication Log</div>
        {p.comms.length === 0 && <div style={{fontSize:12,color:'#aaa',textAlign:'center',padding:'20px 0'}}>No communications yet</div>}
        {p.comms.map((c,i)=>(
          <div key={i} style={{background:'#f5f4f0',borderRadius:8,padding:'9px 10px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontWeight:500,fontSize:11}}>{c.author}</span>
              <span style={{fontSize:10,color:'#888'}}>{c.date}</span>
            </div>
            <div style={{fontSize:11,color:'#555',lineHeight:1.5}}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const BimTab = ({p}:{p:typeof PROJECTS[0]}) => (
    <div>
      <div className="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontWeight:500,fontSize:12}}>📤 STL File Versions — VERTIKAAL Output</div>
          <button className="btn btn-primary" onClick={simUpload}>↑ Upload STL</button>
        </div>
        {p.stlVersions.length===0 && <div style={{fontSize:12,color:'#aaa',textAlign:'center',padding:'20px 0',background:'#f5f4f0',borderRadius:8}}>No STL files uploaded yet</div>}
        {p.stlVersions.map(s=>(
          <div key={s.version} style={{display:'flex',alignItems:'center',gap:8,padding:8,background:s.active?'#FAEEDA':'#f5f4f0',border:`0.5px solid ${s.active?'var(--mdi-gold)':'rgba(0,0,0,0.1)'}`,borderRadius:8,marginBottom:6}}>
            <div style={{width:28,height:28,background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📦</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:500,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.filename}</div>
              <div style={{fontSize:10,color:'#888'}}>{s.date} · {s.sizeMb}MB · {s.units} units · {s.sqft.toLocaleString()} sqft</div>
            </div>
            <span style={{fontSize:10,padding:'2px 7px',borderRadius:8,background:s.active?'var(--mdi-gold-bg)':'#EAF3DE',color:s.active?'var(--mdi-gold-text)':'#3B6D11',whiteSpace:'nowrap'}}>v{s.version}{s.active?' — Active':''}</span>
            <button className="btn" style={{marginLeft:4,padding:'4px 8px'}}>↓</button>
          </div>
        ))}
        {uploadFlash && <div style={{marginTop:8,background:'#EAF3DE',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#3B6D11',display:'flex',alignItems:'center',gap:6}}>✓ STL uploaded and queued for geometry parsing — downstream modules will update automatically.</div>}
        <div style={{marginTop:10,border:'1.5px dashed rgba(0,0,0,0.15)',borderRadius:8,padding:20,textAlign:'center',color:'#aaa',cursor:'pointer',fontSize:12}} onClick={simUpload}>
          ☁ Drop STL file here or click to upload
        </div>
      </div>
      {p.bimFiles.length > 0 && (
        <div className="panel">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:500,fontSize:12}}>📋 BIM Package — Exported Deliverables</div>
            <button className="btn">↓ Download All</button>
          </div>
          {p.bimFiles.map(f=>{
            const colors: Record<string,string> = {IFC:'#EEEDFE',RVT:'#E6F1FB',DWG:'#FAEEDA',PDF:'#FCEBEB',XLSX:'#EAF3DE'}
            const textColors: Record<string,string> = {IFC:'#3C3489',RVT:'#0C447C',DWG:'#633806',PDF:'#791F1F',XLSX:'#27500A'}
            return (
              <div key={f.filename} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:5,background:colors[f.format]||'#eee',color:textColors[f.format]||'#333'}}>{f.format}</span>
                <span style={{fontSize:12,flex:1}}>{f.filename}</span>
                <span style={{fontSize:10,color:'#aaa'}}>{f.sizeMb}MB</span>
                <button className="btn" style={{padding:'3px 8px'}}>↓</button>
              </div>
            )
          })}
          <div style={{marginTop:10,background:'#f5f4f0',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#666'}}>
            🔒 IP note: Design Series copyright MDI. BIM exports are {p.partner} property — unrestricted download. Modstone Lego Blocks tagged to this account only.
          </div>
        </div>
      )}
      {p.roboticFiles.length > 0 && (
        <div className="panel">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:500,fontSize:12}}>🤖 Robotic Code Output (M03)</div>
            <span style={{fontSize:11,color:'#3B6D11'}}>Generated from active STL</span>
          </div>
          {p.roboticFiles.map(f=>(
            <div key={f.filename} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
              <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:5,background:'#E1F5EE',color:'#085041'}}>{f.vendor}</span>
              <span style={{fontSize:12,flex:1}}>{f.filename}</span>
              <span style={{fontSize:10,color:'#aaa'}}>{f.sizeMb}MB</span>
              <button className="btn" style={{padding:'3px 8px'}}>↓</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const RefaxTab = ({p}:{p:typeof PROJECTS[0]}) => {
    if (!p.refax) return (
      <div className="panel" style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:32,marginBottom:12}}>🧠</div>
        <div style={{fontWeight:500,marginBottom:6}}>No REfax Report Yet</div>
        <div style={{fontSize:12,color:'#888',marginBottom:16}}>Request an AI-powered neighborhood intelligence report from REAI for this parcel.</div>
        <button className="btn btn-primary">Request REfax Report</button>
      </div>
    )
    const r = p.refax
    return (
      <div>
        <div className="panel">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontWeight:500,fontSize:12}}>🧠 REfax Neighborhood Intelligence</div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'#FCEBEB',color:'#A32D2D'}}>🔒 Confidential — MDI & JV only</span>
              <button className="btn btn-primary" style={{fontSize:11,padding:'4px 10px'}}>↺ Re-request</button>
            </div>
          </div>
          <div style={{fontSize:11,color:'#888',marginBottom:12}}>Report for: {r.address} · Goal: Residential SFH · Generated {r.generated}</div>
          <div style={{background:'#E1F5EE',borderRadius:8,padding:'10px 12px',borderLeft:'3px solid #1D9E75',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:500,color:'#085041',marginBottom:4}}>🏗 3DCP-Specific Price Projections</div>
            <div style={{fontSize:11,color:'#0F6E56',lineHeight:1.5}}>Projected unit values of ${(r.projectedUnitMin/1000).toFixed(0)}K–${(r.projectedUnitMax/1000).toFixed(0)}K for 3D-printed homes in this submarket. REAI projects a {r.pricePremiumPct}% price premium over traditional construction — directly supports MDI project feasibility and investor narrative. 5-year appreciation outlook: +{r.appreciation5yr}% driven by supply constraint and buyer demographics.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[
              {l:'Median sale price',v:`$${r.medianSalePricePerSqft}/sqft`,s:`Zillow HVI: +${r.appreciationYoy}% YoY`},
              {l:'Projected unit range',v:`$${(r.projectedUnitMin/1000).toFixed(0)}K–$${(r.projectedUnitMax/1000).toFixed(0)}K`,s:'3DCP new build comps'},
              {l:'Avg monthly rent',v:`$${r.avgMonthlyRent.toLocaleString()}`,s:`+${r.rentGrowthYoy}% YoY`},
              {l:'Crime index (CAP)',v:`${r.crimeIndexCap} / 100`,s:'Below MDI threshold (80)'},
              {l:'School rating (Niche)',v:r.schoolRating,s:'Above MDI threshold (C)'},
              {l:'3DCP price premium',v:`+${r.pricePremiumPct}%`,s:'vs. traditional construction'},
            ].map(m=>(
              <div key={m.l} className="metric"><div className="label">{m.l}</div><div className="value" style={{fontSize:16}}>{m.v}</div><div className="sub">{m.s}</div></div>
            ))}
          </div>
          <div style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888',marginBottom:8}}>Automated Feasibility Loop Triggers</div>
          {[
            {label:`Crime index ${r.crimeIndexCap} — below MDI threshold of 80`, pass:true},
            {label:`Appreciation forecast +${r.appreciation5yr}% — positive`, pass:true},
            {label:`School rating ${r.schoolRating} — above residential threshold`, pass:true},
            {label:'3DCP price premium confirmed — feeds M01 pro-forma', pass:true},
          ].map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:t.pass?'#639922':'#E24B4A',flexShrink:0}}/>
              <span style={{flex:1}}>{t.label}</span>
              <span style={{color:t.pass?'#3B6D11':'#A32D2D'}}>{t.pass?'Pass':'Flag'}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const TwinTab = ({p}:{p:typeof PROJECTS[0]}) => {
    if (!p.twin) return (
      <div className="panel" style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:32,marginBottom:12}}>📡</div>
        <div style={{fontWeight:500,marginBottom:6}}>Digital Twin Not Initialized</div>
        <div style={{fontSize:12,color:'#888'}}>The digital twin will be initialized when construction begins.</div>
      </div>
    )
    const t = p.twin
    return (
      <div className="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:500,fontSize:12}}>📡 Digital Twin — Live Monitoring</div>
          <span style={{fontSize:11,color:'#3B6D11',display:'flex',alignItems:'center',gap:4}}>● Live</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[
            {l:'Overall progress',v:`${t.pct}%`,s:'On schedule'},
            {l:'Deviations flagged',v:String(t.deviations),s:'Wall offset — Unit 2'},
            {l:'QA checks complete',v:`${t.qaComplete} / ${t.qaTotal}`,s:`${t.qaTotal-t.qaComplete} remaining`},
            {l:'Days to completion',v:String(t.daysLeft),s:'Est. completion on track'},
          ].map(m=>(
            <div key={m.l} className="metric"><div className="label">{m.l}</div><div className="value" style={{fontSize:18}}>{m.v}</div><div className="sub">{m.s}</div></div>
          ))}
        </div>
        <div style={{background:'#f5f4f0',borderRadius:8,padding:'30px 20px',textAlign:'center',color:'#aaa',fontSize:12}}>
          📦 3D model viewer loads here — BIM baseline vs. as-built comparison. Photo uploads tied to BIM coordinates.
        </div>
      </div>
    )
  }

  // ── iFindy Screening ──────────────────────────────────────────────────────────
  const IFindyView = () => (
    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      <div style={{width:260,background:'#fff',borderRight:'0.5px solid rgba(0,0,0,0.1)',padding:16,flexShrink:0,overflowY:'auto'}}>
        <FormSection title="Parcel Identification">
          <Field label="Address or APN"><input value={screeningInput.address} onChange={e=>setScreeningInput(s=>({...s,address:e.target.value}))}/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <Field label="State"><select value={screeningInput.state} onChange={e=>setScreeningInput(s=>({...s,state:e.target.value}))}><option value="TX">Texas</option><option value="FL">Florida</option><option value="UK">UK</option></select></Field>
            <Field label="Market"><select value={screeningInput.market} onChange={e=>setScreeningInput(s=>({...s,market:e.target.value}))}><option value="austin">Austin</option><option value="orlando">Orlando</option><option value="birmingham">Birmingham</option></select></Field>
          </div>
        </FormSection>
        <FormSection title="Development Goal">
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {[['RESIDENTIAL_SFH','SFH'],['MULTIFAMILY_BTR','Multifamily'],['HOSPITALITY_STR','Hospitality'],['MIXED_USE','Mixed-use']].map(([v,l])=>(
              <div key={v} onClick={()=>setScreeningInput(s=>({...s,goal:v}))} style={{fontSize:11,padding:'3px 9px',border:`0.5px solid ${screeningInput.goal===v?'var(--mdi-green)':'rgba(0,0,0,0.15)'}`,borderRadius:10,cursor:'pointer',background:screeningInput.goal===v?'var(--mdi-green)':'#fff',color:screeningInput.goal===v?'#fff':'#666',whiteSpace:'nowrap'}}>{l}</div>
            ))}
          </div>
        </FormSection>
        <FormSection title="Budget & Site Parameters">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <Field label="Budget min ($M)"><input type="number" value={screeningInput.bmin} onChange={e=>setScreeningInput(s=>({...s,bmin:e.target.value}))}/></Field>
            <Field label="Budget max ($M)"><input type="number" value={screeningInput.bmax} onChange={e=>setScreeningInput(s=>({...s,bmax:e.target.value}))}/></Field>
            <Field label="Lot size (acres)"><input type="number" value={screeningInput.lot} onChange={e=>setScreeningInput(s=>({...s,lot:e.target.value}))}/></Field>
            <Field label="Target units"><input type="number" value={screeningInput.units} onChange={e=>setScreeningInput(s=>({...s,units:e.target.value}))}/></Field>
          </div>
          <Field label="Zoning code"><input value={screeningInput.zoning} onChange={e=>setScreeningInput(s=>({...s,zoning:e.target.value}))}/></Field>
        </FormSection>
        <FormSection title="Construction Method">
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {[['THREEDCP','3DCP'],['SCIP','SCIP'],['MODULAR','Modular'],['TUNNEL_FORM','Tunnel-form']].map(([v,l])=>(
              <div key={v} onClick={()=>setScreeningInput(s=>({...s,method:v}))} style={{fontSize:11,padding:'3px 9px',border:`0.5px solid ${screeningInput.method===v?'var(--mdi-green)':'rgba(0,0,0,0.15)'}`,borderRadius:10,cursor:'pointer',background:screeningInput.method===v?'var(--mdi-green)':'#fff',color:screeningInput.method===v?'#fff':'#666'}}>{l}</div>
            ))}
          </div>
        </FormSection>
        <button className="btn btn-primary" style={{width:'100%',marginTop:4,justifyContent:'center'}} onClick={runScreening}>🔍 Run Feasibility Screening</button>
      </div>
      <div style={{flex:1,padding:16,overflowY:'auto',background:'#f5f4f0'}}>
        {!screeningResult ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:'#aaa',textAlign:'center',padding:40}}>
            <div style={{fontSize:40}}>🗺</div>
            <div style={{fontSize:13,maxWidth:220,lineHeight:1.5}}>Fill in parcel details and run screening to see feasibility results across all 6 scoring dimensions.</div>
          </div>
        ) : (
          <>
            <div className="panel" style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
              <div style={{width:64,height:64,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20,fontWeight:500,
                background:screeningResult.overall==='PASS'?'#EAF3DE':screeningResult.overall==='FLAG'?'#FAEEDA':'#FCEBEB',
                color:screeningResult.overall==='PASS'?'#27500A':screeningResult.overall==='FLAG'?'#633806':'#791F1F',
                border:`3px solid ${screeningResult.overall==='PASS'?'#639922':screeningResult.overall==='FLAG'?'#BA7517':'#E24B4A'}`}}>
                {screeningResult.score}
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:14}}>{screeningResult.overall==='PASS'?'Clears Feasibility':screeningResult.overall==='FLAG'?screeningResult.autoRej?'Auto-rejected':'Flagged for MDI Review':'Auto-rejected'}</div>
                <div style={{fontSize:11,color:'#888',marginTop:3}}>{screeningResult.passes} pass · {screeningResult.flags} flag · {screeningResult.fails} fail</div>
                <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                  {[screeningInput.method,screeningInput.state,screeningInput.goal.split('_')[0]].map(t=>(
                    <span key={t} style={{fontSize:10,padding:'2px 7px',borderRadius:8,background:'#E1F5EE',color:'#085041'}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button className="btn" style={{flex:1,justifyContent:'center'}}>📄 Land Report</button>
              <button className="btn" style={{flex:1,justifyContent:'center'}}>🧠 REfax Request</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}}>→ Advance to M02</button>
            </div>
            <div className="section-label">Scoring Dimensions</div>
            {screeningResult.dims.map((d:any)=>(
              <div key={d.label} className="card" style={{padding:'8px 10px',marginBottom:6,display:'flex',alignItems:'flex-start',gap:8}}>
                <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,
                  background:d.status==='PASS'?'#EAF3DE':d.status==='FLAG'?'#FAEEDA':'#FCEBEB',
                  color:d.status==='PASS'?'#3B6D11':d.status==='FLAG'?'#854F0B':'#A32D2D',fontSize:12}}>
                  {d.status==='PASS'?'✓':d.status==='FLAG'?'!':'✕'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:12}}>{d.label}{d.autoReject&&d.status==='FAIL'?<span style={{fontSize:10,color:'#A32D2D',marginLeft:5}}>(auto-reject)</span>:null}</div>
                  <div style={{fontSize:11,color:'#666',marginTop:1,lineHeight:1.4}}>{d.detail}</div>
                </div>
                <span className={`pill pill-${d.status.toLowerCase()}`} style={{flexShrink:0}}>{d.status==='PASS'?'Pass':d.status==='FLAG'?'Flag':'Fail'}</span>
              </div>
            ))}
            <div className="section-label" style={{marginTop:14}}>Data Sources</div>
            <div className="card" style={{padding:'8px 12px'}}>
              {[{n:'Regrid (parcel data)',s:'live'},{n:'MLS feed (comps & pricing)',s:screeningInput.state==='UK'?'pending':'live'},{n:'REAI REfax (neighborhood intel)',s:'manual'},{n:'Municode / AHJ (zoning codes)',s:'manual'}].map(ds=>(
                <div key={ds.n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
                  <span style={{fontWeight:500}}>{ds.n}</span>
                  <span style={{fontSize:10,padding:'2px 7px',borderRadius:6,background:ds.s==='live'?'#EAF3DE':ds.s==='manual'?'#FAEEDA':'#f0f0ec',color:ds.s==='live'?'#3B6D11':ds.s==='manual'?'#854F0B':'#888'}}>{ds.s==='live'?'Live API':ds.s==='manual'?'Manual fallback':'Not connected'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  const FormSection = ({title,children}:{title:string,children:React.ReactNode}) => (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#888',marginBottom:10,paddingBottom:6,borderBottom:'0.5px solid rgba(0,0,0,0.08)'}}>{title}</div>
      {children}
    </div>
  )
  const Field = ({label,children}:{label:string,children:React.ReactNode}) => (
    <div style={{marginBottom:8}}><label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>{label}</label>{children}</div>
  )

  // ── Roles & Access ────────────────────────────────────────────────────────────
  const RolesView = () => (
    <div style={{padding:20}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="panel">
          <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>👥 System Roles</div>
          {[
            {key:'admin',label:'MDI Admin',bg:'#3C3489',tc:'#CECBF6',desc:'Full platform — all projects, system config, partner management'},
            {key:'team',label:'MDI Team Member',bg:'#0C447C',tc:'#B5D4F4',desc:'Assigned projects, BIM tools, robotic output, digital twin'},
            {key:'partner',label:'Alpha JV Partner',bg:'#3B6D11',tc:'#C0DD97',desc:'Own project deliverables — feasibility, BIM, progress tracking'},
            {key:'investor',label:'Investor / Observer',bg:'#5F5E5A',tc:'#D3D1C7',desc:'Read-only pipeline dashboard — no BIM or financial detail'},
            {key:'beta',label:'Beta Subscriber',bg:'#854F0B',tc:'#FAC775',desc:'Module-scoped SaaS access — metered per subscription tier'},
          ].map(r=>(
            <div key={r.key} style={{padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:r.bg,color:r.tc}}>{r.label}</span>
              <div style={{fontSize:11,color:'#888',marginTop:4}}>{r.desc}</div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>🔒 Module Access Matrix</div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:5,marginBottom:4}}>
            {['Adm','Team','JV','Inv'].map(h=><div key={h} style={{width:28,fontSize:9,color:'#aaa',textAlign:'center'}}>{h}</div>)}
          </div>
          {MODULE_NAMES.map((m,mi)=>(
            <div key={m} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11}}>
              <span style={{fontWeight:500}}>{m}</span>
              <div style={{display:'flex',gap:5}}>
                {(['admin','team','partner','investor'] as Role[]).map(r=>{
                  const has = MODULE_ACCESS[r][mi]
                  return <div key={r} style={{width:28,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,background:has?'#EAF3DE':'#f5f4f0',color:has?'#3B6D11':'#ccc'}}>{has?'✓':'–'}</div>
                })}
              </div>
            </div>
          ))}
          <div style={{marginTop:10,background:'#f5f4f0',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#666'}}>
            {role==='admin'?'Full access to all 6 modules plus system configuration.':role==='team'?'Modules 01–05 on assigned projects. No partner management.':role==='partner'?'Project-scoped: M01, M02, M04, M05 for own project only.':'Read-only: M01 summary and M05 progress view only.'}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Notifications ─────────────────────────────────────────────────────────────
  const NotificationsView = () => (
    <div style={{padding:20}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="panel">
          <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>⚙ Event Routing {role!=='admin'&&<span style={{fontSize:10,color:'#aaa',fontWeight:400}}>(read-only)</span>}</div>
          {NOTIF_EVENTS.map(e=>(
            <div key={e.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:11,gap:8}}>
              <span style={{flex:1,color:'#333'}}>{e.label}</span>
              <div style={{display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{fontSize:9,color:'#aaa'}}>Teams</span>
                  {role==='admin' ? (
                    <div onClick={()=>setNotifToggles(t=>({...t,[e.key]:{...t[e.key],teams:!t[e.key].teams}}))}
                      style={{width:28,height:16,borderRadius:8,background:notifToggles[e.key]?.teams?'var(--mdi-gold)':'#ccc',position:'relative',cursor:'pointer',transition:'background 0.15s'}}>
                      <div style={{width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:notifToggles[e.key]?.teams?14:2,transition:'left 0.15s'}}/>
                    </div>
                  ) : (
                    <span style={{fontSize:10,padding:'1px 6px',borderRadius:5,background:e.teams?'#E6F1FB':'#f0f0ec',color:e.teams?'#185FA5':'#aaa'}}>{e.teams?'On':'Off'}</span>
                  )}
                </div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{fontSize:9,color:'#aaa'}}>Email</span>
                  {role==='admin' ? (
                    <div onClick={()=>setNotifToggles(t=>({...t,[e.key]:{...t[e.key],email:!t[e.key].email}}))}
                      style={{width:28,height:16,borderRadius:8,background:notifToggles[e.key]?.email?'var(--mdi-gold)':'#ccc',position:'relative',cursor:'pointer',transition:'background 0.15s'}}>
                      <div style={{width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:notifToggles[e.key]?.email?14:2,transition:'left 0.15s'}}/>
                    </div>
                  ) : (
                    <span style={{fontSize:10,padding:'1px 6px',borderRadius:5,background:e.email?'#FAEEDA':'#f0f0ec',color:e.email?'#854F0B':'#aaa'}}>{e.email?'On':'Off'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>📥 Notification Log</div>
          {NOTIFICATIONS.map(n=>(
            <div key={n.id} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
              <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,
                background:n.type==='success'?'#EAF3DE':n.type==='warn'?'#FAEEDA':n.type==='email'?'#FAEEDA':'#E6F1FB'}}>
                {n.type==='success'?'✓':n.type==='warn'?'⚠':n.type==='email'?'✉':'💬'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:500,fontSize:12}}>{n.title}</div>
                <div style={{fontSize:11,color:'#888'}}>{n.sub}</div>
              </div>
              <div style={{fontSize:10,color:'#aaa',flexShrink:0}}>{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── App shell ─────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <Topbar/>
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          {view==='dashboard' && <div style={{flex:1,overflowY:'auto'}}><DashboardView/></div>}
          {view==='projects' && <div style={{flex:1,overflowY:'auto'}}><ProjectsView/></div>}
          {view==='project-detail' && <ProjectDetailView/>}
          {view==='ifindy' && <IFindyView/>}
          {view==='roles' && <div style={{flex:1,overflowY:'auto'}}><RolesView/></div>}
          {view==='notifications' && <div style={{flex:1,overflowY:'auto'}}><NotificationsView/></div>}
        </div>
      </div>
    </div>
  )
}
