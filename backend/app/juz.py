"""Quran para (juz) schedule: the day of the month is the para number.

1st -> Para 1 ... 30th -> Para 30, so a month completes one full Quran.
The 31st is a free revision day.
"""

JUZ_NAMES = [
    "Alif Lam Meem", "Sayaqool", "Tilkal Rusul", "Lan Tanaloo", "Wal Muhsanat",
    "La Yuhibbullah", "Wa Iza Samiu", "Wa Lau Annana", "Qalal Malao", "Wa A'lamu",
    "Yatazeroon", "Wa Ma Min Dabbah", "Wa Ma Ubrioo", "Rubama", "Subhanallazi",
    "Qal Alam", "Iqtaraba", "Qad Aflaha", "Wa Qalallazina", "A'man Khalaqa",
    "Utlu Ma Oohiya", "Wa Man Yaqnut", "Wa Mali", "Faman Azlam", "Ilayhi Yuraddu",
    "Ha Meem", "Qala Fa Ma Khatbukum", "Qad Sami Allahu", "Tabarakallazi", "Amma",
]


def juz_for_day(day_of_month: int) -> int | None:
    """Para number for a calendar day, or None on the 31st (revision day)."""
    return day_of_month if 1 <= day_of_month <= 30 else None


def juz_name(juz: int | None) -> str:
    return JUZ_NAMES[juz - 1] if juz else "Revision"
