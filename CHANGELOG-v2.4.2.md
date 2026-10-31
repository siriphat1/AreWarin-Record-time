# AreWarin Tutor OS v2.4.2 — Auto Time Calculation in Attendance Editor

- The **Edit Attendance / แก้ไขการตัดชั่วโมง** dialog only asks for entry time, exit time and reason. Removed the editable **actual minutes** and **deduction minutes** inputs.
- Live preview displays elapsed time in Thai (e.g. **35 นาที**, **1 ชม. 30 นาที**) and original/new deduction and balance adjustment.
- Upon saving, both `Attendance.actual_minutes` and `Attendance.deduct_minutes` are calculated **again from entry and exit times**, never copied from a form-controlled minutes value.
- Package courses add one adjustment ledger entry representing the difference to preserve history; hourly courses recalculate unpaid billing. Already-paid/partially paid hourly items remain protected from direct changes.
- Validation rejects missing/equal time and calculated durations above 12 hours; insufficient package balance still blocks increasing deduction. Overnight classes of up to 12 hours remain supported.
- Audit records old/new time and minute values. No database schema change.
