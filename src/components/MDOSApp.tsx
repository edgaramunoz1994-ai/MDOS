'use client'

import React, { useState } from 'react'
import { PROJECTS, NOTIFICATIONS, ACTIVITY, USERS, NOTIF_EVENTS, SCREENING_THRESHOLDS } from '@/data/mock'

const EMPTY_PROJECT_FORM = {
  name: '', address: '', apn: '', city: '', state: 'TX', market: 'austin',
  goal: 'RESIDENTIAL_SFH', method: 'THREEDCP', units: '', lotAcres: '',
  zoning: '', budgetMin: '', budgetMax: '', partner: '', notes: '',
}

type View = 'dashboard' | 'projects' | 'project-detail' | 'ifindy' | 'vertikaal' | 'roles' | 'notifications'
type Role = 'admin' | 'team' | 'partner' | 'investor'
type TabRole = Role

const ROLE_NAV: Record<Role, View[]> = {
  admin:    ['dashboard','projects','ifindy','vertikaal','roles','notifications'],
  team:     ['dashboard','projects','ifindy','vertikaal','notifications'],
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

// ── NPField — top-level so it never remounts ──────────────────────────────────
function NPField({label, children}: {label:string, children:React.ReactNode}) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3,fontWeight:500}}>{label}</label>
      {children}
    </div>
  )
}

