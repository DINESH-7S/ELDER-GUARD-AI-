"""Rewrites the use-case, DFD and ER blocks of diagrams.html with cleaner layouts."""
p = r'E:\Elder_guard\docs\report\diagrams.html'
s = open(p, encoding='utf8').read()

s = s.replace("h4{position:absolute;", "h4{background:#fff;padding:0 6px 0 0;z-index:2;position:absolute;", 1)


def col(x, title, items):
    h = f'<div class="abs box dark" style="left:{x}px;top:20px;width:196px">{title}</div>'
    h += f'<div class="abs" style="left:{x + 98}px;top:60px;width:2px;height:{len(items) * 66 - 6}px;background:#14625C"></div>'
    for i, t in enumerate(items):
        h += f'<div class="abs box" style="left:{x}px;top:{84 + i * 66}px;width:196px;border-radius:30px;padding:9px 10px;font-size:13.5px">{t}</div>'
    return h


uc = '<div class="fig" id="usecase" style="height:450px">'
uc += col(10, 'Elder', ['Log medicine dose', 'Record vitals', 'Trigger 1-tap SOS', 'Chat with AI companion', 'Book telemedicine visit'])
uc += col(224, 'Caregiver', ['Monitor vitals &amp; adherence', 'Receive SOS alert', 'Message care team', 'Manage linked elders', 'Export health report'])
uc += col(438, 'Doctor', ['View patient workspace', 'Review live vitals', 'Write e-prescription', 'Run consult queue', 'Upload lab report'])
uc += col(652, 'Hospital', ['Receive SOS dispatch', 'Manage appointment queue', 'Manage doctors', 'Departments &amp; resources', 'Billing records'])
uc += col(866, 'Pharmacy', ['Receive prescriptions', 'Verify &amp; approve intake', 'Track inventory', 'Manage deliveries', 'Patient subscriptions'])
uc += '</div>\n\n'

dfd = '''<div class="fig" id="dfd" style="height:520px">
<div class="abs box dark" style="left:24px;top:30px;width:150px">Elder</div>
<div class="abs box dark" style="left:24px;top:210px;width:150px">Caregiver</div>
<div class="abs box dark" style="left:24px;top:390px;width:150px">Doctor</div>
<div class="abs box" style="left:270px;top:195px;width:210px;border-radius:50px;padding:22px 14px">1.0 Authenticate<small>JWT, role check</small></div>
<div class="abs box" style="left:560px;top:20px;width:230px;border-radius:50px;padding:20px 14px">2.0 Health tracking<small>medicines, vitals, check-ins</small></div>
<div class="abs box sos" style="left:560px;top:180px;width:230px;border-radius:50px;padding:20px 14px">3.0 SOS &amp; escalation<small>tiered, timer driven</small></div>
<div class="abs box" style="left:560px;top:340px;width:230px;border-radius:50px;padding:20px 14px">4.0 Care &amp; clinical<small>appointments, prescriptions</small></div>
<div class="abs box" style="left:900px;top:20px;width:176px">D1 Database<small>SQLite / Supabase</small></div>
<div class="abs box" style="left:900px;top:180px;width:176px;border-radius:50px;padding:20px 10px">5.0 Notify<small>WebSocket, push, Telegram</small></div>
<div class="abs box dark" style="left:900px;top:340px;width:176px">Hospital &amp; Pharmacy</div>
<svg width="1100" height="520" style="stroke:#14625C;stroke-width:1.8;fill:none;marker-end:url(#a)">
<path d="M174 60H222V225H270"/><path d="M174 240H270"/><path d="M174 420H222V255H270"/>
<path d="M480 215H520V50H560"/><path d="M480 225H560"/><path d="M480 245H520V370H560"/>
<path d="M790 50H900"/><path d="M790 80H845V190H900" stroke-dasharray="5 4"/>
<path d="M790 215H900" stroke="#B42318" marker-end="url(#b)"/>
<path d="M790 380H900"/><path d="M988 250V340" stroke-dasharray="5 4"/>
</svg>
<div class="lbl" style="left:190px;top:12px">credentials</div>
<div class="lbl" style="left:500px;top:150px">authorised requests</div>
<div class="lbl" style="left:800px;top:195px;font-size:11px;color:#B42318">SOS events</div>
<div class="lbl" style="left:24px;top:480px;width:1050px">Live alerts reach caregiver and hospital over WebSocket; prescriptions reach the pharmacy through the shared database.</div>
</div>

'''


