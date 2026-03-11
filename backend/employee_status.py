"""
خدمة حساب حالة الموظف حسب الوردية والجدول الشهري
====================================================
الحالات الأربع:
  on_duty_now  → مداوم الآن  (اليوم عمل + الوقت داخل ساعات ورديته)
  off_shift    → خارج الوردية (اليوم عمل + الوقت خارج ساعات ورديته)
  on_rest      → في راحة     (يومه إجازة أسبوعية في الجدول المعتمد)
  no_schedule  → غير محدد    (لا جدول معتمد أو لا تعيين في الجدول)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

SA_TZ = timezone(timedelta(hours=3))

DAY_MAP = {
    0: "الإثنين", 1: "الثلاثاء", 2: "الأربعاء",
    3: "الخميس",  4: "الجمعة",  5: "السبت",   6: "الأحد"
}


def get_sa_now():
    return datetime.now(SA_TZ)


def get_today_ar():
    return DAY_MAP.get(get_sa_now().weekday(), "")


def is_time_in_shift(current_time_str: str, start_str: Optional[str], end_str: Optional[str]) -> Optional[bool]:
    """
    هل الوقت الحالي داخل ساعات الوردية؟
    يدعم الورديات التي تتجاوز منتصف الليل (مثل 22:00 → 06:00)
    Returns: True إذا داخل، False إذا خارج، None إذا لا وقت محدد
    """
    if not start_str or not end_str:
        return None
    try:
        def to_mins(t):
            h, m = map(int, t.split(":"))
            return h * 60 + m

        cur  = to_mins(current_time_str)
        s    = to_mins(start_str)
        e    = to_mins(end_str)

        if s <= e:
            # وردية عادية (مثل 07:00 → 14:00)
            return s <= cur <= e
        else:
            # وردية تتجاوز منتصف الليل (مثل 22:00 → 06:00)
            return cur >= s or cur <= e
    except Exception:
        return None


def calc_employee_status(emp: dict, assignment: Optional[dict],
                          shift_config: dict, today_ar: str, now_time_str: str) -> str:
    """
    يحسب حالة موظف واحد ويعيد:
      on_duty_now | off_shift | on_rest | no_schedule
    """
    if assignment is None:
        return "no_schedule"

    # ── هل اليوم راحة؟ ───────────────────────────────────────────
    rest_days = assignment.get("rest_days") or []
    if today_ar and today_ar in rest_days:
        return "on_rest"

    # ── هل الوقت الحالي داخل ساعات الوردية؟ ─────────────────────
    shift_value = assignment.get("shift") or emp.get("shift") or ""
    if shift_value and shift_value in shift_config:
        cfg = shift_config[shift_value]
        in_shift = is_time_in_shift(now_time_str, cfg.get("start_time"), cfg.get("end_time"))
        if in_shift is True:
            return "on_duty_now"
        elif in_shift is False:
            return "off_shift"

    # ── لا يوجد تعريف وقت للوردية → نعتبره مداوم (يوم عمل) ──────
    return "on_duty_now"


def build_employee_statuses(employees: list, schedule: Optional[dict],
                             shifts_list: list) -> dict:
    """
    يبني خريطة كاملة: employee_id → status
    
    employees    : قائمة الموظفين من DB
    schedule     : الجدول الشهري (active أو draft أو None)
    shifts_list  : إعدادات الورديات من DB (قائمة من ShiftSetting)
    """
    is_approved = schedule and schedule.get("status") == "active"

    # خريطة التعيينات من الجدول
    assignment_map = {}
    if schedule and schedule.get("assignments"):
        for a in schedule["assignments"]:
            assignment_map[a["employee_id"]] = a

    # خريطة إعدادات الورديات: value → {start_time, end_time}
    shift_config = {}
    for s in shifts_list:
        v = s.get("value") or s.get("label") or ""
        if v:
            shift_config[v] = {
                "start_time": s.get("start_time"),
                "end_time":   s.get("end_time"),
                "label":      s.get("label", v),
                "color":      s.get("color", "#6b7280"),
            }

    now_sa       = get_sa_now()
    today_ar     = DAY_MAP.get(now_sa.weekday(), "")
    now_time_str = now_sa.strftime("%H:%M")

    result = {}
    for emp in employees:
        eid = emp.get("id", "")
        assignment = assignment_map.get(eid) if is_approved else None
        status = calc_employee_status(emp, assignment, shift_config, today_ar, now_time_str)
        result[eid] = status

    return result


def aggregate_statuses(status_map: dict) -> dict:
    """
    يجمع إحصائيات الحالات لكل الموظفين
    """
    counts = {
        "total":       len(status_map),
        "on_duty_now": sum(1 for s in status_map.values() if s == "on_duty_now"),
        "off_shift":   sum(1 for s in status_map.values() if s == "off_shift"),
        "on_rest":     sum(1 for s in status_map.values() if s == "on_rest"),
        "no_schedule": sum(1 for s in status_map.values() if s == "no_schedule"),
    }
    total = counts["total"]
    counts["on_duty_pct"] = round(counts["on_duty_now"] / total * 100) if total else 0
    return counts