// ── New Project Modal — top-level so inputs keep focus ────────────────────────
function NewProjectModal({
  show, step, form, success,
  onClose, onNext, onBack, onSubmit, onField
}: {
  show:boolean, step:number, form:Record<string,string>, success:boolean,
  onClose:()=>void, onNext:()=>void, onBack:()=>void, onSubmit:()=>void,
  onField:(k:string,v:string)=>void
}) {
  if (!show) return null
  const stepTitles = ['Project Identity','Site Parameters','Financial Setup']
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{background:'#fff',borderRadius:12,width:520,maxHeight:'88vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{background:'var(--mdi-green)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2}}>New Project</div>
            <div style={{fontSize:15,fontWeight:500,color:'#fff'}}>{stepTitles[step-1]}</div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {[1,2,3].map(s=>(
              <div key={s} style={{width:24,height:4,borderRadius:2,background:s<=step?'var(--mdi-gold)':'rgba(255,255,255,0.2)'}}/>
            ))}
            <button onClick={onClose} style={{marginLeft:10,background:'transparent',border:'none',color:'rgba(255,255,255,0.6)',fontSize:18,cursor:'pointer',lineHeight:1}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {success ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontWeight:500,fontSize:15,marginBottom:6}}>Project Created</div>
              <div style={{fontSize:12,color:'#888'}}>{form.name} has been added to your pipeline and is ready for iFindy screening.</div>
            </div>
          ) : step === 1 ? (
            <>
              <NPField label="Project Name *"><input value={form.name} onChange={e=>onField('name',e.target.value)} placeholder="e.g. Clarksville Phase 2"/></NPField>
              <NPField label="Full Address *"><input value={form.address} onChange={e=>onField('address',e.target.value)} placeholder="e.g. 123 Main St, Austin TX 78701"/></NPField>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <NPField label="City"><input value={form.city} onChange={e=>onField('city',e.target.value)} placeholder="Austin"/></NPField>
                <NPField label="State">
                  <select value={form.state} onChange={e=>onField('state',e.target.value)}>
                    <option value="TX">Texas</option><option value="FL">Florida</option>
                    <option value="UK">UK</option><option value="KAZ">Kazakhstan</option>
                    <option value="KSA">Saudi Arabia</option><option value="OTHER">Other</option>
                  </select>
                </NPField>
              </div>
              <NPField label="APN (optional)"><input value={form.apn} onChange={e=>onField('apn',e.target.value)} placeholder="e.g. 0103050202"/></NPField>
              <NPField label="Alpha JV Partner / GC"><input value={form.partner} onChange={e=>onField('partner',e.target.value)} placeholder="e.g. Modstone / Daniel Brown"/></NPField>
              <NPField label="Development Goal">
                <select value={form.goal} onChange={e=>onField('goal',e.target.value)}>
                  <option value="RESIDENTIAL_SFH">Residential SFH</option>
                  <option value="MULTIFAMILY_BTR">Multifamily / BTR</option>
                  <option value="HOSPITALITY_STR">Hospitality / STR</option>
                  <option value="MIXED_USE">Mixed-use</option>
                  <option value="INDUSTRIAL_LOGISTICS">Industrial / Logistics</option>
                </select>
              </NPField>
            </>
          ) : step === 2 ? (
            <>
              <NPField label="Primary Construction Method">
                <select value={form.method} onChange={e=>onField('method',e.target.value)}>
                  <option value="THREEDCP">3DCP — 3D Concrete Printing</option>
                  <option value="SCIP">SCIP — Structural Concrete Insulated Panel</option>
                  <option value="MODULAR">Modular</option>
                  <option value="TUNNEL_FORM">Tunnel-form</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </NPField>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <NPField label="Target Units"><input type="number" value={form.units} onChange={e=>onField('units',e.target.value)} placeholder="e.g. 4"/></NPField>
                <NPField label="Lot Size (acres)"><input type="number" value={form.lotAcres} onChange={e=>onField('lotAcres',e.target.value)} placeholder="e.g. 0.18"/></NPField>
              </div>
              <NPField label="Zoning Code"><input value={form.zoning} onChange={e=>onField('zoning',e.target.value)} placeholder="e.g. SF-3, MF-2, PUD"/></NPField>
              <NPField label="Initial Notes">
                <textarea value={form.notes} onChange={e=>onField('notes',e.target.value)}
                  placeholder="Deed restrictions, water access, infrastructure notes, etc."
                  style={{width:'100%',height:72,resize:'none',fontSize:12,padding:'6px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}/>
              </NPField>
            </>
          ) : (
            <>
              <div style={{background:'#f5f4f0',borderRadius:8,padding:'10px 12px',marginBottom:16,fontSize:11,color:'#666'}}>
                Budget range is used in Module 01 iFindy feasibility scoring to evaluate developer budget vs. estimated construction cost.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <NPField label="Budget Min ($M)"><input type="number" value={form.budgetMin} onChange={e=>onField('budgetMin',e.target.value)} placeholder="e.g. 1.5"/></NPField>
                <NPField label="Budget Max ($M)"><input type="number" value={form.budgetMax} onChange={e=>onField('budgetMax',e.target.value)} placeholder="e.g. 4.5"/></NPField>
              </div>
              <div style={{background:'#f5f4f0',borderRadius:8,padding:12,marginTop:8}}>
                <div style={{fontSize:11,fontWeight:500,color:'#555',marginBottom:8}}>Project Summary</div>
                {[
                  ['Name', form.name||'—'],['Address', form.address||'—'],['State', form.state],
                  ['Goal', form.goal.replace(/_/g,' ')],['Method', form.method],
                  ['Units', form.units||'—'],['Partner', form.partner||'—'],
                  ['Budget', form.budgetMin&&form.budgetMax?`$${form.budgetMin}M - $${form.budgetMax}M`:'—'],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                    <span style={{color:'#888'}}>{l}</span><span style={{fontWeight:500,maxWidth:280,textAlign:'right'}}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {!success && (
          <div style={{padding:'14px 24px',borderTop:'0.5px solid rgba(0,0,0,0.1)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fafaf8'}}>
            <button className="btn" onClick={onBack}>{step===1?'Cancel':'← Back'}</button>
            <div style={{fontSize:11,color:'#aaa'}}>Step {step} of 3</div>
            {step<3
              ? <button className="btn btn-primary" onClick={onNext} disabled={step===1&&!form.name}>Next →</button>
              : <button className="btn btn-primary" onClick={onSubmit}>Create Project ✓</button>
            }
          </div>
        )}
      </div>
    </div>
  )
}


// ── Schedule data from Clarksville Master Schedule ────────────────────────────
const CLARKSVILLE_SCHEDULE = [
  // PRE-CONSTRUCTION
  { phase:'PRE-CONSTRUCTION', task:'Finalize Construction Documents', status:'Complete', progress:100, startOffset:0, days:2, critical:false },
  { phase:'PRE-CONSTRUCTION', task:'Design', status:'Complete', progress:100, startOffset:0, days:62, critical:false },
  { phase:'PRE-CONSTRUCTION', task:'Well Permit', status:'Critical', progress:20, startOffset:62, days:30, critical:true },
  { phase:'PRE-CONSTRUCTION', task:'Truss Engineering', status:'Complete', progress:100, startOffset:0, days:30, critical:false },
  { phase:'PRE-CONSTRUCTION', task:'Contractor Authorization Forms', status:'Complete', progress:100, startOffset:0, days:1, critical:false },
  { phase:'PRE-CONSTRUCTION', task:'Residential Permit Approval', status:'Complete', progress:100, startOffset:0, days:106, critical:false },
  { phase:'PRE-CONSTRUCTION', task:'FPL Utility Easement', status:'Critical', progress:70, startOffset:0, days:1, critical:true },
  { phase:'PRE-CONSTRUCTION', task:'Order Materials', status:'Critical', progress:0, startOffset:0, days:14, critical:true },
  // HORIZONTAL CONSTRUCTION
  { phase:'HORIZONTAL', task:'Install Permit Box & Silt Fence', status:'Most Critical', progress:0, startOffset:108, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Earthwork Fill & Grade', status:'Scheduled', progress:10, startOffset:109, days:3, critical:false },
  { phase:'HORIZONTAL', task:'Gravel Fill', status:'Critical', progress:0, startOffset:110, days:2, critical:true },
  { phase:'HORIZONTAL', task:'Compaction Test 1', status:'Inspection', progress:0, startOffset:112, days:1, critical:false },
  { phase:'HORIZONTAL', task:'Formwork', status:'Critical', progress:0, startOffset:113, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Plumbing Rough-In', status:'Scheduled', progress:0, startOffset:114, days:1, critical:false },
  { phase:'HORIZONTAL', task:'Vapor Barrier', status:'Critical', progress:0, startOffset:115, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Slab Reinforcement', status:'Critical', progress:0, startOffset:115, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Electrical Rough-In', status:'Critical', progress:0, startOffset:116, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Pre-pour Slab Inspection', status:'Inspection', progress:0, startOffset:117, days:1, critical:false },
  { phase:'HORIZONTAL', task:'Slab Pour', status:'Critical', progress:0, startOffset:118, days:1, critical:true },
  { phase:'HORIZONTAL', task:'Slab Curing Period', status:'Critical', progress:0, startOffset:118, days:5, critical:true },
  { phase:'HORIZONTAL', task:'Septic System', status:'Critical', progress:20, startOffset:159, days:7, critical:true },
  { phase:'HORIZONTAL', task:'Well System Install', status:'Critical', progress:0, startOffset:160, days:2, critical:true },
  // PRINTING
  { phase:'PRINTING', task:'Develop G-Code', status:'Critical', progress:0, startOffset:118, days:3, critical:true },
  { phase:'PRINTING', task:'Test G-Code', status:'Critical', progress:0, startOffset:119, days:2, critical:true },
  { phase:'PRINTING', task:'Transport Printing Equipment to Site', status:'Critical', progress:0, startOffset:123, days:1, critical:true },
  { phase:'PRINTING', task:'Print Equipment Setup', status:'Critical', progress:0, startOffset:123, days:1, critical:true },
  { phase:'PRINTING', task:'Print Duration', status:'Critical', progress:0, startOffset:123, days:14, critical:true },
  { phase:'PRINTING', task:'Print Cure Period', status:'Critical', progress:0, startOffset:137, days:3, critical:true },
  { phase:'PRINTING', task:'3D Wall Sealant', status:'Critical', progress:0, startOffset:137, days:1, critical:true },
  // SHELL
  { phase:'SHELL', task:'Wall Cutouts', status:'Critical', progress:0, startOffset:123, days:14, critical:true },
  { phase:'SHELL', task:'Rough-in Electrical', status:'Critical', progress:0, startOffset:123, days:14, critical:true },
  { phase:'SHELL', task:'Insulation (Wall Cavity)', status:'Critical', progress:0, startOffset:123, days:14, critical:true },
  { phase:'SHELL', task:'Seal Control Joints', status:'Critical', progress:0, startOffset:137, days:2, critical:true },
  { phase:'SHELL', task:'Install Top Plate', status:'Critical', progress:0, startOffset:139, days:1, critical:true },
  { phase:'SHELL', task:'Roof Truss Install', status:'Critical', progress:0, startOffset:147, days:1, critical:true },
  { phase:'SHELL', task:'Roof Plywood Deck Install', status:'Critical', progress:0, startOffset:148, days:1, critical:true },
  { phase:'SHELL', task:'Roof Sheathing and Shingles Install', status:'Critical', progress:0, startOffset:150, days:1, critical:true },
  { phase:'SHELL', task:'Exterior Window and Door Install', status:'Critical', progress:0, startOffset:151, days:3, critical:true },
  { phase:'SHELL', task:'Dry-In Inspection', status:'Inspection', progress:0, startOffset:153, days:1, critical:false },
  { phase:'SHELL', task:'Exterior Painting', status:'Critical', progress:0, startOffset:153, days:1, critical:true },
  // CORE + MEP
  { phase:'CORE + MEP', task:'Interior Framing', status:'Critical', progress:0, startOffset:139, days:2, critical:true },
  { phase:'CORE + MEP', task:'HVAC Duct + Air Handler Install', status:'Critical', progress:0, startOffset:154, days:1, critical:true },
  { phase:'CORE + MEP', task:'Plumbing Top Out', status:'Critical', progress:0, startOffset:155, days:2, critical:true },
  { phase:'CORE + MEP', task:'Electrical Top Out', status:'Critical', progress:0, startOffset:157, days:2, critical:true },
  { phase:'CORE + MEP', task:'Roof and Interior Insulation', status:'Critical', progress:0, startOffset:159, days:1, critical:true },
  { phase:'CORE + MEP', task:'Open Wall Inspection', status:'Inspection', progress:0, startOffset:160, days:1, critical:false },
  { phase:'CORE + MEP', task:'Drywall', status:'Critical', progress:0, startOffset:161, days:4, critical:true },
  { phase:'CORE + MEP', task:'Interior Painting', status:'Critical', progress:0, startOffset:165, days:2, critical:true },
  { phase:'CORE + MEP', task:'Flooring', status:'Critical', progress:0, startOffset:167, days:2, critical:true },
  { phase:'CORE + MEP', task:'Cabinets and Counters', status:'Critical', progress:0, startOffset:169, days:2, critical:true },
  { phase:'CORE + MEP', task:'Electrical Trim-Out', status:'Critical', progress:0, startOffset:165, days:1, critical:true },
  { phase:'CORE + MEP', task:'Plumbing Trim-Out', status:'Critical', progress:0, startOffset:166, days:1, critical:true },
  { phase:'CORE + MEP', task:'HVAC Trim-Out', status:'Critical', progress:0, startOffset:167, days:1, critical:true },
  { phase:'CORE + MEP', task:'Power and HVAC Inspection', status:'Inspection', progress:0, startOffset:168, days:1, critical:false },
  // FINAL
  { phase:'FINAL', task:'Trim and Décor', status:'Critical', progress:0, startOffset:170, days:4, critical:true },
  { phase:'FINAL', task:'Exterior Fill + Grading + Topsoil', status:'Unassigned', progress:0, startOffset:170, days:2, critical:false },
  { phase:'FINAL', task:'Irrigation System Install', status:'Unassigned', progress:0, startOffset:172, days:2, critical:false },
  { phase:'FINAL', task:'Sod Install', status:'Unassigned', progress:0, startOffset:174, days:2, critical:false },
  { phase:'FINAL', task:'Final Punch List', status:'Unassigned', progress:0, startOffset:177, days:2, critical:false },
  { phase:'FINAL', task:'Final Inspection', status:'Inspection', progress:0, startOffset:179, days:1, critical:false },
  { phase:'FINAL', task:'Closeout and Occupancy Certificate', status:'Goal', progress:0, startOffset:180, days:7, critical:true },
]

const PHASE_COLORS: Record<string,string> = {
  'PRE-CONSTRUCTION': '#0C447C',
  'HORIZONTAL': '#854F0B',
  'PRINTING': '#085041',
  'SHELL': '#3C3489',
  'CORE + MEP': '#5F3089',
  'FINAL': '#3B6D11',
}

const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  'Complete':      {bg:'#EAF3DE',text:'#3B6D11'},
  'Critical':      {bg:'#FAEEDA',text:'#854F0B'},
  'Most Critical': {bg:'#FCEBEB',text:'#A32D2D'},
  'Scheduled':     {bg:'#E6F1FB',text:'#185FA5'},
  'Inspection':    {bg:'#EEEDFE',text:'#3C3489'},
  'Goal':          {bg:'#E1F5EE',text:'#085041'},
  'Unassigned':    {bg:'#f0f0ec',text:'#888'},
}


function ScheduleTab({p}: {p: any}) {
  const [schedView, setSchedView] = React.useState<'critical'|'gantt'>('critical')
  const tasks = p.id === 'clk-001' ? CLARKSVILLE_SCHEDULE : []
  const phases = Array.from(new Set(tasks.map((t:any) => t.phase)))
  const totalDays = tasks.length > 0 ? Math.max(...tasks.map((t:any) => t.startOffset + t.days)) : 0

  if (tasks.length === 0) return <ScheduleBuilder projectName={p.name}/>

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{marginBottom:12,padding:'12px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:500,fontSize:13}}>Clarksville Construction Schedule</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>Schedule Lead: Daniel Brown · West Lynn, Clarksville Texas · {tasks.length} tasks · {totalDays} day timeline</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            {(['critical','gantt'] as const).map(v => (
              <button key={v} onClick={()=>setSchedView(v)}
                style={{fontSize:11,padding:'5px 12px',borderRadius:7,border:`0.5px solid ${schedView===v?'var(--mdi-green)':'rgba(0,0,0,0.15)'}`,
                  background:schedView===v?'var(--mdi-green)':'#fff',color:schedView===v?'#fff':'#555',cursor:'pointer',fontWeight:schedView===v?500:400}}>
                {v==='critical'?'📋 Critical Path':'📊 Gantt Chart'}
              </button>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
          {Object.entries(STATUS_COLORS).map(([s,c]) => (
            <span key={s} style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:c.bg,color:c.text}}>{s}</span>
          ))}
        </div>
      </div>

      {schedView === 'critical' ? (
        /* ── Critical Path View ── */
        <div>
          {phases.map(phase => {
            const phaseTasks = tasks.filter((t:any) => t.phase === phase)
            const phaseColor = PHASE_COLORS[phase] || '#555'
            return (
              <div key={phase} style={{marginBottom:10}}>
                <div style={{background:phaseColor,color:'#fff',padding:'6px 14px',borderRadius:'8px 8px 0 0',fontSize:11,fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>{phase}</span>
                  <span style={{fontSize:10,opacity:0.7}}>{phaseTasks.filter((t:any)=>t.progress===100).length}/{phaseTasks.length} complete</span>
                </div>
                <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden'}}>
                  {/* Column headers */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 90px 80px 60px 80px',padding:'5px 12px',background:'#f5f4f0',fontSize:10,color:'#888',fontWeight:500,borderBottom:'0.5px solid rgba(0,0,0,0.08)'}}>
                    <span>Task</span><span>Status</span><span>Assigned To</span><span style={{textAlign:'center'}}>Progress</span><span style={{textAlign:'right'}}>Duration</span>
                  </div>
                  {phaseTasks.map((t:any, i:number) => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Unassigned']
                    return (
                      <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 80px 60px 80px',padding:'7px 12px',borderBottom:'0.5px solid rgba(0,0,0,0.05)',alignItems:'center',background:t.critical&&t.progress<100?'rgba(252,235,235,0.3)':'#fff'}}>
                        <div style={{fontSize:12,color:'#1a1a1a',display:'flex',alignItems:'center',gap:6}}>
                          {t.critical && t.progress<100 && <span style={{fontSize:10}}>🔴</span>}
                          {t.status==='Inspection' && <span style={{fontSize:10}}>🔍</span>}
                          {t.status==='Goal' && <span style={{fontSize:10}}>🏁</span>}
                          {t.status==='Complete' && <span style={{fontSize:10}}>✅</span>}
                          {t.task}
                        </div>
                        <span style={{fontSize:10,padding:'2px 6px',borderRadius:8,background:sc.bg,color:sc.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.status}</span>
                        <span style={{fontSize:11,color:'#888'}}>D. Brown</span>
                        <div style={{textAlign:'center'}}>
                          <div style={{background:'#e8e8e0',borderRadius:4,height:6,overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:4,background:t.progress===100?'#3B6D11':t.critical?'#E24B4A':'var(--mdi-gold)',width:`${t.progress}%`}}/>
                          </div>
                          <div style={{fontSize:9,color:'#aaa',marginTop:2}}>{t.progress}%</div>
                        </div>
                        <div style={{textAlign:'right',fontSize:11,color:'#555'}}>{t.days}d</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Gantt Chart View ── */
        <div className="panel" style={{overflowX:'auto',padding:'14px 0'}}>
          <div style={{minWidth: Math.max(900, totalDays * 4 + 240), position:'relative'}}>
            {/* Today line — scoped inside the chart container */}
            <div style={{position:'absolute',left:`${240 + 108*4}px`,top:0,bottom:0,width:2,background:'rgba(173,56,21,0.5)',pointerEvents:'none',zIndex:5}}/>
            {/* Timeline header */}
            <div style={{display:'flex',borderBottom:'0.5px solid rgba(0,0,0,0.1)',paddingBottom:6,marginBottom:4,paddingLeft:240}}>
              {Array.from({length:Math.ceil(totalDays/30)},(_,i) => (
                <div key={i} style={{width:i===Math.ceil(totalDays/30)-1?`${(totalDays%30||30)*4}px`:'120px',fontSize:10,color:'#888',flexShrink:0,textAlign:'center',borderRight:'0.5px solid rgba(0,0,0,0.06)',paddingRight:4}}>
                  Month {i+1}
                </div>
              ))}
            </div>
            {/* Week markers */}
            <div style={{display:'flex',marginBottom:8,paddingLeft:240,position:'relative'}}>
              {Array.from({length:Math.ceil(totalDays/7)},(_,i) => (
                <div key={i} style={{width:'28px',flexShrink:0,borderLeft:'0.5px solid rgba(0,0,0,0.05)',height:8}}/>
              ))}
            </div>
            {/* Rows */}
            {phases.map(phase => {
              const phaseTasks = tasks.filter((t:any) => t.phase === phase)
              const phaseColor = PHASE_COLORS[phase] || '#555'
              return (
                <React.Fragment key={phase}>
                  <div style={{display:'flex',alignItems:'center',background:phaseColor,padding:'4px 12px',marginBottom:2}}>
                    <div style={{width:228,fontSize:10,fontWeight:500,color:'#fff',letterSpacing:'0.06em',textTransform:'uppercase',flexShrink:0}}>{phase}</div>
                  </div>
                  {phaseTasks.map((t:any, i:number) => {
                    const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Unassigned']
                    const barLeft = t.startOffset * 4
                    const barWidth = Math.max(t.days * 4, 8)
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',padding:'2px 0',borderBottom:'0.5px solid rgba(0,0,0,0.04)',minHeight:28}}>
                        <div style={{width:240,fontSize:11,color:'#1a1a1a',flexShrink:0,paddingLeft:16,paddingRight:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
                          {t.critical && t.progress<100 && <span style={{fontSize:9,color:'#E24B4A',flexShrink:0}}>●</span>}
                          {t.task}
                        </div>
                        <div style={{flex:1,position:'relative',height:20}}>
                          <div style={{position:'absolute',left:`${barLeft}px`,width:`${barWidth}px`,height:16,top:2,borderRadius:4,
                            background:t.status==='Complete'?'#3B6D11':t.status==='Inspection'?'#534AB7':t.status==='Goal'?'#085041':t.critical?'#C9A227':'#6BAED6',
                            opacity:t.progress===0&&t.status!=='Complete'?0.7:1,
                            display:'flex',alignItems:'center',paddingLeft:4,overflow:'hidden'}}>
                            {t.progress > 0 && t.progress < 100 && (
                              <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${t.progress}%`,background:'rgba(255,255,255,0.3)',borderRadius:'4px 0 0 4px'}}/>
                            )}
                            {barWidth > 30 && <span style={{fontSize:9,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',zIndex:1,position:'relative'}}>{t.days}d</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </React.Fragment>
              )
            })}

          </div>
        </div>
      )}
    </div>
  )
}


// ── Schedule Builder Form — for projects without a pre-loaded schedule ─────────
const PHASE_OPTIONS = ['Pre-Construction','Site Work','Foundation','Framing','Mechanical/Electrical/Plumbing','Envelope','Interior','Final & Closeout','Custom']
const STATUS_OPTIONS = ['Critical','Most Critical','Scheduled w/ Sub','Inspection','Complete','Goal','Unassigned']
const EMPTY_TASK = { phase:'Pre-Construction', task:'', status:'Critical', progress:0, startOffset:0, days:1, critical:true }

function ScheduleBuilder({projectName}: {projectName:string}) {
  const [tasks, setTasks] = React.useState<any[]>([
    { phase:'Pre-Construction', task:'Site Survey', status:'Critical', progress:0, startOffset:0, days:2, critical:true },
    { phase:'Pre-Construction', task:'Permit Application', status:'Critical', progress:0, startOffset:2, days:30, critical:true },
    { phase:'Foundation', task:'Excavation', status:'Scheduled w/ Sub', progress:0, startOffset:32, days:3, critical:false },
    { phase:'Foundation', task:'Slab Pour', status:'Critical', progress:0, startOffset:35, days:1, critical:true },
  ])
  const [editIdx, setEditIdx] = React.useState<number|null>(null)
  const [draft, setDraft] = React.useState<any>({...EMPTY_TASK})
  const [view, setView] = React.useState<'form'|'critical'|'gantt'>('form')
  const [addingPhase, setAddingPhase] = React.useState('Pre-Construction')

  const phases = Array.from(new Set(tasks.map(t => t.phase)))
  const totalDays = tasks.length > 0 ? Math.max(...tasks.map(t => t.startOffset + t.days)) : 30

  const saveTask = () => {
    if (!draft.task.trim()) return
    if (editIdx !== null) {
      setTasks(prev => prev.map((t,i) => i===editIdx ? {...draft} : t))
      setEditIdx(null)
    } else {
      setTasks(prev => [...prev, {...draft}])
    }
    setDraft({...EMPTY_TASK, phase: draft.phase})
  }

  const deleteTask = (idx:number) => setTasks(prev => prev.filter((_,i) => i!==idx))
  const editTask = (idx:number) => { setDraft({...tasks[idx]}); setEditIdx(idx) }

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{marginBottom:12,padding:'12px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:500,fontSize:13}}>{projectName} — Construction Schedule</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>{tasks.length} tasks · {totalDays} day timeline</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            {(['form','critical','gantt'] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{fontSize:11,padding:'5px 12px',borderRadius:7,border:`0.5px solid ${view===v?'var(--mdi-green)':'rgba(0,0,0,0.15)'}`,
                  background:view===v?'var(--mdi-green)':'#fff',color:view===v?'#fff':'#555',cursor:'pointer'}}>
                {v==='form'?'✏️ Build':v==='critical'?'📋 Critical Path':'📊 Gantt'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'form' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {/* Task entry form */}
          <div className="panel">
            <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>{editIdx!==null?'✏️ Edit Task':'➕ Add Task'}</div>
            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Phase</label>
              <select value={draft.phase} onChange={e=>setDraft((d:any)=>({...d,phase:e.target.value}))} style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}>
                {PHASE_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Task Name *</label>
              <input value={draft.task} onChange={e=>setDraft((d:any)=>({...d,task:e.target.value}))} placeholder="e.g. Slab Pour" style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div>
                <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Start Day</label>
                <input type="number" min={0} value={draft.startOffset} onChange={e=>setDraft((d:any)=>({...d,startOffset:parseInt(e.target.value)||0}))} style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Duration (days)</label>
                <input type="number" min={1} value={draft.days} onChange={e=>setDraft((d:any)=>({...d,days:parseInt(e.target.value)||1}))} style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}/>
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Status</label>
              <select value={draft.status} onChange={e=>setDraft((d:any)=>({...d,status:e.target.value,critical:e.target.value.toLowerCase().includes('critical')}))}>
                {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>Progress: {draft.progress}%</label>
              <input type="range" min={0} max={100} step={10} value={draft.progress} onChange={e=>setDraft((d:any)=>({...d,progress:parseInt(e.target.value)}))} style={{width:'100%'}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={saveTask} disabled={!draft.task.trim()}>
                {editIdx!==null?'Update Task':'Add Task'}
              </button>
              {editIdx!==null && <button className="btn" onClick={()=>{setEditIdx(null);setDraft({...EMPTY_TASK})}}>Cancel</button>}
            </div>
          </div>

          {/* Task list */}
          <div className="panel">
            <div style={{fontWeight:500,fontSize:12,marginBottom:12}}>📋 Tasks ({tasks.length})</div>
            {tasks.length === 0 && <div style={{fontSize:12,color:'#aaa',textAlign:'center',padding:20}}>No tasks yet — add your first task</div>}
            <div style={{maxHeight:380,overflowY:'auto'}}>
              {phases.map(phase => (
                <div key={phase} style={{marginBottom:10}}>
                  <div style={{fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',color:'#fff',background:PHASE_COLORS[phase]||'#555',padding:'3px 8px',borderRadius:5,marginBottom:4,display:'inline-block'}}>{phase}</div>
                  {tasks.filter(t=>t.phase===phase).map((t,_i) => {
                    const globalIdx = tasks.indexOf(t)
                    const sc = STATUS_COLORS[t.status]||STATUS_COLORS['Unassigned']
                    return (
                      <div key={globalIdx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'#f5f4f0',borderRadius:7,marginBottom:4}}>
                        {t.critical && t.progress<100 && <span style={{fontSize:10,color:'#E24B4A',flexShrink:0}}>●</span>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.task}</div>
                          <div style={{fontSize:10,color:'#888'}}>Day {t.startOffset} · {t.days}d · <span style={{padding:'1px 5px',borderRadius:5,background:sc.bg,color:sc.text}}>{t.status}</span></div>
                        </div>
                        <button onClick={()=>editTask(globalIdx)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:13,color:'#888',padding:2}}>✏️</button>
                        <button onClick={()=>deleteTask(globalIdx)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:13,color:'#ccc',padding:2}}>✕</button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {tasks.length > 0 && (
              <button className="btn btn-primary" style={{width:'100%',marginTop:10,justifyContent:'center'}} onClick={()=>setView('critical')}>
                Generate Schedule →
              </button>
            )}
          </div>
        </div>
      )}

      {(view === 'critical' || view === 'gantt') && (
        <BuiltScheduleView tasks={tasks} view={view} totalDays={totalDays} phases={phases}/>
      )}
    </div>
  )
}

function BuiltScheduleView({tasks, view, totalDays, phases}: {tasks:any[], view:'critical'|'gantt', totalDays:number, phases:string[]}) {
  return view === 'critical' ? (
    <div>
      {phases.map(phase => {
        const phaseTasks = tasks.filter(t => t.phase === phase)
        const phaseColor = PHASE_COLORS[phase] || '#555'
        return (
          <div key={phase} style={{marginBottom:10}}>
            <div style={{background:phaseColor,color:'#fff',padding:'6px 14px',borderRadius:'8px 8px 0 0',fontSize:11,fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase',display:'flex',justifyContent:'space-between'}}>
              <span>{phase}</span>
              <span style={{fontSize:10,opacity:0.7}}>{phaseTasks.filter(t=>t.progress===100).length}/{phaseTasks.length} complete</span>
            </div>
            <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 90px 60px 80px',padding:'5px 12px',background:'#f5f4f0',fontSize:10,color:'#888',fontWeight:500,borderBottom:'0.5px solid rgba(0,0,0,0.08)'}}>
                <span>Task</span><span>Status</span><span style={{textAlign:'center'}}>Progress</span><span style={{textAlign:'right'}}>Duration</span>
              </div>
              {phaseTasks.map((t,i) => {
                const sc = STATUS_COLORS[t.status]||STATUS_COLORS['Unassigned']
                return (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 60px 80px',padding:'7px 12px',borderBottom:'0.5px solid rgba(0,0,0,0.05)',alignItems:'center',background:t.critical&&t.progress<100?'rgba(252,235,235,0.3)':'#fff'}}>
                    <div style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
                      {t.critical&&t.progress<100&&<span style={{fontSize:10}}>🔴</span>}
                      {t.status==='Inspection'&&<span style={{fontSize:10}}>🔍</span>}
                      {t.status==='Goal'&&<span style={{fontSize:10}}>🏁</span>}
                      {t.status==='Complete'&&<span style={{fontSize:10}}>✅</span>}
                      {t.task}
                    </div>
                    <span style={{fontSize:10,padding:'2px 6px',borderRadius:8,background:sc.bg,color:sc.text,whiteSpace:'nowrap'}}>{t.status}</span>
                    <div style={{textAlign:'center'}}>
                      <div style={{background:'#e8e8e0',borderRadius:4,height:6,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:4,background:t.progress===100?'#3B6D11':t.critical?'#E24B4A':'var(--mdi-gold)',width:`${t.progress}%`}}/>
                      </div>
                      <div style={{fontSize:9,color:'#aaa',marginTop:2}}>{t.progress}%</div>
                    </div>
                    <div style={{textAlign:'right',fontSize:11,color:'#555'}}>{t.days}d</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <div className="panel" style={{overflowX:'auto',padding:'14px 0'}}>
      <div style={{minWidth:Math.max(900,totalDays*4+240),position:'relative'}}>
        {/* Today line scoped inside chart */}
        <div style={{position:'absolute',left:`${240}px`,top:32,bottom:0,width:2,background:'rgba(173,56,21,0.5)',pointerEvents:'none',zIndex:5}}/>
        <div style={{display:'flex',borderBottom:'0.5px solid rgba(0,0,0,0.1)',paddingBottom:6,marginBottom:4,paddingLeft:240}}>
          {Array.from({length:Math.ceil(totalDays/30)},(_,i)=>(
            <div key={i} style={{width:'120px',fontSize:10,color:'#888',flexShrink:0,textAlign:'center',borderRight:'0.5px solid rgba(0,0,0,0.06)'}}>Month {i+1}</div>
          ))}
        </div>
        {phases.map(phase=>{
          const phaseTasks = tasks.filter(t=>t.phase===phase)
          const phaseColor = PHASE_COLORS[phase]||'#555'
          return (
            <React.Fragment key={phase}>
              <div style={{display:'flex',alignItems:'center',background:phaseColor,padding:'4px 12px',marginBottom:2}}>
                <div style={{width:228,fontSize:10,fontWeight:500,color:'#fff',letterSpacing:'0.06em',textTransform:'uppercase',flexShrink:0}}>{phase}</div>
              </div>
              {phaseTasks.map((t,i)=>{
                const barLeft = t.startOffset*4
                const barWidth = Math.max(t.days*4,8)
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',padding:'2px 0',borderBottom:'0.5px solid rgba(0,0,0,0.04)',minHeight:28}}>
                    <div style={{width:240,fontSize:11,flexShrink:0,paddingLeft:16,paddingRight:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
                      {t.critical&&t.progress<100&&<span style={{fontSize:9,color:'#E24B4A',flexShrink:0}}>●</span>}
                      {t.task}
                    </div>
                    <div style={{flex:1,position:'relative',height:20}}>
                      <div style={{position:'absolute',left:`${barLeft}px`,width:`${barWidth}px`,height:16,top:2,borderRadius:4,
                        background:t.status==='Complete'?'#3B6D11':t.status==='Inspection'?'#534AB7':t.status==='Goal'?'#085041':t.critical?'#C9A227':'#6BAED6',
                        display:'flex',alignItems:'center',paddingLeft:4,overflow:'hidden'}}>
                        {barWidth>30&&<span style={{fontSize:9,color:'#fff',whiteSpace:'nowrap',zIndex:1,position:'relative'}}>{t.days}d</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}


// ── Module 02 — VERTIKAAL BIM Generation ─────────────────────────────────────
function VertikaalView({screeningResult, screeningInput, onBack}: {screeningResult:any, screeningInput:any, onBack:()=>void}) {
  const [step, setStep] = React.useState<'brief'|'config'|'generating'|'ready'>('brief')
  const [bimConfig, setBimConfig] = React.useState({
    designSeries: 'A', stories: '1', totalSqft: '1420', unitCount: '1',
    roofType: 'gable', foundationType: 'slab', porchConfig: 'front',
    wallThickness: '150', ceilingHeight: '9', windowPackage: 'standard',
    exportFormats: { ifc: true, rvt: true, dwg: true, pdf: true, xlsx: true },
    roboticTarget: 'icon', generateGCode: true,
  })
  const [progress, setProgress] = React.useState(0)
  const [progressLabel, setProgressLabel] = React.useState('')

  const passed = screeningResult?.overall === 'PASS' || screeningResult?.overall === 'FLAG'
  const address = screeningInput?.address || '—'
  const method = screeningInput?.method || 'THREEDCP'
  const units = parseInt(screeningInput?.units) || 1

  // Simulate BIM generation progress
  const startGeneration = () => {
    setStep('generating')
    setProgress(0)
    const steps = [
      [10, 'Parsing parcel boundary from Regrid...'],
      [22, 'Applying zoning setbacks and height limits...'],
      [35, 'Generating floor plan from Design Series ' + bimConfig.designSeries + '...'],
      [48, 'Extruding 3DCP wall geometry...'],
      [58, 'Placing window and door openings...'],
      [67, 'Generating roof structure...'],
      [75, 'Running structural calculations...'],
      [83, 'Exporting IFC open BIM package...'],
      [90, 'Generating Revit model...'],
      [95, 'Compiling cost estimate spreadsheet...'],
      [100, 'BIM package ready ✓'],
    ]
    let i = 0
    const tick = () => {
      if (i < steps.length) {
        setProgress(steps[i][0] as number)
        setProgressLabel(steps[i][1] as string)
        i++
        setTimeout(tick, 420)
      } else {
        setTimeout(() => setStep('ready'), 600)
      }
    }
    tick()
  }

  const BIM_FILES = [
    { format:'IFC',  filename:`${screeningInput?.market?.split(',')[0]?.replace(' ','_')||'Project'}_DS${bimConfig.designSeries}_v1_openBIM.ifc`,  size:'22.1 MB', color:'#EEEDFE', tc:'#3C3489' },
    { format:'RVT',  filename:`${screeningInput?.market?.split(',')[0]?.replace(' ','_')||'Project'}_DS${bimConfig.designSeries}_v1_Revit2024.rvt`, size:'41.8 MB', color:'#E6F1FB', tc:'#0C447C' },
    { format:'DWG',  filename:`${screeningInput?.market?.split(',')[0]?.replace(' ','_')||'Project'}_DS${bimConfig.designSeries}_v1_SitePlan.dwg`,  size:'3.4 MB',  color:'#FAEEDA', tc:'#633806' },
    { format:'XLSX', filename:`${screeningInput?.market?.split(',')[0]?.replace(' ','_')||'Project'}_DS${bimConfig.designSeries}_v1_CostEstimate.xlsx`, size:'0.9 MB', color:'#EAF3DE', tc:'#27500A' },
    { format:'PDF',  filename:`${screeningInput?.market?.split(',')[0]?.replace(' ','_')||'Project'}_DS${bimConfig.designSeries}_v1_PermitSet.pdf`, size:'12.6 MB', color:'#FCEBEB', tc:'#791F1F' },
  ]

  return (
    <div style={{padding:20}}>
      {/* Module header */}
      <div style={{background:'var(--mdi-green)',borderRadius:10,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,letterSpacing:'0.1em',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',marginBottom:2}}>Module 02</div>
          <div style={{fontSize:16,fontWeight:500,color:'#fff'}}>VERTIKAAL — BIM Generation</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2}}>{address}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* Step tracker */}
          {['brief','config','generating','ready'].map((s,i) => (
            <div key={s} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,
                background:step===s?'var(--mdi-gold)':['brief','config','generating','ready'].indexOf(step)>i?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)',
                color:step===s?'var(--mdi-green)':'rgba(255,255,255,0.7)'}}>
                {['brief','config','generating','ready'].indexOf(step)>i?'✓':i+1}
              </div>
              {i<3&&<div style={{width:20,height:1,background:'rgba(255,255,255,0.2)'}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* M01 → M02 handoff banner */}
      {screeningResult && (
        <div style={{background: screeningResult.overall==='PASS'?'#EAF3DE':'#FAEEDA', border:`0.5px solid ${screeningResult.overall==='PASS'?'#639922':'#BA7517'}`, borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:20}}>{screeningResult.overall==='PASS'?'✅':'⚠️'}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:500,color:screeningResult.overall==='PASS'?'#27500A':'#633806'}}>
              M01 Feasibility {screeningResult.overall==='PASS'?'Passed':'Flagged'} — Score {screeningResult.score}/100
            </div>
            <div style={{fontSize:11,color:screeningResult.overall==='PASS'?'#3B6D11':'#854F0B',marginTop:1}}>
              {screeningResult.passes} dimensions passed · {screeningResult.flags} flagged · {method} method · {units} unit{units>1?'s':''}
            </div>
          </div>
          <button className="btn" style={{fontSize:11}} onClick={onBack}>← Back to M01</button>
        </div>
      )}

      {step === 'brief' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:13,marginBottom:4}}>What is VERTIKAAL?</div>
            <div style={{fontSize:12,color:'#555',lineHeight:1.7,marginBottom:14}}>
              VERTIKAAL is a proprietary BIM automation engine licensed by MDI. It takes the feasibility-cleared parcel data from M01 and generates a complete 5D BIM package — geometry, structure, MEP routing, cost estimate, and permit-ready drawings — in minutes rather than weeks.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[
                {icon:'📐', title:'Parametric Design Series', desc:"Choose from MDI's Design Series library (A-F) pre-optimized for 3DCP and SCIP"},
                {icon:'📦', title:'Multi-format Export', desc:'IFC, Revit, DWG, PDF permit set, and XLSX cost estimate generated simultaneously'},
                {icon:'🤖', title:'Robotic Code Ready', desc:'STL and G-code export for ICON Titan and RIC Robotics included automatically'},
                {icon:'💰', title:'5D Cost Estimate', desc:'Live RSMeans-linked cost estimate updates as you change design parameters'},
              ].map(f=>(
                <div key={f.title} style={{display:'flex',gap:10,padding:'8px 10px',background:'#f5f4f0',borderRadius:8}}>
                  <div style={{fontSize:18,flexShrink:0}}>{f.icon}</div>
                  <div><div style={{fontSize:12,fontWeight:500}}>{f.title}</div><div style={{fontSize:11,color:'#888',marginTop:1}}>{f.desc}</div></div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>setStep('config')}>
              Configure BIM Parameters →
            </button>
          </div>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:13,marginBottom:12}}>Parcel Inputs from M01</div>
            {[
              ['Address', address],
              ['Construction Method', method],
              ['Target Units', String(units)],
              ['Lot Size', screeningInput?.lot ? screeningInput.lot + ' acres' : '—'],
              ['Zoning', screeningInput?.zoning || '—'],
              ['Goal', (screeningInput?.goal||'').replace(/_/g,' ')],
              ['M01 Score', screeningResult ? screeningResult.score + '/100' : 'Not run'],
            ].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:12}}>
                <span style={{color:'#888'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:14,background:'#f5f4f0',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#666'}}>
              📌 VERTIKAAL uses the parcel boundary from Regrid and the zoning setbacks from Municode to automatically position the building footprint on the lot.
            </div>
          </div>
        </div>
      )}

      {step === 'config' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:13,marginBottom:12}}>🏗 Design Parameters</div>
            {[
              {label:'Design Series', key:'designSeries', type:'select', opts:['A','B','C','D','E','F'], desc:'A = compact SFH, B = open plan, C = courtyard, D = duplex, E = tri-plex, F = quad'},
              {label:'Stories', key:'stories', type:'select', opts:['1','2']},
              {label:'Total Sqft (per unit)', key:'totalSqft', type:'number', placeholder:'e.g. 1420'},
              {label:'Roof Type', key:'roofType', type:'select', opts:['gable','hip','flat','shed']},
              {label:'Foundation', key:'foundationType', type:'select', opts:['slab','crawlspace','basement']},
              {label:'Porch Config', key:'porchConfig', type:'select', opts:['front','rear','wraparound','none']},
              {label:'Wall Thickness (mm)', key:'wallThickness', type:'select', opts:['100','150','200','250']},
              {label:'Ceiling Height (ft)', key:'ceilingHeight', type:'select', opts:['8','9','10','11','12']},
              {label:'Window Package', key:'windowPackage', type:'select', opts:['standard','energy-plus','impact-resistant']},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:11,color:'#888',marginBottom:3}}>{f.label}</label>
                {f.type==='select'
                  ? <select value={(bimConfig as any)[f.key]} onChange={e=>setBimConfig(c=>({...c,[f.key]:e.target.value}))} style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}>
                      {f.opts!.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type="number" value={(bimConfig as any)[f.key]} onChange={e=>setBimConfig(c=>({...c,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7}}/>
                }
                {f.desc && <div style={{fontSize:10,color:'#aaa',marginTop:2}}>{f.desc}</div>}
              </div>
            ))}
          </div>
          <div className="panel">
            <div style={{fontWeight:500,fontSize:13,marginBottom:12}}>📦 Export Configuration</div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'#888',marginBottom:8}}>BIM Deliverables</div>
              {[
                {key:'ifc',  label:'IFC — Open BIM (required)', locked:true},
                {key:'rvt',  label:'RVT — Autodesk Revit 2024'},
                {key:'dwg',  label:'DWG — AutoCAD Site Plan'},
                {key:'pdf',  label:'PDF — Permit Set'},
                {key:'xlsx', label:'XLSX — 5D Cost Estimate'},
              ].map(f=>(
                <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                  <span style={{fontSize:12,color:f.locked?'#aaa':'#1a1a1a'}}>{f.label}</span>
                  <div onClick={()=>{ if(!f.locked) setBimConfig(c=>({...c,exportFormats:{...c.exportFormats,[f.key]:!(c.exportFormats as any)[f.key]}}))}}
                    style={{width:28,height:16,borderRadius:8,background:(bimConfig.exportFormats as any)[f.key]?'var(--mdi-gold)':'#ccc',position:'relative',cursor:f.locked?'default':'pointer',transition:'background 0.15s'}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:(bimConfig.exportFormats as any)[f.key]?14:2,transition:'left 0.15s'}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'#888',marginBottom:8}}>Robotic Code Output</div>
              {[
                {key:'icon',   label:'ICON Titan — G-code print sequence'},
                {key:'ric',    label:'RIC Robotics — Print package'},
              ].map(f=>(
                <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                  <span style={{fontSize:12}}>{f.label}</span>
                  <div onClick={()=>setBimConfig(c=>({...c,roboticTarget:f.key}))}
                    style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${bimConfig.roboticTarget===f.key?'var(--mdi-green)':'#ccc'}`,background:bimConfig.roboticTarget===f.key?'var(--mdi-green)':'transparent',cursor:'pointer'}}/>
                </div>
              ))}
            </div>
            <div style={{background:'#f5f4f0',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:11,color:'#666'}}>
              <div style={{fontWeight:500,marginBottom:4}}>Estimated Outputs</div>
              <div>Design Series {bimConfig.designSeries} · {bimConfig.stories}-story · {parseInt(bimConfig.totalSqft)*units} sqft total</div>
              <div style={{marginTop:2}}>Est. concrete: ~{Math.round(parseInt(bimConfig.totalSqft||'1000')*0.18*units)} m³ · Est. print time: {Math.round(parseInt(bimConfig.totalSqft||'1000')*0.012*units)} hrs</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={()=>setStep('brief')}>← Back</button>
              <button className="btn btn-primary" style={{flex:2,justifyContent:'center'}} onClick={startGeneration}>
                Generate BIM Package ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="panel" style={{textAlign:'center',padding:'50px 30px'}}>
          <div style={{fontSize:36,marginBottom:16}}>⚙️</div>
          <div style={{fontWeight:500,fontSize:15,marginBottom:6}}>Generating BIM Package...</div>
          <div style={{fontSize:12,color:'#888',marginBottom:24,minHeight:20}}>{progressLabel}</div>
          <div style={{background:'#e8e8e0',borderRadius:8,height:10,overflow:'hidden',maxWidth:400,margin:'0 auto 12px'}}>
            <div style={{height:'100%',background:'var(--mdi-green)',borderRadius:8,width:`${progress}%`,transition:'width 0.4s ease'}}/>
          </div>
          <div style={{fontSize:13,fontWeight:500,color:'var(--mdi-green)'}}>{progress}%</div>
          <div style={{fontSize:11,color:'#aaa',marginTop:20}}>Design Series {bimConfig.designSeries} · {bimConfig.stories}-story · {bimConfig.totalSqft} sqft</div>
        </div>
      )}

      {step === 'ready' && (
        <div>
          <div style={{background:'#EAF3DE',border:'0.5px solid #639922',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontSize:22}}>✅</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'#27500A'}}>BIM Package Generated Successfully</div>
              <div style={{fontSize:11,color:'#3B6D11',marginTop:1}}>Design Series {bimConfig.designSeries} · {bimConfig.stories}-story · {bimConfig.totalSqft} sqft · {units} unit{units>1?'s':''} · {address}</div>
            </div>
            <button className="btn" style={{fontSize:11}}>📤 Share with Partner</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="panel">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontWeight:500,fontSize:13}}>📦 BIM Deliverables</div>
                <button className="btn btn-primary" style={{fontSize:11,padding:'4px 10px'}}>↓ Download All</button>
              </div>
              {BIM_FILES.map(f=>(
                <div key={f.format} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                  <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:5,background:f.color,color:f.tc,flexShrink:0,width:36,textAlign:'center'}}>{f.format}</span>
                  <span style={{fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.filename}</span>
                  <span style={{fontSize:10,color:'#aaa',flexShrink:0}}>{f.size}</span>
                  <button className="btn" style={{padding:'3px 8px',fontSize:11,flexShrink:0}}>↓</button>
                </div>
              ))}
              <div style={{marginTop:12,background:'#f5f4f0',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#666'}}>
                🔒 IP: Design Series {bimConfig.designSeries} copyright MDI. BIM exports are partner property — unrestricted download.
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="panel" style={{marginBottom:0}}>
                <div style={{fontWeight:500,fontSize:13,marginBottom:10}}>🤖 Robotic Code Output</div>
                {[
                  {label:'ICON Titan G-code', file:`print_seq_DS${bimConfig.designSeries}_v1.gcode`, size:'5.2 MB', color:'#E1F5EE', tc:'#085041'},
                  {label:'RIC Robotics Package', file:`ric_DS${bimConfig.designSeries}_v1.pkg`, size:'3.8 MB', color:'#EEEDFE', tc:'#3C3489'},
                  {label:'STL (printable geometry)', file:`DS${bimConfig.designSeries}_walls_v1.stl`, size:'18.4 MB', color:'#f0f0ec', tc:'#555'},
                ].map(f=>(
                  <div key={f.label} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                    <span style={{fontSize:10,padding:'2px 6px',borderRadius:5,background:f.color,color:f.tc,flexShrink:0}}>{f.label.split(' ')[0]}</span>
                    <span style={{fontSize:11,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.file}</span>
                    <span style={{fontSize:10,color:'#aaa'}}>{f.size}</span>
                    <button className="btn" style={{padding:'3px 8px',fontSize:11}}>↓</button>
                  </div>
                ))}
              </div>
              <div className="panel" style={{marginBottom:0}}>
                <div style={{fontWeight:500,fontSize:13,marginBottom:10}}>📊 5D Cost Summary</div>
                {[
                  ['Construction (3DCP)', `$${Math.round(parseInt(bimConfig.totalSqft||'1000')*units*155).toLocaleString()}`],
                  ['Materials', `$${Math.round(parseInt(bimConfig.totalSqft||'1000')*units*62).toLocaleString()}`],
                  ['MEP Rough-in', `$${Math.round(parseInt(bimConfig.totalSqft||'1000')*units*38).toLocaleString()}`],
                  ['Finishes', `$${Math.round(parseInt(bimConfig.totalSqft||'1000')*units*45).toLocaleString()}`],
                  ['Total Estimate', `$${Math.round(parseInt(bimConfig.totalSqft||'1000')*units*300).toLocaleString()}`],
                ].map(([l,v],i)=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:12,fontWeight:i===4?500:400,background:i===4?'transparent':'transparent'}}>
                    <span style={{color:i===4?'#1a1a1a':'#888'}}>{l}</span>
                    <span style={{color:i===4?'var(--mdi-green)':'#1a1a1a'}}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{justifyContent:'center',padding:'10px'}} onClick={()=>alert('Advancing to Module 03 — Robotic Code Generation (coming soon)')}>
                → Advance to M03 Robotic Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ── AI Notes summarization — calls Claude API to summarize transcript ──────────
async function handleNotesFile(
  file: File,
  projectId: string,
  setUploading: (v:boolean)=>void,
  setUploadProgress: (v:string)=>void,
  setUploadFileName: (v:string)=>void,
  setUploadPreview: (v:string)=>void,
  setUploadMode: (v:boolean)=>void,
  addComm: (id:string, body:string, author:string)=>void,
  authorName: string
) {
  setUploadFileName(file.name)
  setUploading(true)
  setUploadProgress('Reading file...')

  try {
    // Read file as base64 — works for all formats including binary docx/pdf
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string || ''
        resolve(result.includes(',') ? result.split(',')[1] : result)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

    if (!base64Data) throw new Error('File appears to be empty')

    setUploadProgress('Parsing file and sending to Claude...')

    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType: file.type,
        fileName: file.name,
        projectId
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err?.error || 'Server error ' + response.status)
    }

    const data = await response.json()
    const summary = data.summary || ''

    if (!summary) throw new Error('No summary returned')

    setUploadProgress('Summary ready')
    setUploading(false)
    setUploadPreview(summary)

  } catch (err: any) {
    setUploading(false)
    setUploadProgress('')
    setUploadPreview('Error: ' + (err.message || 'Something went wrong. Please try again.'))
    setUploadFileName('error')
  }
}


export default function MDOSApp() {
  const [role, setRole] = useState<Role>('admin')
  const [view, setView] = useState<View>('dashboard')
  const [activeProject, setActiveProject] = useState(PROJECTS[0])
  const [commsMap, setCommsMap] = useState<Record<string,{author:string,date:string,body:string}[]>>(
    () => Object.fromEntries(PROJECTS.map(p => [p.id, p.comms]))
  )
  const [newNote, setNewNote] = useState('')
  const [noteAuthor, setNoteAuthor] = useState('')
  const [projectTab, setProjectTab] = useState<'overview'|'bim'|'refax'|'twin'|'schedule'>('overview')
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
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectStep, setNewProjectStep] = useState(1)
  const [newProjectForm, setNewProjectForm] = useState(EMPTY_PROJECT_FORM)
  const [projects, setProjects] = useState(PROJECTS)
  const [newProjectSuccess, setNewProjectSuccess] = useState(false)

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
        {nav.includes('ifindy') && <NavItem icon="🔍" label="Land Feasibility" id="ifindy" current={view} set={setView}/>}
        {nav.includes('vertikaal') && <NavItem icon="📐" label="M02 VERTIKAAL BIM" id="vertikaal" current={view} set={setView}/>}
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
  const titles: Record<View,string> = { dashboard:'Dashboard', projects:'Projects', 'project-detail':activeProject.name, ifindy:'Module 01 — Land Feasibility Screening', vertikaal:'Module 02 — VERTIKAAL BIM Generation', roles:'Roles & Access', notifications:'Notifications' }
  const Topbar = () => (
    <div style={{background:'#fff',borderBottom:'0.5px solid rgba(0,0,0,0.1)',padding:'10px 20px',display:'flex',alignItems:'center',gap:12}}>
      {view==='project-detail' && <button className="btn" onClick={()=>setView('projects')} style={{marginRight:4}}>← Projects</button>}
      <div style={{flex:1,fontSize:15,fontWeight:500}}>{titles[view]}</div>
      <div style={{display:'flex',alignItems:'center',gap:7,background:'#f5f4f0',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:7,padding:'5px 10px',width:180}}>
        <span style={{color:'#aaa',fontSize:13}}>⌕</span>
        <input type="text" placeholder="Search projects..." style={{border:'none',background:'transparent',padding:0,width:'100%'}}/>
      </div>
      <div style={{position:'relative',cursor:'pointer',padding:5,borderRadius:7,border:'0.5px solid rgba(0,0,0,0.1)',background:'#f5f4f0'}} onClick={()=>setView('notifications')}>
        <span style={{fontSize:18}}>🔔</span>
        <span style={{position:'absolute',top:3,right:3,width:8,height:8,borderRadius:'50%',background:'var(--mdi-gold)',display:'block'}}/>
      </div>
    </div>
  )

  // ── Dashboard view ────────────────────────────────────────────────────────────
  const DashboardView = () => {
    const visibleProjects = role === 'partner' ? projects.slice(0,2) : projects.slice(0,4)
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
    const visible = role==='partner' ? projects.slice(0,2) : projects
    return (
      <div style={{padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div className="section-label" style={{marginBottom:0}}>All Projects ({visible.length})</div>
          {(role==='admin'||role==='team') && <button className="btn btn-primary" onClick={()=>{setShowNewProject(true);setNewProjectStep(1);setNewProjectForm(EMPTY_PROJECT_FORM);setNewProjectSuccess(false)}}>+ New Project</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {visible.map(p=>(
            <div key={p.id} className="card" style={{padding:'14px 16px',cursor:'pointer',position:'relative'}} onClick={()=>goProject(p)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div><div style={{fontWeight:500,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:'#888',marginTop:1}}>{p.market}</div></div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span className={`pill pill-${p.status.toLowerCase()}`}>{STATUS_LABELS[p.status]}</span>
                  {(role==='admin'||role==='team') && <button onClick={e=>{e.stopPropagation();deleteProject(p.id)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:14,color:'#ccc',padding:'0 2px',lineHeight:1}} title="Delete project">✕</button>}
                </div>
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
            {(['overview','bim','refax','twin','schedule'] as const).map(t=>(
              <div key={t} className={`tab${projectTab===t?' active':''}`} onClick={()=>setProjectTab(t)}>
                {t==='overview'?'⊞ Overview':t==='bim'?'📦 BIM & STL':t==='refax'?'🧠 REfax Report':t==='twin'?'📡 Digital Twin':'📅 Schedule'}
              </div>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:16,background:'#f5f4f0'}}>
            {projectTab==='overview' && <OverviewTab p={p}/>}
            {projectTab==='bim' && <BimTab p={p}/>}
            {projectTab==='refax' && <RefaxTab p={p}/>}
            {projectTab==='twin' && <TwinTab p={p}/>}
          {projectTab==='schedule' && <ScheduleTab p={p}/>}
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

  const OverviewTab = ({p}:{p:typeof PROJECTS[0]}) => {
    const comms = commsMap[p.id] || p.comms
    const [draft, setDraft] = useState('')
    const [draftAuthor, setDraftAuthor] = useState('')
    const [expanded, setExpanded] = useState(false)
    const [uploadMode, setUploadMode] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [uploadFileName, setUploadFileName] = useState('')
    const [uploadPreview, setUploadPreview] = useState('')
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
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
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:500,fontSize:12}}>
              💬 Communication Log
              <span style={{fontSize:11,color:'#aaa',fontWeight:400,marginLeft:6}}>({comms.length})</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button className="btn" style={{fontSize:11}}
                onClick={()=>{setUploadMode(u=>!u);setExpanded(false);setUploadFileName('');setUploadPreview('')}}>
                {uploadMode ? '✕ Cancel' : '🎙 AI Notes'}
              </button>
              <button className="btn" onClick={()=>{setExpanded(e=>!e);setUploadMode(false)}} style={{fontSize:11}}>
                {expanded ? '✕ Cancel' : '+ Add Note'}
              </button>
            </div>
          </div>
          {expanded && (
            <div style={{background:'#f0f7f4',border:'0.5px solid #b8ddd0',borderRadius:8,padding:12,marginBottom:12}}>
              <div style={{marginBottom:8}}>
                <label style={{display:'block',fontSize:11,color:'#555',marginBottom:3,fontWeight:500}}>Your name</label>
                <input value={draftAuthor} onChange={e=>setDraftAuthor(e.target.value)}
                  placeholder={user.name}
                  style={{width:'100%',fontSize:12,padding:'5px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7,background:'#fff'}}/>
              </div>
              <div style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:11,color:'#555',marginBottom:3,fontWeight:500}}>Note *</label>
                <textarea value={draft} onChange={e=>setDraft(e.target.value)}
                  placeholder="Add a project note, update, or action item..."
                  style={{width:'100%',height:80,resize:'vertical',fontSize:12,padding:'6px 8px',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:7,background:'#fff',fontFamily:'inherit'}}/>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button className="btn" style={{fontSize:11}} onClick={()=>{setExpanded(false);setDraft('');setDraftAuthor('')}}>Cancel</button>
                <button className="btn btn-primary" style={{fontSize:11}} disabled={!draft.trim()}
                  onClick={()=>{addComm(p.id,draft,draftAuthor);setExpanded(false);setDraftAuthor('')}}>
                  Post Note
                </button>
              </div>
            </div>
          )}
          {uploadMode && (
            <div style={{background:'#EEF0FE',border:'0.5px solid #b0b8f0',borderRadius:8,padding:12,marginBottom:12}}>
              <div style={{fontWeight:500,fontSize:12,marginBottom:8,color:'#3C3489',display:'flex',alignItems:'center',gap:6}}>
                🎙 Upload AI Notetaker Transcript
              </div>
              <div style={{fontSize:11,color:'#534AB7',marginBottom:10,lineHeight:1.5}}>
                Upload a .txt, .md, or .docx transcript from Otter.ai, Fireflies, Zoom, or any AI notetaker.
                Claude will summarize it into a concise project communication log entry.
              </div>
              {!uploadFileName ? (
                <div
                  style={{border:'1.5px dashed #b0b8f0',borderRadius:8,padding:'24px 16px',textAlign:'center',cursor:'pointer',background:'rgba(255,255,255,0.6)'}}
                  onClick={()=>document.getElementById('notes-upload-'+p.id)?.click()}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) handleNotesFile(file, p.id, setUploading, setUploadProgress, setUploadFileName, setUploadPreview, setUploadMode, addComm, user.name)
                  }}>
                  <div style={{fontSize:28,marginBottom:6}}>📄</div>
                  <div style={{fontSize:12,color:'#534AB7',fontWeight:500}}>Drop transcript file here</div>
                  <div style={{fontSize:11,color:'#888',marginTop:3}}>.txt · .md · .docx · .pdf — max 2MB</div>
                  <input id={'notes-upload-'+p.id} type="file" accept=".txt,.md,.docx,.pdf" style={{display:'none'}}
                    onChange={e=>{
                      const file = e.target.files?.[0]
                      if (file) handleNotesFile(file, p.id, setUploading, setUploadProgress, setUploadFileName, setUploadPreview, setUploadMode, addComm, user.name)
                    }}/>
                </div>
              ) : uploading ? (
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:24,marginBottom:8}}>✨</div>
                  <div style={{fontWeight:500,fontSize:12,marginBottom:4,color:'#3C3489'}}>Claude is summarizing...</div>
                  <div style={{fontSize:11,color:'#534AB7',marginBottom:12}}>{uploadProgress}</div>
                  <div style={{background:'rgba(255,255,255,0.6)',borderRadius:6,height:6,overflow:'hidden',maxWidth:300,margin:'0 auto'}}>
                    <div style={{height:'100%',background:'#534AB7',borderRadius:6,width:'60%',animation:'none'}}/>
                  </div>
                </div>
              ) : uploadPreview ? (
                <div>
                  <div style={{fontSize:11,color:'#888',marginBottom:6}}>
                    📄 <strong>{uploadFileName}</strong> — summary ready
                  </div>
                  <div style={{background:'rgba(255,255,255,0.8)',borderRadius:7,padding:'10px 12px',fontSize:11,color:'#333',lineHeight:1.6,marginBottom:10,maxHeight:160,overflowY:'auto',border:'0.5px solid #b0b8f0'}}>
                    {uploadPreview}
                  </div>
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                    <button className="btn" style={{fontSize:11}} onClick={()=>{setUploadFileName('');setUploadPreview('')}}>
                      ↺ Re-upload
                    </button>
                    <button className="btn btn-primary" style={{fontSize:11,background:'#3C3489',borderColor:'#3C3489'}}
                      onClick={()=>{
                        addComm(p.id, "📋 Meeting Summary (AI):\n\n" + uploadPreview, user.name)
                        setUploadMode(false)
                        setUploadFileName('')
                        setUploadPreview('')
                      }}>
                      Post to Log ✓
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {comms.length===0 && !expanded && !uploadMode && (
            <div style={{fontSize:12,color:'#aaa',textAlign:'center',padding:'20px 0'}}>No communications yet — add the first note</div>
          )}
          {comms.map((c:any,i:number)=>(
            <div key={i} style={{background:'#f5f4f0',borderRadius:8,padding:'9px 10px',marginBottom:8,
              borderLeft:i===0&&(commsMap[p.id]||[]).length>(p.comms||[]).length?'3px solid var(--mdi-gold)':'3px solid transparent'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'var(--mdi-green)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:500,flexShrink:0}}>
                    {c.author.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <span style={{fontWeight:500,fontSize:11}}>{c.author}</span>
                </div>
                <span style={{fontSize:10,color:'#aaa'}}>{c.date}</span>
              </div>
              <div style={{fontSize:11,color:'#555',lineHeight:1.5,paddingLeft:26}}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }


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
            <div style={{fontSize:11,color:'#0F6E56',lineHeight:1.5}}>Projected unit values of ${(r.projectedUnitMin/1000).toFixed(0)}K-${(r.projectedUnitMax/1000).toFixed(0)}K for 3D-printed homes in this submarket. REAI projects a {r.pricePremiumPct}% price premium over traditional construction — directly supports MDI project feasibility and investor narrative. 5-year appreciation outlook: +{r.appreciation5yr}% driven by supply constraint and buyer demographics.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[
              {l:'Median sale price',v:`$${r.medianSalePricePerSqft}/sqft`,s:`Zillow HVI: +${r.appreciationYoy}% YoY`},
              {l:'Projected unit range',v:`$${(r.projectedUnitMin/1000).toFixed(0)}K-$${(r.projectedUnitMax/1000).toFixed(0)}K`,s:'3DCP new build comps'},
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
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>setView('vertikaal')}>→ Advance to M02</button>
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
                  return <div key={r} style={{width:28,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,background:has?'#EAF3DE':'#f5f4f0',color:has?'#3B6D11':'#ccc'}}>{has?'✓':'-'}</div>
                })}
              </div>
            </div>
          ))}
          <div style={{marginTop:10,background:'#f5f4f0',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#666'}}>
            {role==='admin'?'Full access to all 6 modules plus system configuration.':role==='team'?'Modules 01-05 on assigned projects. No partner management.':role==='partner'?'Project-scoped: M01, M02, M04, M05 for own project only.':'Read-only: M01 summary and M05 progress view only.'}
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

  // ── New Project Modal ─────────────────────────────────────────────────────────
  const submitNewProject = () => {
    const id = 'mdi-' + Date.now().toString(36)
    const newP = {
      id,
      name: newProjectForm.name || 'Untitled Project',
      address: newProjectForm.address,
      apn: newProjectForm.apn || id.toUpperCase(),
      market: newProjectForm.city + (newProjectForm.city ? ', ' : '') + newProjectForm.state,
      state: newProjectForm.state,
      goal: newProjectForm.goal,
      method: newProjectForm.method === 'THREEDCP' ? '3DCP' : newProjectForm.method === 'SCIP' ? 'SCIP' : newProjectForm.method === 'MODULAR' ? 'Modular' : 'Tunnel-form',
      vendor: 'TBD',
      status: 'SCREENING',
      pct: 0,
      units: parseInt(newProjectForm.units) || 0,
      partner: newProjectForm.partner || 'TBD',
      msaExecuted: false,
      lotAcres: parseFloat(newProjectForm.lotAcres) || null,
      zoning: newProjectForm.zoning || null,
      budgetMin: parseFloat(newProjectForm.budgetMin) * 1_000_000 || null,
      budgetMax: parseFloat(newProjectForm.budgetMax) * 1_000_000 || null,
      landCost: null, constructionCost: null, projectedRevenue: null, targetMargin: null,
      startDate: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      bimDate: null, printDate: null, estCompletion: 'TBD',
      stlVersions: [], bimFiles: [], roboticFiles: [], refax: null, twin: null,
      comms: newProjectForm.notes ? [{ author: 'Edgar Munoz', date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), body: newProjectForm.notes }] : [],
      moduleStatus: ['active','todo','todo','todo','todo','todo'],
    }
    setProjects(prev => [newP, ...prev])
    setNewProjectSuccess(true)
    setTimeout(() => { setShowNewProject(false); setView('projects') }, 1800)
  }

  const deleteProject = (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProject?.id === id) setView('projects')
  }

  const addComm = (projectId: string, body: string, author: string) => {
    if (!body.trim()) return
    const entry = {
      author: author.trim() || user.name,
      date: new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}),
      body: body.trim(),
    }
    setCommsMap(prev => ({
      ...prev,
      [projectId]: [entry, ...(prev[projectId] || [])],
    }))
    setNewNote('')
  }

  // ── App shell  // ── App shell ─────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <NewProjectModal
        show={showNewProject}
        step={newProjectStep}
        form={newProjectForm}
        success={newProjectSuccess}
        onClose={()=>setShowNewProject(false)}
        onNext={()=>setNewProjectStep(s=>s+1)}
        onBack={()=>{ if(newProjectStep>1) setNewProjectStep(s=>s-1); else setShowNewProject(false) }}
        onSubmit={submitNewProject}
        onField={(k,v)=>setNewProjectForm(f=>({...f,[k]:v}))}
      />
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
          {view==='vertikaal' && <div style={{flex:1,overflowY:'auto'}}><VertikaalView screeningResult={screeningResult} screeningInput={screeningInput} onBack={()=>setView('ifindy')}/></div>}
        </div>
      </div>
    </div>
  )
}
