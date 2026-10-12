from lib import *


def ch7_to_9():
    # ===== 7 =====
    chapter(7, 'System Design')
    H2('7.1 System Architecture')
    P('ElderGuard follows a layered architecture. Five portals in the browser talk to a FastAPI service, which uses background jobs, a WebSocket hub, an AI companion and an OCR component, and stores data in SQLite or Supabase/PostgreSQL. Figure 7.1 shows the layers.')
    figure(FIG + r'\d-architecture.png', 'System architecture of ElderGuard AI', 15)
    H2('7.2 Introduction')
    P('The design separates what users see (portals), what the system does (API modules) and what must happen without anyone clicking (scheduled jobs), so that safety-critical behaviour does not depend on a screen being open.')
    H2('7.3 Working Flow')
    P('A user signs in with an email or mobile number and a role. The server verifies the password hash and returns a signed token, and the front end opens the portal for that role. From then on every request carries the token. Medicine reminders are created by a scheduler; the elder answers them in the portal; the caregiver’s dashboard is refreshed through WebSocket. An SOS creates an event, notifies the first tier, and the escalation sweep advances the event until someone acknowledges it.')
    H2('7.4 System Components')
    H3('7.4.1 Authentication Module')
    P('Handles registration, sign-in, bcrypt password hashing, JWT access and refresh tokens, and role checks on protected routes.')
    H3('7.4.2 Medicine and Reminder Module')
    P('Stores medicines, generates reminder sessions, rings the elder’s alarm, records Taken or missed, and tracks stock.')
    H3('7.4.3 Vitals Module')
    P('Records readings, applies target ranges and provides trend data for charts.')
    H3('7.4.4 Emergency (SOS) Module')
    P('Creates SOS events, runs the tiered escalation, records every action in a log and supports acknowledgement and resolution.')
    H3('7.4.5 Clinical Records Module')
    P('Holds appointments, telemedicine sessions, doctor prescriptions and reports for the doctor portal.')
    H3('7.4.6 Hospital and Pharmacy Modules')
    P('Hospital operations (queue, departments, billing) and pharmacy intake (prescriptions routed by pharmacy name).')
    H3('7.4.7 AI Companion and Notification Modules')
    P('The companion builds a prompt from the elder’s data and calls the language model. The notification module stores alerts and sends them over the available channels.')
    H2('7.5 Use Case Diagram')
    P('Figure 7.2 lists the actions available to each actor.')
    figure(FIG + r'\d-usecase.png', 'Use cases by role', 15)
    H2('7.6 SOS Escalation Flow')
    P('The default escalation policy has four tiers. Tier 1 notifies the caregiver immediately. Tier 2 notifies the secondary contact after 2 minutes, tier 3 notifies the hospital after 5 minutes and tier 4 contacts emergency services after 10 minutes, unless the event has been acknowledged. A sweep job checks events every 30 seconds. When the environment variable SOS_DEMO_SECONDS is set, the delays become multiples of that value so that a presenter can show the whole chain quickly.')
    figure(FIG + r'\d-sosflow.png', 'SOS escalation workflow', 15)
    H2('7.7 Prescription Handoff Flow')
    P('A doctor writes an e-prescription and names a pharmacy. The prescription is stored with status Active (e-Signed). The pharmacy portal lists prescriptions whose pharmacy name matches the pharmacy’s own profile name, ignoring case, and the pharmacist can verify and approve intake. The same prescription also appears in the elder’s medicine list.')
    figure(FIG + r'\d-rxflow.png', 'Doctor-to-pharmacy prescription handoff', 15)
    H2('7.8 Data Flow')
    P('Figure 7.5 shows the data flow. Users are authenticated first. Health tracking and clinical activity are written to the database. SOS events are sent straight to the notification process, and the notification process alerts the caregiver, the hospital and the pharmacy.')
    figure(FIG + r'\d-dfd.png', 'Data flow diagram of ElderGuard AI', 15)
    H2('7.9 System Design Considerations')
    B([
        '**Safety first:** SOS must not depend on a screen being open, so escalation runs in a back-end sweep job.',
        '**Graceful degradation:** every external channel (push, Telegram, language model) is optional, and failure of one does not stop the others.',
        '**Least privilege:** each role can read and change only what Table 5.3 allows.',
        '**Honest scope:** the interface says what it does. It does not claim SMS, calls or ambulance dispatch that are not implemented.',
    ])

    # ===== 8 =====
    chapter(8, 'Database Design')
    H2('8.1 Introduction')
    P('The database stores users, role profiles, medicines and dose logs, vitals, appointments, prescriptions, SOS events and notifications. The same schema runs on SQLite locally and on PostgreSQL through Supabase.')
    H2('8.2 Database Objectives')
    B(['Keep one record per elder that every authorised role can read.', 'Make every SOS action traceable.', 'Keep roles separate but linked through identifiers.', 'Allow the schema to be created automatically on first start.'])
    H2('8.3 Main Database Entities')
    P('The principal entities are users, elder_profiles, caregiver_profiles, doctor_profiles, hospital_profiles, pharmacy_profiles, elder_caregiver_links, connected_medicines, medicine_logs, connected_vitals, appointments, doctor_prescriptions, connected_sos_events, hospital_queue_entries, hospital_billing_records and connected_notifications.')
    figure(FIG + r'\d-er.png', 'Entity relationship diagram of ElderGuard AI', 15)
    H2('8.4 User Table')
    table('Users Table', ['Column', 'Type', 'Description'], [
        ['id', 'TEXT (PK)', 'Unique user identifier'],
        ['email, phone_no', 'TEXT, unique', 'Sign-in identifiers'],
        ['password_hash', 'TEXT', 'bcrypt hash of the password'],
        ['auth_provider', 'TEXT', 'Local or Google'],
        ['role', 'TEXT', 'elder, caregiver, doctor, hospital or pharmacy'],
        ['is_verified', 'BOOLEAN', 'Account verification flag'],
        ['created_at, updated_at', 'TEXT', 'Timestamps'],
    ], [4.0, 3.6, 7.6])
    H2('8.5 Elder Profile Table')
    table('Elder Profiles Table', ['Column', 'Type', 'Description'], [
        ['user_id', 'TEXT (PK, FK)', 'Links to users.id'],
        ['elder_id', 'TEXT, unique', 'Shareable code such as EG-1A2B3C4D used to link caregivers'],
        ['name, age_or_dob, gender', 'TEXT', 'Personal details'],
        ['blood_group, primary_language', 'TEXT', 'Clinical and language preferences'],
        ['home_address, phone_no', 'TEXT', 'Contact details'],
        ['caregiver_id', 'TEXT', 'Primary linked caregiver'],
    ], [4.6, 3.4, 7.2])
    H2('8.6 Prescription Table')
    table('Doctor Prescriptions Table', ['Column', 'Type', 'Description'], [
        ['id', 'TEXT (PK)', 'Prescription identifier'],
        ['doctor_id, elder_id', 'TEXT (FK)', 'Prescriber and patient'],
        ['medicine, sig', 'TEXT', 'Medicine name and dosage instruction'],
        ['duration, refills', 'TEXT, INTEGER', 'Course length and refills'],
        ['pharmacy', 'TEXT', 'Name of the destination pharmacy'],
        ['status', 'TEXT', 'For example Active (e-Signed)'],
        ['time_slot, meal_timing', 'TEXT', 'Used to build reminder times'],
    ], [4.0, 3.4, 7.8])
    H2('8.7 SOS Event Table')
    table('SOS Events Table', ['Column', 'Type', 'Description'], [
        ['id', 'TEXT (PK)', 'Event identifier'],
        ['elder_id', 'TEXT (FK)', 'Elder who raised the SOS'],
        ['triggered_at', 'TEXT', 'Time the SOS was raised'],
        ['location', 'TEXT', 'Location text if available'],
        ['status', 'TEXT', 'active, acknowledged or resolved'],
        ['caregiver_notified_at', 'TEXT', 'Time tier 1 was notified'],
        ['resolved_by, resolution_notes', 'TEXT', 'Who closed it and why'],
    ], [4.6, 3.2, 7.4])
    H2('8.8 Appointments, Medicines and Vitals')
    P('The appointments table records the elder, doctor, scheduled time, mode (telemedicine or in person), queue token and status. connected_medicines stores name, dosage, time slots and stock; medicine_logs stores each scheduled dose and its status. connected_vitals stores the type, value and recording time of every reading.')
    H2('8.9 Database Relationships')
    B(['One user has one role profile.', 'One elder has many medicines, vitals, appointments, prescriptions and SOS events.', 'One elder can be linked to many caregivers, and one caregiver to many elders, through elder_caregiver_links.', 'A prescription belongs to one doctor and one elder and is addressed to one pharmacy by name.'])
    H2('8.10 Database Security')
    P('Passwords are stored only as bcrypt hashes. Every protected route checks the token and role before touching data, and caregivers and doctors see an elder only through a link or an appointment. Caregiver actions are written to an audit log.')
    H2('8.11 Database Summary')
    P('The schema is small and normalised enough to be understood quickly, and the elder identifier ties all clinical and safety data together.')

    # ===== 9 =====
    chapter(9, 'Module Description')
    H2('9.1 Introduction')
    P('This chapter describes each module from the user’s point of view, with the portal screens that implement it.')
    table('ElderGuard Module Description', ['ID', 'Module', 'Function'], [
        ['M1', 'Authentication', 'Register, sign in, role selection'],
        ['M2', 'Medicine reminders', 'Schedule, alarm, Taken action, stock'],
        ['M3', 'Vitals', 'Log, chart and flag readings'],
        ['M4', 'SOS escalation', 'One-tap alert and four-tier escalation'],
        ['M5', 'Appointments and telemedicine', 'Booking, queue tokens, consult room'],
        ['M6', 'Doctor workspace', 'Patients, vitals, prescriptions, reports'],
        ['M7', 'Pharmacy', 'Prescription intake, orders, inventory, delivery'],
        ['M8', 'Hospital', 'Queue, doctors, departments, billing, SOS dispatch'],
        ['M9', 'AI companion', 'Mevi chat with the elder’s data as context'],
        ['M10', 'Notifications', 'In-app, push and Telegram alerts'],
        ['M11', 'Real-time hub', 'WebSocket updates for elder and caregiver'],
    ], [1.4, 4.6, 9.2])
    H2('9.2 Authentication Module')
    P('The sign-in screen lets the user choose a role, enter an email address or mobile number and a password, and open the correct portal. Registration collects the details needed for that role; an elder receives a shareable elder ID.')
    H2('9.3 Elder Portal')
    P('The dashboard greets the elder by name and shows today’s medicines, a large red one-tap SOS card, a daily “I’m OK” check-in, a short health report from Mevi, the latest vitals and notes from the caregiver and doctor. When a dose is due, an alarm dialog appears with a Medicine Taken button.')
    figure(FIG + r'\elder-home.png', 'Elder dashboard', 14)
    H2('9.4 Medicine Reminder Module')
    P('Medicines are listed by time of day. A scheduler creates reminder sessions, starts the ring, and times out unanswered doses so the caregiver can be told. The elder can test the alarm sound and mark each dose as taken.')
    H2('9.5 Vitals Module')
    P('The elder can type or speak a reading. The caregiver and doctor see charts and target ranges, and out-of-range readings are flagged as anomalies.')
    H2('9.6 SOS Escalation Module')
    P('The SOS card sends one request. The server creates an event and notifies tier 1; the scheduler advances the escalation. Caregiver and hospital portals show active alerts until they are acknowledged or resolved.')
    H2('9.7 Caregiver Portal')
    P('The caregiver chooses a linked elder and sees live vitals, medicine adherence, today’s dose stream, quick actions, vitals trends, alerts and the care-team thread.')
    figure(FIG + r'\caregiver-home.png', 'Caregiver dashboard', 14)
    H2('9.8 Doctor Portal')
    P('The doctor sees today’s consultation queue, patient roster and a connected patient workspace with live vitals, prescriptions and reports, and can write a prescription for a named pharmacy.')
    H2('9.9 Pharmacy Portal')
    P('Incoming prescriptions from doctors appear in an intake queue; the pharmacist verifies and approves intake, and then tracks orders, inventory and deliveries.')
    H2('9.10 Hospital Portal')
    P('The hospital desk manages doctors, the appointment queue, departments and billing, and has an Emergency and SOS Dispatch page for live alerts.')
    H2('9.11 AI Companion Module')
    P('Mevi answers questions about routines and medicines in plain language, uses the elder’s data for context, and avoids diagnosis.')
    H2('9.12 Module Integration')
    P('All modules share the elder identifier and the same database, so an action in one portal is visible in another. For example, a prescription written in the doctor portal appears in the pharmacy queue and in the elder’s medicine list.')


