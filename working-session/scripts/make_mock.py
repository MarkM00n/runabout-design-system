"""Mock Equiem-style space bookings: 3 buildings, 90 days, with planted patterns."""
import csv, random, datetime as dt
random.seed(7)
buildings = {
  'Collins Arch': ['Level 2 Boardroom','Level 2 Studio','Level 12 Meeting Room A','Level 12 Meeting Room B','Rooftop Event Space'],
  '80 Bourke':    ['Ground Floor Hub','Level 5 Training Room','Level 5 Focus Room','Level 9 Boardroom'],
  'Southbank Place': ['Lobby Lounge','Level 3 Meeting Room','Level 3 Wellness Room','Level 7 Event Hall'],
}
cap = {'Boardroom':14,'Studio':20,'Meeting Room':8,'Event Space':120,'Hub':40,'Training Room':30,'Focus Room':4,'Lounge':25,'Wellness Room':10,'Event Hall':150}
def capacity(space):
  for k,v in cap.items():
    if k in space: return v
  return 10
tenants = ['Arcadia Legal','Northwind Capital','Bright Path Health','Kite Studio','Meridian Engineering','Oakline Insurance','Pivot Labs','Sable & Co']
types = {'Event Space':'Event','Event Hall':'Event','Wellness':'Wellness class','Training':'Training'}
start = dt.date(2026,6,1)
rows=[]; bid=10000
for d in range(92):
  day = start + dt.timedelta(days=d)
  if day.weekday()>=5: continue
  for b, spaces in buildings.items():
    for s in spaces:
      base = 3 if 'Boardroom' in s else 2
      if 'Level 12 Meeting Room B' in s: base = 0.6          # underused room
      if 'Wellness' in s: base = 1.2
      if day.weekday() in (1,2,3): base *= 1.5                # Tue–Thu peak
      n = max(0, int(random.gauss(base, 1)))
      for _ in range(n):
        bid += 1
        hour = random.choice([8,9,9,10,10,11,13,14,14,15,16])
        dur = random.choice([30,60,60,60,90,120]) if 'Event' not in s else random.choice([120,180,240])
        c = capacity(s)
        att = max(1, int(random.triangular(1, c, c*0.35)))
        tenant = random.choice(tenants)
        if 'Event' in s and random.random()<0.6: tenant = random.choice(['Arcadia Legal','Northwind Capital'])
        status = 'Completed'
        r = random.random()
        cancel_p = 0.08; noshow_p = 0.06
        if b=='80 Bourke' and day.weekday()==0: noshow_p = 0.28    # Monday no-shows at 80 Bourke
        if tenant=='Pivot Labs': cancel_p = 0.22                   # one tenant cancels a lot
        if r < cancel_p: status='Cancelled'
        elif r < cancel_p+noshow_p: status='No-show'
        lead = random.choice([0,0,1,1,2,3,5,7,14,21]) if 'Event' not in s else random.choice([14,21,30,45])
        rows.append({'booking_id':f'BK{bid}','date':day.isoformat(),'weekday':day.strftime('%a'),'start_time':f'{hour:02d}:00','duration_mins':dur,
          'building':b,'space':s,'space_type':next((v for k,v in types.items() if k in s),'Meeting'),'capacity':c,
          'tenant':tenant,'attendees':att if status=='Completed' else '', 'status':status,'booked_days_ahead':lead,
          'credits_used': round(dur/60*(c/8),1)})
with open('data/mock-bookings.csv','w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(len(rows),'rows')
