"""Standard academic taxonomy — pick-lists for levels, faculties, departments.

Ported from Drona's ``src/lib/academics/taxonomy.ts``. A starting vocabulary,
not a constraint: everything is editable per user after it's applied.
"""

from __future__ import annotations

from deeptutor.curriculum.models import CatalogProgram, Level

LEVELS: list[dict[str, object]] = [
    {"key": Level.certificate, "label": "Certificate", "years": 1},
    {"key": Level.diploma, "label": "Diploma", "years": 2},
    {"key": Level.bachelor, "label": "Bachelor's", "years": 3},
    {"key": Level.master, "label": "Master's", "years": 2},
    {"key": Level.phd, "label": "Doctorate (PhD)", "years": 3},
    {"key": Level.integrated, "label": "Integrated", "years": 5},
]


def level_label(key: str) -> str:
    for level in LEVELS:
        if level["key"].value == key:
            return str(level["label"])
    return key


def _ba(subject: str) -> list[dict[str, object]]:
    return [
        {"name": f"B.A. {subject}", "level": Level.bachelor},
        {"name": f"M.A. {subject}", "level": Level.master},
    ]


def _bsc(subject: str) -> list[dict[str, object]]:
    return [
        {"name": f"B.Sc. {subject}", "level": Level.bachelor},
        {"name": f"M.Sc. {subject}", "level": Level.master},
    ]


STANDARD_FACULTIES: list[dict[str, object]] = [
    {
        "name": "Arts & Humanities",
        "departments": [
            {"name": "English", "programs": _ba("English")},
            {"name": "Hindi", "programs": _ba("Hindi")},
            {"name": "Urdu", "programs": _ba("Urdu")},
            {"name": "History", "programs": _ba("History")},
            {"name": "Political Science", "programs": _ba("Political Science")},
            {"name": "Sociology", "programs": _ba("Sociology")},
            {"name": "Psychology", "programs": _ba("Psychology")},
            {"name": "Philosophy", "programs": _ba("Philosophy")},
            {"name": "Economics", "programs": _ba("Economics")},
            {
                "name": "Fine Arts",
                "programs": [
                    {"name": "B.F.A.", "level": Level.bachelor},
                    {"name": "M.F.A.", "level": Level.master},
                ],
            },
        ],
    },
    {
        "name": "Science",
        "departments": [
            {"name": "Physics", "programs": _bsc("Physics")},
            {"name": "Chemistry", "programs": _bsc("Chemistry")},
            {"name": "Mathematics", "programs": _bsc("Mathematics")},
            {"name": "Botany", "programs": _bsc("Botany")},
            {"name": "Zoology", "programs": _bsc("Zoology")},
            {"name": "Statistics", "programs": _bsc("Statistics")},
            {"name": "Environmental Science", "programs": _bsc("Environmental Science")},
        ],
    },
    {
        "name": "Commerce & Management",
        "departments": [
            {
                "name": "Commerce",
                "programs": [
                    {"name": "B.Com", "level": Level.bachelor},
                    {"name": "M.Com", "level": Level.master},
                ],
            },
            {
                "name": "Business Administration",
                "programs": [
                    {"name": "BBA", "level": Level.bachelor},
                    {"name": "MBA", "level": Level.master},
                ],
            },
            {
                "name": "Accounting & Finance",
                "programs": [{"name": "B.Com (Hons) Finance", "level": Level.bachelor}],
            },
        ],
    },
    {
        "name": "Agriculture",
        "departments": [
            {
                "name": "Agriculture",
                "programs": [
                    {"name": "B.Sc. (Hons) Agriculture", "level": Level.bachelor},
                    {"name": "M.Sc. Agriculture", "level": Level.master},
                ],
            },
            {
                "name": "Horticulture",
                "programs": [{"name": "B.Sc. (Hons) Horticulture", "level": Level.bachelor}],
            },
        ],
    },
    {
        "name": "Engineering & Technology",
        "departments": [
            {
                "name": "Computer Science & Engineering",
                "programs": [
                    {"name": "B.Tech CSE", "level": Level.bachelor},
                    {"name": "M.Tech CSE", "level": Level.master},
                ],
            },
            {
                "name": "Electronics & Communication",
                "programs": [{"name": "B.Tech ECE", "level": Level.bachelor}],
            },
            {
                "name": "Mechanical Engineering",
                "programs": [{"name": "B.Tech Mechanical", "level": Level.bachelor}],
            },
            {
                "name": "Civil Engineering",
                "programs": [{"name": "B.Tech Civil", "level": Level.bachelor}],
            },
        ],
    },
    {
        "name": "Computer Applications",
        "departments": [
            {
                "name": "Computer Applications",
                "programs": [
                    {"name": "BCA", "level": Level.bachelor},
                    {"name": "MCA", "level": Level.master},
                ],
            },
            {
                "name": "Data Science",
                "programs": [{"name": "B.Sc. Data Science", "level": Level.bachelor}],
            },
        ],
    },
    {
        "name": "Law",
        "departments": [
            {
                "name": "Law",
                "programs": [
                    {"name": "LL.B.", "level": Level.bachelor},
                    {"name": "LL.M.", "level": Level.master},
                    {"name": "B.A. LL.B. (Integrated)", "level": Level.integrated},
                ],
            },
        ],
    },
    {
        "name": "Education",
        "departments": [
            {
                "name": "Education",
                "programs": [
                    {"name": "B.Ed.", "level": Level.bachelor},
                    {"name": "M.Ed.", "level": Level.master},
                ],
            },
        ],
    },
]


def flatten_catalog() -> list[CatalogProgram]:
    """Flatten the standard faculties into a list of catalog programs."""
    out: list[CatalogProgram] = []
    for faculty in STANDARD_FACULTIES:
        for dept in faculty["departments"]:  # type: ignore[union-attr]
            for prog in dept["programs"]:  # type: ignore[index]
                out.append(
                    CatalogProgram(
                        faculty=faculty["name"],  # type: ignore[index]
                        department=dept["name"],  # type: ignore[index]
                        name=prog["name"],  # type: ignore[index]
                        level=prog["level"],  # type: ignore[index]
                    )
                )
    return out


__all__ = [
    "LEVELS",
    "STANDARD_FACULTIES",
    "flatten_catalog",
    "level_label",
]
