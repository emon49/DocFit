import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, MessageSquare, DollarSign, Settings, Bell, ChevronRight, X, AlertTriangle, CheckCircle, Plus } from 'lucide-react';

interface Rule {
  id: string;
  doctor_id: string;
  day_of_week: string;
  start_local_time: string;
  end_local_time: string;
  timezone: string;
}

interface Exception {
  id: string;
  doctor_id: string;
  date: string;
  type: string;
  note?: string;
}

interface Slot {
  id: string;
  doctor_id: string;
  date: string;
  time_str: string;
  status: string;
}

interface Booking {
  patient_name: string;
  date: string;
  time: string;
  service: string;
  status: string;
}

export function DoctorScheduleApp() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLength, setSlotLength] = useState<number>(20);
  const [doctorId, setDoctorId] = useState<string>('doc_amara_001');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddExc, setShowAddExc] = useState<boolean>(false);
  const [excDate, setExcDate] = useState<string>('2026-10-15');
  const [excType, setExcType] = useState<string>('leave');
  const [excNote, setExcNote] = useState<string>('Annual cardiology conference');
  const [warningData, setWarningData] = useState<{ message: string; affected_bookings: Booking[] } | null>(null);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/doctors/me/availability');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setExceptions(data.exceptions || []);
        setSlots(data.slots || []);
        setSlotLength(data.slot_length_minutes || 20);
        setDoctorId(data.doctor_id || 'doc_amara_001');
      }
    } catch (err) {
      console.error('Failed to load availability', err);
    }
  };

  const handleAddHourBlock = (day: string) => {
    const start = prompt('Enter start time (HH:MM, e.g. 09:00):', '09:00');
    if (!start) return;
    const end = prompt('Enter end time (HH:MM, e.g. 17:00):', '17:00');
    if (!end) return;

    const newRule: Rule = {
      id: 'rule_' + Date.now(),
      doctor_id: doctorId,
      day_of_week: day,
      start_local_time: start,
      end_local_time: end,
      timezone: 'Europe/London'
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const handleSaveAll = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await fetch('/api/doctors/me/slot-length', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_length_minutes: slotLength })
      });

      const res = await fetch('/api/doctors/me/availability-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });
      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
        setSlots(data.slots || []);
        setSuccessMsg('Schedule saved successfully!');
      } else {
        setErrorMsg(data.message || 'Error saving rules');
      }
    } catch (err) {
      setErrorMsg('Network error saving changes');
    }
  };

  const handleSaveException = async (force = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setWarningData(null);
    try {
      const res = await fetch('/api/doctors/me/availability-exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: excDate, type: excType, note: excNote, force })
      });
      const data = await res.json();
      if (res.ok) {
        setExceptions(data.exceptions || []);
        setSlots(data.slots || []);
        setShowAddExc(false);
        setSuccessMsg('Exception saved successfully');
      } else if (data.warning) {
        setWarningData({ message: data.message, affected_bookings: data.affected_bookings || [] });
      } else {
        setErrorMsg(data.message || 'Failed to save exception');
      }
    } catch (err) {
      setErrorMsg('Network error saving exception');
    }
  };

  const handleRemoveException = async (excId: string) => {
    try {
      const res = await fetch(`/api/doctors/me/availability-exceptions/${excId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setExceptions(data.exceptions || []);
        setSlots(data.slots || []);
        setSuccessMsg('Exception removed');
      }
    } catch (err) {
      setErrorMsg('Failed to remove exception');
    }
  };

  // Group slots by date for preview
  const slotsByDate: { [date: string]: Slot[] } = {};
  slots.forEach(s => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  return (
    <div className="bg-slate-50 min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-56 bg-teal-800 flex flex-col z-20">
        <div className="px-4 py-4 border-b border-teal-700/60">
          <span className="text-white font-semibold text-base tracking-tight">DocFit</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <a href="/patient-dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-teal-200 hover:text-white hover:bg-teal-700/50">
            <LayoutDashboard size={16} /> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-teal-200 hover:text-white hover:bg-teal-700/50">
            <Users size={16} /> Patients
          </a>
          <a href="/doctor-schedule" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-teal-700 text-white">
            <Calendar size={16} /> Schedule
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-teal-200 hover:text-white hover:bg-teal-700/50">
            <MessageSquare size={16} /> Messages
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-teal-200 hover:text-white hover:bg-teal-700/50">
            <DollarSign size={16} /> Earnings
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-teal-200 hover:text-white hover:bg-teal-700/50">
            <Settings size={16} /> Settings
          </a>
        </nav>
        <div className="p-3 border-t border-teal-700/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">AO</div>
            <div className="min-w-0">
              <div className="text-teal-200 text-xs font-medium truncate">Dr. A. Osei-Bonsu</div>
              <div className="text-teal-400 text-xs">Cardiologist</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="ml-56 flex-1">
        <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between px-6">
          <span className="text-base font-semibold text-slate-800 tracking-tight">My Schedule</span>
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-slate-400" />
            <div className="w-px h-5 bg-slate-200"></div>
            <span className="text-sm text-slate-700">Dr. Amara Osei-Bonsu</span>
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center">AO</div>
          </div>
        </header>

        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Recurring weekly schedule</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Slot length</span>
            <select
              value={slotLength}
              onChange={(e) => setSlotLength(Number(e.target.value))}
              className="border border-slate-300 rounded-md text-sm px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            >
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
            </select>
            <button
              onClick={handleSaveAll}
              className="bg-teal-700 text-white text-sm px-4 py-1.5 rounded-md font-medium hover:bg-teal-800 transition-colors"
            >
              Save changes
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <div className="flex gap-6 p-6">
          {/* Weekly Hours Grid */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Weekly hours</h2>
            {daysOfWeek.map(day => {
              const dayRules = rules.filter(r => r.day_of_week.toLowerCase() === day);
              const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
              return (
                <div key={day} className="bg-white border border-slate-200 rounded-lg mb-3 p-4">
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-800 w-24 flex-shrink-0">{capitalized}</span>
                    {dayRules.length === 0 ? (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-xs text-slate-400">No hours</span>
                        <button
                          onClick={() => handleAddHourBlock(day)}
                          className="text-sm text-teal-700 font-medium border border-teal-200 rounded-md px-3 py-1.5 bg-teal-50 hover:bg-teal-100 flex-shrink-0"
                        >
                          + Add hours
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 flex-1 items-center justify-between">
                        <div className="flex flex-wrap gap-2 items-center">
                          {dayRules.map(rule => (
                            <span key={rule.id} className="bg-teal-50 border border-teal-200 rounded-md px-3 py-1 text-xs text-teal-800 font-medium inline-flex items-center gap-2">
                              {rule.start_local_time} – {rule.end_local_time}
                              <button onClick={() => handleRemoveRule(rule.id)} className="text-teal-400 hover:text-red-500 leading-none">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => handleAddHourBlock(day)}
                            className="text-xs text-teal-600 font-medium ml-1 hover:text-teal-700"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Exceptions */}
            <div className="mt-6 mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">One-off exceptions</span>
              <button
                onClick={() => setShowAddExc(true)}
                className="text-sm text-teal-700 border border-teal-200 rounded-md px-3 py-1.5 bg-teal-50 hover:bg-teal-100 font-medium"
              >
                Add exception +
              </button>
            </div>

            {exceptions.length > 0 ? (
              exceptions.map(exc => (
                <div key={exc.id} className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-base leading-none">●</span>
                    <span className="text-sm text-slate-700 font-medium">
                      {exc.date} · {exc.type === 'leave' ? 'Leave — all day' : 'Extra session'} {exc.note ? `(${exc.note})` : ''}
                    </span>
                  </div>
                  <button onClick={() => handleRemoveException(exc.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic mb-4">No exceptions set.</p>
            )}

            {/* Add Exception Form Modal / Box */}
            {showAddExc && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 mt-3 shadow-sm">
                <div className="text-sm font-semibold text-slate-700 mb-4">Add one-off exception</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Exception date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={excDate}
                      onChange={(e) => setExcDate(e.target.value)}
                      className="border border-slate-300 rounded-md text-sm px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 w-48"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Type <span className="text-red-500">*</span></label>
                    <select
                      value={excType}
                      onChange={(e) => setExcType(e.target.value)}
                      className="border border-slate-300 rounded-md text-sm px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 w-64"
                    >
                      <option value="leave">Leave / unavailable</option>
                      <option value="extra">Extra session (add hours)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Note <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      rows={2}
                      value={excNote}
                      onChange={(e) => setExcNote(e.target.value)}
                      placeholder="e.g. Annual cardiology conference"
                      className="border border-slate-300 rounded-md text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 w-full resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => handleSaveException(false)}
                    className="bg-teal-700 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-teal-800 transition-colors"
                  >
                    Save exception
                  </button>
                  <button
                    onClick={() => setShowAddExc(false)}
                    className="text-sm text-slate-500 px-4 py-2 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {warningData && (
                  <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">Confirm before saving</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">{warningData.message}</p>
                    {warningData.affected_bookings.map((b, idx) => (
                      <div key={idx} className="bg-white border border-amber-200 rounded-md p-3 mt-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{b.patient_name}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{b.date} · {b.time} · {b.service}</p>
                          </div>
                          <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0">{b.status}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button onClick={() => alert('Appointment cancelled')} className="border border-red-300 text-red-600 rounded-md px-4 py-2 text-sm font-medium bg-white hover:bg-red-50 transition-colors">
                        Cancel this appointment
                      </button>
                      <button onClick={() => alert('Reschedule modal opened')} className="border border-teal-300 text-teal-700 rounded-md px-4 py-2 text-sm font-medium bg-teal-50 hover:bg-teal-100 transition-colors">
                        Reschedule this appointment
                      </button>
                    </div>
                    <div className="border-t border-amber-200 mt-4 pt-4 flex flex-wrap items-center gap-1.5">
                      <span onClick={() => handleSaveException(true)} className="text-sm text-amber-800 underline cursor-pointer hover:text-amber-900 font-medium">
                        Proceed with leave (I'll handle the appointment separately)
                      </span>
                      <span className="text-sm text-slate-400"> · </span>
                      <span onClick={() => setWarningData(null)} className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                        Discard leave exception
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 14-day Preview Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Next 14 days</span>
                <span className="text-xs bg-slate-100 text-slate-500 rounded px-2 py-0.5 font-medium">BST (UTC+1)</span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {(() => {
                  let openTotal = 0;
                  let leaveTotal = 0;
                  const startDate = new Date('2026-10-10T00:00:00Z');
                  const rows = [];

                  for (let i = 0; i < 14; i++) {
                    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
                    const dateStr = d.toISOString().split('T')[0];
                    const dateDisplay = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const dayExceptions = exceptions.filter(e => e.date === dateStr);
                    const isLeave = dayExceptions.some(e => e.type === 'leave');
                    if (isLeave) leaveTotal++;

                    const daySlots = slotsByDate[dateStr] || [];

                    rows.push(
                      <div key={dateStr} className="py-2 border-b border-slate-100">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">{dateDisplay}</p>
                        {isLeave ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded px-2 py-0.5">Leave — exception</span>
                        ) : daySlots.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No availability</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {daySlots.map(slot => {
                              openTotal++;
                              return (
                                <span key={slot.id} className="bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 text-xs">
                                  {slot.time_str}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return rows;
                })()}
              </div>

              <div className="text-xs text-slate-500 border-t border-slate-100 mt-3 pt-3">
                {slots.length} open slots · 0 booked · {exceptions.filter(e => e.type === 'leave').length} leave day
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