def T(x, y, title, rows, w=340):
    r = ''.join(f'<tr><td class="pk" style="width:30px">{k}</td><td>{v}</td></tr>' for k, v in rows)
    return f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px"><table class="er" style="width:100%"><tr><th colspan=2>{title}</th></tr>{r}</table></div>'


e = '<div class="fig" id="er" style="height:620px">'
e += T(0, 0, 'users', [('PK', 'id'), ('', 'email, phone_no, password_hash'), ('', 'role, is_verified')])
e += T(380, 0, 'elder_profiles', [('PK', 'user_id (FK users)'), ('', 'elder_id (EG-xxxx)'), ('', 'name, age, blood_group, caregiver_id')])
e += T(760, 0, 'doctor / hospital / pharmacy / caregiver profiles', [('PK', 'user_id (FK users)'), ('', 'name, licence, working hours'), ('', 'pharmacy_name, office_name')], 316)
e += T(0, 200, 'appointments', [('PK', 'id'), ('FK', 'elder_id, doctor_id'), ('', 'scheduled_at, mode, token, status')])
e += T(380, 200, 'connected_medicines', [('PK', 'id'), ('FK', 'elder_id'), ('', 'name, dosage, time slots, stock')])
e += T(760, 200, 'connected_vitals', [('PK', 'id'), ('FK', 'elder_id'), ('', 'type, value, recorded_at')], 316)
e += T(0, 380, 'medicine_logs', [('PK', 'id'), ('FK', 'medicine_id, elder_id'), ('', 'scheduled_at, status')])
e += T(380, 380, 'connected_sos_events', [('PK', 'id'), ('FK', 'elder_id'), ('', 'status, location, caregiver_notified_at')])
e += T(760, 380, 'doctor_prescriptions', [('PK', 'id'), ('FK', 'doctor_id, elder_id'), ('', 'medicine, sig, duration, pharmacy, status')], 316)
e += T(0, 545, 'elder_caregiver_links', [('FK', 'elder_id, caregiver_id, status')])
e += T(380, 545, 'hospital_* tables', [('', 'queue entries, departments, billing')])
e += T(760, 545, 'notifications / messages / audit', [('', 'alerts, care-team chat, audit trail')], 316)
e += '''<svg width="1100" height="620" style="stroke:#14625C;stroke-width:1.8;fill:none">
<path d="M340 40H380" marker-end="url(#a)"/><path d="M720 40H760" marker-end="url(#a)"/>
<path d="M550 100V150"/><path d="M170 150H920"/>
<path d="M170 150V200" marker-end="url(#a)"/><path d="M550 150V200" marker-end="url(#a)"/><path d="M920 150V200" marker-end="url(#a)"/>
<path d="M170 300V380" marker-end="url(#a)"/><path d="M550 300V380" marker-end="url(#a)"/><path d="M920 300V380" marker-end="url(#a)"/>
</svg></div>
'''

a = s.index('<!-- 2 USE CASE -->')
b = s.index('<!-- 4 SOS FLOW -->')
s = s[:a] + '<!-- 2 USE CASE -->\n' + uc + '<!-- 3 DFD -->\n' + dfd + s[b:]
a = s.index('<!-- 6 ER -->')
b = s.index('<!-- 7 DEPLOYMENT')
s = s[:a] + '<!-- 6 ER -->\n' + e + '\n' + s[b:]
open(p, 'w', encoding='utf8').write(s)
print('ok')
