from lib import *


def front():
    # ---- cover ----
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.cell(0, 0).paragraphs[0].add_run().add_picture(ASSETS + r'\crest.png', width=Cm(2.4))
    c = t.cell(0, 1).paragraphs[0]
    c.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    c.add_run().add_picture(ASSETS + r'\badges.png', width=Cm(3.2))
    P('', after=24)
    P('ELDERGUARD AI', bold=True, align='c', size=22, after=2)
    P('Connected Elder Care Platform: Medicine Reminders, Tiered SOS Escalation and Five Linked Care Portals', bold=True, align='c', size=15, after=4)
    P('A MINI PROJECT REPORT', bold=True, align='c', size=16, before=24, after=16)
    P('Submitted by', align='c', after=10)
    for name, roll in (('DINESH N', '713525AD029'), ('BHOOPESH M', '713525AD013'), ('DHARSHAN V', '713525AD014')):
        p = P(f'{name}\t{roll}', bold=True, align='l', after=2)
        p.paragraph_format.left_indent = Cm(4.0)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(9.5))
    P('in partial fulfillment for the award of the degree of', align='c', before=26, after=14)
    P('BACHELOR OF ENGINEERING', bold=True, align='c', after=2)
    P('in', align='c', after=2)
    P('ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', bold=True, align='c', after=14)
    P('SNS COLLEGE OF TECHNOLOGY', bold=True, align='c', after=2)
    P('COIMBATORE 641035', bold=True, align='c', after=18)
    P('October 2026', align='c', after=0)

    # ---- bonafide ----
    page_break()
    t = doc.add_table(rows=1, cols=2)
    t.cell(0, 0).paragraphs[0].add_run().add_picture(ASSETS + r'\crest.png', width=Cm(2.0))
    c = t.cell(0, 1).paragraphs[0]
    c.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    c.add_run().add_picture(ASSETS + r'\badges.png', width=Cm(2.8))
    P('SNS COLLEGE OF TECHNOLOGY', bold=True, align='c', before=6, after=0)
    P('COIMBATORE 641035', bold=True, align='c', after=20)
    P('BONAFIDE CERTIFICATE', bold=True, align='c', size=14, after=14)
    P('Certified that this mini Project Report titled, “ELDERGUARD AI – Connected Elder Care Platform” is the bonafide record of **DINESH N, BHOOPESH M and DHARSHAN V** who carried out the mini Project Work under our supervision. Certified further, that to the best of my knowledge the work reported herein does not form part of any other mini project report or dissertation on the basis of which a degree or award was conferred on an earlier occasion on this or any other candidate.')
    P('', after=28)
    t = doc.add_table(rows=1, cols=2)
    for i, (h, lines) in enumerate((
        ('PROJECT GUIDE', ['Ms. K. Revathi', 'Assistant Professor,', 'Department of AI & DS,', 'SNS College of Technology', 'Coimbatore-641035.']),
        ('HEAD OF THE DEPARTMENT', ['Dr. A. Kowshika', 'Associate Professor & Head,', 'Department of CSE,', 'SNS College of Technology', 'Coimbatore-641035.']),
    )):
        cell = t.cell(0, i)
        cell.paragraphs[0].add_run(h).bold = True
        cell.paragraphs[0].paragraph_format.line_spacing = 1.15
        for l in lines:
            q = cell.add_paragraph(l)
            q.paragraph_format.line_spacing = 1.15
            q.paragraph_format.space_after = Pt(0)
            q.alignment = WD_ALIGN_PARAGRAPH.LEFT
    P('', after=28)
    P('Submitted for the Viva-Voce examination held at SNS COLLEGE OF TECHNOLOGY, held on ..........................................')
    P('', after=40)
    t = doc.add_table(rows=1, cols=2)
    t.cell(0, 0).text = 'Examiner 1'
    p = t.cell(0, 1).paragraphs[0]
    p.add_run('Examiner 2')
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    # ---- abstract ----
    page_break()
    P('ABSTRACT', bold=True, align='c', size=16, after=14)
    for para in (
        'Many older adults live apart from their families. Missed medicines, unnoticed changes in blood pressure or blood sugar, and slow responses to falls and sudden illness put their health and independence at risk. At the same time the people who look after them, namely family caregivers, doctors, pharmacies and hospitals, each work from separate and disconnected information, so prescriptions, vitals and emergency alerts rarely reach the right person in time.',
        'ElderGuard AI is a connected elder care platform that places all of these people on one shared, live record. It is a web application with five role-based portals: **Elder**, **Caregiver**, **Doctor**, **Hospital** and **Pharmacy**. The elder portal has extra-large type and a one-tap SOS button. It rings a medicine reminder until the dose is answered, lets the elder log vitals, and offers a friendly AI companion named Mevi. The caregiver portal shows the elder’s medicine adherence, vitals trends and alerts in real time. Doctors manage patients, telemedicine appointments with queue tokens, and e-prescriptions. A prescription written for a named pharmacy appears in that pharmacy’s order queue, where it can be verified and fulfilled. The hospital portal handles the appointment queue, doctors, departments, billing and live SOS dispatch.',
        'The central safety feature is a tiered SOS escalation. When the elder presses SOS, the caregiver is alerted immediately. If nobody acknowledges the alert, a scheduler escalates to a second contact after 2 minutes, to the hospital after 5 minutes and to emergency services after 10 minutes. A demo mode compresses these timings so the whole chain can be shown in under a minute.',
        'The system is built with a React 18, Vite and Tailwind CSS front end and a FastAPI back end. Data is held in SQLite for local use and in Supabase/PostgreSQL when it is configured. WebSockets deliver live updates, APScheduler runs the reminder and escalation jobs, and a Groq-hosted language model powers the companion. The interface follows a single warm design language with large type and touch targets, and is checked against WCAG 2.1 A/AA rules. The prototype is verified by 22 automated Playwright end-to-end tests across all five portals, an automated axe accessibility audit with no serious violations, and a timed drill in which all four SOS tiers fired in order.',
        'ElderGuard alerts and informs; it does not diagnose and does not replace a doctor or emergency services. This report documents the problem, user research approach, ideation, requirements, design, implementation, testing and evaluation of the prototype, and sets out the work needed to take it to a real pilot.',
    ):
        P(para)
    P('**Keywords:** Elder Care, Medicine Reminder, SOS Escalation, Connected Care, Accessibility, FastAPI, React, Telemedicine, e-Prescription.', before=6)

    # ---- TOC, lists ----
    page_break()
    P('TABLE OF CONTENTS', bold=True, align='c', size=16, after=10)
    toc('TOC \\o "1-2" \\h \\z \\u')
    page_break()
    P('LIST OF TABLES', bold=True, align='c', size=16, after=10)
    toc('TOC \\h \\z \\t "TableCaption,1"')
    page_break()
    P('LIST OF FIGURES', bold=True, align='c', size=16, after=10)
    toc('TOC \\h \\z \\t "FigureCaption,1"')
    page_break()
    P('LIST OF SYMBOLS, ABBREVIATIONS AND NOMENCLATURE', bold=True, align='c', size=14, after=10)
    abbr = [
        ('AI', 'Artificial Intelligence'), ('API', 'Application Programming Interface'), ('APScheduler', 'Advanced Python Scheduler'),
        ('CSS', 'Cascading Style Sheets'), ('CRUD', 'Create, Read, Update, Delete'), ('DFD', 'Data Flow Diagram'),
        ('ER', 'Entity Relationship'), ('FCM', 'Firebase Cloud Messaging'), ('HTTP', 'Hypertext Transfer Protocol'),
        ('JSON', 'JavaScript Object Notation'), ('JWT', 'JSON Web Token'), ('LLM', 'Large Language Model'),
        ('MVP', 'Minimum Viable Product'), ('OCR', 'Optical Character Recognition'), ('REST', 'Representational State Transfer'),
        ('SOS', 'Emergency distress signal'), ('SQL', 'Structured Query Language'), ('UI', 'User Interface'),
        ('UX', 'User Experience'), ('WCAG', 'Web Content Accessibility Guidelines'), ('WS', 'WebSocket'),
    ]
    t = doc.add_table(rows=0, cols=2)
    t.style = 'Table Grid'
    for a, b in abbr:
        cells = t.add_row().cells
        cells[0].text = a
        cells[1].text = b
        for c in cells:
            c.paragraphs[0].paragraph_format.space_after = Pt(1)
            c.paragraphs[0].paragraph_format.line_spacing = 1.1
            c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT
        cells[0].paragraphs[0].runs[0].bold = True
        cells[0].width = Cm(3.5)
        cells[1].width = Cm(11.0)