def ch10_to_13():
    # ===== 10 =====
    chapter(10, 'Implementation and Working Principle')
    H2('10.1 Introduction')
    P('This chapter explains how the front end, back end, scheduler and database work together to deliver the safety-critical behaviour.')
    H2('10.2 Frontend Implementation')
    P('The front end is a single React application. A shared dashboard layout provides a light sidebar with one teal accent, a bottom tab bar on phones, a skip link and page transitions. Each role sets a different root font scale: 118% for the elder, 95% for the caregiver and 93.75% for the clinical portals. The design uses the Atkinson Hyperlegible typeface for body text, a 12 px text floor, 44 px touch targets and a 3 px focus ring. Motion is added through framer-motion and removed for users who prefer reduced motion.')
    figure(FIG + r'\login.png', 'Role-based sign-in screen', 14)
    H2('10.3 Backend Implementation')
    P('The FastAPI application includes routers for authentication, profiles, medicines, reminders, vitals, appointments, emergency, doctor records, hospital operations, AI companion, notifications and the realtime connected hub. Tables are created on start-up if they do not exist, so a new developer only needs to run the server.')
    H2('10.4 Reminder Processing')
    P('A reminder sweep creates sessions for upcoming doses, a second sweep starts the ring and a third checks time-outs. When the elder presses Medicine Taken, the dose is logged and pushed to the caregiver over WebSocket.')
    H2('10.5 SOS Processing')
    P('When the elder presses SOS, trigger_sos writes an event and notifies tier 1. The escalation sweep compares the elapsed time with each tier’s delay and notifies the next recipient if the event is still unacknowledged. Every action is written to a log. Acknowledging or resolving the event stops further escalation.')
    code('''# Default escalation policy (backend/app/emergency/service.py)
tiers = [
  {"tier_number": 1, "recipient_type": "caregiver",           "timeout_minutes": 0},
  {"tier_number": 2, "recipient_type": "secondary_caregiver", "timeout_minutes": 2},
  {"tier_number": 3, "recipient_type": "hospital",            "timeout_minutes": 5},
  {"tier_number": 4, "recipient_type": "emergency_services",  "timeout_minutes": 10},
]
if SOS_DEMO_SECONDS > 0:           # demo mode compresses the timeline
    for tier in tiers:
        tier["delay_seconds"] = (tier["tier_number"] - 1) * SOS_DEMO_SECONDS''')
    H2('10.6 Prescription Handoff')
    P('When a doctor creates a prescription the server stores the pharmacy name entered by the doctor. When the pharmacy opens its queue the server reads the pharmacy’s profile name, converts it to lower case and lists prescriptions whose pharmacy name matches. This avoids needing a pharmacy to be registered before a doctor can prescribe, at the cost of requiring the names to match.')
    figure(FIG + r'\pharmacy-orders.png', 'Pharmacy queue showing prescriptions received from the doctor', 14)
    H2('10.7 Demo Data and Demo Mode')
    P('A seed script creates the five demo accounts and a connected story: an elder, her caregiver, a doctor with a telemedicine appointment, two prescriptions addressed to a named pharmacy, a hospital and the pharmacy. Starting the application with the demo script runs the SOS escalation in seconds instead of minutes, so the whole chain can be shown during a presentation.')
    H2('10.8 AI Companion')
    P('The route builds a system prompt containing the elder’s recent vitals and medicines and sends the conversation to the language model. The model is told to speak simply, to avoid diagnosis and to point the elder to the caregiver, doctor or emergency services when needed.')
    figure(FIG + r'\elder-assistant.png', 'AI companion screen', 14)
    H2('10.9 Implementation Summary')
    P('Safety-critical logic runs in the back end and does not depend on a screen being open. The portals present the same underlying record in a form suited to each role.')

    # ===== 11 =====
    chapter(11, 'Testing')
    H2('11.1 Introduction')
    P('Testing combined automated browser tests, an automated accessibility audit, a timed SOS drill and manual checks. Automated tests were written with Playwright and axe-core and live in frontend/tests.')
    H2('11.2 Objectives of Testing')
    B(['Confirm that every portal page opens without an error screen.', 'Confirm the demo story works from doctor to pharmacy.', 'Detect accessibility problems against WCAG 2.1 A/AA.', 'Confirm that the SOS escalation fires every tier in order.', 'Confirm the layouts work at phone size.'])
    H2('11.3 Types of Testing')
    H3('11.3.1 End-to-end Testing')
    P('An automated browser signs in through the real form as each role, opens every navigation item and checks that the page loads and that no uncaught error occurs. The suite has 22 tests covering the five portals and phone size.')
    H3('11.3.2 Accessibility Testing')
    P('The axe-core engine scans every page against WCAG 2.1 A/AA rules. The scan runs with reduced motion so that animation does not affect colour contrast readings. The result is no serious or critical violations.')
    H3('11.3.3 Story Testing')
    P('Story tests follow the demo narrative: the doctor has the elder on the roster, prescriptions written by the doctor reach the pharmacy queue, pharmacy screens show real data or honest empty states, and the landing page describes escalation the way the system really behaves.')
    H3('11.3.4 Mobile Testing')
    P('The suite is also run at 375 × 812 pixels to check the bottom tab bar, the More menu and that content is not clipped.')
    H3('11.3.5 SOS Escalation Drill')
    P('With SOS_DEMO_SECONDS set, an SOS was raised and left unacknowledged. All four tiers fired in order within the compressed timeline.')
    H3('11.3.6 Backend Tests')
    P('The backend folder contains scripts that exercise the emergency, appointment, vitals, medicine reminder, notification, OCR, report, analytics and connected-portal services.')
    H2('11.4 Functional Test Cases')
    table('Functional Test Cases', ['ID', 'Test case', 'Expected result', 'Result'], [
        ['T1', 'Sign in as each of the five roles', 'Correct portal opens', 'Pass'],
        ['T2', 'Open every sidebar item for every role', 'No error screen', 'Pass'],
        ['T3', 'Elder portal at desktop width', 'No sideways scrolling', 'Pass'],
        ['T4', 'Doctor prescription for GreenLeaf Pharmacy', 'Appears in pharmacy queue', 'Pass'],
        ['T5', 'Tiered SOS left unanswered in demo mode', 'Tiers 1 to 4 fire in order', 'Pass'],
        ['T6', 'Accessibility scan of every page', 'No serious violations', 'Pass'],
        ['T7', 'Phone-size layout', 'Bottom tab bar and More menu work', 'Pass'],
        ['T8', 'Wrong password; sign out', 'Visible alert; return to landing page', 'Pass'],
    ], [1.2, 6.0, 5.8, 2.2])
    H2('11.5 Defects Found and Fixed')
    table('Notable Defects Found During Testing', ['Defect', 'Fix'], [
        ['Intermittent error screen on first load after dependency discovery by the dev server', 'Pre-bundled key packages in Vite and added a one-time self-healing reload in the error boundary'],
        ['A seeded doctor profile with working hours stored as text crashed the profile page', 'Normalised working hours in the API and the front end'],
        ['Alarm dialog blocked the page during automated tests', 'Tests dismiss the overlay through the DOM'],
        ['Low-contrast badge and unlabelled bell icon found by axe', 'Colours darkened and an accessible label added'],
    ], [8.0, 7.2])
    H2('11.6 Testing Result')
    P('At the time of writing, all 22 automated end-to-end tests pass, the accessibility audit reports no serious violations and the SOS drill fired all four tiers. These figures describe the prototype on demo data. They do not show that the product helps real elders, which needs a pilot.')
    H2('11.7 Conclusion of Testing')
    P('The automated checks give confidence that the prototype works across all portals and is accessible. Usability sessions with older adults are the most important remaining test.')

    # ===== 12 =====
    chapter(12, 'Project Evaluation')
    H2('12.1 Introduction')
    P('This chapter evaluates the prototype against its objectives, honestly separating what was measured from what is still a target.')
    H2('12.2 Objective Evaluation')
    table('Project Objective Evaluation', ['Objective', 'Status', 'Evidence'], [
        ['Reminder that is answered and visible to family', 'Met in prototype', 'Alarm dialog, Taken action, caregiver dose stream'],
        ['One-tap SOS with escalation', 'Met in prototype', 'Four-tier drill; in-app and push alerts'],
        ['Vitals tracking', 'Met', 'Typed and spoken entry, charts, target ranges'],
        ['Doctor-to-pharmacy handoff', 'Met', 'Seeded prescriptions appear in the pharmacy queue'],
        ['AI companion', 'Met', 'Mevi with vitals context'],
        ['Accessible design', 'Met on automated rules', 'axe: no serious violations; manual elder testing pending'],
        ['Role-based access', 'Partly met', 'Role checks in place; consent and audit to be extended'],
    ], [5.4, 3.3, 6.5])
    H2('12.3 Usability Evaluation')
    P('The interface uses very large type for elders, a text-size control, one primary action per screen and a single colour accent. These choices follow accessibility guidance and the empathy findings. Real usability testing with older adults has not yet been done.')
    H2('12.4 Performance and Reliability Evaluation')
    P('Escalation is driven by a back-end sweep that does not depend on any open page. In the prototype the sweep runs inside the API process, so a restart would pause it. A production system needs a durable job queue.')
    H2('12.5 Security Evaluation')
    P('Passwords are hashed with bcrypt and routes check tokens and roles. Before a pilot, the project needs consent management, encrypted secrets, audit trails and review against India’s Digital Personal Data Protection Act.')
    H2('12.6 Advantages')
    B(['One shared record for the whole care circle.', 'Safety features that do not need the elder to be able to phone anyone.', 'Designed for older users and tested for accessibility.', 'Runs on a laptop with no external services, and scales to a hosted database.'])
    H2('12.7 Limitations')
    B([
        'No SMS or voice-call provider; alerts are in-app, push and Telegram.',
        'The hospital desk receives SOS alerts through a same-browser broadcast in the prototype, not through server push.',
        'Pharmacy order status changes are held in the browser only.',
        'The prescription scanner is a prototype screen without a production OCR service.',
        'Verified on demo data only; no real elders took part.',
    ])
    H2('12.8 Overall Evaluation')
    P('ElderGuard meets its prototype objectives and demonstrates a complete, connected care flow. It is a strong foundation for a pilot, and the limits above define the next work.')

    # ===== 13 =====
    chapter(13, 'Conclusion and Future Enhancements')
    H2('13.1 Conclusion')
    P('ElderGuard AI shows that elder care becomes simpler and safer when the elder, family, doctor, pharmacy and hospital share one live record. The prototype delivers answerable medicine reminders, a one-tap SOS with tiered escalation, vitals tracking, a doctor-to-pharmacy prescription flow and an AI companion, in five portals designed for their users. It is verified by 22 automated end-to-end tests, an accessibility audit with no serious violations and a timed SOS drill. The work also made clear that technology alone is not enough: the next step is to learn from real elders and families.')
    H2('13.2 Future Enhancements')
    table('Roadmap', ['Phase', 'Enhancement', 'Benefit'], [
        ['1', 'SMS and voice-call alerts with delivery receipts', 'Reach people without the app'],
        ['1', 'Server push to the hospital SOS desk and a durable job queue', 'Reliable escalation'],
        ['1', 'Verified doctor and hospital accounts', 'Trusted prescribers'],
        ['2', 'Multilingual voice assistant (Tamil, Hindi and others)', 'Easier for elders'],
        ['2', 'Installable mobile app with offline mode', 'Always-ready SOS'],
        ['3', 'Wearable integration and fall detection', 'Automatic alerts'],
        ['3', 'ABDM and EHR integration with consent', 'Continuity of records'],
        ['Pilot', 'Usability sessions and a clinic or care-home pilot', 'Measured impact (target: 90% or more doses on time)'],
    ], [1.8, 8.3, 5.1])