def ch1_to_4():
    # ===== 1 =====
    chapter(1, 'Introduction')
    H2('1.1 Background')
    P('Population ageing is one of the quiet changes of our time. In India, joint families are giving way to nuclear households, and children often study or work in other cities while a parent stays at home. An older adult may take three or more medicines a day for blood pressure, diabetes or cholesterol, and any of them can be forgotten. A reading that drifts upward for several days may go unnoticed. A fall at night may be discovered hours later.')
    P('The people who could help are not short of goodwill, but they are short of shared information. A daughter in another city does not know whether the morning tablet was taken. The doctor does not see the blood pressure log. The pharmacy receives a paper prescription that may be unclear. The hospital learns of an emergency only when someone phones. Each party holds one piece of the picture and no one holds all of it.')
    H2('1.2 Project Overview')
    P('ElderGuard AI is a connected elder care platform that gives every person in an elder’s care circle the same live record. It is delivered as a responsive web application with five role-based portals that share one back end and one database:')
    B([
        '**Elder portal**: extra-large type, a medicine reminder that keeps ringing until it is answered, a one-tap SOS button, vitals logging, appointments, medical reports and a friendly AI companion called Mevi.',
        '**Caregiver portal**: live medicine adherence, vitals trends, alerts and SOS history, a care-team message thread and management of linked elders.',
        '**Doctor portal**: patient roster and workspace, telemedicine appointments with queue tokens, e-prescriptions and report upload.',
        '**Hospital portal**: appointment queue, doctor management, departments, billing records and an emergency SOS dispatch desk.',
        '**Pharmacy portal**: incoming e-prescription intake, order fulfilment, inventory, delivery tracking and patient subscriptions.',
    ])
    P('Figure 1.1 shows the public landing page that introduces the platform and sends each user to the right portal.')
    figure(FIG + r'\landing.png', 'ElderGuard landing page', 14)
    H2('1.3 Motivation')
    P('The motivation for this project is the gap between care that is given and care that is seen. Families already care a great deal; what they lack is a calm, dependable way to know that medicines are being taken, that readings are normal, and that help will arrive quickly if something goes wrong. Existing alternatives either do one thing (a pill reminder, a panic pendant) or are written for clinicians rather than for the elder at home. We wanted one connected system that is simple enough for an 80-year-old to use and rich enough for a doctor and a pharmacy to rely on.')
    H2('1.4 Objectives')
    P('The main objectives of ElderGuard AI are:')
    B([
        'To remind elders about each dose, keep reminding until it is answered, and show the caregiver the result live.',
        'To let an elder raise an emergency with one tap and to escalate automatically, caregiver first and then a second contact, the hospital and emergency services, if nobody responds.',
        'To record vitals such as blood pressure, blood sugar, oxygen level and heart rate and to flag unusual readings.',
        'To connect elder, caregiver, doctor, pharmacy and hospital through one shared record so that a prescription written by a doctor reaches the chosen pharmacy.',
        'To offer a patient AI companion that explains medicines and routines in plain language without giving a diagnosis.',
        'To design for older users: large type, high contrast, large touch targets and a text-size control, verified against WCAG 2.1 A/AA.',
        'To give each role only the information it needs through role-based access.',
    ])
    H2('1.5 Scope')
    P('The scope of this mini project covers the design and implementation of a working prototype: registration and role-based sign-in, the five portals described above, medicine reminders and adherence logging, vitals, appointments with telemedicine queue tokens, the doctor-to-pharmacy prescription handoff, tiered SOS escalation with a demo-speed mode, an AI companion, real-time updates and automated tests. Items that need outside providers or real-world partners, namely SMS and voice-call delivery, wearable devices, health-record exchange and a pilot with real elders, are outside the scope and are listed under future enhancements in Chapter 13.')

    # ===== 2 =====
    chapter(2, 'Problem Identification')
    H2('2.1 Existing Scenario')
    P('Today an older adult’s care is spread over phone calls, paper prescriptions, notebooks, pill boxes and separate apps. A family member calls to ask whether tablets were taken and relies on the answer. A doctor sees the patient for a few minutes every few weeks and depends on memory for what happened in between. The pharmacy fills a handwritten slip. In an emergency the elder must find a phone and call someone, which is exactly what is hardest when unwell or frightened.')
    H2('2.2 Existing System')
    P('Existing tools each solve part of the problem. Alarm and reminder apps ring at a set time but do not tell anyone whether the dose was taken. Panic pendants and call buttons raise an alert but do not connect to the elder’s medicines, vitals or doctor. Hospital information systems are built for staff and are not designed for elders or families. Messaging groups are informal, easy to miss and keep no record. Table 2.1 compares the usual approaches with ElderGuard.')
    table('Comparison of Existing Approaches and ElderGuard AI', ['Aspect', 'Existing approach', 'ElderGuard AI'], [
        ['Medicine reminder', 'Phone alarm; nobody knows if the dose was taken', 'Reminder rings until answered; caregiver sees the dose logged live'],
        ['Emergency alert', 'Phone call or a single contact', 'One tap; tiered escalation to caregiver, second contact, hospital and emergency services'],
        ['Vitals', 'Paper notebook or memory', 'Logged in the app; shared with caregiver and doctor; unusual readings flagged'],
        ['Prescriptions', 'Handwritten slip carried to a shop', 'Doctor e-prescription routed to the named pharmacy’s queue'],
        ['Information sharing', 'Phone calls and chat groups', 'One shared record with role-based access'],
        ['Usability for elders', 'Small text, many steps', 'Extra-large type, one clear action per screen, text-size control'],
    ], [3.3, 5.6, 6.3])
    H2('2.3 Existing System Drawbacks')
    B([
        'A missed dose is discovered late, if at all.',
        'Emergency response depends on the elder being able to phone someone, and on that person answering.',
        'Health information is scattered across people and paper, so no one sees a trend.',
        'Prescriptions travel as paper and are easy to lose or misread.',
        'Tools for professionals are too complex for elders, and consumer apps are too shallow for clinicians.',
        'There is no audit trail of who was alerted and when.',
    ])
    H2('2.4 Problem Statement')
    P('“Elders and their families need a simple, connected way to take medicines on time, share health information and get help fast, so that older adults can live independently with confidence.”')
    H2('2.5 Proposed Solution')
    P('ElderGuard AI proposes one platform with five linked portals on a shared record. The solution works in five steps: **capture** (elders log medicines and vitals, doctors write prescriptions), **connect** (one record links elder, caregiver, doctor, pharmacy and hospital), **alert** (reminders ring, unusual readings are flagged, SOS goes out in one tap), **escalate** (caregiver now, a second contact at 2 minutes, the hospital at 5 minutes and emergency services at 10 minutes) and **review** (history lets family and doctors act on what happened).')

    # ===== 3 =====
    chapter(3, 'Empathize and Define')
    H2('3.1 Empathy Study')
    P('The design started from the people rather than the technology. The empathy approach for this project combines interviews with elders and family caregivers, observation of medicine routines at home, medicine-routine diary studies and journey mapping of an emergency. For this mini project the team built the findings below from structured desk research and the team’s own family experience, and used them to draw an illustrative persona. **Interviews with real elders and caregivers are planned for the pilot phase and have not yet been carried out.**')
    H2('3.2 User Identification')
    P('Five groups use the system, each with a different goal. The elder and the caregiver are the primary users; the doctor, hospital and pharmacy are the secondary users who turn information into treatment.')
    H2('3.3 Primary Users')
    B([
        '**Elders** aged about 60 and above who take regular medicines and may live alone or apart from family.',
        '**Family caregivers**, usually adult children, who worry about missed doses and emergencies and want reassurance that does not feel like surveillance.',
    ])
    H2('3.4 Secondary Users')
    B([
        '**Doctors** who prescribe, review vitals and run telemedicine visits.',
        '**Pharmacies** who receive prescriptions and fulfil orders and deliveries.',
        '**Hospitals** who manage appointments, doctors and the emergency dispatch desk.',
    ])
    H2('3.5 User Needs')
    B([
        'A reminder that is hard to miss and easy to answer.',
        'Help in one tap, without having to find and dial a number.',
        'Knowing that someone will respond even if the first person does not.',
        'A clear view of how the elder is doing, without constant phone calls.',
        'A prescription that reaches the pharmacy without paper.',
        'Large, readable screens and plain language.',
    ])
    H2('3.6 Pain Points')
    table('User Pain Points and Proposed Solutions', ['S.No', 'Pain point', 'Proposed solution in ElderGuard'], [
        ['1', 'Several daily medicines are easy to forget', 'Reminder alarm that rings until answered, with adherence log'],
        ['2', 'Family finds out about a missed dose late', 'Live dose status on the caregiver dashboard'],
        ['3', 'A fall or sudden illness goes unnoticed', 'One-tap SOS with timed escalation'],
        ['4', 'Blood pressure or sugar not logged for days', 'Easy vitals entry (typed or spoken) and trend charts'],
        ['5', 'Prescription on paper is lost or misread', 'Doctor e-prescription routed to the named pharmacy'],
        ['6', 'Doctor, pharmacy and hospital hold separate data', 'One shared record with role-based portals'],
        ['7', 'Technology is hard for older users', 'Extra-large type, 44 px touch targets and a text-size control'],
    ], [1.3, 6.2, 7.7])
    H2('3.7 User Persona')
    P('The persona below is illustrative, created from the team’s research to guide design decisions. It is not a record of a real interview.')
    table('Illustrative User Personas', ['Attribute', 'Mrs. Anaya Rao (Elder)', 'Maya (Caregiver)'], [
        ['Age and situation', '77, lives alone, takes three medicines a day', 'Daughter, works in another city'],
        ['Goal', 'Stay independent at home and not be a burden', 'Know that her mother is safe without calling every hour'],
        ['Challenge', 'Forgets doses, small phone text is hard to read', 'Worries about night-time emergencies'],
        ['Expectation', '“Tell me simply what to do.”', '“Let me know if something is wrong.”'],
    ], [3.5, 5.8, 5.9])
    H2('3.8 User Expectations')
    B([
        'The app should feel calm and friendly, never alarming unless there is a real alert.',
        'Anything important must be possible with one clear tap.',
        'The family should be told about problems, not flooded with noise.',
        'Doctors and pharmacies expect the information to be accurate and traceable.',
    ])
    H2('3.9 Refined Problem Definition')
    P('How might we help an older adult take medicines on time, share health information with the people who care for them, and get help fast in an emergency, using an interface that the elder can operate unaided and the family can trust?')

    # ===== 4 =====
    chapter(4, 'Ideation')
    H2('4.1 Idea Generation')
    P('The team generated ideas by listing every moment in an elder’s day that could go wrong (waking, meals, medicine times, nights, appointments, emergencies) and asking what information or action would help at each one.')
    H2('4.2 Brainstorming')
    P('Ideas were gathered without judgement first, then grouped. The main candidates were: reminders that must be answered; a one-tap SOS; vitals tracking with an AI companion; a prescription scanner that turns a photo into a schedule; doctor appointments with queue tokens; doctor-to-pharmacy e-prescriptions; and role-based portals with a large-text mode.')
    H2('4.3 Evaluation of Ideas')
    table('Evaluation of Candidate Ideas', ['Idea', 'Value to elder', 'Feasibility in a mini project', 'Decision'], [
        ['Answerable medicine reminder', 'High', 'High', 'Selected'],
        ['One-tap SOS with escalation', 'Very high', 'High', 'Selected (core feature)'],
        ['Vitals tracking and trends', 'High', 'High', 'Selected'],
        ['AI companion (Mevi)', 'Medium', 'High (hosted LLM)', 'Selected'],
        ['Doctor-to-pharmacy e-prescription', 'High', 'Medium', 'Selected'],
        ['Telemedicine appointments with tokens', 'Medium', 'Medium', 'Selected'],
        ['Prescription photo scanner', 'Medium', 'Low (needs OCR service)', 'Prototype screen only'],
        ['Wearable and fall detection', 'High', 'Low (hardware)', 'Future work'],
    ], [5.2, 2.8, 4.2, 3.0])
    H2('4.4 Selected Idea')
    P('The selected idea is a **connected care platform**: one shared record, five portals, with answerable reminders and tiered SOS escalation at its core. The decision was driven by the observation that every pain point is a symptom of disconnected information.')
    H2('4.5 Key Features Identified')
    B([
        'Medicine reminder alarm with Taken action and caregiver visibility.',
        'One-tap SOS with four escalation tiers and a demo-speed mode.',
        'Vitals logging, target ranges and trend charts.',
        'Doctor portal with patient workspace, telemedicine tokens and e-prescriptions.',
        'Pharmacy intake of prescriptions matched by pharmacy name.',
        'Hospital queue, doctor management and SOS dispatch desk.',
        'AI companion Mevi that uses the elder’s own vitals and medicines as context.',
        'One warm design language with a text-size control and WCAG 2.1 A/AA checks.',
    ])
    H2('4.6 Final Concept')
    P('The final concept is “Care that reaches them, wherever you are.” The system captures what happens in the elder’s day, connects the people who can act on it, alerts the right person quickly and escalates if there is no response, and keeps a history so families and doctors can review what happened.')


def ch5_to_6():
    # ===== 5 =====
    chapter(5, 'Requirements Analysis')
    H2('5.1 Introduction')
    P('Requirements analysis converts the problem into concrete system behaviour. ElderGuard needs both functional features and quality attributes, because a reminder or an alert that arrives late or is unreadable has failed even if it exists.')
    H2('5.2 Functional Requirements')
    table('Functional Requirements of ElderGuard AI', ['ID', 'Requirement', 'Portal'], [
        ['FR1', 'Register and sign in with email or mobile number and a role', 'All'],
        ['FR2', 'Show scheduled medicines and ring a reminder at dose time until answered', 'Elder'],
        ['FR3', 'Log a dose as taken and show it live to the caregiver', 'Elder, Caregiver'],
        ['FR4', 'Record and chart blood pressure, sugar, oxygen, heart rate and weight', 'Elder, Caregiver, Doctor'],
        ['FR5', 'Raise an SOS in one tap and notify the caregiver immediately', 'Elder'],
        ['FR6', 'Escalate an unacknowledged SOS to a second contact, the hospital and emergency services', 'System'],
        ['FR7', 'Acknowledge and resolve an SOS, stopping further escalation', 'Caregiver, Hospital'],
        ['FR8', 'Link an elder with caregivers by elder ID', 'Elder, Caregiver'],
        ['FR9', 'Book appointments and run telemedicine sessions with queue tokens', 'Elder, Doctor, Hospital'],
        ['FR10', 'Write an e-prescription for a named pharmacy', 'Doctor'],
        ['FR11', 'List incoming prescriptions for the matching pharmacy and approve intake', 'Pharmacy'],
        ['FR12', 'Manage doctors, departments, patients and billing records', 'Hospital'],
        ['FR13', 'Answer questions through an AI companion using the elder’s data', 'Elder'],
        ['FR14', 'Send in-app, push and Telegram notifications', 'System'],
        ['FR15', 'Provide a text-size control and keyboard-accessible interface', 'All'],
    ], [1.3, 10.4, 3.5])
    H2('5.3 Non-Functional Requirements')
    table('Non-Functional Requirements of ElderGuard AI', ['Attribute', 'Requirement'], [
        ['Usability', 'Elder text at 118% of base size; every control at least 44 px; one clear action per screen'],
        ['Accessibility', 'WCAG 2.1 A/AA; 4.5:1 text contrast; visible 3 px focus ring; reduced-motion support'],
        ['Reliability', 'SOS escalation driven by a scheduler sweep (30 s, 5 s in demo mode); an acknowledged SOS stops escalation'],
        ['Security', 'bcrypt password hashing, JWT access tokens, role checks on every route'],
        ['Performance', 'Pages load in under two seconds on a normal connection; live updates over WebSocket'],
        ['Portability', 'Runs on a laptop with SQLite; switches to Supabase/PostgreSQL by configuration'],
        ['Maintainability', 'Feature modules per domain; automated end-to-end and accessibility tests'],
    ], [3.3, 11.9])
    H2('5.4 Hardware Requirements')
    B(['A laptop or desktop with at least 8 GB RAM for development.', 'Any modern smartphone, tablet or computer with a web browser for users.', 'A stable internet connection for the AI companion, push notifications and photos.'])
    H2('5.5 Software Requirements')
    B(['Python 3.13 with FastAPI, SQLAlchemy and APScheduler.', 'Node.js 20 or later with npm, React 18, Vite 5 and Tailwind CSS 3.', 'SQLite (bundled) or a Supabase/PostgreSQL project.', 'Playwright and axe-core for testing.', 'Microsoft Edge, Chrome or Firefox.'])
    H2('5.6 User Roles and Permissions')
    table('User Roles and Permissions', ['Role', 'Can view', 'Can change'], [
        ['Elder', 'Own medicines, vitals, appointments, reports, caregiver notes', 'Dose status, vitals, SOS, own profile'],
        ['Caregiver', 'Linked elders’ medicines, vitals, alerts, SOS history', 'Reminders, notes, SOS acknowledgement, care-team messages'],
        ['Doctor', 'Patients linked through appointments or care', 'Prescriptions, reports, appointment status'],
        ['Hospital', 'Registered doctors, queue, billing, SOS dispatch', 'Queue entries, departments, billing records'],
        ['Pharmacy', 'Prescriptions addressed to its own pharmacy name', 'Order status, inventory, deliveries'],
    ], [2.5, 6.6, 6.1])
    H2('5.7 System Constraints')
    B([
        'Alerts are delivered in-app, by push and by Telegram. There is no SMS or voice-call provider yet.',
        'The hospital SOS desk receives live alerts only inside the same browser in the prototype; server push to the hospital is future work.',
        'The AI companion needs an internet connection and a configured API key.',
        'The prototype uses demo data; it has not been validated with real elders.',
    ])
    H2('5.8 Requirement Summary')
    P('The requirements centre on a small number of safety-critical flows, namely reminders, SOS and the prescription handoff, supported by accessible portals and role-based access. The remaining chapters show how each requirement is met.')

    # ===== 6 =====
    chapter(6, 'Technology Stack')
    H2('6.1 Introduction')
    P('The technologies were chosen so that the prototype is quick to build, easy to demonstrate on a laptop and able to grow into a hosted service.')
    table('Technology Stack Used in ElderGuard AI', ['Layer', 'Technology', 'Purpose'], [
        ['Front end', 'React 18, Vite 5, React Router', 'Component-based single-page app and fast development build'],
        ['Styling', 'Tailwind CSS 3, Atkinson Hyperlegible and Geist fonts', 'Design tokens, readable type'],
        ['Motion', 'framer-motion and motion', 'Page transitions and gentle animation, disabled for reduced motion'],
        ['Icons and charts', 'Phosphor Icons, Lucide, Recharts', 'Interface icons and vitals charts'],
        ['Data fetching', 'TanStack Query, Axios', 'Cached API calls'],
        ['Back end', 'Python, FastAPI, Uvicorn', 'REST API and WebSocket endpoints'],
        ['Scheduling', 'APScheduler', 'Reminder sweeps and SOS escalation'],
        ['Database', 'SQLite, Supabase/PostgreSQL', 'Local demo and hosted storage'],
        ['Security', 'bcrypt, python-jose (JWT)', 'Password hashing and tokens'],
        ['AI', 'Groq-hosted LLM', 'Mevi, the AI companion'],
        ['Notifications', 'Firebase Cloud Messaging, Telegram', 'Push and chat alerts'],
        ['Testing', 'Playwright, axe-core', 'End-to-end and accessibility tests'],
    ], [2.8, 5.6, 6.8])
    H2('6.2 Frontend Technologies')
    H3('6.2.1 React')
    P('React builds each portal from reusable components, such as the dashboard layout, the SOS card and the medicine alarm. Component reuse keeps the five portals visually consistent.')
    H3('6.2.2 Vite')
    P('Vite provides a fast development server and an optimised production build. The project pre-bundles its main dependencies so that the development server starts reliably.')
    H3('6.2.3 Tailwind CSS')
    P('Tailwind supplies the design tokens, such as the single teal accent, the warm paper background and the 12 px and 24 px radii. A per-role root font scale makes the elder portal larger and the clinical portals denser.')
    H3('6.2.4 Motion libraries')
    P('framer-motion provides spring page transitions, staggered card entrances and a sliding navigation pill. All motion honours the operating system’s reduced-motion setting.')
    H2('6.3 Backend Technologies')
    H3('6.3.1 Python and FastAPI')
    P('FastAPI exposes more than a hundred REST endpoints grouped by domain, with automatic validation and interactive documentation. A WebSocket endpoint streams live changes to the elder and caregiver.')
    H3('6.3.2 APScheduler')
    P('APScheduler runs background sweeps: medicine reminder sessions every 15 to 60 seconds and the SOS escalation sweep every 30 seconds (5 seconds in demo mode).')
    H2('6.4 Database Technology')
    P('The prototype uses SQLite for a zero-setup local database. When Supabase credentials are configured, the same data model is stored in hosted PostgreSQL. The data layer reads and writes through one helper so that both modes behave the same.')
    H2('6.5 Artificial Intelligence')
    P('The companion, Mevi, calls a Groq-hosted language model. The prompt includes the elder’s own medicines and recent vitals so answers are specific, and instructs the model to avoid diagnosis and to suggest contacting a doctor or emergency services when appropriate.')
    H2('6.6 Notification Technology')
    P('Notifications are stored in the database, pushed to the browser through WebSocket, and sent through Firebase Cloud Messaging and Telegram when configured.')
    H2('6.7 Technology Integration')
    P('The React front end calls the FastAPI back end over HTTP and WebSocket. The back end reads and writes the database, runs scheduled jobs, calls the language model and sends notifications.')
    H2('6.8 Technology Selection')
    P('These technologies are widely used, well documented, free to run locally and able to scale to a hosted deployment. They also allowed a small team to build five portals and a real-time safety feature within a semester.')