def appendices():
    page_break()
    doc.add_heading('Appendix A – Results and Screenshots', 1)
    H2('A.1 Introduction')
    P('The following screens were captured from the running prototype with the seeded demo data.')
    shots = [
        ('A.2 Landing and Sign-in', [('landing.png', 'Landing page'), ('login.png', 'Sign-in screen')]),
        ('A.3 Elder Portal', [('elder-home.png', 'Elder dashboard'), ('elder-medicines.png', 'Elder medicines'), ('elder-vitals.png', 'Elder vitals')]),
        ('A.4 Caregiver Portal', [('caregiver-home.png', 'Caregiver overview'), ('caregiver-2.png', 'Vitals and health trends')]),
        ('A.5 Doctor Portal', [('doctor-home.png', 'Doctor dashboard'), ('doctor-patients.png', 'Connected patient workspace'), ('doctor-appointments.png', 'Appointments and telehealth desk')]),
        ('A.6 Hospital Portal', [('hospital-home.png', 'Hospital operational command'), ('hospital-dispatch.png', 'Emergency and SOS dispatch')]),
        ('A.7 Pharmacy Portal', [('pharmacy-home.png', 'Pharmacy operations command'), ('pharmacy-orders.png', 'Prescription orders and fulfilment')]),
    ]
    for h, items in shots:
        H2(h)
        for f, c in items:
            figure(FIG + '\\' + f, c, 14.5, prefix='A')

    page_break()
    doc.add_heading('Appendix B – Core Functionality Code', 1)
    H2('B.1 Introduction')
    P('Short excerpts of the core logic are shown. The complete source is in the project repository.')
    H2('B.2 Password hashing (backend/app/core/security.py)')
    code('''def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")''')
    H2('B.3 SOS escalation sweep schedule (backend/app/emergency/scheduler.py)')
    code('''emergency_scheduler.add_job(
    escalation_sweep, "interval",
    seconds=(5 if SOS_DEMO_SECONDS > 0 else 30),
    id="sos_escalation_sweep")''')
    H2('B.4 Medicine reminder sweeps (backend/app/medicines/scheduler.py)')
    code('''scheduler.add_job(sweep_generate_sessions, "interval", seconds=60)
scheduler.add_job(sweep_start_ringing,     "interval", seconds=15)
scheduler.add_job(sweep_check_timeouts,    "interval", seconds=15)''')
    H2('B.5 Demo-speed SOS')
    code('''# root package.json
"dev:demo": "set SOS_DEMO_SECONDS=15&& npm run dev"''')
    H2('B.6 Code Summary')
    P('The excerpts show the separation of concerns: secure credentials, scheduled safety jobs and a configuration switch for demonstration.')

    page_break()
    doc.add_heading('Project Link', 1)
    P('Source code: https://github.com/DINESH-7S/ELDER-GUARD-AI-', align='l')
    P('Run locally with the repository’s dev script: npm run dev (front end on port 5173, API on port 8000). Demo accounts are created by backend/seed_connected_demo.py.', align='l')

    page_break()
    doc.add_heading('References', 1)
    refs = [
        'FastAPI Documentation. https://fastapi.tiangolo.com/ – used for the REST and WebSocket back end.',
        'React Documentation. https://react.dev/ – used for the component-based front end.',
        'Vite Documentation. https://vitejs.dev/ – used for the development server and build.',
        'Tailwind CSS Documentation. https://tailwindcss.com/docs – used for design tokens and styling.',
        'Motion (framer-motion) Documentation. https://motion.dev/ – used for interface animation.',
        'SQLAlchemy Documentation. https://docs.sqlalchemy.org/ – used for database access.',
        'APScheduler Documentation. https://apscheduler.readthedocs.io/ – used for scheduled jobs.',
        'Supabase Documentation. https://supabase.com/docs – hosted PostgreSQL option.',
        'Playwright Documentation. https://playwright.dev/ – used for end-to-end testing.',
        'axe-core by Deque Systems. https://github.com/dequelabs/axe-core – used for automated accessibility testing.',
        'W3C, Web Content Accessibility Guidelines (WCAG) 2.1. https://www.w3.org/TR/WCAG21/ – accessibility criteria.',
        'Groq API Documentation. https://console.groq.com/docs – hosted language model for the AI companion.',
        'Government of India, Digital Personal Data Protection Act, 2023 – privacy considerations for health data.',
        'Reference reports: “Finora AI” and “MailWorm” mini project reports, SNS College of Technology, 2026 – report structure and format.',
    ]
    for i, r in enumerate(refs, 1):
        p = P(f'[{i}] {r}', align='l', after=4)
        p.paragraph_format.left_indent = Cm(0.9)
        p.paragraph_format.first_line_indent = Cm(-0.9)
